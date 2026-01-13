import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Products } from './components/Products'
import { Favorites } from './components/Favorites'
import { useAuth } from './context/AuthContext'

type View = 'products' | 'favorites'

const languages = [
  { code: 'en', label: 'EN' },
  { code: 'ro', label: 'RO' },
  { code: 'hu', label: 'HU' }
]

function App() {
  const { t, i18n } = useTranslation()
  const { user, loading, logout } = useAuth()
  const [activeView, setActiveView] = useState<View>('products')

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng)
  }

  if (loading) {
    return (
      <div className="app">
        <div className="loading">{t('common.loading')}</div>
      </div>
    )
  }

  return (
    <div className="app">
      <nav className="navbar">
        <Link to="/" className="nav-brand">
          <img src="/logo.svg" alt="FitAgora" className="nav-logo" />
          <span className="nav-title">Fit<span className="nav-title-accent">Agora</span></span>
        </Link>
        <div className="nav-links">
          <button
            className={`nav-link ${activeView === 'products' ? 'active' : ''}`}
            onClick={() => setActiveView('products')}
          >
            {t('nav.products')}
          </button>
          {user && (
            <button
              className={`nav-link ${activeView === 'favorites' ? 'active' : ''}`}
              onClick={() => setActiveView('favorites')}
            >
              {t('nav.favorites')}
            </button>
          )}
        </div>
        <div className="nav-actions">
          <div className="language-switcher">
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => changeLanguage(lang.code)}
                className={`lang-btn ${i18n.language === lang.code ? 'active' : ''}`}
              >
                {lang.label}
              </button>
            ))}
          </div>
          {user ? (
            <>
              <span className="nav-user">{t('nav.greeting', { name: user.firstName })}</span>
              <button onClick={logout} className="nav-btn nav-btn-outline">{t('nav.logout')}</button>
            </>
          ) : (
            <Link to="/auth" className="nav-btn nav-btn-primary">{t('nav.login')}</Link>
          )}
        </div>
      </nav>

      <main className="main main-full">
        {activeView === 'products' ? (
          <Products />
        ) : (
          user && <Favorites />
        )}
      </main>

      <footer className="footer">
        {t('common.poweredBy')} <a href="https://www.linkedin.com/in/ferenc-solyom/" target="_blank" rel="noopener noreferrer">Ferenc Solyom</a>
      </footer>
    </div>
  )
}

export default App
