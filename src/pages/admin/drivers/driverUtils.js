import { fullName } from '../../../utils/format';

export const ciudadLabel = (c) => {
  if (!c) return '—';
  const key = String(c).toLowerCase();
  return key.charAt(0).toUpperCase() + key.slice(1);
};

/** id del usuario asociado al conductor (para endpoints /users/:id). */
export const driverUserId = (d) => d?.usuarioId || d?.usuario?.id;
export const driverName = (d) => {
  const u = d?.usuario;
  return u && (u.nombre || u.apellido) ? fullName(u) : (d?.nombre || 'Sin nombre');
};

/**
 * Estado de conexión: conectado | desconectado. GET /api/admin/drivers solo manda
 * `online`; antes un conductor en línea sin verificar salía como "En ruta", que no
 * tiene nada que ver con estar en un viaje.
 */
export const connectionKey = (d) => (d?.online ? 'conectado' : 'desconectado');

export const CONNECTION = {
  conectado: ['Conectado', 'success'],
  desconectado: ['Desconectado', 'neutral'],
};

export const connectionLabel = (d) => CONNECTION[connectionKey(d)][0];

