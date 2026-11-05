import OpenAI from 'openai'
import {
  advisoryExplanationSchema,
  advisoryLanguageSchema,
  type AdvisoryExplanation,
  type GroundedAdvisoryPacket,
} from '../domain/advisory/contracts.js'
import { env } from '../config/env.js'

const OPENAI_PROVIDER = 'openai'
export const ADVISORY_SCHEMA_VERSION = '1.0.0'
export const ADVISORY_PROMPT_VERSION = 'openai-explanation-v1'

export type ExplanationOutcome =
  | 'success'
  | 'timeout'
  | 'refusal'
  | 'malformed_output'
  | 'fallback'

export type ExplanationGenerationMeta = {
  provider: string
  model: string
  promptVersion: string
  schemaVersion: string
  latencyMs: number
  outcome: ExplanationOutcome
  tokenUsage: {
    inputTokens: number | null
    outputTokens: number | null
    totalTokens: number | null
  }
}

export type ExplanationGenerationResult = {
  explanation: AdvisoryExplanation
  meta: ExplanationGenerationMeta
}

export interface AiExplanationProvider {
  generateExplanation(packet: GroundedAdvisoryPacket): Promise<ExplanationGenerationResult>
}

const safeLanguageName = (language: string) =>
  ({ en: 'English', hi: 'Hindi', ml: 'Malayalam' })[language] || 'English'

const buildFallbackExplanation = (
  packet: GroundedAdvisoryPacket,
  reason:
    | 'timeout'
    | 'refusal'
    | 'malformed_output'
    | 'fallback' = 'fallback',
): AdvisoryExplanation => {
  const escalationRequired =
    packet.diagnosis.uncertainty !== 'accepted' ||
    packet.approvedActions.length === 0 ||
    packet.blockedActions.length > 0
  const actionExplanations = packet.approvedActions.map((action) => ({
    actionId: action.id,
    explanation: action.safeText,
  }))
  const avoidedActionExplanations = packet.blockedActions.map((action) => ({
    actionId: action.id,
    explanation:
      'This action is intentionally blocked until a reviewed rule or agricultural officer confirms it is safe.',
  }))

  const uncertaintyByReason = {
    timeout:
      'The explanation service took too long, so this response is using deterministic backend safety text only.',
    refusal:
      'The explanation service refused the request, so this response is using deterministic backend safety text only.',
    malformed_output:
      'The explanation service returned invalid structured output, so this response is using deterministic backend safety text only.',
    fallback:
      'This response is using deterministic backend safety text only.',
  } as const

  const summary =
    packet.diagnosis.uncertainty === 'accepted' && packet.diagnosis.disease
      ? `We found signs consistent with ${packet.diagnosis.disease} on ${packet.diagnosis.crop ?? 'the crop'}. Follow the approved containment steps below and avoid unreviewed chemical treatment.`
      : 'The system cannot safely confirm the issue yet. Use containment steps only, gather clearer evidence, and escalate if the crop is worsening.'

  return {
    summary,
    urgency: escalationRequired ? 'officer_review' : 'soon',
    actionExplanations,
    avoidedActionExplanations,
    questions:
      packet.missingData.length > 0
        ? packet.missingData.map((item) => `Please share ${item.replaceAll('_', ' ')}.`)
        : ['Please share a fresh field update if the symptoms spread or worsen.'],
    uncertaintyNotice: uncertaintyByReason[reason],
    escalationNotice: escalationRequired
      ? 'If symptoms spread quickly, the image is unclear, or treatment history is missing, contact an agricultural officer before any chemical treatment.'
      : null,
  }
}

