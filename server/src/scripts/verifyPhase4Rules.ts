import assert from 'node:assert/strict'
import {
  phase4DemoConstraintFixtures,
  phase4DemoReviewedActions,
} from '../data/phase4DemoData.js'
import {
  evaluateReviewedRules,
  type ReviewedRuleCandidate,
} from '../services/reviewedRulesService.js'

const candidates: ReviewedRuleCandidate[] = phase4DemoConstraintFixtures.map((constraint) => {
  const action = phase4DemoReviewedActions.find(
    (item) => item.reviewedActionId === constraint.reviewedActionId,
  )

  if (!action) {
    throw new Error(`Missing action fixture for ${constraint.reviewedActionId}`)
  }

  return {
    reviewedActionId: constraint.reviewedActionId,
    title: action.title,
    actionText: action.actionText,
    cropCanonicalName: constraint.cropCanonicalName,
    disease: constraint.disease,
    stage: constraint.stage,
    prohibitedCoCrops: [...constraint.prohibitedCoCrops],
    minPh: constraint.minPh,
    maxPh: constraint.maxPh,
    minOrganicCarbon: constraint.minOrganicCarbon,
    maxRainProbability: constraint.maxRainProbability,
    maxWindSpeed: constraint.maxWindSpeed,
    waitingIntervalHours: constraint.waitingIntervalHours,
    severity: constraint.severity,
  }
})

const findResult = (results: ReturnType<typeof evaluateReviewedRules>['results'], reviewedActionId: string) => {
  const result = results.find((item) => item.reviewedActionId === reviewedActionId)
  assert.ok(result, `Expected result for ${reviewedActionId}`)
  return result
}

const allowedCase = evaluateReviewedRules({
  cropName: 'Tomato',
  diseaseName: 'Early blight',
  primaryStage: 'vegetative',
  coCropNames: [],
  soilTest: {
    ph: 6.5,
    organicCarbon: 0.82,
  },
  weather: {
    rainProbability: 18,
    windSpeed: 10,
  },
  lastTreatmentHoursAgo: 96,
  severity: 'moderate',
  candidates,
})
assert.equal(allowedCase.overallStatus, 'allowed')
assert.equal(findResult(allowedCase.results, 'reviewed_containment_001').status, 'allowed')

const coCropBlockedCase = evaluateReviewedRules({
  cropName: 'Tomato',
  diseaseName: 'Early blight',
  primaryStage: 'vegetative',
  coCropNames: ['Onion'],
  soilTest: {
    ph: 6.5,
    organicCarbon: 0.82,
  },
  weather: {
    rainProbability: 18,
    windSpeed: 10,
  },
  lastTreatmentHoursAgo: 96,
  severity: 'moderate',
  candidates,
})
assert.equal(findResult(coCropBlockedCase.results, 'reviewed_neem_barrier_001').status, 'blocked')
assert.ok(
  findResult(coCropBlockedCase.results, 'reviewed_neem_barrier_001').reasonCodes.includes(
    'co_crop_blocked',
  ),
)

const weatherBlockedCase = evaluateReviewedRules({
  cropName: 'Tomato',
  diseaseName: 'Early blight',
  primaryStage: 'vegetative',
  coCropNames: [],
  soilTest: {
    ph: 6.5,
    organicCarbon: 0.82,
  },
  weather: {
    rainProbability: 78,
    windSpeed: 22,
  },
  lastTreatmentHoursAgo: 96,
  severity: 'moderate',
  candidates,
})
assert.equal(findResult(weatherBlockedCase.results, 'reviewed_dry_window_001').status, 'blocked')
assert.ok(
  findResult(weatherBlockedCase.results, 'reviewed_dry_window_001').reasonCodes.includes(
    'rain_probability_blocked',
  ),
)

const missingDataCase = evaluateReviewedRules({
  cropName: 'Tomato',
  diseaseName: 'Early blight',
  primaryStage: 'vegetative',
  coCropNames: [],
  soilTest: null,
  weather: {
    rainProbability: 18,
    windSpeed: 10,
  },
  lastTreatmentHoursAgo: null,
  severity: 'moderate',
  candidates: candidates.filter(
    (candidate) => candidate.reviewedActionId === 'reviewed_soil_support_001',
  ),
})
assert.equal(missingDataCase.overallStatus, 'needs_data')
assert.equal(findResult(missingDataCase.results, 'reviewed_soil_support_001').status, 'needs_data')
assert.ok(
  findResult(missingDataCase.results, 'reviewed_soil_support_001').reasonCodes.includes(
    'soil_test_missing',
  ),
)

const noSafeActionCase = evaluateReviewedRules({
  cropName: 'Tomato',
  diseaseName: 'Late blight',
  primaryStage: 'fruiting',
  coCropNames: ['Onion'],
  soilTest: {
    ph: 5.2,
    organicCarbon: 0.4,
  },
  weather: {
    rainProbability: 88,
    windSpeed: 26,
  },
  lastTreatmentHoursAgo: 8,
  severity: 'severe',
  candidates: candidates.filter(
    (candidate) =>
      candidate.reviewedActionId === 'reviewed_neem_barrier_001' ||
      candidate.reviewedActionId === 'reviewed_dry_window_001',
  ),
})
assert.equal(noSafeActionCase.overallStatus, 'blocked')
assert.ok(noSafeActionCase.results.every((item) => item.status === 'blocked'))

console.log('Phase 4 reviewed rules checks passed.')
