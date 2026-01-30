import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import { updateProfile, deleteAccount, ApiError } from '../api'

function isValidPhoneNumber(phone: string): boolean {
  if (!phone.trim()) return true
  const normalized = phone.replace(/[\s\-]/g, '')
  return /^\+?[0-9]{7,15}$/.test(normalized)
}

export function ProfilePage() {
  const { t } = useTranslation()
  const { user, loading, logout, updateUser } = useAuth()
  const navigate = useNavigate()

  const [phoneNumber, setPhoneNumber] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth')
    }
  }, [user, loading, navigate])

  useEffect(() => {
    if (user) {
      setPhoneNumber(user.phoneNumber || '')
    }
  }, [user])

  const handleUpdatePhone = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (!isValidPhoneNumber(phoneNumber)) {
      setError(t('profile.errors.invalidPhone'))
      return
    }

    setSaving(true)

    try {
      const updatedUser = await updateProfile({
        phoneNumber: phoneNumber.trim() || null
      })
      updateUser(updatedUser)
      setSuccess(t('profile.updateSuccess'))
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError(t('profile.errors.updateFailed'))
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteAccount = async () => {
    setError(null)
    setDeleting(true)

    try {
      await deleteAccount()
      logout()
      navigate('/')
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError(t('profile.errors.deleteFailed'))
      }
      setDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  if (loading) {
    return (
      <div className="auth-page">
        <div className="loading">{t('common.loading')}</div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="auth-page">
      <button className="auth-back-btn" onClick={() => navigate('/')}>
        ← {t('auth.back')}
      </button>
      <div className="auth-page-container">
        <div className="auth-page-header">
          <img src="/logo.svg" alt="FitAgora" className="auth-page-logo" />
          <h1>{t('profile.title')}</h1>
          <p>{t('profile.subtitle')}</p>
        </div>

        <div className="auth-forms">
          {error && <div className="auth-error">{error}</div>}
          {success && <div className="profile-success">{success}</div>}

          <div className="profile-info">
            <div className="profile-field">
              <label>{t('profile.name')}</label>
              <span>{user.firstName} {user.lastName}</span>
            </div>
            <div className="profile-field">
              <label>{t('profile.email')}</label>
              <span>{user.email}</span>
            </div>
          </div>

          <form onSubmit={handleUpdatePhone} className="auth-form profile-form">
            <div className="form-group">
              <label htmlFor="phone">{t('profile.phoneNumber')}</label>
              <input
                id="phone"
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder={t('profile.phoneNumberPlaceholder')}
              />
            </div>
            <button type="submit" disabled={saving}>
              {saving ? t('profile.saving') : t('profile.savePhone')}
            </button>
          </form>

          <div className="profile-danger-zone">
            <h3>{t('profile.dangerZone')}</h3>
            <p>{t('profile.deleteWarning')}</p>
            <button
              className="delete-account-btn"
              onClick={() => setShowDeleteConfirm(true)}
            >
              {t('profile.deleteAccount')}
            </button>
          </div>
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="edit-modal">
          <div className="edit-modal-content">
            <h3>{t('profile.confirmDeleteTitle')}</h3>
            <p className="delete-confirm-text">{t('profile.confirmDeleteMessage')}</p>
            <div className="edit-modal-actions">
              <button
                className="cancel-btn"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
              >
                {t('common.cancel')}
              </button>
              <button
                className="delete-confirm-btn"
                onClick={handleDeleteAccount}
                disabled={deleting}
              >
                {deleting ? t('profile.deleting') : t('profile.confirmDelete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
