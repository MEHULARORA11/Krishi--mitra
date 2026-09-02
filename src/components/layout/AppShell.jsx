import {
  SignInButton,
  SignedIn,
  SignedOut,
  useClerk,
} from '@clerk/clerk-react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  BookOpenText,
  ChartNoAxesCombined,
  CircleHelp,
  LayoutDashboard,
  LogIn,
  LogOut,
  Map,
  Plus,
  ScanLine,
  Sprout,
  UserRoundCog,
} from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'
import '../ui/ui.css'
import './AppShell.css'

export function AppShell({ children, mode = 'live', surface = 'panel' }) {
  const { signOut } = useClerk()
  const navigate = useNavigate()
  const { t, currentLanguage, changeLanguage, languages } = useLanguage()

  const navigationItems = [
    { label: t('dashboard'), path: '/', icon: LayoutDashboard },
    { label: t('cropScanner'), path: '/chat', icon: ScanLine },
    { label: t('ndviMap'), path: '/ndvi', icon: Map },
    { label: t('knowledgeHub'), path: '/schemes', icon: BookOpenText },
    { label: t('marketPrices'), path: '/market-prices', icon: ChartNoAxesCombined },
    { label: t('profile'), path: '/profile', icon: UserRoundCog },
  ]

  return (
    <div className="platform-shell">
      <aside className="platform-sidebar">
        <div className="platform-brand">
          <div className="brand-logo">
            <span className="brand-icon-k" aria-hidden="true">
              <Sprout size={22} strokeWidth={2.2} />
            </span>
            <div className="brand-text">
              <h1>KrishiMitra</h1>
              <span>{t('fieldIntelligenceDashboard')}</span>
            </div>
          </div>
        </div>

        <div className="platform-sidebar__section">
          <p className="platform-sidebar__eyebrow">{t('workspace')}</p>
          <nav className="platform-nav" aria-label="Primary">
            {navigationItems.map((item) => {
              const Icon = item.icon

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/'}
                  className={({ isActive }) =>
                    `platform-nav__link ${isActive ? 'platform-nav__link--active' : ''}`
                  }
                >
                  <span className="nav-icon" aria-hidden="true">
                    <Icon size={23} strokeWidth={2} />
                  </span>
                  <span className="nav-label">{item.label}</span>
                </NavLink>
              )
            })}
          </nav>
        </div>

        <div className="platform-sidebar__footer">
          <label className="sidebar-language-picker">
            <span className="platform-sidebar__eyebrow">{t('language')}</span>
            <select
              aria-label={t('chooseLanguage')}
              value={currentLanguage}
              onChange={(event) => changeLanguage(event.target.value)}
            >
              {languages.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.native}
                </option>
              ))}
            </select>
          </label>

          <div className="sidebar-action">
            <button className="btn-scan" onClick={() => navigate('/chat')}>
              <Plus className="btn-icon" size={18} aria-hidden="true" />
              <span>{t('startNewScan')}</span>
            </button>
          </div>

          <div className="footer-links">
            <button className="footer-link-btn" onClick={() => navigate('/contact')}>
              <CircleHelp className="footer-link-icon" size={18} aria-hidden="true" />
              <span>{t('support')}</span>
            </button>
            <SignedIn>
              <button className="footer-link-btn" onClick={() => signOut()}>
                <LogOut className="footer-link-icon" size={18} aria-hidden="true" />
                <span>{t('logout')}</span>
              </button>
            </SignedIn>
            <SignedOut>
              <SignInButton mode="modal">
                <button className="footer-link-btn">
                  <LogIn className="footer-link-icon" size={18} aria-hidden="true" />
                  <span>{t('login')}</span>
                </button>
              </SignInButton>
            </SignedOut>
          </div>

        </div>
      </aside>

      <div className="platform-body">
        <main className="platform-main">
          <section
            className={`platform-surface ${
              surface === 'transparent' ? 'platform-surface--transparent' : ''
            }`}
          >
            {children}
          </section>
        </main>
      </div>
    </div>
  )
}
