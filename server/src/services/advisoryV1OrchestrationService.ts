import crypto from 'node:crypto'
import { and, desc, eq, inArray } from 'drizzle-orm'
import { getDb } from '../db/index.js'
import {
  advisoryActionStatus,
  advisoryRuns,
  cropCycles,
  crops,
  diseaseDetections,
  fieldObservations,
  farms,
  fields,
  futureCropPlans,
  soilTests,
  treatmentActions,
  treatmentConstraints,
  weatherSnapshots,
  zones,
} from '../db/schema.js'
import { PHASE4_RULES_VERSION } from '../data/phase4DemoData.js'
import {
  advisoryApiV1ResponseSchema,
  advisoryLanguageSchema,
  groundedAdvisoryPacketSchema,
  type AdvisoryApiV1Response,
  type BlockedAction,
  type GroundedAction,
  type GroundedAdvisoryPacket,
} from '../domain/advisory/contracts.js'
import {
  ADVISORY_PROMPT_VERSION,
  ADVISORY_SCHEMA_VERSION,
  generateGroundedExplanation,
} from './aiExplanationProvider.js'
import { predictDisease } from './diseaseModelService.js'
import {
  getAcceptedPredictionThreshold,
  getDiseaseModelManifest,
} from './modelManifestService.js'
import {
  evaluateReviewedRules,
  type ReviewedRuleCandidate,
} from './reviewedRulesService.js'
import { getFarmerByClerkId } from './userService.js'
import { getWeather } from './weatherService.js'
import { httpError } from '../utils/httpError.js'

const ANALYSIS_STATUS_VALUES = ['planned', 'completed', 'skipped', 'unresolved', 'resolved'] as const

type OwnedFieldContext = {
  farmerId: string
  farm: typeof farms.$inferSelect
  field: typeof fields.$inferSelect
}

type OwnedZoneContext = OwnedFieldContext & {
  zone: typeof zones.$inferSelect
}

type ActiveCropContext = {
  cropId: string
  crop: string
  stage: string
  status: string
  season: string
  sowingDate: Date | null
}

type RuleCandidateRow = ReviewedRuleCandidate & {
  actionId: string
  source: string
}

