import { useState, useEffect, useCallback } from 'react';
import Header from '../../components/admin/Header';
import DataTable from '../../components/admin/DataTable';
import { getUsers, setModerator } from '../../api/admin';

const theme = { bg: '#020208', cards: '#0f1220', accent: '#6366f1', text: '#e2e8f0', muted: '#64748b', success: '#22c55e', warning: '#f59e0b', danger: '#ef4444', border: '#1e2238' };

export default function ModeratorsPage() {
  const [mods, setMods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
      await setModerator(u.id || u._id, { esModerador: false, zonaModerador: u.zonaModerador || 'cali' });
      fetchMods();
    } catch (err) { alert(err.response?.data?.message || 'Error'); }
  };

  const columns = [
    { key: 'nombre', label: 'Nombre', render: (_, u) => `${u.nombre || ''} ${u.apellido || ''}`.trim() || '-' },
    { key: 'email', label: 'Email', render: (_, u) => u.email || '-' },
    { key: 'telefono', label: 'Teléfono', render: (_, u) => u.telefono || '-' },
    { key: 'zona', label: 'Zona', render: (_, u) => <span style={{ padding:'2px 8px', borderRadius:12, background:`${theme.warning}20`, color:theme.warning, fontSize:11 }}>{u.zonaModerador || u.zona_moderador || '-'}</span> },
    { key: 'acciones', label: 'Acciones', render: (_, u) => <button onClick={() => handleRemove(u)} style={{ padding:'4px 10px', borderRadius:6, border:'none', background:`${theme.danger}20`, color:theme.danger, fontSize:11, cursor:'pointer' }}>Quitar Moderador</button> },
  ];

  return (
    <div style={{ minHeight:'100vh', background:theme.bg, color:theme.text }}>
      <Header title="Moderadores" />
      <div style={{ padding:16 }}>
        {error && <div style={{ padding:10, background:`${theme.danger}15`, color:theme.danger, borderRadius:8, marginBottom:12, fontSize:13 }}>{error}</div>}
        <DataTable columns={columns} data={mods} loading={loading} emptyMessage="No hay moderadores" />
      </div>
    </div>
  );
}
