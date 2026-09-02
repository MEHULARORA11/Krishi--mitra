import { Router } from 'express'
import { schemeQuerySchema, schemeCheckSchema } from '../schemas/requestSchemas.js'
import { getAllSchemes, checkSchemeEligibility } from '../services/schemesService.js'
import { asyncHandler } from '../utils/asyncHandler.js'

export const schemesRoutes = Router()

/**
 * GET /schemes?state=Kerala&crop=Rice&category=Insurance
 * Returns filtered list of government schemes.
 */
schemesRoutes.get(
  '/schemes',
  asyncHandler(async (req, res) => {
    const input = schemeQuerySchema.parse({
      state: req.query.state,
      crop: req.query.crop,
      category: req.query.category,
    })

    const schemes = await getAllSchemes(input.state, input.crop, input.category)
    res.json({
      count: schemes.length,
      state: input.state || 'all',
      schemes,
    })
  }),
)

/**
 * POST /schemes/check
 * Check which schemes may match a farmer's profile.
 * LLM explains why a scheme may match — never declares guaranteed eligibility.
 */
schemesRoutes.post(
  '/schemes/check',
  asyncHandler(async (req, res) => {
    const input = schemeCheckSchema.parse(req.body)

    const result = await checkSchemeEligibility({
      state: input.state,
      district: input.district,
      crop: input.crop,
      landHolding: input.landHolding,
      category: input.category,
      income: input.income,
      language: input.language,
    })

    res.json(result)
  }),
)
