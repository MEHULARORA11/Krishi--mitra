/**
 * AuthContext — compatibility shim (DEPRECATED)
 * ===============================================
 * This context has been replaced by Clerk (@clerk/clerk-react).
 * This file is kept only as a safety net in case any component
 * still imports from it during the transition period.
 *
 * Use Clerk hooks instead:
 *   import { useUser, useAuth } from '@clerk/clerk-react'
 *   const { isSignedIn, user } = useUser()
 */
import { createContext } from 'react'
import { useUser, useClerk } from '@clerk/clerk-react'

const AuthContext = createContext(null)

export const useAuth = () => {
  // Forward to Clerk — maintains old API surface for backward compat
  const { user: clerkUser, isSignedIn } = useUser()
  const { signOut } = useClerk()
  return {
    user: isSignedIn
      ? { id: clerkUser?.id, name: clerkUser?.fullName, email: clerkUser?.primaryEmailAddress?.emailAddress }
      : null,
    loading: false,
    logout: () => signOut(),
  }
}

export const AuthProvider = ({ children }) => {
  // No-op wrapper — ClerkProvider in main.jsx handles everything
  return <AuthContext.Provider value={null}>{children}</AuthContext.Provider>
}
