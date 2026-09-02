import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ClerkProvider } from '@clerk/clerk-react'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { AppErrorBoundary } from './components/ui/AppErrorBoundary'
import { clientEnv } from './lib/env/clientEnv'

const PUBLISHABLE_KEY = clientEnv.clerkPublishableKey

if (!PUBLISHABLE_KEY) {
  console.warn(
    '[Clerk] VITE_CLERK_PUBLISHABLE_KEY is not set in .env. ' +
      'Authentication will not work. Get your key from https://dashboard.clerk.com',
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ClerkProvider publishableKey={PUBLISHABLE_KEY ?? 'pk_test_placeholder'}>
      <BrowserRouter>
        <AppErrorBoundary>
          <App />
        </AppErrorBoundary>
      </BrowserRouter>
    </ClerkProvider>
  </StrictMode>,
)
