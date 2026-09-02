import { clientEnv } from '../env/clientEnv'

let tokenGetter = null

export class ApiClientError extends Error {
  constructor(message, details = {}) {
    super(message)
    this.name = 'ApiClientError'
    this.status = details.status ?? null
    this.path = details.path ?? null
    this.body = details.body
    this.cause = details.cause
  }
}

export const isApiClientError = (value) => value instanceof ApiClientError

export const setTokenGetter = (getter) => {
  tokenGetter = typeof getter === 'function' ? getter : null
}

const readAuthHeaders = async () => {
  if (!tokenGetter) {
    return {}
  }

  try {
    const token = await tokenGetter()
    return token ? { Authorization: `Bearer ${token}` } : {}
  } catch {
    return {}
  }
}

const parseBody = async (response) => {
  const contentType = response.headers.get('content-type') || ''

  if (contentType.includes('application/json')) {
    return response.json()
  }

  if (contentType.includes('text/')) {
    return response.text()
  }

  if (response.status === 204) {
    return null
  }

  return response.text()
}

const extractMessage = (body, fallback) => {
  if (typeof body === 'string' && body.trim()) {
    return body
  }

  if (body && typeof body === 'object') {
    if (typeof body.error === 'string' && body.error.trim()) {
      return body.error
    }

    if (typeof body.message === 'string' && body.message.trim()) {
      return body.message
    }
  }

  return fallback
}

const normalizeOptions = (options) => {
  if (typeof options === 'function') {
    return { validate: options }
  }

  return options ?? {}
}

const withTimeoutSignal = (signal, timeoutMs) => {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => {
    controller.abort(new Error('Request timed out'))
  }, timeoutMs)

  const abortFromParent = () => controller.abort(signal.reason)

  if (signal) {
    if (signal.aborted) {
      abortFromParent()
    } else {
      signal.addEventListener('abort', abortFromParent, { once: true })
    }
  }

  return {
    signal: controller.signal,
    cleanup: () => {
      clearTimeout(timeoutId)

      if (signal) {
        signal.removeEventListener('abort', abortFromParent)
      }
    },
  }
}

const request = async (path, options) => {
  const requestOptions = normalizeOptions(options)
  const {
    body,
    headers = {},
    method = 'GET',
    signal,
    timeoutMs = clientEnv.apiTimeoutMs,
    validate,
  } = requestOptions

  const { signal: mergedSignal, cleanup } = withTimeoutSignal(signal, timeoutMs)

  try {
    const response = await fetch(`${clientEnv.apiBaseUrl}${path}`, {
      method,
      body,
      headers: {
        ...(await readAuthHeaders()),
        ...headers,
      },
      signal: mergedSignal,
    })

    const parsedBody = await parseBody(response)

    if (!response.ok) {
      throw new ApiClientError(
        extractMessage(parsedBody, `Request failed with status ${response.status}.`),
        {
          status: response.status,
          path,
          body: parsedBody,
        },
      )
    }

    return typeof validate === 'function' ? validate(parsedBody) : parsedBody
  } catch (error) {
    if (error instanceof ApiClientError) {
      throw error
    }

    if (error?.name === 'AbortError') {
      throw new ApiClientError(
        'The request timed out before the server responded.',
        {
          path,
          cause: error,
        },
      )
    }

    throw new ApiClientError('Unable to reach the API service.', {
      path,
      cause: error,
    })
  } finally {
    cleanup()
  }
}

export const apiClient = {
  get: (path, options) =>
    request(path, { ...normalizeOptions(options), method: 'GET' }),

  postJson: (path, payload, options) => {
    const requestOptions = normalizeOptions(options)

    return request(path, {
      ...requestOptions,
      method: 'POST',
      body: JSON.stringify(payload),
      headers: {
        'Content-Type': 'application/json',
        ...(requestOptions.headers ?? {}),
      },
    })
  },

  postForm: (path, formData, options) =>
    request(path, {
      ...normalizeOptions(options),
      method: 'POST',
      body: formData,
    }),

  patch: (path, payload, options) => {
    const requestOptions = normalizeOptions(options)

    return request(path, {
      ...requestOptions,
      method: 'PATCH',
      body: JSON.stringify(payload),
      headers: {
        'Content-Type': 'application/json',
        ...(requestOptions.headers ?? {}),
      },
    })
  },
}
