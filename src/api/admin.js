import api from './axios'

const BASE = '/api/admin'

// Dashboard
export const getDashboard = () => api.get(`${BASE}/dashboard`)

// Users - doc §18: page/limit, PUT {nombre,apellido,email,telefono,edad}
export const getUsers = (params) => api.get(`${BASE}/users`, { params })
export const updateUser = (id, data) => api.put(`${BASE}/users/${id}`, data)
export const suspendUser = (id) => api.put(`${BASE}/users/${id}/suspend`)
export const deleteUser = (id) => api.delete(`${BASE}/users/${id}`)
export const updateUserAvatar = (id, formData) =>
  api.put(`${BASE}/users/${id}/avatar`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
export const clearDebt = (id) => api.put(`${BASE}/users/${id}/clear-debt`)
export const setModerator = (id, data) => api.put(`${BASE}/users/${id}/moderator`, data)
export const setLeader = (id) => api.put(`${BASE}/users/${id}/leader`)

// Drivers
export const getDrivers = (params) => api.get(`${BASE}/drivers`, { params })

// Trips
export const getTrips = (params) => api.get(`${BASE}/trips`, { params })

// Earnings
export const getEarnings = (params) => api.get(`${BASE}/earnings`, { params })

// Profile - doc: PUT {nombre,apellido,email,telefono}, POST avatar field=file
export const getProfile = () => api.get(`${BASE}/profile`)
export const updateProfile = (data) => api.put(`${BASE}/profile`, data)
export const uploadAvatar = (formData) =>
  api.post(`${BASE}/profile/avatar`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })

// Emergencies - doc: page/limit, PUT resolve sin body
export const getEmergencies = (params) => api.get(`${BASE}/emergencies`, { params })
export const resolveEmergency = (id) => api.put(`${BASE}/emergencies/${id}/resolve`)

// Detalle de viaje y chat SOS — endpoints generales accesibles con rol admin
export const getTripById = (id) => api.get(`/api/trips/${id}`)
export const getEmergencyChat = (alertaId) => api.get(`/api/emergency/${alertaId}/messages`)
export const sendEmergencyMessage = (alertaId, mensaje) => api.post(`/api/emergency/${alertaId}/messages`, { mensaje })

// Conversaciones generales (admin ↔ moderadores) — mismo chat del chatapp.
// El backend NO permite crear conversaciones como admin (solo listar/leer/responder).
export const getConversations = () => api.get('/api/conversations')
export const getConversationsUnreadCount = () => api.get('/api/conversations/unread-count')
export const getConversationMessages = (id) => api.get(`/api/conversations/${id}/messages`)
export const sendConversationMessage = (id, data) => api.post(`/api/conversations/${id}/messages`, data)

// Commissions
export const getCommissions = () => api.get(`${BASE}/commissions`)
export const markCommissionPaid = (conductorId) =>
  api.put(`${BASE}/commissions/${conductorId}/paid`)
export const getCommissionHistory = (conductorId, params) =>
  api.get(`${BASE}/commissions/${conductorId}/history`, { params })

// Reports - doc: page/limit, PUT resolve sin body
export const getReports = (params) => api.get(`${BASE}/reports`, { params })
export const resolveReport = (id) => api.put(`${BASE}/reports/${id}/resolve`)

// Disputes - doc: page/limit, PUT {resultado:"favor_conductor"|"favor_cliente", acuerdoDePago?, montoDeuda?}
export const getDisputes = (params) => api.get(`${BASE}/disputes`, { params })
export const resolveDispute = (id, data) => api.put(`${BASE}/disputes/${id}/resolve`, data)

// Verifications - doc: page/limit, PUT approve sin body, PUT reject {nota?}
export const getVerifications = (params) => api.get(`${BASE}/verifications`, { params })
export const approveVerification = (conductorId) =>
  api.put(`${BASE}/verifications/${conductorId}/approve`)
export const rejectVerification = (conductorId, data) =>
  api.put(`${BASE}/verifications/${conductorId}/reject`, data)

// Drivers - notificar/reportar (moderator, admin con token puede intentar)
export const notifyDriver = (id) => api.post(`/api/moderator/drivers/${id}/notify`)
export const reportDriver = (id, data) => api.post(`/api/moderator/drivers/${id}/report`, data)

// Payments
export const getPendingPayments = () => api.get(`${BASE}/payments/pending`)
export const confirmPayment = (userId) => api.put(`${BASE}/payments/${userId}/confirm`)
export const rejectPayment = (userId) => api.put(`${BASE}/payments/${userId}/reject`)

// Config - doc: PUT {nequiNumero?,nequiNombre?}, PUT coverage {zonasCobertura:[]}, PUT banner multipart banner_imagen
export const updateConfig = (data) => api.put(`${BASE}/config`, data)
export const updateCoverage = (data) => api.put(`${BASE}/config/coverage`, data)
export const updateBanner = (formData) =>
  api.put(`${BASE}/config/banner`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })

// Comunicados & Encuestas - doc: approve sin body, reject {notaRechazo?}
export const approveComunicado = (id) => api.put(`${BASE}/comunicados/${id}/approve`)
export const rejectComunicado = (id, data) => api.put(`${BASE}/comunicados/${id}/reject`, data)
export const approveEncuesta = (id) => api.put(`${BASE}/encuestas/${id}/approve`)

// Moderator Reports - doc: page/limit
export const getModeratorReports = (params) => api.get(`${BASE}/moderator-reports`, { params })

// Backups
export const getBackups = () => api.get(`${BASE}/backups`)
export const runBackup = () => api.post(`${BASE}/backups/run`)

// Cancellation Requests - doc: page/limit, POST approve/reject sin body
export const getCancellationRequests = (params) => api.get(`${BASE}/cancellation-requests`, { params })
export const approveCancellation = (id) => api.post(`${BASE}/cancellation-requests/${id}/approve`)
export const rejectCancellation = (id) => api.post(`${BASE}/cancellation-requests/${id}/reject`)

// Auth - doc §1: {email,password} y {refreshToken}
export const registerUser = (data) => api.post('/api/auth/register', data)
export const login = (email, password) =>
  api.post('/api/auth/login', { email, password })

export const refreshToken = () => {
  const token = localStorage.getItem('refreshToken')
  return api.post('/api/auth/refresh-token', { refreshToken: token })
}

export const logout = () => api.post('/api/auth/logout')
