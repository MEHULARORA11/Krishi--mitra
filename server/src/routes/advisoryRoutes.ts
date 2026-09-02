import { Router } from 'express'
import { advisoryRequestSchema } from '../schemas/requestSchemas.js'
import { getAdvisory, extractSeverity } from '../services/advisoryService.js'
import { asyncHandler } from '../utils/asyncHandler.js'

export const advisoryRoutes = Router()

advisoryRoutes.post(
  '/advisory',
  asyncHandler(async (req, res) => {
    const input = advisoryRequestSchema.parse(req.body)
    const advisory = await getAdvisory({
      disease: input.disease_name,
      confidence: input.confidence,
      crop: input.crop,
      region: input.region,
      season: input.season,
      language: input.language,
      mode: input.mode,
    })

    res.json({
      disease: input.disease_name,
      crop: input.crop,
      language: input.language,
      mode: input.mode,
      advisory,
      severity: extractSeverity(advisory),
    })
  }),
)
