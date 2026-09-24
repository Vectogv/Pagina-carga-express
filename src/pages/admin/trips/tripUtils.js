import { formatCurrency } from '../../../utils/format';

// Campos reales de GET /api/admin/trips (admin_controller.ts#trips): estado,
// origenDireccion, destinoDireccion, precioEstimado/precioFinal, cliente/conductor
// con {nombre, apellido, ...}, createdAt y los *_At de cada etapa.

export const tripStatus = (trip) => trip?.estado;

export const tripClient = (trip) => trip?.cliente;
export const tripDriver = (trip) => trip?.conductor;
export const tripOrigin = (trip) => trip?.origenDireccion || '—';
export const tripDestination = (trip) => trip?.destinoDireccion || '—';
export const tripPrice = (trip) => trip?.precioFinal ?? trip?.precioEstimado ?? null;
export const tripDate = (trip) => trip?.createdAt;

export const personName = (p) => (p ? `${p.nombre || ''} ${p.apellido || ''}`.trim() || p.email || '—' : '—');

export const placeText = (v) => (typeof v === 'string' ? v : v?.direccion || '—');

export const money = (v) => (v == null ? '—' : formatCurrency(v));

export const shortId = (trip) => String(trip?.id ?? '');
