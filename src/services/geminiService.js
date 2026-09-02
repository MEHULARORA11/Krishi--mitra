import { advisoryClient } from '../lib/api/advisoryClient'

// Compatibility shim for existing page imports during the Phase 1 shell pass.
export const geminiService = advisoryClient
export { advisoryClient }
