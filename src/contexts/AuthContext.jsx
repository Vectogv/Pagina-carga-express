import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { login as apiLogin, logout as apiLogout, getProfile } from '../api/admin'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(() => localStorage.getItem('accessToken'))
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)

  const fetchProfile = useCallback(async () => {
    try {
      const { data } = await getProfile()
      const u = data.user || data.data || data
      // Preserva rol/esModerador del login si el endpoint no lo devuelve (admin profile no trae rol)
      const existingRaw = localStorage.getItem('user')
      const existing = existingRaw ? JSON.parse(existingRaw) : {}
      const merged = { ...existing, ...u, rol: u.rol || u.role || existing.rol || existing.role || (u.email?.includes('admin') ? 'admin' : undefined) }
      setUser(merged)
      localStorage.setItem('user', JSON.stringify(merged))
      setIsAuthenticated(true)
      return true
    } catch (err) {
      if (err?.response?.status === 403) {
        try {
          const { default: api } = await import('../api/axios')
          const { data: d2 } = await api.get('/api/users/profile')
          const u2 = d2.user || d2.data || d2
          // Intenta detectar moderador via endpoint moderador (no depende de campo esModerador en profile)
          let isMod = !!(u2.esModerador || u2.es_moderador)
          let zona = u2.zonaModerador || u2.zona_moderador
          if (!isMod) {
            try {
              await api.get('/api/moderator/drivers', { params: { page: 1, limit: 1 } })
              isMod = true
              zona = zona || 'cali'
            } catch {}
          }
          const enriched = isMod ? { ...u2, esModerador: true, zonaModerador: zona || 'cali' } : u2
          setUser(enriched)
          localStorage.setItem('user', JSON.stringify(enriched))
          if (isMod) {
            setIsAuthenticated(true)
            return true
          }
        } catch {}
        setUser(null)
        setIsAuthenticated(false)
        return false
      }
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      localStorage.removeItem('user')
      setToken(null)
      setUser(null)
      setIsAuthenticated(false)
      return false
    }
  }, [])

  useEffect(() => {
    if (!token) {
      setLoading(false)
      return
    }

    let cancelled = false
    fetchProfile().finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => { cancelled = true }
  }, [token, fetchProfile])

  const login = async (email, password) => {
    const { data } = await apiLogin(email, password)
    // Backend puede devolver accessToken, token, access_token, o data dentro de data
    const newToken = data.accessToken || data.access_token || data.token || data.data?.accessToken || data.data?.token
    const refreshTokenValue = data.refreshToken || data.refresh_token || data.data?.refreshToken
    const returnedUser = data.user || data.data?.user || null

    if (!newToken) {
      console.error('Login response sin token:', data)
      throw new Error('Respuesta del servidor sin token. Revisa consola (F12).')
    }

    localStorage.setItem('accessToken', newToken)
    if (refreshTokenValue) {
      localStorage.setItem('refreshToken', refreshTokenValue)
    }

    const userToStore = returnedUser || { id: data.id, nombre: data.nombre, apellido: data.apellido, email: data.email, rol: data.rol, esModerador: data.esModerador, zonaModerador: data.zonaModerador }
    if (userToStore && (userToStore.email || userToStore.id)) {
      setUser(userToStore)
      localStorage.setItem('user', JSON.stringify(userToStore))
      setIsAuthenticated(true)
      // Si respuesta plana sin fetch, igual intenta enriquecer con perfil
      fetchProfile().catch(() => {})
    } else {
      const ok = await fetchProfile()
      if (!ok) setIsAuthenticated(true) // Moderador ya autenticado en fetchProfile
    }
    setToken(newToken)

    return data
  }

  const logout = async () => {
    try { await apiLogout() } catch {}
    finally {
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      localStorage.removeItem('user')
      setToken(null)
      setUser(null)
      setIsAuthenticated(false)
    }
  }

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
