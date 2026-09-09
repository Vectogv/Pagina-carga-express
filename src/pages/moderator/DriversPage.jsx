import { useState, useEffect, useCallback } from 'react';
import DataTable from '../../components/admin/DataTable';
import ConfirmDialog from '../../components/admin/ConfirmDialog';
import { getModeratorDrivers, notifyDriver, reportDriver } from '../../api/moderator';

const theme = { bg: '#020208', cards: '#0f1220', accent: '#f59e0b', text: '#e2e8f0', muted: '#64748b', border: '#1e2238', success: '#22c55e', danger: '#ef4444' };

export default function ModeratorDriversPage() {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [action, setAction] = useState(null);
  const [nota, setNota] = useState('');
  const [toast, setToast] = useState(null);

  const fetch = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await getModeratorDrivers({ page: 1, limit: 50 });
      const d = res.data;
      setDrivers(Array.isArray(d) ? d : (d.drivers || d.data || []));
    } catch (err) { setError(err.response?.data?.message || 'Error al cargar conductores'); }
    finally { setLoading(false); }
  }, []);
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

  const columns = [
    { key: 'nombre', label: 'Conductor', render: (_, r) => `${r.usuario?.nombre || r.nombre || ''} ${r.usuario?.apellido || ''}`.trim() || '-' },
    { key: 'email', label: 'Email', render: (_, r) => r.usuario?.email || r.email || '-' },
    { key: 'telefono', label: 'Teléfono', render: (_, r) => r.usuario?.telefono || '-' },
    { key: 'placa', label: 'Placa', render: (_, r) => r.placa || '-' },
    { key: 'ciudad', label: 'Ciudad', render: (_, r) => r.ciudad || '-' },
    { key: 'online', label: 'Estado', render: (_, r) => <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 11, background: r.online ? 'rgba(34,197,94,0.15)' : 'rgba(100,116,139,0.15)', color: r.online ? '#22c55e' : '#64748b' }}>{r.online ? 'En línea' : 'Offline'}</span> },
    {
      key: 'acciones', label: 'Acciones', render: (_, r) => (
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => setAction({ type: 'notify', ...r })} style={btn(theme.accent)}>Notificar</button>
          <button onClick={() => setAction({ type: 'report', ...r })} style={btn(theme.danger)}>Reportar</button>
        </div>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {error && <div style={{ padding: 10, background: 'rgba(239,68,68,0.1)', color: theme.danger, borderRadius: 8, fontSize: 13 }}>{error}</div>}
      <DataTable columns={columns} data={drivers} loading={loading} emptyMessage="No hay conductores en tu ciudad" />
      {toast && <div style={{ position: 'fixed', bottom: 16, right: 16, background: toast.ok ? theme.success : theme.danger, color: '#fff', padding: '8px 14px', borderRadius: 8, fontSize: 13, zIndex: 9999 }}>{toast.msg}</div>}
      <ConfirmDialog isOpen={action?.type==='notify'} onClose={()=>setAction(null)} onConfirm={handleNotify} title="Notificar conductor" message={`¿Enviar push a ${action?.usuario?.email || ''}?`} confirmText="Notificar" />
      <ConfirmDialog isOpen={action?.type==='report'} onClose={()=>{setAction(null);setNota('');}} onConfirm={handleReport} title="Reportar a admin" message="Será visible en /admin/moderator-reports" confirmText="Reportar" danger>
        <textarea value={nota} onChange={(e)=>setNota(e.target.value)} placeholder="Ej: Inactivo 2 semanas, no responde" rows={3} style={{ width:'100%', marginTop:8, padding:'8px 10px', borderRadius:8, border:`1px solid ${theme.border}`, background:theme.bg, color:theme.text, fontSize:13 }} />
      </ConfirmDialog>
    </div>
  );
}
const btn = (color) => ({ padding:'4px 10px', borderRadius:6, border:'none', background:`${color}20`, color, fontSize:11, fontWeight:600, cursor:'pointer' });
