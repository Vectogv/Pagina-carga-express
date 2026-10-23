import api from './axios'

// El axios base fuerza JSON: el formulario con fotos va como multipart.
const MULTIPART = { headers: { 'Content-Type': 'multipart/form-data' } }

// Admin: { zona, email?, dias? } -> { id, enlace, correoEnviado, ... } (el enlace solo se ve ahora)
export const crearInvitacionModerador = (data) => api.post('/api/admin/moderadores/invitaciones', data)
// -> { data: [{ id, zona, zonaNombre, email, estado: pendiente|usada|anulada|vencida, venceAt, ... }], total }
export const getInvitacionesModerador = () => api.get('/api/admin/moderadores/invitaciones')
export const anularInvitacionModerador = (id) => api.put(`/api/admin/moderadores/invitaciones/${id}/anular`)
// Enlace nuevo (el anterior deja de servir): { dias? }
export const reenviarInvitacionModerador = (id, data = {}) => api.post(`/api/admin/moderadores/invitaciones/${id}/reenviar`, data)

// Publico (sin sesion): el token es el permiso. 404/410 si no sirve.
export const getInvitacionPublica = (token) => api.get(`/api/moderador-invitacion/${encodeURIComponent(token)}`)
// FormData: nombre, apellido, email, telefono, cedula, password, aceptaTratamiento, cedulaFrente, cedulaReverso, rostro
export const enviarSolicitudInvitacion = (token, form) =>
  api.post(`/api/moderador-invitacion/${encodeURIComponent(token)}`, form, MULTIPART)