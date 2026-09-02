import { Router } from 'express'
import { getWeather, getWeatherRiskAssessment, KERALA_DISTRICTS } from '../services/weatherService.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { httpError } from '../utils/httpError.js'

export const weatherRoutes = Router()

/**
 * GET /weather?city=Thiruvananthapuram&days=3&alerts=true
 * Coordinates may be supplied with lat/lng for field-level weather.
 */
weatherRoutes.get(
  '/weather',
  asyncHandler(async (req, res) => {
    const city =
      typeof req.query.city === 'string' && req.query.city.trim()
        ? req.query.city.trim()
        : undefined

    if (city && city.length > 100) {
      throw httpError(400, 'City name too long.')
    }

    const lat = parseCoordinate(req.query.lat, -90, 90)
    const lng = parseCoordinate(req.query.lng, -180, 180)
    if ((req.query.lat !== undefined && lat === null) || (req.query.lng !== undefined && lng === null)) {
      throw httpError(400, 'Latitude and longitude must be valid numbers.')
    }
    if ((lat === null) !== (lng === null)) {
      throw httpError(400, 'Latitude and longitude must be supplied together.')
    }

    const days = parseDays(req.query.days)
    const alerts = parseBoolean(req.query.alerts, true)

    const data = await getWeather({ city: city || 'Thiruvananthapuram', lat: lat ?? undefined, lng: lng ?? undefined, days, alerts })
    res.json(data)
  }),
)

/**
 * GET /weather/risk?city=Thrissur
 * Returns agricultural risk assessment: disease spread risk,
 * spray timing windows, and irrigation notes.
 */
weatherRoutes.get(
  '/weather/risk',
  asyncHandler(async (req, res) => {
    const city =
      typeof req.query.city === 'string' && req.query.city.trim()
        ? req.query.city.trim()
        : undefined

    if (city && city.length > 100) {
      throw httpError(400, 'City name too long.')
    }

    const lat = parseCoordinate(req.query.lat, -90, 90)
    const lng = parseCoordinate(req.query.lng, -180, 180)
    if ((lat === null) !== (lng === null)) {
      throw httpError(400, 'Latitude and longitude must be supplied together.')
    }

    const assessment = await getWeatherRiskAssessment({ city: city || 'Thiruvananthapuram', lat: lat ?? undefined, lng: lng ?? undefined })
    res.json(assessment)
  }),
)

/**
 * GET /weather/districts
 * Returns the list of supported Kerala districts.
 */
weatherRoutes.get('/weather/districts', (_req, res) => {
  res.json({ districts: KERALA_DISTRICTS })
})

function parseCoordinate(value: unknown, min: number, max: number): number | null {
  if (value === undefined) return null
  if (typeof value !== 'string' || !value.trim()) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= min && parsed <= max ? parsed : null
}

function parseDays(value: unknown): number | undefined {
  if (value === undefined) return undefined
  if (typeof value !== 'string' || !/^\d+$/.test(value)) throw httpError(400, 'days must be a positive integer.')
  const parsed = Number(value)
  if (parsed < 1 || parsed > 14) throw httpError(400, 'days must be between 1 and 14.')
  return parsed
}

function parseBoolean(value: unknown, fallback: boolean): boolean {
  if (value === undefined) return fallback
  if (value === 'true' || value === '1') return true
  if (value === 'false' || value === '0') return false
  throw httpError(400, 'alerts must be true or false.')
}

