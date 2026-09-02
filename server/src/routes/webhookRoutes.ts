import { Router } from 'express'
import { Webhook } from 'svix'
import { env } from '../config/env.js'
import { upsertFarmer, deleteFarmerByClerkId } from '../services/userService.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { httpError } from '../utils/httpError.js'

export const webhookRoutes = Router()

type ClerkUserEvent = {
  type: 'user.created' | 'user.updated' | 'user.deleted'
  data: {
    id: string
    email_addresses: Array<{ email_address: string; id: string }>
    primary_email_address_id: string
    first_name: string | null
    last_name: string | null
  }
}

/**
 * POST /webhooks/clerk
 * Receives Clerk webhook events and keeps the `farmers` table in sync.
 * Must be registered BEFORE express.json() because svix needs the raw body.
 *
 * Setup in Clerk Dashboard → Webhooks:
 *   Endpoint URL: https://your-domain.com/webhooks/clerk
 *   Events: user.created, user.updated, user.deleted
 */
webhookRoutes.post(
  '/webhooks/clerk',
  asyncHandler(async (req, res) => {
    if (!env.clerkWebhookSecret) {
      console.warn('[webhook] CLERK_WEBHOOK_SECRET not set — skipping verification')
      res.json({ received: true })
      return
    }

    const svixId = req.headers['svix-id'] as string
    const svixTimestamp = req.headers['svix-timestamp'] as string
    const svixSignature = req.headers['svix-signature'] as string

    if (!svixId || !svixTimestamp || !svixSignature) {
      throw httpError(400, 'Missing Svix webhook headers.')
    }

    const wh = new Webhook(env.clerkWebhookSecret)
    let event: ClerkUserEvent

    try {
      // req.body is the raw buffer when this route is registered before express.json()
      const rawBody = JSON.stringify(req.body)
      event = wh.verify(rawBody, {
        'svix-id': svixId,
        'svix-timestamp': svixTimestamp,
        'svix-signature': svixSignature,
      }) as ClerkUserEvent
    } catch {
      throw httpError(400, 'Invalid webhook signature.')
    }

    const { type, data } = event
    const primaryEmail = data.email_addresses.find(
      (e) => e.id === data.primary_email_address_id,
    )?.email_address

    if (type === 'user.created' || type === 'user.updated') {
      if (!primaryEmail) {
        throw httpError(400, 'No primary email in Clerk event.')
      }
      const name = [data.first_name, data.last_name].filter(Boolean).join(' ') || null
      await upsertFarmer({ clerkUserId: data.id, email: primaryEmail, name })
      console.log(`[webhook] ${type}: synced farmer ${data.id}`)
    }

    if (type === 'user.deleted') {
      await deleteFarmerByClerkId(data.id)
      console.log(`[webhook] user.deleted: removed farmer ${data.id}`)
    }

    res.json({ received: true })
  }),
)
