import {
  integer,
  jsonb,
  numeric,
  pgTable,
  real,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'

export const farmers = pgTable('farmers', {
  id: uuid('id').primaryKey().defaultRandom(),
  clerkUserId: text('clerk_user_id').unique().notNull(),
  name: text('name'),
  email: text('email').unique().notNull(),
  preferredLanguage: text('preferred_language').default('en').notNull(),
  state: text('state'),
  district: text('district'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const chatMessages = pgTable('chat_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  farmerId: uuid('farmer_id').references(() => farmers.id, { onDelete: 'cascade' }),
  role: text('role', { enum: ['user', 'bot'] }).notNull(),
  content: text('content').notNull(),
  language: text('language').default('en').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const analysisHistory = pgTable('analysis_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  farmerId: uuid('farmer_id').references(() => farmers.id, { onDelete: 'cascade' }),
  crop: text('crop').notNull(),
  disease: text('disease').notNull(),
  confidence: numeric('confidence', { precision: 5, scale: 2 }).notNull(),
  severity: text('severity', { enum: ['low', 'medium', 'high'] }).notNull(),
  advisoryShort: text('advisory_short'),
  advisoryDetail: text('advisory_detail'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const farms = pgTable('farms', {
  id: uuid('id').primaryKey().defaultRandom(),
  farmerId: uuid('farmer_id')
    .references(() => farmers.id, { onDelete: 'cascade' })
    .notNull(),
  name: text('name').notNull(),
  village: text('village'),
  state: text('state').notNull(),
  district: text('district').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const fields = pgTable('fields', {
  id: uuid('id').primaryKey().defaultRandom(),
  farmId: uuid('farm_id')
    .references(() => farms.id, { onDelete: 'cascade' })
    .notNull(),
  name: text('name').notNull(),
  area: numeric('area', { precision: 12, scale: 2 }).notNull(),
  areaUnit: text('area_unit').notNull(),
  coarseCentroidLat: real('coarse_centroid_lat'),
  coarseCentroidLng: real('coarse_centroid_lng'),
  irrigationMethod: text('irrigation_method'),
  farmingMethod: text('farming_method'),
  status: text('status').default('active').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const zones = pgTable('zones', {
  id: uuid('id').primaryKey().defaultRandom(),
  fieldId: uuid('field_id')
    .references(() => fields.id, { onDelete: 'cascade' })
    .notNull(),
  name: text('name').notNull(),
  area: numeric('area', { precision: 12, scale: 2 }),
  areaUnit: text('area_unit'),
  coarseCentroidLat: real('coarse_centroid_lat'),
  coarseCentroidLng: real('coarse_centroid_lng'),
  currentCondition: text('current_condition'),
  status: text('status').default('active').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const crops = pgTable('crops', {
  id: uuid('id').primaryKey().defaultRandom(),
  canonicalName: text('canonical_name').unique().notNull(),
  localNames: jsonb('local_names').$type<string[]>().default([]).notNull(),
  category: text('category').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const cropCycles = pgTable('crop_cycles', {
  id: uuid('id').primaryKey().defaultRandom(),
  fieldId: uuid('field_id')
    .references(() => fields.id, { onDelete: 'cascade' })
    .notNull(),
  zoneId: uuid('zone_id').references(() => zones.id, { onDelete: 'set null' }),
  cropId: uuid('crop_id')
    .references(() => crops.id, { onDelete: 'restrict' })
    .notNull(),
  variety: text('variety'),
  season: text('season').notNull(),
  sowingDate: timestamp('sowing_date'),
  stage: text('stage').notNull(),
  status: text('status').default('active').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const soilTests = pgTable('soil_tests', {
  id: uuid('id').primaryKey().defaultRandom(),
  fieldId: uuid('field_id')
    .references(() => fields.id, { onDelete: 'cascade' })
    .notNull(),
  sampledAt: timestamp('sampled_at').notNull(),
  ph: numeric('ph', { precision: 4, scale: 2 }),
  nitrogen: numeric('nitrogen', { precision: 10, scale: 2 }),
  phosphorus: numeric('phosphorus', { precision: 10, scale: 2 }),
  potassium: numeric('potassium', { precision: 10, scale: 2 }),
  organicCarbon: numeric('organic_carbon', { precision: 5, scale: 2 }),
  summary: text('summary'),
  source: text('source').notNull(),
  sourceFreshness: text('source_freshness').default('unknown').notNull(),
  attachmentRef: text('attachment_ref'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const treatmentActions = pgTable('treatment_actions', {
  id: uuid('id').primaryKey().defaultRandom(),
  reviewedActionId: text('reviewed_action_id').unique().notNull(),
  type: text('type').notNull(),
  title: text('title').notNull(),
  activeIngredient: text('active_ingredient'),
  actionText: text('action_text').notNull(),
  source: text('source').notNull(),
  jurisdiction: text('jurisdiction').notNull(),
  reviewDate: timestamp('review_date').notNull(),
  demoScope: text('demo_scope'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const treatmentConstraints = pgTable('treatment_constraints', {
  id: uuid('id').primaryKey().defaultRandom(),
  actionId: uuid('action_id')
    .references(() => treatmentActions.id, { onDelete: 'cascade' })
    .notNull(),
  cropId: uuid('crop_id').references(() => crops.id, { onDelete: 'set null' }),
  disease: text('disease').notNull(),
  stage: text('stage'),
  prohibitedCoCrops: jsonb('prohibited_co_crops').$type<string[]>().default([]).notNull(),
  minPh: numeric('min_ph', { precision: 4, scale: 2 }),
  maxPh: numeric('max_ph', { precision: 4, scale: 2 }),
  minOrganicCarbon: numeric('min_organic_carbon', { precision: 5, scale: 2 }),
  maxRainProbability: real('max_rain_probability'),
  maxWindSpeed: real('max_wind_speed'),
  waitingIntervalHours: integer('waiting_interval_hours'),
  severity: text('severity'),
  source: text('source').notNull(),
  sourceFreshness: text('source_freshness').default('reviewed').notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const diseaseDetections = pgTable('disease_detections', {
  id: uuid('id').primaryKey().defaultRandom(),
  fieldId: uuid('field_id')
    .references(() => fields.id, { onDelete: 'cascade' })
    .notNull(),
  zoneId: uuid('zone_id').references(() => zones.id, { onDelete: 'set null' }),
  imageReference: text('image_reference'),
  imageHash: text('image_hash'),
  modelVersion: text('model_version').notNull(),
  relevanceScore: numeric('relevance_score', { precision: 4, scale: 3 }),
  predictedClass: text('predicted_class').notNull(),
  cropName: text('crop_name'),
  diseaseName: text('disease_name'),
  confidence: numeric('confidence', { precision: 4, scale: 3 }),
  uncertaintyResult: text('uncertainty_result').notNull(),
  imageQuality: jsonb('image_quality'),
  diagnoses: jsonb('diagnoses'),
  affectedAreaPercent: real('affected_area_percent'),
  severitySource: text('severity_source'),
  spreadRisk: text('spread_risk'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const fieldObservations = pgTable('field_observations', {
  id: uuid('id').primaryKey().defaultRandom(),
  fieldId: uuid('field_id')
    .references(() => fields.id, { onDelete: 'cascade' })
    .notNull(),
  zoneId: uuid('zone_id').references(() => zones.id, { onDelete: 'set null' }),
  advisoryRunId: uuid('advisory_run_id').references(() => advisoryRuns.id, {
    onDelete: 'set null',
  }),
  imageReference: text('image_reference'),
  affectedAreaPercent: real('affected_area_percent'),
  severity: text('severity'),
  severitySource: text('severity_source').notNull(),
  farmerAction: text('farmer_action'),
  outcome: text('outcome'),
  note: text('note'),
  observedAt: timestamp('observed_at').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const weatherSnapshots = pgTable('weather_snapshots', {
  id: uuid('id').primaryKey().defaultRandom(),
  fieldId: uuid('field_id').references(() => fields.id, { onDelete: 'set null' }),
  city: text('city').notNull(),
  source: text('source').notNull(),
  sourceFreshness: text('source_freshness').notNull(),
  observedAt: timestamp('observed_at'),
  fetchedAt: timestamp('fetched_at').defaultNow().notNull(),
  expiresAt: timestamp('expires_at'),
  rainProbability: real('rain_probability'),
  humidity: real('humidity'),
  windSpeed: real('wind_speed'),
  temperature: real('temperature'),
  payload: jsonb('payload'),
})

export const advisoryRuns = pgTable('advisory_runs', {
  id: uuid('id').primaryKey().defaultRandom(),
  detectionId: uuid('detection_id')
    .references(() => diseaseDetections.id, { onDelete: 'cascade' })
    .notNull(),
  weatherSnapshotId: uuid('weather_snapshot_id').references(() => weatherSnapshots.id, {
    onDelete: 'set null',
  }),
  rulesVersion: text('rules_version').notNull(),
  promptVersion: text('prompt_version'),
  model: text('model'),
  status: text('status').notNull(),
  structuredResult: jsonb('structured_result'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const advisoryActionStatus = pgTable('advisory_action_status', {
  id: uuid('id').primaryKey().defaultRandom(),
  advisoryRunId: uuid('advisory_run_id')
    .references(() => advisoryRuns.id, { onDelete: 'cascade' })
    .notNull(),
  actionId: uuid('action_id')
    .references(() => treatmentActions.id, { onDelete: 'restrict' })
    .notNull(),
  status: text('status').notNull(),
  occurredAt: timestamp('occurred_at').defaultNow().notNull(),
  note: text('note'),
})

export const futureCropPlans = pgTable('future_crop_plans', {
  id: uuid('id').primaryKey().defaultRandom(),
  fieldId: uuid('field_id')
    .references(() => fields.id, { onDelete: 'cascade' })
    .notNull(),
  sourceAdvisoryId: uuid('source_advisory_id')
    .references(() => advisoryRuns.id, { onDelete: 'restrict' })
    .notNull(),
  status: text('status').notNull(),
  candidateCrops: jsonb('candidate_crops').$type<string[]>().default([]).notNull(),
  rationale: text('rationale'),
  rulesVersion: text('rules_version').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const weatherCacheTable = pgTable('weather_cache', {
  id: uuid('id').primaryKey().defaultRandom(),
  city: text('city').notNull(),
  temperature: real('temperature').notNull(),
  humidity: real('humidity').notNull(),
  rainfallProbability: real('rainfall_probability'),
  windSpeed: real('wind_speed').notNull(),
  weatherCondition: text('weather_condition').notNull(),
  forecastJson: jsonb('forecast_json'),
  forecastTimestamp: timestamp('forecast_timestamp'),
  fetchedAt: timestamp('fetched_at').defaultNow().notNull(),
})

export const marketPrices = pgTable('market_prices', {
  id: uuid('id').primaryKey().defaultRandom(),
  crop: text('crop').notNull(),
  variety: text('variety'),
  state: text('state').notNull(),
  district: text('district').notNull(),
  mandi: text('mandi').notNull(),
  modalPrice: real('modal_price').notNull(),
  minPrice: real('min_price'),
  maxPrice: real('max_price'),
  arrivalQty: real('arrival_qty'),
  priceDate: text('price_date').notNull(),
  fetchedAt: timestamp('fetched_at').defaultNow().notNull(),
})

export const govSchemes = pgTable('gov_schemes', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  state: text('state').default('Central').notNull(),
  eligibilityRules: text('eligibility_rules').notNull(),
  requiredDocuments: jsonb('required_documents').$type<string[]>(),
  officialLink: text('official_link').notNull(),
  description: text('description').notNull(),
  category: text('category'),
  lastVerifiedDate: text('last_verified_date').notNull(),
})

export const ndviSnapshots = pgTable('ndvi_snapshots', {
  id: uuid('id').primaryKey().defaultRandom(),
  farmerId: uuid('farmer_id').references(() => farmers.id, { onDelete: 'cascade' }),
  polygonGeojson: jsonb('polygon_geojson'),
  centroidLat: real('centroid_lat').notNull(),
  centroidLng: real('centroid_lng').notNull(),
  ndviValue: real('ndvi_value').notNull(),
  cloudCover: real('cloud_cover'),
  captureDate: text('capture_date').notNull(),
  tileSource: text('tile_source'),
  fetchedAt: timestamp('fetched_at').defaultNow().notNull(),
})

export const voiceInteractions = pgTable('voice_interactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  farmerId: uuid('farmer_id').references(() => farmers.id, { onDelete: 'cascade' }),
  transcript: text('transcript').notNull(),
  languageCode: text('language_code').notNull(),
  detectedIntent: text('detected_intent'),
  responseText: text('response_text'),
  fieldContext: jsonb('field_context'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export type Farmer = typeof farmers.$inferSelect
export type NewFarmer = typeof farmers.$inferInsert
export type ChatMessage = typeof chatMessages.$inferSelect
export type AnalysisRecord = typeof analysisHistory.$inferSelect
export type Farm = typeof farms.$inferSelect
export type NewFarm = typeof farms.$inferInsert
export type Field = typeof fields.$inferSelect
export type NewField = typeof fields.$inferInsert
export type Zone = typeof zones.$inferSelect
export type NewZone = typeof zones.$inferInsert
export type Crop = typeof crops.$inferSelect
export type NewCrop = typeof crops.$inferInsert
export type CropCycle = typeof cropCycles.$inferSelect
export type NewCropCycle = typeof cropCycles.$inferInsert
export type SoilTest = typeof soilTests.$inferSelect
export type NewSoilTest = typeof soilTests.$inferInsert
export type TreatmentAction = typeof treatmentActions.$inferSelect
export type NewTreatmentAction = typeof treatmentActions.$inferInsert
export type TreatmentConstraint = typeof treatmentConstraints.$inferSelect
export type NewTreatmentConstraint = typeof treatmentConstraints.$inferInsert
export type DiseaseDetection = typeof diseaseDetections.$inferSelect
export type NewDiseaseDetection = typeof diseaseDetections.$inferInsert
export type FieldObservation = typeof fieldObservations.$inferSelect
export type NewFieldObservation = typeof fieldObservations.$inferInsert
export type WeatherSnapshot = typeof weatherSnapshots.$inferSelect
export type NewWeatherSnapshot = typeof weatherSnapshots.$inferInsert
export type AdvisoryRun = typeof advisoryRuns.$inferSelect
export type NewAdvisoryRun = typeof advisoryRuns.$inferInsert
export type AdvisoryActionStatus = typeof advisoryActionStatus.$inferSelect
export type NewAdvisoryActionStatus = typeof advisoryActionStatus.$inferInsert
export type FutureCropPlan = typeof futureCropPlans.$inferSelect
export type NewFutureCropPlan = typeof futureCropPlans.$inferInsert
export type WeatherCacheRecord = typeof weatherCacheTable.$inferSelect
export type MarketPriceRecord = typeof marketPrices.$inferSelect
export type GovSchemeRecord = typeof govSchemes.$inferSelect
export type NdviSnapshotRecord = typeof ndviSnapshots.$inferSelect
export type VoiceInteractionRecord = typeof voiceInteractions.$inferSelect
