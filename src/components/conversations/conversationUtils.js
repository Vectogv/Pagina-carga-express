import { toList } from '../../utils/format';

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
