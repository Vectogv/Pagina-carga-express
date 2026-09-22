// URL del backend. En desarrollo y en Vercel las llamadas HTTP van por el proxy `/api`;
// los sockets y los archivos subidos necesitan la URL absoluta.
export const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL || 'https://bakend-cargaexpress-production.up.railway.app').replace(/\/$/, '');
export const SOCKET_URL = BACKEND_URL;
