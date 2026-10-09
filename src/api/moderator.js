import api from './axios'

// Moderador — doc §16, requiere esModerador=true + zonaModerador
// Todas las acciones filtradas por su ciudad automáticamente en backend

// Conductores
export const getModeratorDrivers = (params) => api.get('/api/moderator/drivers', { params })
export const getInactiveDrivers = (params) => api.get('/api/moderator/drivers/inactive', { params })
// Ficha completa (datos, vehículo, documentos firmados, últimos viajes, reportes y disputas). 403 si no es de su zona.
export const getModeratorDriver = (id) => api.get(`/api/moderator/drivers/${id}`)
export const getClientProfile = (id) => api.get(`/api/moderator/clients/${id}`)
// Disputas de los conductores de la zona, solo lectura. { total, page, data } — params: page, limit, estado (coma)
export const getModeratorDisputes = (params) => api.get('/api/moderator/disputes', { params })
// data opcional: { documentos: [...], mensaje } → aviso de documentos faltantes; sin cuerpo, recordatorio de actividad.
export const notifyDriver = (id, data) => api.post(`/api/moderator/drivers/${id}/notify`, data)
export const reportDriver = (id, data) => api.post(`/api/moderator/drivers/${id}/report`, data)
export const approveDriver = (id) => api.post(`/api/moderator/drivers/${id}/approve`)
export const rejectDriver = (id, data) => api.post(`/api/moderator/drivers/${id}/reject`, data)
export const getMapboxToken = () => api.get('/api/config/mapbox')

// Comunicados
export const createComunicado = (data) => api.post('/api/moderator/comunicados', data)
export const getModeratorComunicados = (params) => api.get('/api/moderator/comunicados', { params })

// Encuestas
export const createEncuesta = (data) => api.post('/api/moderator/encuestas', data)
export const getEncuestaResults = (id) => api.get(`/api/moderator/encuestas/${id}/results`)

// Avisos — doc §17 (también accesible como moderador)
export const getAvisos = (params) => api.get('/api/avisos', { params })
export const createAviso = (data) => api.post('/api/avisos', data)
export const pinAviso = (id) => api.put(`/api/avisos/${id}/pin`)
export const deleteAviso = (id) => api.delete(`/api/avisos/${id}`)

// Nuevos — requieren backend con los 3 bloques que pegaste
export const getMyEncuestas = (params) => api.get('/api/moderator/encuestas', { params })
export const getMyReports = (params) => api.get('/api/moderator/reports', { params })
export const getModeratorDashboard = (ciudad) => api.get('/api/moderator/dashboard', { params: ciudad ? { ciudad } : {} })

// Viajes — nuevo GET /api/moderator/trips filtrado por ciudad del moderador
export const getModeratorTrips = (params) => api.get('/api/moderator/trips', { params })
export const getModeratorTripDetail = (id) => api.get(`/api/moderator/trips/${id}`)
export const getTripRecorrido = (id) => api.get(`/api/moderator/trips/${id}/recorrido`)
// H1: el cliente tuvo 10 min para confirmar/rechazar el cierre y no respondió;
// el moderador de la zona decide. data: { resolucion: 'finalizar' | 'disputa', nota (>=10 caracteres) }
export const resolveClose = (id, data) => api.post(`/api/moderator/trips/${id}/resolve-close`, data)

// Reservas — viajes programados con anticipación en la ciudad del moderador (sin conductor asignado aún o ya en curso)
export const getModeratorReservations = (params) => api.get('/api/moderator/reservations', { params })

// Chat de emergencia — GET/POST /api/emergency/:alertaId/messages
export const getEmergencyMessages = (alertaId) => api.get(`/api/emergency/${alertaId}/messages`)
export const sendEmergencyMessage = (alertaId, data) => api.post(`/api/emergency/${alertaId}/messages`, data)

// Emergencias — GET /api/moderator/emergency, POST acknowledge/resolve
export const getModeratorEmergencies = (params) => api.get('/api/moderator/emergency', { params })
export const acknowledgeEmergency = (id) => api.post(`/api/moderator/emergency/${id}/acknowledge`)
export const resolveEmergency = (id, data = {}) => api.post(`/api/moderator/emergency/${id}/resolve`, data)

// Conversatorio — GET /moderator/conversations, unread-count, messages
export const getConversations = (params) => api.get('/api/moderator/conversations', { params })
export const getUnreadCount = () => api.get('/api/moderator/conversations/unread-count')
export const getConversationMessages = (id) => api.get(`/api/moderator/conversations/${id}/messages`)
export const createConversation = (data) => api.post('/api/moderator/conversations', data)
export const sendConversationMessage = (id, data) => api.post(`/api/moderator/conversations/${id}/messages`, data)

// Contactos buscables — conductores de la zona y equipo (admin/moderadores). Los clientes NO salen:
// el moderador solo los contacta desde un ticket, un SOS o una disputa.
export const getContactableUsers = (params) => api.get('/api/moderator/contactable-users', { params })

// Perfil (usa mismo endpoint que admin/users/profile pero con rol moderador)
export const getModeratorProfile = () => api.get('/api/users/profile')

// Conteos para las insignias (aceptan ?ciudad= cuando el admin elige una zona)
export const getEmergencyCount = (params) => api.get('/api/moderator/emergency/count', { params })
export const getTicketsCount = (params) => api.get('/api/moderator/tickets/count', { params })
