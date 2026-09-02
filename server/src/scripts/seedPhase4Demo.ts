import { and, desc, eq } from 'drizzle-orm'
import { getDb } from '../db/index.js'
import {
  advisoryRuns,
  cropCycles,
  crops,
  diseaseDetections,
  farms,
  fields,
  soilTests,
  treatmentActions,
  treatmentConstraints,
  weatherSnapshots,
} from '../db/schema.js'
import {
  PHASE4_DEMO_SCOPE,
  phase4DemoConstraintFixtures,
  phase4DemoCropCycles,
  phase4DemoCrops,
  phase4DemoFarm,
  phase4DemoFarmer,
  phase4DemoField,
  phase4DemoSoilTest,
  phase4DemoWeatherSnapshot,
  phase4DemoReviewedActions,
} from '../data/phase4DemoData.js'
import { upsertFarmer, updateFarmer } from '../services/userService.js'

const db = getDb()

const ensureFarm = async (farmerId: string) => {
  const [existing] = await db
    .select()
    .from(farms)
    .where(and(eq(farms.farmerId, farmerId), eq(farms.name, phase4DemoFarm.name)))
    .limit(1)

  if (existing) {
    const [updated] = await db
      .update(farms)
      .set({
        village: phase4DemoFarm.village,
        state: phase4DemoFarm.state,
        district: phase4DemoFarm.district,
        updatedAt: new Date(),
      })
      .where(eq(farms.id, existing.id))
      .returning()
    return updated
  }

  const [created] = await db
    .insert(farms)
    .values({
      farmerId,
      ...phase4DemoFarm,
    })
    .returning()
  return created
}

const ensureField = async (farmId: string) => {
  const [existing] = await db
    .select()
    .from(fields)
    .where(and(eq(fields.farmId, farmId), eq(fields.name, phase4DemoField.name)))
    .limit(1)

  if (existing) {
    const [updated] = await db
      .update(fields)
      .set({
        area: phase4DemoField.area,
        areaUnit: phase4DemoField.areaUnit,
        coarseCentroidLat: phase4DemoField.coarseCentroidLat,
        coarseCentroidLng: phase4DemoField.coarseCentroidLng,
        updatedAt: new Date(),
      })
      .where(eq(fields.id, existing.id))
      .returning()
    return updated
  }

  const [created] = await db
    .insert(fields)
    .values({
      farmId,
      ...phase4DemoField,
    })
    .returning()
  return created
}

const ensureCrops = async () => {
  const cropMap = new Map<string, string>()

  for (const cropRecord of phase4DemoCrops) {
    const [saved] = await db
      .insert(crops)
      .values({
        canonicalName: cropRecord.canonicalName,
        localNames: [...cropRecord.localNames],
        category: cropRecord.category,
      })
      .onConflictDoUpdate({
        target: crops.canonicalName,
        set: {
          localNames: [...cropRecord.localNames],
          category: cropRecord.category,
        },
      })
      .returning()

    cropMap.set(saved.canonicalName, saved.id)
  }

  return cropMap
}

const ensureCropCycles = async (fieldId: string, cropIds: Map<string, string>) => {
  for (const cycle of phase4DemoCropCycles) {
    const cropId = cropIds.get(cycle.cropCanonicalName)
    if (!cropId) {
      throw new Error(`Missing crop id for ${cycle.cropCanonicalName}`)
    }

    const [existing] = await db
      .select()
      .from(cropCycles)
      .where(
        and(
          eq(cropCycles.fieldId, fieldId),
          eq(cropCycles.cropId, cropId),
          eq(cropCycles.status, cycle.status),
        ),
      )
      .limit(1)

    if (existing) {
      await db
        .update(cropCycles)
        .set({
          variety: cycle.variety,
          season: cycle.season,
          sowingDate: new Date(cycle.sowingDate),
          stage: cycle.stage,
          updatedAt: new Date(),
        })
        .where(eq(cropCycles.id, existing.id))
      continue
    }

    await db.insert(cropCycles).values({
      fieldId,
      cropId,
      variety: cycle.variety,
      season: cycle.season,
      sowingDate: new Date(cycle.sowingDate),
      stage: cycle.stage,
      status: cycle.status,
    })
  }
}

