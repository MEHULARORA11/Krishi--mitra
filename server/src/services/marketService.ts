/**
 * Market price access through the data.gov.in AGMARKNET resource.
 * The browser only receives an explicit source mode; API keys stay server-side.
 */

import axios from 'axios'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { env } from '../config/env.js'
import { marketCache } from '../utils/cache.js'
import { getDb } from '../db/index.js'
import { marketPrices } from '../db/schema.js'

const DATA_GOV_BASE = 'https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070'
const CACHE_TTL_SECONDS = 3600

export type MarketPrice = {
  crop: string
  variety: string
  state: string
  district: string
  mandi: string
  modalPrice: number
  minPrice: number
  maxPrice: number
  arrivalDate: string
}

export type MarketPriceSnapshot = {
  prices: MarketPrice[]
  dataMode: 'live' | 'cached' | 'fixture'
  source: string
  fetchedAt: string
}

export type MarketAnalysis = {
  prices: MarketPrice[]
  cheapestMandi: MarketPrice | null
  highestMandi: MarketPrice | null
  averagePrice: number
  priceRange: { min: number; max: number }
  tradeoffExplanation: string
  dataMode: MarketPriceSnapshot['dataMode']
  source: string
  fetchedAt: string
}

export const COMMON_COMMODITIES = [
  'Rice', 'Wheat', 'Maize', 'Bajra', 'Jowar', 'Ragi',
  'Tur/Arhar', 'Urad', 'Moong', 'Masoor', 'Chana',
  'Groundnut', 'Mustard', 'Soyabean', 'Sunflower',
  'Cotton', 'Jute', 'Sugarcane',
  'Potato', 'Onion', 'Tomato', 'Brinjal', 'Cauliflower',
  'Banana', 'Mango', 'Apple', 'Orange', 'Coconut',
  'Pepper', 'Cardamom', 'Turmeric', 'Ginger', 'Chilli',
] as const

export const fetchMarketPrices = async (
  crop: string,
  state: string,
  district?: string,
): Promise<MarketPrice[]> => (await fetchMarketSnapshot(crop, state, district)).prices

export const fetchMarketSnapshot = async (
  crop: string,
  state: string,
  district?: string,
): Promise<MarketPriceSnapshot> => {
  const cacheKey = `market:${crop}:${state}:${district || 'all'}`.toLowerCase()
  const cached = marketCache.get<MarketPriceSnapshot>(cacheKey)

  if (cached) {
    return {
      ...cached,
      dataMode: 'cached',
      source: `${cached.source} (memory cache)`,
    }
  }

  let snapshot: MarketPriceSnapshot

  if (!env.dataGovApiKey) {
    console.warn('[market] No DATA_GOV_API_KEY - returning fixture data')
    snapshot = createFixtureSnapshot(crop, state, district)
  } else {
    try {
      snapshot = {
        prices: await fetchFromDataGov(crop, state, district),
        dataMode: 'live',
        source: 'data.gov.in AGMARKNET',
        fetchedAt: new Date().toISOString(),
      }
    } catch (error) {
      console.error('[market] data.gov.in fetch failed, using fixture:', error)
      snapshot = createFixtureSnapshot(crop, state, district)
    }
  }

  marketCache.set(cacheKey, snapshot, CACHE_TTL_SECONDS)
  persistPricesToDb(snapshot.prices)
  return snapshot
}

export const getMarketAnalysis = async (
  crop: string,
  state: string,
  district?: string,
  language = 'en',
): Promise<MarketAnalysis> => {
  const snapshot = await fetchMarketSnapshot(crop, state, district)
  const prices = snapshot.prices

  if (prices.length === 0) {
    return {
      prices: [],
      cheapestMandi: null,
      highestMandi: null,
      averagePrice: 0,
      priceRange: { min: 0, max: 0 },
      tradeoffExplanation: 'No market data is available for this crop and region.',
      dataMode: snapshot.dataMode,
      source: snapshot.source,
      fetchedAt: snapshot.fetchedAt,
    }
  }

  const sorted = [...prices].sort((a, b) => a.modalPrice - b.modalPrice)
  const cheapestMandi = sorted[0]
  const highestMandi = sorted[sorted.length - 1]
  const averagePrice = Math.round(prices.reduce((sum, item) => sum + item.modalPrice, 0) / prices.length)
  const priceRange = { min: cheapestMandi.modalPrice, max: highestMandi.modalPrice }

  return {
    prices: sorted,
    cheapestMandi,
    highestMandi,
    averagePrice,
    priceRange,
    tradeoffExplanation: await generateTradeoffExplanation(
      crop,
      prices,
      cheapestMandi,
      highestMandi,
      averagePrice,
      language,
    ),
    dataMode: snapshot.dataMode,
    source: snapshot.source,
    fetchedAt: snapshot.fetchedAt,
  }
}

