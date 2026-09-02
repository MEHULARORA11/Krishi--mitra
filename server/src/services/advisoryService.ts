import crypto from 'node:crypto'
import {
  advisoryApiV1ResponseSchema,
  type AdvisoryApiV1Response,
  type AdvisoryExplanation,
  type AdvisoryLanguage,
  type GroundedAdvisoryPacket,
  type GroundedAction,
} from '../domain/advisory/contracts.js'
import {
  ADVISORY_PROMPT_VERSION,
  ADVISORY_SCHEMA_VERSION,
  generateGroundedExplanation,
} from './aiExplanationProvider.js'

export type AdvisoryMode = 'short' | 'detailed'

type AdvisoryInput = {
  disease: string
  confidence: number
  crop: string
  region: string
  season: string
  language: string
  mode: AdvisoryMode
}

type AdvisoryChatResult = {
  response: string
  timestamp: string
}

const clampLanguage = (language: string): AdvisoryLanguage =>
  language === 'hi' || language === 'ml' ? language : 'en'

const getDefaultApprovedActions = (crop: string, disease: string): GroundedAction[] => [
  {
    id: 'action_containment_001',
    title: 'Contain affected plant parts',
    safeText: `Remove visibly affected ${crop.toLowerCase()} leaves showing ${disease.toLowerCase()} symptoms, keep them away from healthy plants, and avoid overhead watering.`,
    sourceIds: ['rules_fixture_containment_v1'],
  },
  {
    id: 'action_monitoring_001',
    title: 'Monitor spread and document changes',
    safeText:
      'Take a fresh photo in daylight within 24 to 48 hours and note whether new leaves are showing symptoms.',
    sourceIds: ['rules_fixture_monitoring_v1'],
  },
]

const getDefaultBlockedActions = () => [
  {
    id: 'action_unreviewed_chemical',
    title: 'Unreviewed chemical treatment',
    reasonCodes: ['chemical_not_reviewed', 'requires_officer_confirmation'],
  },
]

const buildPacketFromDiagnosis = (input: AdvisoryInput): GroundedAdvisoryPacket => ({
  diagnosis: {
    relevance: 'plant',
    crop: input.crop,
    disease: input.disease,
    confidence: input.confidence,
    uncertainty: input.confidence >= 0.55 ? 'accepted' : 'low_confidence',
    modelVersion: 'compat-manual-input-v1',
  },
  fieldFacts: [
    {
      code: 'region',
      value: input.region,
      sourceId: 'manual_region_input',
    },
    {
      code: 'season',
      value: input.season,
      sourceId: 'manual_season_input',
    },
    {
      code: 'crop_cycle_summary',
      value: `${input.crop} field context supplied manually.`,
      sourceId: 'manual_crop_input',
    },
  ],
  weatherFacts: [
    {
      code: 'weather_status',
      value: 'No reviewed live weather facts were attached to this compatibility request.',
      sourceId: 'weather_unavailable_compat',
    },
  ],
  approvedActions: getDefaultApprovedActions(input.crop, input.disease),
  blockedActions: getDefaultBlockedActions(),
  missingData: ['latest_clear_leaf_photo', 'last_treatment_date'],
  requestedLanguage: clampLanguage(input.language),
})

const buildPacketFromQuestion = (
  question: string,
  language: string,
): GroundedAdvisoryPacket => ({
  diagnosis: {
    relevance: 'unclear',
    crop: null,
    disease: null,
    confidence: null,
    uncertainty: 'unknown',
    modelVersion: 'chat-compat-v1',
  },
  fieldFacts: [
    {
      code: 'farmer_question',
      value: question.slice(0, 500),
      sourceId: 'chat_question_input',
    },
  ],
  weatherFacts: [],
  approvedActions: [],
  blockedActions: getDefaultBlockedActions(),
  missingData: ['clear_crop_photo', 'crop_name', 'affected_part', 'location'],
  requestedLanguage: clampLanguage(language),
})

