import { eq } from 'drizzle-orm'
import { getDb } from '../db/index.js'
import { farmers } from '../db/schema.js'
import type { NewFarmer } from '../db/schema.js'

/**
 * Upsert a farmer record from Clerk user data.
 * Called after sign-in (POST /users/sync) or from the Clerk webhook.
 */
export const upsertFarmer = async (data: NewFarmer) => {
  const db = getDb()
  const [row] = await db
    .insert(farmers)
    .values(data)
    .onConflictDoUpdate({
      target: farmers.clerkUserId,
      set: {
        name: data.name,
        email: data.email,
        updatedAt: new Date(),
      },
    })
    .returning()
  return row
}

/**
 * Get a farmer by their Clerk user ID.
 */
export const getFarmerByClerkId = async (clerkUserId: string) => {
  const db = getDb()
  const [row] = await db
    .select()
    .from(farmers)
    .where(eq(farmers.clerkUserId, clerkUserId))
    .limit(1)
  return row ?? null
}

/**
 * Update farmer profile fields (language, state, district).
 */
export const updateFarmer = async (
  clerkUserId: string,
  updates: Partial<Pick<NewFarmer, 'preferredLanguage' | 'state' | 'district' | 'name'>>,
) => {
  const db = getDb()
  const [row] = await db
    .update(farmers)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(farmers.clerkUserId, clerkUserId))
    .returning()
  return row ?? null
}

/**
 * Delete a farmer and all their data (cascade via FK).
 */
export const deleteFarmerByClerkId = async (clerkUserId: string) => {
  const db = getDb()
  await db.delete(farmers).where(eq(farmers.clerkUserId, clerkUserId))
}
