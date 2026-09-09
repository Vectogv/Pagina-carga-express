import { useState, useEffect, useCallback } from 'react';
import Header from '../../components/admin/Header';
import DataTable from '../../components/admin/DataTable';
import { getUsers, suspendUser, deleteUser } from '../../api/admin';
import ConfirmDialog from '../../components/admin/ConfirmDialog';
import { getRolUsuario } from '../../utils/roles';

const theme = { bg: '#020208', cards: '#0f1220', accent: '#6366f1', text: '#e2e8f0', muted: '#64748b', success: '#22c55e', warning: '#f59e0b', danger: '#ef4444', border: '#1e2238' };

export default function ClientsPage() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [confirm, setConfirm] = useState(null);

  const fetchClients = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await getUsers({ page: 1, limit: 100, search });
      const d = res.data;
      const list = Array.isArray(d) ? d : (d.users || d.data || []);
      setClients(list.filter(u => getRolUsuario(u) === 'cliente'));
    } catch (err) { setError(err.response?.data?.message || 'Error al cargar clientes'); }
    finally { setLoading(false); }
  }, [search]);

  useEffect(() => { fetchClients(); }, [fetchClients]);

  const handleSuspend = async (u) => {
    try { await suspendUser(u.id || u._id); fetchClients(); } catch (err) { alert(err.response?.data?.message || 'Error'); }
  };
  const handleDelete = async () => {
    try { await deleteUser(confirm.id || confirm._id); setConfirm(null); fetchClients(); } catch (err) { alert(err.response?.data?.message || 'Error al eliminar'); }
  };

  const columns = [
    { key: 'nombre', label: 'Nombre', render: (_, u) => `${u.nombre || ''} ${u.apellido || ''}`.trim() || u.nombre || '-' },
    { key: 'email', label: 'Email', render: (_, u) => u.email || '-' },
    { key: 'telefono', label: 'Teléfono', render: (_, u) => u.telefono || '-' },
    { key: 'estado', label: 'Estado', render: (_, u) => <span style={{ padding:'2px 8px', borderRadius:12, fontSize:11, background: u.suspendido ? `${theme.danger}20` : `${theme.success}20`, color: u.suspendido ? theme.danger : theme.success }}>{u.suspendido ? 'Suspendido' : 'Activo'}</span> },
    {
      key: 'acciones', label: 'Acciones', render: (_, u) => (
        <div style={{ display:'flex', gap:6 }}>
          <button onClick={() => handleSuspend(u)} style={{ padding:'4px 10px', borderRadius:6, border:'none', background: `${theme.warning}20`, color: theme.warning, fontSize:11, cursor:'pointer' }}>{u.suspendido ? 'Activar' : 'Suspender'}</button>
          <button onClick={() => setConfirm(u)} style={{ padding:'4px 10px', borderRadius:6, border:'none', background: `${theme.danger}20`, color: theme.danger, fontSize:11, cursor:'pointer' }}>Eliminar</button>
        </div>
      ),
    },
  ];

  return (
    <div style={{ minHeight:'100vh', background:theme.bg, color:theme.text }}>
      <Header title="Clientes" onSearch={setSearch} />
      <div style={{ padding:16 }}>
        {error && <div style={{ padding:10, background:`${theme.danger}15`, color:theme.danger, borderRadius:8, marginBottom:12, fontSize:13 }}>{error}</div>}
        <DataTable columns={columns} data={clients} loading={loading} emptyMessage="No hay clientes" />
      </div>
      <ConfirmDialog isOpen={!!confirm} onClose={()=>setConfirm(null)} onConfirm={handleDelete} title="Eliminar cliente" message={`¿Eliminar a ${confirm?.nombre || ''}?`} confirmText="Eliminar" danger />
    </div>
  );
}
