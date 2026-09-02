import type { RequestHandler } from 'express'
import { getAuth } from '@clerk/express'
import { httpError } from '../utils/httpError.js'

/**
 * Middleware that enforces authentication for a route.
 * Uses the Clerk JWT already parsed by clerkMiddleware() in app.ts.
 *
 * Usage:
 *   router.get('/me', requireAuth, asyncHandler(async (req, res) => {
 *     const { userId } = getAuth(req)  // guaranteed non-null here
 *   }))
 */
export const requireAuth: RequestHandler = (req, _res, next) => {
  const { userId } = getAuth(req)
  if (!userId) {
    throw httpError(401, 'Authentication required. Sign in to access this resource.')
  }
  next()
}
