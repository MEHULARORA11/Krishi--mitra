import { useState } from 'react'
import {
  ExternalLink,
  FileCheck2,
  Files,
  Landmark,
  MapPin,
} from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'
import { DataModeBadge } from '../../components/ui/DataModeBadge'
import { useSchemes } from './schemesApi'
import '../../components/ui/ui.css'
import './SchemesScreen.css'

const localeMap = {
  en: 'en-IN',
  hi: 'hi-IN',
  ml: 'ml-IN',
}

export default function SchemesScreen() {
  const { t, currentLanguage } = useLanguage()
  const categories = [
    { value: '', label: t('allSupportTypes') },
    { value: 'Crop Insurance', label: t('cropInsurance') },
    { value: 'Income Support', label: t('incomeSupport') },
    { value: 'Credit', label: t('credit') },
    { value: 'Advisory', label: t('advisory') },
  ]
  const [category, setCategory] = useState('')
  const filters = { state: 'Kerala', category }
  const { snapshot, loading } = useSchemes(filters)

  const formatDate = (date) =>
    new Intl.DateTimeFormat(localeMap[currentLanguage] || 'en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(date))

  return (
    <div className="workspace schemes-screen">
      <header className="workspace__header">
        <div>
          <p className="workspace__eyebrow">{t('governmentSupport')}</p>
          <h1 className="workspace__title">{t('supportStartingPointTitle')}</h1>
          <p className="workspace__lede">{t('supportStartingPointText')}</p>
        </div>

        <div className="workspace__toolbar">
          <label className="workspace-field">
            <span>{t('focusArea')}</span>
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              {categories.map((item) => (
                <option key={item.value || 'all'} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </header>

      {loading || !snapshot ? (
        <div className="scheme-loading workspace-panel">{t('loadingSchemeCatalogue')}</div>
      ) : (
        <section className="workspace-section">
          <div className="workspace-section__heading">
            <div>
              <p>{t('availableSupport')}</p>
              <h2>{t('schemeCatalogue')}</h2>
            </div>
            <div className="scheme-catalogue-meta">
              <DataModeBadge mode={snapshot.dataMode} />
              <span className="workspace-section__meta">
                {snapshot.schemes.length} {snapshot.schemes.length === 1 ? 'scheme' : 'schemes'}
                <span aria-hidden="true"> · </span>
                {t('schemeCatalogueMeta')}
              </span>
            </div>
          </div>

          {snapshot.schemes.length ? (
            <div className="scheme-grid">
              {snapshot.schemes.map((scheme) => (
                <article key={scheme.id} className="workspace-panel scheme-card">
                  <div className="scheme-card__top">
                    <span className="scheme-card__category">
                      <Landmark size={14} aria-hidden="true" />
                      {scheme.category}
                    </span>
                    <span className="scheme-card__location">
                      <MapPin size={13} aria-hidden="true" />
                      {scheme.state}
                    </span>
                  </div>

                  <div className="scheme-card__intro">
                    <h3>{scheme.title}</h3>
                    <p>{scheme.description}</p>
                  </div>

                  <dl className="scheme-card__facts">
                    <div>
                      <dt>
                        <FileCheck2 size={15} aria-hidden="true" />
                        {t('eligibilitySummary')}
                      </dt>
                      <dd>{scheme.eligibilityRules}</dd>
                    </div>
                    <div>
                      <dt>
                        <Files size={15} aria-hidden="true" />
                        {t('commonDocuments')}
                      </dt>
                      <dd>
                        <ul className="scheme-card__documents">
                          {scheme.requiredDocuments.slice(0, 3).map((document) => (
                            <li key={document}>{document}</li>
                          ))}
                        </ul>
                      </dd>
                    </div>
                  </dl>

                  <footer>
                    <small>{t('lastVerified', { date: formatDate(scheme.lastVerifiedDate) })}</small>
                    <a href={scheme.officialLink} target="_blank" rel="noreferrer">
                      {t('officialDetails')}
                      <ExternalLink size={14} aria-hidden="true" />
                    </a>
                  </footer>
                </article>
              ))}
            </div>
          ) : (
            <div className="scheme-empty workspace-panel" role="status">
              <Landmark size={24} aria-hidden="true" />
              <div>
                <h3>No schemes found</h3>
                <p>Try another focus area to view available support.</p>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  )
}
