export const PHASE4_RULES_VERSION = 'phase4-reviewed-rules-v1'
export const PHASE4_DEMO_SCOPE = 'phase4-reviewed-demo-scope-v1'

export const phase4DemoFarmer = {
  clerkUserId: 'demo_clerk_phase4_owner',
  name: 'Rajesh Demo Farmer',
  email: 'demo-farmer@krishimitra.local',
  preferredLanguage: 'en',
  state: 'Maharashtra',
  district: 'Pune',
}

export const phase4DemoFarm = {
  name: 'Demo Farm',
  village: 'Mulshi',
  state: 'Maharashtra',
  district: 'Pune',
}

export const phase4DemoField = {
  name: 'East Demo Field',
  area: '2.50',
  areaUnit: 'hectare',
  coarseCentroidLat: 18.525,
  coarseCentroidLng: 73.486,
}

export const phase4DemoCrops = [
  {
    canonicalName: 'Tomato',
    localNames: ['Tamatar', 'Tomato'],
    category: 'vegetable',
  },
  {
    canonicalName: 'Onion',
    localNames: ['Pyaz', 'Kanda'],
    category: 'vegetable',
  },
] as const

export const phase4DemoCropCycles = [
  {
    cropCanonicalName: 'Tomato',
    variety: 'Abhinav',
    season: 'Kharif',
    sowingDate: '2026-07-01T00:00:00.000Z',
    stage: 'vegetative',
    status: 'active',
  },
  {
    cropCanonicalName: 'Onion',
    variety: 'N-53',
    season: 'Kharif',
    sowingDate: '2026-07-10T00:00:00.000Z',
    stage: 'bulb_formation',
    status: 'active',
  },
] as const

export const phase4DemoSoilTest = {
  sampledAt: '2026-08-18T00:00:00.000Z',
  ph: '6.50',
  nitrogen: '320.00',
  phosphorus: '42.00',
  potassium: '235.00',
  organicCarbon: '0.82',
  summary:
    'Reviewed demo soil summary: pH is suitable, organic carbon is acceptable, and the latest sample is still valid for this advisory window.',
  source: 'reviewed_demo_soil_card',
  sourceFreshness: 'reviewed',
  attachmentRef: 'soil-card-demo-2026-08-18.pdf',
}

export const phase4DemoWeatherSnapshot = {
  city: 'Pune',
  source: 'reviewed_demo_weather_fixture',
  sourceFreshness: 'fixture',
  observedAt: '2026-08-21T08:30:00.000Z',
  expiresAt: '2026-08-21T12:30:00.000Z',
  rainProbability: 18,
  humidity: 66,
  windSpeed: 10,
  temperature: 28,
  payload: {
    summary: 'Warm weather, light breeze, no heavy rain warning.',
  },
}

export const phase4DemoReviewedActions = [
  {
    reviewedActionId: 'reviewed_containment_001',
    type: 'containment',
    title: 'Contain infected leaves',
    activeIngredient: null,
    actionText:
      'Remove visibly affected tomato leaves, isolate them from healthy plants, and avoid overhead watering.',
    source: 'reviewed_demo_manual',
    jurisdiction: 'IN-MH',
    reviewDate: '2026-08-21T00:00:00.000Z',
    demoScope: PHASE4_DEMO_SCOPE,
  },
  {
    reviewedActionId: 'reviewed_neem_barrier_001',
    type: 'organic_barrier',
    title: 'Apply reviewed neem barrier',
    activeIngredient: 'Neem extract',
    actionText:
      'Apply the reviewed neem-based leaf barrier only when the co-crop restriction does not apply.',
    source: 'reviewed_demo_manual',
    jurisdiction: 'IN-MH',
    reviewDate: '2026-08-21T00:00:00.000Z',
    demoScope: PHASE4_DEMO_SCOPE,
  },
  {
    reviewedActionId: 'reviewed_dry_window_001',
    type: 'cultural',
    title: 'Use a dry low-wind work window',
    activeIngredient: null,
    actionText:
      'Prune lower canopy and improve airflow only in a dry, low-wind window so leaves can dry quickly.',
    source: 'reviewed_demo_manual',
    jurisdiction: 'IN-MH',
    reviewDate: '2026-08-21T00:00:00.000Z',
    demoScope: PHASE4_DEMO_SCOPE,
  },
  {
    reviewedActionId: 'reviewed_soil_support_001',
    type: 'soil_support',
    title: 'Use the reviewed soil-support step',
    activeIngredient: null,
    actionText:
      'Use the reviewed soil-support step only when a recent soil test confirms the field is within the accepted range.',
    source: 'reviewed_demo_manual',
    jurisdiction: 'IN-MH',
    reviewDate: '2026-08-21T00:00:00.000Z',
    demoScope: PHASE4_DEMO_SCOPE,
  },
] as const

export const phase4DemoConstraintFixtures = [
  {
    reviewedActionId: 'reviewed_containment_001',
    cropCanonicalName: 'Tomato',
    disease: 'Early blight',
    stage: 'vegetative',
    prohibitedCoCrops: [],
    minPh: null,
    maxPh: null,
    minOrganicCarbon: null,
    maxRainProbability: null,
    maxWindSpeed: null,
    waitingIntervalHours: null,
    severity: 'moderate',
    source: 'reviewed_demo_manual',
    sourceFreshness: 'reviewed',
    notes: 'Safe containment baseline for the reviewed demo scenario.',
  },
  {
    reviewedActionId: 'reviewed_neem_barrier_001',
    cropCanonicalName: 'Tomato',
    disease: 'Early blight',
    stage: 'vegetative',
    prohibitedCoCrops: ['Onion'],
    minPh: null,
    maxPh: null,
    minOrganicCarbon: null,
    maxRainProbability: null,
    maxWindSpeed: null,
    waitingIntervalHours: null,
    severity: 'moderate',
    source: 'reviewed_demo_manual',
    sourceFreshness: 'reviewed',
    notes: 'Blocked when onion is an active co-crop in the same field.',
  },
  {
    reviewedActionId: 'reviewed_dry_window_001',
    cropCanonicalName: 'Tomato',
    disease: 'Early blight',
    stage: 'vegetative',
    prohibitedCoCrops: [],
    minPh: null,
    maxPh: null,
    minOrganicCarbon: null,
    maxRainProbability: 35,
    maxWindSpeed: 18,
    waitingIntervalHours: null,
    severity: 'moderate',
    source: 'reviewed_demo_manual',
    sourceFreshness: 'reviewed',
    notes: 'Blocked during rain or wind conditions above the reviewed thresholds.',
  },
  {
    reviewedActionId: 'reviewed_soil_support_001',
    cropCanonicalName: 'Tomato',
    disease: 'Early blight',
    stage: 'vegetative',
    prohibitedCoCrops: [],
    minPh: 6.0,
    maxPh: 7.2,
    minOrganicCarbon: 0.75,
    maxRainProbability: null,
    maxWindSpeed: null,
    waitingIntervalHours: 72,
    severity: 'moderate',
    source: 'reviewed_demo_manual',
    sourceFreshness: 'reviewed',
    notes: 'Needs a recent soil test and treatment history before it can be allowed.',
  },
] as const
