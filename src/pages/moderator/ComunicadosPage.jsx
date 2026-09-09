import { useState, useEffect } from 'react';
import DataTable from '../../components/admin/DataTable';
import Modal from '../../components/admin/Modal';
import { createComunicado, getModeratorComunicados } from '../../api/moderator';

const theme = { bg: '#020208', cards: '#0f1220', accent: '#f59e0b', text: '#e2e8f0', muted: '#64748b', border: '#1e2238', success: '#22c55e', danger: '#ef4444' };

export default function ModeratorComunicadosPage() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ titulo: '', contenido: '' });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const fetch = async () => {
    setLoading(true); setError(null);
    try {
      const res = await getModeratorComunicados({ page: 1, limit: 50 });
      const d = res.data;
      setList(Array.isArray(d) ? d : (d.comunicados || d.data || []));
    } catch (err) { setError(err.response?.data?.message || 'Error al cargar comunicados'); }
    finally { setLoading(false); }
  };
  useEffect(() => { fetch(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.titulo.trim() || !form.contenido.trim()) return setToast({ msg: 'Completa título y contenido', ok: false });
    setSaving(true);
    try {
      await createComunicado({ titulo: form.titulo.trim(), contenido: form.contenido.trim() });
      setToast({ msg: 'Comunicado creado — pendiente de aprobación (admin:new_comunicado)', ok: true });
      setOpen(false); setForm({ titulo: '', contenido: '' }); fetch();
      setTimeout(()=>setToast(null),3000);
    } catch (err) { setToast({ msg: err.response?.data?.message || 'Error al crear', ok: false }); setTimeout(()=>setToast(null),3000); }
    finally { setSaving(false); }
  };

  const columns = [
    { key: 'titulo', label: 'Título', render: (v,r)=> v || r.titulo || '-' },
    { key: 'contenido', label: 'Contenido', render: (v,r)=> <span style={{ maxWidth:260, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', display:'inline-block' }}>{v || r.contenido || '-'}</span> },
    { key: 'estado', label: 'Estado', render: (v,r)=> { const s=v||r.estado||'pendiente'; const c=s==='aprobado'?theme.success:s==='rechazado'?theme.danger:theme.accent; return <span style={{ padding:'2px 8px', borderRadius:20, fontSize:11, background:`${c}20`, color:c }}>{s}</span>; } },
    { key: 'createdAt', label: 'Fecha', render: (v)=> v ? new Date(v).toLocaleDateString('es-CO') : '-' },
  ];

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <p style={{ color:theme.muted, fontSize:12, margin:0 }}>Creados para tu ciudad — quedan <b style={{color:theme.text}}>pendientes</b> hasta que admin apruebe.</p>
        <button onClick={()=>setOpen(true)} style={{ padding:'8px 14px', borderRadius:8, border:'none', background:theme.accent, color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer' }}>+ Nuevo Comunicado</button>
      </div>
      {error && <div style={{ padding:10, background:'rgba(239,68,68,0.1)', color:theme.danger, borderRadius:8, fontSize:13 }}>{error}</div>}
      <DataTable columns={columns} data={list} loading={loading} emptyMessage="No has creado comunicados" />
      {toast && <div style={{ position:'fixed', bottom:16, right:16, background: toast.ok ? theme.success : theme.danger, color:'#fff', padding:'8px 14px', borderRadius:8, fontSize:13 }}>{toast.msg}</div>}

      <Modal isOpen={open} onClose={()=>setOpen(false)} title="Nuevo Comunicado" size="sm">
        <form onSubmit={handleCreate} style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <div><label style={label}>Título *</label><input value={form.titulo} onChange={(e)=>setForm({...form,titulo:e.target.value})} placeholder="Ej: Recordatorio operativo" style={input} /></div>
          <div><label style={label}>Contenido *</label><textarea value={form.contenido} onChange={(e)=>setForm({...form,contenido:e.target.value})} placeholder="Mensaje para conductores de tu ciudad" rows={4} style={{...input, resize:'vertical'}} /></div>
          <button type="submit" disabled={saving} style={{ padding:'10px', borderRadius:8, border:'none', background:theme.accent, color:'#fff', fontWeight:700, cursor:'pointer', opacity:saving?0.6:1 }}>{saving?'Creando...':'Crear comunicado'}</button>
        </form>
      </Modal>
    </div>
  );
}
const label = { fontSize:12, fontWeight:600, color:'#64748b', display:'block', marginBottom:4 };
const input = { width:'100%', padding:'8px 12px', borderRadius:8, border:'1px solid #1e2238', background:'#020208', color:'#e2e8f0', fontSize:13, boxSizing:'border-box' };
