/**
 * useApiClient
 * ============
 * Registers the Clerk token getter with the global apiClient so every
 * request automatically includes the Authorization: Bearer <jwt> header.
 *
 * Mount this hook ONCE at the top of your app (e.g. inside AppContent in App.jsx).
 * After mounting, all apiClient calls — from any component or service — will
 * include the Clerk JWT when the user is signed in.
 */
import { useEffect } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { setTokenGetter } from '../lib/api'

export const useApiClient = () => {
  const { getToken, isLoaded, isSignedIn } = useAuth()

  useEffect(() => {
    if (!isLoaded) {
      return
    }

    if (!isSignedIn) {
      setTokenGetter(null)
      return
    }

    setTokenGetter(async () => {
      const token = await getToken()
      return token ?? null
    })

    return () => setTokenGetter(null)
  }, [getToken, isLoaded, isSignedIn])
}
