import { Router } from 'express'
import { env } from '../config/env.js'

export const healthRoutes = Router()

healthRoutes.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    model_path: env.modelPath,
    runtime: 'typescript',
  })
})