const ensureSoilSummary = async (fieldId: string) => {
  const [existing] = await db
    .select()
    .from(soilTests)
    .where(and(eq(soilTests.fieldId, fieldId), eq(soilTests.source, phase4DemoSoilTest.source)))
    .orderBy(desc(soilTests.sampledAt))
    .limit(1)

  if (existing) {
    await db
      .update(soilTests)
      .set({
        sampledAt: new Date(phase4DemoSoilTest.sampledAt),
        ph: phase4DemoSoilTest.ph,
        nitrogen: phase4DemoSoilTest.nitrogen,
        phosphorus: phase4DemoSoilTest.phosphorus,
        potassium: phase4DemoSoilTest.potassium,
        organicCarbon: phase4DemoSoilTest.organicCarbon,
        summary: phase4DemoSoilTest.summary,
        sourceFreshness: phase4DemoSoilTest.sourceFreshness,
        attachmentRef: phase4DemoSoilTest.attachmentRef,
      })
      .where(eq(soilTests.id, existing.id))
    return
  }

  await db.insert(soilTests).values({
    fieldId,
    sampledAt: new Date(phase4DemoSoilTest.sampledAt),
    ph: phase4DemoSoilTest.ph,
    nitrogen: phase4DemoSoilTest.nitrogen,
    phosphorus: phase4DemoSoilTest.phosphorus,
    potassium: phase4DemoSoilTest.potassium,
    organicCarbon: phase4DemoSoilTest.organicCarbon,
    summary: phase4DemoSoilTest.summary,
    source: phase4DemoSoilTest.source,
    sourceFreshness: phase4DemoSoilTest.sourceFreshness,
    attachmentRef: phase4DemoSoilTest.attachmentRef,
  })
}

const ensureWeatherSnapshot = async (fieldId: string) => {
  const [existing] = await db
    .select()
    .from(weatherSnapshots)
    .where(
      and(
        eq(weatherSnapshots.fieldId, fieldId),
        eq(weatherSnapshots.source, phase4DemoWeatherSnapshot.source),
      ),
    )
    .orderBy(desc(weatherSnapshots.fetchedAt))
    .limit(1)

  const payload = {
    ...phase4DemoWeatherSnapshot.payload,
    scope: PHASE4_DEMO_SCOPE,
  }

  if (existing) {
    await db
      .update(weatherSnapshots)
      .set({
        city: phase4DemoWeatherSnapshot.city,
        sourceFreshness: phase4DemoWeatherSnapshot.sourceFreshness,
        observedAt: new Date(phase4DemoWeatherSnapshot.observedAt),
        expiresAt: new Date(phase4DemoWeatherSnapshot.expiresAt),
        rainProbability: phase4DemoWeatherSnapshot.rainProbability,
        humidity: phase4DemoWeatherSnapshot.humidity,
        windSpeed: phase4DemoWeatherSnapshot.windSpeed,
        temperature: phase4DemoWeatherSnapshot.temperature,
        payload,
      })
      .where(eq(weatherSnapshots.id, existing.id))
    return
  }

  await db.insert(weatherSnapshots).values({
    fieldId,
    city: phase4DemoWeatherSnapshot.city,
    source: phase4DemoWeatherSnapshot.source,
    sourceFreshness: phase4DemoWeatherSnapshot.sourceFreshness,
    observedAt: new Date(phase4DemoWeatherSnapshot.observedAt),
    expiresAt: new Date(phase4DemoWeatherSnapshot.expiresAt),
    rainProbability: phase4DemoWeatherSnapshot.rainProbability,
    humidity: phase4DemoWeatherSnapshot.humidity,
    windSpeed: phase4DemoWeatherSnapshot.windSpeed,
    temperature: phase4DemoWeatherSnapshot.temperature,
    payload,
  })
}

