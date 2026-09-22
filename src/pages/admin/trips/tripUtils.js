import { formatCurrency } from '../../../utils/format';

// El backend puede devolver estados en inglés; se normalizan a los del mapa de StatusBadge.
const STATUS_ALIASES = {
  pending: 'pendiente',
  active: 'activo',
  completed: 'completado',
  cancelled: 'cancelado',
};

export const tripStatus = (trip) => {
  const s = trip?.estado || trip?.status;
  return STATUS_ALIASES[s] || s;
};

export const tripClient = (trip) => trip?.cliente || trip?.client || trip?.passenger;
export const tripDriver = (trip) => trip?.conductor || trip?.driver;
export const tripOrigin = (trip) => trip?.origen || trip?.origin || trip?.pickup || '—';
export const tripDestination = (trip) => trip?.destino || trip?.destination || '—';
export const tripPrice = (trip) => trip?.precio || trip?.price || trip?.fare;
export const tripDate = (trip) => trip?.fecha || trip?.date || trip?.createdAt;

export const personName = (p) => p?.nombre || p?.name || p?.email || '—';

export const placeText = (v) => (typeof v === 'string' ? v : v?.direccion || '—');

export const money = (v) => (v == null ? '—' : formatCurrency(v));

export const shortId = (trip) => {
  const id = trip?.id || trip?._id || '';
  return String(id).slice(-6).toUpperCase();
};
