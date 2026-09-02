const normalizeBaseUrl = (value) => {
  if (typeof value !== 'string') {
    return ''
  }

  return value.replace(/\/+$/, '')
}

const toPositiveNumber = (value, fallback) => {
  const parsed = Number(value)

  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed
  }

  return fallback
}

export const clientEnv = {
  apiBaseUrl: normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL),
  apiTimeoutMs: toPositiveNumber(import.meta.env.VITE_API_TIMEOUT_MS, 15000),
  clerkPublishableKey: import.meta.env.VITE_CLERK_PUBLISHABLE_KEY ?? '',
}
