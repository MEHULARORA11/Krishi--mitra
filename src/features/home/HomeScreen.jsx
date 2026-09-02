import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BookOpenText,
  ChartNoAxesCombined,
  CloudSun,
  ScanLine,
} from 'lucide-react'
import { DataModeBadge } from '../../components/ui/DataModeBadge'
import { useLanguage } from '../../context/LanguageContext'
import { useWeatherSnapshot } from '../weather/weatherApi'
import '../../components/ui/ui.css'
import './HomeScreen.css'

export default function HomeScreen() {
  const { t } = useLanguage()
  const { weather, loading } = useWeatherSnapshot('Thrissur')

  const priorities = [
    {
      title: t('cropHealth'),
      text: t('cropHealthText'),
      link: '/chat',
      cta: t('openScanner'),
      tone: 'primary',
      icon: ScanLine,
    },
    {
      title: t('marketPlanning'),
      text: t('marketPlanningText'),
      link: '/market-prices',
      cta: t('viewMarkets'),
      icon: ChartNoAxesCombined,
    },
    {
      title: t('weatherWatch'),
      text: t('weatherWatchText'),
      link: '/weather',
      cta: t('seeForecast'),
      icon: CloudSun,
    },
  ]

  return (
    <div className="workspace home-screen">
      <header className="workspace__header">
        <div>
          <p className="workspace__eyebrow">{t('dailyOverview')}</p>
          <h1 className="workspace__title">{t('calmerDashboardTitle')}</h1>
          <p className="workspace__lede">{t('calmerDashboardText')}</p>
        </div>
        <Link to="/chat" className="home-hero-link">
          <ScanLine size={18} aria-hidden="true" />
          {t('startCropScan')}
          <ArrowRight size={17} aria-hidden="true" />
        </Link>
      </header>

      <section className="home-hero-grid">
        <article className="workspace-panel home-weather-card">
          {loading || !weather ? (
            <div className="home-card-loading">{t('preparingWeatherSnapshot')}</div>
          ) : (
            <>
              <div className="home-weather-card__head">
                <div>
                  <p className="workspace__eyebrow">{t('localWeather')}</p>
                  <h2>{weather.location}, Kerala</h2>
                  <span>{weather.condition}</span>
                </div>
                <DataModeBadge mode={weather.dataMode} />
              </div>

              <div className="home-weather-card__body">
                <div>
                  <strong>
                    {weather.temperature}
                    <sup>°</sup>
                  </strong>
                  <p>{t('humidityAndRainChance', weather)}</p>
                </div>
                <CloudSun className="home-weather-card__glyph" aria-hidden="true" />
              </div>

              <div className="home-weather-card__metrics">
                <div>
                  <span>{t('wind')}</span>
                  <b>{weather.windSpeed} km/h</b>
                </div>
                <div>
                  <span>{t('fieldCue')}</span>
                  <b>
                    {weather.rainfallProbability >= 50
                      ? t('drainageCheck')
                      : t('goodWorkWindow')}
                  </b>
                </div>
              </div>

              <Link to="/weather" className="home-inline-link">
                {t('viewFullWeatherOutlook')}
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </>
          )}
        </article>

        <aside className="home-priority-panel workspace-panel">
          <p className="workspace__eyebrow">{t('todaysPriorities')}</p>
          <h2>{t('decisionStackTitle')}</h2>
          <div className="home-priority-list">
            {priorities.map((item) => {
              const Icon = item.icon

              return (
                <Link
                  key={item.title}
                  to={item.link}
                  className={`home-priority-item ${
                    item.tone === 'primary' ? 'home-priority-item--primary' : ''
                  }`}
                >
                  <span className="home-priority-item__icon" aria-hidden="true">
                    <Icon size={18} />
                  </span>
                  <span>{item.title}</span>
                  <p>{item.text}</p>
                  <b>
                    {item.cta}
                    <ArrowRight size={15} aria-hidden="true" />
                  </b>
                </Link>
              )
            })}
          </div>
        </aside>
      </section>

      <section className="workspace-section">
        <div className="workspace-section__heading">
          <div>
            <p>{t('featureLanes')}</p>
            <h2>{t('coreFeaturesTitle')}</h2>
          </div>
          <span className="workspace-section__meta">
            {t('coreFeaturesMeta')}
          </span>
        </div>

        <div className="home-feature-grid">
          <article className="workspace-panel home-feature-card">
            <span className="home-feature-card__icon" aria-hidden="true"><ScanLine size={20} /></span>
            <span className="home-feature-card__tag">{t('scanner')}</span>
            <h3>{t('cropScannerTitle')}</h3>
            <p>{t('cropScannerText')}</p>
            <Link to="/chat">{t('goToScanner')} <ArrowRight size={15} aria-hidden="true" /></Link>
          </article>

          <article className="workspace-panel home-feature-card">
            <span className="home-feature-card__icon" aria-hidden="true"><ChartNoAxesCombined size={20} /></span>
            <span className="home-feature-card__tag">{t('markets')}</span>
            <h3>{t('marketPricesTitle')}</h3>
            <p>{t('marketPricesText')}</p>
            <Link to="/market-prices">{t('reviewPrices')} <ArrowRight size={15} aria-hidden="true" /></Link>
          </article>

          <article className="workspace-panel home-feature-card">
            <span className="home-feature-card__icon" aria-hidden="true"><BookOpenText size={20} /></span>
            <span className="home-feature-card__tag">{t('schemes')}</span>
            <h3>{t('knowledgeHub')}</h3>
            <p>{t('knowledgeHubText')}</p>
            <Link to="/schemes">{t('exploreSupport')} <ArrowRight size={15} aria-hidden="true" /></Link>
          </article>
        </div>
      </section>
    </div>
  )
}
