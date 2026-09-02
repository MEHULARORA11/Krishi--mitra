import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { CLASS_NAMES } from '../data/classNames.js'
import {
  getAcceptedPredictionThreshold,
  getClassNamesChecksum,
  getDiseaseModelManifest,
} from '../services/modelManifestService.js'

const modelPath = path.resolve(process.cwd(), 'server', 'model', 'model.json')

const modelJson = JSON.parse(fs.readFileSync(modelPath, 'utf8')) as {
  format: string
  generatedBy: string
  convertedBy: string
  modelTopology: {
    model_config: {
      config: {
        layers: Array<{
          class_name: string
          config: Record<string, unknown>
        }>
      }
    }
  }
}

const manifest = getDiseaseModelManifest()
const layers = modelJson.modelTopology.model_config.config.layers
const inputLayer = layers.find((layer) => layer.class_name === 'InputLayer')
assert.ok(inputLayer, 'InputLayer must exist')
assert.deepEqual(inputLayer.config.batch_shape, [null, 224, 224, 3])
assert.equal(inputLayer.config.dtype, 'float32')

const denseLayer = [...layers].reverse().find((layer) => layer.class_name === 'Dense')
assert.ok(denseLayer, 'Dense output layer must exist')
assert.equal(denseLayer.config.units, 38)
assert.equal(denseLayer.config.activation, 'softmax')

assert.equal(modelJson.format, 'layers-model')
assert.equal(manifest.artifact.generatedBy, modelJson.generatedBy)
assert.equal(manifest.artifact.convertedBy, modelJson.convertedBy)
assert.equal(manifest.input.shape[1], 224)
assert.equal(manifest.input.shape[2], 224)
assert.equal(manifest.labels.count, CLASS_NAMES.length)
assert.equal(manifest.labels.sha256, getClassNamesChecksum())
assert.equal(manifest.output.units, 38)
assert.equal(manifest.output.activation, 'softmax')
assert.equal(manifest.preprocessing.normalization.value, 'divide_by_255')
assert.equal(manifest.preprocessing.colorOrder.value, 'RGB')
assert.equal(getAcceptedPredictionThreshold(), 0.7)

console.log(
  JSON.stringify(
    {
      status: 'ok',
      manifestVersion: manifest.modelVersion,
      labelsCount: manifest.labels.count,
      labelsChecksum: manifest.labels.sha256,
      acceptedPredictionThreshold: getAcceptedPredictionThreshold(),
      note: 'Phase 5 lite model contract verified for the checked-in TF.js artifact.',
    },
    null,
    2,
  ),
)
