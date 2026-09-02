import { useLanguage } from '../context/LanguageContext'

const TopStrip = () => {
  const { currentLanguage, changeLanguage, t, languages } = useLanguage()
  
  return (
    <div className="top-strip">
      <div className="container">
        <div className="top-strip-content">
          <div className="govt-text">
            <span>🏛️</span>
            <span>{t('govText')}</span>
          </div>
          <div className="language-switcher">
            {languages.map((lang) => (
              <button 
                key={lang.code}
                className={`lang-btn ${currentLanguage === lang.code ? 'active' : ''}`}
                onClick={() => changeLanguage(lang.code)}
              >
                {lang.native}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default TopStrip