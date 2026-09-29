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
/** Qué precio muestra tripPrice: el final (ya cobrado) o el estimado. */
export const tripPriceKind = (trip) => {
  if (trip?.precioFinal != null) return 'Precio final';
  if (trip?.precioEstimado != null) return 'Estimado';
  return null;
};
export const tripDate = (trip) => trip?.createdAt;

export const personName = (p) => (p ? `${p.nombre || ''} ${p.apellido || ''}`.trim() || p.email || '—' : '—');

export const placeText = (v) => (typeof v === 'string' ? v : v?.direccion || '—');

export const money = (v) => (v == null ? '—' : formatCurrency(v));

export const shortId = (trip) => String(trip?.id ?? '');

/** "Camión · ABC123" con lo que exista. */
export const vehicleText = (p) => [p?.tipoVehiculo, p?.placa].filter(Boolean).join(' · ');

// Grupos de estados. `value` puede agrupar varios estados con coma (el filtro los separa).
export const EN_SERVICIO = 'aceptado,conductor_en_camino,conductor_llegada,en_curso,entregado,esperando_confirmacion';
export const ATENCION = 'sos,disputa,pendiente_confirmacion';

export const matchesStatus = (filter, trip) => filter === 'all' || filter.split(',').includes(tripStatus(trip));
