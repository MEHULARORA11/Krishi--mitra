import { Router } from 'express'
import multer from 'multer'
import { getAuth } from '@clerk/express'
import {
  voiceTranscribeSchema,
  voiceSpeakSchema,
  voiceTranslateSchema,
  voiceChatSchema,
} from '../schemas/requestSchemas.js'
import {
  transcribeAudio,
  synthesizeSpeech,
  translateText,
  saveVoiceInteraction,
  detectIntent,
  SUPPORTED_LANGUAGES,
} from '../services/voiceService.js'
import { getChatResponse } from '../services/advisoryService.js'
import { getFarmerByClerkId } from '../services/userService.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { httpError } from '../utils/httpError.js'

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
})

export const voiceRoutes = Router()

/**
 * POST /voice/transcribe
 * Upload audio → get transcript + detected intent.
 * Body: multipart/form-data with "file" field + optional "language" field.
 */
voiceRoutes.post(
  '/voice/transcribe',
  upload.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      throw httpError(400, 'Upload an audio file in the "file" form field.')
    }

    const input = voiceTranscribeSchema.parse({
      language: req.body.language,
    })

    const result = await transcribeAudio(
      req.file.buffer,
      input.language,
      req.file.originalname,
    )

    const intent = detectIntent(result.transcript)

    // Save to DB (non-blocking)
    const { userId } = getAuth(req)
    if (userId) {
      getFarmerByClerkId(userId)
        .then((farmer) =>
          saveVoiceInteraction({
            farmerId: farmer?.id ?? null,
            transcript: result.transcript,
            languageCode: result.languageCode,
            detectedIntent: intent,
          }),
        )
        .catch((err) => console.error('[voice] Failed to save interaction:', err))
    }

    res.json({
      transcript: result.transcript,
      language: result.languageCode,
      confidence: result.confidence,
      intent,
    })
  }),
)

/**
 * POST /voice/speak
 * Send text → get audio response as base64.
 * Body: { text: string, target_language: string }
 */
voiceRoutes.post(
  '/voice/speak',
  asyncHandler(async (req, res) => {
    const input = voiceSpeakSchema.parse(req.body)
    const result = await synthesizeSpeech(input.text, input.target_language)

    res.json({
      audio: result.audioBase64,
      format: result.format,
      language: result.languageCode,
    })
  }),
)

/**
 * POST /voice/translate
 * Translate text between Indian languages.
 * Body: { text: string, source_language: string, target_language: string }
 */
voiceRoutes.post(
  '/voice/translate',
  asyncHandler(async (req, res) => {
    const input = voiceTranslateSchema.parse(req.body)
    const result = await translateText(input.text, input.source_language, input.target_language)

    res.json({
      original: input.text,
      translated: result.translatedText,
      source_language: result.sourceLanguage,
      target_language: result.targetLanguage,
    })
  }),
)

/**
 * POST /voice/chat
 * Full voice pipeline: audio in → ASR → chat → TTS → audio out.
 * Body: multipart/form-data with "file" field + optional "language" field.
 * Returns: transcript, chat response, and audio response.
 */
voiceRoutes.post(
  '/voice/chat',
  upload.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      throw httpError(400, 'Upload an audio file in the "file" form field.')
    }

    const input = voiceChatSchema.parse({
      language: req.body.language,
    })

    // Step 1: ASR — transcribe audio
    const transcription = await transcribeAudio(
      req.file.buffer,
      input.language,
      req.file.originalname,
    )

    // Step 2: Chat — send transcript to the existing chat pipeline
    const chatResult = await getChatResponse(transcription.transcript, transcription.languageCode.split('-')[0] || 'en')

    // Step 3: TTS — synthesize the chat response as audio
    const speech = await synthesizeSpeech(chatResult.response, transcription.languageCode)

    // Step 4: Intent detection
    const intent = detectIntent(transcription.transcript)

    // Save full interaction to DB (non-blocking)
    const { userId } = getAuth(req)
    if (userId) {
      getFarmerByClerkId(userId)
        .then((farmer) =>
          saveVoiceInteraction({
            farmerId: farmer?.id ?? null,
            transcript: transcription.transcript,
            languageCode: transcription.languageCode,
            detectedIntent: intent,
            responseText: chatResult.response,
            fieldContext: { timestamp: chatResult.timestamp },
          }),
        )
        .catch((err) => console.error('[voice] Failed to save interaction:', err))
    }

    res.json({
      transcript: transcription.transcript,
      language: transcription.languageCode,
      confidence: transcription.confidence,
      intent,
      chatResponse: chatResult.response,
      audio: speech.audioBase64,
      audioFormat: speech.format,
    })
  }),
)

/**
 * GET /voice/languages
 * Returns the list of supported languages for voice interactions.
 */
voiceRoutes.get('/voice/languages', (_req, res) => {
  res.json({ languages: SUPPORTED_LANGUAGES })
})
