import { toList } from '../../utils/format';

/** Compara identificadores que pueden llegar como número o string. */
export const sameId = (a, b) => a != null && b != null && String(a) === String(b);

/** Staff interno (admin o moderador): se muestra aparte en "Nueva conversación". */
export const isStaff = (u) => Boolean(u?.esModerador) || u?.rol === 'admin';

/** Rol visible de un participante: ADMIN | MODERADOR | CONDUCTOR | CLIENTE. */
export const getRolEtiqueta = (u) => {
  if (!u) return 'CLIENTE';
  if (u.etiqueta && ['ADMIN', 'MODERADOR', 'CONDUCTOR', 'CLIENTE'].includes(u.etiqueta)) return u.etiqueta;
  if (u.esModerador || u.rol === 'moderador') return 'MODERADOR';
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

/**
 * Grupos de la lista según el rol real del otro participante
 * (admin y moderadores forman el equipo interno).
 */
export const GRUPOS = [
  { key: 'equipo', label: 'Equipo' },
  { key: 'conductores', label: 'Conductores' },
  { key: 'clientes', label: 'Clientes' },
];

export const grupoDe = (u) => {
  const rol = getRolEtiqueta(u);
  if (rol === 'ADMIN' || rol === 'MODERADOR') return 'equipo';
  if (rol === 'CONDUCTOR') return 'conductores';
  return 'clientes';
};

/** Clave de ciudad de una conversación (la de la conversación o la del contacto). */
export const ciudadDe = (c, u) => String(c?.ciudad || u?.zonaModerador || u?.ciudad || '').trim().toLowerCase();

export const isSameDay = (a, b) => {
  const da = new Date(a);
  const db = new Date(b);
  return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate();
};

const DIA_MS = 24 * 60 * 60 * 1000;
const inicioDelDia = (v) => { const d = new Date(v); d.setHours(0, 0, 0, 0); return d.getTime(); };
/** Días de calendario entre la fecha y hoy (0 = hoy, 1 = ayer…). */
const diasDesde = (v) => Math.round((inicioDelDia(new Date()) - inicioDelDia(v)) / DIA_MS);
const capitalizar = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');
const esValida = (v) => v && !Number.isNaN(new Date(v).getTime());

const horaFormat = new Intl.DateTimeFormat('es-CO', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
const weekdayFormat = new Intl.DateTimeFormat('es-CO', { weekday: 'long' });
const dos = (n) => String(n).padStart(2, '0');
const diaLargoFormat = new Intl.DateTimeFormat('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });
const diaLargoAnioFormat = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });

/** Hora en 24 h (HH:mm). */
export const formatHora = (v) => (esValida(v) ? horaFormat.format(new Date(v)) : '');

/** Hora de la lista: HH:mm hoy, "Ayer", día de la semana (7 días) o dd/MM. */
export const formatHoraLista = (v) => {
  if (!esValida(v)) return '';
  const d = new Date(v);
  const dias = diasDesde(d);
  if (dias <= 0) return formatHora(d);
  if (dias === 1) return 'Ayer';
  if (dias < 7) return capitalizar(weekdayFormat.format(d));
  const ddmm = `${dos(d.getDate())}/${dos(d.getMonth() + 1)}`;
  return d.getFullYear() === new Date().getFullYear() ? ddmm : `${ddmm}/${String(d.getFullYear()).slice(-2)}`;
};

/** Separador de día en el hilo: "Hoy", "Ayer" o la fecha completa. */
export const formatDia = (v) => {
  if (!esValida(v)) return '';
  const d = new Date(v);
  const dias = diasDesde(d);
  if (dias <= 0) return 'Hoy';
  if (dias === 1) return 'Ayer';
  if (d.getFullYear() !== new Date().getFullYear()) return diaLargoAnioFormat.format(d);
  return capitalizar(diaLargoFormat.format(d));
};

/** Fecha y hora completas (para el title al pasar el cursor). */
export const formatFechaCompleta = (v) => (esValida(v) ? `${formatDia(v)}, ${formatHora(v)}` : '');

/** Identificador corto del viaje (los ids pueden ser UUID). */
export const viajeCorto = (id) => (id == null ? '' : String(id).slice(0, 8));

export const toContactList = (d) => toList(d, 'drivers', 'users');

export const recencyOf = (c) => new Date(c.updatedAt || c.ultimoMensajeAt || c.createdAt || 0).getTime();

export const sortByRecency = (list) => [...list].sort((a, b) => recencyOf(b) - recencyOf(a));

export const fullNameOf = (u) => `${u?.nombre || ''} ${u?.apellido || ''}`.trim();

/** Nombre comparable (sin mayúsculas ni espacios de más) para emparejar participantes. */
export const normalizarNombre = (v) => String(v || '').trim().toLowerCase().replace(/\s+/g, ' ');

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