async function fetchFromDataGov(
  crop: string,
  state: string,
  district?: string,
): Promise<MarketPrice[]> {
  const params: Record<string, string> = {
    'api-key': env.dataGovApiKey,
    format: 'json',
    limit: '50',
    'filters[commodity]': crop,
    'filters[state]': state,
  }

  if (district) {
    params['filters[district]'] = district
  }

  const response = await axios.get(DATA_GOV_BASE, { params, timeout: 10000 })
  const records = response.data?.records as Array<Record<string, string>> | undefined

  if (!records?.length) {
    return []
  }

  return records.map((record) => ({
    crop: record.commodity || crop,
    variety: record.variety || '',
    state: record.state || state,
    district: record.district || '',
    mandi: record.market || '',
    modalPrice: Number.parseFloat(record.modal_price) || 0,
    minPrice: Number.parseFloat(record.min_price) || 0,
    maxPrice: Number.parseFloat(record.max_price) || 0,
    arrivalDate: record.arrival_date || new Date().toISOString().slice(0, 10),
  }))
}

function createFixtureSnapshot(
  crop: string,
  state: string,
  district?: string,
): MarketPriceSnapshot {
  const mandis = district
    ? [`${district} Main Market`, `${district} APMC`, `${district} Krishi Mandi`]
    : ['Main Market', 'APMC Yard', 'Krishi Mandi', 'Regulated Market', 'Wholesale Market']
  const basePrice = {
    Rice: 2200, Wheat: 2100, Tomato: 1500, Onion: 1800, Potato: 1200,
    Cotton: 6500, Coconut: 2800, Pepper: 38000, Cardamom: 120000,
  }[crop] || 2000
  const adjustments = [-0.08, -0.03, 0.02, 0.06, 0.1]

  return {
    prices: mandis.map((mandi, index) => {
      const modalPrice = Math.round(basePrice * (1 + adjustments[index % adjustments.length]))
      return {
        crop,
        variety: 'Common',
        state,
        district: district || state,
        mandi,
        modalPrice,
        minPrice: Math.round(modalPrice * 0.85),
        maxPrice: Math.round(modalPrice * 1.15),
        arrivalDate: '2025-06-01',
      }
    }),
    dataMode: 'fixture',
    source: 'KrishiMitra reviewed demo fixture',
    fetchedAt: '2025-06-01T00:00:00.000Z',
  }
}

async function generateTradeoffExplanation(
  crop: string,
  prices: MarketPrice[],
  cheapest: MarketPrice,
  highest: MarketPrice,
  average: number,
  language: string,
): Promise<string> {
  const difference = highest.modalPrice - cheapest.modalPrice
  const fallback =
    `${crop} prices range from Rs. ${cheapest.modalPrice}/quintal at ${cheapest.mandi} ` +
    `to Rs. ${highest.modalPrice}/quintal at ${highest.mandi}. ` +
    `The average across ${prices.length} markets is Rs. ${average}/quintal. ` +
    `Compare transport cost and timing before deciding where to sell.`

  if (!env.geminiApiKey) {
    return fallback
  }

  const marketList = prices.slice(0, 8).map((price) => (
    `${price.mandi} (${price.district}): Rs. ${price.modalPrice}`
  )).join('\n')
  const prompt = `You explain agricultural market tradeoffs without selecting a best market.\n\n` +
    `Crop: ${crop}\nMarkets:\n${marketList}\n` +
    `Price spread: Rs. ${difference}. Average: Rs. ${average}/quintal.\n` +
    `Write 3 concise sentences in ${language}. Mention transport cost and timing.`

  try {
    const genAI = new GoogleGenerativeAI(env.geminiApiKey)
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: { temperature: 0.3, maxOutputTokens: 240 },
    })
    const result = await model.generateContent(prompt)
    return result.response.text().trim()
  } catch (error) {
    console.error('[market] Gemini tradeoff error:', error)
    return fallback
  }
}

function persistPricesToDb(prices: MarketPrice[]) {
  try {
    const db = getDb()
    const values = prices.map((price) => ({
      crop: price.crop,
      variety: price.variety,
      state: price.state,
      district: price.district,
      mandi: price.mandi,
      modalPrice: price.modalPrice,
      minPrice: price.minPrice,
      maxPrice: price.maxPrice,
      arrivalQty: null as number | null,
      priceDate: price.arrivalDate,
    }))

    if (values.length) {
      db.insert(marketPrices)
        .values(values)
        .then(() => console.log(`[market] Persisted ${values.length} prices to DB`))
        .catch((error) => console.error('[market] DB persist failed:', error))
    }
  } catch {
    // A database is optional for local API development.
  }
}
