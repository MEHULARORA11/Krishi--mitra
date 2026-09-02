import { desc, eq } from 'drizzle-orm'
import { getDb } from '../db/index.js'
import { chatMessages, analysisHistory, farmers } from '../db/schema.js'

/**
 * Save a chat Q&A pair for a farmer.
 * farmerId is optional — anonymous messages are stored without a user FK.
 */
export const saveChatPair = async (opts: {
  farmerId: string | null
  question: string
  answer: string
  language: string
}) => {
  const db = getDb()
  await db.insert(chatMessages).values([
    { farmerId: opts.farmerId, role: 'user', content: opts.question, language: opts.language },
    { farmerId: opts.farmerId, role: 'bot', content: opts.answer, language: opts.language },
  ])
}

/**
 * Get the last 50 chat messages for a farmer.
 */
export const getChatHistory = async (clerkUserId: string) => {
  const db = getDb()
  const farmer = await db
    .select({ id: farmers.id })
    .from(farmers)
    .where(eq(farmers.clerkUserId, clerkUserId))
    .limit(1)

  if (!farmer[0]) return []

  return db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.farmerId, farmer[0].id))
    .orderBy(desc(chatMessages.createdAt))
    .limit(50)
}

/**
 * Save a disease analysis result for a farmer.
 */
export const saveAnalysis = async (opts: {
  farmerId: string | null
  crop: string
  disease: string
  confidence: number
  severity: string
  advisoryShort: string
  advisoryDetail: string
}) => {
  const db = getDb()
  await db.insert(analysisHistory).values({
    farmerId: opts.farmerId,
    crop: opts.crop,
    disease: opts.disease,
    confidence: String(Math.round(opts.confidence * 10) / 10),
    severity: opts.severity as 'low' | 'medium' | 'high',
    advisoryShort: opts.advisoryShort,
    advisoryDetail: opts.advisoryDetail,
  })
}

/**
 * Get the last 20 analyses for a farmer.
 */
export const getAnalysisHistory = async (clerkUserId: string) => {
  const db = getDb()
  const farmer = await db
    .select({ id: farmers.id })
    .from(farmers)
    .where(eq(farmers.clerkUserId, clerkUserId))
    .limit(1)

  if (!farmer[0]) return []

  return db
    .select()
    .from(analysisHistory)
    .where(eq(analysisHistory.farmerId, farmer[0].id))
    .orderBy(desc(analysisHistory.createdAt))
    .limit(20)
}
