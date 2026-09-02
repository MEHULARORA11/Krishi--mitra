import { useCallback, useEffect, useRef, useState } from 'react'
import { apiClient } from '../../lib/api'

const FALLBACK_DISTRICTS = [
  'Thiruvananthapuram',
  'Kollam',
  'Pathanamthitta',
  'Alappuzha',
  'Kottayam',
  'Idukki',
  'Ernakulam',
  'Thrissur',
  'Palakkad',
  'Malappuram',
  'Kozhikode',
  'Wayanad',
  'Kannur',
  'Kasaragod',
]

const mapWeather = (data) => ({
  ...data,
  location: data.location ?? data.locationDetails?.name ?? 'Unknown location',
  temperature: data.temperature ?? data.current?.temperatureC ?? null,
  condition: data.condition ?? data.current?.condition ?? 'Unknown',
  humidity: data.humidity ?? data.current?.humidityPct ?? null,
  windSpeed: data.windSpeed ?? data.current?.windKph ?? null,
  rainfallProbability: data.rainfallProbability ?? data.agriculture?.rainProbability24h ?? null,
  hourlyForecast: data.hourlyForecast ?? data.hourly ?? [],
  weeklyForecast: data.weeklyForecast ?? data.daily ?? [],
  dataMode: data.dataMode ?? (data.sourceFreshness === 'live' ? 'live' : 'cached'),
  source: data.source ?? {
    provider: 'weatherapi',
    freshness: data.sourceFreshness ?? 'unavailable',
    fetchedAt: data.fetchedAt ?? null,
    coverageDays: data.weeklyForecast?.length ?? 0,
    attributionUrl: 'https://www.weatherapi.com/',
  },
  alerts: data.alerts ?? [],
  agriculture: data.agriculture ?? null,
})

export const fetchWeatherSnapshot = async (city, options = {}) => {
  const params = new URLSearchParams({ city })
  if (options.lat != null && options.lng != null) {
    params.set('lat', String(options.lat))
    params.set('lng', String(options.lng))
  }
  if (options.days != null) params.set('days', String(options.days))
  params.set('alerts', options.alerts === false ? 'false' : 'true')
  const response = await apiClient.get(`/weather?${params.toString()}`, { signal: options.signal })
  return mapWeather(response)
}

export const fetchWeatherDistricts = async () => {
  try {
    const response = await apiClient.get('/weather/districts')
    return response.districts
  } catch {
    return FALLBACK_DISTRICTS
  }
}

export const useWeatherSnapshot = (city, options = {}) => {
  const [weather, setWeather] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const requestId = useRef(0)
  const { lat, lng, days, alerts } = options

  const load = useCallback(async (signal) => {
    const id = ++requestId.current
    setLoading(true)
    try {
      const nextWeather = await fetchWeatherSnapshot(city, { lat, lng, days, alerts, signal })
      if (id === requestId.current) {
        setWeather(nextWeather)
        setError(null)
      }
      return nextWeather
    } catch (nextError) {
      if (!signal?.aborted && nextError?.name !== 'AbortError' && id === requestId.current) {
        setError(nextError)
        setWeather(null)
      }
      throw nextError
    } finally {
      if (!signal?.aborted && id === requestId.current) setLoading(false)
    }
  }, [city, lat, lng, days, alerts])

  useEffect(() => {
    const controller = new AbortController()
    load(controller.signal).catch(() => undefined)
    return () => controller.abort()
  }, [load])

  const refresh = useCallback(() => {
    const controller = new AbortController()
    load(controller.signal).catch(() => undefined)
  }, [load])

  return { weather, loading, error, refresh }
}
