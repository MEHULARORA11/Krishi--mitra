import { desc, eq } from 'drizzle-orm'
import { env } from '../config/env.js'
import { weatherCacheTable } from '../db/schema.js'
import { getDb } from '../db/index.js'
import { weatherCache } from '../utils/cache.js'

export type WeatherLocationInput = {
  city?: string
  lat?: number
  lng?: number
  days?: number
  alerts?: boolean
}

export type HourlyForecast = {
  time: string
  temp: number
  condition: string
  rain: number
  icon: string | null
  humidity?: number | null
  windSpeed?: number | null
  precipitationMm?: number | null
}

export type DailyForecast = {
  day: string
  date?: string
  condition: string
  high: number
  low: number
  icon: string | null
  rain?: number | null
  precipitationMm?: number | null
  sunrise?: string | null
  sunset?: string | null
}

export type WeatherAlert = {
  headline: string
  event: string
  severity: string | null
  urgency: string | null
  description: string | null
  instruction: string | null
  effective: string | null
  expires: string | null
  areas: string | null
  source: string
}

export type WeatherData = {
  // Legacy flat fields retained for existing consumers.
  location: string
  temperature: number
  condition: string
  humidity: number
  windSpeed: number
  uvIndex: number | null
  rainfallProbability: number
  icon: string | null
  hourlyForecast: HourlyForecast[]
  weeklyForecast: DailyForecast[]
  sourceFreshness: 'live' | 'cached' | 'stale' | 'unavailable'
  fetchedAt: string
  dataMode: 'live' | 'cached' | 'unavailable'
  locationDetails: { name: string; latitude: number | null; longitude: number | null; timezone: string | null }
  current: {
    temperatureC: number
    feelsLikeC: number | null
    humidityPct: number
    windKph: number
    uvIndex: number | null
    precipitationMm: number | null
    condition: string
    icon: string | null
  }
  hourly: HourlyForecast[]
  daily: DailyForecast[]
  alerts: WeatherAlert[]
  agriculture: {
    rainProbability24h: number
    diseaseRisk: 'low' | 'moderate' | 'high'
    diseaseRiskReason: string
    sprayWindow: 'recommended' | 'caution' | 'not_recommended' | 'unknown'
    sprayWindowReason: string
    irrigationGuidance: string
  }
  source: {
    provider: string
    freshness: WeatherData['sourceFreshness']
    fetchedAt: string
    coverageDays: number
    attributionUrl: string
  }
}

export type WeatherRiskAssessment = {
  diseaseRisk: { level: 'low' | 'moderate' | 'high'; description: string }
  sprayTiming: { recommended: boolean; window: string; reason: string }
  irrigationNotes: string
  weatherSummary: string
  source: WeatherData['source']
  alerts: WeatherAlert[]
}

export class WeatherServiceError extends Error {
  readonly statusCode: number
  readonly code: string

  constructor(message: string, code = 'WEATHER_UNAVAILABLE', statusCode = 503) {
    super(message)
    this.name = 'WeatherServiceError'
    this.code = code
    this.statusCode = statusCode
  }
}

export const KERALA_DISTRICTS = [
  'Thiruvananthapuram', 'Kollam', 'Pathanamthitta', 'Alappuzha', 'Kottayam', 'Idukki', 'Ernakulam',
  'Thrissur', 'Palakkad', 'Malappuram', 'Kozhikode', 'Wayanad', 'Kannur', 'Kasaragod',
] as const

const WEATHER_API_BASE = 'https://api.weatherapi.com/v1'
const ATTRIBUTION_URL = 'https://www.weatherapi.com/'
const STALE_CACHE_MAX_SECONDS = 24 * 60 * 60

type WeatherApiResponse = {
  location: { name: string; lat: number; lon: number; tz_id?: string }
  current: {
    temp_c: number
    feelslike_c?: number
    humidity: number
    wind_kph: number
    uv?: number
    precip_mm?: number
    condition: { text: string; icon?: string }
  }
  forecast: {
    forecastday: Array<{
      date: string
      day: {
        maxtemp_c: number
        mintemp_c: number
        condition: { text: string; icon?: string }
        daily_chance_of_rain?: number
        totalprecip_mm?: number
      }
      astro?: { sunrise?: string; sunset?: string }
      hour: Array<{
        time: string
        temp_c: number
        humidity: number
        wind_kph: number
        precip_mm?: number
        chance_of_rain?: number
        condition: { text: string; icon?: string }
      }>
    }>
  }
  alerts?: { alert?: Array<Record<string, unknown>> }
}