const severityFromUrgency = (urgency: AdvisoryExplanation['urgency']) => {
  if (urgency === 'officer_review' || urgency === 'urgent') return 'high'
  if (urgency === 'soon') return 'medium'
  return 'low'
}

const buildDetailedCompatibilityText = (
  explanation: AdvisoryExplanation,
) => {
  const approvedLines =
    explanation.actionExplanations.length > 0
      ? explanation.actionExplanations.map((item) => `- ${item.explanation}`).join('\n')
      : '- Use containment steps only until a reviewed action is available.'
  const blockedLines =
    explanation.avoidedActionExplanations.length > 0
      ? explanation.avoidedActionExplanations.map((item) => `- ${item.explanation}`).join('\n')
      : '- No blocked actions recorded.'
  const missingLines =
    explanation.questions.length > 0
      ? explanation.questions.map((item) => `- ${item}`).join('\n')
      : '- No extra details needed right now.'
  const escalationLine =
    explanation.escalationNotice ??
    'Contact an agricultural officer if symptoms spread quickly or the crop declines.'

  return `DISEASE_SUMMARY:
${explanation.summary}

SEVERITY:
${severityFromUrgency(explanation.urgency)}

IMMEDIATE_ACTION_48H:
${approvedLines}

AVOIDED_ACTIONS:
${blockedLines}

MISSING_INFORMATION:
${missingLines}

UNCERTAINTY_NOTICE:
${explanation.uncertaintyNotice}

CALL_OFFICER_IF:
${escalationLine}

FARMER_TIP:
Use only reviewed containment steps for now. Do not guess chemical treatment from this response.`
}

const buildShortCompatibilityText = (
  explanation: AdvisoryExplanation,
  packet: GroundedAdvisoryPacket,
) => {
  const firstAction =
    explanation.actionExplanations[0]?.explanation ??
    'Use containment steps only until reviewed guidance is available.'
  const escalationLine =
    explanation.escalationNotice ??
    'Contact an agricultural officer if the crop worsens or the image is unclear.'

  return `${explanation.summary} ${firstAction} ${packet.diagnosis.uncertainty === 'accepted' ? '' : explanation.uncertaintyNotice + ' '}${escalationLine}`.trim()
}

const formatChatCompatibilityText = (explanation: AdvisoryExplanation) => {
  const lines = [
    `SUMMARY: ${explanation.summary}`,
    '',
    'KEY POINTS:',
    `- ${explanation.actionExplanations[0]?.explanation ?? 'Use containment steps only until reviewed guidance is available.'}`,
    `- ${explanation.uncertaintyNotice}`,
    `- ${explanation.avoidedActionExplanations[0]?.explanation ?? 'Avoid unreviewed chemical advice.'}`,
    `- ${explanation.questions[0] ?? 'Share a clear crop photo and crop details for a safer answer.'}`,
  ]

  if (explanation.escalationNotice) {
    lines.push(`- ${explanation.escalationNotice}`)
  }

  return lines.join('\n')
}

const collectSourceIds = (packet: GroundedAdvisoryPacket) => [
  ...packet.fieldFacts.map((fact) => fact.sourceId),
  ...packet.weatherFacts.map((fact) => fact.sourceId),
  ...packet.approvedActions.flatMap((action) => action.sourceIds),
]

