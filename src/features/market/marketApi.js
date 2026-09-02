import { useEffect, useState } from 'react'
import { apiClient } from '../../lib/api'

const MARKET_FIXTURE = {
  prices: [
    { mandi: 'Thrissur Main Market', district: 'Thrissur', variety: 'Common', modalPrice: 2156, minPrice: 1833, maxPrice: 2479, arrivalDate: '2025-06-01' },
    { mandi: 'Ernakulam APMC', district: 'Ernakulam', variety: 'Common', modalPrice: 2244, minPrice: 1907, maxPrice: 2581, arrivalDate: '2025-06-01' },
    { mandi: 'Kochi Regulated Market', district: 'Ernakulam', variety: 'Common', modalPrice: 2332, minPrice: 1982, maxPrice: 2682, arrivalDate: '2025-06-01' },
  ],
  dataMode: 'fixture',
  source: 'KrishiMitra reviewed demo fixture',
  fetchedAt: '2025-06-01T00:00:00.000Z',
}

export const fetchMarketSnapshot = async ({ crop, state, district }) => {
  const search = new URLSearchParams({ crop, state })
  if (district) search.set('district', district)

  try {
    const response = await apiClient.get(`/market/prices?${search}`)
    return {
      prices: response.prices,
      dataMode: response.dataMode,
      source: response.source,
      fetchedAt: response.fetchedAt,
    }
  } catch {
    return {
      ...MARKET_FIXTURE,
      prices: MARKET_FIXTURE.prices.map((price) => ({ ...price, crop, state })),
    }
  }
}

export const useMarketSnapshot = (filters) => {
  const [snapshot, setSnapshot] = useState(null)
  const [loading, setLoading] = useState(true)
  const { crop, state, district } = filters

  const refresh = async () => {
    setLoading(true)
    const nextSnapshot = await fetchMarketSnapshot(filters)
    setSnapshot(nextSnapshot)
    setLoading(false)
  }

  useEffect(() => {
    let active = true
    setLoading(true)

    fetchMarketSnapshot({ crop, state, district }).then((nextSnapshot) => {
      if (active) {
        setSnapshot(nextSnapshot)
        setLoading(false)
      }
    })

    return () => {
      active = false
    }
  }, [crop, state, district])

  return { snapshot, loading, refresh }
}
