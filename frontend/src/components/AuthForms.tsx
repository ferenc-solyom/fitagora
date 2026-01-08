import { useState } from 'react'
import { login as apiLogin, register as apiRegister, ApiError } from '../api'
import { useAuth } from '../context/AuthContext'
import type { LoginRequest, RegisterRequest } from '../types'

type AuthMode = 'login' | 'register'

export function AuthForms() {
  const [mode, setMode] = useState<AuthMode>('login')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()

  const [loginForm, setLoginForm] = useState<LoginRequest>({
    email: '',
    password: ''
  })

  const [registerForm, setRegisterForm] = useState<RegisterRequest>({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phoneNumber: ''
  })

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const response = await apiLogin(loginForm)
      login(response.token, response.user)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('An unexpected error occurred')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const response = await apiRegister(registerForm)
      login(response.token, response.user)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('An unexpected error occurred')
      }
    } finally {
      setLoading(false)
    }
  }

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode)
    setError(null)
  }

  return (
    <div className="auth-forms">
      <div className="auth-tabs">
        <button
          className={mode === 'login' ? 'active' : ''}
          onClick={() => switchMode('login')}
        >
          Login
        </button>
        <button
          className={mode === 'register' ? 'active' : ''}
          onClick={() => switchMode('register')}
        >
          Register
        </button>
      </div>

      {error && <div className="auth-error">{error}</div>}

      {mode === 'login' ? (
        <form onSubmit={handleLogin} className="auth-form">
          <div className="form-group">
            <label htmlFor="login-email">Email</label>
            <input
              id="login-email"
              type="email"
              value={loginForm.email}
              onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="login-password">Password</label>
            <input
              id="login-password"
              type="password"
              value={loginForm.password}
              onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
              required
            />
          </div>
          <button type="submit" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleRegister} className="auth-form">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="register-firstName">First Name</label>
              <input
                id="register-firstName"
                type="text"
                value={registerForm.firstName}
                onChange={(e) => setRegisterForm({ ...registerForm, firstName: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="register-lastName">Last Name</label>
              <input
                id="register-lastName"
                type="text"
                value={registerForm.lastName}
                onChange={(e) => setRegisterForm({ ...registerForm, lastName: e.target.value })}
                required
              />
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="register-email">Email</label>
            <input
              id="register-email"
              type="email"
              value={registerForm.email}
              onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="register-password">Password (min 8 characters)</label>
            <input
              id="register-password"
              type="password"
              value={registerForm.password}
              onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
              minLength={8}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="register-phone">Phone Number (optional)</label>
            <input
              id="register-phone"
              type="tel"
              value={registerForm.phoneNumber}
              onChange={(e) => setRegisterForm({ ...registerForm, phoneNumber: e.target.value })}
            />
          </div>
          <button type="submit" disabled={loading}>
            {loading ? 'Registering...' : 'Register'}
          </button>
        </form>
      )}
    </div>
  )
}
