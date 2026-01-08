import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import type { User } from '../types'
import { getMe, setToken, clearToken, isAuthenticated } from '../api'

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (token: string, user: User) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadUser() {
      if (isAuthenticated()) {
        try {
          const userData = await getMe()
          setUser(userData)
        } catch {
          clearToken()
        }
      }
      setLoading(false)
    }
    loadUser()
  }, [])

  const login = (token: string, userData: User) => {
    setToken(token)
    setUser(userData)
  }

  const logout = () => {
    clearToken()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
