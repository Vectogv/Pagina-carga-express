const BACKEND_URL = 'https://bakend-cargaexpress-production.up.railway.app'

export function resolveStorageUrl(path) {
  if (!path) return ''
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:') || path.startsWith('blob:')) return path
  if (path.startsWith('/')) return `${BACKEND_URL}${path}`
  return `${BACKEND_URL}/storage/uploads/${path}`
}