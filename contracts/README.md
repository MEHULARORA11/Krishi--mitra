# KrishiMitra Contracts

These files are planning and handoff contracts. They do not change runtime behavior by themselves.

Use them to keep parallel contributors aligned while the React frontend is stabilized and backend/AI work is prepared behind stable interfaces.

## Files

| File | Purpose |
|---|---|
| `phased-implementation.schema.json` | Machine-readable shape for phase plans, workstreams, gates, and ownership |
| `team-workstreams.schema.json` | Machine-readable shape for teammate prompts and expected deliverables |
| `api-v1-advisory.schema.json` | Draft contract for the future grounded advisory API response |
| `fixtures/grounded-advisory.accepted.json` | Example accepted advisory response for frontend/backend handoff |
| `fixtures/grounded-advisory.low-confidence.json` | Example uncertain/low-confidence response |

## Rules

- Frontend may consume fixtures before backend implementation exists.
- Backend should implement contracts before changing UI behavior.
- AI/ML should use fact packets and fixtures instead of reaching directly into route code.
- Any schema change needs review from frontend, backend, and AI/ML owners.
