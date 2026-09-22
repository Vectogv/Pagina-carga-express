// Formateadores compartidos (es-CO). Usar estos en lugar de redefinirlos por página.

const currency = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
const number = new Intl.NumberFormat('es-CO');
const dateTime = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' });
const dateOnly = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium' });
const timeOnly = new Intl.DateTimeFormat('es-CO', { hour: '2-digit', minute: '2-digit' });

const toDate = (v) => {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};

export const formatCurrency = (v) => currency.format(Number(v) || 0);
export const formatNumber = (v) => number.format(Number(v) || 0);
export const formatDateTime = (v) => { const d = toDate(v); return d ? dateTime.format(d) : '—'; };
export const formatDate = (v) => { const d = toDate(v); return d ? dateOnly.format(d) : '—'; };
export const formatTime = (v) => { const d = toDate(v); return d ? timeOnly.format(d) : ''; };

export function timeAgo(v) {
  const d = toDate(v);
  if (!d) return '';
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 45) return 'Ahora';
  const m = Math.floor(s / 60);
  if (m < 60) return `Hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `Hace ${h} h`;
  const days = Math.floor(h / 24);
  if (days === 1) return 'Ayer';
  if (days < 30) return `Hace ${days} días`;
  return formatDate(d);
}

export function formatBytes(bytes) {
  const n = Number(bytes) || 0;
  if (n < 1024) return `${n} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = n / 1024;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) { value /= 1024; i += 1; }
  return `${value.toFixed(1)} ${units[i]}`;
}

export const fullName = (u) => (u ? `${u.nombre || ''} ${u.apellido || ''}`.trim() || u.name || u.email || '—' : '—');

/** Normaliza respuestas del backend que pueden venir como array, {data}, {users}, etc. */
export function toList(d, ...keys) {
  if (Array.isArray(d)) return d;
  if (!d || typeof d !== 'object') return [];
  for (const k of [...keys, 'data', 'items', 'results']) {
    if (Array.isArray(d[k])) return d[k];
    if (d[k] && typeof d[k] === 'object' && Array.isArray(d[k].data)) return d[k].data;
  }
  return [];
}

/** Mensaje de error legible desde un error de axios. */
export const errorMessage = (err, fallback = 'Ocurrió un error inesperado') =>
  err?.response?.data?.message
  || err?.response?.data?.errors?.[0]?.message
  || err?.response?.data?.error
  || err?.message
  || fallback;