const extractResponseText = (response: unknown) => {
  if (
    response &&
    typeof response === 'object' &&
    'output_text' in response &&
    typeof response.output_text === 'string'
  ) {
    return response.output_text
  }

  if (
    response &&
    typeof response === 'object' &&
    'output' in response &&
    Array.isArray(response.output)
  ) {
    const textParts = response.output.flatMap((item) => {
      if (!item || typeof item !== 'object' || !('content' in item) || !Array.isArray(item.content)) {
        return []
      }

      return item.content
        .map((contentItem: unknown) =>
          contentItem &&
          typeof contentItem === 'object' &&
          'text' in contentItem &&
          typeof contentItem.text === 'string'
            ? contentItem.text
            : null,
        )
        .filter((value: string | null): value is string => Boolean(value))
    })

    return textParts.join('\n').trim()
  }

  return ''
}

const buildPrompt = (packet: GroundedAdvisoryPacket) => {
  const languageName = safeLanguageName(packet.requestedLanguage)
  return [
    'You are the KrishiMitra explanation layer.',
    'Explain only backend-approved facts.',
    'Do not invent pesticide names, dosage, dilution, spray intervals, waiting periods, government eligibility, market prices, weather, or new actions.',
    'Never override blocked actions.',
    'If evidence is uncertain, say so clearly and ask for missing information.',
    `Write farmer-facing content in ${languageName}.`,
  ].join(' ')
}

const postValidateExplanation = (
  packet: GroundedAdvisoryPacket,
  candidate: AdvisoryExplanation,
) => {
  const approvedIds = new Set(packet.approvedActions.map((action) => action.id))
  const blockedIds = new Set(packet.blockedActions.map((action) => action.id))
  const requestedLanguage = advisoryLanguageSchema.parse(packet.requestedLanguage)
  void requestedLanguage

  for (const action of candidate.actionExplanations) {
    if (!approvedIds.has(action.actionId)) {
      throw new Error(`Unknown approved actionId: ${action.actionId}`)
    }
  }

  for (const action of candidate.avoidedActionExplanations) {
    if (!blockedIds.has(action.actionId)) {
      throw new Error(`Unknown blocked actionId: ${action.actionId}`)
    }
  }

  return candidate
}

const logProviderResult = (
  requestId: string,
  meta: ExplanationGenerationMeta,
) => {
  console.info(
    '[advisory-provider]',
    JSON.stringify({
      requestId,
      provider: meta.provider,
      model: meta.model,
      promptVersion: meta.promptVersion,
      schemaVersion: meta.schemaVersion,
      latencyMs: meta.latencyMs,
      outcome: meta.outcome,
      tokenUsage: meta.tokenUsage,
    }),
  )
}

class OpenAiStructuredExplanationProvider implements AiExplanationProvider {
  private client: OpenAI | null = null
  private currentKey: string = ''

  private getClient(): OpenAI | null {
    const key = (process.env.OPENAI_API_KEY || env.openaiApiKey || '').trim()
    if (!key) return null
    if (!this.client || this.currentKey !== key) {
      try {
        this.client = new OpenAI({ apiKey: key })
        this.currentKey = key
      } catch (err) {
        console.warn('[OpenAI] Failed to instantiate OpenAI client:', (err as Error).message)
        return null
      }
    }
    return this.client
  }

