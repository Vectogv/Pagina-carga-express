import { useState, useEffect } from 'react';
import DataTable from '../../components/admin/DataTable';
import ConfirmDialog from '../../components/admin/ConfirmDialog';
import { getInactiveDrivers, notifyDriver } from '../../api/moderator';
import { useModeratorCity } from '../../contexts/ModeratorCityContext';

const theme = { bg: '#020208', cards: '#0f1220', accent: '#f59e0b', text: '#e2e8f0', muted: '#64748b', border: '#1e2238', success: '#22c55e', danger: '#ef4444' };

export default function InactiveDriversPage() {
  const { ciudadParams } = useModeratorCity();
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [action, setAction] = useState(null);
  const [toast, setToast] = useState(null);

  const fetch = async () => {
    setLoading(true); setError(null);
    try {
      const res = await getInactiveDrivers({ page: 1, limit: 50, ...ciudadParams });
      const d = res.data;
      setDrivers(Array.isArray(d) ? d : (d.drivers || d.data || []));
    } catch (err) {
      if (err.response?.status === 403) setError('No tienes permisos de moderador o ciudad no asignada');
      else setError(err.response?.data?.message || 'Error al cargar inactivos');
    }
    finally { setLoading(false); }
  };
  useEffect(() => { fetch(); }, [ciudadParams]);

  const handleNotify = async () => {
    try { await notifyDriver(action.id || action.usuarioId); setToast({ msg: 'Notificación enviada', ok: true }); setAction(null); setTimeout(()=>setToast(null),2500); }
    catch (err) { setToast({ msg: err.response?.data?.message || 'Error', ok: false }); setTimeout(()=>setToast(null),2500); }
  };

  const columns = [
    { key: 'nombre', label: 'Conductor', render: (_, r) => `${r.usuario?.nombre || ''} ${r.usuario?.apellido || ''}`.trim() || r.nombre || '-' },
    { key: 'email', label: 'Email', render: (_, r) => r.usuario?.email || '-' },
    { key: 'ciudad', label: 'Ciudad', render: (_, r) => r.ciudad || '-' },
    { key: 'dias', label: 'Días inactivo', render: (_, r) => r.diasInactivo ?? r.dias ?? '7+ días' },
    { key: 'acciones', label: 'Acciones', render: (_, r) => <button onClick={() => setAction(r)} style={{ padding:'4px 10px', borderRadius:6, border:'none', background:`${theme.accent}20`, color:theme.accent, fontSize:11, fontWeight:600, cursor:'pointer' }}>Notificar</button> },
  ];

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
      <div style={{ background:`${theme.cards}`, border:`1px solid ${theme.border}`, borderRadius:8, padding:10, fontSize:12, color:theme.muted }}>Conductores con 7+ días sin viajes y offline en tu ciudad. Usa <b style={{color:theme.text}}>Notificar</b> para enviar push FCM recordatorio.</div>
      {error && <div style={{ padding:10, background:'rgba(239,68,68,0.1)', color:theme.danger, borderRadius:8, fontSize:13 }}>{error}</div>}
      <DataTable columns={columns} data={drivers} loading={loading} emptyMessage="No hay conductores inactivos" />
      {toast && <div style={{ position:'fixed', bottom:16, right:16, background: toast.ok ? theme.success : theme.danger, color:'#fff', padding:'8px 14px', borderRadius:8, fontSize:13 }}>{toast.msg}</div>}
      <ConfirmDialog isOpen={!!action} onClose={()=>setAction(null)} onConfirm={handleNotify} title="Notificar conductor inactivo" message={`¿Enviar recordatorio a ${action?.usuario?.email || ''}?`} confirmText="Notificar" />
    </div>
  );
}
