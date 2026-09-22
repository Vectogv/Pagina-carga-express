import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api, { tokenStore, setSessionExpiredHandler } from '../api/axios'

const AuthContext = createContext(null)

const unwrap = (data) => data?.data || data?.user || data

const readCachedUser = () => {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null')
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => (tokenStore.access ? readCachedUser() : null))
  const [loading, setLoading] = useState(() => Boolean(tokenStore.access))

  const clearSession = useCallback(() => {
    tokenStore.clear()
    setUser(null)
  }, [])

  // El perfil común (/api/users/profile) trae rol, esModerador y zonaModerador para cualquier usuario.
  const loadProfile = useCallback(async () => {
    const { data } = await api.get('/api/users/profile')
    const profile = unwrap(data)
    setUser(profile)
    localStorage.setItem('user', JSON.stringify(profile))
    return profile
  }, [])

  useEffect(() => {
    setSessionExpiredHandler(() => setUser(null))
    return () => setSessionExpiredHandler(null)
  }, [])

  useEffect(() => {
    if (!tokenStore.access) return undefined
    let cancelled = false
    loadProfile()
      .catch(() => { if (!cancelled) clearSession() })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [loadProfile, clearSession])

  const login = async (email, password) => {
    const { data } = await api.post('/api/auth/login', { email, password })
    const token = data.token || data.accessToken
    if (!token) throw new Error('El servidor no devolvió un token de acceso.')
    tokenStore.set(token, data.refreshToken)

    const { token: _t, refreshToken: _r, ...basic } = data
    setUser(basic)
    try {
      return await loadProfile()
    } catch {
      localStorage.setItem('user', JSON.stringify(basic))
      return basic
    }
  }

  const logout = async () => {
    try {
      await api.post('/api/auth/logout', { refreshToken: tokenStore.refresh })
    } catch {
      // Cierra sesión localmente aunque falle la llamada.
    } finally {
      clearSession()
    }
  }

  const value = {
    user,
    loading,
    isAuthenticated: Boolean(user),
    isAdmin: user?.rol === 'admin',
    isModerator: Boolean(user?.esModerador),
    login,
    logout,
    refreshProfile: loadProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return context
}
