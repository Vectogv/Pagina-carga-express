import axios from 'axios'

const api = axios.create({
  baseURL: '',
  headers: {
    'Content-Type': 'application/json',
  },
})

export const tokenStore = {
  get access() { return localStorage.getItem('accessToken') },
  get refresh() { return localStorage.getItem('refreshToken') },
  set(access, refresh) {
    if (access) localStorage.setItem('accessToken', access)
    if (refresh) localStorage.setItem('refreshToken', refresh)
  },
  clear() {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('user')
  },
}

// Endpoints de auth: un 401 aquí es un error real, no un token vencido.
const AUTH_PATHS = ['/api/auth/login', '/api/auth/refresh-token', '/api/auth/register']

let refreshPromise = null
let onSessionExpired = null

/** AuthContext registra aquí qué hacer cuando la sesión no se puede renovar. */
export const setSessionExpiredHandler = (fn) => { onSessionExpired = fn }

async function refreshAccessToken() {
  const refreshToken = tokenStore.refresh
  if (!refreshToken) throw new Error('Sin refresh token')
  const { data } = await axios.post('/api/auth/refresh-token', { refreshToken })
  const newToken = data.token || data.accessToken
  if (!newToken) throw new Error('Respuesta de refresh sin token')
  tokenStore.set(newToken, data.refreshToken)
  return newToken
}

api.interceptors.request.use((config) => {
  const token = tokenStore.access
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config
    const isAuthCall = AUTH_PATHS.some((p) => original?.url?.startsWith(p))

    if (error.response?.status !== 401 || !original || original._retry || isAuthCall) {
      return Promise.reject(error)
    }

    original._retry = true
    try {
      // Una sola renovación compartida por todas las peticiones que fallen a la vez.
      refreshPromise = refreshPromise || refreshAccessToken().finally(() => { refreshPromise = null })
      const token = await refreshPromise
      original.headers.Authorization = `Bearer ${token}`
      return api(original)
    } catch (refreshError) {
      tokenStore.clear()
      onSessionExpired?.()
      return Promise.reject(refreshError)
    }
  },
)

export default api
