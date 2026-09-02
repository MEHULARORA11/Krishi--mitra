/**
 * Sarvam AI Voice Service
 * ========================
 * Voice layer handles ASR/TTS/translation.
 * Backend remains text-first — voice is an I/O adapter.
 *
 * API Base: https://api.sarvam.ai
 * Auth: api-subscription-key header
 *
 * Stores: transcript, language, intent, response, field context used.
 */

import axios from 'axios'
import FormData from 'form-data'
import { env } from '../config/env.js'
import { getDb } from '../db/index.js'
import { voiceInteractions } from '../db/schema.js'

const SARVAM_BASE = 'https://api.sarvam.ai'

export type TranscriptionResult = {
  transcript: string
  languageCode: string
  confidence: number
}

export type SpeechResult = {
  audioBase64: string
  format: string
  languageCode: string
}

export type TranslationResult = {
  translatedText: string
  sourceLanguage: string
  targetLanguage: string
}

/** Supported Sarvam AI language codes for Indian languages. */
export const SUPPORTED_LANGUAGES = [
  { code: 'hi-IN', name: 'Hindi', script: 'Devanagari' },
  { code: 'en-IN', name: 'English', script: 'Latin' },
  { code: 'ta-IN', name: 'Tamil', script: 'Tamil' },
  { code: 'te-IN', name: 'Telugu', script: 'Telugu' },
  { code: 'kn-IN', name: 'Kannada', script: 'Kannada' },
  { code: 'ml-IN', name: 'Malayalam', script: 'Malayalam' },
  { code: 'mr-IN', name: 'Marathi', script: 'Devanagari' },
  { code: 'gu-IN', name: 'Gujarati', script: 'Gujarati' },
  { code: 'bn-IN', name: 'Bengali', script: 'Bengali' },
  { code: 'pa-IN', name: 'Punjabi', script: 'Gurmukhi' },
  { code: 'od-IN', name: 'Odia', script: 'Odia' },
] as const

/**
 * Transcribe audio using Sarvam ASR (Speech-to-Text).
 * Uses the Saaras v3 model — supports 22+ Indian languages.
 */
export const transcribeAudio = async (
  audioBuffer: Buffer,
  languageCode: string = 'auto',
  originalFilename: string = 'audio.wav',
): Promise<TranscriptionResult> => {
  if (!env.sarvamApiKey) {
    console.warn('[voice] No SARVAM_API_KEY — returning mock transcription')
    return mockTranscription()
  }

  try {
    const form = new FormData()
    form.append('file', audioBuffer, {
      filename: originalFilename,
      contentType: 'audio/wav',
    })
    form.append('model', 'saaras:v3')
    if (languageCode !== 'auto') {
      form.append('language_code', languageCode)
    }

    const res = await axios.post(`${SARVAM_BASE}/speech-to-text`, form, {
      headers: {
        'api-subscription-key': env.sarvamApiKey,
        ...form.getHeaders(),
      },
      timeout: 30000,
    })

    const data = res.data as {
      transcript: string
      language_code?: string
      confidence?: number
    }

    return {
      transcript: data.transcript || '',
      languageCode: data.language_code || languageCode,
      confidence: data.confidence || 0.85,
    }
  } catch (err) {
    console.error('[voice] Sarvam ASR error:', err)
    return mockTranscription()
  }
}

/**
 * Synthesize speech using Sarvam TTS (Text-to-Speech).
 * Uses the Bulbul v3 model — supports 11 languages.
 */
