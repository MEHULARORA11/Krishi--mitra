import { z } from 'zod'

export const advisoryRequestSchema = z.object({
  disease_name: z.string().min(1),
  confidence: z.coerce.number().default(0.75),
  crop: z.string().min(1),
  region: z.string().default('India'),
  season: z.string().default('Kharif'),
  language: z.string().default('en'),
  mode: z.enum(['short', 'detailed']).default('detailed'),
})

export const chatRequestSchema = z.object({
  question: z.string().min(1),
  language: z.string().default('en'),
})

// ─── Phase 5: External Integration Schemas ───────────────────────────────────

export const marketPriceQuerySchema = z.object({
  crop: z.string().min(1),
  state: z.string().min(1),
  district: z.string().optional(),
})

export const marketAnalysisQuerySchema = z.object({
  crop: z.string().min(1),
  state: z.string().min(1),
  district: z.string().optional(),
  language: z.string().default('en'),
})

export const schemeQuerySchema = z.object({
  state: z.string().optional(),
  crop: z.string().optional(),
  category: z.string().optional(),
})

export const schemeCheckSchema = z.object({
  state: z.string().min(1),
  district: z.string().optional(),
  crop: z.string().optional(),
  landHolding: z.enum(['marginal', 'small', 'medium', 'large']).optional(),
  category: z.enum(['general', 'sc', 'st', 'obc']).optional(),
  income: z.number().optional(),
  language: z.string().default('en'),
})

export const ndviQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  days: z.coerce.number().min(1).max(365).default(90),
})

export const voiceTranscribeSchema = z.object({
  language: z.string().default('auto'),
})

export const voiceSpeakSchema = z.object({
  text: z.string().min(1),
  target_language: z.string().default('hi-IN'),
})

export const voiceTranslateSchema = z.object({
  text: z.string().min(1),
  source_language: z.string().default('auto'),
  target_language: z.string().min(1),
})

export const voiceChatSchema = z.object({
  language: z.string().default('auto'),
})
