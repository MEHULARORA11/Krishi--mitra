import { Router } from 'express'
import { getAuth } from '@clerk/express'
import { z } from 'zod'
import { requireAuth } from '../middleware/auth.js'
import { upsertFarmer, getFarmerByClerkId, updateFarmer } from '../services/userService.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { httpError } from '../utils/httpError.js'

export const userRoutes = Router()

const syncSchema = z.object({
  clerkUserId: z.string().min(1),
  name: z.string().optional(),
  email: z.string().email(),
})

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  preferredLanguage: z.enum(['en', 'hi', 'ml']).optional(),
  state: z.string().optional(),
  district: z.string().optional(),
})

/**
 * POST /users/sync
 * Upsert the farmer record from Clerk data right after sign-in.
 * Protected — only callable with a valid Clerk JWT.
 */
userRoutes.post(
  '/users/sync',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { userId } = getAuth(req)
    const body = syncSchema.parse(req.body)

    // Ensure the token userId matches the body to prevent spoofing
    if (body.clerkUserId !== userId) {
      throw httpError(403, 'Clerk user ID mismatch.')
    }

    const farmer = await upsertFarmer({
      clerkUserId: body.clerkUserId,
      name: body.name ?? null,
      email: body.email,
    })

    res.json(farmer)
  }),
)

/**
 * GET /users/me
 * Returns the current farmer profile from the database.
 */
userRoutes.get(
  '/users/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { userId } = getAuth(req)
    const farmer = await getFarmerByClerkId(userId!)

    if (!farmer) {
      throw httpError(404, 'Farmer profile not found. Please sync your account first.')
    }

    res.json(farmer)
  }),
)

/**
 * PATCH /users/me
 * Update mutable farmer profile fields.
 */
userRoutes.patch(
  '/users/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { userId } = getAuth(req)
    const updates = updateSchema.parse(req.body)
    const farmer = await updateFarmer(userId!, updates)

    if (!farmer) {
      throw httpError(404, 'Farmer profile not found.')
    }

    res.json(farmer)
  }),
)
