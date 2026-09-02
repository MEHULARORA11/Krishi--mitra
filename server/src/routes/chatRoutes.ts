import { Router } from 'express'
import { getAuth } from '@clerk/express'
import { chatRequestSchema } from '../schemas/requestSchemas.js'
import { getChatResponse } from '../services/advisoryService.js'
import { getFarmerByClerkId } from '../services/userService.js'
import { saveChatPair } from '../services/historyService.js'
import { asyncHandler } from '../utils/asyncHandler.js'

export const chatRoutes = Router()

chatRoutes.post(
  '/chat',
  asyncHandler(async (req, res) => {
    const input = chatRequestSchema.parse(req.body)
    const result = await getChatResponse(input.question, input.language)

    // Save to history if the user is authenticated (non-blocking)
    const { userId } = getAuth(req)
    if (userId) {
      getFarmerByClerkId(userId)
        .then((farmer) =>
          saveChatPair({
            farmerId: farmer?.id ?? null,
            question: input.question,
            answer: result.response,
            language: input.language,
          }),
        )
        .catch((err) => console.error('[chat] Failed to save history:', err))
    }

    res.json(result)
  }),
)
