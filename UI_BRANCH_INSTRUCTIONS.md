# UI Branch Instructions

Purpose: let the UI revamp move in parallel while Phase 4 to Phase 6 backend work continues on a separate branch.

This branch is a contract-consumer branch. It improves layout, interaction, and presentation. It must not redefine schema, rule logic, or API behavior that belongs to the Phase 4 to Phase 6 branch.

## Branch role

- Phase 4 to Phase 6 branch owns:
  - schema and migrations
  - seed data
  - reviewed rules
  - advisory orchestration
  - API request and response behavior
- UI branch owns:
  - screen layout
  - component structure
  - loading, empty, error, and status states
  - feature-local adapters
  - feature-local fixture rendering when the API is unavailable

## Non-negotiable rules

- Do not change `server/**` from this branch.
- Do not change hot files unless their owner explicitly asks:
  - `package.json`
  - `package-lock.json`
  - `vite.config.js`
  - `src/App.jsx`
  - `src/main.jsx`
  - `src/App.css`
  - `src/index.css`
- Do not hard-code new business rules in the frontend.
- Do not invent treatment advice, dosage, restrictions, or future-plan eligibility in UI code.
- Do not use random mock data for anything that looks real to the user.
- Every non-live value must be visibly labeled as `fixture`, `mock`, or `cached`.

## Allowed frontend paths

Work only inside these paths unless a platform owner asks for more:

- `src/features/home/**`
- `src/features/advisory/**`
- `src/features/farmer/**`
- `src/features/weather/**`
- `src/features/market/**`
- `src/features/schemes/**`
- `src/pages/**` only as thin wrappers

## Source of truth for contracts

The UI branch should consume the Phase 4 to Phase 6 contract and fixture sources, not invent new shapes.

Primary references:

- `server/src/domain/advisory/contracts.ts`
- `contracts/api-v1-advisory.schema.json`
- `contracts/fixtures/grounded-advisory.accepted.json`
- `contracts/fixtures/grounded-advisory.low-confidence.json`
- `contracts/fixtures/grounded-advisory.unsupported-image.json`
- `server/src/data/phase4DemoData.ts`
- `server/src/scripts/seedPhase4Demo.ts`

If the backend branch changes a response shape, update UI adapters and fixtures to match. Do not patch around shape drift inside screen components.

## Data strategy

Use this priority order in feature services:

1. Live API response
2. Cached backend response
3. Contract-shaped fixture
4. Placeholder mock only for unfinished UI shells

Rules:

- `fixture` means deterministic, reviewed demo data aligned to seeded backend scenarios.
- `mock` means incomplete UI placeholder data and must never look like verified agronomic output.
- `cached` means previously fetched backend data with freshness metadata.
- `live` means real backend response from the active environment.

Every fixture object used in UI should include these fields where relevant:

- `id`
- `dataMode`
- `source`
- `observedAt` or `fetchedAt`
- `updatedAt`

Never use:

- `Math.random()`
- fake confidence changes
- fake real-time prices
- fake weather freshness

## Recommended fixture pattern

Keep fixtures feature-local, but shaped from shared contracts.

Suggested files:

- `src/features/home/mocks/homeDashboard.fixture.js`
- `src/features/advisory/mocks/advisoryRun.fixture.js`
- `src/features/farmer/mocks/farmerWorkspace.fixture.js`
- `src/features/weather/mocks/weatherSnapshot.fixture.js`
- `src/features/market/mocks/marketSnapshot.fixture.js`
- `src/features/schemes/mocks/schemes.fixture.js`

Keep one shared demo story across all screens:

- one farmer
- one farm
- one field
- two active co-crops
- one latest soil summary
- one accepted disease detection
- one advisory with approved and blocked actions
- one action-status change
- one future plan locked before resolution and unlocked after completion

## UI contract adapter rule

Do not let screens read raw backend shapes directly if the shape is likely to evolve.

Each feature should have one adapter layer that normalizes data for the screen.

Suggested pattern:

- `services/fetch...`
- `services/map...ToViewModel`
- screen consumes only the view model

This keeps merges small when backend contracts change slightly.

## Screen expectations

### Home

Show:

- farmer greeting
- selected farm and field summary
- weather summary
- crop scan call to action
- market snapshot preview
- crop health summary cards
- latest advisory card
- future crop plan preview only when backend state allows it

Do not:

- show fake live data
- summarize future plans if the backend marks them locked

### Advisory

Show:

- field selector
- text query state
- image upload state
- rejected, unsupported, low-confidence, and accepted analysis states
- `diagnosis`
- `contextUsed`
- `approvedActions`
- `blockedActions`
- `missingData`
- `explanation`
- `escalation`
- `provenance`
- action status controls for `planned`, `completed`, `skipped`, `unresolved`
- future plan area only after allowed status

Do not:

- hide blocked actions that came from the backend
- generate frontend-only advice text that contradicts rule results

### Farmer/Profile

Show:

- farmer identity and location
- farms and fields
- area and area unit
- active crop cycles
- latest soil summary
- latest advisory summary
- analysis and action history

Do not:

- treat missing soil data as normal
- compress unresolved advisory states into completed states

### Weather

Show:

- current weather
- available forecast coverage only
- source and freshness metadata
- stale state when applicable
- unavailable state when data is missing

Do not:

- invent UV or unsupported forecast coverage
- replace missing values with believable fake defaults

### Market

Show:

- snapshot or fixture labeling
- commodity
- mandi or market
- source date
- district or state
- min, modal, and max price if present

Do not:

- call it real-time unless it truly is

### Schemes

Show:

- scheme title
- short summary
- benefits summary
- eligibility summary
- official link
- jurisdiction
- last verified date if present
- copy that says the user should verify officially

Do not:

- imply guaranteed eligibility
- mix scheme data into farm-rule logic

## Merge safety checklist

Before opening a PR from the UI branch:

- confirm no `server/**` files changed
- confirm no hot files changed without owner approval
- confirm all user-visible fixture data is labeled
- confirm no screen relies on random mock values
- confirm advisory screens render accepted, low-confidence, unsupported-image, loading, and error states
- confirm future plan UI respects backend lock or unlock state
- confirm all new data access goes through feature-local adapters
- confirm `src/pages/*.jsx` stay thin

## Coordination with the Phase 4 to Phase 6 branch

- Ask backend owners to freeze example payloads before broad UI implementation.
- If contract changes are needed, change the contract first, then update UI adapters.
- Keep one small changelog in the PR description:
  - screen touched
  - fixture files used
  - live endpoints consumed
  - known gaps

## Definition of success for this branch

This branch is successful when:

- the UI looks significantly better
- the branch can render cleanly against Phase 4 to Phase 6 data
- fixtures match the backend demo scenario
- merge conflicts are limited mostly to feature-owned files
- no frontend code duplicates backend rules or advisory decisions
