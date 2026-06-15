import * as React from 'react'
import type { AuthPayload, UserProfile } from '../../shared/types'
import { apiRequest } from '../lib/api'

const tokenStorageKey = 'pingflare-token'

type AuthContextValue = {
  token: string | null
  user: UserProfile | null
  loading: boolean
  login: (payload: AuthPayload) => void
  logout: () => Promise<void>
}

const AuthContext = React.createContext<AuthContextValue | null>(null)

export function useAuth() {
  const value = React.useContext(AuthContext)
  if (!value) throw new Error('Auth context is missing')
  return value
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = React.useState<string | null>(() =>
    localStorage.getItem(tokenStorageKey),
  )
  const [user, setUser] = React.useState<UserProfile | null>(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    let active = true

    async function loadUser() {
      if (!token) {
        setUser(null)
        setLoading(false)
        return
      }

      try {
        const me = await apiRequest<UserProfile>('/api/auth/me', undefined, token)
        if (active) setUser(me)
      } catch (error) {
        console.log('Session restore failed:', error)
        localStorage.removeItem(tokenStorageKey)
        if (active) {
          setToken(null)
          setUser(null)
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    void loadUser()
    return () => {
      active = false
    }
  }, [token])

  async function logout() {
    try {
      await apiRequest('/api/auth/logout', { method: 'POST' }, token)
    } catch (error) {
      console.log('Logout request failed:', error)
    }
    localStorage.removeItem(tokenStorageKey)
    setToken(null)
    setUser(null)
  }

  function login(payload: AuthPayload) {
    localStorage.setItem(tokenStorageKey, payload.token)
    setToken(payload.token)
    setUser(payload.user)
  }

  return (
    <AuthContext.Provider value={{ token, user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
