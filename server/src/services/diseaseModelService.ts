/**
 * Disease model service
 * =====================
 * Handles plant disease prediction from an uploaded image using the checked-in
 * TensorFlow.js model artifact in `server/model/`.
 */

import fs from 'node:fs'
import path from 'node:path'
import { CLASS_NAMES, parseClassName } from '../data/classNames.js'
import { env } from '../config/env.js'
import { getDiseaseModelManifest } from './modelManifestService.js'
import { httpError } from '../utils/httpError.js'

export type DiseasePrediction = {
  rawClass: string
  confidence: number
  crop: string
  disease: string
  healthy: boolean
  alternatives: Array<{
    rawClass: string
    confidence: number
    crop: string
    disease: string
    healthy: boolean
  }>
  imageQuality: {
    status: 'usable' | 'needs_retake'
    brightness: number
    contrast: number
    sharpness: number
    reasons: string[]
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _model: any = null
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _tf: any = null

async function loadTensorflow() {
  if (_tf) return _tf

  try {
    const nativeModule = await import('@tensorflow/tfjs-node')
    _tf = nativeModule.default ?? nativeModule
    console.log('[model] Using TensorFlow.js native runtime')
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    console.warn(
      `[model] Native TensorFlow runtime unavailable; continuing with CPU inference (${reason.split('\n')[0]}).`,
    )
    const cpuModule = await import('@tensorflow/tfjs')
    _tf = cpuModule.default ?? cpuModule
    _tf.enableProdMode?.()
    await _tf.setBackend('cpu')
    await _tf.ready()
    console.log('[model] Using TensorFlow.js CPU fallback runtime')
  }

  return _tf
}

async function loadModelFromShards(modelPath: string, tf: any) {
  const modelJson = JSON.parse(
    fs.readFileSync(path.join(modelPath, 'model.json'), 'utf8'),
  ) as {
    modelTopology: Record<string, unknown>
    weightsManifest: Array<{
      paths: string[]
      weights: Array<{ name: string; shape: number[]; dtype: string }>
    }>
  }

  const weightSpecs = modelJson.weightsManifest.flatMap((group) => group.weights)
  // Keras 3 serializes symbolic connections as `__keras_tensor__` objects,
  // while tfjs-layers expects the older `[layer, node, tensor, kwargs]` form.
  // Normalize that representation before handing the artifact to tfjs.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const topology: any = modelJson.modelTopology
  const layers = topology.model_config?.config?.layers ?? []

  for (const layer of layers) {
    if (!Array.isArray(layer.inbound_nodes)) continue

    layer.inbound_nodes = layer.inbound_nodes.map((node: any) => {
      if (Array.isArray(node)) return node

      const args = Array.isArray(node.args) ? node.args : []
      const inputs = args.length === 1 && Array.isArray(args[0]) ? args[0] : args
      const kwargs = node.kwargs ?? {}

      return inputs.map((input: any) => {
        const history = input?.config?.keras_history
        if (!Array.isArray(history) || history.length < 3) {
          throw new Error(`Unsupported Keras symbolic input in layer ${layer.name}`)
        }
        return [history[0], history[1], history[2], kwargs]
      })
    })
  }

  const modelConfig = topology.model_config?.config
  for (const key of ['input_layers', 'output_layers']) {
    const value = modelConfig?.[key]
    if (Array.isArray(value) && value.length === 3 && !Array.isArray(value[0])) {
      modelConfig[key] = [value]
    }
  }

  const inputLayer = topology.model_config?.config?.layers?.find(
    (layer: any) => layer.class_name === 'InputLayer',
  )

  // Keras 3 emits `batch_shape`; tfjs-layers expects the equivalent
  // `batch_input_shape` after its Python-to-TypeScript key conversion.
  if (inputLayer?.config?.batch_shape && !inputLayer.config.batch_input_shape) {
    inputLayer.config.batch_input_shape = inputLayer.config.batch_shape
    delete inputLayer.config.batch_shape
  }

  const shardBuffers = modelJson.weightsManifest
    .flatMap((group) => group.paths)
    .map((weightPath) => fs.readFileSync(path.join(modelPath, weightPath)))
  const totalBytes = shardBuffers.reduce((total, buffer) => total + buffer.byteLength, 0)
  const weightData = new Uint8Array(totalBytes)
  let offset = 0

  for (const buffer of shardBuffers) {
    weightData.set(buffer, offset)
    offset += buffer.byteLength
  }

  const model = await tf.loadLayersModel(
    tf.io.fromMemory({ modelTopology: topology }),
  )
  const decodedWeights = tf.io.decodeWeights(weightData.buffer, weightSpecs)
  const targetNames = new Set(model.weights.map((weight: any) => weight.originalName))
  const remappedWeights: Record<string, any> = {}

  for (const spec of weightSpecs) {
    const candidates = [
      spec.name,
      spec.name.endsWith('/kernel')
        ? `${spec.name.slice(0, -'/kernel'.length)}/depthwise_kernel`
        : null,
    ].filter(Boolean) as string[]
    const targetName = candidates.find((name) => targetNames.has(name))

    if (targetName) {
      remappedWeights[targetName] = decodedWeights[spec.name]
    }
  }

  model.loadWeights(remappedWeights, false)
  return model
}

async function loadModel() {
  if (_model) return _model as typeof _model

  const modelPath = path.resolve(process.cwd(), env.modelPath)

  if (!fs.existsSync(modelPath)) {
    throw httpError(
      503,
      `ML model not found at "${env.modelPath}". Convert the Keras model first and keep MODEL_PATH pointed at the TF.js model directory.`,
    )
  }

  try {
    const tf = await loadTensorflow()
    console.log(`[model] Loading TF.js model from ${env.modelPath} …`)
    _model = await loadModelFromShards(modelPath, tf)
    console.log('[model] Model loaded ✓')
    return _model
  } catch (err) {
    console.error('[model] Failed to load model artifact:', err)
    throw httpError(
      500,
      `Failed to load TF.js model: ${err instanceof Error ? err.message : String(err)}. Check the TensorFlow.js runtime and the model directory.`,
    )
  }
}

const estimateSharpness = (pixels: Buffer, width: number, height: number) => {
  if (width < 3 || height < 3) return 0
  let sum = 0
  let sumSquares = 0
  let count = 0
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const index = y * width + x
      const laplacian =
        -4 * pixels[index] + pixels[index - 1] + pixels[index + 1] + pixels[index - width] + pixels[index + width]
      sum += laplacian
      sumSquares += laplacian * laplacian
      count += 1
    }
  }
  if (!count) return 0
  const mean = sum / count
  return Math.max(0, sumSquares / count - mean * mean)
}

