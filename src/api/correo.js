import api from './axios'

// Correos con la marca (Brevo). area: 'admin' | 'moderator'. El moderador solo escribe a su zona.
const base = (area) => (area === 'admin' ? '/api/admin' : '/api/moderator')

// { variables: [...], data: [{ clave, nombre, asunto, cuerpo, activo, updatedAt }] }
export const getPlantillasCorreo = (area = 'admin') => api.get(`${base(area)}/plantillas-correo`)
// Solo admin: { nombre?, asunto?, cuerpo?, activo? }
export const updatePlantillaCorreo = (clave, data) => api.put(`/api/admin/plantillas-correo/${clave}`, data)
// { plantilla?, asunto?, cuerpo?, userId? } → { asunto, html }
export const previewCorreo = (area, data) => api.post(`${base(area)}/correo/vista-previa`, data)
// { plantilla?, asunto?, cuerpo?, userId } o { ..., zona, destino: 'conductores' } → { enviados, omitidos, total, cupoRestante }
export const sendCorreo = (area, data) => api.post(`${base(area)}/correo/enviar`, data)
