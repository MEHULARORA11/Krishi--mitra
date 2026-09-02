import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Cloud,
  CloudLightning,
  CloudRain,
  CloudSun,
  Droplets,
  ExternalLink,
  MapPin,
  PhoneCall,
  RefreshCw,
  ShieldAlert,
  Sun,
  ThermometerSun,
  Wind,
} from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'
import { fetchWeatherDistricts, useWeatherSnapshot } from './weatherApi'
import { localizedCondition, localizedDay, weatherText } from './weatherCopy'
import '../../components/ui/ui.css'
import './WeatherScreen.css'

const IMD_WARNINGS_URL = 'https://mausam.imd.gov.in/responsive/districtWiseNowcast.php'
const KSDMA_WARNINGS_URL = 'https://sdma.kerala.gov.in/'
const PMFBY_URL = 'https://pmfby.gov.in/'

const WeatherGlyph = ({ condition, className = '' }) => {
  const normalized = condition?.toLowerCase() || ''
  const thunder = normalized.includes('thunder') || normalized.includes('lightning')
  const rain = normalized.includes('rain') || normalized.includes('drizzle')
  const cloud = rain || normalized.includes('cloud') || normalized.includes('mist')
  const Icon = thunder
    ? CloudLightning
    : rain
      ? CloudRain
      : cloud
        ? Cloud
        : normalized.includes('sun') || normalized.includes('clear')
          ? Sun
          : CloudSun

  return <Icon className={className} aria-hidden="true" />
}

const finiteNumbers = (values) => values.filter((value) => Number.isFinite(value))

const maxOr = (values, fallback = 0) => {
  const numbers = finiteNumbers(values)
  return numbers.length ? Math.max(...numbers) : fallback
}

const includesAny = (value, words) => words.some((word) => value.includes(word))

const getHazard = (weather) => {
  const hourly = weather.hourlyForecast ?? []
  const daily = weather.weeklyForecast ?? []
  const alertText = (weather.alerts ?? [])
    .flatMap((alert) => [alert.event, alert.headline, alert.description])
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  const conditionText = [weather.condition, ...hourly.map((hour) => hour.condition)]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  const combinedText = `${alertText} ${conditionText}`
  const maxRain = maxOr([
    weather.rainfallProbability,
    ...hourly.map((hour) => hour.rain),
    ...daily.map((day) => day.rain),
  ])
  const maxWind = maxOr([weather.windSpeed, ...hourly.map((hour) => hour.windSpeed)])
  const maxTemperature = maxOr([
    weather.temperature,
    ...hourly.map((hour) => hour.temp),
    ...daily.map((day) => day.high),
  ])

  if (includesAny(combinedText, ['lightning', 'thunder'])) {
    return { type: 'lightning', maxRain, maxWind, maxTemperature }
  }
  if (includesAny(combinedText, ['cyclone', 'hurricane', 'typhoon', 'gale', 'strong wind']) || maxWind >= 35) {
    return { type: 'wind', maxRain, maxWind, maxTemperature }
  }
  if (includesAny(combinedText, ['flood', 'heavy rain', 'downpour']) || maxRain >= 70) {
    return { type: 'rain', maxRain, maxWind, maxTemperature }
  }
  if (includesAny(combinedText, ['heatwave', 'heat wave']) || maxTemperature >= 38) {
    return { type: 'heat', maxRain, maxWind, maxTemperature }
  }

  return { type: 'routine', maxRain, maxWind, maxTemperature }
}

const actionKeys = {
  lightning: ['lightningAction1', 'lightningAction2', 'lightningAction3'],
  wind: ['windAction1', 'windAction2', 'windAction3'],
  rain: ['rainAction1', 'rainAction2', 'rainAction3'],
  heat: ['heatAction1', 'heatAction2', 'heatAction3'],
  general: ['generalAction1', 'generalAction2', 'generalAction3'],
  routine: ['routineAction1', 'routineAction2', 'routineAction3'],
}

const hazardCopyKeys = {
  lightning: 'thunderstorm',
  wind: 'strongWind',
  rain: 'heavyRain',
  heat: 'highHeat',
}

