import type { ErrorRequestHandler, RequestHandler } from 'express'
import multer from 'multer'
import { ZodError } from 'zod'
import { HttpError } from '../utils/httpError.js'
import { WeatherServiceError } from '../services/weatherService.js'

export const notFoundHandler: RequestHandler = (_req, res) => {
  res.status(404).json({ error: 'Route not found' })
}

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof HttpError) {
    res.status(error.statusCode).json({ error: error.message })
    return
  }

  if (error instanceof WeatherServiceError) {
    res.status(error.statusCode).json({
      error: error.message,
      code: error.code,
      provider: 'weatherapi',
    })
    return
  }

  if (error instanceof ZodError) {
    res.status(400).json({
      error: 'Invalid request body',
      details: error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    })
    return
  }

  if (error instanceof multer.MulterError) {
    const statusCode = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400
    res.status(statusCode).json({ error: error.message })
    return
  }

  console.error(error)
  res.status(500).json({ error: 'Internal server error' })
}