const toContextUsed = (packet: GroundedAdvisoryPacket) => {
  const fieldName =
    packet.fieldFacts.find((fact) => fact.code === 'field_name')?.value ?? 'Current field'
  const location =
    packet.fieldFacts.find((fact) => fact.code === 'region')?.value ??
    packet.fieldFacts.find((fact) => fact.code === 'location')?.value ??
    'Location not attached'
  const activeCrops = packet.fieldFacts
    .filter((fact) => fact.code === 'active_crop' || fact.code === 'co_crop')
    .map((fact) => {
      const [crop, stage = 'stage not provided'] = fact.value.split(' at ')
      return { crop, stage }
    })
  const soilFact =
    packet.fieldFacts.find((fact) => fact.code === 'soil_summary') ?? {
      code: 'soil_summary',
      value: 'No reviewed soil summary was attached.',
      sourceId: 'soil_unavailable',
    }
  const weatherFact =
    packet.weatherFacts[0] ?? {
      code: 'weather_status',
      value: 'No reviewed weather summary was attached.',
      sourceId: 'weather_unavailable',
    }

  return {
    field: {
      id: 'field-current',
      name: fieldName,
      location,
    },
    activeCrops,
    soil: {
      summary: soilFact.value,
      sourceId: soilFact.sourceId,
    },
    weather: {
      summary: weatherFact.value,
      observedAt: weatherFact.observedAt ?? null,
      sourceId: weatherFact.sourceId,
      freshness: weatherFact.sourceId.includes('fixture') ? 'fixture' : 'unavailable',
    },
  } as const
}

export const buildAdvisoryApiV1Response = async (
  packet: GroundedAdvisoryPacket,
): Promise<AdvisoryApiV1Response> => {
  const requestId = crypto.randomUUID()
  const analysisId = crypto.randomUUID()
  const { explanation, meta } = await generateGroundedExplanation(requestId, packet)
  const response: AdvisoryApiV1Response = {
    requestId,
    analysisId,
    diagnosis: packet.diagnosis,
    contextUsed: toContextUsed(packet),
    approvedActions: packet.approvedActions,
    blockedActions: packet.blockedActions,
    explanation,
    missingData: packet.missingData,
    escalation: {
      required:
        explanation.urgency === 'officer_review' ||
        packet.diagnosis.uncertainty !== 'accepted' ||
        packet.approvedActions.length === 0,
      reason: explanation.escalationNotice,
    },
    provenance: {
      ruleVersion: 'rules-fixture-v1',
      promptVersion: ADVISORY_PROMPT_VERSION,
      schemaVersion: ADVISORY_SCHEMA_VERSION,
      modelVersion: meta.model,
      sourceIds: collectSourceIds(packet),
    },
    dataMode: {
      ml: packet.diagnosis.modelVersion.startsWith('tfjs') ? 'live' : 'fixture',
      weather: packet.weatherFacts.some((fact) => fact.sourceId.includes('fixture'))
        ? 'fixture'
        : 'unavailable',
      rules: 'fixture',
      llm: meta.provider === 'openai' && meta.outcome === 'success' ? 'live' : 'unavailable',
    },
  }

  return advisoryApiV1ResponseSchema.parse(response)
}

export const extractSeverity = (advisory: string) => {
  const severityLine = advisory
    .split('\n')
    .find((line) => line.trim().toUpperCase().startsWith('SEVERITY:'))

  const value = severityLine?.split(':', 2)[1]?.trim().toLowerCase()
  const text = value || advisory.toLowerCase()

  if (['severe', 'high', 'critical'].some((word) => text.includes(word))) return 'high'
  if (['moderate', 'medium', 'significant'].some((word) => text.includes(word))) return 'medium'
  return 'low'
}

export const getAdvisory = async (input: AdvisoryInput) => {
  const packet = buildPacketFromDiagnosis(input)
  const response = await buildAdvisoryApiV1Response(packet)

  return input.mode === 'short'
    ? buildShortCompatibilityText(response.explanation, packet)
    : buildDetailedCompatibilityText(response.explanation)
}

export const getChatResponse = async (
  question: string,
  language: string,
): Promise<AdvisoryChatResult> => {
  const packet = buildPacketFromQuestion(question, language)
  const response = await buildAdvisoryApiV1Response(packet)

  return {
    response: formatChatCompatibilityText(response.explanation),
    timestamp: new Date().toLocaleString(),
  }
}
