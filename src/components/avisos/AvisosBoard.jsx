import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import DataTable from '../admin/DataTable';
import ConfirmDialog from '../admin/ConfirmDialog';
import { getAvisos, createAviso, pinAviso, deleteAviso } from '../../api/moderator';

const theme = { bg: '#020208', cards: '#0f1220', accent: '#f59e0b', text: '#e2e8f0', muted: '#64748b', border: '#1e2238', success: '#22c55e', danger: '#ef4444' };

const SOCKET_URL = 'https://bakend-cargaexpress-production.up.railway.app';

const LABELS = {
  ciudad: { formLabel: 'Nuevo aviso para tu ciudad', emptyMessage: 'No hay avisos en tu ciudad' },
  admin: { formLabel: 'Publica un aviso general', emptyMessage: 'No hay avisos' },
};

export default function AvisosBoard({ variante = 'ciudad' }) {
  const { formLabel, emptyMessage } = LABELS[variante] || LABELS.ciudad;
  const [avisos, setAvisos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [contenido, setContenido] = useState('');
  const [saving, setSaving] = useState(false);
  const [action, setAction] = useState(null);
  const [toast, setToast] = useState(null);

  const fetch = async () => {
    setLoading(true); setError(null);
    try {
      const res = await getAvisos({ page: 1, limit: 50 });
      const d = res.data;
      setAvisos(Array.isArray(d) ? d : (d.avisos || d.data || []));
    } catch (err) { setError(err.response?.data?.message || 'Error al cargar avisos'); }
    finally { setLoading(false); }
  };
  useEffect(() => { fetch(); }, []);

  // Refresco en tiempo real cuando llega un aviso nuevo.
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;
    const socket = io(SOCKET_URL, { transports: ['websocket'], auth: { token: `Bearer ${token}` }, query: { token: `Bearer ${token}` } });
    socket.on('avisos:new_message', () => fetch());
    return () => socket.disconnect();
  }, []);

  const showToast = (msg, ok=true) => { setToast({msg,ok}); setTimeout(()=>setToast(null),2500); };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!contenido.trim()) return showToast('Escribe contenido', false);
    setSaving(true);
    try { await createAviso({ contenido: contenido.trim() }); setContenido(''); showToast('Aviso publicado'); fetch(); }
    catch (err) { showToast(err.response?.data?.message || 'Error al publicar', false); }
    finally { setSaving(false); }
  };

  const handlePin = async () => {
    try { await pinAviso(action.id || action._id); showToast(action.fijado ? 'Aviso desfijado' : 'Aviso fijado'); setAction(null); fetch(); }
    catch (err) { showToast(err.response?.data?.message || 'Error', false); }
  };
  const handleDelete = async () => {
    try { await deleteAviso(action.id || action._id); showToast('Aviso eliminado'); setAction(null); fetch(); }
    catch (err) { showToast(err.response?.data?.message || 'Error al eliminar', false); }
  };

  const columns = [
    { key: 'contenido', label: 'Contenido', render: (v,r)=> <span style={{ maxWidth:320, display:'inline-block', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{v || r.contenido || '-'}</span> },
    { key: 'fijado', label: 'Fijado', render: (v,r)=> (v||r.fijado||r.pinned) ? <span style={{ padding:'2px 8px', borderRadius:20, fontSize:11, background:`${theme.accent}20`, color:theme.accent }}>📌 Fijado</span> : <span style={{ fontSize:11, color:theme.muted }}>—</span> },
    { key: 'createdAt', label: 'Fecha', render: (v)=> v ? new Date(v).toLocaleDateString('es-CO') : '-' },
    {
      key: 'acciones', label: 'Acciones', render: (_, r) => (
        <div style={{ display:'flex', gap:6 }}>
          <button onClick={() => setAction({ type:'pin', ...r })} style={btn(theme.accent)}>{r.fijado ? 'Desfijar' : 'Fijar'}</button>
          <button onClick={() => setAction({ type:'delete', ...r })} style={btn(theme.danger)}>Eliminar</button>
        </div>
      ),
    },
  ];

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      <form onSubmit={handleCreate} style={{ background:theme.cards, border:`1px solid ${theme.border}`, borderRadius:10, padding:14, display:'flex', gap:10, alignItems:'flex-end' }}>
        <div style={{ flex:1 }}>
          <label style={{ fontSize:11, fontWeight:600, color:theme.muted, display:'block', marginBottom:4 }}>{formLabel}</label>
          <input value={contenido} onChange={(e)=>setContenido(e.target.value)} placeholder="¡Buenos días a todos!" style={{ width:'100%', padding:'8px 10px', borderRadius:8, border:`1px solid ${theme.border}`, background:theme.bg, color:theme.text, fontSize:13, boxSizing:'border-box' }} />
        </div>
        <button type="submit" disabled={saving} style={{ padding:'8px 14px', borderRadius:8, border:'none', background:theme.accent, color:'#fff', fontWeight:700, fontSize:12, cursor:'pointer', opacity:saving?0.6:1 }}>{saving?'Publicando...':'Publicar'}</button>
      </form>
      {error && <div style={{ padding:10, background:'rgba(239,68,68,0.1)', color:theme.danger, borderRadius:8, fontSize:13 }}>{error}</div>}
      <DataTable columns={columns} data={avisos} loading={loading} emptyMessage={emptyMessage} />
      {toast && <div style={{ position:'fixed', bottom:16, right:16, background: toast.ok ? theme.success : theme.danger, color:'#fff', padding:'8px 14px', borderRadius:8, fontSize:13 }}>{toast.msg}</div>}
      <ConfirmDialog isOpen={action?.type==='pin'} onClose={()=>setAction(null)} onConfirm={handlePin} title={action?.fijado ? 'Desfijar aviso' : 'Fijar aviso'} message={action?.fijado ? '¿Desfijar este aviso?' : '¿Fijar este aviso arriba?'} confirmText={action?.fijado ? 'Desfijar' : 'Fijar'} />
      <ConfirmDialog isOpen={action?.type==='delete'} onClose={()=>setAction(null)} onConfirm={handleDelete} title="Eliminar aviso" message="¿Eliminar este aviso? Se marcará como eliminado." confirmText="Eliminar" danger />
    </div>
  );
}
const btn = (c) => ({ padding:'4px 10px', borderRadius:6, border:'none', background:`${c}20`, color:c, fontSize:11, fontWeight:600, cursor:'pointer' });