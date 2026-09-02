/**
 * Government Schemes Service
 * ===========================
 * Uses curated official URLs/RAG. LLM explains why a scheme may match
 * the farmer's profile, but NEVER declares guaranteed eligibility.
 */

import { eq } from 'drizzle-orm'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { env } from '../config/env.js'
import { getDb } from '../db/index.js'
import { govSchemes } from '../db/schema.js'
import type { GovSchemeRecord } from '../db/schema.js'
import { SCHEME_SEED_DATA } from '../data/schemesData.js'

type FarmerProfile = {
  state: string
  district?: string
  crop?: string
  landHolding?: 'marginal' | 'small' | 'medium' | 'large'
  category?: 'general' | 'sc' | 'st' | 'obc'
  income?: number
  language?: string
}

export type SchemeMatch = {
  scheme: GovSchemeRecord
  matchReasons: string[]
  mayApply: boolean
}

export type SchemeEligibilityResult = {
  matches: SchemeMatch[]
  explanation: string
  disclaimer: string
}

let _seeded = false

/**
 * Seed the gov_schemes table from static data if it's empty.
 * Called lazily on first access.
 */
async function ensureSeeded(): Promise<void> {
  if (_seeded) return
  try {
    const db = getDb()
    const existing = await db.select({ id: govSchemes.id }).from(govSchemes).limit(1)
    if (existing.length === 0) {
      console.log('[schemes] Seeding gov_schemes table with curated data…')
      await db.insert(govSchemes).values(
        SCHEME_SEED_DATA.map((s) => ({
          title: s.title,
          state: s.state,
          eligibilityRules: s.eligibilityRules,
          requiredDocuments: s.requiredDocuments,
          officialLink: s.officialLink,
          description: s.description,
          category: s.category,
          lastVerifiedDate: s.lastVerifiedDate,
        })),
      )
      console.log(`[schemes] Seeded ${SCHEME_SEED_DATA.length} schemes ✓`)
    }
    _seeded = true
  } catch (err) {
    console.error('[schemes] Seeding failed — falling back to in-memory data:', err)
    _seeded = true
  }
}

/**
 * Get all schemes, optionally filtered by state and/or crop/category.
 */
export const getAllSchemes = async (
  state?: string,
  crop?: string,
  category?: string,
): Promise<GovSchemeRecord[]> => {
  await ensureSeeded()

  try {
    const db = getDb()
    let allSchemes = await db.select().from(govSchemes)

    if (state) {
      allSchemes = allSchemes.filter(
        (s) => s.state === 'Central' || s.state.toLowerCase() === state.toLowerCase(),
      )
    }

    if (category) {
      allSchemes = allSchemes.filter(
        (s) => s.category?.toLowerCase().includes(category.toLowerCase()),
      )
    }

    if (crop) {
      // Simple keyword matching: filter schemes whose description mentions the crop
      const cropLower = crop.toLowerCase()
      allSchemes = allSchemes.filter(
        (s) =>
          s.description.toLowerCase().includes(cropLower) ||
          s.eligibilityRules.toLowerCase().includes(cropLower) ||
          s.category?.toLowerCase().includes('all') ||
          // Central income/credit/insurance schemes apply to all crops
          ['Income Support', 'Credit', 'Crop Insurance', 'Welfare', 'Market Access'].includes(
            s.category || '',
          ),
      )
    }

    return allSchemes
  } catch {
    // DB not available — fall back to seed data
    let result = SCHEME_SEED_DATA.map((s, i) => ({
      id: `seed-${i}`,
      ...s,
    })) as unknown as GovSchemeRecord[]

    if (state) {
      result = result.filter(
        (s) => s.state === 'Central' || s.state.toLowerCase() === state.toLowerCase(),
      )
    }
    return result
  }
}

/**
 * Check which schemes may match a farmer's profile.
 * Backend checks rules; LLM explains why it may match.
 * NEVER declares guaranteed eligibility.
 */
