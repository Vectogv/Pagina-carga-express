export const shortId = (id) => String(id ?? '').slice(0, 8);

export const userName = (row) => {
  const u = row?.usuario;
  if (u) return `${u.nombre || ''} ${u.apellido || ''}`.trim() || u.telefono || '—';
  return row?.userName || row?.user?.name || '—';
};

export const ruta = (row) => (
  row?.viaje && (row.viaje.origen || row.viaje.destino)
    ? `${row.viaje.origen || '?'} → ${row.viaje.destino || '?'}`
    : null
);

export const coords = (row) => ((row?.lat || row?.lng) ? `${row.lat || '-'}, ${row.lng || '-'}` : null);

export const mapsUrl = (lat, lng) => `https://www.google.com/maps?q=${lat},${lng}`;