const getFarmerPlan = (weather, w) => {
  const hazard = getHazard(weather)
  const activeAlert = weather.alerts?.[0] ?? null
  const hasProviderAlert = Boolean(activeAlert)
  const needsPreparation = hazard.type !== 'routine'
  const level = hasProviderAlert ? 'danger' : needsPreparation ? 'watch' : 'safe'
  const title = hasProviderAlert
    ? activeAlert.headline || activeAlert.event || w('providerAlert')
    : needsPreparation
      ? w('prepareFor', { hazard: w(hazardCopyKeys[hazard.type]) })
      : w('noUrgentAction')

  const measuredSignals = []
  if (hazard.type === 'rain' || hazard.type === 'lightning') measuredSignals.push(w('rainSignal', { value: Math.round(hazard.maxRain) }))
  if (hazard.type === 'wind') measuredSignals.push(w('windSignal', { value: Math.round(hazard.maxWind) }))
  if (hazard.type === 'heat') measuredSignals.push(w('heatSignal', { value: Math.round(hazard.maxTemperature) }))

  const summary = hasProviderAlert
    ? w('alertSummary')
    : needsPreparation
      ? w('forecastSummary', { signals: measuredSignals.join(w('signalJoiner')) })
      : w('routineSummary')

  const selectedActionKeys = hasProviderAlert && hazard.type === 'routine'
    ? actionKeys.general
    : actionKeys[hazard.type] ?? actionKeys.general

  return {
    ...hazard,
    level,
    title,
    summary,
    activeAlert,
    actions: selectedActionKeys.map((key) => w(key)),
  }
}

const getFieldDecisions = (weather, w) => {
  const agriculture = weather.agriculture
  const sprayWindow = agriculture?.sprayWindow
  const irrigationTitle = weather.rainfallProbability >= 70
    ? w('pauseIrrigation')
    : weather.rainfallProbability >= 45
      ? w('reduceAndCheck')
      : w('checkSoilFirst')
  const sprayTitle = sprayWindow === 'recommended'
    ? w('possibleDryWindow')
    : !sprayWindow || sprayWindow === 'unknown'
      ? w('checkConditions')
      : w('avoidSpraying')
  const diseaseRisk = agriculture?.diseaseRisk ?? 'unknown'
  const diseaseRiskKey = diseaseRisk === 'high' ? 'riskHigh' : diseaseRisk === 'moderate' ? 'riskModerate' : 'riskLow'
  const irrigationDetail = weather.rainfallProbability >= 70
    ? w('irrigationPauseDetail')
    : weather.rainfallProbability >= 45
      ? w('irrigationReduceDetail')
      : w('irrigationCheckDetail')
  const sprayDetail = sprayWindow === 'recommended'
    ? w('sprayRecommendedDetail')
    : !sprayWindow || sprayWindow === 'unknown'
      ? w('sprayUnknownDetail')
      : w('sprayCautionDetail')
  const diseaseDetail = diseaseRisk === 'high'
    ? w('diseaseHighDetail')
    : diseaseRisk === 'moderate'
      ? w('diseaseModerateDetail')
      : w('diseaseLowDetail')

  return [
    {
      label: w('water'),
      title: irrigationTitle,
      detail: irrigationDetail,
      Icon: Droplets,
    },
    {
      label: w('spraying'),
      title: sprayTitle,
      detail: sprayDetail,
      Icon: Wind,
    },
    {
      label: w('cropCheck'),
      title: diseaseRisk === 'unknown' ? w('inspectCrops') : w('diseaseRisk', { level: w(diseaseRiskKey) }),
      detail: diseaseDetail,
      Icon: CheckCircle2,
    },
  ]
}

