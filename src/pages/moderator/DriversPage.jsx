import { useState, useEffect, useCallback } from 'react';
import DataTable from '../../components/admin/DataTable';
import ConfirmDialog from '../../components/admin/ConfirmDialog';
import { getModeratorDrivers, notifyDriver, reportDriver, approveDriver, rejectDriver } from '../../api/moderator';
import { useModeratorCity } from '../../contexts/ModeratorCityContext';

const theme = { bg: '#020208', cards: '#0f1220', accent: '#f59e0b', text: '#e2e8f0', muted: '#64748b', border: '#1e2238', success: '#22c55e', danger: '#ef4444', warning: '#f59e0b' };

const VER_LABELS = { pendiente: 'Pendiente', aprobado: 'Aprobado', rechazado: 'Rechazado' };
const VER_COLORS = { pendiente: theme.warning, aprobado: theme.success, rechazado: theme.danger };

export default function ModeratorDriversPage() {
  const { ciudadParams } = useModeratorCity();
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [action, setAction] = useState(null);
  const [nota, setNota] = useState('');
  const [toast, setToast] = useState(null);
  const [filter, setFilter] = useState('');
  const [tab, setTab] = useState('pendiente');

  const fetch = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const params = { page: 1, limit: 100, ...ciudadParams };
      if (tab !== 'todos') params.estado = tab;
      const res = await getModeratorDrivers(params);
      const d = res.data;
      setDrivers(Array.isArray(d) ? d : (d.drivers || d.data || []));
    } catch (err) {
      if (err.response?.status === 403) setError('No tienes permisos de moderador o ciudad no asignada');
      else setError(err.response?.data?.message || 'Error al cargar conductores');
    } finally { setLoading(false); }
  }, [tab, ciudadParams]);
  useEffect(() => { fetch(); }, [fetch]);

  const showToast = (msg, ok=true) => { setToast({msg,ok}); setTimeout(()=>setToast(null),3000); };

  const handleNotify = async () => {
    try { await notifyDriver(action.id || action.usuarioId); showToast('Notificación enviada'); setAction(null); }
    catch (err) { showToast(err.response?.data?.message || 'Error al notificar', false); }
  };
  const handleReport = async () => {
    if (!nota.trim()) return showToast('Escribe descripción', false);
    try { await reportDriver(action.id || action.usuarioId, { descripcion: nota.trim() }); showToast('Reporte enviado a admin'); setAction(null); setNota(''); fetch(); }
    catch (err) { showToast(err.response?.data?.message || 'Error al reportar', false); }
  };
  const handleApprove = async () => {
    try { await approveDriver(action.id || action.usuarioId); showToast('Conductor aprobado'); setAction(null); fetch(); }
    catch (err) { showToast(err.response?.data?.message || 'Error al aprobar', false); }
  };
  const handleReject = async () => {
    if (!nota.trim()) return showToast('La nota de rechazo es obligatoria', false);
    try { await rejectDriver(action.id || action.usuarioId, { nota: nota.trim() }); showToast('Conductor rechazado'); setAction(null); setNota(''); fetch(); }
    catch (err) { showToast(err.response?.data?.message || 'Error al rechazar', false); }
  };

  const verBadge = (estado) => (
    <span style={{ padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: `${VER_COLORS[estado] || theme.muted}20`, color: VER_COLORS[estado] || theme.muted }}>
      {VER_LABELS[estado] || estado || '—'}
    </span>
  );

  const columns = [
    { key: 'nombre', label: 'Conductor', render: (_, r) => `${r.usuario?.nombre || r.nombre || ''} ${r.usuario?.apellido || ''}`.trim() || '-' },
    { key: 'email', label: 'Email', render: (_, r) => r.usuario?.email || r.email || '-' },
    { key: 'telefono', label: 'Teléfono', render: (_, r) => r.usuario?.telefono || '-' },
    { key: 'placa', label: 'Placa', render: (_, r) => r.placa || '-' },
    { key: 'ciudad', label: 'Ciudad', render: (_, r) => ((c) => c === 'california' ? 'cali' : c)(r.ciudad || '-') },
    { key: 'estadoVerificacion', label: 'Verificación', render: (_, r) => verBadge(r.estadoVerificacion) },
    {
      key: 'acciones', label: 'Acciones', render: (_, r) => {
        const pend = (r.estadoVerificacion || 'pendiente') === 'pendiente';
        return (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {pend && <button onClick={() => setAction({ type: 'approve', ...r })} style={btn(theme.success)}>Aprobar</button>}
            {pend && <button onClick={() => { setNota(''); setAction({ type: 'reject', ...r }); }} style={btn(theme.danger)}>Rechazar</button>}
            <button onClick={() => setAction({ type: 'notify', ...r })} style={btn(theme.accent)}>Notificar</button>
            <button onClick={() => setAction({ type: 'report', ...r })} style={btn(theme.danger)}>Reportar</button>
          </div>
        );
      },
    },
  ];

  const counts = {
    pendiente: drivers.filter((d) => (d.estadoVerificacion || 'pendiente') === 'pendiente').length,
    aprobado: drivers.filter((d) => d.estadoVerificacion === 'aprobado').length,
    rechazado: drivers.filter((d) => d.estadoVerificacion === 'rechazado').length,
    todos: drivers.length,
  };

  const filtered = drivers.filter((d) => {
    if (!filter.trim()) return true;
    const q = filter.toLowerCase();
    const u = d.usuario || {};
    return `${u.nombre || ''} ${u.apellido || ''}`.toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q) || (u.telefono || '').includes(q) || (d.placa || '').toLowerCase().includes(q);
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        {[['pendiente', 'Pendientes'], ['aprobado', 'Aprobados'], ['rechazado', 'Rechazados'], ['todos', 'Todos']].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={{
              padding: '6px 14px', borderRadius: 8, border: `1px solid ${theme.border}`,
              background: tab === key ? 'rgba(245,158,11,0.15)' : 'transparent',
              color: tab === key ? theme.accent : theme.muted, fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}
          >
            {label} <span style={{ opacity: tab === key ? 1 : 0.6 }}>({counts[key]})</span>
          </button>
        ))}
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Buscar por nombre, placa, correo o teléfono..."
          style={{ flex: 1, minWidth: 200, padding: '8px 12px', borderRadius: 8, border: `1px solid ${theme.border}`, background: theme.bg, color: theme.text, fontSize: 12 }}
        />
      </div>
      {error && <div style={{ padding: 10, background: 'rgba(239,68,68,0.1)', color: theme.danger, borderRadius: 8, fontSize: 13 }}>{error}</div>}
      <DataTable columns={columns} data={filtered} loading={loading} emptyMessage={filter ? `Sin resultados para "${filter}"` : (tab === 'pendiente' ? 'Sin conductores pendientes' : 'No hay conductores en tu ciudad')} />
      {toast && <div style={{ position: 'fixed', bottom: 16, right: 16, background: toast.ok ? theme.success : theme.danger, color: '#fff', padding: '8px 14px', borderRadius: 8, fontSize: 13, zIndex: 9999 }}>{toast.msg}</div>}
      <ConfirmDialog isOpen={action?.type==='notify'} onClose={()=>setAction(null)} onConfirm={handleNotify} title="Notificar conductor" message={`¿Enviar push a ${action?.usuario?.email || ''}?`} confirmText="Notificar" />
      <ConfirmDialog isOpen={action?.type==='approve'} onClose={()=>setAction(null)} onConfirm={handleApprove} title="Aprobar conductor" message={`¿Confirmar la verificación de ${action?.usuario?.nombre || ''} ${action?.usuario?.apellido || ''}? Se notifica al conductor.`} confirmText="Aprobar" danger={false} />
      <ConfirmDialog isOpen={action?.type==='reject'} onClose={()=>{setAction(null);setNota('');}} onConfirm={handleReject} title="Rechazar conductor" message={`La nota es obligatoria y se le envía al conductor ${action?.usuario?.email || ''}.`} confirmText="Rechazar" danger>
        <textarea value={nota} onChange={(e)=>setNota(e.target.value)} placeholder="Motivo del rechazo (obligatorio)" rows={3} style={{ width:'100%', marginTop:8, padding:'8px 10px', borderRadius:8, border:`1px solid ${theme.border}`, background:theme.bg, color:theme.text, fontSize:13 }} />
      </ConfirmDialog>
      <ConfirmDialog isOpen={action?.type==='report'} onClose={()=>{setAction(null);setNota('');}} onConfirm={handleReport} title="Reportar a admin" message="Será visible en /admin/moderator-reports" confirmText="Reportar" danger>
        <textarea value={nota} onChange={(e)=>setNota(e.target.value)} placeholder="Ej: Inactivo 2 semanas, no responde" rows={3} style={{ width:'100%', marginTop:8, padding:'8px 10px', borderRadius:8, border:`1px solid ${theme.border}`, background:theme.bg, color:theme.text, fontSize:13 }} />
      </ConfirmDialog>
    </div>
  );
}
const btn = (color) => ({ padding:'4px 10px', borderRadius:6, border:'none', background:`${color}20`, color, fontSize:11, fontWeight:600, cursor:'pointer' });