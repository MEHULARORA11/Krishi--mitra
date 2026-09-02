import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { env } from '../config/env.js'
import * as schema from './schema.js'

const createDb = () => {
  if (!env.databaseUrl) {
    throw new Error(
      'DATABASE_URL is not set in server/.env. ' +
        'Create a Neon project at https://console.neon.tech and paste the connection string.',
    )
  }
  const sql = neon(env.databaseUrl)
  return drizzle(sql, { schema })
}

let _db: ReturnType<typeof createDb> | null = null

export const getDb = () => {
  if (!_db) _db = createDb()
  return _db
}

export type Db = ReturnType<typeof getDb>
