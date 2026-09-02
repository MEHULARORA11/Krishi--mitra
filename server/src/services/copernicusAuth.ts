import axios from 'axios'
import { env } from '../config/env.js'

let cachedToken: string | null = null
let tokenExpiry: number | null = null

export const getAccessToken = async (): Promise<string> => {
  if (cachedToken && tokenExpiry && Date.now() < tokenExpiry - 60000) {
    return cachedToken
  }

  const params = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: env.sentinelClientId || '',
    client_secret: env.sentinelClientSecret || ''
  })

  const response = await axios.post(
    'https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token',
    params.toString(),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  )

  const accessToken = response.data.access_token
  if (typeof accessToken !== 'string' || !accessToken) {
    throw new Error('Copernicus authentication response did not include an access token.')
  }

  cachedToken = accessToken
  tokenExpiry = Date.now() + (response.data.expires_in * 1000)

  return accessToken
}
