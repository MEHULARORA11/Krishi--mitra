import {
  validateAnalysisResponse,
  validateChatResponse,
} from '../../contracts/api'
import { apiClient } from './apiClient'

const fallbackTimestamp = () =>
  new Date().toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })

export const advisoryClient = {
  getFarmWorkspace: () => apiClient.get('/api/v1/farms'),

  createDemoWorkspace: async () => {
    const farm = await apiClient.postJson('/api/v1/farms', {
      name: 'My Demo Farm',
      state: 'Kerala',
      district: 'Thrissur',
    })
    const field = await apiClient.postJson('/api/v1/fields', {
      farmId: farm.id,
      name: 'Main Field',
      area: 1,
      areaUnit: 'acre',
      irrigationMethod: 'Manual entry pending',
      farmingMethod: 'Demo context',
    })
    const zone = await apiClient.postJson(`/api/v1/fields/${field.id}/zones`, {
      name: 'Zone A',
      area: 1,
      areaUnit: 'acre',
      currentCondition: 'Needs first inspection',
    })
    await apiClient.postJson(`/api/v1/fields/${field.id}/crop-cycles`, {
      cropCanonicalName: 'Tomato',
      season: 'Demo',
      stage: 'vegetative',
      zoneId: zone.id,
      category: 'vegetable',
    })
    return { farm, field, zone }
  },

  analyzeImageV1: async ({ imageFile, fieldId, zoneId, language, affectedAreaPercent }) => {
    const formData = new FormData()
    formData.append('file', imageFile, imageFile.name || 'crop-image')
    formData.append('fieldId', fieldId)
    if (zoneId) formData.append('zoneId', zoneId)
    formData.append('language', language || 'en')
    if (affectedAreaPercent !== '' && affectedAreaPercent !== null && affectedAreaPercent !== undefined) {
      formData.append('affectedAreaPercent', String(affectedAreaPercent))
    }
    return apiClient.postForm('/api/v1/analyses', formData)
  },

  addObservation: (analysisId, payload) =>
    apiClient.postJson(`/api/v1/advisories/${analysisId}/observations`, payload),

  getFieldTimeline: (fieldId, zoneId) =>
    apiClient.get(
      `/api/v1/fields/${fieldId}/timeline${zoneId ? `?zoneId=${encodeURIComponent(zoneId)}` : ''}`,
    ),

  generateResponse: async (question, language = 'en') => {
    try {
      const response = await apiClient.postJson(
        '/chat',
        { question, language },
        { validate: validateChatResponse },
      )

      return {
        response: response.response,
        timestamp: response.timestamp ?? fallbackTimestamp(),
      }
    } catch (error) {
      console.error('Advisory chat API error:', error)

      return {
        response: `Unable to reach the advisory backend. Please make sure the API server is running (npm run dev:api).

If you just started the app, wait a moment and try again.`,
        timestamp: fallbackTimestamp(),
      }
    }
  },

  analyzeImage: async (imageFile, language = 'en') => {
    try {
      if (typeof File === 'undefined' || !(imageFile instanceof File)) {
        throw new TypeError('Please choose a crop image file.')
      }

      const formData = new FormData()
      formData.append('file', imageFile, imageFile.name || 'crop-image')
      formData.append('language', language)

      const analysis = await apiClient.postForm('/analyze', formData, {
        validate: validateAnalysisResponse,
      })

      // Return the full structured object so the UI can render rich panels
      return {
        crop: analysis.crop,
        disease: analysis.disease,
        confidence: analysis.confidence,
        severity: analysis.severity,
        is_healthy: analysis.is_healthy,
        advisory_short: analysis.advisory_short,
        advisory_detail: analysis.advisory_detail ?? null,
        timestamp: fallbackTimestamp(),
      }
    } catch (error) {
      console.error('Advisory analysis API error:', error)
      throw error
    }
  },
}
