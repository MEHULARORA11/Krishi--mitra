import { Router } from 'express'
import { getAuth } from '@clerk/express'
import { requireAuth } from '../middleware/auth.js'
import { getChatHistory, getAnalysisHistory } from '../services/historyService.js'
import { asyncHandler } from '../utils/asyncHandler.js'

export const historyRoutes = Router()

/**
 * GET /history/chat
 * Returns last 50 chat messages for the authenticated farmer.
 */
historyRoutes.get(
  '/history/chat',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { userId } = getAuth(req)
    const messages = await getChatHistory(userId!)
    res.json({ messages })
  }),
)

/**
 * GET /history/analyses
 * Returns last 20 disease analysis results for the authenticated farmer.
 */
historyRoutes.get(
  '/history/analyses',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { userId } = getAuth(req)
    const analyses = await getAnalysisHistory(userId!)
    res.json({ analyses })
  }),
)
