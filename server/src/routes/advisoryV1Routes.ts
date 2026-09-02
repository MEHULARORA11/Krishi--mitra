import { Router } from 'express'
import multer from 'multer'
import { getAuth } from '@clerk/express'
import { z } from 'zod'
import { groundedAdvisoryPacketSchema } from '../domain/advisory/contracts.js'
import { requireAuth } from '../middleware/auth.js'
import {
  addAdvisoryActionStatusV1,
  advisoryV1StatusValues,
  addFieldObservationV1,
  addCropCycleV1,
  addSoilTestV1,
  createFarmV1,
  createFieldV1,
  createFuturePlanV1,
  createGroundedAnalysisV1,
  createZoneV1,
  getFieldTimelineV1,
  getAnalysisByIdV1,
  listFarmerFarmsV1,
} from '../services/advisoryV1OrchestrationService.js'
import { buildAdvisoryApiV1Response } from '../services/advisoryService.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { httpError } from '../utils/httpError.js'

export const advisoryV1Routes = Router()

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
})

const createFieldSchema = z.object({
  farmId: z.string().uuid(),
  name: z.string().min(1),
  area: z.coerce.number().positive(),
  areaUnit: z.string().min(1),
  coarseCentroidLat: z.coerce.number().min(-90).max(90).optional().nullable(),
  coarseCentroidLng: z.coerce.number().min(-180).max(180).optional().nullable(),
  irrigationMethod: z.string().min(1).optional().nullable(),
  farmingMethod: z.string().min(1).optional().nullable(),
  status: z.string().min(1).optional(),
})

const createFarmSchema = z.object({
  name: z.string().min(1),
  village: z.string().min(1).optional().nullable(),
  state: z.string().min(1),
  district: z.string().min(1),
})

const createZoneSchema = z.object({
  name: z.string().min(1),
  area: z.coerce.number().positive().optional().nullable(),
  areaUnit: z.string().min(1).optional().nullable(),
  coarseCentroidLat: z.coerce.number().min(-90).max(90).optional().nullable(),
  coarseCentroidLng: z.coerce.number().min(-180).max(180).optional().nullable(),
  currentCondition: z.string().min(1).optional().nullable(),
  status: z.string().min(1).optional(),
})

const createCropCycleSchema = z.object({
  cropCanonicalName: z.string().min(1),
  variety: z.string().optional().nullable(),
  season: z.string().min(1),
  sowingDate: z.string().datetime({ offset: true }).optional().nullable(),
  stage: z.string().min(1),
  status: z.string().min(1).optional(),
  category: z.string().min(1).optional(),
  zoneId: z.string().uuid().optional().nullable(),
})

const createSoilTestSchema = z.object({
  sampledAt: z.string().datetime({ offset: true }).optional().nullable(),
  ph: z.coerce.number().min(0).max(14).optional().nullable(),
  nitrogen: z.coerce.number().optional().nullable(),
  phosphorus: z.coerce.number().optional().nullable(),
  potassium: z.coerce.number().optional().nullable(),
  organicCarbon: z.coerce.number().optional().nullable(),
  summary: z.string().optional().nullable(),
  source: z.string().optional(),
  sourceFreshness: z.string().optional(),
  attachmentRef: z.string().optional().nullable(),
})

const createAnalysisSchema = z.object({
  fieldId: z.string().uuid(),
  zoneId: z.string().uuid().optional().nullable(),
  language: z.enum(['en', 'hi', 'ml']).optional(),
  affectedAreaPercent: z.coerce.number().min(0).max(100).optional().nullable(),
})

const advisoryActionStatusSchema = z.object({
  actionId: z.string().uuid(),
  status: z.enum(advisoryV1StatusValues),
  note: z.string().optional().nullable(),
})

const futurePlanSchema = z.object({
  note: z.string().optional().nullable(),
})

const fieldObservationSchema = z.object({
  affectedAreaPercent: z.coerce.number().min(0).max(100).optional().nullable(),
  severity: z.enum(['low', 'medium', 'high']).optional().nullable(),
  farmerAction: z.string().min(1).optional().nullable(),
  outcome: z.string().min(1).optional().nullable(),
  note: z.string().min(1).optional().nullable(),
})

const advisoryIdParamSchema = z.object({
  id: z.string().uuid(),
})

