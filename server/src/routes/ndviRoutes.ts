import sharp from 'sharp'
import { Router } from 'express'
import { ndviQuerySchema } from '../schemas/requestSchemas.js'
import { getNdviSnapshot, getNdviTrend } from '../services/ndviService.js'
import { asyncHandler } from '../utils/asyncHandler.js'

export const ndviRoutes = Router()

/**
 * GET /ndvi/snapshot?lat=10.5&lng=76.2
 * Get latest NDVI crop health snapshot for a location.
 */
ndviRoutes.get(
  '/ndvi/snapshot',
  asyncHandler(async (req, res) => {
    const input = ndviQuerySchema.parse({
      lat: req.query.lat,
      lng: req.query.lng,
    })

    const snapshot = await getNdviSnapshot(input.lat, input.lng)
    res.json({
      label: 'Crop Health Snapshot',
      ...snapshot,
    })
  }),
)

/**
 * GET /ndvi/trend?lat=10.5&lng=76.2&days=90
 * Get NDVI time series for crop health trend analysis.
 */
ndviRoutes.get(
  '/ndvi/trend',
  asyncHandler(async (req, res) => {
    const input = ndviQuerySchema.parse({
      lat: req.query.lat,
      lng: req.query.lng,
      days: req.query.days,
    })

    const trend = await getNdviTrend(input.lat, input.lng, input.days)
    res.json({
      label: 'Crop Health Trend',
      ...trend,
    })
  }),
)

import axios from 'axios';
import { env } from '../config/env.js';
import { getAccessToken } from '../services/copernicusAuth.js';

const imageCache = new Map<string, string>();

const ndviEvalscript = `
  //VERSION=3
  function setup() {
    return { input: ["B04", "B08", "dataMask"], output: { bands: 4 } };
  }
  function evaluatePixel(sample) {
    if (sample.dataMask === 0) return [0, 0, 0, 0]; // transparent - no data

    let ndvi = (sample.B08 - sample.B04) / (sample.B08 + sample.B04);

    // Bare / non-vegetated – fully transparent so base satellite tiles show through
    if (ndvi < 0.1) return [0, 0, 0, 0];

    // High Stress – Red  (NDVI 0.1–0.2)
    if (ndvi < 0.2) return [0.85, 0.10, 0.10, 0.80];

    // Attention – Yellow  (NDVI 0.2–0.5)
    if (ndvi < 0.5) return [0.95, 0.78, 0.06, 0.75];

    // Healthy – Green  (NDVI >= 0.5)
    return [0.10, 0.55, 0.18, 0.70];
  }
`;

const generateMockNdviTile = async (): Promise<string> => {
  const svg = `<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="g1" cx="35%" cy="40%" r="55%">
        <stop offset="0%" stop-color="#27ae60" stop-opacity="0.75" />
        <stop offset="65%" stop-color="#2ecc71" stop-opacity="0.65" />
        <stop offset="90%" stop-color="#f1c40f" stop-opacity="0.55" />
        <stop offset="100%" stop-color="#e67e22" stop-opacity="0.5" />
      </radialGradient>
      <radialGradient id="g2" cx="70%" cy="65%" r="40%">
        <stop offset="0%" stop-color="#229954" stop-opacity="0.7" />
        <stop offset="70%" stop-color="#27ae60" stop-opacity="0.6" />
        <stop offset="100%" stop-color="#f39c12" stop-opacity="0.4" />
      </radialGradient>
    </defs>
    <rect width="512" height="512" fill="url(#g1)" />
    <circle cx="360" cy="330" r="140" fill="url(#g2)" />
    <circle cx="160" cy="200" r="100" fill="#27ae60" fill-opacity="0.7" />
    <circle cx="430" cy="120" r="60" fill="#f1c40f" fill-opacity="0.55" />
  </svg>`
  const buffer = await sharp(Buffer.from(svg)).png().toBuffer()
  return `data:image/png;base64,${buffer.toString('base64')}`
}

const polygonCache = new Map<string, string>();

async function getOrCreateAgromonitoringPolygon(bbox: number[], apiKey: string): Promise<string> {
  const polyKey = bbox.map((n) => n.toFixed(4)).join(',');
  if (polygonCache.has(polyKey)) {
    return polygonCache.get(polyKey)!;
  }

  const payload = {
    name: `Field_${polyKey.replace(/[.,]/g, '_')}`,
    geo_json: {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [bbox[0], bbox[1]],
            [bbox[2], bbox[1]],
            [bbox[2], bbox[3]],
            [bbox[0], bbox[3]],
            [bbox[0], bbox[1]],
          ],
        ],
      },
    },
  };

  const res = await axios.post(
    `https://api.agromonitoring.com/agro/1.0/polygons?appid=${apiKey}`,
    payload,
    { headers: { 'Content-Type': 'application/json' }, timeout: 8000 }
  );

  const polyId = res.data.id as string;
  polygonCache.set(polyKey, polyId);
  return polyId;
}

