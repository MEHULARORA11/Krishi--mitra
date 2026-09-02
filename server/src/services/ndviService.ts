/**
 * Sentinel-2 NDVI Service
 * ========================
 * For hackathon: uses one field polygon/centroid and NDVI trend snapshots.
 * Presented as "crop health map/trend," NOT "3D crop health."
 *
 * Uses Copernicus Data Space Sentinel Hub Processing API:
 *   https://sh.dataspace.copernicus.eu/api/v1/process
 *
 * Stores: NDVI value, cloud cover, capture date, tile/source.
 */

import axios from 'axios'
import { desc, and, between } from 'drizzle-orm'
import { env } from '../config/env.js'
import { ndviCache } from '../utils/cache.js'
import { getDb } from '../db/index.js'
import { ndviSnapshots } from '../db/schema.js'

const SENTINEL_TOKEN_URL = 'https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token'
const SENTINEL_PROCESS_URL = 'https://sh.dataspace.copernicus.eu/api/v1/process'
const CACHE_TTL_SECONDS = 21600 // 6 hours

export type NdviSnapshot = {
  ndviValue: number
  cloudCover: number
  captureDate: string
  tileSource: string
  healthLabel: string
  centroidLat: number
  centroidLng: number
}

export type NdviTrend = {
  snapshots: NdviSnapshot[]
  currentHealth: string
  trendDirection: 'improving' | 'stable' | 'declining'
  summary: string
}

/** Default demo polygon — a rice paddy field in Thrissur, Kerala */
const DEFAULT_DEMO_POLYGON = {
  type: 'Polygon' as const,
  coordinates: [
    [
      [76.21, 10.52],
      [76.22, 10.52],
      [76.22, 10.53],
      [76.21, 10.53],
      [76.21, 10.52],
    ],
  ],
}

// Evalscript to compute NDVI from Sentinel-2 L2A bands
const NDVI_EVALSCRIPT = `
//VERSION=3
function setup() {
  return {
    input: [{ bands: ["B04", "B08", "SCL"], units: "DN" }],
    output: { bands: 1, sampleType: "FLOAT32" }
  };
}

function evaluatePixel(sample) {
  // Skip clouds (SCL classes 8,9,10 are cloud/shadow)
  if (sample.SCL >= 8 && sample.SCL <= 10) return [-1];
  
  let nir = sample.B08;
  let red = sample.B04;
  
  if (nir + red === 0) return [0];
  return [(nir - red) / (nir + red)];
}
`

/** Get an OAuth2 access token from Copernicus Data Space. */
let _tokenCache: { token: string; expiresAt: number } | null = null

async function getSentinelToken(): Promise<string> {
  if (_tokenCache && Date.now() < _tokenCache.expiresAt) {
    return _tokenCache.token
  }

  const res = await axios.post(
    SENTINEL_TOKEN_URL,
    new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: env.sentinelClientId,
      client_secret: env.sentinelClientSecret,
    }),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
  )

  _tokenCache = {
    token: res.data.access_token as string,
    expiresAt: Date.now() + (res.data.expires_in as number) * 1000 - 60000, // 1 min buffer
  }
  return _tokenCache.token
}

/** Map NDVI value to human-readable health label. */
function ndviToHealthLabel(ndvi: number): string {
  if (ndvi < 0) return 'No data (cloud cover)'
  if (ndvi < 0.1) return 'Bare soil / No vegetation'
  if (ndvi < 0.2) return 'Very low vegetation'
  if (ndvi < 0.3) return 'Low vegetation / Stressed'
  if (ndvi < 0.5) return 'Moderate vegetation'
  if (ndvi < 0.7) return 'Healthy vegetation'
  return 'Very healthy / Dense vegetation'
}

/** Determine trend direction from a series of NDVI values. */
function computeTrend(values: number[]): 'improving' | 'stable' | 'declining' {
  if (values.length < 2) return 'stable'
  const recent = values.slice(-3)
  const older = values.slice(0, Math.max(values.length - 3, 1))
  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length
  const olderAvg = older.reduce((a, b) => a + b, 0) / older.length
  const diff = recentAvg - olderAvg
  if (diff > 0.05) return 'improving'
  if (diff < -0.05) return 'declining'
  return 'stable'
}

