/**
 * Generic in-memory TTL cache.
 * Prevents hammering external APIs on rapid requests.
 *
 * Usage:
 *   const cache = new TtlCache()
 *   cache.set('weather:Thrissur', data, 600)  // 10 min
 *   const hit = cache.get<WeatherData>('weather:Thrissur')
 */

type CacheEntry<T> = {
  value: T
  expiresAt: number
}

export class TtlCache {
  private store = new Map<string, CacheEntry<unknown>>()

  /** Get a cached value, or null if missing/expired. */
  get<T>(key: string): T | null {
    const entry = this.store.get(key)
    if (!entry) return null
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key)
      return null
    }
    return entry.value as T
  }

  /** Set a value with a TTL in seconds. */
  set<T>(key: string, value: T, ttlSeconds: number): void {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    })
  }

  /** Remove a specific key. */
  invalidate(key: string): void {
    this.store.delete(key)
  }

  /** Remove all entries whose keys start with the given prefix. */
  invalidatePrefix(prefix: string): void {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) this.store.delete(key)
    }
  }

  /** Remove all expired entries (housekeeping). */
  prune(): void {
    const now = Date.now()
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.expiresAt) this.store.delete(key)
    }
  }
}

/** Shared singleton caches for each integration. */
export const weatherCache = new TtlCache()
export const marketCache = new TtlCache()
export const ndviCache = new TtlCache()
