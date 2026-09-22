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

/** Estado de conexión: conectado | en_ruta | desconectado */
export const connectionKey = (d) => {
  if (!d.online) return 'desconectado';
  return d.estadoVerificacion === 'aprobado' ? 'conectado' : 'en_ruta';
};

export const CONNECTION = {
  conectado: ['Conectado', 'success'],
  en_ruta: ['En ruta', 'info'],
  desconectado: ['Desconectado', 'neutral'],
};

export const connectionLabel = (d) => CONNECTION[connectionKey(d)][0];

