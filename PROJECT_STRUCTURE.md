# 🌱 KrishiMitra — Project Structure

```
KrishiMitra/
│
├── src/                              # React 18 frontend (Vite)
│   ├── components/
│   │   ├── AdvancedFeatures.jsx      # Tabbed feature showcase
│   │   ├── FarmerHelper.jsx          # Quick-question suggestions in chat
│   │   ├── Features.jsx              # Feature cards on home page
│   │   ├── Footer.jsx                # Site footer
│   │   ├── Header.jsx                # Top nav with auth + language switcher
│   │   ├── Hero.jsx                  # Hero banner
│   │   ├── MobileBottomNav.jsx       # Mobile bottom navigation bar
│   │   ├── ProtectedRoute.jsx        # Auth guard wrapper
│   │   ├── QueryInterface.jsx        # AI query form on home page
│   │   ├── ResponseFormatter.jsx     # Formats bot messages (markdown-like)
│   │   ├── ResponseSection.jsx       # Sample responses showcase
│   │   ├── TopStrip.jsx              # Language switcher strip
│   │   └── WeatherWidget.jsx         # Mini weather card on home page
│   │
│   ├── context/
│   │   ├── AuthContext.jsx           # User auth state (login/logout)
│   │   └── LanguageContext.jsx       # i18n (en / hi / ml) + translations
│   │
│   ├── hooks/
│   │   ├── useMarketPrices.js        # Market price data hook
│   │   └── useWeather.js             # Weather data hook (polls backend)
│   │
│   ├── pages/
│   │   ├── ChatPage.jsx              # AI chat + image analysis UI
│   │   ├── HomePage.jsx              # Landing page
│   │   ├── LoginPage.jsx             # Auth page
│   │   ├── MarketPricePage.jsx       # Crop market prices (protected)
│   │   ├── ProfilePage.jsx           # User profile (protected)
│   │   ├── SchemesPage.jsx           # Government schemes
│   │   └── WeatherPage.jsx           # Full weather dashboard
│   │
│   ├── services/
│   │   ├── apiClient.js              # Fetch wrapper (uses Vite proxy in dev)
│   │   ├── geminiService.js          # Chat + image via backend /chat /analyze
│   │   ├── marketService.js          # Market prices (mock data → replace with API)
│   │   ├── voiceService.js           # Browser speech synthesis / recognition
│   │   └── weatherService.js         # Weather via backend /weather proxy
│   │
│   ├── styles/
│   │   ├── ChatPage.css
│   │   ├── ProfilePage.css
│   │   └── SchemesPage.css
│   │
│   ├── utils/
│   │   └── corsProxy.js              # CORS proxy helper (dev utility)
│   │
│   ├── App.css                       # Global + component styles
│   ├── App.jsx                       # Router + layout shell
│   ├── index.css                     # CSS reset + root vars
│   └── main.jsx                      # React entry point
│
├── server/                           # TypeScript Express backend
│   ├── src/
│   │   ├── config/
│   │   │   └── env.ts                # Typed env loader (dotenv)
│   │   │
│   │   ├── data/
│   │   │   └── classNames.ts         # 38 PlantVillage class names + parser
│   │   │
│   │   ├── middleware/
│   │   │   └── errorHandler.ts       # Global error + 404 handler
│   │   │
│   │   ├── routes/
│   │   │   ├── advisoryRoutes.ts     # POST /advisory
│   │   │   ├── analyzeRoutes.ts      # POST /analyze (file upload)
│   │   │   ├── chatRoutes.ts         # POST /chat
│   │   │   ├── classesRoutes.ts      # GET /classes
│   │   │   ├── healthRoutes.ts       # GET /health
│   │   │   └── weatherRoutes.ts      # GET /weather, GET /weather/districts
│   │   │
│   │   ├── schemas/
│   │   │   └── requestSchemas.ts     # Zod validation schemas
│   │   │
│   │   ├── services/
│   │   │   ├── advisoryService.ts    # Gemini advisory + chat prompts
│   │   │   ├── diseaseModelService.ts # TF.js ML inference (mock by default)
│   │   │   └── weatherService.ts     # OpenWeatherMap proxy
│   │   │
│   │   ├── utils/
│   │   │   ├── asyncHandler.ts       # Express async wrapper
│   │   │   └── httpError.ts          # Typed HTTP error class
│   │   │
│   │   ├── app.ts                    # Express app factory (routes + middleware)
│   │   └── index.ts                  # Server entry point (listen)
│   │
│   ├── .env                          # Local secrets — NEVER commit (git-ignored)
│   ├── env.example                   # Template → copy to .env
│   └── tsconfig.json                 # TypeScript config (NodeNext modules)
│
├── krishi-backend/                   # [ARCHIVED] Original Python/FastAPI backend
│   ├── main.py                       # Reference implementation (superseded)
│   ├── requirements.txt
│   └── model/                        # Keras .h5 model (convert to TF.js for TS server)
│
├── .env.example                      # Frontend env template
├── .gitignore
├── eslint.config.js
├── index.html
├── package.json                      # Monorepo scripts + all dependencies
├── PROJECT_STRUCTURE.md
├── README.md
└── vite.config.js                    # Vite + dev proxy (→ port 8000)
```

## Data Flow

```
Browser (React)
    │
    ├── /chat, /analyze, /advisory ──→  Vite dev proxy  ──→  TS Express (port 8000)
    │                                                              │
    │                                                    ┌─────────┴──────────┐
    │                                            advisoryService.ts   diseaseModelService.ts
    │                                                 │                       │
    │                                           Gemini API              TF.js (mock/real)
    │
    └── /weather ──────────────────→  Vite dev proxy  ──→  weatherService.ts
                                                                 │
                                                         OpenWeatherMap API
```

## API Routes Summary

| Method | Route | Service |
|--------|-------|---------|
| GET | /health | healthRoutes.ts |
| GET | /classes | classesRoutes.ts + classNames.ts |
| POST | /analyze | analyzeRoutes.ts → diseaseModelService + advisoryService |
| POST | /advisory | advisoryRoutes.ts → advisoryService |
| POST | /chat | chatRoutes.ts → advisoryService |
| GET | /weather | weatherRoutes.ts → weatherService |
| GET | /weather/districts | weatherRoutes.ts |
