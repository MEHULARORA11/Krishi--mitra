import { defineConfig } from 'drizzle-kit'
import { config } from 'dotenv'
import path from 'node:path'

// Load server/.env so DATABASE_URL is available during migrations
config({ path: path.resolve(process.cwd(), 'server', '.env'), override: true })

export default defineConfig({
  schema: './server/src/db/schema.ts',
  out: './server/src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: false,
})