const isUsableApiKey = (key: string) => Boolean(key.trim()) && !/^https?:\/\//i.test(key.trim())

const normalizeRequest = (input: WeatherLocationInput | string) => {
  const request = typeof input === 'string' ? { city: input } : input
  return {
    ...request,
    days: Math.min(14, Math.max(1, Math.round(request.days ?? env.weatherForecastDays))),
    alerts: request.alerts ?? env.weatherAlertsEnabled,
  }
}

const queryKey = (request: WeatherLocationInput) => {
  if (request.lat != null && request.lng != null) return `weather:${request.lat.toFixed(4)}:${request.lng.toFixed(4)}`
  return `weather:${(request.city || 'Thiruvananthapuram').trim().toLowerCase()}`
}

const providerQuery = (request: WeatherLocationInput) =>
  request.lat != null && request.lng != null ? `${request.lat},${request.lng}` : request.city || 'Thiruvananthapuram'

const withTimeout = async (url: string) => {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), env.weatherRequestTimeoutMs)
  try {
    return await fetch(url, { signal: controller.signal })
  } catch (error) {
    if ((error as Error)?.name === 'AbortError') throw new WeatherServiceError('Weather provider request timed out.', 'WEATHER_PROVIDER_TIMEOUT')
    throw new WeatherServiceError('Weather provider could not be reached.', 'WEATHER_PROVIDER_UNREACHABLE')
  } finally {
    clearTimeout(timeout)
  }
}

const asNumber = (value: unknown, fallback: number | null = null) =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback

const iconUrl = (icon: string | undefined) => (icon ? (icon.startsWith('//') ? `https:${icon}` : icon) : null)

const calculateAgriculture = (current: WeatherData['current'], hourly: HourlyForecast[]) => {
  const first24 = hourly.slice(0, 24)
  const rain = Math.round(first24.reduce((sum, item) => sum + (item.rain || 0), 0) / Math.max(first24.length, 1))
  const warmHumid = current.humidityPct >= 80 && current.temperatureC >= 25 && current.temperatureC <= 35
  const diseaseRisk: 'low' | 'moderate' | 'high' = warmHumid || rain >= 70 ? 'high' : current.humidityPct >= 65 || rain >= 45 ? 'moderate' : 'low'
  const diseaseRiskReason = warmHumid
    ? 'Warm, humid conditions can support fungal disease development.'
    : rain >= 70
      ? 'High rain probability increases waterlogging and splash-spread risk.'
      : diseaseRisk === 'moderate'
        ? 'Moderate humidity or rain probability warrants closer crop inspection.'
        : 'Current weather is not strongly favorable for rapid disease spread.'
  const windy = current.windKph > 15
  const rainy = rain > 50 || current.condition.toLowerCase().includes('rain')
  const sprayWindow: 'recommended' | 'caution' | 'not_recommended' | 'unknown' = windy || rainy ? (windy && rainy ? 'not_recommended' : 'caution') : 'recommended'
  const sprayWindowReason = windy
    ? `Wind is ${Math.round(current.windKph)} km/h; avoid drift during spraying.`
    : rainy
      ? `Rain probability is ${rain}%; wait for a reliably dry window.`
      : 'Calm and relatively dry conditions support a field-work window.'
  const irrigationGuidance = rain >= 70
    ? 'Pause irrigation and inspect drainage before adding water.'
    : rain >= 45
      ? 'Reduce irrigation and verify soil moisture before watering.'
      : current.temperatureC >= 33
        ? 'Check soil moisture early and irrigate during cooler hours if needed.'
        : 'Use the normal irrigation schedule and confirm soil moisture in the field.'
  return { rain, diseaseRisk, diseaseRiskReason, sprayWindow, sprayWindowReason, irrigationGuidance }
}

