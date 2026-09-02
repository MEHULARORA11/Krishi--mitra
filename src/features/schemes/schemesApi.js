import { useEffect, useState } from 'react'
import { apiClient } from '../../lib/api'

const SCHEMES_FIXTURE = [
  {
    id: 'fixture-pm-kisan',
    title: 'PM-KISAN',
    state: 'Central',
    category: 'Income Support',
    description: 'Direct income support for eligible landholding farmer families.',
    eligibilityRules: 'Eligibility and exclusions are determined by the official scheme guidelines.',
    requiredDocuments: ['Aadhaar Card', 'Land ownership records', 'Bank account details'],
    officialLink: 'https://pmkisan.gov.in/',
    lastVerifiedDate: '2025-06-01',
  },
  {
    id: 'fixture-pmfby',
    title: 'PMFBY',
    state: 'Central',
    category: 'Crop Insurance',
    description: 'Crop insurance for notified crops and notified areas.',
    eligibilityRules: 'Farmers must confirm local notification, enrolment window, and crop coverage.',
    requiredDocuments: ['Aadhaar Card', 'Land or tenancy record', 'Bank account', 'Crop declaration'],
    officialLink: 'https://pmfby.gov.in/',
    lastVerifiedDate: '2025-06-01',
  },
  {
    id: 'fixture-kerala-insurance',
    title: 'Kerala State Crop Insurance Scheme',
    state: 'Kerala',
    category: 'Crop Insurance',
    description: 'State crop-insurance support for notified crops in Kerala.',
    eligibilityRules: 'Farmers should confirm notified crops and current registration steps with Krishi Bhavan.',
    requiredDocuments: ['Aadhaar Card', 'Land or lease agreement', 'Krishi Bhavan registration', 'Bank account'],
    officialLink: 'https://keralaagriculture.gov.in/',
    lastVerifiedDate: '2025-06-01',
  },
]

const mapScheme = (scheme) => ({
  id: scheme.id,
  title: scheme.title,
  state: scheme.state,
  category: scheme.category || 'Government support',
  description: scheme.description,
  eligibilityRules: scheme.eligibilityRules,
  requiredDocuments: scheme.requiredDocuments || [],
  officialLink: scheme.officialLink,
  lastVerifiedDate: scheme.lastVerifiedDate,
})

export const fetchSchemes = async ({ state = 'Kerala', category = '' } = {}) => {
  const search = new URLSearchParams({ state })
  if (category) search.set('category', category)

  try {
    const response = await apiClient.get(`/schemes?${search}`)
    return {
      schemes: response.schemes.map(mapScheme),
      dataMode: 'live',
      source: 'KrishiMitra curated scheme catalogue',
      fetchedAt: new Date().toISOString(),
    }
  } catch {
    const normalizedCategory = category.toLowerCase()
    return {
      schemes: SCHEMES_FIXTURE.filter((scheme) => (
        !normalizedCategory || scheme.category.toLowerCase().includes(normalizedCategory)
      )),
      dataMode: 'fixture',
      source: 'KrishiMitra reviewed initial demo',
      fetchedAt: '2025-06-01T00:00:00.000Z',
    }
  }
}

export const useSchemes = (filters) => {
  const [snapshot, setSnapshot] = useState(null)
  const [loading, setLoading] = useState(true)
  const { state, category } = filters

  useEffect(() => {
    let active = true
    setLoading(true)
    fetchSchemes({ state, category }).then((nextSnapshot) => {
      if (active) {
        setSnapshot(nextSnapshot)
        setLoading(false)
      }
    })

    return () => {
      active = false
    }
  }, [state, category])

  return { snapshot, loading }
}
