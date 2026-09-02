const invariant = (condition, message) => {
  if (!condition) {
    throw new Error(message)
  }
}

const isObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

const readString = (value, label) => {
  invariant(
    typeof value === 'string' && value.trim().length > 0,
    `${label} must be a non-empty string.`,
  )
  return value
}

const readOptionalString = (value, label) => {
  if (value === undefined || value === null || value === '') {
    return null
  }

  return readString(value, label)
}

const readNumber = (value, label) => {
  invariant(
    typeof value === 'number' && Number.isFinite(value),
    `${label} must be a finite number.`,
  )
  return value
}

const readBoolean = (value, label) => {
  invariant(typeof value === 'boolean', `${label} must be a boolean.`)
  return value
}

export const validateChatResponse = (value) => {
  invariant(isObject(value), 'Chat response must be an object.')

  return {
    response: readString(value.response, 'Chat response text'),
    timestamp: readOptionalString(value.timestamp, 'Chat response timestamp'),
  }
}

export const validateAnalysisResponse = (value) => {
  invariant(isObject(value), 'Analysis response must be an object.')

  return {
    raw_class: readOptionalString(value.raw_class, 'Analysis raw class'),
    crop: readString(value.crop, 'Analysis crop'),
    disease: readString(value.disease, 'Analysis disease'),
    confidence: readNumber(value.confidence, 'Analysis confidence'),
    severity: readString(value.severity, 'Analysis severity'),
    advisory_short: readString(value.advisory_short, 'Analysis advisory'),
    advisory_detail: readOptionalString(value.advisory_detail, 'Analysis detail'),
    is_healthy: readBoolean(value.is_healthy, 'Analysis healthy flag'),
  }
}
