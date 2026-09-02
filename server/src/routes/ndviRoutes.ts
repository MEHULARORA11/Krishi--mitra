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

      console.error('[NDVI] Sentinel API error', { status, detail, body });

      const clientMsg =
        status === 401 ? `Auth failed (401): ${detail} — check SENTINEL_CLIENT_ID / SENTINEL_CLIENT_SECRET in server/.env` :
        status === 400 ? `Bad request (400): ${detail}` :
        status === 403 ? `Access denied (403): ${detail}` :
        `Sentinel Hub error ${status ?? ''}: ${detail}`;

      res.status(status ?? 500).json({ error: clientMsg });
    }
  })
)
