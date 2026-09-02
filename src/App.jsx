import { Navigate, Route, Routes } from 'react-router-dom'
import { SignIn, SignUp } from '@clerk/clerk-react'
import { LanguageProvider } from './context/LanguageContext'
import { useApiClient } from './hooks/useApiClient'
import ProtectedRoute from './components/ProtectedRoute'
import { AppShell } from './components/layout/AppShell'
import { RoutePlaceholder } from './components/layout/RoutePlaceholder'
import HomePage from './pages/HomePage'
import MarketPricePage from './pages/MarketPricePage'
import WeatherPage from './pages/WeatherPage'
import ChatPage from './pages/ChatPage'
import ProfilePage from './pages/ProfilePage'
import SchemesPage from './pages/SchemesPage'
import NdviPage from './pages/NdviPage'
import './App.css'

const appRoutes = [
  {
    path: '/',
    element: <HomePage />,
    title: 'Platform Dashboard',
    description:
      'Stable entry point for advisory, weather, market, profile, and future feature lanes.',
    mode: 'live',
    showOverview: true,
    surface: 'transparent',
  },
  {
    path: '/ndvi',
    element: <NdviPage />,
    title: 'NDVI Satellite Scan',
    description: 'Live field health monitoring using Copernicus Sentinel-2 data.',
    mode: 'live',
    requiresAuth: true,
  },

  {
    path: '/chat',
    element: <ChatPage />,
    title: 'Advisory Workspace',
    description:
      'Provider-neutral chat and crop analysis flow backed by the existing Express endpoints.',
    mode: 'live',
    requiresAuth: true,
  },
  {
    path: '/weather',
    element: <WeatherPage />,
    title: 'Weather Signals',
    description:
      'Weather screens stay on the current API contract while the shared shell handles loading and route structure.',
    mode: 'live',
    requiresAuth: true,
  },
  {
    path: '/market-prices',
    element: <MarketPricePage />,
    title: 'Market Snapshot',
    description:
      'Market pricing remains clearly labeled so feature teams can swap fixture data without touching the platform shell.',
    mode: 'fixture',
    requiresAuth: true,
  },
  {
    path: '/schemes',
    element: <SchemesPage />,
    title: 'Scheme Tracker',
    description:
      'Government support screens stay available while the dashboard shell standardizes navigation and status labels.',
    mode: 'fixture',
    requiresAuth: true,
  },
  {
    path: '/profile',
    element: <ProfilePage />,
    title: 'Farmer Profile',
    description:
      'Profile and history routes continue to use the unchanged backend shapes through the shared API client.',
    mode: 'live',
    requiresAuth: true,
  },
  {
    path: '/advisories',
    element: <Navigate to="/chat" replace />,
    title: 'Advisories',
    description: 'Field-aware crop analysis and safe advisory workflow.',
    mode: 'live',
    requiresAuth: true,
  },
  {
    path: '/contact',
    element: (
      <RoutePlaceholder
        title="Support routing is parked for now"
        description="This route stays registered in the stabilized shell so later work can add service contact flows without changing router ownership."
        mode="mock"
      />
    ),
    title: 'Support',
    description:
      'Placeholder route kept active for continuity while the platform shell owns navigation and common states.',
    mode: 'mock',
    requiresAuth: true,
  },
]

const renderAuthCard = (element) => (
  <div className="clerk-auth-page">{element}</div>
)

function RoutedScreen({ route }) {
  const content = route.requiresAuth ? (
    <ProtectedRoute>{route.element}</ProtectedRoute>
  ) : (
    route.element
  )

  return (
    <AppShell
      title={route.title}
      description={route.description}
      mode={route.mode}
      showOverview={route.showOverview}
      surface={route.surface}
    >
      {content}
    </AppShell>
  )
}

function AppRoutes() {
  useApiClient()

  return (
    <Routes>
      {appRoutes.map((route) => (
        <Route
          key={route.path}
          path={route.path}
          element={<RoutedScreen route={route} />}
        />
      ))}
      <Route
        path="/sign-in/*"
        element={renderAuthCard(<SignIn routing="path" path="/sign-in" />)}
      />
      <Route
        path="/sign-up/*"
        element={renderAuthCard(<SignUp routing="path" path="/sign-up" />)}
      />
      <Route path="/login" element={<Navigate to="/sign-in" replace />} />
      <Route
        path="*"
        element={
          <AppShell
            title="Route not found"
            description="The shared shell is active, but this route has not been registered yet."
            mode="mock"
          >
            <RoutePlaceholder
              title="This page is not available yet"
              description="Use the left navigation to return to one of the stabilized Phase 1 routes."
              mode="mock"
            />
          </AppShell>
        }
      />
    </Routes>
  )
}

function App() {
  return (
    <LanguageProvider>
      <div className="App">
        <AppRoutes />
      </div>
    </LanguageProvider>
  )
}

export default App