const normalizeProviderResponse = (body: WeatherApiResponse, requestedDays: number): WeatherData => {
  const fetchedAt = new Date().toISOString()
  const current = {
    temperatureC: Math.round(body.current.temp_c),
    feelsLikeC: asNumber(body.current.feelslike_c),
    humidityPct: Math.round(body.current.humidity),
    windKph: Math.round(body.current.wind_kph),
    uvIndex: asNumber(body.current.uv),
    precipitationMm: asNumber(body.current.precip_mm),
    condition: body.current.condition?.text || 'Unknown',
    icon: iconUrl(body.current.condition?.icon),
  }
  const hourly: HourlyForecast[] = body.forecast.forecastday.flatMap((day) => day.hour.map((hour) => ({
    time: hour.time,
    temp: Math.round(hour.temp_c),
    condition: hour.condition?.text || 'Unknown',
    rain: Math.round(hour.chance_of_rain ?? 0),
    icon: iconUrl(hour.condition?.icon),
    humidity: asNumber(hour.humidity),
    windSpeed: asNumber(hour.wind_kph),
    precipitationMm: asNumber(hour.precip_mm),
  }))).slice(0, 24)
  const daily: DailyForecast[] = body.forecast.forecastday.map((day, index) => ({
    day: index === 0 ? 'Today' : index === 1 ? 'Tomorrow' : new Intl.DateTimeFormat('en-IN', { weekday: 'long' }).format(new Date(`${day.date}T12:00:00`)),
    date: day.date,
    condition: day.day.condition?.text || 'Unknown',
    high: Math.round(day.day.maxtemp_c),
    low: Math.round(day.day.mintemp_c),
    icon: iconUrl(day.day.condition?.icon),
    rain: asNumber(day.day.daily_chance_of_rain, 0),
    precipitationMm: asNumber(day.day.totalprecip_mm),
    sunrise: day.astro?.sunrise ?? null,
    sunset: day.astro?.sunset ?? null,
  }))
  const alerts: WeatherAlert[] = (body.alerts?.alert ?? []).map((alert) => ({
    headline: String(alert.headline || alert.event || 'Weather alert'),
    event: String(alert.event || 'Weather alert'),
    severity: typeof alert.severity === 'string' ? alert.severity : null,
    urgency: typeof alert.urgency === 'string' ? alert.urgency : null,
    description: typeof alert.desc === 'string' ? alert.desc : null,
    instruction: typeof alert.instruction === 'string' ? alert.instruction : null,
    effective: typeof alert.effective === 'string' ? alert.effective : null,
    expires: typeof alert.expires === 'string' ? alert.expires : null,
    areas: typeof alert.areas === 'string' ? alert.areas : null,
    source: 'weatherapi',
  }))
  const agriculture = calculateAgriculture(current, hourly)
  return {
    location: body.location.name,
    temperature: current.temperatureC,
    condition: current.condition,
    humidity: current.humidityPct,
    windSpeed: current.windKph,
    uvIndex: current.uvIndex,
    rainfallProbability: agriculture.rain,
    icon: current.icon,
    hourlyForecast: hourly,
    weeklyForecast: daily,
    sourceFreshness: 'live',
    fetchedAt,
    dataMode: 'live',
    locationDetails: { name: body.location.name, latitude: asNumber(body.location.lat), longitude: asNumber(body.location.lon), timezone: body.location.tz_id ?? null },
    current,
    hourly,
    daily,
    alerts,
    agriculture: {
      rainProbability24h: agriculture.rain,
      diseaseRisk: agriculture.diseaseRisk,
      diseaseRiskReason: agriculture.diseaseRiskReason,
      sprayWindow: agriculture.sprayWindow,
      sprayWindowReason: agriculture.sprayWindowReason,
      irrigationGuidance: agriculture.irrigationGuidance,
    },
    source: { provider: 'weatherapi', freshness: 'live', fetchedAt, coverageDays: Math.min(requestedDays, daily.length), attributionUrl: ATTRIBUTION_URL },
  }
}

const markCached = (data: WeatherData, freshness: 'cached' | 'stale'): WeatherData => ({
  ...data,
  sourceFreshness: freshness,
  dataMode: 'cached',
  source: { ...data.source, freshness },
})

const persistWeatherToDb = (data: WeatherData) => {
  try {
    getDb().insert(weatherCacheTable).values({
      city: data.location,
      temperature: data.temperature,
      humidity: data.humidity,
      rainfallProbability: data.rainfallProbability,
      windSpeed: data.windSpeed,
      weatherCondition: data.condition,
      forecastJson: data,
      forecastTimestamp: new Date(data.fetchedAt),
    }).then(() => console.log(`[weather] persisted provider snapshot for ${data.location}`))
      .catch((error) => console.warn('[weather] database cache write failed:', (error as Error).name || 'unknown error'))
  } catch {
    // Database is optional for the public weather route.
  }
}

