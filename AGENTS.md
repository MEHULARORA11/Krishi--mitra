# KrishiMitra Agent and Contributor Guide

This repository follows `PHASED_IMPLEMENTATION_PLAN.md`. Treat that plan as the execution baseline unless the project lead updates it.

## Current Execution Rules

- Keep React 18 + Vite as the only frontend.
- Keep Express as the only backend.
- During Phase 1 and Phase 2, frontend stabilization work must not change `server/**`.
- Backend and AI/ML contributors may audit, document, and prepare contracts in parallel, but should not change runtime behavior until the frontend stability gate is passed.
- Keep all user-facing text in English for the current UI pass.
- Sarvam voice, Sentinel/NDVI, live government scheme retrieval, and production market ingestion are later integrations.
- Mock, fixture, cached, and live data must be visibly labeled in UI and contracts.
- OpenAI model selection must come from configuration, especially `OPENAI_MODEL`; do not hard-code model names in feature branches.
- The LLM may explain approved facts. It must not invent pesticide names, dosage, waiting periods, or safety restrictions.

## Hot Files

Only the named owner should edit these files during active phase work:

| File/path | Owner |
|---|---|
| `package.json`, `package-lock.json` | Integration/dependency lead |
| `vite.config.js` | Frontend platform owner |
| `src/App.jsx`, `src/main.jsx` | Frontend platform owner |
| `src/App.css`, `src/index.css` | Frontend platform/design-system owner |
| `src/context/**` | Frontend platform/localization owner |
| `src/lib/api/**`, `src/services/apiClient.js` | Frontend platform owner |
| `contracts/**` | API contract owner |
| `server/src/app.ts` | Backend API owner |
| `server/src/config/env.ts`, `server/env.example` | Backend config owner |
| `server/src/db/**` | Database owner |
| `server/model/**`, `ml/**` | ML owner |

## Workstream Ownership

### Frontend Platform Owner

Owns Phase 1 frontend stabilization.

Allowed paths:

- `vite.config.js`
- `src/App.jsx`
- `src/main.jsx`
- `src/components/layout/**`
- `src/components/ui/**`
- `src/lib/**`
- `src/contracts/**`
- shared frontend hooks/context

Expected result:

- Vite proxy reaches all existing Express endpoints used by the UI.
- Router and providers are stable.
- Shared layout matches the new dashboard direction.
- API client is provider-neutral and ready for runtime validation.
- Feature teams can work mostly inside `src/features/**`.

### Frontend Feature Owner

Owns Phase 2 screen migration and visual feature work.

Allowed paths:

- `src/features/home/**`
- `src/features/advisory/**`
- `src/features/farmer/**`
- `src/features/weather/**`
- `src/features/market/**`
- `src/features/schemes/**`
- `src/pages/**` only to make pages thin wrappers

Expected result:

- Screens use the dashboard style in the shared reference: pale green background, left navigation, dark green actions, dashboard cards, weather summary, crop scan CTA, market CTA, crop health summary, and AI insight card.
- `src/pages/*.jsx` contain little or no business logic.
- Gemini/OpenAI branding is not visible in frontend copy.
- Loading, empty, error, and data-mode states are visible.

### Backend API Owner

Owns backend contracts and later API implementation.

Allowed paths after the frontend stability gate:

- `server/src/app.ts`
- `server/src/routes/**`
- `server/src/services/**`
- `server/src/schemas/**`
- `server/src/config/**`
- `server/env.example`
- backend contract fixtures

Expected result:

- Existing routes stay compatible.
- Route inventory and fixtures are documented.
- Ahead-of-plan integrations are feature-flagged, parked, or deferred.
- Later `/api/v1` endpoints follow the committed contracts.

### AI/ML Owner

Owns model validation and safe AI boundaries.

Allowed paths:

- `server/model/**`
- `server/src/data/classNames.ts`
- future `ml/**`
- future AI schema/prompt fixtures

Expected result:

- Model input, preprocessing, labels, confidence units, and thresholds are documented.
- Low-confidence and unsupported-image behavior is defined.
- OpenAI receives only approved backend facts and returns structured explanation output.
- The AI path never generates unreviewed chemical advice.

## Monitoring Checklist

Every handoff or pull request should state:

- Phase number.
- Owner/workstream.
- Files changed.
- Hot files touched, if any.
- Commands run.
- Mock/fixture/live data behavior.
- Whether backend runtime behavior changed.
- Whether frontend route behavior changed.
- Known risks or follow-up tasks.

## Branch Naming

Use short, phase-scoped branches:

- `phase/1-frontend-platform`
- `phase/2-dashboard-screen`
- `phase/0-contracts`
- `phase/5-ml-audit`
- `phase/3-openai-boundary`

Do not combine dependency updates, schema migrations, visual redesign, and backend behavior changes in one branch.
