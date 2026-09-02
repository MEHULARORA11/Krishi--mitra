import { Router } from 'express'
import { marketPriceQuerySchema, marketAnalysisQuerySchema } from '../schemas/requestSchemas.js'
import { fetchMarketSnapshot, getMarketAnalysis, COMMON_COMMODITIES } from '../services/marketService.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { httpError } from '../utils/httpError.js'

export const marketRoutes = Router()

/**
 * GET /market/prices?crop=Rice&state=Kerala&district=Thrissur
 * Returns cached or freshly fetched mandi prices for a commodity.
 */
marketRoutes.get(
  '/market/prices',
  asyncHandler(async (req, res) => {
    const input = marketPriceQuerySchema.parse({
      crop: req.query.crop,
      state: req.query.state,
      district: req.query.district,
    })

    const snapshot = await fetchMarketSnapshot(input.crop, input.state, input.district)
    res.json({
      crop: input.crop,
      state: input.state,
      district: input.district || 'all',
      count: snapshot.prices.length,
      ...snapshot,
    })
  }),
)

/**
 * GET /market/analysis?crop=Rice&state=Kerala&district=Thrissur&language=en
 * Returns price ranking + LLM tradeoff explanation.
 */
marketRoutes.get(
  '/market/analysis',
  asyncHandler(async (req, res) => {
    const input = marketAnalysisQuerySchema.parse({
      crop: req.query.crop,
      state: req.query.state,
      district: req.query.district,
      language: req.query.language,
    })

    const analysis = await getMarketAnalysis(
      input.crop, input.state, input.district, input.language,
    )
    res.json(analysis)
  }),
)

/**
 * GET /market/commodities
 * Returns the list of commonly queried commodities for autocomplete.
 */
marketRoutes.get('/market/commodities', (_req, res) => {
  res.json({ commodities: COMMON_COMMODITIES })
})
