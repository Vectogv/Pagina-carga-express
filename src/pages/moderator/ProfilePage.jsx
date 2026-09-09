import { useState, useEffect, useRef } from 'react';
import { getModeratorProfile } from '../../api/moderator';
import api from '../../api/axios';

const theme = { bg: '#020208', cards: '#0f1220', accent: '#f59e0b', text: '#e2e8f0', muted: '#64748b', border: '#1e2238', success: '#22c55e', danger: '#ef4444' };

export default function ModeratorProfilePage() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({ nombre: '', apellido: '', email: '', telefono: '' });
  const [toast, setToast] = useState(null);
  const fileRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await getModeratorProfile();
        if (cancelled) return;
        const d = res.data?.data || res.data;
        setProfile(d);
        setForm({ nombre: d.nombre || '', apellido: d.apellido || '', email: d.email || '', telefono: d.telefono || '' });
      } catch (err) { if (!cancelled) setError(err.response?.data?.message || 'Error al cargar perfil'); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  const showToast = (msg, ok=true) => { setToast({msg,ok}); setTimeout(()=>setToast(null),3000); };

  const handleSave = async (e) => {
    e.preventDefault();
    const payload = {};
    if (form.nombre.trim()) payload.nombre = form.nombre.trim();
    if (form.apellido.trim()) payload.apellido = form.apellido.trim();
    if (form.email.trim()) payload.email = form.email.trim();
    if (form.telefono.trim()) payload.telefono = form.telefono.trim();
    setSaving(true);
    try { await api.put('/api/users/profile', payload); showToast('Perfil actualizado'); }
    catch (err) { showToast(err.response?.data?.message || 'Error', false); }
    finally { setSaving(false); }
  };

  const handleAvatar = async (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    setUploading(true);
    try {
      const fd = new FormData(); fd.append('file', f);
      const res = await api.post('/api/users/avatar', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setProfile((p)=>({ ...p, avatar: res.data?.url || res.data?.avatar || URL.createObjectURL(f) }));
      showToast('Avatar actualizado');
    } catch { showToast('Error al subir avatar', false); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value=''; }
  };

  if (loading) return <div style={{ padding:40, color:theme.muted, textAlign:'center' }}>Cargando perfil...</div>;
  if (error) return <div style={{ padding:40, color:theme.danger, textAlign:'center' }}>{error}</div>;

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16, maxWidth: 720 }}>
      <div style={{ background:theme.cards, border:`1px solid ${theme.border}`, borderRadius:12, padding:20, display:'flex', alignItems:'center', gap:16 }}>
        <div onClick={()=>fileRef.current?.click()} style={{ width:72, height:72, borderRadius:'50%', overflow:'hidden', cursor:'pointer', border:`2px solid ${theme.accent}`, position:'relative', flexShrink:0 }}>
          {profile?.avatar ? <img src={profile.avatar} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', background:`${theme.accent}20`, color:theme.accent, fontWeight:700, fontSize:20 }}>{(form.nombre[0]||'M').toUpperCase()}</div>}
          <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', opacity:0, transition:'opacity 0.15s' }} className="overlay">{uploading ? '...' : '📷'}</div>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleAvatar} style={{ display:'none' }} />
        </div>
        <div>
          <h2 style={{ fontSize:15, fontWeight:700, color:theme.text, margin:0 }}>{`${form.nombre} ${form.apellido}`.trim() || 'Moderador'}</h2>
          <p style={{ fontSize:12, color:theme.muted, margin:'2px 0 0' }}>{form.email}</p>
          <span style={{ display:'inline-block', marginTop:6, padding:'3px 8px', borderRadius:20, background:`${theme.accent}20`, color:theme.accent, fontSize:11, fontWeight:600 }}>{profile?.zonaModerador || profile?.zona_moderador || 'Sin zona'} • Moderador</span>
        </div>
      </div>

      <form onSubmit={handleSave} style={{ background:theme.cards, border:`1px solid ${theme.border}`, borderRadius:12, padding:20, display:'flex', flexDirection:'column', gap:12 }}>
        <h3 style={{ fontSize:13, fontWeight:700, color:theme.text, margin:0 }}>Información personal</h3>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          <div><label style={label}>Nombre</label><input value={form.nombre} onChange={(e)=>setForm({...form,nombre:e.target.value})} style={input} /></div>
          <div><label style={label}>Apellido</label><input value={form.apellido} onChange={(e)=>setForm({...form,apellido:e.target.value})} style={input} /></div>
          <div><label style={label}>Email</label><input type="email" value={form.email} onChange={(e)=>setForm({...form,email:e.target.value})} style={input} /></div>
          <div><label style={label}>Teléfono</label><input value={form.telefono} onChange={(e)=>setForm({...form,telefono:e.target.value})} style={input} /></div>
        </div>
        <button type="submit" disabled={saving} style={{ alignSelf:'flex-start', padding:'8px 16px', borderRadius:8, border:'none', background:theme.accent, color:'#fff', fontWeight:700, fontSize:12, cursor:'pointer', opacity:saving?0.6:1 }}>{saving?'Guardando...':'Guardar cambios'}</button>
      </form>
      {toast && <div style={{ position:'fixed', bottom:16, right:16, background: toast.ok?theme.success:theme.danger, color:'#fff', padding:'8px 14px', borderRadius:8, fontSize:13 }}>{toast.msg}</div>}
    </div>
  );
}
const label = { fontSize:11, fontWeight:600, color:'#64748b', display:'block', marginBottom:4 };
const input = { width:'100%', padding:'8px 10px', borderRadius:8, border:'1px solid #1e2238', background:'#020208', color:'#e2e8f0', fontSize:13, boxSizing:'border-box' };
