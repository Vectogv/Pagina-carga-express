import api from './axios'

/**
 * Tickets de soporte. Las rutas de admin (/api/admin/tickets) y de moderador
 * (/api/moderator/tickets) tienen la misma forma; solo cambia el prefijo y que
 * el admin además puede filtrar por zona y asignar moderador.
 */
export const ESTADOS_TICKET = ['abierto', 'en_proceso', 'resuelto', 'cerrado']

export const CATEGORIAS_TICKET = {
  pago: 'Pago',
  viaje: 'Viaje',
  cuenta: 'Cuenta',
  app: 'App',
  otro: 'Otro',
}

export function ticketsApi(area) {
  const BASE = area === 'admin' ? '/api/admin/tickets' : '/api/moderator/tickets'
  return {
    area,
    // params: { estado, zona (solo admin), mios, page, limit }
    list: (params) => api.get(BASE, { params }),
    count: (params) => api.get(`${BASE}/count`, { params }),
    moderators: (params) => api.get(`${BASE}/moderators`, { params }),
    get: (id) => api.get(`${BASE}/${id}`),
    take: (id) => api.post(`${BASE}/${id}/take`),
    // data: { mensaje } en JSON, o FormData con mensaje + file (imagen); config permite forzar multipart.
    sendMessage: (id, data, config) => api.post(`${BASE}/${id}/messages`, data, config),
    setStatus: (id, estado) => api.put(`${BASE}/${id}/status`, { estado }),
    // Solo admin. moderadorId null quita la asignación.
    assign: (id, moderadorId) => api.put(`${BASE}/${id}/assign`, { moderadorId }),
  }
}
