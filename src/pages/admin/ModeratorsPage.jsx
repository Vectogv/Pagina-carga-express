import { useState, useEffect, useCallback } from 'react';
import Header from '../../components/admin/Header';
import DataTable from '../../components/admin/DataTable';
import Modal from '../../components/admin/Modal';
import { getUsers, setModerator } from '../../api/admin';

const theme = { bg: '#020208', cards: '#0f1220', accent: '#6366f1', text: '#e2e8f0', muted: '#64748b', success: '#22c55e', warning: '#f59e0b', danger: '#ef4444', border: '#1e2238' };

export default function ModeratorsPage() {
  const [mods, setMods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [edit, setEdit] = useState({ open: false, user: null, zona: 'cali' });
  const [addOpen, setAddOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedZona, setSelectedZona] = useState('cali');

  const fetchMods = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users?limit=100', { headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` } }).then(r=>r.json());
      // Fallback via getUsers
      const data = Array.isArray(res) ? res : (res.users || res.data || []);
      setMods(data.filter(u => u.esModerador || u.es_moderador));
    } catch {
      try {
        const res2 = await getUsers({ page: 1, limit: 100 });
        const d = res2.data;
        const list = Array.isArray(d) ? d : (d.users || d.data || []);
        setMods(list.filter(u => u.esModerador || u.es_moderador));
      } catch (err) { setError(err.response?.data?.message || 'Error'); }
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchMods(); }, [fetchMods]);

  const handleRemove = async (u) => {
    try {
      await setModerator(u.id || u._id, { esModerador: false });
      fetchMods();
    } catch (err) { alert(err.response?.data?.message || 'Error'); }
  };
  const handleModify = async () => {
    if (!edit.user) return;
    try {
      await setModerator(edit.user.id || edit.user._id, { esModerador: true, zonaModerador: edit.zona });
      setEdit({ open: false, user: null, zona: 'cali' });
      fetchMods();
    } catch (err) { alert(err.response?.data?.message || 'Error al modificar'); }
  };

  const handleSearch = async () => {
    if (!search.trim()) return;
    setSearching(true);
    try {
      const res = await getUsers({ page: 1, limit: 20, search: search.trim() });
      const d = res.data;
      const list = Array.isArray(d) ? d : (d.users || d.data || []);
      // Solo usuarios que NO son moderadores y NO son admin
      setSearchResults(list.filter((u) => !u.esModerador && !u.es_moderador && (u.rol || '').toLowerCase() !== 'admin'));
    } catch (err) { setSearchResults([]); }
    finally { setSearching(false); }
  };

  const handleAddModerador = async (u) => {
    try {
      await setModerator(u.id || u._id, { esModerador: true, zonaModerador: selectedZona });
      setAddOpen(false); setSearch(''); setSearchResults([]);
      fetchMods();
    } catch (err) { alert(err.response?.data?.message || 'Error al asignar'); }
  };

  const columns = [
    { key: 'nombre', label: 'Nombre', render: (_, u) => `${u.nombre || ''} ${u.apellido || ''}`.trim() || '-' },
    { key: 'email', label: 'Email', render: (_, u) => u.email || '-' },
    { key: 'telefono', label: 'Teléfono', render: (_, u) => u.telefono || '-' },
    { key: 'zona', label: 'Zona', render: (_, u) => <span style={{ padding:'2px 8px', borderRadius:12, background:`${theme.warning}20`, color:theme.warning, fontSize:11 }}>{u.zonaModerador || u.zona_moderador || '-'}</span> },
    { key: 'acciones', label: 'Acciones', render: (_, u) => (
        <div style={{ display:'flex', gap:6 }}>
          <button onClick={() => setEdit({ open: true, user: u, zona: u.zonaModerador || u.zona_moderador || 'cali' })} style={{ padding:'4px 10px', borderRadius:6, border:'none', background:`${theme.accent}20`, color:theme.accent, fontSize:11, cursor:'pointer' }}>Modificar</button>
          <button onClick={() => handleRemove(u)} style={{ padding:'4px 10px', borderRadius:6, border:'none', background:`${theme.danger}20`, color:theme.danger, fontSize:11, cursor:'pointer' }}>Quitar</button>
        </div>
      )},
  ];

  return (
    <div style={{ minHeight:'100vh', background:theme.bg, color:theme.text }}>
      <Header title="Moderadores" />
      <div style={{ padding:16 }}>
        <div style={{ background: theme.cards, border: `1px solid ${theme.border}`, borderRadius: 10, padding: 12, marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: theme.text, margin: 0 }}>Agregar Moderador — buscar usuario y asignar zona</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} placeholder="Buscar por nombre o email (ej: Carlos)" style={{ flex: 1, minWidth: 200, padding: '8px 10px', borderRadius: 8, border: `1px solid ${theme.border}`, background: theme.bg, color: theme.text, fontSize: 12 }} />
            <select value={selectedZona} onChange={(e) => setSelectedZona(e.target.value)} style={{ padding: '8px 10px', borderRadius: 8, border: `1px solid ${theme.border}`, background: theme.bg, color: theme.text, fontSize: 12 }}>
              <option value="cali">Cali</option>
              <option value="popayan">Popayán</option>
              <option value="pasto">Pasto</option>
            </select>
            <button onClick={handleSearch} disabled={searching} style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: theme.accent, color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', opacity: searching ? 0.6 : 1 }}>{searching ? 'Buscando...' : 'Buscar'}</button>
          </div>
          {searchResults.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 200, overflowY: 'auto' }}>
              {searchResults.map((u) => (
                <div key={u.id || u._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', borderRadius: 8, background: theme.bg, border: `1px solid ${theme.border}` }}>
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 600, color: theme.text, margin: 0 }}>{u.nombre} {u.apellido}</p>
                    <p style={{ fontSize: 11, color: theme.muted, margin: 0 }}>{u.email} • {u.rol}</p>
                  </div>
                  <button onClick={() => handleAddModerador(u)} style={{ padding: '4px 10px', borderRadius: 6, border: 'none', background: theme.success, color: '#fff', fontSize: 11, cursor: 'pointer' }}>Asignar → {selectedZona}</button>
                </div>
              ))}
            </div>
          )}
          {search && searchResults.length === 0 && !searching && <p style={{ fontSize: 11, color: theme.muted, margin: 0 }}>Sin resultados. Prueba otro nombre/email.</p>}
        </div>
        {error && <div style={{ padding:10, background:`${theme.danger}15`, color:theme.danger, borderRadius:8, marginBottom:12, fontSize:13 }}>{error}</div>}
        <DataTable columns={columns} data={mods} loading={loading} emptyMessage="No hay moderadores" />
      </div>
      <Modal isOpen={edit.open} onClose={() => setEdit({ open: false, user: null, zona: 'cali' })} title={`Modificar ${edit.user?.nombre || ''} ${edit.user?.apellido || ''}`} size="sm">
        <div style={{ fontSize:12, color:theme.muted, marginBottom:12 }}>{edit.user?.email} — actual: <b style={{ color:theme.warning }}>{edit.user?.zonaModerador || edit.user?.zona_moderador || '-'}</b></div>
        <label style={{ fontSize:12, fontWeight:600, color:theme.muted, display:'block', marginBottom:6 }}>Nueva zona</label>
        <select value={edit.zona} onChange={(e) => setEdit({ ...edit, zona: e.target.value })} style={{ width:'100%', padding:'8px 10px', borderRadius:8, border:`1px solid ${theme.border}`, background:theme.bg, color:theme.text, fontSize:13 }}>
          <option value="cali">Cali</option>
          <option value="popayan">Popayán</option>
          <option value="pasto">Pasto</option>
        </select>
        <button onClick={handleModify} style={{ marginTop:12, width:'100%', padding:'8px 0', borderRadius:8, border:'none', background:theme.accent, color:'#fff', fontWeight:700, cursor:'pointer' }}>Guardar cambios</button>
      </Modal>
    </div>
  );
}
