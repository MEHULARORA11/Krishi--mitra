import { Link, useLocation } from 'react-router-dom'
import { useUser } from '@clerk/clerk-react'
import { useLanguage } from '../context/LanguageContext'
import ProtectedLink from './ProtectedLink'

const MobileBottomNav = () => {
  const location = useLocation()
  const { isSignedIn } = useUser()
  const { t } = useLanguage()

  const navItems = [
    { name: t('home'), path: '/', icon: '🏠', protected: false },
    { name: t('chat'), path: '/chat', icon: '💬', protected: true },
    { name: t('weather'), path: '/weather', icon: '🌤️', protected: true },
    { name: t('marketPrices'), path: '/market-prices', icon: '📊', protected: true },
    {
      name: isSignedIn ? 'Profile' : t('login'),
      path: isSignedIn ? '/profile' : '/sign-in',
      icon: isSignedIn ? '👤' : '🔐',
      protected: false // The login page itself is not protected, profile is, but path changes
    },
  ]

  return (
    <nav className="mobile-bottom-nav">
      <div className="bottom-nav-container">
        {navItems.map((item) => (
          item.protected ? (
            <ProtectedLink
              key={item.name}
              to={item.path}
              className={`bottom-nav-item ${location.pathname === item.path ? 'active' : ''}`}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.name}</span>
            </ProtectedLink>
          ) : (
            <Link
              key={item.name}
              to={item.path}
              className={`bottom-nav-item ${location.pathname === item.path ? 'active' : ''}`}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.name}</span>
            </Link>
          )
        ))}
      </div>
    </nav>
  )
}

export default MobileBottomNav