/**
 * Fetch NDVI snapshot for a given location.
 * For hackathon: creates a small bounding box around the centroid.
 */
export const getNdviSnapshot = async (
  lat: number,
  lng: number,
): Promise<NdviSnapshot> => {
  const cacheKey = `ndvi:${lat.toFixed(3)}:${lng.toFixed(3)}`
  const cached = ndviCache.get<NdviSnapshot>(cacheKey)
  if (cached) {
    console.log(`[ndvi] Cache hit for ${cacheKey}`)
    return cached
  }

  let snapshot: NdviSnapshot

  if (!env.sentinelClientId || !env.sentinelClientSecret) {
    console.warn('[ndvi] No Sentinel credentials — returning mock data')
    snapshot = generateMockNdvi(lat, lng)
  } else {
    try {
      snapshot = await fetchFromSentinel(lat, lng)
    } catch (err) {
      console.error('[ndvi] Sentinel fetch failed, using mock:', err)
      snapshot = generateMockNdvi(lat, lng)
    }
  }

  ndviCache.set(cacheKey, snapshot, CACHE_TTL_SECONDS)

  // Persist to DB (non-blocking)
  persistNdviToDb(snapshot)

  return snapshot
}

/**
 * Get NDVI trend over time for a location.
 * Returns stored snapshots + current, with trend analysis.
 */
export const getNdviTrend = async (
  lat: number,
  lng: number,
  days: number = 90,
): Promise<NdviTrend> => {
  // Get current snapshot
  const current = await getNdviSnapshot(lat, lng)

  // Try to fetch historical from DB
  let historicalSnapshots: NdviSnapshot[] = []
  try {
    const db = getDb()
    const records = await db
      .select()
      .from(ndviSnapshots)
      .where(
        and(
          between(ndviSnapshots.centroidLat, lat - 0.05, lat + 0.05),
          between(ndviSnapshots.centroidLng, lng - 0.05, lng + 0.05),
        ),
      )
      .orderBy(desc(ndviSnapshots.fetchedAt))
      .limit(20)

    historicalSnapshots = records.map((r) => ({
      ndviValue: r.ndviValue,
      cloudCover: r.cloudCover || 0,
      captureDate: r.captureDate,
      tileSource: r.tileSource || 'Sentinel-2 L2A',
      healthLabel: ndviToHealthLabel(r.ndviValue),
      centroidLat: r.centroidLat,
      centroidLng: r.centroidLng,
    }))
  } catch {
    // DB not available — generate mock historical
    historicalSnapshots = generateMockTrendData(lat, lng, days)
  }

  // Combine historical + current
  const allSnapshots = [...historicalSnapshots, current]
  const ndviValues = allSnapshots.map((s) => s.ndviValue).filter((v) => v >= 0)
  const trendDirection = computeTrend(ndviValues)

  const trendWord = {
    improving: 'improving — vegetation density is increasing',
    stable: 'stable — vegetation density is consistent',
    declining: 'declining — vegetation may be stressed or harvested',
  }[trendDirection]

  return {
    snapshots: allSnapshots.slice(-20),
    currentHealth: current.healthLabel,
    trendDirection,
    summary:
      `Crop health trend for (${lat.toFixed(2)}, ${lng.toFixed(2)}): ${trendWord}. ` +
      `Current NDVI: ${current.ndviValue.toFixed(2)} (${current.healthLabel}). ` +
      `Based on ${allSnapshots.length} observations over ~${days} days.`,
  }
}

// ─── Internal Helpers ────────────────────────────────────────────────────────

