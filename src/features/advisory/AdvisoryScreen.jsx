import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import {
  AlertTriangle,
  BadgeCheck,
  Bot,
  CalendarDays,
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CircleAlert,
  ClipboardList,
  ClipboardCheck,
  History,
  ImagePlus,
  Info,
  Leaf,
  MessageCircle,
  Mic,
  MapPin,
  RefreshCw,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sprout,
  Square,
  UploadCloud,
  UserRound,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react'
import { advisoryClient } from '../../lib/api'
import { voiceService } from '../../services/voiceService'
import { useLanguage } from '../../context/LanguageContext'
import FarmerHelper from '../../components/FarmerHelper'
import ResponseFormatter from '../../components/ResponseFormatter'
import { DataBadge } from '../../components/ui/DataBadge'
import '../../styles/ChatPage.css'
import '../../styles/ScannerPage.css'
import './AdvisoryScreen.css'
import { createAdvisoryTranslator } from './advisoryCopy'

const QUESTION_OPTIONS = {
  affectedPart: [
    ['leaf', 'partLeaf'],
    ['stem', 'partStem'],
    ['fruit_flower', 'partFruit'],
    ['root_base', 'partRoot'],
    ['whole_plant', 'partWhole'],
  ],
  symptomDuration: [
    ['today', 'durationToday'],
    ['two_three_days', 'durationTwoThree'],
    ['four_seven_days', 'durationFourSeven'],
    ['longer_week', 'durationLonger'],
    ['unsure', 'durationUnsure'],
  ],
  spreadPattern: [
    ['single_plant', 'spreadSingle'],
    ['few_plants', 'spreadFew'],
    ['patch_or_row', 'spreadPatch'],
    ['across_field', 'spreadMany'],
    ['unsure', 'spreadUnsure'],
  ],
  symptomTags: [
    ['spots_lesions', 'symptomSpots'],
    ['yellowing', 'symptomYellowing'],
    ['curling', 'symptomCurling'],
    ['wilting', 'symptomWilting'],
    ['holes_chewing', 'symptomHoles'],
    ['mould_powder', 'symptomGrowth'],
    ['rot_soft_tissue', 'symptomRot'],
  ],
  recentConditions: [
    ['heavy_rain', 'conditionRain'],
    ['high_humidity', 'conditionHumidity'],
    ['irrigation_changed', 'conditionIrrigation'],
    ['strong_heat', 'conditionHeat'],
    ['treatment_used', 'conditionTreatment'],
    ['none_unsure', 'conditionNone'],
  ],
}

const initialQuestionnaire = {
  affectedPart: '',
  symptomDuration: '',
  spreadPattern: '',
  symptomTags: [],
  recentConditions: [],
  note: '',
}

const optionLabel = (group, value, t) =>
  QUESTION_OPTIONS[group]?.find(([optionValue]) => optionValue === value)?.[1]
    ? t(QUESTION_OPTIONS[group].find(([optionValue]) => optionValue === value)[1])
    : t('notReported')

const optionListLabel = (group, values, t) =>
  values.length ? values.map((value) => optionLabel(group, value, t)).join(', ') : t('notReported')

const SERVER_CODE_KEYS = {
  routine: 'urgencyRoutine',
  soon: 'urgencySoon',
  urgent: 'urgencyUrgent',
  officer_review: 'urgencyOfficerReview',
  accepted_diagnosis: 'factorAcceptedDiagnosis',
  diagnosis_not_accepted: 'factorDiagnosisNotAccepted',
  farmer_reported_medium_severity: 'factorMediumSeverity',
  farmer_reported_high_severity: 'factorHighSeverity',
  high_humidity: 'factorHighHumidity',
  rain_favorable_conditions: 'factorRainFavorable',
  previous_zone_detection: 'factorPreviousDetection',
  image_too_small: 'qualityTooSmall',
  image_too_dark: 'qualityTooDark',
  image_overexposed: 'qualityOverexposed',
  image_low_contrast: 'qualityLowContrast',
  image_blurry: 'qualityBlurry',
  latest_clear_leaf_photo: 'missingClearLeafPhoto',
  clear_leaf_photo: 'missingClearLeafPhoto',
  clear_crop_photo: 'missingClearCropPhoto',
  crop_name: 'missingCropName',
  affected_part: 'missingAffectedPart',
  location: 'missingLocation',
  last_treatment_date: 'missingTreatmentDate',
  chemical_not_reviewed: 'reasonChemicalReview',
  requires_officer_confirmation: 'reasonOfficerConfirmation',
  soil_ph_too_low: 'reasonSoilLow',
  soil_ph_too_high: 'reasonSoilHigh',
  soil_organic_carbon_too_low: 'reasonCarbonLow',
}

const translateServerCode = (value, t) =>
  SERVER_CODE_KEYS[value] ? t(SERVER_CODE_KEYS[value]) : String(value).replaceAll('_', ' ')

const SEVERITY_META = {
  high: { color: '#dc2626', bg: '#fef2f2', border: '#fecaca', icon: ShieldAlert },
  medium: { color: '#d97706', bg: '#fffbeb', border: '#fde68a', icon: AlertTriangle },
  low: { color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', icon: ShieldCheck },
}

const parseAdvisoryDetail = (detail) => {
  if (!detail) return null

  const sectionKeys = [
    'DISEASE_SUMMARY',
    'SEVERITY',
    'IMMEDIATE_ACTION_48H',
    'AVOIDED_ACTIONS',
    'MISSING_INFORMATION',
    'UNCERTAINTY_NOTICE',
    'CALL_OFFICER_IF',
    'FARMER_TIP',
  ]

  const result = {}

  for (let i = 0; i < sectionKeys.length; i += 1) {
    const key = sectionKeys[i]
    const startIdx = detail.indexOf(`${key}:`)
    if (startIdx === -1) continue

    let endIdx = detail.length
    for (const otherKey of sectionKeys) {
      if (otherKey === key) continue
      const nextIdx = detail.indexOf(`${otherKey}:`)
      if (nextIdx > startIdx && nextIdx < endIdx) {
        endIdx = nextIdx
      }
    }

    result[key] = detail.slice(startIdx + key.length + 1, endIdx).trim()
  }

  return Object.keys(result).length > 0 ? result : null
}

const parseBulletLines = (text = '') =>
  text
    .split('\n')
    .map((line) => line.replace(/^-\s*/, '').trim())
    .filter(Boolean)

function ScanResultPanel({ result, onReset, t }) {
  const [showDetail, setShowDetail] = useState(false)
  const sevMeta = SEVERITY_META[result.severity] ?? SEVERITY_META.low
  const SevIcon = sevMeta.icon
  const parsed = parseAdvisoryDetail(result.advisory_detail)
  const immediateActions = parsed ? parseBulletLines(parsed.IMMEDIATE_ACTION_48H) : []
  const avoidedActions = parsed ? parseBulletLines(parsed.AVOIDED_ACTIONS) : []
  const missing = parsed ? parseBulletLines(parsed.MISSING_INFORMATION) : []
  const callIf = parsed?.CALL_OFFICER_IF ?? null
  const farmerTip = parsed?.FARMER_TIP ?? null
  const summary = parsed?.DISEASE_SUMMARY ?? result.advisory_short

  const riskLabel =
    result.severity === 'high'
      ? t('highRisk')
      : result.severity === 'medium'
        ? t('moderateRisk')
        : t('lowRisk')

  const recoveryLabel = result.is_healthy
    ? t('notApplicable')
    : result.severity === 'high'
      ? t('weeksHigh')
      : t('weeksMedium')

  return (
    <div className="scan-result-panel">
      <div className="srp-status-bar">
        <span className="srp-status-ok">
          <CheckCircle2 size={15} aria-hidden="true" />
          {result.is_healthy ? t('healthyStatus') : t('analysisComplete')}
        </span>
        {result.is_healthy ? (
          <span className="srp-badge srp-badge--healthy">
            <BadgeCheck size={13} aria-hidden="true" /> {t('healthy')}
          </span>
        ) : (
          <span className="srp-badge srp-badge--issue">
            <CircleAlert size={13} aria-hidden="true" /> {t('issueDetected')}
          </span>
        )}
      </div>

      <div className="srp-summary-row">
        <div className="srp-diagnosis-block">
          <p className="srp-label">{t('detectedCondition')}</p>
          <h2 className="srp-disease-name">{result.disease}</h2>
          <p className="srp-crop-tag">
            <Leaf size={14} aria-hidden="true" /> {result.crop}
          </p>

          <div className="srp-confidence-row">
            <span className="srp-label">{t('confidence')}</span>
            <span className="srp-confidence-pct">{result.confidence}%</span>
          </div>
          <div className="srp-progress-track">
            <div
              className="srp-progress-fill"
              style={{
                width: `${result.confidence}%`,
                background:
                  result.confidence >= 70
                    ? '#16a34a'
                    : result.confidence >= 45
                      ? '#d97706'
                      : '#dc2626',
              }}
            />
          </div>
        </div>

        <div className="srp-meta-block">
          <div
            className="srp-risk-card"
            style={{ background: sevMeta.bg, border: `1.5px solid ${sevMeta.border}` }}
          >
            <SevIcon size={22} color={sevMeta.color} aria-hidden="true" />
            <div>
              <p className="srp-label">{t('riskLevel')}</p>
              <b style={{ color: sevMeta.color }}>{riskLabel}</b>
            </div>
          </div>
          <div className="srp-risk-card srp-risk-card--neutral">
            <CalendarDays size={22} aria-hidden="true" />
            <div>
              <p className="srp-label">{t('recoveryTime')}</p>
              <b>{recoveryLabel}</b>
            </div>
          </div>
        </div>
      </div>

      <div className="srp-section srp-section--summary">
        <div className="srp-section-title">
          <ClipboardList size={16} aria-hidden="true" /> {t('diseaseSummary')}
        </div>
        <p>{summary}</p>
      </div>

      {immediateActions.length > 0 && (
        <div className="srp-section srp-section--actions">
          <div className="srp-section-title">
            <CheckCircle2 size={16} aria-hidden="true" /> {t('immediateActions48h')}
          </div>
          <ol className="srp-action-list">
            {immediateActions.map((action, index) => (
              <li key={index} className="srp-action-item">
                <span className="srp-action-num">{index + 1}</span>
                <span>{action}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {parsed && (
        <button
          className="srp-toggle-btn"
          onClick={() => setShowDetail((value) => !value)}
          aria-expanded={showDetail}
          type="button"
        >
          {showDetail ? (
            <><ChevronUp size={16} aria-hidden="true" /> {t('hideFullAdvisory')}</>
          ) : (
            <><ChevronDown size={16} aria-hidden="true" /> {t('seeFullAdvisory')}</>
          )}
        </button>
      )}

      {showDetail && parsed && (
        <div className="srp-detail-sections">
          {avoidedActions.length > 0 && (
            <div className="srp-section srp-section--avoided">
              <div className="srp-section-title">
                <ShieldAlert size={16} aria-hidden="true" /> {t('whatToAvoid')}
              </div>
              <ul className="srp-avoid-list">
                {avoidedActions.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          {missing.length > 0 && (
            <div className="srp-section srp-section--missing">
              <div className="srp-section-title">
                <AlertTriangle size={16} aria-hidden="true" /> {t('informationNeeded')}
              </div>
              <ul className="srp-missing-list">
                {missing.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          {callIf && (
            <div className="srp-section srp-section--officer">
              <div className="srp-section-title">
                <ShieldAlert size={16} aria-hidden="true" /> {t('callOfficerIf')}
              </div>
              <p>{callIf}</p>
            </div>
          )}

          {farmerTip && (
            <div className="srp-section srp-section--tip">
              <div className="srp-section-title">
                <Sprout size={16} aria-hidden="true" /> {t('farmerTip')}
              </div>
              <p>{farmerTip}</p>
            </div>
          )}
        </div>
      )}

      <button className="srp-reset-btn" onClick={onReset} type="button">
        <RefreshCw size={15} aria-hidden="true" /> {t('scanAnotherImage')}
      </button>
    </div>
  )
}

function GroundedScanResultPanel({
  result,
  onReset,
  fieldId,
  zoneId,
  farmerContext,
  questionnaireSaveState,
  t,
}) {
  const [followUpArea, setFollowUpArea] = useState('')
  const [followUpNote, setFollowUpNote] = useState('')
  const [followUpState, setFollowUpState] = useState('')
  const [timeline, setTimeline] = useState(null)
  const [timelineState, setTimelineState] = useState('')
  const diagnosis = result.diagnosis
  const alternatives = result.diagnoses ?? []
  const isAccepted = diagnosis.uncertainty === 'accepted'
  const severity = result.severity ?? { level: 'not_assessed', affectedAreaPercent: null }
  const spreadRisk = result.spreadRisk ?? { level: 'unknown', score: null, factors: [] }
  const statusLabel = (value) => {
    const labels = {
      high: t('scannerStatusHigh'),
      medium: t('scannerStatusMedium'),
      low: t('scannerStatusLow'),
      unknown: t('scannerStatusUnknown'),
      not_assessed: t('scannerStatusNotAssessed'),
    }
    return labels[value] ?? String(value).replaceAll('_', ' ')
  }

  const saveFollowUp = async () => {
    if (!result.analysisId) return
    setFollowUpState('saving')
    try {
      await advisoryClient.addObservation(result.analysisId, {
        affectedAreaPercent: followUpArea === '' ? null : Number(followUpArea),
        note: followUpNote || null,
        outcome: 'follow_up_logged',
      })
      setFollowUpState('saved')
    } catch (error) {
      setFollowUpState(error.message || t('followupSaveError'))
    }
  }

  const loadTimeline = async () => {
    setTimelineState('loading')
    try {
      const nextTimeline = await advisoryClient.getFieldTimeline(fieldId, zoneId || null)
      setTimeline(nextTimeline)
      setTimelineState('loaded')
    } catch (error) {
      setTimelineState(error.message || t('historyLoadError'))
    }
  }

  const confidencePercent = diagnosis.confidence === null
    ? null
    : Math.round(diagnosis.confidence * 100)
  const urgency = result.explanation?.urgency
    ? translateServerCode(result.explanation.urgency, t)
    : t('scannerStatusNotAssessed')
  const contextRows = [
    [t('observationPart'), optionLabel('affectedPart', farmerContext.affectedPart, t)],
    [t('observationDuration'), optionLabel('symptomDuration', farmerContext.symptomDuration, t)],
    [t('observationSpread'), optionLabel('spreadPattern', farmerContext.spreadPattern, t)],
    [t('observationArea'), farmerContext.affectedAreaPercent === '' ? t('notReported') : `${farmerContext.affectedAreaPercent}%`],
    [t('observationSigns'), optionListLabel('symptomTags', farmerContext.symptomTags, t)],
    [t('observationConditions'), optionListLabel('recentConditions', farmerContext.recentConditions, t)],
  ]
  const hasReportedContext = Boolean(
    farmerContext.affectedPart
      || farmerContext.symptomDuration
      || farmerContext.spreadPattern
      || farmerContext.symptomTags.length
      || farmerContext.recentConditions.length
      || farmerContext.note.trim()
      || farmerContext.affectedAreaPercent !== '',
  )
  const openQuestions = result.explanation?.questions?.length
    ? result.explanation.questions
    : result.missingData ?? []

  return (
    <div className="scan-result-panel grounded-result-panel result-v2">
      <div className={`srp-status-bar ${isAccepted ? '' : 'srp-status-bar--warning'}`}>
        {isAccepted ? <CheckCircle2 size={16} /> : <ShieldAlert size={16} />}
        <span>{isAccepted ? t('scannerAdvisoryComplete') : t('scannerRetakeVerify')}</span>
        <DataBadge mode={result.dataMode?.rules ?? 'fixture'} />
      </div>

      <section className="result-hero-card">
        <div className="result-hero-main">
          <p className="diagnosis-card__eyebrow">{t('imageBasedResult')}</p>
          <h2>{diagnosis.disease ?? t('scannerNoAcceptedDiagnosis')}</h2>
          <p className="result-crop"><Leaf size={14} /> {diagnosis.crop ?? t('scannerUploadClearer')}</p>
          <div className="result-confidence">
            <div>
              <strong>{confidencePercent === null ? '—' : `${confidencePercent}%`}</strong>
              <span>{t('confidenceMeaning')}</span>
            </div>
            <div className="result-confidence__bar" aria-hidden="true">
              <span style={{ width: `${confidencePercent ?? 0}%` }} />
            </div>
          </div>
          {!isAccepted && (
            <p className="grounded-warning">{t('scannerNoSpecificTreatment')}</p>
          )}
        </div>
        <div className="result-risk-stack">
          <div className="result-risk-item"><span>{t('scannerSeverity')}</span><strong>{statusLabel(severity.level)}</strong></div>
          <div className="result-risk-item"><span>{t('scannerSpreadRisk')}</span><strong>{statusLabel(spreadRisk.level)}{spreadRisk.score === null ? '' : ` · ${spreadRisk.score}/100`}</strong></div>
          <div className="result-risk-item"><span>{t('urgency')}</span><strong>{urgency}</strong></div>
        </div>
      </section>

      <section className="result-decision-card">
        <h3><CheckCircle2 size={17} /> {t('scannerWhatToDo')}</h3>
        <p>
          {isAccepted
            ? result.explanation?.summary ?? t('scannerStartWithReviewedOptions')
            : t('scannerRetakeInstruction')}
        </p>
        <p className="grounded-muted">{t('scannerSafetyBoundary')}</p>
      </section>

      <div className="result-grid">
        <section className="result-card">
          <h3><ShieldCheck size={16} /> {t('safeNextSteps')}</h3>
          <p className="result-card__intro">{t('scannerManagement')}</p>
          {result.approvedActions?.length ? (
            <ol className="srp-action-list">
              {result.approvedActions.map((action, index) => (
                <li key={action.id} className="srp-action-item">
                  <span className="srp-action-num">{index + 1}</span>
                  <span><b>{action.title}</b><br />{action.safeText}<small className="grounded-source">{t('reviewedSource')}: {action.sourceIds.join(', ')}</small></span>
                </li>
              ))}
            </ol>
          ) : (
            <p>{t('scannerMonitorNoSpray')}</p>
          )}
          {result.blockedActions?.length > 0 && (
            <p className="grounded-warning">{t('scannerBlockedOptions')}: {result.blockedActions.map((item) => `${item.title} (${item.reasonCodes.map((code) => translateServerCode(code, t)).join(', ')})`).join('; ')}</p>
          )}
        </section>

        <section className="result-card">
          <h3><ClipboardList size={16} /> {t('reportedContext')}</h3>
          <p className="result-card__intro">{t(hasReportedContext ? 'reportedContextNote' : 'noReportedContext')}</p>
          <dl className="reported-context-list">
            {contextRows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
          </dl>
          {questionnaireSaveState === 'saved' && <p className="reported-save-state"><CheckCircle2 size={14} /> {t('questionnaireSaved')}</p>}
          {questionnaireSaveState === 'unsaved' && <p className="reported-save-state reported-save-state--warning"><AlertTriangle size={14} /> {t('questionnaireNotSaved')}</p>}
        </section>
      </div>

      <div className="result-details">
        <details className="result-detail">
          <summary><ImagePlus size={16} /> {t('evidenceAndQuality')}</summary>
          <div className="result-detail__body">
            {result.imageQuality && (
              <>
                <p><b>{t('scannerImageQuality')}:</b> {result.imageQuality.status === 'usable' ? t('scannerUsableQuality') : t('scannerRetakeQuality')}</p>
                {result.imageQuality.reasons.length > 0 && <p><b>{t('qualityReasons')}:</b> {result.imageQuality.reasons.map((code) => translateServerCode(code, t)).join(', ')}</p>}
              </>
            )}
            {spreadRisk.factors?.length > 0 && <p><b>{t('scannerFactors')}:</b> {spreadRisk.factors.map((code) => translateServerCode(code, t)).join(', ')}</p>}
            <p><b>{t('scannerAffectedArea')}:</b> {severity.affectedAreaPercent === null ? t('scannerStatusNotAssessed') : t('scannerAffectedAreaReported', { area: severity.affectedAreaPercent })}</p>
          </div>
        </details>

        <details className="result-detail">
          <summary><ClipboardCheck size={16} /> {t('alternativeMatches')}</summary>
          <div className="result-detail__body">
            <ol className="srp-action-list">
              {alternatives.map((item) => (
                <li key={item.rawClass} className="srp-action-item">
                  <span className="srp-action-num">{Math.round(item.confidence * 100)}%</span>
                  <span>{item.crop} — {item.disease}{item.healthy ? ` (${t('scannerHealthyClass')})` : ''}</span>
                </li>
              ))}
            </ol>
          </div>
        </details>

        <details className="result-detail">
          <summary><CircleAlert size={16} /> {t('openQuestions')}</summary>
          <div className="result-detail__body">
            {openQuestions.length ? <ul>{openQuestions.map((question) => <li key={question}>{translateServerCode(question, t)}</li>)}</ul> : <p>{t('noExtraQuestions')}</p>}
          </div>
        </details>

        <details className="result-detail">
          <summary><History size={16} /> {t('monitoringAndHistory')}</summary>
          <div className="result-detail__body">
            <section className="grounded-followup">
              <p>{t('scannerFollowupDescription')}</p>
              <div className="grounded-followup__controls">
                <label>{t('scannerAffectedAreaShort')}<input type="number" min="0" max="100" value={followUpArea} onChange={(event) => setFollowUpArea(event.target.value)} /></label>
                <label>{t('scannerObservationNote')}<input value={followUpNote} onChange={(event) => setFollowUpNote(event.target.value)} placeholder={t('scannerObservationPlaceholder')} /></label>
                <button type="button" className="srp-reset-btn" onClick={saveFollowUp} disabled={followUpState === 'saving'}>{t('scannerSaveFollowup')}</button>
              </div>
              {followUpState === 'saved' && <p className="grounded-success">{t('scannerFollowupSaved', { scope: zoneId ? t('scannerZone') : t('scannerField') })}</p>}
              {followUpState && followUpState !== 'saving' && followUpState !== 'saved' && <p className="grounded-warning">{followUpState}</p>}
            </section>
            <hr />
            <p><MapPin size={14} /> {result.contextUsed?.field?.name ?? fieldId}</p>
            <p><b>{t('scannerWeather')}:</b> {result.contextUsed?.weather?.summary ?? t('scannerUnavailable')}</p>
            <p><b>{t('scannerSoil')}:</b> {result.contextUsed?.soil?.summary ?? t('scannerSoilUnavailable')}</p>
            <button type="button" className="srp-reset-btn" onClick={loadTimeline} disabled={timelineState === 'loading'}>
              {timelineState === 'loading' ? t('scannerLoadingHistory') : t('scannerLoadHistory')}
            </button>
            {timeline && <p className="grounded-success">{t('scannerTimelineSummary', { scans: timeline.detections.length, observations: timeline.observations.length, scope: zoneId ? t('scannerZone') : t('scannerField') })}</p>}
            {timelineState && !['loading', 'loaded'].includes(timelineState) && <p className="grounded-warning">{timelineState}</p>}
          </div>
        </details>
      </div>

      <div className="result-final-action">
        <button className="srp-reset-btn" onClick={onReset} type="button"><RefreshCw size={15} /> {t('scannerScanAnother')}</button>
      </div>
    </div>
  )
}

function ScanLoadingSkeleton({ t }) {
  return (
    <div className="scan-loading-panel" aria-live="polite" aria-label={t('analyzingImageLabel')}>
      <div className="skel-spinner" />
      <p className="skel-label">{t('analyzingCropImage')}</p>
      <p className="skel-sublabel">{t('scannerLoadingDetail')}</p>
      <div className="skel-bars">
        <div className="skel-bar" style={{ width: '80%' }} />
        <div className="skel-bar" style={{ width: '60%' }} />
        <div className="skel-bar" style={{ width: '70%' }} />
      </div>
    </div>
  )
}

export default function AdvisoryScreen() {
  const { t: baseTranslate, currentLanguage } = useLanguage()
  const t = useMemo(
    () => createAdvisoryTranslator(baseTranslate, currentLanguage),
    [baseTranslate, currentLanguage],
  )

  const getWelcomeMessage = useCallback(() => t('welcomeMessage'), [t])

  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'bot',
      content: getWelcomeMessage(),
      timestamp: new Date().toLocaleTimeString(),
    },
  ])
  const [inputText, setInputText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [voiceEnabled, setVoiceEnabled] = useState(true)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [scanImage, setScanImage] = useState(null)
  const [pendingImageFile, setPendingImageFile] = useState(null)
  const [pendingImageName, setPendingImageName] = useState('')
  const [scanResult, setScanResult] = useState(null)
  const [scanError, setScanError] = useState(null)
  const [scanning, setScanning] = useState(false)
  const [workspace, setWorkspace] = useState(null)
  const [workspaceError, setWorkspaceError] = useState(null)
  const [workspaceLoading, setWorkspaceLoading] = useState(true)
  const [settingUpWorkspace, setSettingUpWorkspace] = useState(false)
  const [selectedFieldId, setSelectedFieldId] = useState('')
  const [selectedZoneId, setSelectedZoneId] = useState('')
  const [affectedAreaPercent, setAffectedAreaPercent] = useState('')
  const [questionnaire, setQuestionnaire] = useState(initialQuestionnaire)
  const [questionnaireSaveState, setQuestionnaireSaveState] = useState('')
  const [isQuestionnaireOpen, setIsQuestionnaireOpen] = useState(false)
  const [isDraggingImage, setIsDraggingImage] = useState(false)

  const messagesEndRef = useRef(null)
  const fileInputRef = useRef(null)
  const recognitionRef = useRef(null)
  const questionnaireDialogRef = useRef(null)
  const questionnaireTriggerRef = useRef(null)
  const maxImageSize = 10 * 1024 * 1024
  const supportedTypes = ['image/jpeg', 'image/png', 'image/webp']

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    const dialog = questionnaireDialogRef.current
    if (!dialog) return undefined

    if (isQuestionnaireOpen && !dialog.open) {
      dialog.showModal()
    } else if (!isQuestionnaireOpen && dialog.open) {
      dialog.close()
    }

    return undefined
  }, [isQuestionnaireOpen])

  useEffect(() => {
    setMessages([
      {
        id: 1,
        type: 'bot',
        content: getWelcomeMessage(),
        timestamp: new Date().toLocaleTimeString(),
      },
    ])
  }, [currentLanguage, getWelcomeMessage])

  const selectFirstContext = useCallback((nextWorkspace) => {
    const firstField = nextWorkspace?.farms?.flatMap((farm) => farm.fields ?? [])[0]
    setSelectedFieldId(firstField?.id ?? '')
    setSelectedZoneId(firstField?.zones?.[0]?.id ?? '')
  }, [])

  const loadWorkspace = useCallback(async () => {
    setWorkspaceLoading(true)
    setWorkspaceError(null)
    try {
      const nextWorkspace = await advisoryClient.getFarmWorkspace()
      setWorkspace(nextWorkspace)
      selectFirstContext(nextWorkspace)
    } catch (error) {
      setWorkspaceError(error.message || t('workspaceLoadError'))
    } finally {
      setWorkspaceLoading(false)
    }
  }, [selectFirstContext, t])

  useEffect(() => {
    loadWorkspace()
  }, [loadWorkspace])

  const prepareDemoWorkspace = async () => {
    setSettingUpWorkspace(true)
    setWorkspaceError(null)
    try {
      await advisoryClient.createDemoWorkspace()
      await loadWorkspace()
    } catch (error) {
      setWorkspaceError(error.message || t('workspaceSetupError'))
    } finally {
      setSettingUpWorkspace(false)
    }
  }

  const selectedField = workspace?.farms
    ?.flatMap((farm) => farm.fields ?? [])
    .find((field) => field.id === selectedFieldId)

  const essentialAnswers = [
    questionnaire.affectedPart,
    questionnaire.symptomDuration,
    questionnaire.spreadPattern,
  ]
  const completedEssentials = essentialAnswers.filter(Boolean).length
  const questionnaireComplete = completedEssentials === essentialAnswers.length
  const hasFarmerContext = Boolean(
    completedEssentials
      || questionnaire.symptomTags.length
      || questionnaire.recentConditions.length
      || questionnaire.note.trim()
      || affectedAreaPercent !== '',
  )

  const setQuestionnaireValue = (key, value) => {
    setQuestionnaire((current) => ({ ...current, [key]: value }))
  }

  const toggleQuestionnaireValue = (key, value) => {
    setQuestionnaire((current) => {
      const values = current[key]
      const isNoneOption = value === 'none_unsure'
      const nextValues = values.includes(value)
        ? values.filter((item) => item !== value)
        : isNoneOption
          ? [value]
          : [...values.filter((item) => item !== 'none_unsure'), value]
      return { ...current, [key]: nextValues }
    })
  }

  const speakResponse = async (text) => {
    if (!voiceEnabled || !text) return

    try {
      setIsSpeaking(true)
      const clean = text
        .replace(/[#*_`]/g, '')
        .replace(/\p{Extended_Pictographic}/gu, '')
        .replace(/\u200d/gu, '')
        .replace(/\ufe0f/gu, '')
        .replace(/\n+/g, '. ')
        .trim()
      await voiceService.speak(clean, currentLanguage, {
        rate: 0.9,
        pitch: 1,
        volume: 0.8,
      })
    } catch (error) {
      console.warn('Speech synthesis failed:', error)
    } finally {
      setIsSpeaking(false)
    }
  }

  const handleSendMessage = async () => {
    if (!inputText.trim()) return

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: inputText,
      timestamp: new Date().toLocaleTimeString(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInputText('')
    setIsLoading(true)

    try {
      const response = await advisoryClient.generateResponse(inputText, currentLanguage)
      const botMessage = {
        id: Date.now() + 1,
        type: 'bot',
        content: response.response,
        timestamp: new Date().toLocaleTimeString(),
      }
      setMessages((prev) => [...prev, botMessage])
      if (voiceEnabled && response.response) {
        speakResponse(response.response)
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          type: 'bot',
          content: t('chatError'),
          timestamp: new Date().toLocaleTimeString(),
          isError: true,
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      handleSendMessage()
    }
  }

  const readImagePreview = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = () => reject(new Error(t('imageReadError')))
      reader.readAsDataURL(file)
    })

  const handleImageSelection = async (file) => {
    if (!file) return

    setScanError(null)
    setScanResult(null)

    if (!supportedTypes.includes(file.type)) {
      setScanError(t('chooseImageFormat'))
      return
    }

    if (file.size > maxImageSize) {
      setScanError(t('imageTooLarge'))
      return
    }

    try {
      const preview = await readImagePreview(file)
      setScanImage(preview)
      setPendingImageFile(file)
      setPendingImageName(file.name)
    } catch (error) {
      setScanError(error?.message || t('imageReadError'))
    }
  }

  const handleAnalyzeImage = async () => {
    if (!pendingImageFile) return
    let activeFieldId = selectedFieldId

    if (!activeFieldId) {
      if (!workspace?.farms?.length) {
        try {
          setSettingUpWorkspace(true)
          const created = await advisoryClient.createDemoWorkspace()
          await loadWorkspace()
          activeFieldId = created?.field?.id || ''
          if (created?.field?.id) {
            setSelectedFieldId(created.field.id)
            setSelectedZoneId(created.zone?.id || '')
          }
        } catch {
          setScanError(t('scannerSelectFieldFirst'))
          return
        } finally {
          setSettingUpWorkspace(false)
        }
      }
      if (!activeFieldId) {
        setScanError(t('scannerSelectFieldFirst'))
        return
      }
    }

    setScanError(null)
    setScanning(true)
    setQuestionnaireSaveState(hasFarmerContext ? 'saving' : '')

    try {
      const result = await advisoryClient.analyzeImageV1({
        imageFile: pendingImageFile,
        fieldId: activeFieldId,
        zoneId: selectedZoneId || null,
        language: currentLanguage,
        affectedAreaPercent,
      })
      setScanResult(result)

      if (result.analysisId && hasFarmerContext) {
        const observationLines = [
          `Affected part: ${questionnaire.affectedPart}`,
          `First noticed: ${questionnaire.symptomDuration}`,
          `Spread pattern: ${questionnaire.spreadPattern}`,
          `Visible signs: ${questionnaire.symptomTags.join(', ') || 'not_reported'}`,
          `Recent context: ${questionnaire.recentConditions.join(', ') || 'not_reported'}`,
          questionnaire.note.trim() ? `Farmer note: ${questionnaire.note.trim()}` : null,
        ].filter(Boolean)

        try {
          await advisoryClient.addObservation(result.analysisId, {
            affectedAreaPercent: affectedAreaPercent === '' ? null : Number(affectedAreaPercent),
            outcome: 'initial_questionnaire',
            note: observationLines.join('\n'),
          })
          setQuestionnaireSaveState('saved')
        } catch {
          setQuestionnaireSaveState('unsaved')
        }
      }

      if (voiceEnabled) {
        const spokenText = result.diagnosis?.disease
          ? t('spokenDiagnosis', {
            disease: result.diagnosis.disease,
            crop: result.diagnosis.crop,
            confidence: Math.round((result.diagnosis.confidence ?? 0) * 100),
            summary: result.explanation?.summary ?? '',
          })
          : t('spokenRetake')
        speakResponse(spokenText)
      }
    } catch (error) {
      setQuestionnaireSaveState('')
      const message = error?.message?.includes('Unable to reach')
        ? t('analysisServiceUnavailable')
        : error?.message || t('analysisRetryHint')
      setScanError(message)
    } finally {
      setScanning(false)
    }
  }

  const handleReset = () => {
    setScanImage(null)
    setPendingImageFile(null)
    setPendingImageName('')
    setScanResult(null)
    setScanError(null)
    setAffectedAreaPercent('')
    setQuestionnaire(initialQuestionnaire)
    setQuestionnaireSaveState('')
    setIsQuestionnaireOpen(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const startVoiceRecognition = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert(t('voiceRecognitionUnsupported'))
      return
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    recognitionRef.current = new SpeechRecognition()
    recognitionRef.current.continuous = false
    recognitionRef.current.interimResults = false

    const langMap = { en: 'en-US', ml: 'ml-IN', hi: 'hi-IN' }
    recognitionRef.current.lang = langMap[currentLanguage] || 'en-US'
    recognitionRef.current.onstart = () => setIsListening(true)
    recognitionRef.current.onresult = (event) => {
      setInputText(event.results[0][0].transcript)
      setIsListening(false)
    }
    recognitionRef.current.onerror = () => setIsListening(false)
    recognitionRef.current.onend = () => setIsListening(false)
    recognitionRef.current.start()
  }

  const toggleVoice = () => {
    if (isSpeaking) {
      voiceService.stop()
      setIsSpeaking(false)
    }
    setVoiceEnabled(!voiceEnabled)
  }

  const closeQuestionnaire = () => {
    setIsQuestionnaireOpen(false)
    window.requestAnimationFrame(() => questionnaireTriggerRef.current?.focus())
  }

  const scannerStep = scanResult ? 4 : scanImage ? 3 : selectedFieldId ? 2 : 1
  const scanSteps = [
    { number: 1, title: t('stepFieldTitle'), detail: t('stepFieldDetail') },
    { number: 2, title: t('stepSymptomsTitle'), detail: t('stepSymptomsDetail') },
    { number: 3, title: t('stepPhotoTitle'), detail: t('stepPhotoDetail') },
    { number: 4, title: t('stepGuidanceTitle'), detail: t('stepGuidanceDetail') },
  ]

  return (
    <div className="scanner-page">
      <div className="diagnosis-workflow">
        <header className="diagnosis-hero">
          <div>
            <p className="diagnosis-eyebrow">{t('diagnosisEyebrow')}</p>
            <h1>{t('diagnosisTitle')}</h1>
            <p>{t('diagnosisSubtitle')}</p>
          </div>
        </header>

        <ol className="diagnosis-steps" aria-label={t('scannerStepsLabel')}>
          {scanSteps.map((step) => {
            const isComplete = scannerStep > step.number
            const isCurrent = scannerStep === step.number
            return (
              <li key={step.number} className={`diagnosis-step ${isComplete ? 'diagnosis-step--complete' : ''} ${isCurrent ? 'diagnosis-step--current' : ''}`}>
                <span className="diagnosis-step__number">{isComplete ? <CheckCircle2 size={16} /> : step.number}</span>
                <span><b>{step.title}</b><small>{step.detail}</small></span>
              </li>
            )
          })}
        </ol>

        {!scanResult && (
          <div className="diagnosis-intake-grid">
            <section className="diagnosis-card diagnosis-photo-card">
              <div className="diagnosis-card__header">
                <div>
                  <p className="diagnosis-card__eyebrow">{t('photoEyebrow')}</p>
                  <h2>{t('scannerPhotoTitle')}</h2>
                  <p>{t('scannerPhotoDescription')}</p>
                </div>
              </div>

              <section className="scanner-upload-area">
                <button
                  className={`upload-box ${scanImage ? 'upload-box--has-image' : ''} ${isDraggingImage ? 'upload-box--dragging' : ''}`}
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  onDragEnter={(event) => { event.preventDefault(); if (!scanning) setIsDraggingImage(true) }}
                  onDragOver={(event) => event.preventDefault()}
                  onDragLeave={() => setIsDraggingImage(false)}
                  onDrop={(event) => {
                    event.preventDefault()
                    setIsDraggingImage(false)
                    const file = event.dataTransfer.files?.[0]
                    if (file && !scanning) handleImageSelection(file)
                  }}
                  disabled={scanning}
                  aria-label={t('uploadCropImage')}
                >
                  {scanImage ? (
                    <img className="scanner-preview" src={scanImage} alt={t('photoAlt')} />
                  ) : (
                    <>
                      <span className="upload-icon-wrapper"><UploadCloud className="upload-icon" aria-hidden="true" /></span>
                      <h2>{t('scannerPhotoTitle')}</h2>
                      <p>{t('scannerPhotoDescription')}</p>
                      <span className="btn-browse"><ImagePlus size={18} aria-hidden="true" />{t('browseFiles')}</span>
                    </>
                  )}
                </button>

                <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => {
                  const file = event.target.files?.[0]
                  event.target.value = ''
                  if (file) handleImageSelection(file)
                }} style={{ display: 'none' }} />

                {scanImage && !scanning && (
                  <div className="scanner-photo-review">
                    <div>
                      <p className="scanner-photo-review__label"><Camera size={16} /> {t('scannerPhotoReady')}</p>
                      <p className="scanner-photo-review__name">{pendingImageName || t('scannerSelectedImage')}</p>
                    </div>
                    <div className="scanner-img-actions">
                      <button className="btn-rescan" type="button" onClick={() => fileInputRef.current?.click()}><RefreshCw size={15} /> {t('scannerReplacePhoto')}</button>
                      <button className="scanner-analyze-btn" type="button" onClick={handleAnalyzeImage}><Leaf size={17} /> {t('scannerAnalyzePhoto')}</button>
                    </div>
                  </div>
                )}

                {!scanImage && !scanning && (
                  <aside className="scanner-photo-guide" aria-label={t('scannerPhotoTipsLabel')}>
                    <div className="scanner-photo-guide__title"><Camera size={17} /> {t('scannerPhotoGuideTitle')}</div>
                    <ul><li>{t('scannerPhotoTipOne')}</li><li>{t('scannerPhotoTipTwo')}</li><li>{t('scannerPhotoTipThree')}</li></ul>
                  </aside>
                )}
              </section>
            </section>

            <aside className="diagnosis-intake-side">
              <section className="diagnosis-card diagnosis-side-card" aria-label={t('scannerContextLabel')}>
                <div className="diagnosis-card__header">
                  <div>
                    <p className="diagnosis-card__eyebrow">{t('fieldEyebrow')}</p>
                    <h2>{t('fieldTitle')}</h2>
                    <p>{t('fieldDescription')}</p>
                  </div>
                </div>
                {workspaceLoading ? (
                  <p className="grounded-muted">{t('scannerWorkspaceLoading')}</p>
                ) : selectedField ? (
                  <div className="diagnosis-field-grid diagnosis-field-grid--stacked">
                    <label>{t('scannerField')}
                      <select value={selectedFieldId} onChange={(event) => {
                        const fieldId = event.target.value
                        const field = workspace?.farms?.flatMap((farm) => farm.fields ?? []).find((item) => item.id === fieldId)
                        setSelectedFieldId(fieldId)
                        setSelectedZoneId(field?.zones?.[0]?.id ?? '')
                      }}>
                        {workspace?.farms?.flatMap((farm) => farm.fields ?? []).map((field) => (
                          <option key={field.id} value={field.id}>{field.name}</option>
                        ))}
                      </select>
                    </label>
                    <label>{t('scannerZone')}
                      <select value={selectedZoneId} onChange={(event) => setSelectedZoneId(event.target.value)}>
                        <option value="">{t('scannerWholeField')}</option>
                        {(selectedField.zones ?? []).map((zone) => <option key={zone.id} value={zone.id}>{zone.name}</option>)}
                      </select>
                    </label>
                  </div>
                ) : (
                  <div className="scanner-context-actions">
                    <p>{t('scannerDemoWorkspaceDescription')}</p>
                    <button type="button" className="srp-reset-btn" onClick={prepareDemoWorkspace} disabled={settingUpWorkspace}>
                      <Sprout size={16} /> {settingUpWorkspace ? t('scannerPreparingWorkspace') : t('scannerPrepareWorkspace')}
                    </button>
                  </div>
                )}
                {workspaceError && <p className="grounded-warning">{workspaceError}</p>}
              </section>

              <section className="diagnosis-card diagnosis-side-card diagnosis-observation-card">
                <div>
                  <p className="diagnosis-card__eyebrow">{t('questionnaireEyebrow')}</p>
                  <h2>{t('questionnaireTitle')}</h2>
                  <p>{t('observationsOptional')}</p>
                </div>
                <div className="context-completeness">
                  <span>{questionnaireComplete ? t('essentialsComplete') : t('essentialsProgress', { complete: completedEssentials, total: 3 })}</span>
                  <div className="context-completeness__track"><div className="context-completeness__fill" style={{ width: `${(completedEssentials / 3) * 100}%` }} /></div>
                </div>
                <button
                  ref={questionnaireTriggerRef}
                  className="questionnaire-open-button"
                  type="button"
                  onClick={() => setIsQuestionnaireOpen(true)}
                >
                  <ClipboardList size={17} /> {hasFarmerContext ? t('editObservations') : t('addObservations')}
                </button>
              </section>
            </aside>
          </div>
        )}

        <dialog
          ref={questionnaireDialogRef}
          className="questionnaire-dialog"
          aria-labelledby="questionnaire-dialog-title"
          onCancel={() => setIsQuestionnaireOpen(false)}
          onClose={() => {
            setIsQuestionnaireOpen(false)
            window.requestAnimationFrame(() => questionnaireTriggerRef.current?.focus())
          }}
          onClick={(event) => {
            if (event.target === event.currentTarget) closeQuestionnaire()
          }}
        >
          <div className="questionnaire-dialog__surface">
            <header className="questionnaire-dialog__header">
              <div>
                <p className="diagnosis-card__eyebrow">{t('questionnaireEyebrow')}</p>
                <h2 id="questionnaire-dialog-title">{t('questionnaireModalTitle')}</h2>
                <p>{t('questionnaireModalDescription')}</p>
              </div>
              <button type="button" className="questionnaire-dialog__close" onClick={closeQuestionnaire} aria-label={t('closeQuestionnaire')}><X size={20} /></button>
            </header>

            <div className="questionnaire-dialog__body">
              <div className="context-completeness">
                <span>{questionnaireComplete ? t('essentialsComplete') : t('essentialsProgress', { complete: completedEssentials, total: 3 })}</span>
                <div className="context-completeness__track"><div className="context-completeness__fill" style={{ width: `${(completedEssentials / 3) * 100}%` }} /></div>
              </div>

              <div className="question-grid">
                {[
                  ['affectedPart', 'affectedPart', 'affectedPart'],
                  ['symptomDuration', 'firstNoticed', 'symptomDuration'],
                  ['spreadPattern', 'spreadPattern', 'spreadPattern'],
                ].map(([stateKey, labelKey, optionGroup]) => (
                  <div className="question-block" key={stateKey}>
                    <label>{t(labelKey)}
                      <select value={questionnaire[stateKey]} onChange={(event) => setQuestionnaireValue(stateKey, event.target.value)}>
                        <option value="">{t('selectOne')}</option>
                        {QUESTION_OPTIONS[optionGroup].map(([value, copyKey]) => <option key={value} value={value}>{t(copyKey)}</option>)}
                      </select>
                    </label>
                  </div>
                ))}

                <div className="question-block">
                  <span className="question-label">{t('affectedAreaQuestion')}</span>
                  <div className="area-estimate">
                    <input
                      aria-label={t('affectedAreaQuestion')}
                      type="number"
                      min="0"
                      max="100"
                      value={affectedAreaPercent}
                      onChange={(event) => {
                        const value = event.target.value
                        if (value === '' || (Number(value) >= 0 && Number(value) <= 100)) setAffectedAreaPercent(value)
                      }}
                      placeholder="%"
                    />
                    <span>{t('affectedAreaHint')}</span>
                  </div>
                </div>

                <div className="question-block question-block--wide">
                  <span className="question-label"><span>{t('symptomsSeen')}</span><small>{t('optionalChooseAll')}</small></span>
                  <div className="choice-grid">
                    {QUESTION_OPTIONS.symptomTags.map(([value, copyKey]) => (
                      <label className="choice-chip" key={value}>
                        <input type="checkbox" checked={questionnaire.symptomTags.includes(value)} onChange={() => toggleQuestionnaireValue('symptomTags', value)} />
                        <span>{t(copyKey)}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="question-block question-block--wide">
                  <span className="question-label"><span>{t('recentConditions')}</span><small>{t('optionalChooseAll')}</small></span>
                  <div className="choice-grid">
                    {QUESTION_OPTIONS.recentConditions.map(([value, copyKey]) => (
                      <label className="choice-chip" key={value}>
                        <input type="checkbox" checked={questionnaire.recentConditions.includes(value)} onChange={() => toggleQuestionnaireValue('recentConditions', value)} />
                        <span>{t(copyKey)}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="question-full">
                  <label>{t('farmerNote')}
                    <textarea value={questionnaire.note} maxLength={500} onChange={(event) => setQuestionnaireValue('note', event.target.value)} placeholder={t('farmerNotePlaceholder')} />
                  </label>
                </div>
              </div>
              <p className="questionnaire-note"><Info size={16} /> {t('questionnaireUseNote')}</p>
            </div>

            <footer className="questionnaire-dialog__footer">
              <button type="button" className="questionnaire-use-button" onClick={closeQuestionnaire}><CheckCircle2 size={17} /> {t('useTheseDetails')}</button>
            </footer>
          </div>
        </dialog>

        <section className="scanner-results-area">
        {scanning && <ScanLoadingSkeleton t={t} />}

        {!scanning && scanError && (
          <div className="scan-error-panel" role="alert">
            <CircleAlert size={24} color="#dc2626" aria-hidden="true" />
            <div>
              <strong>{t('analysisFailed')}</strong>
              <p>{scanError}</p>
            </div>
            <button className="srp-reset-btn" onClick={handleReset} type="button">
              {t('tryAgain')}
            </button>
          </div>
        )}

        {!scanning && scanResult && (
          scanResult.analysisId ? (
            <GroundedScanResultPanel
              result={scanResult}
              onReset={handleReset}
              fieldId={selectedFieldId}
              zoneId={selectedZoneId}
              farmerContext={{ ...questionnaire, affectedAreaPercent }}
              questionnaireSaveState={questionnaireSaveState}
              t={t}
            />
          ) : (
            <ScanResultPanel result={scanResult} onReset={handleReset} t={t} />
          )
        )}
        </section>
      </div>

      <div className={`floating-chat-wrapper ${isChatOpen ? 'open' : ''}`}>
        {!isChatOpen && (
          <button
            className="floating-chat-btn"
            onClick={() => setIsChatOpen(true)}
            aria-label={t('openChat')}
            type="button"
          >
            <MessageCircle size={28} />
          </button>
        )}

        {isChatOpen && (
          <section className="scanner-chat-section">
            <div className="chat-container">
              <div className="chat-header">
                <div className="chat-header-content">
                  <div className="chat-avatar">
                    <Sprout className="avatar-icon" aria-hidden="true" />
                  </div>
                  <div className="chat-info">
                    <h2 className="chat-title">{t('cropAdvisoryChat')}</h2>
                    <p className="chat-subtitle">
                      {t('cropAdvisoryChatSubtitle')} <DataBadge mode="live" />
                    </p>
                  </div>
                  <div className="chat-controls">
                    <button
                      className={`voice-toggle-btn ${voiceEnabled ? 'enabled' : 'disabled'}`}
                      onClick={toggleVoice}
                      title={voiceEnabled ? t('disableVoiceResponses') : t('enableVoiceResponses')}
                      type="button"
                    >
                      {voiceEnabled ? <Volume2 aria-hidden="true" /> : <VolumeX aria-hidden="true" />}
                    </button>

                    {isSpeaking && (
                      <button
                        className="stop-speaking-btn"
                        onClick={() => {
                          voiceService.stop()
                          setIsSpeaking(false)
                        }}
                        title={t('stopSpeakingTitle')}
                        type="button"
                      >
                        <Square aria-hidden="true" />
                      </button>
                    )}

                    <button
                      className="close-chat-btn"
                      onClick={() => setIsChatOpen(false)}
                      title={t('closeChat')}
                      type="button"
                    >
                      <X size={20} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="chat-messages">
                {messages.length === 1 && (
                  <FarmerHelper onQuestionSelect={(question) => setInputText(question)} />
                )}

                {messages.map((message) => (
                  <div key={message.id} className={`message ${message.type}`}>
                    <div className="message-content">
                      {message.type === 'bot' && (
                        <div className="message-avatar"><Bot aria-hidden="true" /></div>
                      )}

                      <div className="message-bubble">
                        {message.type === 'bot' && !message.isError ? (
                          <ResponseFormatter content={message.content} />
                        ) : (
                          <p className={message.isError ? 'error-text' : ''}>{message.content}</p>
                        )}
                        <span className="message-time">{message.timestamp}</span>
                      </div>

                      {message.type === 'user' && (
                        <div className="message-avatar"><UserRound aria-hidden="true" /></div>
                      )}
                    </div>
                  </div>
                ))}

                {isLoading && (
                  <div className="message bot">
                    <div className="message-content">
                      <div className="message-avatar"><Bot aria-hidden="true" /></div>
                      <div className="message-bubble typing">
                        <div className="typing-indicator">
                          <span /><span /><span />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              <div className="chat-input-container">
                <div className="chat-input-wrapper">
                  <button
                    className={`input-action-btn ${isListening ? 'listening' : ''}`}
                    onClick={startVoiceRecognition}
                    title={t('voiceInput')}
                    type="button"
                  >
                    <Mic aria-hidden="true" />
                  </button>

                  <textarea
                    value={inputText}
                    onChange={(event) => setInputText(event.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={t('askQuestion')}
                    className="chat-input"
                    rows="1"
                  />

                  <button
                    onClick={handleSendMessage}
                    disabled={!inputText.trim() || isLoading}
                    className="send-btn"
                    type="button"
                  >
                    <Send className="send-icon" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