async function fetchFromAgromonitoring(bbox: number[], apiKey: string): Promise<{ imageSrc: string; stats?: any } | null> {
  const polyId = await getOrCreateAgromonitoringPolygon(bbox, apiKey);
  const now = Math.floor(Date.now() / 1000);
  const start = now - 90 * 24 * 3600;

  const searchRes = await axios.get(
    `https://api.agromonitoring.com/agro/1.0/image/search?start=${start}&end=${now}&polyid=${polyId}&appid=${apiKey}`,
    { timeout: 8000 }
  );

  const images = searchRes.data;
  if (!Array.isArray(images) || images.length === 0) {
    return null;
  }

  images.sort((a: any, b: any) => (a.cl ?? 100) - (b.cl ?? 100) || b.dt - a.dt);
  const best = images[0];

  const ndviUrl = best.image?.ndvi;
  if (!ndviUrl) return null;

  const imageRes = await axios.get(`${ndviUrl}&appid=${apiKey}`, {
    responseType: 'arraybuffer',
    timeout: 10000,
  });

  const base64Image = Buffer.from(imageRes.data, 'binary').toString('base64');
  return {
    imageSrc: `data:image/png;base64,${base64Image}`,
    stats: best.stats?.ndvi || null,
  };
}

ndviRoutes.post(
  '/api/ndvi/generate',
  asyncHandler(async (req, res) => {
    const { bbox } = req.body;
    if (!bbox || !Array.isArray(bbox) || bbox.length !== 4) {
      res.status(400).json({ error: "Invalid bounding box" });
      return;
    }
    const cacheKey = bbox.join(',');

    if (imageCache.has(cacheKey)) {
      res.json({ imageSrc: imageCache.get(cacheKey), bounds: bbox });
      return;
    }

    // Try Agromonitoring first if key is configured
    if (env.agromonitoringApiKey?.trim()) {
      try {
        console.log('[NDVI] Fetching live satellite imagery from Agromonitoring...');
        const liveResult = await fetchFromAgromonitoring(bbox, env.agromonitoringApiKey.trim());
        if (liveResult?.imageSrc) {
          imageCache.set(cacheKey, liveResult.imageSrc);
          res.json({
            imageSrc: liveResult.imageSrc,
            bounds: bbox,
            stats: liveResult.stats,
            isMock: false,
            source: 'Agromonitoring (Sentinel-2 L2A)',
          });
          return;
        }
      } catch (err: any) {
        console.warn('[NDVI] Agromonitoring notice:', err.response?.data?.message || err.message);
      }
    }

    try {
      const token = await getAccessToken();

      const toTime = new Date();
      const fromTime = new Date(toTime.getTime() - 30 * 24 * 60 * 60 * 1000);

      const payload = {
        input: {
          bounds: { bbox: bbox },
          data: [{ 
            type: "sentinel-2-l2a",
            dataFilter: {
              timeRange: {
                from: fromTime.toISOString(),
                to: toTime.toISOString()
              }
            }
          }]
        },
        output: { width: 512, height: 512, responses: [{ identifier: "default", format: { type: "image/png" } }] },
        evalscript: ndviEvalscript
      };

      const response = await axios.post(
        'https://sh.dataspace.copernicus.eu/api/v1/process',
        payload,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'image/png',
            'Content-Type': 'application/json',
          },
          responseType: 'arraybuffer'
        }
      );

      const base64Image = Buffer.from(response.data, 'binary').toString('base64');
      const imageSrc = `data:image/png;base64,${base64Image}`;
      
      imageCache.set(cacheKey, imageSrc);
      res.json({ imageSrc, bounds: bbox });
    } catch (error: any) {
      const isAxios = error?.isAxiosError === true;
      const status  = error?.response?.status;
      const body    = isAxios && error.response?.data
        ? (() => {
            try {
              // arraybuffer errors need decoding
              if (error.response.data instanceof Buffer) {
                return JSON.parse(error.response.data.toString('utf-8'))
              }
              return error.response.data
            } catch { return String(error.response.data) }
          })()
        : null;

      const detail =
        body?.error?.message ||
        body?.message ||
        body?.error_description ||
        body?.error ||
        error?.message ||
        'Unknown error';

      console.warn('[NDVI] Sentinel API unavailable or invalid credentials; serving mock NDVI overlay.', { status, detail });
      try {
        const mockImage = await generateMockNdviTile();
        imageCache.set(cacheKey, mockImage);
        res.json({ imageSrc: mockImage, bounds: bbox, isMock: true });
        return;
      } catch {
        const clientMsg =
          status === 401 ? `Auth failed (401): ${detail} — check SENTINEL_CLIENT_ID / SENTINEL_CLIENT_SECRET in server/.env` :
          status === 400 ? `Bad request (400): ${detail}` :
          status === 403 ? `Access denied (403): ${detail}` :
          `Sentinel Hub error ${status ?? ''}: ${detail}`;
        res.status(status ?? 500).json({ error: clientMsg });
      }
    }
  })
)
