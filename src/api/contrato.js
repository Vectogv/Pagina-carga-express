import api from './axios'

// El axios base fuerza JSON y serializaría el FormData como JSON: hay que pedir multipart.
const MULTIPART = { headers: { 'Content-Type': 'multipart/form-data' } }

// Verificación con contrato del moderador (servidor: contrato_moderador_controller).

// Moderador: estado, documentos, acuerdo vigente y sus firmas. No pasa por el bloqueo.
export const getMiVerificacion = () => api.get('/api/moderator/verificacion')
// FormData con cedulaFrente, cedulaReverso y/o rostro (JPG o PNG hasta 5 MB). Se pueden mandar por partes.
export const subirDocumentosModerador = (form) => api.post('/api/moderator/verificacion/documentos', form, MULTIPART)
// FormData: acuerdoId, hashTexto, tipoFirma ('dibujada' | 'foto') y el archivo `firma`.
// { cedula }: número de cédula, solo dígitos (6 a 10).
export const solicitarContrato = (cedula) => api.post('/api/moderator/verificacion/solicitar', { cedula })
export const firmarAcuerdo = (form) => api.post('/api/moderator/verificacion/firmar', form, MULTIPART)
export const getMiPdfContrato = () => api.get('/api/moderator/verificacion/pdf', { responseType: 'blob' })

// Admin
const BASE = '/api/admin/moderadores/verificaciones'
export const getVerificacionesModeradores = (params) => api.get(BASE, { params })
export const getVerificacionModerador = (userId) => api.get(`${BASE}/${userId}`)
export const getPdfVerificacion = (userId) => api.get(`${BASE}/${userId}/pdf`, { responseType: 'blob' })
// El admin confirma que comparó el número de cédula con la foto.
export const generarContrato = (userId) => api.put(`${BASE}/${userId}/generar-contrato`, { cedulaVerificada: true })
export const suspenderVerificacion = (userId, nota) => api.put(`${BASE}/${userId}/suspender`, { nota })
export const rechazarVerificacion = (userId, nota) => api.put(`${BASE}/${userId}/reject`, { nota })
// Envía el contrato (firmado, o el texto sin firmar si aún no lo firma) en PDF. `email` opcional: por defecto el del moderador.
export const enviarContratoPorCorreo = (userId, email) => api.post(`${BASE}/${userId}/enviar-correo`, email ? { email } : {})
// Envía la plantilla vigente del acuerdo en PDF.
export const enviarPlantillaPorCorreo = (email) => api.post('/api/admin/acuerdos/enviar-correo', { email })
export const getAcuerdos = () => api.get('/api/admin/acuerdos')
export const publicarAcuerdo = (data) => api.post('/api/admin/acuerdos', data)
// Datos de gerencia para el contrato: nombre, cédula opcional, % del moderador, cláusula penal y firma.
export const getConfigAcuerdo = () => api.get('/api/admin/acuerdos/config')
export const guardarConfigAcuerdo = (data) => api.put('/api/admin/acuerdos/config', data)
// FormData con el archivo `firma` (JPG o PNG hasta 2 MB).
export const subirFirmaGerencia = (form) => api.post('/api/admin/acuerdos/config/firma', form, MULTIPART)

/** Abre un PDF (blob) en otra pestaña; si el navegador lo bloquea, lo descarga. */
export function abrirPdf(blob, nombre = 'contrato.pdf') {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.target = '_blank'
  a.rel = 'noopener'
  a.download = nombre
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

// Estado de la verificación → etiqueta y color del Badge.
export const ESTADO_VERIFICACION = {
  sin_enviar: { label: 'Sin enviar', variant: 'neutral' },
  solicitado: { label: 'Solicitado', variant: 'warning' },
  contrato_enviado: { label: 'Contrato enviado', variant: 'info' },
  activo: { label: 'Activo', variant: 'success' },
  rechazado: { label: 'Rechazado', variant: 'danger' },
  suspendido: { label: 'Suspendido', variant: 'danger' },
  vencido: { label: 'Vencido', variant: 'danger' },
  archivado: { label: 'Archivado', variant: 'neutral' },
}

// Marca visible para los datos legales que faltan en el texto ([RAZÓN SOCIAL], [NIT]…).
export const partirMarcadores = (texto = '') => texto.split(/(\[[^\]\n]{2,60}\])/g)
