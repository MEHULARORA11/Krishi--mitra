import assert from 'node:assert/strict'
import { env } from '../config/env.js'
import { getWeather, WeatherServiceError } from '../services/weatherService.js'
import { weatherCache } from '../utils/cache.js'

const originalFetch = globalThis.fetch
const originalKey = env.weatherApiKey
const originalDatabaseUrl = env.databaseUrl

const hourly = Array.from({ length: 24 }, (_, index) => ({
  time: `2026-08-22 ${String(index).padStart(2, '0')}:00`,
  temp_c: 28,
  humidity: 82,
  wind_kph: 10,
  precip_mm: 1,
  chance_of_rain: 40,
  condition: { text: 'Cloudy', icon: '//cdn.weatherapi.com/weather/64x64/day/116.png' },
}))

const providerBody = {
  location: { name: 'Thrissur', lat: 10.52, lon: 76.21, tz_id: 'Asia/Kolkata' },
  current: {
    temp_c: 30,
    feelslike_c: 31,
    humidity: 72,
    wind_kph: 12,
    uv: 5,
    precip_mm: 0,
    condition: { text: 'Partly cloudy', icon: '//cdn.weatherapi.com/weather/64x64/day/116.png' },
  },
  forecast: {
    forecastday: [
      {
        date: '2026-08-22',
        day: {
          maxtemp_c: 31,
          mintemp_c: 24,
          condition: { text: 'Cloudy', icon: '//cdn.weatherapi.com/weather/64x64/day/119.png' },
          daily_chance_of_rain: 40,
          totalprecip_mm: 2,
        },
        astro: { sunrise: '06:10 AM', sunset: '06:35 PM' },
        hour: hourly,
      },
    ],
  },
  alerts: {
    alert: [{ headline: 'Heavy rain', event: 'Rain', severity: 'Moderate', desc: 'Review drainage' }],
  },
}

const response = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

const run = async () => {
  env.databaseUrl = ''
  weatherCache.invalidatePrefix('weather:')
  env.weatherApiKey = ''

  await assert.rejects(
    () => getWeather('Thrissur'),
    (error: WeatherServiceError) => error.code === 'WEATHER_PROVIDER_NOT_CONFIGURED' && error.statusCode === 503,
  )

  env.weatherApiKey = 'test-weatherapi-key'
  let requestedUrl = ''
  globalThis.fetch = async (input) => {
    requestedUrl = String(input)
    return response(providerBody)
  }
  const live = await getWeather({ city: 'Thrissur', days: 3, alerts: true })
  assert.equal(live.source.provider, 'weatherapi')
  assert.equal(live.sourceFreshness, 'live')
  assert.equal(live.locationDetails.latitude, 10.52)
  assert.equal(live.hourly.length, 24)
  assert.equal(live.alerts.length, 1)
  assert.match(requestedUrl, /alerts=yes/)
  assert.match(requestedUrl, /days=3/)

  const cached = await getWeather('Thrissur')
  assert.equal(cached.sourceFreshness, 'cached')
  assert.equal(cached.dataMode, 'cached')

  weatherCache.invalidatePrefix('weather:')
  globalThis.fetch = async () => response({ error: { message: 'Invalid API key' } }, 401)
  await assert.rejects(
    () => getWeather({ lat: 10.52, lng: 76.21 }),
    (error: WeatherServiceError) => error.code === 'WEATHER_PROVIDER_AUTH' && error.statusCode === 503,
  )

  console.log('Weather flow verification passed: configuration, mapping, coordinates, alerts, and outage handling.')
}

run()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => {
    globalThis.fetch = originalFetch
    env.weatherApiKey = originalKey
    env.databaseUrl = originalDatabaseUrl
  })
