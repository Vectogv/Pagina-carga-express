import { useState, useEffect, useCallback } from 'react';
import { Ban, CircleCheck, Trash2 } from 'lucide-react';
import { getUsers, suspendUser, deleteUser } from '../../api/admin';
import { getRolUsuario } from '../../utils/roles';
import { errorMessage, fullName, toList } from '../../utils/format';
import {
  PageHeader, SearchInput, DataTable, ConfirmDialog, Avatar, StatusBadge, Button,
} from '../../components/ui';

export default function ClientsPage() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [confirm, setConfirm] = useState(null);

  const fetchClients = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getUsers({ page: 1, limit: 100, search: search.trim() || undefined, rol: 'cliente' });
      setClients(toList(res.data, 'users').filter((u) => getRolUsuario(u) === 'cliente'));
    } catch (err) {
      setError(errorMessage(err, 'Error al cargar clientes'));
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const t = setTimeout(fetchClients, 300);
    return () => clearTimeout(t);
  }, [fetchClients]);

  const handleSuspend = async (u) => {
    try {
      await suspendUser(u.id);
      fetchClients();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const handleDelete = async () => {
    try {
      await deleteUser(confirm.id);
      fetchClients();
    } catch (err) {
      setError(errorMessage(err, 'Error al eliminar'));
    }
  };

  const columns = [
    {
      key: 'nombre',
      label: 'Cliente',
      render: (_, u) => (
        <div className="cell-user">
          <Avatar src={u.avatar} name={fullName(u)} />
          <div className="cell-user__text">
            <span className="cell-user__name">{fullName(u)}</span>
            <span className="cell-user__meta">{u.email || '—'}</span>
          </div>
        </div>
      ),
    },
    { key: 'telefono', label: 'Teléfono', render: (v) => v || '—' },
    { key: 'estado', label: 'Estado', render: (_, u) => <StatusBadge status={u.suspendido ? 'suspendido' : 'activo'} /> },
    {
      key: 'acciones',
      label: '',
      align: 'right',
      render: (_, u) => (
        <div className="row row--end">
          <Button
            size="sm"
            variant={u.suspendido ? 'soft-success' : 'soft-warning'}
            icon={u.suspendido ? <CircleCheck size={14} /> : <Ban size={14} />}
            onClick={() => handleSuspend(u)}
          >
            {u.suspendido ? 'Activar' : 'Suspender'}
          </Button>
          <Button size="icon" variant="ghost" onClick={() => setConfirm(u)} aria-label={`Eliminar a ${fullName(u)}`}>
            <Trash2 size={15} />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="page">
      <PageHeader title="Clientes" description="Personas que solicitan servicios de carga desde la app." />

      <div className="toolbar">
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar por nombre, correo o teléfono" />
      </div>

      {error && <div className="page-error" role="alert">{error}</div>}

      <DataTable
        columns={columns}
        data={clients}
        loading={loading}
        emptyMessage={search ? `Sin resultados para “${search}”` : 'Aún no hay clientes'}
      />

      <ConfirmDialog
        isOpen={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={handleDelete}
        title="Eliminar cliente"
        message={`Se eliminará la cuenta de ${fullName(confirm)} y su historial. Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        danger
      />
    </div>
  );
}
