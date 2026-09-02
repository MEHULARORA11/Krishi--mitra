const express = require('express');
const axios = require('axios');
const { getAccessToken } = require('../services/copernicusAuth');
const router = express.Router();

// Simple in-memory image cache to prevent redundant API calls
const imageCache = new Map();

const ndviEvalscript = `
  //VERSION=3
  function setup() {
    return { input: ["B04", "B08", "dataMask"], output: { bands: 4 } };
  }
  function evaluatePixel(sample) {
    if (sample.dataMask === 0) return [0, 0, 0, 0];
    let ndvi = (sample.B08 - sample.B04) / (sample.B08 + sample.B04);
    if (ndvi < 0.1) return [1, 1, 1, 0];       
    if (ndvi < 0.2) return [0.6, 0.4, 0.2, 1]; 
    if (ndvi < 0.5) return [0.8, 1.0, 0.4, 1]; 
    return [0.1, 0.5, 0.1, 1];                 
  }
`;

router.post('/generate', async (req, res) => {
  const { bbox } = req.body;
  const cacheKey = bbox.join(',');

  // 1. Check Cache
  if (imageCache.has(cacheKey)) {
    return res.json({ imageSrc: imageCache.get(cacheKey), bounds: bbox });
  }

  try {
    // 2. Get Auth Token
    const token = await getAccessToken();

    // 3. Request Image from Copernicus
    const payload = {
      input: {
        bounds: { bbox: bbox },
        data: [{ type: "sentinel-2-l2a" }]
      },
      output: { width: 512, height: 512, responses: [{ identifier: "default", format: { type: "image/png" } }] },
      evalscript: ndviEvalscript
    };

    const response = await axios.post(
      'https://sh.dataspace.copernicus.eu/api/v1/process', //
      payload,
      {
        headers: { 'Authorization': `Bearer ${token}` },
        responseType: 'arraybuffer'
      }
    );

    // 4. Convert to Base64 and Cache
    const base64Image = Buffer.from(response.data, 'binary').toString('base64');
    const imageSrc = `data:image/png;base64,${base64Image}`;
    
    imageCache.set(cacheKey, imageSrc);

    res.json({ imageSrc, bounds: bbox });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to generate NDVI map" });
  }
});

module.exports = router;
