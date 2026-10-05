import api from './axios'

/**
 * Sección web del cliente. El backend filtra todo por el usuario de la sesión:
 * un cliente solo recibe sus viajes y sus tickets.
 */
export const clienteApi = {
  // 404 = no tiene viaje en curso.
  viajeActivo: () => api.get('/api/trips/active'),
  // Ruta y posición del conductor; 404 si el viaje aún no está en una fase con ruta.
  ruta: (id) => api.get(`/api/trips/${id}/route`),
  // { data, total, page, limit }
  historial: (page = 1, limit = 10) => api.get('/api/trips/history', { params: { page, limit } }),
  // { tickets, meta }
  tickets: (page = 1) => api.get('/api/support/tickets', { params: { page, limit: 20 } }),
  ticket: (id) => api.get(`/api/support/tickets/${id}`),
  // { categoria, asunto, descripcion, viajeId? }
  crearTicket: (datos) => api.post('/api/support/tickets', datos),
  enviarMensaje: (id, mensaje) => api.post(`/api/support/tickets/${id}/messages`, { mensaje }),
  cerrarTicket: (id) => api.post(`/api/support/tickets/${id}/close`),
}
