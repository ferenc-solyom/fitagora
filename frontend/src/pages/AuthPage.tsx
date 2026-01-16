import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AuthForms } from '../components/AuthForms'
import { useAuth } from '../context/AuthContext'

export function AuthPage() {
  const { t } = useTranslation()
  const { user, loading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (user && !loading) {
      navigate('/')
    }
  }, [user, loading, navigate])

  if (loading) {
    return (
      <div className="auth-page">
        <div className="loading">Loading...</div>
      </div>
    )
  }

  return (
    <div className="auth-page">
      <button className="auth-back-btn" onClick={() => navigate('/')}>
        ← {t('auth.back')}
      </button>
      <div className="auth-page-container">
        <div className="auth-page-header">
          <img src="/logo.svg" alt="FitAgora" className="auth-page-logo" />
          <h1>Welcome to FitAgora</h1>
          <p>Second Hand Fitness Equipment Marketplace</p>
        </div>
        <AuthForms />
      </div>
    </div>
  )
}
