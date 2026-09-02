import assert from 'node:assert/strict'
import { advisoryV1Routes } from '../routes/advisoryV1Routes.js'
import { advisoryApiV1ResponseSchema } from '../domain/advisory/contracts.js'

const routePaths = advisoryV1Routes.stack
  .map((layer) => layer.route?.path)
  .filter((path): path is string => typeof path === 'string')

for (const path of [
  '/api/v1/farms',
  '/api/v1/fields',
  '/api/v1/fields/:id/zones',
  '/api/v1/analyses',
  '/api/v1/fields/:id/timeline',
  '/api/v1/advisories/:id/observations',
]) {
  assert.ok(routePaths.includes(path), `Missing canonical ecosystem advisory route: ${path}`)
}

const response = advisoryApiV1ResponseSchema.parse({
  requestId: 'request-demo',
  analysisId: 'analysis-demo',
  diagnosis: {
    relevance: 'plant',
    crop: 'Tomato',
    disease: 'Early blight',
    confidence: 0.87,
    uncertainty: 'accepted',
    modelVersion: 'plantvillage-mobilenetv2-tfjs-v1',
  },
  diagnoses: [
    { rawClass: 'Tomato___Early_blight', crop: 'Tomato', disease: 'Early blight', healthy: false, confidence: 0.87 },
    { rawClass: 'Tomato___Late_blight', crop: 'Tomato', disease: 'Late blight', healthy: false, confidence: 0.08 },
    { rawClass: 'Tomato___healthy', crop: 'Tomato', disease: 'healthy', healthy: true, confidence: 0.05 },
  ],
  imageQuality: { status: 'usable', brightness: 120, contrast: 42, sharpness: 88, reasons: [] },
  severity: { level: 'medium', affectedAreaPercent: 18, source: 'farmer_reported' },
  spreadRisk: { level: 'medium', score: 55, factors: ['accepted_diagnosis', 'farmer_reported_medium_severity'] },
  contextUsed: {
    field: { id: 'field-demo', name: 'Main Field', location: 'Thrissur, Kerala' },
    activeCrops: [{ crop: 'Tomato', stage: 'vegetative' }],
    soil: { summary: 'No recent soil summary is attached for this field.', sourceId: 'soil_unknown' },
    weather: { summary: 'Thrissur: 29°C, Cloudy.', observedAt: null, sourceId: 'weather-demo', freshness: 'fixture' },
  },
  approvedActions: [],
  blockedActions: [],
  explanation: {
    summary: 'Monitor the affected zone and follow the approved field workflow.',
    urgency: 'soon',
    actionExplanations: [],
    avoidedActionExplanations: [],
    questions: ['Share a follow-up image after monitoring.'],
    uncertaintyNotice: 'Use reviewed information only.',
    escalationNotice: null,
  },
  missingData: [],
  escalation: { required: false, reason: null },
  provenance: {
    ruleVersion: 'phase4-reviewed-rules-v1',
    promptVersion: 'openai-explanation-v1',
    schemaVersion: '1.0.0',
    modelVersion: 'plantvillage-mobilenetv2-tfjs-v1',
    sourceIds: ['field-demo'],
  },
  dataMode: { ml: 'live', weather: 'fixture', rules: 'fixture', llm: 'unavailable' },
})

assert.equal(response.diagnoses?.length, 3)
assert.equal(response.severity?.source, 'farmer_reported')
assert.equal(response.spreadRisk?.level, 'medium')

console.log('Phase 6 ecosystem advisory route and response contract checks passed.')