export const checkSchemeEligibility = async (
  profile: FarmerProfile,
): Promise<SchemeEligibilityResult> => {
  const schemes = await getAllSchemes(profile.state, profile.crop)
  const disclaimer =
    'This is an informational estimate only. Actual eligibility is determined by the ' +
    'implementing authority. Please visit the official scheme website or your nearest ' +
    'Krishi Bhavan / agriculture office to confirm eligibility and apply.'

  // Backend rule-matching
  const matches: SchemeMatch[] = schemes.map((scheme) => {
    const reasons: string[] = []
    let mayApply = true

    // State match
    if (scheme.state === 'Central') {
      reasons.push('Available nationwide (Central scheme)')
    } else if (scheme.state.toLowerCase() === profile.state?.toLowerCase()) {
      reasons.push(`Available in ${profile.state}`)
    }

    // Land holding matching
    if (profile.landHolding && scheme.eligibilityRules.toLowerCase().includes(profile.landHolding)) {
      reasons.push(`Mentions ${profile.landHolding} farmers in eligibility`)
    }

    // Category matching
    if (profile.category && profile.category !== 'general') {
      if (scheme.eligibilityRules.toLowerCase().includes(profile.category)) {
        reasons.push(`Priority for ${profile.category.toUpperCase()} category`)
      }
    }

    // Crop matching
    if (profile.crop && scheme.description.toLowerCase().includes(profile.crop.toLowerCase())) {
      reasons.push(`Covers ${profile.crop}`)
    }

    // If no specific match reasons, it may still be broadly applicable
    if (reasons.length === 0) {
      reasons.push('May be applicable — check eligibility details')
    }

    return { scheme, matchReasons: reasons, mayApply }
  })

  // Sort: schemes with more match reasons first
  matches.sort((a, b) => b.matchReasons.length - a.matchReasons.length)

  // LLM explanation
  const explanation = await generateSchemeExplanation(matches, profile)

  return { matches, explanation, disclaimer }
}

async function generateSchemeExplanation(
  matches: SchemeMatch[],
  profile: FarmerProfile,
): Promise<string> {
  const langName = { en: 'English', hi: 'Hindi', ml: 'Malayalam' }[profile.language || 'en'] || 'English'

  const topSchemes = matches
    .slice(0, 5)
    .map((m) => `- ${m.scheme.title}: ${m.matchReasons.join(', ')}`)
    .join('\n')

  if (!env.geminiApiKey) {
    return (
      `Based on your profile (${profile.state}, ${profile.crop || 'general'}), ` +
      `${matches.length} schemes may be relevant. ` +
      `Please check each scheme's official website for detailed eligibility criteria and application process.`
    )
  }

  const prompt = `You are a helpful Indian agriculture advisor explaining government schemes to a farmer.

Farmer profile:
- State: ${profile.state}
- District: ${profile.district || 'Not specified'}
- Crop: ${profile.crop || 'Not specified'}
- Land holding: ${profile.landHolding || 'Not specified'}

Top matching schemes:
${topSchemes}

Write a SHORT (4-5 sentences) summary in ${langName} explaining:
1. Which 2-3 schemes seem most relevant to this farmer
2. Why they may be a good fit (be specific)
3. What the farmer should do next (visit Krishi Bhavan, check website, etc.)

CRITICAL RULES:
- Say "may be eligible" or "could apply" — NEVER say "you are eligible" or "guaranteed"
- Always direct to official website or local agriculture office for confirmation
- Be warm and encouraging in tone`

  try {
    const genAI = new GoogleGenerativeAI(env.geminiApiKey)
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: { temperature: 0.3, maxOutputTokens: 500 },
    })
    const result = await model.generateContent(prompt)
    return result.response.text().trim()
  } catch (err) {
    console.error('[schemes] Gemini explanation error:', err)
    return (
      `Based on your profile, ${matches.length} government schemes may be relevant. ` +
      `Please visit your nearest Krishi Bhavan or the scheme's official website to confirm eligibility.`
    )
  }
}