async function fetchFromSentinel(lat: number, lng: number): Promise<NdviSnapshot> {
  const token = await getSentinelToken()

  // Create a small bbox around the centroid (~500m)
  const delta = 0.005
  const bbox = [lng - delta, lat - delta, lng + delta, lat + delta]

  const today = new Date()
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)

  const requestBody = {
    input: {
      bounds: {
        bbox,
        properties: { crs: 'http://www.opengis.net/def/crs/EPSG/0/4326' },
      },
      data: [
        {
          type: 'sentinel-2-l2a',
          dataFilter: {
            timeRange: {
              from: thirtyDaysAgo.toISOString(),
              to: today.toISOString(),
            },
            maxCloudCoverage: 30,
          },
        },
      ],
    },
    output: {
      width: 64,
      height: 64,
      responses: [{ identifier: 'default', format: { type: 'image/tiff' } }],
    },
    evalscript: NDVI_EVALSCRIPT,
  }

  const res = await axios.post(SENTINEL_PROCESS_URL, requestBody, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/tar',
    },
    responseType: 'arraybuffer',
    timeout: 30000,
  })

  // Parse the response — for hackathon, compute average NDVI from the returned image
  // In production, you'd parse the GeoTIFF properly
  const buffer = Buffer.from(res.data as ArrayBuffer)
  const avgNdvi = computeAverageFromBuffer(buffer)

  return {
    ndviValue: avgNdvi,
    cloudCover: 0, // Would come from metadata in production
    captureDate: today.toISOString().split('T')[0],
    tileSource: 'Sentinel-2 L2A (Copernicus)',
    healthLabel: ndviToHealthLabel(avgNdvi),
    centroidLat: lat,
    centroidLng: lng,
  }
}

/** Simple average computation from raw buffer — hackathon approximation. */
function computeAverageFromBuffer(buffer: Buffer): number {
  // Try to read as float32 values
  const floatCount = Math.floor(buffer.length / 4)
  if (floatCount === 0) return 0.45 // fallback

  let sum = 0
  let validCount = 0

  for (let i = 0; i < floatCount; i++) {
    const val = buffer.readFloatLE(i * 4)
    if (val >= -1 && val <= 1 && val !== -1) {
      // Valid NDVI range, excluding cloud mask (-1)
      sum += val
      validCount++
    }
  }

  return validCount > 0 ? Math.round((sum / validCount) * 100) / 100 : 0.45
}

function generateMockNdvi(lat: number, lng: number): NdviSnapshot {
  // Generate realistic NDVI based on a seeded pseudo-random from coordinates
  const seed = Math.sin(lat * 12.9898 + lng * 78.233) * 43758.5453
  const base = 0.3 + (seed - Math.floor(seed)) * 0.5 // Range 0.3–0.8
  const ndvi = Math.round(base * 100) / 100

  return {
    ndviValue: ndvi,
    cloudCover: Math.round(Math.random() * 20),
    captureDate: new Date().toISOString().split('T')[0],
    tileSource: 'Mock (Sentinel-2 L2A)',
    healthLabel: ndviToHealthLabel(ndvi),
    centroidLat: lat,
    centroidLng: lng,
  }
}

function generateMockTrendData(lat: number, lng: number, days: number): NdviSnapshot[] {
  const snapshots: NdviSnapshot[] = []
  const numPoints = Math.min(Math.floor(days / 5), 18) // ~1 observation per 5 days
  const now = Date.now()

  for (let i = numPoints; i >= 1; i--) {
    const date = new Date(now - i * 5 * 24 * 60 * 60 * 1000)
    const seasonalFactor = Math.sin((date.getMonth() / 12) * Math.PI * 2) * 0.1
    const baseNdvi = 0.45 + seasonalFactor + (Math.random() - 0.5) * 0.1
    const ndvi = Math.max(0.1, Math.min(0.9, Math.round(baseNdvi * 100) / 100))

    snapshots.push({
      ndviValue: ndvi,
      cloudCover: Math.round(Math.random() * 30),
      captureDate: date.toISOString().split('T')[0],
      tileSource: 'Mock (Sentinel-2 L2A)',
      healthLabel: ndviToHealthLabel(ndvi),
      centroidLat: lat,
      centroidLng: lng,
    })
  }

  return snapshots
}

function persistNdviToDb(snapshot: NdviSnapshot) {
  try {
    const db = getDb()
    db.insert(ndviSnapshots)
      .values({
        centroidLat: snapshot.centroidLat,
        centroidLng: snapshot.centroidLng,
        ndviValue: snapshot.ndviValue,
        cloudCover: snapshot.cloudCover,
        captureDate: snapshot.captureDate,
        tileSource: snapshot.tileSource,
      })
      .then(() => console.log(`[ndvi] Persisted snapshot to DB`))
      .catch((err) => console.error('[ndvi] DB persist failed:', err))
  } catch {
    // DB not configured
  }
}
