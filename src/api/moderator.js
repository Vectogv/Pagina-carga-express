import api from './axios'

// Moderador — doc §16, requiere esModerador=true + zonaModerador
// Todas las acciones filtradas por su ciudad automáticamente en backend

// Conductores
export const getModeratorDrivers = (params) => api.get('/api/moderator/drivers', { params })
export const getInactiveDrivers = (params) => api.get('/api/moderator/drivers/inactive', { params })
export const notifyDriver = (id) => api.post(`/api/moderator/drivers/${id}/notify`)
export const reportDriver = (id, data) => api.post(`/api/moderator/drivers/${id}/report`, data)

// Comunicados
export const createComunicado = (data) => api.post('/api/moderator/comunicados', data)
export const getModeratorComunicados = (params) => api.get('/api/moderator/comunicados', { params })

// Encuestas
export const createEncuesta = (data) => api.post('/api/moderator/encuestas', data)
export const getEncuestaResults = (id) => api.get(`/api/moderator/encuestas/${id}/results`)
export const answerEncuesta = (id, data) => api.post(`/api/moderator/encuestas/${id}/answer`, data)

// Avisos — doc §17 (también accesible como moderador)
export const getAvisos = (params) => api.get('/api/avisos', { params })
export const createAviso = (data) => api.post('/api/avisos', data)
export const pinAviso = (id) => api.put(`/api/avisos/${id}/pin`)
export const deleteAviso = (id) => api.delete(`/api/avisos/${id}`)

// Nuevos — requieren backend con los 3 bloques que pegaste
export const getMyEncuestas = (params) => api.get('/api/moderator/encuestas', { params })
export const getMyReports = (params) => api.get('/api/moderator/reports', { params })
export const getModeratorDashboard = () => api.get('/api/moderator/dashboard')

// Viajes — nuevo GET /api/moderator/trips filtrado por ciudad del moderador
export const getModeratorTrips = (params) => api.get('/api/moderator/trips', { params })

// Perfil (usa mismo endpoint que admin/users/profile pero con rol moderador)
export const getModeratorProfile = () => api.get('/api/users/profile')