export default function WeatherScreen() {
  const { currentLanguage } = useLanguage()
  const [city, setCity] = useState('Thrissur')
  const [districts, setDistricts] = useState([city])
  const [emergencyOpen, setEmergencyOpen] = useState(false)
  const emergencyPanelRef = useRef(null)
  const { weather, loading, error, refresh } = useWeatherSnapshot(city)

  useEffect(() => {
    fetchWeatherDistricts().then(setDistricts)
  }, [])

  const w = useMemo(
    () => (key, params) => weatherText(currentLanguage, key, params),
    [currentLanguage],
  )
  const farmerPlan = useMemo(() => (weather ? getFarmerPlan(weather, w) : null), [weather, w])
  const fieldDecisions = useMemo(() => (weather ? getFieldDecisions(weather, w) : []), [weather, w])
  const emergencyExpanded = farmerPlan?.level === 'danger' || emergencyOpen

  const openEmergencyPlan = () => {
    setEmergencyOpen(true)
    window.requestAnimationFrame(() => {
      emergencyPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  return (
    <div className="workspace weather-screen">
      <header className="workspace__header weather-header">
        <div className="weather-header__copy">
          <p className="workspace__eyebrow">{w('eyebrow')}</p>
          <h1 className="workspace__title">{w('title')}</h1>
          <p className="workspace__lede">{w('subtitle')}</p>
        </div>

        <div className="workspace__toolbar">
          <label className="workspace-field">
            <span>{w('district')}</span>
            <select value={city} onChange={(event) => setCity(event.target.value)}>
              {districts.map((district) => (
                <option key={district} value={district}>{district}</option>
              ))}
            </select>
          </label>
          <button className="weather-emergency-trigger" type="button" onClick={openEmergencyPlan}>
            <ShieldAlert size={17} aria-hidden="true" />
            {w('emergencyPlanButton')}
          </button>
          <button className="weather-refresh-button" type="button" onClick={refresh} disabled={loading}>
            <RefreshCw className={loading ? 'weather-spin' : ''} size={16} aria-hidden="true" />
            {w('refresh')}
          </button>
        </div>
      </header>

      {loading ? (
        <div className="weather-loading workspace-panel" role="status">
          <span />
          <p>{w('loading')}</p>
        </div>
      ) : error && !weather ? (
        <div className="weather-unavailable workspace-panel" role="alert">
          <AlertTriangle size={24} aria-hidden="true" />
          <div>
            <h2>{w('unavailableTitle')}</h2>
            <p>{w('unavailableText')}</p>
            <div className="weather-unavailable__actions">
              <button type="button" onClick={refresh}><RefreshCw size={16} aria-hidden="true" />{w('tryAgain')}</button>
              <a href={IMD_WARNINGS_URL} target="_blank" rel="noreferrer">{w('checkImd')} <ExternalLink size={14} aria-hidden="true" /></a>
            </div>
          </div>
        </div>
      ) : weather && farmerPlan ? (
        <>
          <section className={`weather-priority weather-priority--${farmerPlan.level}`} aria-labelledby="weather-priority-title">
            <div className="weather-priority__signal">
              <div className="weather-priority__status">
                {farmerPlan.level === 'danger' ? <ShieldAlert aria-hidden="true" /> : farmerPlan.level === 'watch' ? <AlertTriangle aria-hidden="true" /> : <CheckCircle2 aria-hidden="true" />}
                <span>{farmerPlan.level === 'danger' ? w('actNow') : farmerPlan.level === 'watch' ? w('prepare') : w('routine')}</span>
              </div>
              <p className="weather-priority__location"><MapPin size={14} aria-hidden="true" /> {weather.location}, Kerala</p>
              <h2 id="weather-priority-title">{farmerPlan.title}</h2>
              <p className="weather-priority__summary">{farmerPlan.summary}</p>
              {farmerPlan.activeAlert?.instruction && (
                <p className="weather-priority__official"><strong>{w('officialAction')}:</strong> {farmerPlan.activeAlert.instruction}</p>
              )}
              {farmerPlan.activeAlert?.expires && (
                <small className="weather-priority__expiry">{w('shownUntil', { time: farmerPlan.activeAlert.expires })}</small>
              )}
              <div className="weather-priority__links">
                {farmerPlan.level !== 'safe' && (
                  <button className={`weather-priority__cta${farmerPlan.level === 'danger' ? ' weather-priority__cta--safety' : ''}`} type="button" onClick={openEmergencyPlan}>
                    <ShieldAlert size={16} aria-hidden="true" /> {w('openSafetySteps')}
                  </button>
                )}
                {farmerPlan.level !== 'safe' && (
                  <a className="weather-priority__cta" href={IMD_WARNINGS_URL} target="_blank" rel="noreferrer">
                    {w('officialWarning')} <ExternalLink size={13} aria-hidden="true" />
                  </a>
                )}
                <span className={`ui-badge ui-badge--${weather.dataMode === 'live' ? 'live' : 'cached'}`}>
                  {w(weather.dataMode === 'live' ? 'dataLive' : weather.dataMode === 'cached' ? 'dataCached' : 'dataUnavailable')}
                </span>
                <a className="weather-priority__source" href={weather.source?.attributionUrl || 'https://www.weatherapi.com/'} target="_blank" rel="noreferrer">
                  {w('weatherSource')}: {weather.source?.provider ?? 'WeatherAPI'}
                </a>
              </div>
            </div>

            <div className="weather-priority__actions">
              <p>{w('doFirst')}</p>
              <ol>{farmerPlan.actions.map((action) => <li key={action}>{action}</li>)}</ol>
            </div>
          </section>

          <section className="weather-today workspace-panel" aria-label={w('eyebrow')}>
            <div className="weather-today__condition">
              <WeatherGlyph condition={weather.condition} />
              <div><span>{w('now')}</span><strong>{localizedCondition(currentLanguage, weather.condition)}</strong></div>
            </div>
            <div className="weather-today__metric"><ThermometerSun aria-hidden="true" /><span>{w('temperature')}</span><strong>{weather.temperature}°C</strong></div>
            <div className="weather-today__metric"><CloudRain aria-hidden="true" /><span>{w('peakRain')}</span><strong>{Math.round(farmerPlan.maxRain)}%</strong></div>
            <div className="weather-today__metric"><Wind aria-hidden="true" /><span>{w('peakWind')}</span><strong>{Math.round(farmerPlan.maxWind)} km/h</strong></div>
          </section>

          <section className="workspace-section" aria-labelledby="field-decisions-title">
            <div className="workspace-section__heading weather-section-heading">
              <div><p>{w('fieldDecisions')}</p><h2 id="field-decisions-title">{w('checksBeforeWork')}</h2></div>
            </div>
            <div className="weather-decisions">
              {fieldDecisions.map((decision) => (
                <article key={decision.label} className="workspace-panel weather-decision-card">
                  <decision.Icon aria-hidden="true" />
                  <div><span>{decision.label}</span><h3>{decision.title}</h3><p>{decision.detail}</p></div>
                </article>
              ))}
            </div>
          </section>

          {weather.weeklyForecast.length > 0 && (
            <section className="workspace-section" aria-labelledby="short-forecast-title">
              <div className="workspace-section__heading weather-section-heading">
                <div><p>{w('nextDays')}</p><h2 id="short-forecast-title">{w('shortForecast')}</h2></div>
                <span className="workspace-section__meta">{w('coverage', { count: weather.source?.coverageDays ?? weather.weeklyForecast.length })}</span>
              </div>
              <div className="weather-daily-list">
                {weather.weeklyForecast.slice(0, 3).map((day) => (
                  <article key={day.date ?? day.day} className={`workspace-panel weather-daily-card${day.rain >= 70 ? ' weather-daily-card--rain-risk' : ''}`}>
                    <div className="weather-daily-card__top">
                      <span>{localizedDay(currentLanguage, day)}</span>
                      <WeatherGlyph condition={day.condition} />
                    </div>
                    <strong className="weather-daily-card__condition">{localizedCondition(currentLanguage, day.condition)}</strong>
                    <div className="weather-daily-card__bottom">
                      <span className="weather-daily-card__rain"><CloudRain size={14} aria-hidden="true" /> {Number.isFinite(day.rain) ? `${Math.round(day.rain)}% ${w('rain')}` : w('rainUnavailable')}</span>
                      <span className="weather-daily-card__temperatures"><b>{w('high')} {day.high}°</b><small>{w('low')} {day.low}°</small></span>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

        </>
      ) : (
        <div className="weather-unavailable workspace-panel" role="alert">
          <AlertTriangle size={24} aria-hidden="true" />
          <div><h2>{w('unavailableTitle')}</h2><p>{w('unavailableRefresh')}</p><button type="button" onClick={refresh}>{w('refresh')}</button></div>
        </div>
      )}

      <section id="weather-emergency" ref={emergencyPanelRef} className="weather-emergency workspace-panel" aria-labelledby="weather-emergency-title">
        <button
          className="weather-emergency__toggle"
          type="button"
          aria-expanded={emergencyExpanded}
          aria-controls="weather-emergency-content"
          onClick={() => setEmergencyOpen((open) => !open)}
        >
          <span id="weather-emergency-title"><ShieldAlert aria-hidden="true" /> {w('suddenDanger')}</span>
          <ChevronDown className={emergencyExpanded ? 'weather-emergency__chevron--open' : ''} aria-hidden="true" />
        </button>
        {emergencyExpanded && (
          <div id="weather-emergency-content" className="weather-emergency__body">
            <ol>
              <li><strong>{w('protectPeople')}</strong> {w('protectPeopleDetail')}</li>
              <li><strong>{w('avoidDanger')}</strong> {w('avoidDangerDetail')}</li>
              <li><strong>{w('recordLoss')}</strong> {w('recordLossDetail')}</li>
              <li><strong>{w('reportNow')}</strong> {w('reportNowDetail')}</li>
            </ol>
            <div className="weather-emergency__contacts">
              <a className="weather-emergency__call" href="tel:112"><PhoneCall size={16} aria-hidden="true" /> {w('emergency')}</a>
              <a href={KSDMA_WARNINGS_URL} target="_blank" rel="noreferrer">{w('keralaWarnings')} <ExternalLink size={13} aria-hidden="true" /></a>
              <a href={PMFBY_URL} target="_blank" rel="noreferrer">{w('insurancePortal')} <ExternalLink size={13} aria-hidden="true" /></a>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
