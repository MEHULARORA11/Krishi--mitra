import { useEffect } from 'react'
import { useUser } from '@clerk/clerk-react'
import { Navigate } from 'react-router-dom'
import { LoadingState } from './ui/AsyncState'

/**
 * Wraps a route that requires authentication.
 * Uses Clerk's useUser() hook — shows a toast and redirects to home if not signed in.
 */
const ProtectedRoute = ({ children }) => {
  const { isSignedIn, isLoaded } = useUser()

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      console.warn('Authentication required for protected route.')
    }
  }, [isLoaded, isSignedIn])

  if (!isLoaded) {
    return (
      <LoadingState
        title="Checking your session"
        description="Please wait while we confirm access for this route."
      />
    )
  }

  if (!isSignedIn) {
    return <Navigate to="/sign-in" replace />
  }

  return children
}

export default ProtectedRoute
