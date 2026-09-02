import { z } from 'zod'

export const advisoryLanguageSchema = z.enum(['en', 'hi', 'ml'])

export const diagnosisUncertaintySchema = z.enum([
  'accepted',
  'low_confidence',
  'unknown',
  'unsupported_image',
])

export const advisoryUrgencySchema = z.enum([
  'routine',
  'soon',
  'urgent',
  'officer_review',
])

export const groundedFactSchema = z.object({
  code: z.string().min(1),
  value: z.string().min(1),
  sourceId: z.string().min(1),
  observedAt: z.string().datetime({ offset: true }).optional(),
})

export const groundedActionSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  safeText: z.string().min(1),
  sourceIds: z.array(z.string().min(1)).min(1),
})

export const blockedActionSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  reasonCodes: z.array(z.string().min(1)).min(1),
})

export const groundedDiagnosisSchema = z.object({
  relevance: z.enum(['plant', 'not_plant', 'unclear']).default('plant'),
  crop: z.string().min(1).nullable(),
  disease: z.string().min(1).nullable(),
  confidence: z.number().min(0).max(1).nullable(),
  uncertainty: diagnosisUncertaintySchema,
  modelVersion: z.string().min(1),
})

export const diagnosisAlternativeSchema = z.object({
  rawClass: z.string().min(1),
  crop: z.string().min(1),
  disease: z.string().min(1),
  healthy: z.boolean(),
  confidence: z.number().min(0).max(1),
})

export const imageQualitySchema = z.object({
  status: z.enum(['usable', 'needs_retake']),
  brightness: z.number().min(0).max(255),
  contrast: z.number().min(0),
  sharpness: z.number().min(0),
  reasons: z.array(z.string().min(1)),
})

export const groundedAdvisoryPacketSchema = z.object({
  diagnosis: groundedDiagnosisSchema,
  fieldFacts: z.array(groundedFactSchema),
  weatherFacts: z.array(groundedFactSchema),
  approvedActions: z.array(groundedActionSchema),
  blockedActions: z.array(blockedActionSchema),
  missingData: z.array(z.string().min(1)),
  requestedLanguage: advisoryLanguageSchema,
})

export const advisoryExplanationSchema = z.object({
  summary: z.string().min(1),
  urgency: advisoryUrgencySchema,
  actionExplanations: z.array(
    z.object({
      actionId: z.string().min(1),
      explanation: z.string().min(1),
    }),
  ),
  avoidedActionExplanations: z.array(
    z.object({
      actionId: z.string().min(1),
      explanation: z.string().min(1),
    }),
  ),
  questions: z.array(z.string().min(1)),
  uncertaintyNotice: z.string().min(1),
  escalationNotice: z.string().nullable(),
})

export const advisoryDataModeSchema = z.enum([
  'live',
  'cached',
  'fixture',
  'mock',
  'unavailable',
])

export const advisoryApiV1ResponseSchema = z.object({
  requestId: z.string().min(1),
  analysisId: z.string().min(1),
  diagnosis: groundedDiagnosisSchema,
  diagnoses: z.array(diagnosisAlternativeSchema).min(1).max(3).optional(),
  imageQuality: imageQualitySchema.optional(),
  severity: z
    .object({
      level: z.enum(['not_assessed', 'low', 'medium', 'high']),
      affectedAreaPercent: z.number().min(0).max(100).nullable(),
      source: z.enum(['farmer_reported', 'visual_estimate', 'model_limited', 'not_assessed']),
    })
    .optional(),
  spreadRisk: z
    .object({
      level: z.enum(['low', 'medium', 'high', 'unknown']),
      score: z.number().min(0).max(100).nullable(),
      factors: z.array(z.string().min(1)),
    })
    .optional(),
  contextUsed: z.object({
    field: z.object({
      id: z.string().min(1),
      name: z.string().min(1),
      location: z.string().min(1),
    }),
    activeCrops: z.array(
      z.object({
        crop: z.string().min(1),
        stage: z.string().min(1),
      }),
    ),
    soil: z.object({
      summary: z.string().min(1),
      sourceId: z.string().min(1),
    }),
    weather: z.object({
      summary: z.string().min(1),
      observedAt: z.string().datetime({ offset: true }).nullable(),
      sourceId: z.string().min(1),
      freshness: z.enum(['live', 'cached', 'stale', 'fixture', 'mock', 'unavailable']),
    }),
  }),
  approvedActions: z.array(groundedActionSchema),
  blockedActions: z.array(blockedActionSchema),
  explanation: advisoryExplanationSchema,
  missingData: z.array(z.string().min(1)),
  escalation: z.object({
    required: z.boolean(),
    reason: z.string().nullable(),
  }),
  provenance: z.object({
    ruleVersion: z.string().min(1),
    promptVersion: z.string().min(1),
    schemaVersion: z.string().min(1),
    modelVersion: z.string().min(1),
    sourceIds: z.array(z.string().min(1)),
  }),
  dataMode: z.object({
    ml: advisoryDataModeSchema,
    weather: advisoryDataModeSchema,
    rules: advisoryDataModeSchema,
    llm: advisoryDataModeSchema,
  }),
})

export type AdvisoryLanguage = z.infer<typeof advisoryLanguageSchema>
export type GroundedAdvisoryPacket = z.infer<typeof groundedAdvisoryPacketSchema>
export type GroundedAction = z.infer<typeof groundedActionSchema>
export type BlockedAction = z.infer<typeof blockedActionSchema>
export type AdvisoryExplanation = z.infer<typeof advisoryExplanationSchema>
export type AdvisoryApiV1Response = z.infer<typeof advisoryApiV1ResponseSchema>
