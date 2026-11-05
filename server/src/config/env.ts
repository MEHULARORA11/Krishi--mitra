import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'

const __filename = fileURLToPath(import.meta.url)
const repoRoot = path.resolve(path.dirname(__filename), '..', '..', '..')

dotenv.config({ path: path.resolve(repoRoot, '.env') })
dotenv.config({ path: path.resolve(repoRoot, 'server', '.env'), override: true })

const parseOrigins = (value: string | undefined) => {
  const origins = value?.split(',').map((origin) => origin.trim()).filter(Boolean)
  return origins?.length ? origins : ['http://localhost:5173', 'http://localhost:3000']
}

export const env = {
  isProduction: process.env.NODE_ENV === 'production',
  port: Number(process.env.PORT || process.env.API_PORT || 8000),
  allowedOrigins: parseOrigins(process.env.ALLOWED_ORIGINS),
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  openaiModel: process.env.OPENAI_MODEL || '',
  openaiTimeoutMs: Number(process.env.OPENAI_TIMEOUT_MS || 10000),
  weatherProvider: (process.env.WEATHER_PROVIDER || 'weatherapi').toLowerCase(),
  weatherApiKey: process.env.WEATHER_API_KEY || '',
  weatherForecastDays: Math.min(14, Math.max(1, Number(process.env.WEATHER_FORECAST_DAYS || 3))),
  weatherRequestTimeoutMs: Math.max(1000, Number(process.env.WEATHER_REQUEST_TIMEOUT_MS || 8000)),
  weatherCacheTtlMinutes: Math.max(1, Number(process.env.WEATHER_CACHE_TTL_MINUTES || 10)),
  weatherAlertsEnabled: process.env.WEATHER_ALERTS_ENABLED !== 'false',
  modelPath: process.env.MODEL_PATH || 'server/model',
  clerkPublishableKey: process.env.CLERK_PUBLISHABLE_KEY || process.env.VITE_CLERK_PUBLISHABLE_KEY || '',
  clerkSecretKey: process.env.CLERK_SECRET_KEY || '',
  clerkWebhookSecret: process.env.CLERK_WEBHOOK_SECRET || '',
  databaseUrl: process.env.DATABASE_URL || '',
  sarvamApiKey: process.env.SARVAM_API_KEY || '',
  sentinelClientId: process.env.SENTINEL_CLIENT_ID || '',
  sentinelClientSecret: process.env.SENTINEL_CLIENT_SECRET || '',
  dataGovApiKey: process.env.DATA_GOV_API_KEY || '',
  agromonitoringApiKey: process.env.AGROMONITORING_API_KEY || '',
}
