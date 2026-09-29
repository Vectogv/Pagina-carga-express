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

// Campos nuevos del backend (estado, motivo, atendidoPor): pueden no venir en la versión
// desplegada, así que todo es opcional. `atendidoPor` puede ser texto o {nombre, apellido}.
export const attendedBy = (row) => {
  const a = row?.atendidoPor;
  if (!a) return '';
  if (typeof a === 'string') return a;
  return `${a.nombre || ''} ${a.apellido || ''}`.trim();
};

/** { status, label } para <StatusBadge />: resuelta | atendida (por X) | pendiente. */
export const emergencyBadge = (row) => {
  if (row?.status === 'resolved' || row?.estado === 'resuelta') return { status: 'resuelta', label: 'Resuelta' };
  if (row?.estado === 'atendida') {
    const who = attendedBy(row);
    return { status: 'atendida', label: who ? `Atendida por ${who}` : 'Atendida' };
  }
  return { status: 'abierta', label: 'Pendiente' };
};

export const mapsUrl = (lat, lng) => `https://www.google.com/maps?q=${lat},${lng}`;