const readDatabaseCache = async (request: WeatherLocationInput): Promise<WeatherData | null> => {
  if (!request.city) return null
  try {
    const rows = await getDb().select().from(weatherCacheTable).where(eq(weatherCacheTable.city, request.city)).orderBy(desc(weatherCacheTable.fetchedAt)).limit(1)
    const row = rows[0]
    if (!row?.forecastJson || Date.now() - new Date(row.fetchedAt).getTime() > STALE_CACHE_MAX_SECONDS * 1000) return null
    const payload = row.forecastJson as WeatherData
    if (!payload.current || !payload.hourly || !payload.daily) return null
    return markCached(payload, 'stale')
  } catch {
    return null
  }
}

const fetchLive = async (request: ReturnType<typeof normalizeRequest>): Promise<WeatherData> => {
  if (env.weatherProvider !== 'weatherapi') throw new WeatherServiceError(`Unsupported weather provider: ${env.weatherProvider}`, 'WEATHER_PROVIDER_UNSUPPORTED', 500)
  if (!isUsableApiKey(env.weatherApiKey)) throw new WeatherServiceError('WEATHER_API_KEY is missing or is not a WeatherAPI key.', 'WEATHER_PROVIDER_NOT_CONFIGURED')
  const params = new URLSearchParams({ key: env.weatherApiKey, q: providerQuery(request), days: String(request.days), aqi: 'no', alerts: request.alerts ? 'yes' : 'no' })
  const startedAt = Date.now()
  const response = await withTimeout(`${WEATHER_API_BASE}/forecast.json?${params.toString()}`)
  const body = await response.json().catch(() => ({})) as WeatherApiResponse & { error?: { message?: string } }
  if (!response.ok || body.error) {
    console.warn(`[weather] provider failure status=${response.status} durationMs=${Date.now() - startedAt}`)
    throw new WeatherServiceError(body.error?.message || `Weather provider returned HTTP ${response.status}.`, response.status === 401 || response.status === 403 ? 'WEATHER_PROVIDER_AUTH' : 'WEATHER_PROVIDER_ERROR')
  }
  const result = normalizeProviderResponse(body, request.days)
  console.log(`[weather] provider=weatherapi status=live durationMs=${Date.now() - startedAt} location=${result.location}`)
  weatherCache.set(queryKey(request), result, env.weatherCacheTtlMinutes * 60)
  persistWeatherToDb(result)
  return result
}

export const getWeather = async (input: WeatherLocationInput | string): Promise<WeatherData> => {
  const request = normalizeRequest(input)
  const key = queryKey(request)
  const cached = weatherCache.get<WeatherData>(key)
  if (cached) {
    console.log(`[weather] cache hit key=${key}`)
    return markCached(cached, 'cached')
  }
  try {
    return await fetchLive(request)
  } catch (error) {
    const databaseCache = await readDatabaseCache(request)
    if (databaseCache) {
      console.warn(`[weather] using stale database cache key=${key}`)
      return databaseCache
    }
    if (error instanceof WeatherServiceError) throw error
    throw new WeatherServiceError('Weather is unavailable right now.')
  }
}

export const getWeatherRiskAssessment = async (input: WeatherLocationInput | string): Promise<WeatherRiskAssessment> => {
  const weather = await getWeather(input)
  const isReliable = weather.sourceFreshness === 'live' || weather.sourceFreshness === 'cached'
  const { agriculture } = weather
  return {
    diseaseRisk: { level: agriculture.diseaseRisk, description: agriculture.diseaseRiskReason },
    sprayTiming: {
      recommended: isReliable && agriculture.sprayWindow === 'recommended',
      window: isReliable ? agriculture.sprayWindow : 'Weather data is not fresh enough for a spray decision',
      reason: isReliable ? agriculture.sprayWindowReason : 'Refresh weather before making a weather-dependent intervention decision.',
    },
    irrigationNotes: agriculture.irrigationGuidance,
    weatherSummary: `${weather.location}: ${weather.temperature}°C, ${weather.condition}, humidity ${weather.humidity}%, wind ${weather.windSpeed} km/h, rain chance ${weather.rainfallProbability}%`,
    source: weather.source,
    alerts: weather.alerts,
  }
}
