import { Router } from 'express'
import { CLASS_NAMES, parseClassName } from '../data/classNames.js'

export const classesRoutes = Router()

classesRoutes.get('/classes', (_req, res) => {
  res.json({
    count: CLASS_NAMES.length,
    classes: CLASS_NAMES.map((raw, id) => ({
      id,
      raw,
      ...parseClassName(raw),
    })),
  })
})
