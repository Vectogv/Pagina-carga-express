import { useState, useEffect } from 'react';
import DataTable from '../../components/admin/DataTable';
import Modal from '../../components/admin/Modal';
import { createEncuesta, getEncuestaResults, getMyEncuestas } from '../../api/moderator';

const theme = { bg: '#020208', cards: '#0f1220', accent: '#f59e0b', text: '#e2e8f0', muted: '#64748b', border: '#1e2238', success: '#22c55e', danger: '#ef4444' };

export default function ModeratorEncuestasPage() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ pregunta: '', opciones: ['', ''], fechaCierre: '' });
  const [saving, setSaving] = useState(false);
  const [results, setResults] = useState(null);
  const [toast, setToast] = useState(null);

  const fetch = async () => {
    setLoading(true); setError(null);
    try {
      const res = await getMyEncuestas({ page: 1, limit: 50 });
      const d = res.data;
      const all = Array.isArray(d) ? d : (d.data || d.encuestas || []);
      setList(all);
    } catch (err) { setError(err.response?.data?.message || 'Error al cargar encuestas'); }
    finally { setLoading(false); }
  };
  useEffect(() => { fetch(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    const opciones = form.opciones.map((o) => o.trim()).filter(Boolean);
    if (!form.pregunta.trim() || opciones.length < 2) return setToast({ msg: 'Pregunta y mínimo 2 opciones', ok: false });
    setSaving(true);
    try {
      const payload = { pregunta: form.pregunta.trim(), opciones };
      if (form.fechaCierre) payload.fechaCierre = form.fechaCierre;
      await createEncuesta(payload);
      setToast({ msg: 'Encuesta creada — pendiente aprobación', ok: true });
      setOpen(false); setForm({ pregunta: '', opciones: ['', ''], fechaCierre: '' }); fetch();
      setTimeout(()=>setToast(null),3000);
    } catch (err) { setToast({ msg: err.response?.data?.message || 'Error al crear', ok: false }); setTimeout(()=>setToast(null),3000); }
    finally { setSaving(false); }
  };

  const handleResults = async (row) => {
    try {
      const res = await getEncuestaResults(row.id || row._id);
      setResults(res.data);
    } catch (err) { setToast({ msg: 'No se pudo cargar resultados', ok: false }); setTimeout(()=>setToast(null),2500); }
  };

  const columns = [
    { key: 'pregunta', label: 'Pregunta', render: (v,r)=> v || r.pregunta || r.titulo || '-' },
    { key: 'opciones', label: 'Opciones', render: (v,r)=> `${(v || r.opciones || []).length} opciones` },
    { key: 'estado', label: 'Estado', render: (v,r)=> { const s=v||r.estado||'pendiente'; const c=s==='aprobado'?theme.success:theme.accent; return <span style={{ padding:'2px 8px', borderRadius:20, fontSize:11, background:`${c}20`, color:c }}>{s}</span>; } },
    { key: 'acciones', label: 'Acciones', render: (_,r)=> <button onClick={()=>handleResults(r)} style={{ padding:'4px 10px', borderRadius:6, border:'none', background:`${theme.accent}20`, color:theme.accent, fontSize:11, cursor:'pointer' }}>Ver resultados</button> },
  ];

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <p style={{ color:theme.muted, fontSize:12, margin:0 }}>Encuestas para tu ciudad — quedan pendientes hasta aprobación.</p>
        <button onClick={()=>setOpen(true)} style={{ padding:'8px 14px', borderRadius:8, border:'none', background:theme.accent, color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer' }}>+ Nueva Encuesta</button>
      </div>
      {error && <div style={{ padding:10, background:'rgba(239,68,68,0.1)', color:theme.danger, borderRadius:8, fontSize:13 }}>{error}</div>}
      <DataTable columns={columns} data={list} loading={loading} emptyMessage="No hay encuestas" />
      {results && (
        <div style={{ background:theme.cards, border:`1px solid ${theme.border}`, borderRadius:10, padding:14 }}>
          <h3 style={{ fontSize:12, color:theme.muted, margin:'0 0 8px' }}>Resultados</h3>
          <pre style={{ fontSize:12, color:theme.text, margin:0, whiteSpace:'pre-wrap', wordBreak:'break-all' }}>{JSON.stringify(results, null, 2)}</pre>
          <button onClick={()=>setResults(null)} style={{ marginTop:10, padding:'6px 12px', borderRadius:6, border:`1px solid ${theme.border}`, background:'transparent', color:theme.muted, cursor:'pointer' }}>Cerrar</button>
        </div>
      )}
      {toast && <div style={{ position:'fixed', bottom:16, right:16, background: toast.ok ? theme.success : theme.danger, color:'#fff', padding:'8px 14px', borderRadius:8, fontSize:13 }}>{toast.msg}</div>}

      <Modal isOpen={open} onClose={()=>setOpen(false)} title="Nueva Encuesta" size="sm">
        <form onSubmit={handleCreate} style={{ display:'flex', flexDirection:'column', gap:10 }}>
          <div><label style={label}>Pregunta *</label><input value={form.pregunta} onChange={(e)=>setForm({...form, pregunta:e.target.value})} placeholder="Ej: ¿Qué horario prefieres?" style={input} /></div>
          {form.opciones.map((op,i)=>(
            <div key={i}><label style={label}>Opción {i+1} *</label><div style={{ display:'flex', gap:6 }}><input value={op} onChange={(e)=>{ const arr=[...form.opciones]; arr[i]=e.target.value; setForm({...form,opciones:arr}); }} placeholder={`Opción ${i+1}`} style={{...input, flex:1}} />{form.opciones.length>2 && <button type="button" onClick={()=>setForm({...form, opciones: form.opciones.filter((_,idx)=>idx!==i)})} style={rmBtn}>✕</button>}</div></div>
          ))}
          <button type="button" onClick={()=>setForm({...form, opciones:[...form.opciones,'']})} style={{ padding:'6px', borderRadius:6, border:`1px dashed ${theme.border}`, background:'transparent', color:theme.muted, cursor:'pointer', fontSize:12 }}>+ Agregar opción</button>
          <div><label style={label}>Fecha cierre (opcional)</label><input type="date" value={form.fechaCierre} onChange={(e)=>setForm({...form, fechaCierre:e.target.value})} style={input} /></div>
          <button type="submit" disabled={saving} style={{ padding:'10px', borderRadius:8, border:'none', background:theme.accent, color:'#fff', fontWeight:700, cursor:'pointer', opacity:saving?0.6:1 }}>{saving?'Creando...':'Crear encuesta'}</button>
        </form>
      </Modal>
    </div>
  );
}
const label = { fontSize:11, fontWeight:600, color:'#64748b', display:'block', marginBottom:4 };
const input = { width:'100%', padding:'8px 10px', borderRadius:8, border:'1px solid #1e2238', background:'#020208', color:'#e2e8f0', fontSize:13, boxSizing:'border-box' };
const rmBtn = { padding:'0 10px', borderRadius:6, border:'1px solid #1e2238', background:'#0f1220', color:'#ef4444', cursor:'pointer' };
