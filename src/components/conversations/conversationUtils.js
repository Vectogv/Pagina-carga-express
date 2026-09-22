import { formatTime, toList } from '../../utils/format';

/** Compara identificadores que pueden llegar como número o string. */
export const sameId = (a, b) => a != null && b != null && String(a) === String(b);

/** Staff interno (admin o moderador): se muestra aparte en "Nueva conversación". */
export const isStaff = (u) => Boolean(u?.esModerador) || u?.rol === 'admin';

/** Rol visible de un participante: ADMIN | MODERADOR | CONDUCTOR | CLIENTE. */
export const getRolEtiqueta = (u) => {
  if (!u) return 'CLIENTE';
  if (u.esModerador) return 'MODERADOR';
  if (u.rol === 'admin' || u.role === 'admin') return 'ADMIN';
  if (u.rol === 'conductor') return 'CONDUCTOR';
  return 'CLIENTE';
};

export const ROL_BADGE = {
  ADMIN: { label: 'Admin', variant: 'danger' },
  MODERADOR: { label: 'Moderador', variant: 'warning' },
  CONDUCTOR: { label: 'Conductor', variant: 'info' },
  CLIENTE: { label: 'Cliente', variant: 'primary' },
};

export const isSameDay = (a, b) => {
  const da = new Date(a);
  const db = new Date(b);
  return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate();
};

const dayFormat = new Intl.DateTimeFormat('es-CO', { weekday: 'short', day: 'numeric', month: 'short' });
const shortDayFormat = new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: 'short' });
const salidaFormat = new Intl.DateTimeFormat('es-CO', { dateStyle: 'short', timeStyle: 'short' });

export const formatDia = (v) => {
  if (!v) return '';
  const s = dayFormat.format(new Date(v));
  return s.charAt(0).toUpperCase() + s.slice(1);
};

export const formatDiaCorto = (v) => (v ? shortDayFormat.format(new Date(v)) : '');

export const formatFechaSalida = (v) => (v ? salidaFormat.format(new Date(v)) : '—');

/** Fecha de salida del viaje asociado (o creación de la conversación). */
export const fechaSalidaDe = (c) => c?.fechaSalida || c?.viaje?.fechaSalida || c?.createdAt;

export const toContactList = (d) => toList(d, 'drivers', 'users');

export const recencyOf = (c) => new Date(c.updatedAt || c.ultimoMensajeAt || c.createdAt || 0).getTime();

export const sortByRecency = (list) => [...list].sort((a, b) => recencyOf(b) - recencyOf(a));

export const fullNameOf = (u) => `${u?.nombre || ''} ${u?.apellido || ''}`.trim();

/** Nombre comparable (sin mayúsculas ni espacios de más) para emparejar participantes. */
export const normalizarNombre = (v) => String(v || '').trim().toLowerCase().replace(/\s+/g, ' ');

/** Hora del último mensaje: la hora si es de hoy, el día si es anterior. */
export const formatHoraLista = (v) => {
  if (!v) return '';
  return isSameDay(v, new Date()) ? formatTime(v) : formatDiaCorto(v);
};

/* ── Mensajes: identidad, orden y conciliación ────────────────────────
 * El id real del backend es la única clave: un mensaje propio se pinta
 * primero con un id temporal ('tmp-…') y luego se reemplaza por el real,
 * sin importar si llega antes la respuesta HTTP o el evento de socket.
 */

/** ¿Es un mensaje optimista que todavía no tiene id del servidor? */
export const esTemporal = (id) => String(id).startsWith('tmp-');

const tiempoDe = (m) => {
  const t = new Date(m?.createdAt || 0).getTime();
  return Number.isNaN(t) ? 0 : t;
};

// Desempate cuando dos mensajes comparten fecha: por id real; los temporales al final.
const pesoDe = (m) => (esTemporal(m?.id) ? Number.MAX_SAFE_INTEGER : Number(m?.id) || 0);

/** Ordena siempre por fecha de creación (no por orden de llegada). */
export const ordenarPorFecha = (list) => [...list].sort((a, b) => (tiempoDe(a) - tiempoDe(b)) || (pesoDe(a) - pesoDe(b)));

/**
 * Inserta o actualiza un mensaje por id real.
 * Si el id ya existe se fusiona (nunca se duplica).
 */
export const mergeMensaje = (list, msg) => {
  const actual = list || [];
  if (actual.some((m) => sameId(m.id, msg.id))) {
    return actual.map((m) => (sameId(m.id, msg.id) ? { ...m, ...msg, estadoEnvio: undefined } : m));
  }
  return ordenarPorFecha([...actual, msg]);
};

/**
 * Sustituye un mensaje optimista por el definitivo del servidor.
 * Si el definitivo ya estaba en la lista (llegó antes por socket) solo se
 * descarta el temporal.
 */
export const reemplazarOptimista = (list, tmpId, msg) => {
  const actual = list || [];
  const yaEsta = actual.some((m) => sameId(m.id, msg.id));
  if (yaEsta) return mergeMensaje(actual.filter((m) => !sameId(m.id, tmpId)), msg);
  if (!actual.some((m) => sameId(m.id, tmpId))) return mergeMensaje(actual, msg);
  return ordenarPorFecha(actual.map((m) => (sameId(m.id, tmpId) ? { ...msg } : m)));
};
