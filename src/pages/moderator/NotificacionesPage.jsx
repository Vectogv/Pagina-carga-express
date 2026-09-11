import { useState, useEffect, useCallback } from 'react';
import DataTable from '../../components/admin/DataTable';
import { getMyReports } from '../../api/moderator';
import { useModeratorCity } from '../../contexts/ModeratorCityContext';

const theme = { bg: '#020208', cards: '#0f1220', accent: '#f59e0b', text: '#e2e8f0', muted: '#64748b', border: '#1e2238', success: '#22c55e', danger: '#ef4444', warning: '#f59e0b' };

const normList = (d) => (Array.isArray(d) ? d : (d.data || d.reports || []));

export default function NotificacionesPage() {
  const { ciudadParams } = useModeratorCity();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetch = useCallback(async () => {
    try {
      const res = await getMyReports({ page: 1, limit: 50, ...ciudadParams });
      setReports(normList(res.data));
    } catch (err) {
      if (err.response?.status === 403) setError('No tienes permisos de moderador o ciudad no asignada');
      else setError(err.response?.data?.message || 'Error al cargar notificaciones');
    } finally { setLoading(false); }
  }, [ciudadParams]);

  useEffect(() => { fetch(); }, [fetch]);
  useEffect(() => { const id = setInterval(fetch, 60000); return () => clearInterval(id); }, [fetch]);

  const tpl = (v) => <span style={{ fontSize: 13 }}>{v || '—'}</span>;
  const stateBadge = (estado) => {
    const e = estado || 'abierta';
    const color = e === 'resuelta' || e === 'atendida' ? theme.success : e === 'pendiente' || e === 'abierta' ? theme.warning : theme.muted;
    return <span style={{ padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: `${color}20`, color }}>{e}</span>;
  };

  const columns = [
    { key: 'fecha', label: 'Fecha', render: (v, r) => tpl(v || r.createdAt ? new Date(r.createdAt || v).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—') },
    { key: 'conductor', label: 'Conductor', render: (v, r) => tpl(v || r.conductor?.nombre || r.conductorName || r.driver?.nombre || '—') },
    { key: 'descripcion', label: 'Descripción', render: (v, r) => tpl(v || r.descripcion || r.description || r.contenido || r.content || '—') },
    { key: 'estado', label: 'Estado', render: (v, r) => stateBadge(v || r.estado) },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ background: `${theme.cards}`, border: `1px solid ${theme.border}`, borderRadius: 8, padding: 10, fontSize: 12, color: theme.muted }}>
        Notificaciones y reportes que enviaste al admin. Se actualizan cada minuto y al entrar.
      </div>
      {error && <div style={{ padding: 10, background: 'rgba(239,68,68,0.1)', color: theme.danger, borderRadius: 8, fontSize: 13 }}>{error}</div>}
      <DataTable columns={columns} data={reports} loading={loading} emptyMessage="No tienes reportes ni notificaciones" />
    </div>
  );
}