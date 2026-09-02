import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { z } from 'zod'
import { CLASS_NAMES } from '../data/classNames.js'

const manifestSchema = z.object({
  schemaVersion: z.string(),
  status: z.string(),
  auditDate: z.string(),
  modelVersion: z.string(),
  artifact: z.object({
    path: z.string(),
    format: z.string(),
    generatedBy: z.string(),
    convertedBy: z.string(),
  }),
  input: z.object({
    shape: z.array(z.number()),
    dtype: z.string(),
  }),
  preprocessing: z.object({
    resize: z.object({
      width: z.number(),
      height: z.number(),
      fit: z.string(),
    }),
    colorOrder: z.object({
      value: z.string(),
      status: z.string(),
    }),
    alphaHandling: z.string(),
    normalization: z.object({
      value: z.string(),
      inputRange: z.array(z.number()),
      outputRange: z.array(z.number()),
      status: z.string(),
    }),
  }),
  labels: z.object({
    source: z.string(),
    count: z.number(),
    sha256: z.string(),
    status: z.string(),
  }),
  output: z.object({
    units: z.number(),
    activation: z.string(),
    confidenceUnit: z.string(),
  }),
  thresholds: z.object({
    acceptedPredictionMinimum: z.object({
      value: z.number(),
      status: z.string(),
    }),
    unknownTop1Top2MarginMinimum: z.object({
      value: z.number(),
      status: z.string(),
    }),
  }),
  unknownBehavior: z.object({
    returnUncertainty: z.string(),
    returnDiagnosisFields: z.object({
      crop: z.string().nullable(),
      disease: z.string().nullable(),
    }),
    approvedActionsPolicy: z.string(),
    chemicalAdviceAllowed: z.boolean(),
  }),
  lowConfidenceBehavior: z.object({
    returnUncertainty: z.string(),
    returnDiagnosisFields: z.object({
      crop: z.string().nullable(),
      disease: z.string().nullable(),
    }),
    approvedActionsPolicy: z.string(),
    chemicalAdviceAllowed: z.boolean(),
  }),
  unsupportedImageBehavior: z.object({
    returnRelevance: z.string(),
    returnUncertainty: z.string(),
    approvedActionsPolicy: z.string(),
    chemicalAdviceAllowed: z.boolean(),
  }),
  integrationNotes: z.object({
    backendModelSelection: z.string(),
    loaderRequirement: z.string(),
    validationStatus: z.string(),
  }),
})

export type DiseaseModelManifest = z.infer<typeof manifestSchema>

let manifestSingleton: DiseaseModelManifest | null = null

const manifestPath = path.resolve(process.cwd(), 'server', 'model', 'disease-model.manifest.json')

export const getDiseaseModelManifest = () => {
  if (manifestSingleton) return manifestSingleton

  const raw = fs.readFileSync(manifestPath, 'utf8')
  manifestSingleton = manifestSchema.parse(JSON.parse(raw))
  return manifestSingleton
}

export const getAcceptedPredictionThreshold = () =>
  getDiseaseModelManifest().thresholds.acceptedPredictionMinimum.value

export const getClassNamesChecksum = () =>
  crypto.createHash('sha256').update(CLASS_NAMES.join('\n')).digest('hex')

export const getDiseaseModelManifestPath = () => manifestPath