const ensureReviewedRules = async (cropIds: Map<string, string>) => {
  const actionIdMap = new Map<string, string>()

  for (const action of phase4DemoReviewedActions) {
    const [saved] = await db
      .insert(treatmentActions)
      .values({
        reviewedActionId: action.reviewedActionId,
        type: action.type,
        title: action.title,
        activeIngredient: action.activeIngredient,
        actionText: action.actionText,
        source: action.source,
        jurisdiction: action.jurisdiction,
        reviewDate: new Date(action.reviewDate),
        demoScope: action.demoScope,
      })
      .onConflictDoUpdate({
        target: treatmentActions.reviewedActionId,
        set: {
          type: action.type,
          title: action.title,
          activeIngredient: action.activeIngredient,
          actionText: action.actionText,
          source: action.source,
          jurisdiction: action.jurisdiction,
          reviewDate: new Date(action.reviewDate),
          demoScope: action.demoScope,
        },
      })
      .returning()

    actionIdMap.set(saved.reviewedActionId, saved.id)
  }

  for (const constraint of phase4DemoConstraintFixtures) {
    const actionId = actionIdMap.get(constraint.reviewedActionId)
    const cropId = cropIds.get(constraint.cropCanonicalName)

    if (!actionId) {
      throw new Error(`Missing action id for ${constraint.reviewedActionId}`)
    }

    if (!cropId) {
      throw new Error(`Missing crop id for ${constraint.cropCanonicalName}`)
    }

    const [existing] = await db
      .select()
      .from(treatmentConstraints)
      .where(
        and(
          eq(treatmentConstraints.actionId, actionId),
          eq(treatmentConstraints.disease, constraint.disease),
          eq(treatmentConstraints.source, constraint.source),
        ),
      )
      .limit(1)

    const values = {
      actionId,
      cropId,
      disease: constraint.disease,
      stage: constraint.stage,
      prohibitedCoCrops: [...constraint.prohibitedCoCrops],
      minPh: constraint.minPh?.toString() ?? null,
      maxPh: constraint.maxPh?.toString() ?? null,
      minOrganicCarbon: constraint.minOrganicCarbon?.toString() ?? null,
      maxRainProbability: constraint.maxRainProbability,
      maxWindSpeed: constraint.maxWindSpeed,
      waitingIntervalHours: constraint.waitingIntervalHours,
      severity: constraint.severity,
      source: constraint.source,
      sourceFreshness: constraint.sourceFreshness,
      notes: constraint.notes,
    }

    if (existing) {
      await db
        .update(treatmentConstraints)
        .set(values)
        .where(eq(treatmentConstraints.id, existing.id))
      continue
    }

    await db.insert(treatmentConstraints).values(values)
  }
}

const main = async () => {
  const farmer = await upsertFarmer({
    clerkUserId: phase4DemoFarmer.clerkUserId,
    name: phase4DemoFarmer.name,
    email: phase4DemoFarmer.email,
  })

  await updateFarmer(phase4DemoFarmer.clerkUserId, {
    name: phase4DemoFarmer.name,
    preferredLanguage: phase4DemoFarmer.preferredLanguage,
    state: phase4DemoFarmer.state,
    district: phase4DemoFarmer.district,
  })

  const farm = await ensureFarm(farmer.id)
  const field = await ensureField(farm.id)
  const cropIds = await ensureCrops()
  await ensureCropCycles(field.id, cropIds)
  await ensureSoilSummary(field.id)
  await ensureWeatherSnapshot(field.id)
  await ensureReviewedRules(cropIds)

  const summary = {
    farmerId: farmer.id,
    farmId: farm.id,
    fieldId: field.id,
    cropCount: phase4DemoCrops.length,
    reviewedActionCount: phase4DemoReviewedActions.length,
    note: 'Phase 4 demo twin and reviewed rules are seeded.',
  }

  console.log(JSON.stringify(summary, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
