import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Ban, CircleCheck, Trash2 } from 'lucide-react';
import { getUsers, suspendUser, deleteUser } from '../../api/admin';
import { getRolUsuario } from '../../utils/roles';
import { errorMessage, fullName, toList } from '../../utils/format';
import {
  PageHeader, SearchInput, DataTable, ConfirmDialog, StatusBadge, Button, Pagination,
} from '../../components/ui';
import { TarjetaPersona } from '../../components/panel';
import { paginacionDe } from './users/constants';

const LIMIT = 20;

export default function ClientsPage() {
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [confirm, setConfirm] = useState(null);
  const [suspendTarget, setSuspendTarget] = useState(null);
  const [page, setPage] = useState(1);
  // GET /api/admin/users pagina en el servidor y manda X-Total-Count / X-Last-Page.
  const [pagination, setPagination] = useState({ total: undefined, totalPages: 1 });

  const fetchClients = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getUsers({ page, limit: LIMIT, search: search.trim() || undefined, rol: 'cliente' });
      const list = toList(res.data, 'users');
      setClients(list.filter((u) => getRolUsuario(u) === 'cliente'));
      setPagination(paginacionDe(res.headers, list.length, page, LIMIT));
    } catch (err) {
      setError(errorMessage(err, 'Error al cargar clientes'));
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => {
    const t = setTimeout(fetchClients, 300);
    return () => clearTimeout(t);
  }, [fetchClients]);

  const handleSearch = (val) => { setSearch(val); setPage(1); };

  const handleSuspend = async () => {
    const u = suspendTarget;
    if (!u) return;
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
      render: (_, u) => <TarjetaPersona persona={u} tipo="cliente" area="admin" />,
    },
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
            onClick={(e) => { e.stopPropagation(); setSuspendTarget(u); }}
          >
            {u.suspendido ? 'Activar' : 'Suspender'}
          </Button>
          <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); setConfirm(u); }} aria-label={`Eliminar a ${fullName(u)}`}>
            <Trash2 size={15} />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="page">
      <PageHeader
        title="Clientes"
        description="Personas que piden servicios de carga desde la app. Toca el nombre o la fila para abrir su perfil; para editar datos, cambiar contraseña o liberar una deuda, usa Usuarios."
      />

      <div className="toolbar">
        <SearchInput value={search} onChange={handleSearch} placeholder="Buscar por nombre, correo o teléfono" />
      </div>

      {error && <div className="page-error" role="alert">{error}</div>}

      <DataTable
        columns={columns}
        data={clients}
        loading={loading}
        onRowClick={(u) => navigate(`/admin/clients/${u.id}`)}
        emptyMessage={search ? `Sin resultados para “${search}”` : 'Aún no hay clientes'}
        footer={<Pagination page={page} totalPages={pagination.totalPages} total={pagination.total} onChange={setPage} />}
      />

      <ConfirmDialog
        isOpen={!!suspendTarget}
        onClose={() => setSuspendTarget(null)}
        onConfirm={handleSuspend}
        title={suspendTarget?.suspendido ? 'Activar cliente' : 'Suspender cliente'}
        message={suspendTarget?.suspendido
          ? `¿Activar la cuenta de ${fullName(suspendTarget)} para que pueda volver a usar la app?`
          : `¿Suspender la cuenta de ${fullName(suspendTarget)}? Se cerrarán sus sesiones y no podrá usar la app.`}
        confirmText={suspendTarget?.suspendido ? 'Activar' : 'Suspender'}
        danger={!suspendTarget?.suspendido}
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
