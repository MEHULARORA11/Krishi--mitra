import { Link } from 'react-router-dom'
import { useLanguage } from '../context/LanguageContext'
import ProtectedLink from './ProtectedLink'

const QueryInterface = () => {
  const { t } = useLanguage()
  
  const features = [
    {
      icon: '🎤',
      title: t('voiceQueries'),
      description: t('voiceQueriesDesc')
    },
    {
      icon: '📷',
      title: t('imageAnalysis'),
      description: t('imageAnalysisDesc')
    },
    {
      icon: '💬',
      title: t('realTimeChat'),
      description: t('realTimeChatDesc')
    }
  ]

  return (
    <section className="query-interface-preview">
      <div className="container">
        <div className="preview-content">
          <div className="preview-header">
            <h2 className="section-title">{t('featuresTitle')}</h2>
            <p className="preview-subtitle">{t('featuresSubtitle')}</p>
            
            <div className="example-questions">
              <h3>{t('exampleQuestions')}</h3>
              <div className="examples">
                <div className="example">🌾 {t('example1')}</div>
                <div className="example">🍅 {t('example2')}</div>
                <div className="example">🥥 {t('example3')}</div>
              </div>
            </div>
          </div>

          <div className="features-preview">
            {features.map((feature, index) => (
              <div key={index} className="feature-preview-card">
                <div className="feature-preview-icon">{feature.icon}</div>
                <h3 className="feature-preview-title">{feature.title}</h3>
                <p className="feature-preview-desc">{feature.description}</p>
              </div>
            ))}
          </div>

          <div className="preview-cta">
            <ProtectedLink to="/chat" className="btn btn-primary btn-large">
              {t('startChatting')}
            </ProtectedLink>
            <p className="cta-note">
              {t('available247')} • {t('supportsLanguages')} • {t('freeToUse')}
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

export default QueryInterface