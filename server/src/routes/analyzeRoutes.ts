import { Router } from 'express'
import multer from 'multer'
import { getAuth } from '@clerk/express'
import { getAdvisory, extractSeverity } from '../services/advisoryService.js'
import { predictDisease } from '../services/diseaseModelService.js'
import { getAcceptedPredictionThreshold } from '../services/modelManifestService.js'
import { getFarmerByClerkId } from '../services/userService.js'
import { saveAnalysis } from '../services/historyService.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { httpError } from '../utils/httpError.js'

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
})

export const analyzeRoutes = Router()

analyzeRoutes.post(
  '/analyze',
  upload.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      throw httpError(400, 'Upload an image file in the "file" form field.')
    }

    const region = typeof req.body.region === 'string' ? req.body.region : 'India'
    const season = typeof req.body.season === 'string' ? req.body.season : 'Kharif'
    const language = typeof req.body.language === 'string' ? req.body.language : 'en'
    const prediction = await predictDisease(req.file)
    const acceptedPredictionThreshold = getAcceptedPredictionThreshold()

    if (prediction.confidence < acceptedPredictionThreshold) {
      res.json({
        raw_class: 'Unrecognised',
        disease: 'Unrecognised',
        crop: 'Unknown',
        confidence: Math.round(prediction.confidence * 1000) / 10,
        is_healthy: false,
        severity: 'low',
        advisory_short: 'Image not clear enough. Please upload a clear, well-lit photo of the affected leaf.',
        advisory_detail:
          'DISEASE_SUMMARY:\nThe AI could not confidently identify a disease from this image.\n\nSEVERITY:\nLow\n\nIMMEDIATE_ACTION_48H:\n- Take a new photo in good daylight\n- Ensure the diseased leaf fills the frame\n- Avoid shadows or blurry shots\n\nCALL_OFFICER_IF:\nIf the plant is visibly dying, contact your agricultural officer immediately.',
      })
      return
    }

    const advisoryShort = await getAdvisory({
      disease: prediction.disease,
      confidence: prediction.confidence,
      crop: prediction.crop,
      region,
      season,
      language,
      mode: 'short',
    })
    const advisoryDetail = await getAdvisory({
      disease: prediction.disease,
      confidence: prediction.confidence,
      crop: prediction.crop,
      region,
      season,
      language,
      mode: 'detailed',
    })

    const severity = prediction.healthy ? 'low' : extractSeverity(advisoryDetail)

    // Save to history if authenticated (non-blocking)
    const { userId } = getAuth(req)
    if (userId) {
      getFarmerByClerkId(userId)
        .then((farmer) =>
          saveAnalysis({
            farmerId: farmer?.id ?? null,
            crop: prediction.crop,
            disease: prediction.disease,
            confidence: prediction.confidence * 100,
            severity,
            advisoryShort,
            advisoryDetail,
          }),
        )
        .catch((err) => console.error('[analyze] Failed to save history:', err))
    }

    res.json({
      raw_class: prediction.rawClass,
      disease: prediction.disease,
      crop: prediction.crop,
      confidence: Math.round(prediction.confidence * 1000) / 10,
      is_healthy: prediction.healthy,
      severity,
      advisory_short: advisoryShort,
      advisory_detail: advisoryDetail,
    })
  }),
)
