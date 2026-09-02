import cors from 'cors'
import express from 'express'
import type { RequestHandler } from 'express'
import { clerkMiddleware } from '@clerk/express'
import { env } from './config/env.js'
import { advisoryRoutes } from './routes/advisoryRoutes.js'
import { advisoryV1Routes } from './routes/advisoryV1Routes.js'
import { analyzeRoutes } from './routes/analyzeRoutes.js'
import { chatRoutes } from './routes/chatRoutes.js'
import { classesRoutes } from './routes/classesRoutes.js'
import { healthRoutes } from './routes/healthRoutes.js'
import { historyRoutes } from './routes/historyRoutes.js'
import { userRoutes } from './routes/userRoutes.js'
import { weatherRoutes } from './routes/weatherRoutes.js'
import { webhookRoutes } from './routes/webhookRoutes.js'
import { marketRoutes } from './routes/marketRoutes.js'
import { schemesRoutes } from './routes/schemesRoutes.js'
import { ndviRoutes } from './routes/ndviRoutes.js'
import { voiceRoutes } from './routes/voiceRoutes.js'
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js'

const isLocalDevelopmentOrigin = (origin: string) =>
  /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)

const isAllowedOrigin = (origin: string | undefined) =>
  !origin ||
  env.allowedOrigins.includes(origin) ||
  (!env.isProduction && isLocalDevelopmentOrigin(origin))

export const createApp = () => {
  const app = express()

  app.use(
    cors({
      origin: (origin, callback) => callback(null, isAllowedOrigin(origin)),
      credentials: true,
    }),
  )

  // Clerk webhook must be registered before express.json() because it needs the raw body.
  app.use(webhookRoutes)

  app.use(express.json({ limit: '1mb' }))

  // Only mount Clerk when both keys are configured so public routes still work in local dev.
  if (env.clerkSecretKey && env.clerkPublishableKey) {
    app.use(
      clerkMiddleware({
        publishableKey: env.clerkPublishableKey,
        secretKey: env.clerkSecretKey,
      }) as RequestHandler,
    )
  } else {
    console.warn(
      '[Clerk] CLERK_SECRET_KEY or CLERK_PUBLISHABLE_KEY not set; auth middleware disabled. ' +
        'Public routes will keep working, but protected routes will return 401 until both keys are configured.',
    )
  }

  app.use((req, _res, next) => {
    const startedAt = Date.now()
    _res.on('finish', () => {
      console.log(
        `[${new Date().toISOString()}] ${req.method} ${req.path} ${_res.statusCode} ${Date.now() - startedAt}ms`,
      )
    })
    next()
  })

  app.use(healthRoutes)
  app.use(classesRoutes)
  app.use(advisoryRoutes)
  app.use(advisoryV1Routes)
  app.use(analyzeRoutes)
  app.use(chatRoutes)
  app.use(weatherRoutes)
  app.use(userRoutes)
  app.use(historyRoutes)
  app.use(marketRoutes)
  app.use(schemesRoutes)
  app.use(ndviRoutes)
  app.use(voiceRoutes)

  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}
