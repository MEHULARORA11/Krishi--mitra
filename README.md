# 🌱 KrishiMitra — AI-powered Agricultural Assistant

KrishiMitra is a full-stack hackathon demo for field-aware crop advisory. It combines image classification, farm/field/zone context, weather and soil facts, reviewed safety rules, follow-up monitoring, and farmer-facing explanations.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, React Router v6 |
| Backend API | TypeScript, Express 5, Zod |
| AI | OpenAI Responses API |
| ML Inference | TensorFlow.js (Node) |
| Weather | WeatherAPI.com forecast and alerts (proxied server-side) |

---

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
# Copy and fill in backend secrets
copy server\env.example server\.env
```

Open `server/.env` and add:
- `OPENAI_API_KEY` — from https://platform.openai.com/api-keys
- `OPENAI_MODEL` — set the chosen OpenAI model slug
- `WEATHER_API_KEY` — server-side key from https://www.weatherapi.com/signup.aspx
- `WEATHER_FORECAST_DAYS` — requested forecast depth (the free plan may return fewer days)
- `DATA_GOV_API_KEY` - from https://data.gov.in for AGMARKNET mandi-price data
- `MODEL_PATH=server/model`

Weather requires a valid WeatherAPI key for live data. If the provider is unavailable,
the API returns recent cached weather when safe, otherwise an explicit unavailable state.
The keys remain in `server/.env` and are never sent to the browser.

### 3. Start development servers

```bash
# Starts both frontend (port 3000) + API (port 8000) in one terminal
npm run dev:full

# Or start them separately:
npm run dev:client   # frontend only
npm run dev:api      # API only
```

Open http://localhost:3000

---

## Available Scripts

| Script | Description |
|---|---|
| `npm run dev:full` | Start frontend + API concurrently |
| `npm run dev:client` | Start Vite dev server (port 3000) |
| `npm run dev:api` | Start TypeScript API with hot-reload (port 8000) |
| `npm run build` | Build frontend for production |
| `npm run build:api` | Compile TypeScript API to `server/dist/` |
| `npm run typecheck:api` | Type-check the API without emitting |
| `npm run start:api` | Run compiled API in production |

---

## API Endpoints

All endpoints are available at `http://localhost:8000` in dev (proxied via Vite automatically).

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Server status + runtime info |
| `GET` | `/classes` | All 38 PlantVillage disease classes |
| `POST` | `/analyze` | Upload crop image → disease prediction + advisory |
| `POST` | `/advisory` | Get a structured advisory explanation for a known disease |
| `POST` | `/chat` | Ask a farming question through the grounded advisory layer |
| `GET` | `/weather?city=...&days=3&alerts=true` | Current weather, forecasts, alerts, and agricultural signals |
| `GET` | `/weather?lat=...&lng=...` | Field-coordinate weather lookup |
| `GET` | `/weather/districts` | List of supported Kerala districts |
| `GET` | `/weather/risk?city=...` | Weather-aware disease, spray-window, and irrigation signals |

### Canonical ecosystem advisory API

Authenticated scanner and monitoring work uses `/api/v1`:

| Method | Path | Description |
|---|---|---|
| `GET`, `POST` | `/api/v1/farms` | List or create a farmer farm |
| `POST` | `/api/v1/fields` | Create a field with optional irrigation/farming method |
| `POST` | `/api/v1/fields/:id/zones` | Create a management zone |
| `POST` | `/api/v1/fields/:id/crop-cycles` | Store crop, variety, planting date, and stage |
| `POST` | `/api/v1/fields/:id/soil-tests` | Store pH, N, P, K, and organic carbon observations |
| `POST` | `/api/v1/analyses` | Upload a crop image with field/zone context and optional farmer-reported affected area |
| `GET` | `/api/v1/fields/:id/timeline` | Read zone-aware detections and follow-up observations |
| `POST` | `/api/v1/advisories/:id/observations` | Record a follow-up observation/outcome |

Run database migrations before using the canonical workflow:

```bash
npm run db:migrate
```

## Advisory scope and safety

- The checked-in model is a 38-class PlantVillage classifier. It returns the top three model candidates, confidence, and image-quality signals.
- It does **not** validate arbitrary field photos or diagnose pests, nutrient deficiencies, heat/water stress, or crops outside its label set. Those results must be presented as uncertain and require a clearer image or expert review.
- Severity is farmer-reported affected area in this demo. Spread risk is a transparent rule-based indicator using severity, weather, and prior zone detections; it is not a validated epidemiological prediction.
- Reviewed treatment rules are a visibly labelled fixture limited to the demo scope. The application does not generate pesticide dosage, mixtures, approval status, or waiting-period advice.
- Missing weather credentials produce an explicit unavailable response. Recent provider responses may be shown as stale cached data; weather is never fabricated.

---

## ML Model — Inference Setup

The API expects the checked-in TF.js model in `server/model/`.

### Step 1: Convert the Keras model to TF.js format

```bash
pip install tensorflowjs
tensorflowjs_converter --input_format=keras \
  krishi-backend/model/krishi_disease_model.h5 \
  server/model/
```

### Step 2: Install TensorFlow.js Node binding

```bash
npm install @tensorflow/tfjs-node
```

### Step 3: Update `server/.env`

```
MODEL_PATH=server/model
```

---

## Project Structure

```
KrishiMitra/
├── src/                          # React frontend
│   ├── components/               # Reusable UI components
│   ├── pages/                    # Page components (Chat, Weather, Market, etc.)
│   ├── context/                  # React Context (Auth, Language)
│   ├── hooks/                    # Custom hooks (useWeather, useMarketPrices)
│   ├── services/                 # Frontend service layer
│   │   ├── apiClient.js          # Fetch wrapper (uses Vite proxy in dev)
│   │   ├── geminiService.js      # Chat + image analysis via backend
│   │   ├── weatherService.js     # Weather via backend proxy
│   │   └── marketService.js      # Market prices (mock data)
│   ├── styles/                   # Component-specific CSS
│   └── App.jsx                   # Router + layout
│
├── server/                       # TypeScript Express backend
│   ├── src/
│   │   ├── config/env.ts         # Environment variable loader
│   │   ├── routes/               # Express route handlers
│   │   ├── services/             # Business logic
│   │   │   ├── advisoryService.ts    # Gemini advisory + chat
│   │   │   ├── diseaseModelService.ts # TF.js ML inference
│   │   │   └── weatherService.ts     # WeatherAPI proxy, normalization, cache, risk signals
│   │   ├── schemas/              # Zod request validation
│   │   ├── middleware/           # Error handler
│   │   ├── utils/                # asyncHandler, httpError
│   │   ├── data/classNames.ts    # 38 PlantVillage class names
│   │   ├── app.ts                # Express app factory
│   │   └── index.ts              # Server entry point
│   ├── .env                      # Your local secrets (git-ignored)
│   ├── env.example               # Template for server secrets
│   └── tsconfig.json
│
├── krishi-backend/               # [ARCHIVED] Original Python/FastAPI backend
│   └── main.py                   # Reference implementation — superseded by server/
│
├── vite.config.js                # Vite + dev proxy config
├── package.json                  # Monorepo scripts + dependencies
└── .env.example                  # Frontend env template
```

---

## Security Notes

- **API keys never reach the browser.** `OPENAI_API_KEY` and `WEATHER_API_KEY` live only in `server/.env`.
- The Vite dev proxy forwards all API requests to the backend — no CORS issues in development.
- Do **not** commit `server/.env` or `.env` — both are git-ignored.