const toNumber = (value: string | number | null | undefined) => {
  if (value === null || value === undefined) return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const hoursSince = (date: Date | null) => {
  if (!date) return null
  return Math.max(0, Math.round((Date.now() - date.getTime()) / 36e5))
}

const normalizeWeatherFreshness = (freshness: string | null | undefined) => {
  if (!freshness) return 'unavailable' as const
  if (freshness === 'live') return 'live' as const
  if (freshness === 'mock') return 'mock' as const
  if (freshness === 'fixture') return 'fixture' as const
  if (freshness === 'stale') return 'stale' as const
  if (freshness.startsWith('cached')) return 'cached' as const
  return 'unavailable' as const
}

const getFarmerOrThrow = async (clerkUserId: string) => {
  const farmer = await getFarmerByClerkId(clerkUserId)
  if (!farmer) {
    throw httpError(404, 'Farmer profile not found. Please sync your account first.')
  }
  return farmer
}

const getOwnedFieldOrThrow = async (
  clerkUserId: string,
  fieldId: string,
): Promise<OwnedFieldContext> => {
  const db = getDb()
  const farmer = await getFarmerOrThrow(clerkUserId)
  const [row] = await db
    .select({
      farm: farms,
      field: fields,
    })
    .from(fields)
    .innerJoin(farms, eq(fields.farmId, farms.id))
    .where(and(eq(fields.id, fieldId), eq(farms.farmerId, farmer.id)))
    .limit(1)

  if (!row) {
    throw httpError(404, 'Field not found for the current farmer.')
  }

  return {
    farmerId: farmer.id,
    farm: row.farm,
    field: row.field,
  }
}

const getOwnedZoneOrThrow = async (
  clerkUserId: string,
  zoneId: string,
): Promise<OwnedZoneContext> => {
  const db = getDb()
  const farmer = await getFarmerOrThrow(clerkUserId)
  const [row] = await db
    .select({ farm: farms, field: fields, zone: zones })
    .from(zones)
    .innerJoin(fields, eq(zones.fieldId, fields.id))
    .innerJoin(farms, eq(fields.farmId, farms.id))
    .where(and(eq(zones.id, zoneId), eq(farms.farmerId, farmer.id)))
    .limit(1)

  if (!row) throw httpError(404, 'Zone not found for the current farmer.')
  return { farmerId: farmer.id, farm: row.farm, field: row.field, zone: row.zone }
}

const getOwnedFarmOrThrow = async (clerkUserId: string, farmId: string) => {
  const db = getDb()
  const farmer = await getFarmerOrThrow(clerkUserId)
  const [farm] = await db
    .select()
    .from(farms)
    .where(and(eq(farms.id, farmId), eq(farms.farmerId, farmer.id)))
    .limit(1)

  if (!farm) {
    throw httpError(404, 'Farm not found for the current farmer.')
  }

  return { farmerId: farmer.id, farm }
}

const ensureCropRecord = async (cropCanonicalName: string, category?: string) => {
  const db = getDb()
  const cropName = cropCanonicalName.trim()
  const existingRows = await db.select().from(crops)
  const existing = existingRows.find(
    (row) => row.canonicalName.trim().toLowerCase() === cropName.toLowerCase(),
  )

  if (existing) return existing

  const [created] = await db
    .insert(crops)
    .values({
      canonicalName: cropName,
      localNames: [cropName],
      category: category?.trim() || 'user_defined',
    })
    .returning()

  return created
}

const getActiveCropContexts = async (fieldId: string, zoneId?: string | null): Promise<ActiveCropContext[]> => {
  const db = getDb()
  const rows = await db
    .select({
      cropId: cropCycles.cropId,
      zoneId: cropCycles.zoneId,
      crop: crops.canonicalName,
      stage: cropCycles.stage,
      status: cropCycles.status,
      season: cropCycles.season,
      sowingDate: cropCycles.sowingDate,
    })
    .from(cropCycles)
    .innerJoin(crops, eq(cropCycles.cropId, crops.id))
    .where(and(eq(cropCycles.fieldId, fieldId), eq(cropCycles.status, 'active')))

  return rows
    .filter((row) => !zoneId || row.zoneId === zoneId || row.zoneId === null)
    .map((row) => ({
    cropId: row.cropId,
    crop: row.crop,
    stage: row.stage,
    status: row.status,
    season: row.season,
    sowingDate: row.sowingDate,
    }))
}

const getLatestSoilTest = async (fieldId: string) => {
  const db = getDb()
  const [row] = await db
    .select()
    .from(soilTests)
    .where(eq(soilTests.fieldId, fieldId))
    .orderBy(desc(soilTests.sampledAt))
    .limit(1)

  return row ?? null
}

const getLastTreatmentHoursAgo = async (fieldId: string) => {
  const db = getDb()
  const rows = await db
    .select({
      occurredAt: advisoryActionStatus.occurredAt,
    })
    .from(advisoryActionStatus)
    .innerJoin(advisoryRuns, eq(advisoryActionStatus.advisoryRunId, advisoryRuns.id))
    .innerJoin(diseaseDetections, eq(advisoryRuns.detectionId, diseaseDetections.id))
    .where(
      and(
        eq(diseaseDetections.fieldId, fieldId),
        inArray(advisoryActionStatus.status, ['completed', 'resolved']),
      ),
    )
    .orderBy(desc(advisoryActionStatus.occurredAt))
    .limit(1)

  return hoursSince(rows[0]?.occurredAt ?? null)
}

const buildWeatherSummary = (weather: Awaited<ReturnType<typeof getWeather>>) =>
  `${weather.location}: ${weather.temperature}°C, ${weather.condition}, humidity ${weather.humidity}%, wind ${weather.windSpeed} km/h, rain chance ${weather.rainfallProbability}%.`

const buildMissingData = (reasonCodes: string[], uncertainty: string) => {
  const items = new Set<string>()

  for (const reasonCode of reasonCodes) {
    switch (reasonCode) {
      case 'detection_context_missing':
        items.add('diagnosis_context')
        break
      case 'crop_stage_missing':
        items.add('crop_stage')
        break
      case 'severity_missing':
        items.add('severity_signal')
        break
      case 'soil_test_missing':
      case 'soil_ph_missing':
      case 'soil_organic_carbon_missing':
        items.add('latest_soil_test')
        break
      case 'weather_snapshot_missing':
      case 'rain_probability_missing':
      case 'wind_speed_missing':
        items.add('current_weather_snapshot')
        break
      case 'last_treatment_missing':
        items.add('last_treatment_date')
        break
      default:
        break
    }
  }

  if (uncertainty !== 'accepted') {
    items.add('clear_leaf_photo')
  }

  return [...items]
}

const severityFromAffectedArea = (affectedAreaPercent?: number | null, healthy?: boolean) => {
  if (affectedAreaPercent === null || affectedAreaPercent === undefined) {
    return {
      level: healthy ? ('low' as const) : ('not_assessed' as const),
      affectedAreaPercent: null,
      source: healthy ? ('model_limited' as const) : ('not_assessed' as const),
    }
  }
  return {
    level:
      affectedAreaPercent < 10
        ? ('low' as const)
        : affectedAreaPercent < 35
          ? ('medium' as const)
          : ('high' as const),
    affectedAreaPercent,
    source: 'farmer_reported' as const,
  }
}

const spreadRiskFromContext = (input: {
  uncertainty: string
  severity: 'not_assessed' | 'low' | 'medium' | 'high'
  humidity: number | null
  rainProbability: number | null
  hasPreviousDetection: boolean
}) => {
  if (input.uncertainty !== 'accepted') {
    return { level: 'unknown' as const, score: null, factors: ['diagnosis_not_accepted'] }
  }

  let score = 10
  const factors: string[] = ['accepted_diagnosis']
  if (input.severity === 'medium') {
    score += 25
    factors.push('farmer_reported_medium_severity')
  }
  if (input.severity === 'high') {
    score += 45
    factors.push('farmer_reported_high_severity')
  }
  if ((input.humidity ?? 0) >= 80) {
    score += 20
    factors.push('high_humidity')
  }
  if ((input.rainProbability ?? 0) >= 50) {
    score += 15
    factors.push('rain_favorable_conditions')
  }
  if (input.hasPreviousDetection) {
    score += 10
    factors.push('previous_zone_detection')
  }
  score = Math.min(score, 100)
  return {
    level: score >= 65 ? ('high' as const) : score >= 35 ? ('medium' as const) : ('low' as const),
    score,
    factors,
  }
}

const buildFuturePlanCandidates = (activeCrops: string[]) => {
  const lowered = activeCrops.map((item) => item.toLowerCase())

  if (lowered.includes('tomato')) {
    return ['Chickpea', 'Green gram', 'Marigold border crop']
  }

  if (lowered.includes('onion')) {
    return ['Cowpea', 'Green gram', 'Leafy vegetable rotation']
  }

  return ['Green gram', 'Cowpea', 'Soil-resting legume cover crop']
}

const getOwnedAdvisoryRunOrThrow = async (clerkUserId: string, advisoryId: string) => {
  const db = getDb()
  const farmer = await getFarmerOrThrow(clerkUserId)
  const [row] = await db
    .select({
      advisoryRun: advisoryRuns,
      detection: diseaseDetections,
      field: fields,
      farm: farms,
    })
    .from(advisoryRuns)
    .innerJoin(diseaseDetections, eq(advisoryRuns.detectionId, diseaseDetections.id))
    .innerJoin(fields, eq(diseaseDetections.fieldId, fields.id))
    .innerJoin(farms, eq(fields.farmId, farms.id))
    .where(and(eq(advisoryRuns.id, advisoryId), eq(farms.farmerId, farmer.id)))
    .limit(1)

  if (!row) {
    throw httpError(404, 'Advisory run not found for the current farmer.')
  }

  return row
}

const loadRuleCandidates = async (diseaseName: string | null) => {
  if (!diseaseName) return [] as RuleCandidateRow[]

  const db = getDb()
  const rows = await db
    .select({
      actionId: treatmentActions.id,
      reviewedActionId: treatmentActions.reviewedActionId,
      title: treatmentActions.title,
      actionText: treatmentActions.actionText,
      source: treatmentActions.source,
      cropCanonicalName: crops.canonicalName,
      disease: treatmentConstraints.disease,
      stage: treatmentConstraints.stage,
      prohibitedCoCrops: treatmentConstraints.prohibitedCoCrops,
      minPh: treatmentConstraints.minPh,
      maxPh: treatmentConstraints.maxPh,
      minOrganicCarbon: treatmentConstraints.minOrganicCarbon,
      maxRainProbability: treatmentConstraints.maxRainProbability,
      maxWindSpeed: treatmentConstraints.maxWindSpeed,
      waitingIntervalHours: treatmentConstraints.waitingIntervalHours,
      severity: treatmentConstraints.severity,
    })
    .from(treatmentConstraints)
    .innerJoin(treatmentActions, eq(treatmentConstraints.actionId, treatmentActions.id))
    .leftJoin(crops, eq(treatmentConstraints.cropId, crops.id))
    .where(eq(treatmentConstraints.disease, diseaseName))

  return rows.map((row) => ({
    actionId: row.actionId,
    reviewedActionId: row.reviewedActionId,
    title: row.title,
    actionText: row.actionText,
    source: row.source,
    cropCanonicalName: row.cropCanonicalName,
    disease: row.disease,
    stage: row.stage,
    prohibitedCoCrops: row.prohibitedCoCrops ?? [],
    minPh: toNumber(row.minPh),
    maxPh: toNumber(row.maxPh),
    minOrganicCarbon: toNumber(row.minOrganicCarbon),
    maxRainProbability: row.maxRainProbability,
    maxWindSpeed: row.maxWindSpeed,
    waitingIntervalHours: row.waitingIntervalHours,
    severity: row.severity,
  }))
}

export const listFarmerFarmsV1 = async (clerkUserId: string) => {
  const db = getDb()
  const farmer = await getFarmerOrThrow(clerkUserId)
  const farmRows = await db
    .select()
    .from(farms)
    .where(eq(farms.farmerId, farmer.id))

  const farmIds = farmRows.map((farm) => farm.id)
  const fieldRows =
    farmIds.length > 0
      ? await db.select().from(fields).where(inArray(fields.farmId, farmIds))
      : []
  const fieldIds = fieldRows.map((field) => field.id)
  const zoneRows =
    fieldIds.length > 0
      ? await db.select().from(zones).where(inArray(zones.fieldId, fieldIds))
      : []
  const cropRows =
    fieldIds.length > 0
      ? await db
          .select({
            fieldId: cropCycles.fieldId,
            zoneId: cropCycles.zoneId,
            crop: crops.canonicalName,
            stage: cropCycles.stage,
            status: cropCycles.status,
          })
          .from(cropCycles)
          .innerJoin(crops, eq(cropCycles.cropId, crops.id))
          .where(inArray(cropCycles.fieldId, fieldIds))
      : []

  return {
    farmer: {
      id: farmer.id,
      clerkUserId: farmer.clerkUserId,
      preferredLanguage: farmer.preferredLanguage,
      state: farmer.state,
      district: farmer.district,
    },
    farms: farmRows.map((farm) => ({
      ...farm,
      fields: fieldRows
        .filter((field) => field.farmId === farm.id)
        .map((field) => ({
          ...field,
          zones: zoneRows.filter((zone) => zone.fieldId === field.id),
          activeCrops: cropRows.filter(
            (cropRow) => cropRow.fieldId === field.id && cropRow.status === 'active',
          ),
        })),
    })),
  }
}

export const createFarmV1 = async (
  clerkUserId: string,
  input: { name: string; village?: string | null; state: string; district: string },
) => {
  const db = getDb()
  const farmer = await getFarmerOrThrow(clerkUserId)
  const [farm] = await db
    .insert(farms)
    .values({
      farmerId: farmer.id,
      name: input.name.trim(),
      village: input.village?.trim() || null,
      state: input.state.trim(),
      district: input.district.trim(),
    })
    .returning()
  return farm
}

export const createFieldV1 = async (
  clerkUserId: string,
  input: {
    farmId: string
    name: string
    area: number
    areaUnit: string
    coarseCentroidLat?: number | null
    coarseCentroidLng?: number | null
    irrigationMethod?: string | null
    farmingMethod?: string | null
    status?: string
  },
) => {
  const db = getDb()
  const { farm } = await getOwnedFarmOrThrow(clerkUserId, input.farmId)
  const [field] = await db
    .insert(fields)
    .values({
      farmId: farm.id,
      name: input.name.trim(),
      area: input.area.toFixed(2),
      areaUnit: input.areaUnit.trim(),
      coarseCentroidLat: input.coarseCentroidLat ?? null,
      coarseCentroidLng: input.coarseCentroidLng ?? null,
      irrigationMethod: input.irrigationMethod?.trim() || null,
      farmingMethod: input.farmingMethod?.trim() || null,
      status: input.status?.trim() || 'active',
    })
    .returning()

  return field
}

export const createZoneV1 = async (
  clerkUserId: string,
  fieldId: string,
  input: {
    name: string
    area?: number | null
    areaUnit?: string | null
    coarseCentroidLat?: number | null
    coarseCentroidLng?: number | null
    currentCondition?: string | null
    status?: string
  },
) => {
  const db = getDb()
  const { field } = await getOwnedFieldOrThrow(clerkUserId, fieldId)
  const [zone] = await db
    .insert(zones)
    .values({
      fieldId: field.id,
      name: input.name.trim(),
      area: input.area?.toFixed(2) ?? null,
      areaUnit: input.areaUnit?.trim() || null,
      coarseCentroidLat: input.coarseCentroidLat ?? null,
      coarseCentroidLng: input.coarseCentroidLng ?? null,
      currentCondition: input.currentCondition?.trim() || null,
      status: input.status?.trim() || 'active',
    })
    .returning()
  return zone
}

export const addCropCycleV1 = async (
  clerkUserId: string,
  fieldId: string,
  input: {
    cropCanonicalName: string
    variety?: string | null
    season: string
    sowingDate?: string | null
    stage: string
    status?: string
    category?: string
    zoneId?: string | null
  },
) => {
  const db = getDb()
  const { field } = await getOwnedFieldOrThrow(clerkUserId, fieldId)
  if (input.zoneId) {
    const { zone } = await getOwnedZoneOrThrow(clerkUserId, input.zoneId)
    if (zone.fieldId !== field.id) throw httpError(400, 'Zone does not belong to this field.')
  }
  const cropRecord = await ensureCropRecord(input.cropCanonicalName, input.category)

  const [cropCycle] = await db
    .insert(cropCycles)
    .values({
      fieldId: field.id,
      zoneId: input.zoneId ?? null,
      cropId: cropRecord.id,
      variety: input.variety?.trim() || null,
      season: input.season.trim(),
      sowingDate: input.sowingDate ? new Date(input.sowingDate) : null,
      stage: input.stage.trim(),
      status: input.status?.trim() || 'active',
    })
    .returning()

  return {
    ...cropCycle,
    cropCanonicalName: cropRecord.canonicalName,
  }
}

export const addSoilTestV1 = async (
  clerkUserId: string,
  fieldId: string,
  input: {
    sampledAt?: string | null
    ph?: number | null
    nitrogen?: number | null
    phosphorus?: number | null
    potassium?: number | null
    organicCarbon?: number | null
    summary?: string | null
    source?: string
    sourceFreshness?: string
    attachmentRef?: string | null
  },
) => {
  const db = getDb()
  const { field } = await getOwnedFieldOrThrow(clerkUserId, fieldId)

  const [soilTest] = await db
    .insert(soilTests)
    .values({
      fieldId: field.id,
      sampledAt: input.sampledAt ? new Date(input.sampledAt) : new Date(),
      ph: input.ph?.toFixed(2) ?? null,
      nitrogen: input.nitrogen?.toFixed(2) ?? null,
      phosphorus: input.phosphorus?.toFixed(2) ?? null,
      potassium: input.potassium?.toFixed(2) ?? null,
      organicCarbon: input.organicCarbon?.toFixed(2) ?? null,
      summary: input.summary?.trim() || null,
      source: input.source?.trim() || 'manual_entry',
      sourceFreshness: input.sourceFreshness?.trim() || 'live',
      attachmentRef: input.attachmentRef?.trim() || null,
    })
    .returning()

  return soilTest
}

export const createGroundedAnalysisV1 = async (
  clerkUserId: string,
  input: {
    fieldId: string
    zoneId?: string | null
    language?: string
    affectedAreaPercent?: number | null
    file: Express.Multer.File
  },
): Promise<AdvisoryApiV1Response> => {
  const db = getDb()
  const requestId = crypto.randomUUID()
  const requestedLanguage = advisoryLanguageSchema.parse(input.language ?? 'en')
  const { field, farm } = await getOwnedFieldOrThrow(clerkUserId, input.fieldId)
  const zoneContext = input.zoneId ? await getOwnedZoneOrThrow(clerkUserId, input.zoneId) : null
  if (zoneContext && zoneContext.field.id !== field.id) {
    throw httpError(400, 'Zone does not belong to this field.')
  }
  const prediction = await predictDisease(input.file)
  const manifest = getDiseaseModelManifest()
  const acceptedPredictionThreshold = getAcceptedPredictionThreshold()
  const confidenceAccepted =
    prediction.confidence >= acceptedPredictionThreshold && prediction.imageQuality.status === 'usable'
  const uncertainty = confidenceAccepted
    ? 'accepted'
    : prediction.imageQuality.status === 'needs_retake'
      ? 'unsupported_image'
      : 'low_confidence'
  const diagnosisCrop = confidenceAccepted
    ? prediction.crop
    : manifest.lowConfidenceBehavior.returnDiagnosisFields.crop
  const diagnosisDisease = confidenceAccepted
    ? prediction.disease
    : manifest.lowConfidenceBehavior.returnDiagnosisFields.disease

  const [detection] = await db
    .insert(diseaseDetections)
    .values({
      fieldId: field.id,
      zoneId: zoneContext?.zone.id ?? null,
      imageReference: `analysis-upload:${requestId}`,
      imageHash: crypto.createHash('sha256').update(input.file.buffer).digest('hex'),
      modelVersion: manifest.modelVersion,
      relevanceScore: prediction.imageQuality.status === 'usable' ? '1.000' : null,
      predictedClass: prediction.rawClass,
      cropName: diagnosisCrop,
      diseaseName: diagnosisDisease,
      confidence: prediction.confidence.toFixed(3),
      uncertaintyResult: uncertainty,
      imageQuality: prediction.imageQuality,
      diagnoses: prediction.alternatives,
      affectedAreaPercent: input.affectedAreaPercent ?? null,
      severitySource: input.affectedAreaPercent === null || input.affectedAreaPercent === undefined ? 'not_assessed' : 'farmer_reported',
    })
    .returning()

  const activeCrops = await getActiveCropContexts(field.id, zoneContext?.zone.id)
  const latestSoilTest = await getLatestSoilTest(field.id)
  const lastTreatmentHoursAgo = await getLastTreatmentHoursAgo(field.id)
  let weatherSource = 'weatherapi_phase6'
  let weatherFreshness = 'unavailable'
  let weatherObservedAt: Date | null = null
  let weatherSummary = `Weather unavailable for ${farm.district}. Proceeding without live weather context.`
  let weatherHourlyForecast: unknown[] = []
  let weatherWeeklyForecast: unknown[] = []
  let weatherHumidity: number | null = null
  let weatherRainProbability: number | null = null
  let weatherWindSpeed: number | null = null
  let weatherTemperature: number | null = null
  let weatherCity = farm.district
  let weatherAlerts: unknown[] = []

  try {
    const weather = await getWeather(farm.district)
    weatherSource = 'weatherapi_phase6'
    weatherFreshness = weather.sourceFreshness
    weatherObservedAt = new Date(weather.fetchedAt)
    weatherSummary = buildWeatherSummary(weather)
    weatherHourlyForecast = weather.hourlyForecast
    weatherWeeklyForecast = weather.weeklyForecast
    weatherHumidity = weather.humidity
    weatherRainProbability = weather.rainfallProbability
    weatherWindSpeed = weather.windSpeed
    weatherTemperature = weather.temperature
    weatherCity = weather.location
    weatherAlerts = weather.alerts
    if (weather.alerts.length > 0) {
      weatherSummary += ` Active provider alerts: ${weather.alerts.map((alert) => alert.headline).join('; ')}.`
    }
  } catch (error) {
    weatherSource = 'weather_unavailable_phase6'
    const detail = error instanceof Error ? error.message : 'Unknown weather provider error.'
    console.warn(
      `[advisory] Weather unavailable for ${farm.district}; continuing without live weather context (${detail})`,
    )
  }

  const [weatherSnapshot] = await db
    .insert(weatherSnapshots)
    .values({
      fieldId: field.id,
      city: weatherCity,
      source: weatherSource,
      sourceFreshness: weatherFreshness,
      observedAt: weatherObservedAt,
      fetchedAt: weatherObservedAt ?? new Date(),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      rainProbability: weatherRainProbability,
      humidity: weatherHumidity,
      windSpeed: weatherWindSpeed,
      temperature: weatherTemperature,
      payload: {
        summary: weatherSummary,
        hourlyForecast: weatherHourlyForecast,
        weeklyForecast: weatherWeeklyForecast,
        alerts: weatherAlerts,
      },
    })
    .returning()

  const primaryCrop =
    activeCrops.find(
      (crop) =>
        diagnosisCrop &&
        crop.crop.trim().toLowerCase() === diagnosisCrop.trim().toLowerCase(),
    ) ?? activeCrops[0]
  const coCropNames = activeCrops
    .filter((crop) => crop.crop !== primaryCrop?.crop)
    .map((crop) => crop.crop)
  const severity = severityFromAffectedArea(input.affectedAreaPercent, prediction.healthy)
  const weatherUsableForRules = weatherFreshness === 'live' || weatherFreshness === 'cached'
  const previousDetections = await db
    .select({ id: diseaseDetections.id })
    .from(diseaseDetections)
    .where(eq(diseaseDetections.fieldId, field.id))
    .limit(2)
  const spreadRisk = spreadRiskFromContext({
    uncertainty,
    severity: severity.level,
    humidity: weatherHumidity,
    rainProbability: weatherRainProbability,
    hasPreviousDetection: previousDetections.length > 1,
  })
  await db
    .update(diseaseDetections)
    .set({ spreadRisk: spreadRisk.level })
    .where(eq(diseaseDetections.id, detection.id))
  const ruleCandidates = confidenceAccepted ? await loadRuleCandidates(diagnosisDisease) : []
  const evaluation = evaluateReviewedRules({
    cropName: diagnosisCrop,
    diseaseName: diagnosisDisease,
    primaryStage: primaryCrop?.stage ?? null,
    coCropNames,
    soilTest: latestSoilTest
      ? {
          ph: toNumber(latestSoilTest.ph),
          organicCarbon: toNumber(latestSoilTest.organicCarbon),
        }
      : null,
    weather: weatherUsableForRules
      ? {
          rainProbability: weatherRainProbability,
          windSpeed: weatherWindSpeed,
        }
      : null,
    lastTreatmentHoursAgo,
    severity: severity.level === 'medium' ? 'moderate' : severity.level,
    candidates: ruleCandidates,
  })

  const actionByReviewedId = new Map(ruleCandidates.map((candidate) => [candidate.reviewedActionId, candidate]))
  const approvedActions: GroundedAction[] = evaluation.results
    .filter((result) => result.status === 'allowed')
    .map((result) => {
      const candidate = actionByReviewedId.get(result.reviewedActionId)
      if (!candidate) {
        throw httpError(500, `Missing candidate details for ${result.reviewedActionId}.`)
      }
      return {
        id: candidate.actionId,
        title: candidate.title,
        safeText: candidate.actionText,
        sourceIds: [candidate.source, candidate.reviewedActionId],
      }
    })

  const blockedActions: BlockedAction[] = evaluation.results
    .filter((result) => result.status === 'blocked')
    .map((result) => {
      const candidate = actionByReviewedId.get(result.reviewedActionId)
      if (!candidate) {
        throw httpError(500, `Missing candidate details for ${result.reviewedActionId}.`)
      }
      return {
        id: candidate.actionId,
        title: candidate.title,
        reasonCodes: result.reasonCodes,
      }
    })

  const packet: GroundedAdvisoryPacket = groundedAdvisoryPacketSchema.parse({
    diagnosis: {
      relevance: confidenceAccepted ? 'plant' : 'unclear',
      crop: diagnosisCrop,
      disease: diagnosisDisease,
      confidence: prediction.confidence,
      uncertainty,
      modelVersion: manifest.modelVersion,
    },
    fieldFacts: [
      {
        code: 'field_name',
        value: field.name,
        sourceId: field.id,
      },
      {
        code: 'location',
        value: [farm.village, farm.district, farm.state].filter(Boolean).join(', '),
        sourceId: farm.id,
      },
      ...activeCrops.map((crop, index) => ({
        code: index === 0 ? 'active_crop' : 'co_crop',
        value: `${crop.crop} at ${crop.stage}`,
        sourceId: crop.cropId,
      })),
      {
        code: 'soil_summary',
        value:
          latestSoilTest?.summary ||
          'No recent soil summary is attached for this field. Treat soil status as unknown.',
        sourceId: latestSoilTest?.id || 'soil_unknown',
      },
    ],
    weatherFacts: [
      {
        code: 'weather_summary',
        value: weatherSummary,
        sourceId: weatherSnapshot.id,
        observedAt: weatherObservedAt?.toISOString(),
      },
      ...weatherAlerts.slice(0, 3).map((alert) => ({
        code: 'weather_alert',
        value: JSON.stringify(alert),
        sourceId: weatherSnapshot.id,
        observedAt: weatherObservedAt?.toISOString(),
      })),
    ],
    approvedActions,
    blockedActions,
    missingData: buildMissingData(
      evaluation.results.flatMap((result) => result.reasonCodes),
      uncertainty,
    ),
    requestedLanguage,
  })

  const [advisoryRun] = await db
    .insert(advisoryRuns)
    .values({
      detectionId: detection.id,
      weatherSnapshotId: weatherSnapshot.id,
      rulesVersion: PHASE4_RULES_VERSION,
      promptVersion: ADVISORY_PROMPT_VERSION,
      model: '',
      status: 'processing',
      structuredResult: null,
    })
    .returning()

  const { explanation, meta } = await generateGroundedExplanation(requestId, packet)
  const response: AdvisoryApiV1Response = advisoryApiV1ResponseSchema.parse({
    requestId,
    analysisId: advisoryRun.id,
    diagnosis: packet.diagnosis,
    diagnoses: prediction.alternatives,
    imageQuality: prediction.imageQuality,
    severity,
    spreadRisk,
    contextUsed: {
      field: {
        id: field.id,
        name: field.name,
        location: [farm.village, farm.district, farm.state].filter(Boolean).join(', '),
      },
      activeCrops: activeCrops.map((crop) => ({
        crop: crop.crop,
        stage: crop.stage,
      })),
      soil: {
        summary:
          latestSoilTest?.summary ||
          'No recent soil summary is attached for this field. Treat soil status as unknown.',
        sourceId: latestSoilTest?.id || 'soil_unknown',
      },
      weather: {
        summary: weatherSummary,
        observedAt: weatherSnapshot.observedAt?.toISOString() ?? null,
        sourceId: weatherSnapshot.id,
        freshness: normalizeWeatherFreshness(weatherFreshness),
      },
    },
    approvedActions,
    blockedActions,
    explanation,
    missingData: packet.missingData,
    escalation: {
      required:
        explanation.urgency === 'officer_review' ||
        packet.diagnosis.uncertainty !== 'accepted' ||
        approvedActions.length === 0,
      reason:
        explanation.escalationNotice ||
        (approvedActions.length === 0
          ? 'No reviewed safe action is available yet for this advisory.'
          : null),
    },
    provenance: {
      ruleVersion: PHASE4_RULES_VERSION,
      promptVersion: meta.promptVersion,
      schemaVersion: ADVISORY_SCHEMA_VERSION,
      modelVersion: `${manifest.modelVersion} + ${meta.model}`,
      sourceIds: [
        field.id,
        farm.id,
        detection.id,
        weatherSnapshot.id,
        ...approvedActions.flatMap((action) => action.sourceIds),
      ],
    },
    dataMode: {
      ml: 'live',
      weather: normalizeWeatherFreshness(weatherFreshness),
      rules: 'fixture',
      llm: meta.outcome === 'success' ? 'live' : 'unavailable',
    },
  })

  await db
    .update(advisoryRuns)
    .set({
      promptVersion: meta.promptVersion,
      model: meta.model,
      status: approvedActions.length > 0 ? 'ready' : 'needs_review',
      structuredResult: response,
      updatedAt: new Date(),
    })
    .where(eq(advisoryRuns.id, advisoryRun.id))

  return response
}

export const getAnalysisByIdV1 = async (
  clerkUserId: string,
  advisoryId: string,
): Promise<AdvisoryApiV1Response> => {
  const row = await getOwnedAdvisoryRunOrThrow(clerkUserId, advisoryId)
  return advisoryApiV1ResponseSchema.parse(row.advisoryRun.structuredResult)
}

export const addAdvisoryActionStatusV1 = async (
  clerkUserId: string,
  advisoryId: string,
  input: {
    actionId: string
    status: (typeof ANALYSIS_STATUS_VALUES)[number]
    note?: string | null
  },
) => {
  const db = getDb()
  const row = await getOwnedAdvisoryRunOrThrow(clerkUserId, advisoryId)
  const advisory = advisoryApiV1ResponseSchema.parse(row.advisoryRun.structuredResult)
  const action = advisory.approvedActions.find((item) => item.id === input.actionId)

  if (!action) {
    throw httpError(400, 'Action ID does not belong to this advisory.')
  }

  const [statusRow] = await db
    .insert(advisoryActionStatus)
    .values({
      advisoryRunId: advisoryId,
      actionId: input.actionId,
      status: input.status,
      note: input.note?.trim() || null,
    })
    .returning()

  await db
    .update(advisoryRuns)
    .set({
      status:
        input.status === 'completed' || input.status === 'resolved'
          ? 'resolved'
          : input.status,
      updatedAt: new Date(),
    })
    .where(eq(advisoryRuns.id, advisoryId))

  return {
    advisoryId,
    actionTitle: action.title,
    status: statusRow.status,
    occurredAt: statusRow.occurredAt,
    note: statusRow.note,
  }
}

export const addFieldObservationV1 = async (
  clerkUserId: string,
  advisoryId: string,
  input: {
    affectedAreaPercent?: number | null
    severity?: 'low' | 'medium' | 'high' | null
    farmerAction?: string | null
    outcome?: string | null
    note?: string | null
  },
) => {
  const db = getDb()
  const row = await getOwnedAdvisoryRunOrThrow(clerkUserId, advisoryId)
  const detection = row.detection
  const [observation] = await db
    .insert(fieldObservations)
    .values({
      fieldId: row.field.id,
      zoneId: detection.zoneId,
      advisoryRunId: advisoryId,
      affectedAreaPercent: input.affectedAreaPercent ?? null,
      severity: input.severity ?? null,
      severitySource: input.affectedAreaPercent === null || input.affectedAreaPercent === undefined ? 'farmer_follow_up' : 'farmer_reported',
      farmerAction: input.farmerAction?.trim() || null,
      outcome: input.outcome?.trim() || null,
      note: input.note?.trim() || null,
    })
    .returning()
  return observation
}

export const getFieldTimelineV1 = async (clerkUserId: string, fieldId: string, zoneId?: string) => {
  const db = getDb()
  const { field } = await getOwnedFieldOrThrow(clerkUserId, fieldId)
  if (zoneId) {
    const { zone } = await getOwnedZoneOrThrow(clerkUserId, zoneId)
    if (zone.fieldId !== field.id) throw httpError(400, 'Zone does not belong to this field.')
  }
  const detections = await db
    .select()
    .from(diseaseDetections)
    .where(eq(diseaseDetections.fieldId, field.id))
    .orderBy(desc(diseaseDetections.createdAt))
    .limit(50)
  const observations = await db
    .select()
    .from(fieldObservations)
    .where(eq(fieldObservations.fieldId, field.id))
    .orderBy(desc(fieldObservations.observedAt))
    .limit(50)
  return {
    fieldId: field.id,
    zoneId: zoneId ?? null,
    detections: detections.filter((item) => !zoneId || item.zoneId === zoneId),
    observations: observations.filter((item) => !zoneId || item.zoneId === zoneId),
  }
}

export const createFuturePlanV1 = async (
  clerkUserId: string,
  advisoryId: string,
  input?: { note?: string | null },
) => {
  const db = getDb()
  const row = await getOwnedAdvisoryRunOrThrow(clerkUserId, advisoryId)
  const statusRows = await db
    .select()
    .from(advisoryActionStatus)
    .where(eq(advisoryActionStatus.advisoryRunId, advisoryId))
    .orderBy(desc(advisoryActionStatus.occurredAt))

  if (!statusRows.some((status) => status.status === 'completed' || status.status === 'resolved')) {
    throw httpError(
      409,
      'Future planning is allowed only after at least one advisory action is completed or resolved.',
    )
  }

  const [existing] = await db
    .select()
    .from(futureCropPlans)
    .where(eq(futureCropPlans.sourceAdvisoryId, advisoryId))
    .limit(1)

  if (existing) return existing

  const activeCrops = await getActiveCropContexts(row.field.id)
  const candidateCrops = buildFuturePlanCandidates(activeCrops.map((crop) => crop.crop))
  const rationale = [
    'Future planning is unlocked because the current advisory has a completed or resolved action state.',
    `Current field crops considered: ${activeCrops.map((crop) => crop.crop).join(', ') || 'none recorded'}.`,
    input?.note?.trim() ? `Farmer note: ${input.note.trim()}` : null,
  ]
    .filter(Boolean)
    .join(' ')

  const [plan] = await db
    .insert(futureCropPlans)
    .values({
      fieldId: row.field.id,
      sourceAdvisoryId: advisoryId,
      status: 'proposed',
      candidateCrops,
      rationale,
      rulesVersion: PHASE4_RULES_VERSION,
    })
    .returning()

  return plan
}

export const advisoryV1StatusValues = ANALYSIS_STATUS_VALUES
