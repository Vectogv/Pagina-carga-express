import { useState, useEffect, useCallback } from 'react';
import DataTable from '../../components/admin/DataTable';
import { getModeratorTrips } from '../../api/moderator';

const theme = { bg: '#0d1117', cards: '#161b22', border: '#21262d', text: '#f0f6fc', muted: '#8b949e', accent: '#f59e0b', success: '#2ea043', warning: '#d29922', danger: '#f85149' };

const estadoColors = {
  pendiente: { bg: 'rgba(139,148,158,0.15)', color: '#8b949e' },
  aceptado: { bg: 'rgba(31,111,235,0.15)', color: '#58a6ff' },
  en_curso: { bg: 'rgba(210,153,34,0.15)', color: '#d29922' },
  finalizado: { bg: 'rgba(46,160,67,0.15)', color: '#2ea043' },
  completado: { bg: 'rgba(46,160,67,0.15)', color: '#2ea043' },
  cancelado: { bg: 'rgba(248,81,73,0.15)', color: '#f85149' },
};

export default function ModeratorTripsPage() {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [estado, setEstado] = useState('');

  const fetchTrips = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const params = { page: 1, limit: 20 };
      if (estado) params.estado = estado;
      const res = await getModeratorTrips(params);
      const d = res.data;
      setTrips(Array.isArray(d) ? d : (d.trips || d.data || []));
    } catch (err) { setError(err.response?.data?.message || 'Error al cargar viajes'); }
    finally { setLoading(false); }
  }, [estado]);

  useEffect(() => { fetchTrips(); }, [fetchTrips]);

  const columns = [
    { key: 'id', label: 'ID', render: (v) => <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#58a6ff' }}>#{String(v).slice(0, 8)}</span> },
    { key: 'cliente', label: 'Cliente', render: (_, r) => r.cliente?.nombre || r.cliente?.email || r.cliente_id || '-' },
    { key: 'conductor', label: 'Conductor', render: (_, r) => r.conductor?.placa || r.conductor?.nombre || r.conductor_id || '-' },
    { key: 'origen', label: 'Origen', render: (_, r) => r.origenDireccion || r.origen?.direccion || (typeof r.origen === 'string' ? r.origen : '-') },
    { key: 'destino', label: 'Destino', render: (_, r) => r.destinoDireccion || r.destino?.direccion || (typeof r.destino === 'string' ? r.destino : '-') },
    { key: 'estado', label: 'Estado', render: (v) => { const s = estadoColors[v] || { bg: 'rgba(139,148,158,0.15)', color: '#8b949e' }; return <span style={{ padding: '3px 8px', borderRadius: 12, fontSize: 11, background: s.bg, color: s.color, textTransform: 'capitalize' }}>{v || '-'}</span>; } },
    { key: 'precio', label: 'Precio', render: (_, r) => r.precioCliente ? `$${Number(r.precioCliente).toLocaleString('es-CO')}` : '-' },
    { key: 'createdAt', label: 'Fecha', render: (v) => v ? new Date(v).toLocaleDateString('es-CO') : '-' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, color: theme.muted }}>Filtrar por estado:</span>
        <select value={estado} onChange={(e) => setEstado(e.target.value)} style={{ padding: '6px 10px', borderRadius: 8, border: `1px solid ${theme.border}`, background: theme.cards, color: theme.text, fontSize: 12 }}>
          <option value="">Todos (con conductor)</option>
          <option value="pendiente">Pendiente</option>
          <option value="aceptado">Aceptado</option>
          <option value="en_curso">En curso</option>
          <option value="finalizado">Finalizado</option>
          <option value="cancelado">Cancelado</option>
          <option value="en_curso,aceptado">En curso + Aceptado</option>
        </select>
        <span style={{ fontSize: 10, color: theme.muted }}>Solo viajes con conductor asignado de tu ciudad</span>
      </div>
      {error && <div style={{ padding: 10, background: 'rgba(248,81,73,0.1)', color: theme.danger, borderRadius: 8, fontSize: 12 }}>{error}</div>}
      <DataTable columns={columns} data={trips} loading={loading} emptyMessage="No hay viajes en tu ciudad con los filtros actuales" />
    </div>
  );
}