advisoryV1Routes.post(
  '/api/v1/advisory',
  asyncHandler(async (req, res) => {
    const packet = groundedAdvisoryPacketSchema.parse(req.body)
    const response = await buildAdvisoryApiV1Response(packet)
    res.json(response)
  }),
)

advisoryV1Routes.get(
  '/api/v1/farms',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { userId } = getAuth(req)
    const response = await listFarmerFarmsV1(userId!)
    res.json(response)
  }),
)

advisoryV1Routes.post(
  '/api/v1/farms',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { userId } = getAuth(req)
    const input = createFarmSchema.parse(req.body)
    const farm = await createFarmV1(userId!, input)
    res.status(201).json(farm)
  }),
)

advisoryV1Routes.post(
  '/api/v1/fields',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { userId } = getAuth(req)
    const input = createFieldSchema.parse(req.body)
    const field = await createFieldV1(userId!, input)
    res.status(201).json(field)
  }),
)

advisoryV1Routes.post(
  '/api/v1/fields/:id/zones',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { userId } = getAuth(req)
    const { id } = advisoryIdParamSchema.parse(req.params)
    const input = createZoneSchema.parse(req.body)
    const zone = await createZoneV1(userId!, id, input)
    res.status(201).json(zone)
  }),
)

advisoryV1Routes.post(
  '/api/v1/fields/:id/crop-cycles',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { userId } = getAuth(req)
    const { id } = advisoryIdParamSchema.parse(req.params)
    const input = createCropCycleSchema.parse(req.body)
    const cropCycle = await addCropCycleV1(userId!, id, input)
    res.status(201).json(cropCycle)
  }),
)

advisoryV1Routes.post(
  '/api/v1/fields/:id/soil-tests',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { userId } = getAuth(req)
    const { id } = advisoryIdParamSchema.parse(req.params)
    const input = createSoilTestSchema.parse(req.body)
    const soilTest = await addSoilTestV1(userId!, id, input)
    res.status(201).json(soilTest)
  }),
)

advisoryV1Routes.post(
  '/api/v1/analyses',
  requireAuth,
  upload.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      throw httpError(400, 'Upload an image file in the "file" form field.')
    }

    const { userId } = getAuth(req)
    const input = createAnalysisSchema.parse(req.body)
    const result = await createGroundedAnalysisV1(userId!, {
      fieldId: input.fieldId,
      zoneId: input.zoneId,
      language: input.language,
      affectedAreaPercent: input.affectedAreaPercent,
      file: req.file,
    })
    res.status(201).json(result)
  }),
)

advisoryV1Routes.get(
  '/api/v1/fields/:id/timeline',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { userId } = getAuth(req)
    const { id } = advisoryIdParamSchema.parse(req.params)
    const zoneId = typeof req.query.zoneId === 'string' ? z.string().uuid().parse(req.query.zoneId) : undefined
    const timeline = await getFieldTimelineV1(userId!, id, zoneId)
    res.json(timeline)
  }),
)

advisoryV1Routes.get(
  '/api/v1/analyses/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { userId } = getAuth(req)
    const { id } = advisoryIdParamSchema.parse(req.params)
    const result = await getAnalysisByIdV1(userId!, id)
    res.json(result)
  }),
)

advisoryV1Routes.post(
  '/api/v1/advisories/:id/action-status',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { userId } = getAuth(req)
    const { id } = advisoryIdParamSchema.parse(req.params)
    const input = advisoryActionStatusSchema.parse(req.body)
    const status = await addAdvisoryActionStatusV1(userId!, id, input)
    res.status(201).json(status)
  }),
)

advisoryV1Routes.post(
  '/api/v1/advisories/:id/observations',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { userId } = getAuth(req)
    const { id } = advisoryIdParamSchema.parse(req.params)
    const input = fieldObservationSchema.parse(req.body)
    const observation = await addFieldObservationV1(userId!, id, input)
    res.status(201).json(observation)
  }),
)

advisoryV1Routes.post(
  '/api/v1/advisories/:id/future-plan',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { userId } = getAuth(req)
    const { id } = advisoryIdParamSchema.parse(req.params)
    const input = futurePlanSchema.parse(req.body ?? {})
    const plan = await createFuturePlanV1(userId!, id, input)
    res.status(201).json(plan)
  }),
)