async function inspectImageQuality(buffer: Buffer) {
  const sharp = (await import('sharp')).default
  const metadata = await sharp(buffer).metadata()
  if (!metadata.width || !metadata.height) {
    throw httpError(422, 'The uploaded image could not be decoded.')
  }

  const { data, info } = await sharp(buffer)
    .resize(96, 96, { fit: 'inside', withoutEnlargement: true })
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const pixels = data as Buffer
  const brightness = pixels.reduce((sum, value) => sum + value, 0) / Math.max(pixels.length, 1)
  const contrast = Math.sqrt(
    pixels.reduce((sum, value) => sum + (value - brightness) ** 2, 0) /
      Math.max(pixels.length, 1),
  )
  const sharpness = estimateSharpness(pixels, info.width, info.height)
  const reasons: string[] = []
  if (metadata.width < 96 || metadata.height < 96) reasons.push('image_too_small')
  if (brightness < 38) reasons.push('image_too_dark')
  if (brightness > 235) reasons.push('image_overexposed')
  if (contrast < 16) reasons.push('image_low_contrast')
  if (sharpness < 12) reasons.push('image_blurry')

  return {
    status: reasons.length ? ('needs_retake' as const) : ('usable' as const),
    brightness: Math.round(brightness * 10) / 10,
    contrast: Math.round(contrast * 10) / 10,
    sharpness: Math.round(sharpness * 10) / 10,
    reasons,
  }
}

async function preprocessImage(buffer: Buffer) {
  const manifest = getDiseaseModelManifest()
  const sharp = (await import('sharp')).default
  const { data, info } = await sharp(buffer)
    .resize(manifest.preprocessing.resize.width, manifest.preprocessing.resize.height, {
      fit: 'fill',
    })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  if (info.channels !== 3) {
    throw httpError(422, 'Image must be RGB. Please upload a JPEG or PNG.')
  }

  const tf = await loadTensorflow()
  const floats = new Float32Array(data.length)
  for (let i = 0; i < data.length; i++) floats[i] = data[i] / 255.0
  return tf.tensor4d(floats, [1, 224, 224, 3])
}

export const predictDisease = async (file: Express.Multer.File): Promise<DiseasePrediction> => {
  if (!file.mimetype.startsWith('image/')) {
    throw httpError(400, 'File must be an image, such as JPEG or PNG.')
  }

  const imageQuality = await inspectImageQuality(file.buffer)
  const model = await loadModel()
  const tensor = await preprocessImage(file.buffer)

  try {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const predictions = model.predict(tensor)
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const scores: Float32Array = predictions.dataSync()
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    predictions.dispose()

    const rankedIndexes = [...scores.keys()].sort((left, right) => scores[right] - scores[left])
    const [maxIdx] = rankedIndexes
    const maxScore = scores[maxIdx]

    const rawClass = CLASS_NAMES[maxIdx]
    const { crop, disease, healthy } = parseClassName(rawClass)
    console.log(`[model] Predicted: ${rawClass} (${(maxScore * 100).toFixed(1)}%)`)

    const alternatives = rankedIndexes.slice(0, 3).map((index) => {
      const candidate = parseClassName(CLASS_NAMES[index])
      return {
        rawClass: CLASS_NAMES[index],
        confidence: scores[index],
        crop: candidate.crop,
        disease: candidate.disease,
        healthy: candidate.healthy,
      }
    })

    return { rawClass, confidence: maxScore, crop, disease, healthy, alternatives, imageQuality }
  } finally {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    tensor.dispose()
  }
}
