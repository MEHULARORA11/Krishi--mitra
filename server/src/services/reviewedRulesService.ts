export type RuleDecisionStatus = 'allowed' | 'blocked' | 'needs_data'

export type ReviewedRuleCandidate = {
  reviewedActionId: string
  title: string
  actionText: string
  cropCanonicalName: string | null
  disease: string
  stage: string | null
  prohibitedCoCrops: string[]
  minPh: number | null
  maxPh: number | null
  minOrganicCarbon: number | null
  maxRainProbability: number | null
  maxWindSpeed: number | null
  waitingIntervalHours: number | null
  severity: string | null
}

export type RuleEvaluationInput = {
  cropName: string | null
  diseaseName: string | null
  primaryStage: string | null
  coCropNames: string[]
  soilTest: {
    ph: number | null
    organicCarbon: number | null
  } | null
  weather: {
    rainProbability: number | null
    windSpeed: number | null
  } | null
  lastTreatmentHoursAgo: number | null
  severity: string | null
  candidates: ReviewedRuleCandidate[]
}

export type RuleEvaluationResult = {
  reviewedActionId: string
  title: string
  status: RuleDecisionStatus
  reasonCodes: string[]
}

export type ReviewedRulesOutcome = {
  overallStatus: RuleDecisionStatus
  results: RuleEvaluationResult[]
}

const normalize = (value: string | null | undefined) => value?.trim().toLowerCase() ?? null

export const evaluateReviewedRules = (
  input: RuleEvaluationInput,
): ReviewedRulesOutcome => {
  const cropName = normalize(input.cropName)
  const diseaseName = normalize(input.diseaseName)
  const primaryStage = normalize(input.primaryStage)
  const severity = normalize(input.severity)
  const coCrops = new Set(input.coCropNames.map((item) => item.trim().toLowerCase()))

  const results = input.candidates.map((candidate) => {
    const reasonCodes: string[] = []
    const candidateCrop = normalize(candidate.cropCanonicalName)
    const candidateDisease = normalize(candidate.disease)
    const candidateStage = normalize(candidate.stage)
    const candidateSeverity = normalize(candidate.severity)

    if (!cropName || !diseaseName) {
      reasonCodes.push('detection_context_missing')
    } else {
      if (candidateCrop && cropName !== candidateCrop) {
        reasonCodes.push('crop_mismatch')
      }
      if (candidateDisease && diseaseName !== candidateDisease) {
        reasonCodes.push('disease_mismatch')
      }
    }

    if (candidateStage && !primaryStage) {
      reasonCodes.push('crop_stage_missing')
    } else if (candidateStage && primaryStage !== candidateStage) {
      reasonCodes.push('stage_mismatch')
    }

    if (candidateSeverity && !severity) {
      reasonCodes.push('severity_missing')
    } else if (candidateSeverity && severity !== candidateSeverity) {
      reasonCodes.push('severity_mismatch')
    }

    if (
      candidate.prohibitedCoCrops.some((coCrop) =>
        coCrops.has(coCrop.trim().toLowerCase()),
      )
    ) {
      reasonCodes.push('co_crop_blocked')
    }

    if (candidate.minPh !== null || candidate.maxPh !== null || candidate.minOrganicCarbon !== null) {
      if (!input.soilTest) {
        reasonCodes.push('soil_test_missing')
      } else {
        if (candidate.minPh !== null && input.soilTest.ph === null) {
          reasonCodes.push('soil_ph_missing')
        } else if (
          candidate.minPh !== null &&
          input.soilTest.ph !== null &&
          input.soilTest.ph < candidate.minPh
        ) {
          reasonCodes.push('soil_ph_too_low')
        }

        if (candidate.maxPh !== null && input.soilTest.ph === null) {
          reasonCodes.push('soil_ph_missing')
        } else if (
          candidate.maxPh !== null &&
          input.soilTest.ph !== null &&
          input.soilTest.ph > candidate.maxPh
        ) {
          reasonCodes.push('soil_ph_too_high')
        }

        if (candidate.minOrganicCarbon !== null && input.soilTest.organicCarbon === null) {
          reasonCodes.push('soil_organic_carbon_missing')
        } else if (
          candidate.minOrganicCarbon !== null &&
          input.soilTest.organicCarbon !== null &&
          input.soilTest.organicCarbon < candidate.minOrganicCarbon
        ) {
          reasonCodes.push('soil_organic_carbon_too_low')
        }
      }
    }

    if (candidate.maxRainProbability !== null || candidate.maxWindSpeed !== null) {
      if (!input.weather) {
        reasonCodes.push('weather_snapshot_missing')
      } else {
        if (candidate.maxRainProbability !== null && input.weather.rainProbability === null) {
          reasonCodes.push('rain_probability_missing')
        } else if (
          candidate.maxRainProbability !== null &&
          input.weather.rainProbability !== null &&
          input.weather.rainProbability > candidate.maxRainProbability
        ) {
          reasonCodes.push('rain_probability_blocked')
        }

        if (candidate.maxWindSpeed !== null && input.weather.windSpeed === null) {
          reasonCodes.push('wind_speed_missing')
        } else if (
          candidate.maxWindSpeed !== null &&
          input.weather.windSpeed !== null &&
          input.weather.windSpeed > candidate.maxWindSpeed
        ) {
          reasonCodes.push('wind_speed_blocked')
        }
      }
    }

    if (candidate.waitingIntervalHours !== null) {
      if (input.lastTreatmentHoursAgo === null) {
        reasonCodes.push('last_treatment_missing')
      } else if (input.lastTreatmentHoursAgo < candidate.waitingIntervalHours) {
        reasonCodes.push('waiting_interval_not_met')
      }
    }

    const hasBlockedReason = reasonCodes.some((reasonCode) =>
      [
        'crop_mismatch',
        'disease_mismatch',
        'stage_mismatch',
        'severity_mismatch',
        'co_crop_blocked',
        'soil_ph_too_low',
        'soil_ph_too_high',
        'soil_organic_carbon_too_low',
        'rain_probability_blocked',
        'wind_speed_blocked',
        'waiting_interval_not_met',
      ].includes(reasonCode),
    )

    const hasNeedsDataReason = reasonCodes.some((reasonCode) =>
      [
        'detection_context_missing',
        'crop_stage_missing',
        'severity_missing',
        'soil_test_missing',
        'soil_ph_missing',
        'soil_organic_carbon_missing',
        'weather_snapshot_missing',
        'rain_probability_missing',
        'wind_speed_missing',
        'last_treatment_missing',
      ].includes(reasonCode),
    )

    const status: RuleDecisionStatus = hasBlockedReason
      ? 'blocked'
      : hasNeedsDataReason
        ? 'needs_data'
        : 'allowed'

    return {
      reviewedActionId: candidate.reviewedActionId,
      title: candidate.title,
      status,
      reasonCodes,
    }
  })

  const overallStatus: RuleDecisionStatus = results.some((result) => result.status === 'allowed')
    ? 'allowed'
    : results.some((result) => result.status === 'needs_data')
      ? 'needs_data'
      : 'blocked'

  return {
    overallStatus,
    results,
  }
}
