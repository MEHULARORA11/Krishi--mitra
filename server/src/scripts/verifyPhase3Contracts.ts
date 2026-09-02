import assert from 'node:assert/strict'
import {
  advisoryApiV1ResponseSchema,
  advisoryExplanationSchema,
  groundedAdvisoryPacketSchema,
} from '../domain/advisory/contracts.js'
import {
  ADVISORY_PROMPT_VERSION,
  ADVISORY_SCHEMA_VERSION,
  advisoryProviderInternals,
} from '../services/aiExplanationProvider.js'
import { buildAdvisoryApiV1Response } from '../services/advisoryService.js'

const basePacket = groundedAdvisoryPacketSchema.parse({
  diagnosis: {
    relevance: 'plant',
    crop: 'Tomato',
    disease: 'Early blight',
    confidence: 0.87,
    uncertainty: 'accepted',
    modelVersion: 'tfjs-plantvillage-audit-2026-08-21',
  },
  fieldFacts: [
    {
      code: 'field_name',
      value: 'East Tomato Field',
      sourceId: 'field_fixture_001',
    },
    {
      code: 'active_crop',
      value: 'Tomato at vegetative stage',
      sourceId: 'crop_fixture_001',
    },
    {
      code: 'soil_summary',
      value: 'Soil moisture is good. Latest soil lab report is unavailable.',
      sourceId: 'soil_fixture_001',
    },
  ],
  weatherFacts: [
    {
      code: 'current_weather',
      value: 'Warm weather with moderate humidity and no heavy rain warning.',
      sourceId: 'weather_fixture_001',
      observedAt: '2026-08-21T08:30:00+05:30',
    },
  ],
  approvedActions: [
    {
      id: 'action_containment_001',
      title: 'Contain affected leaves',
      safeText:
        'Remove visibly affected leaves, keep them away from healthy plants, and avoid overhead watering.',
      sourceIds: ['reviewed_action_001'],
    },
  ],
  blockedActions: [
    {
      id: 'action_unreviewed_chemical',
      title: 'Unreviewed chemical treatment',
      reasonCodes: ['requires_officer_confirmation'],
    },
  ],
  missingData: ['last_treatment_date'],
  requestedLanguage: 'en',
})

const run = async () => {
  const successExplanation = advisoryExplanationSchema.parse({
    summary: 'Follow the approved containment action now and avoid unreviewed chemical treatment.',
    urgency: 'soon',
    actionExplanations: [
      {
        actionId: 'action_containment_001',
        explanation: 'This action limits spread while keeping the response inside reviewed safety guidance.',
      },
    ],
    avoidedActionExplanations: [
      {
        actionId: 'action_unreviewed_chemical',
        explanation: 'This is blocked because the backend has not reviewed it as safe for this case.',
      },
    ],
    questions: ['Please share the last treatment date.'],
    uncertaintyNotice: 'This explanation uses approved backend facts only.',
    escalationNotice: 'Contact an agricultural officer before any chemical treatment.',
  })
  advisoryProviderInternals.postValidateExplanation(basePacket, successExplanation)

  const providerFallback = advisoryProviderInternals.buildFallbackExplanation(
    basePacket,
    'fallback',
  )
  assert.equal(providerFallback.urgency, 'officer_review')

  const timeoutFallback = advisoryProviderInternals.buildFallbackExplanation(
    basePacket,
    'timeout',
  )
  assert.match(timeoutFallback.uncertaintyNotice, /too long/i)

  const malformedCandidate = {
    ...successExplanation,
    actionExplanations: [
      {
        actionId: 'unknown_action',
        explanation: 'Bad action id',
      },
    ],
  }
  assert.throws(() =>
    advisoryProviderInternals.postValidateExplanation(
      basePacket,
      advisoryExplanationSchema.parse(malformedCandidate),
    ),
  )

  assert.throws(() =>
    groundedAdvisoryPacketSchema.parse({
      ...basePacket,
      requestedLanguage: 'ta',
    }),
  )

  const noApprovedActionResponse = await buildAdvisoryApiV1Response({
    ...basePacket,
    approvedActions: [],
    diagnosis: {
      ...basePacket.diagnosis,
      uncertainty: 'low_confidence',
    },
  })
  advisoryApiV1ResponseSchema.parse(noApprovedActionResponse)
  assert.equal(noApprovedActionResponse.escalation.required, true)
  assert.equal(noApprovedActionResponse.provenance.promptVersion, ADVISORY_PROMPT_VERSION)
  assert.equal(noApprovedActionResponse.provenance.schemaVersion, ADVISORY_SCHEMA_VERSION)

  console.log('Phase 3 advisory contract checks passed.')
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