  async generateExplanation(packet: GroundedAdvisoryPacket) {
    const startedAt = Date.now()
    const client = this.getClient()
    const model = (process.env.OPENAI_MODEL || env.openaiModel || '').trim()

    if (!client || !model) {
      const explanation = buildFallbackExplanation(packet, 'fallback')
      const meta: ExplanationGenerationMeta = {
        provider: OPENAI_PROVIDER,
        model: model || 'none',
        promptVersion: ADVISORY_PROMPT_VERSION,
        schemaVersion: ADVISORY_SCHEMA_VERSION,
        latencyMs: Date.now() - startedAt,
        outcome: 'fallback',
        tokenUsage: {
          inputTokens: null,
          outputTokens: null,
          totalTokens: null,
        },
      }
      return { explanation, meta }
    }

    try {
      const response = await client.responses.create(
        {
          model,
          input: [
            {
              role: 'system',
              content: [{ type: 'input_text', text: buildPrompt(packet) }],
            },
            {
              role: 'user',
              content: [
                {
                  type: 'input_text',
                  text: JSON.stringify(packet),
                },
              ],
            },
          ],
          text: {
            format: {
              type: 'json_schema',
              name: 'grounded_advisory_explanation',
              strict: true,
              schema: {
                type: 'object',
                additionalProperties: false,
                required: [
                  'summary',
                  'urgency',
                  'actionExplanations',
                  'avoidedActionExplanations',
                  'questions',
                  'uncertaintyNotice',
                  'escalationNotice',
                ],
                properties: {
                  summary: { type: 'string' },
                  urgency: {
                    type: 'string',
                    enum: ['routine', 'soon', 'urgent', 'officer_review'],
                  },
                  actionExplanations: {
                    type: 'array',
                    items: {
                      type: 'object',
                      additionalProperties: false,
                      required: ['actionId', 'explanation'],
                      properties: {
                        actionId: { type: 'string' },
                        explanation: { type: 'string' },
                      },
                    },
                  },
                  avoidedActionExplanations: {
                    type: 'array',
                    items: {
                      type: 'object',
                      additionalProperties: false,
                      required: ['actionId', 'explanation'],
                      properties: {
                        actionId: { type: 'string' },
                        explanation: { type: 'string' },
                      },
                    },
                  },
                  questions: {
                    type: 'array',
                    items: { type: 'string' },
                  },
                  uncertaintyNotice: { type: 'string' },
                  escalationNotice: { type: ['string', 'null'] },
                },
              },
            },
          },
        },
        {
          signal: AbortSignal.timeout(env.openaiTimeoutMs),
        },
      )

      const payloadText = extractResponseText(response)
      const parsed = advisoryExplanationSchema.parse(JSON.parse(payloadText))
      const explanation = postValidateExplanation(packet, parsed)
      const meta: ExplanationGenerationMeta = {
        provider: OPENAI_PROVIDER,
        model: env.openaiModel,
        promptVersion: ADVISORY_PROMPT_VERSION,
        schemaVersion: ADVISORY_SCHEMA_VERSION,
        latencyMs: Date.now() - startedAt,
        outcome: 'success',
        tokenUsage: {
          inputTokens: response.usage?.input_tokens ?? null,
          outputTokens: response.usage?.output_tokens ?? null,
          totalTokens: response.usage?.total_tokens ?? null,
        },
      }

      return { explanation, meta }
    } catch (error) {
      const latencyMs = Date.now() - startedAt
      const code =
        error && typeof error === 'object' && 'code' in error && typeof error.code === 'string'
          ? error.code
          : ''
      const outcome: ExplanationOutcome =
        code === 'invalid_output'
          ? 'malformed_output'
          : error instanceof Error && error.name === 'TimeoutError'
            ? 'timeout'
            : error instanceof Error && /refus/i.test(error.message)
              ? 'refusal'
              : 'fallback'
      const explanation = buildFallbackExplanation(packet, outcome)
      const meta: ExplanationGenerationMeta = {
        provider: OPENAI_PROVIDER,
        model: env.openaiModel,
        promptVersion: ADVISORY_PROMPT_VERSION,
        schemaVersion: ADVISORY_SCHEMA_VERSION,
        latencyMs,
        outcome,
        tokenUsage: {
          inputTokens: null,
          outputTokens: null,
          totalTokens: null,
        },
      }

      return { explanation, meta }
    }
  }
}

let providerSingleton: AiExplanationProvider | null = null

export const getAiExplanationProvider = () => {
  if (providerSingleton) return providerSingleton

  providerSingleton = new OpenAiStructuredExplanationProvider()

  return providerSingleton
}

export const generateGroundedExplanation = async (
  requestId: string,
  packet: GroundedAdvisoryPacket,
) => {
  const result = await getAiExplanationProvider().generateExplanation(packet)
  logProviderResult(requestId, result.meta)
  return result
}

export const advisoryProviderInternals = {
  buildFallbackExplanation,
  postValidateExplanation,
}
