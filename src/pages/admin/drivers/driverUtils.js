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
 * Estado de conexión: conectado | sin_senal | desconectado. El servidor manda `online`
 * y `sinSenal` (conectado pero sin ubicación reciente; ultimaSenalAt dice desde cuándo).
 */
export const connectionKey = (d) => (!d?.online ? 'desconectado' : d.sinSenal ? 'sin_senal' : 'conectado');

export const CONNECTION = {
  conectado: ['Conectado', 'success'],
  sin_senal: ['Sin señal', 'warning'],
  desconectado: ['Desconectado', 'neutral'],
};

export const connectionLabel = (d) => CONNECTION[connectionKey(d)][0];
