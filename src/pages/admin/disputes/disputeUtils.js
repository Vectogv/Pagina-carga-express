export const DISPUTE_TYPES = {
  cancellation: ['Cancelación', 'danger'],
  no_show: ['No presentado', 'warning'],
  fare: ['Tarifa', 'primary'],
  route: ['Ruta', 'success'],
  behavior: ['Comportamiento', 'info'],
};

export const shortId = (id) => String(id ?? '').slice(0, 8);

/** El backend puede enviar la persona como string o como objeto. */
export const personLabel = (v) => (v && typeof v === 'object' ? v.name || v.nombre || '—' : v);

export const claimantName = (row) => personLabel(row.claimant) || row.user?.name || '—';

export const tripRef = (row) => {
  const id = row.tripId || row.trip?.id;
  return id ? `#${shortId(id)}` : '—';
};