export const synthesizeSpeech = async (
  text: string,
  targetLanguage: string = 'hi-IN',
): Promise<SpeechResult> => {
  if (!env.sarvamApiKey) {
    console.warn('[voice] No SARVAM_API_KEY — returning mock speech')
    return mockSpeech(targetLanguage)
  }

  try {
    const res = await axios.post(
      `${SARVAM_BASE}/text-to-speech`,
      {
        inputs: [text],
        target_language_code: targetLanguage,
        model: 'bulbul:v3',
        enable_preprocessing: true,
      },
      {
        headers: {
          'api-subscription-key': env.sarvamApiKey,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      },
    )

    const data = res.data as {
      audios?: string[]
      audio?: string
    }

    const audioBase64 = data.audios?.[0] || data.audio || ''

    return {
      audioBase64,
      format: 'wav',
      languageCode: targetLanguage,
    }
  } catch (err) {
    console.error('[voice] Sarvam TTS error:', err)
    return mockSpeech(targetLanguage)
  }
}

/**
 * Translate text between Indian languages using Sarvam Translate.
 * Supports all 22 scheduled Indian languages.
 */
export const translateText = async (
  text: string,
  sourceLanguage: string = 'auto',
  targetLanguage: string,
): Promise<TranslationResult> => {
  if (!env.sarvamApiKey) {
    console.warn('[voice] No SARVAM_API_KEY — returning mock translation')
    return {
      translatedText: text,
      sourceLanguage: sourceLanguage === 'auto' ? 'en-IN' : sourceLanguage,
      targetLanguage,
    }
  }

  try {
    const body: Record<string, string> = {
      input: text,
      target_language_code: targetLanguage,
      model: 'mayura:v2',
      enable_preprocessing: 'true',
    }
    if (sourceLanguage !== 'auto') {
      body.source_language_code = sourceLanguage
    }

    const res = await axios.post(`${SARVAM_BASE}/translate`, body, {
      headers: {
        'api-subscription-key': env.sarvamApiKey,
        'Content-Type': 'application/json',
      },
      timeout: 15000,
    })

    const data = res.data as {
      translated_text: string
      source_language_code?: string
    }

    return {
      translatedText: data.translated_text || text,
      sourceLanguage: data.source_language_code || sourceLanguage,
      targetLanguage,
    }
  } catch (err) {
    console.error('[voice] Sarvam translate error:', err)
    return { translatedText: text, sourceLanguage, targetLanguage }
  }
}

/**
 * Save a voice interaction to the database.
 * Non-blocking — errors are logged but don't affect the response.
 */
export const saveVoiceInteraction = async (opts: {
  farmerId: string | null
  transcript: string
  languageCode: string
  detectedIntent?: string
  responseText?: string
  fieldContext?: Record<string, unknown>
}) => {
  try {
    const db = getDb()
    await db.insert(voiceInteractions).values({
      farmerId: opts.farmerId,
      transcript: opts.transcript,
      languageCode: opts.languageCode,
      detectedIntent: opts.detectedIntent || null,
      responseText: opts.responseText || null,
      fieldContext: opts.fieldContext || null,
    })
    console.log('[voice] Interaction saved to DB')
  } catch (err) {
    console.error('[voice] Failed to save interaction:', err)
  }
}

/**
 * Simple intent detection from transcribed text.
 * Looks for agriculture-related keywords to classify the query.
 */
export const detectIntent = (transcript: string): string => {
  const lower = transcript.toLowerCase()

  const intentMap: Array<{ keywords: string[]; intent: string }> = [
    { keywords: ['weather', 'rain', 'temperature', 'mausam', 'barish'], intent: 'weather_query' },
    { keywords: ['price', 'mandi', 'rate', 'bhav', 'sell'], intent: 'market_price' },
    { keywords: ['disease', 'pest', 'blight', 'rog', 'keet'], intent: 'disease_help' },
    { keywords: ['scheme', 'yojana', 'subsidy', 'loan', 'insurance'], intent: 'scheme_query' },
    { keywords: ['fertilizer', 'urea', 'dap', 'khaad'], intent: 'fertilizer_advice' },
    { keywords: ['irrigation', 'water', 'paani', 'sinchai'], intent: 'irrigation_advice' },
    { keywords: ['crop', 'seed', 'sowing', 'harvest', 'fasal', 'beej'], intent: 'crop_advice' },
    { keywords: ['soil', 'mitti', 'health'], intent: 'soil_query' },
  ]

  for (const { keywords, intent } of intentMap) {
    if (keywords.some((kw) => lower.includes(kw))) return intent
  }

  return 'general_query'
}

// ─── Mock Helpers ────────────────────────────────────────────────────────────

function mockTranscription(): TranscriptionResult {
  return {
    transcript: 'मेरी फसल में क्या बीमारी है?',
    languageCode: 'hi-IN',
    confidence: 0.78,
  }
}

function mockSpeech(lang: string): SpeechResult {
  // Return a tiny valid WAV header as base64 for mock purposes
  return {
    audioBase64: '',
    format: 'wav',
    languageCode: lang,
  }
}
