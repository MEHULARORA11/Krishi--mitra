import { useState } from 'react'
import { CircleAlert, RefreshCw, TrendingUp } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'
import { useMarketSnapshot } from './marketApi'
import '../../components/ui/ui.css'
import './MarketScreen.css'

const money = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})

export default function MarketScreen() {
  const { t } = useLanguage()
  const [crop, setCrop] = useState('Rice')
  const filters = { crop, state: 'Kerala', district: '' }
  const { snapshot, loading, refresh } = useMarketSnapshot(filters)
  const prices = snapshot?.prices ?? []
  const highest = prices.length
    ? Math.max(...prices.map((price) => price.modalPrice))
    : 0

  return (
    <div className="workspace market-screen">
      <header className="workspace__header">
        <div>
          <p className="workspace__eyebrow">{t('marketSignals')}</p>
          <h1 className="workspace__title">{t('compareMandiTitle')}</h1>
          <p className="workspace__lede">{t('compareMandiText')}</p>
        </div>

        <div className="workspace__toolbar">
          <label className="workspace-field">
            <span>{t('commodity')}</span>
            <select value={crop} onChange={(event) => setCrop(event.target.value)}>
              <option>Rice</option>
              <option>Coconut</option>
              <option>Pepper</option>
              <option>Banana</option>
              <option>Tomato</option>
            </select>
          </label>
          <button type="button" onClick={refresh} disabled={loading}>
            <RefreshCw size={16} aria-hidden="true" />
            {t('refresh')}
          </button>
        </div>
      </header>

      {loading || !snapshot ? (
        <div className="market-loading workspace-panel">{t('loadingMarketSnapshot')}</div>
      ) : (
        <>
          <section className="workspace-section">
            <div className="workspace-section__heading">
              <div>
                <p>{t('priceBoard')}</p>
                <h2>{t('marketSnapshotTitle', { crop })}</h2>
              </div>
              <span className="workspace-section__meta">
                {t('modalPriceMeta')}
              </span>
            </div>

            <div className="workspace-panel market-table">
              <div className="market-table__heading">
                <span>{t('market')}</span>
                <span>{t('district')}</span>
                <span>{t('range')}</span>
                <span>{t('modalPrice')}</span>
              </div>

              {prices.map((price) => (
                <article key={`${price.mandi}-${price.arrivalDate}`}>
                  <div>
                    <strong>{price.mandi}</strong>
                    <small>{price.variety || t('standardGrade')}</small>
                  </div>
                  <span>{price.district}</span>
                  <span>
                    {money.format(price.minPrice)} - {money.format(price.maxPrice)}
                  </span>
                  <strong>{money.format(price.modalPrice)}</strong>
                  <i
                    style={{
                      '--bar': `${highest ? (price.modalPrice / highest) * 100 : 0}%`,
                    }}
                  />
                </article>
              ))}
            </div>
          </section>

          <section className="market-note-grid">
            <article className="workspace-panel market-note">
              <TrendingUp className="market-note__icon" size={20} aria-hidden="true" />
              <p className="workspace__eyebrow">{t('howToUseThis')}</p>
              <h3>{t('comparisonAnchorTitle')}</h3>
              <p>{t('comparisonAnchorText')}</p>
            </article>

            <article className="workspace-panel market-note">
              <CircleAlert className="market-note__icon" size={20} aria-hidden="true" />
              <p className="workspace__eyebrow">{t('beforeSelling')}</p>
              <h3>{t('verifySellingTitle')}</h3>
              <p>{t('verifySellingText')}</p>
            </article>
          </section>
        </>
      )}
    </div>
  )
}
