# KrishiMitra Backend Route Inventory & Audit

## 1. Existing Route Request/Response Shapes

The following routes represent the baseline Express API that must remain compatible for the frontend during Phase 1 and Phase 2 stabilization.

### General & Diagnostics
- **`GET /health`**
  - **Request**: None
  - **Response**: `{ status: string, mock_mode: boolean, model_path: string, runtime: string }`
- **`GET /classes`**
  - **Request**: None
  - **Response**: `{ count: number, classes: Array<{ id: number, raw: string, display: string, category: string }> }`

### Core AI & Analysis
- **`POST /chat`**
  - **Request (JSON)**: `{ question: string, language?: string }` (default language: 'en')
  - **Response**: `{ response: string, timestamp?: string }`
- **`POST /analyze`**
  - **Request (multipart/form-data)**: 
    - `file`: image file (required)
    - `region`: string (optional, default: 'India')
    - `season`: string (optional, default: 'Kharif')
    - `language`: string (optional, default: 'en')
  - **Response**: `{ raw_class: string, disease: string, crop: string, confidence: number, is_healthy: boolean, severity: string, advisory_short: string, advisory_detail: string }`
- **`POST /advisory`**
  - **Request (JSON)**: `{ disease_name: string, confidence?: number, crop: string, region?: string, season?: string, language?: string, mode?: 'short' | 'detailed' }`
  - **Response**: `{ disease: string, crop: string, language: string, mode: string, advisory: string, severity: string }`

### Weather
- **`GET /weather`**
  - **Request (Query)**: `city` (string, default: 'Thiruvananthapuram')
  - **Response**: `{ location: string, temperature: number, condition: string, humidity: number, windSpeed: number, uvIndex: number, rainfallProbability: number, icon: string | null, hourlyForecast: Array, weeklyForecast: Array, sourceFreshness: string, fetchedAt: string }`

### Users & Authentication (Requires Clerk JWT)
- **`POST /users/sync`**
  - **Request (JSON)**: `{ clerkUserId: string, name?: string, email: string }`
  - **Response**: `Farmer` object (from DB)
- **`GET /users/me`**
  - **Request**: None
  - **Response**: `Farmer` object (from DB)

### History (Requires Clerk JWT)
- **`GET /history/chat`**
  - **Request**: None
  - **Response**: `{ messages: Array<ChatPair> }`
- **`GET /history/analyses`**
  - **Request**: None
  - **Response**: `{ analyses: Array<AnalysisHistory> }`


## 2. Ahead-of-Plan Backend Modules

The following modules were implemented ahead of the schedule defined in `PHASED_IMPLEMENTATION_PLAN.md`:
1. **Market (`marketService`, `marketRoutes`)**
2. **Schemes (`schemesService`, `schemesRoutes`, `schemesData`)**
3. **NDVI / Sentinel-2 (`ndviService`, `ndviRoutes`)**
4. **Voice / Sarvam AI (`voiceService`, `voiceRoutes`)**
5. **Extra DB Tables** (`market_prices`, `gov_schemes`, `ndvi_snapshots`, `voice_interactions`)


## 3. Recommendations for Ahead-of-Plan Modules

Per the phased implementation plan, the centerpiece for the MVP is the trusted disease workflow (Image -> relevance -> inference -> field context -> weather -> deterministic rules -> structured explanation). External integrations should not distract from this core flow.

- **Market**: **Parked without UI dependency**. The backend routes exist, but frontend teams should not wire them into the React app until Phase 8.
- **Schemes**: **Parked without UI dependency**.
- **NDVI (Sentinel-2)**: **Delayed until Phase 8**. The plan explicitly states to defer satellite processing entirely until the grounded advisory is stable.
- **Voice / Sarvam**: **Delayed until Phase 8**. The plan states Sarvam is a later voice adapter and should not be a dependency of text chat or the React stabilization.
- **Extra DB Tables**: **Removed later**. To keep the MVP database footprint small (focused on the minimum farm digital twin), these tables should be removed from the initial Drizzle migrations (Phase 4) and re-introduced only in Phase 8. *(Note: `weather_cache` is acceptable as weather is part of the MVP core flow).*


## 4. Preparation for Phase 3 (OpenAI Boundary)

*Note: Do not implement these changes until Phase 1 and Phase 2 are complete.*

### Environment Variables
- `OPENAI_API_KEY`: The API key for OpenAI.
- `OPENAI_MODEL`: Configuration for the specific model to use (e.g., `gpt-4o-mini`). Should not be hardcoded in services.
- `OPENAI_TIMEOUT_MS`: Explicit timeout configuration to fail fast.

### Provider Interface Shape
To decouple the business logic from the specific LLM implementation, the provider will conform to a narrow interface:

```typescript
export interface AiExplanationProvider {
  generateExplanation(packet: GroundedAdvisoryPacket): Promise<AdvisoryExplanation>;
}
```

### Timeout/Error Contract
- **Timeouts**: The OpenAI client must be configured with a strict timeout (`OPENAI_TIMEOUT_MS`) using an `AbortSignal`.
- **Failures**: Upstream errors (5xx) or timeouts must be caught. 
- **Graceful Degradation**: If the provider fails, the system must render the deterministic approved actions and fallback notices directly, avoiding a complete failure of the advisory route.

### Structured Response Schema Location
The Zod schemas defining `GroundedAdvisoryPacket` (input) and `AdvisoryExplanation` (structured output) should be centralized in:
`server/src/domain/advisory/contracts.ts` (This aligns with the target architecture directory structure proposed for Phase 6).
