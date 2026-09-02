import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useUser, useClerk, SignInButton, UserButton } from '@clerk/clerk-react'
import { useLanguage } from '../context/LanguageContext'
import ProtectedLink from './ProtectedLink'

const Header = () => {
  const location = useLocation()
  const { isSignedIn, isLoaded } = useUser()
  const { signOut } = useClerk()
  const { t } = useLanguage()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [location.pathname])

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        !event.target.closest('.mobile-menu') &&
        !event.target.closest('.mobile-menu-btn')
      ) {
        setIsMobileMenuOpen(false)
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  const navItems = [
    { name: t('home'), path: '/', protected: false },
    { name: t('chat'), path: '/chat', protected: true },
    { name: t('weather'), path: '/weather', protected: true },
    { name: t('marketPrices'), path: '/market-prices', protected: true },
    { name: t('schemes'), path: '/schemes', protected: true },
    { name: t('advisories'), path: '/advisories', protected: true },
    { name: t('contact'), path: '/contact', protected: true },
  ]

  return (
    <header className={`header ${isScrolled ? 'scrolled' : ''}`}>
      <div className="container">
        <div className="header-content">
          <Link to="/" className="logo">
            <span className="logo-icon">🌱</span>
            <span className="logo-text">KrishiAI</span>
          </Link>

          <nav className="desktop-nav">
            <ul>
              {navItems.map((item) => (
                <li key={item.name}>
                  {item.protected ? (
                    <ProtectedLink
                      to={item.path}
                      className={location.pathname === item.path ? 'active' : ''}
                    >
                      {item.name}
                    </ProtectedLink>
                  ) : (
                    <Link
                      to={item.path}
                      className={location.pathname === item.path ? 'active' : ''}
                    >
                      {item.name}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </nav>

          {/* Desktop auth controls */}
          <div className="auth-section desktop-auth">
            {!isLoaded ? null : isSignedIn ? (
              <div className="user-menu">
                <Link to="/profile" className="profile-link">
                  Profile
                </Link>
                {/* Clerk's built-in UserButton — avatar, account management, sign-out */}
                <UserButton afterSignOutUrl="/" />
              </div>
            ) : (
              <SignInButton mode="modal">
                <button className="btn btn-primary">{t('login')}</button>
              </SignInButton>
            )}
          </div>

          <button
            className={`mobile-menu-btn ${isMobileMenuOpen ? 'active' : ''}`}
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle mobile menu"
            aria-expanded={isMobileMenuOpen}
          >
            <span className="hamburger-line"></span>
            <span className="hamburger-line"></span>
            <span className="hamburger-line"></span>
          </button>
        </div>

        {/* Mobile menu */}
        <div className={`mobile-menu ${isMobileMenuOpen ? 'active' : ''}`}>
          <div className="mobile-menu-content">
            <nav>
              {navItems.map((item) => (
                item.protected ? (
                  <ProtectedLink
                    key={item.name}
                    to={item.path}
                    className={location.pathname === item.path ? 'active' : ''}
                    onClick={(e) => {
                      if (!e.defaultPrevented) setIsMobileMenuOpen(false)
                    }}
                  >
                    {item.name}
                  </ProtectedLink>
                ) : (
                  <Link
                    key={item.name}
                    to={item.path}
                    className={location.pathname === item.path ? 'active' : ''}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {item.name}
                  </Link>
                )
              ))}
            </nav>
            <div className="mobile-auth">
              {isSignedIn ? (
                <>
                  <Link to="/profile" onClick={() => setIsMobileMenuOpen(false)}>
                    Profile
                  </Link>
                  <button
                    className="link-btn"
                    onClick={() => {
                      setIsMobileMenuOpen(false)
                      signOut()
                    }}
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <SignInButton mode="modal">
                  <button className="btn btn-primary" onClick={() => setIsMobileMenuOpen(false)}>
                    {t('login')}
                  </button>
                </SignInButton>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header