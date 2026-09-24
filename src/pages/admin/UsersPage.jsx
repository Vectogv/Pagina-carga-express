import { useState, useEffect, useCallback } from 'react';
import { Ban, CircleCheck, KeyRound, Pencil, Shield, Star, Trash2, UserPlus } from 'lucide-react';
import { getUsers, suspendUser, deleteUser, setLeader, resetPassword } from '../../api/admin';
import { getRolUsuario } from '../../utils/roles';
import { errorMessage, fullName, toList } from '../../utils/format';
import {
  Alert, Avatar, Button, ConfirmDialog, DataTable, PageHeader, Pagination, SearchInput, SegmentedFilter, StatusBadge,
} from '../../components/ui';
import RoleBadge from './users/RoleBadge';
import EditUserModal from './users/EditUserModal';
import AddUserModal from './users/AddUserModal';
import ModeratorModal from './users/ModeratorModal';
import ResetPasswordModal from './users/ResetPasswordModal';
import { userId } from './users/constants';

const LIMIT = 15;

const ROLE_FILTERS = [
  { value: 'all', label: 'Todos' },
  { value: 'cliente', label: 'Clientes' },
  { value: 'conductor', label: 'Conductores' },
  { value: 'moderador', label: 'Moderadores' },
  { value: 'lider', label: 'Líderes' },
  { value: 'admin', label: 'Admins' },
];

// "moderador" incluye moderadores-líder (esModerador), igual que el contador.
const matchesRole = (u, rol) => {
  if (rol === 'all') return true;
  if (rol === 'moderador') return !!u.esModerador;
  if (rol === 'lider') return !!u.esLider;
  return getRolUsuario(u) === rol;
};

const userStatus = (u) => (u.suspendido ? 'suspendido' : (u.estado || u.status || 'activo'));

/**
 * Paginación desde las cabeceras X-Total-Count / X-Last-Page (cuerpo = array).
 * Si no llegan, se habilita "siguiente" cuando la página vino llena.
 */
function readPagination(headers, listLength, page) {
  const total = Number(headers?.['x-total-count']);
  const lastPage = Number(headers?.['x-last-page']);
  const hasTotal = headers?.['x-total-count'] != null && Number.isFinite(total);
  if (headers?.['x-last-page'] != null && Number.isFinite(lastPage) && lastPage > 0) {
    return { total: hasTotal ? total : undefined, totalPages: lastPage };
  }
  if (hasTotal) return { total, totalPages: Math.max(1, Math.ceil(total / LIMIT)) };
  return { total: undefined, totalPages: listLength >= LIMIT ? page + 1 : page };
}

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [search, setSearch] = useState('');
  const [rolFilter, setRolFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: undefined, totalPages: 1 });

  const [editUser, setEditUser] = useState(null);
  const [modUser, setModUser] = useState(null);
  const [pwUser, setPwUser] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [addOpen, setAddOpen] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getUsers({
        page,
        limit: LIMIT,
        search: search.trim() || undefined,
        rol: rolFilter === 'all' ? undefined : rolFilter,
      });
      const raw = toList(res.data, 'users');
      // Respaldo: si el backend ignora `rol`, se filtra en cliente (solo afecta a la página actual).
      setUsers(raw.filter((u) => matchesRole(u, rolFilter)));
      setPagination(readPagination(res.headers, raw.length, page));
    } catch (err) {
      setError(errorMessage(err, 'Error al cargar usuarios'));
    } finally {
      setLoading(false);
    }
  }, [page, search, rolFilter]);

  useEffect(() => {
    const t = setTimeout(fetchUsers, 300);
    return () => clearTimeout(t);
  }, [fetchUsers]);

  useEffect(() => {
    if (!notice) return undefined;
    const t = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(t);
  }, [notice]);

  const handleSearch = (val) => { setSearch(val); setPage(1); };
  const handleRole = (val) => { setRolFilter(val); setPage(1); };

  const handleSuspend = async (u) => {
    try {
      await suspendUser(userId(u));
      fetchUsers();
    } catch (err) {
      setError(errorMessage(err, 'Error al suspender usuario'));
    }
  };

  const handleLeader = async (u) => {
    try {
      await setLeader(userId(u));
      fetchUsers();
    } catch (err) {
      setError(errorMessage(err, 'Error al asignar líder'));
    }
  };

  const handleDelete = async () => {
    try {
      await deleteUser(userId(deleteTarget));
      fetchUsers();
    } catch (err) {
      setError(errorMessage(err, 'Error al eliminar usuario'));
    }
  };

  const handleSaved = (msg = 'Usuario actualizado') => {
    setEditUser(null);
    setModUser(null);
    setNotice({ variant: 'success', msg });
    fetchUsers();
  };

  const handleCreated = (msg, warning) => {
    setAddOpen(false);
    setNotice(warning ? { variant: 'warning', msg: warning } : { variant: 'success', msg });
    fetchUsers();
  };

  const handlePassword = async (password) => {
    await resetPassword(userId(pwUser), { password });
    setPwUser(null);
    setNotice({ variant: 'success', msg: 'Contraseña actualizada' });
  };

  const pageCounts = {
    cliente: users.filter((u) => getRolUsuario(u) === 'cliente').length,
    conductor: users.filter((u) => getRolUsuario(u) === 'conductor').length,
    moderador: users.filter((u) => u.esModerador).length,
    lider: users.filter((u) => u.esLider).length,
    admin: users.filter((u) => getRolUsuario(u) === 'admin').length,
  };

  const columns = [
    {
      key: 'nombre',
      label: 'Usuario',
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
    { key: 'telefono', label: 'Teléfono', render: (_, u) => u.telefono || u.phone || '—' },
    { key: 'rol', label: 'Rol', render: (_, u) => <RoleBadge user={u} /> },
    { key: 'estado', label: 'Estado', render: (_, u) => <StatusBadge status={userStatus(u)} /> },
    {
      key: 'acciones',
      label: '',
      align: 'right',
      render: (_, u) => {
        const name = fullName(u);
        const suspended = userStatus(u) === 'suspendido';
        return (
          <div className="row row--end" style={{ flexWrap: 'nowrap' }}>
            <Button size="icon" variant="ghost" onClick={() => setEditUser(u)} aria-label={`Editar a ${name}`} title="Editar">
              <Pencil size={15} />
            </Button>
            <Button size="icon" variant="ghost" onClick={() => setPwUser(u)} aria-label={`Resetear contraseña de ${name}`} title="Resetear contraseña">
              <KeyRound size={15} />
            </Button>
            <Button
              size="icon"
              variant={u.esModerador ? 'soft-primary' : 'ghost'}
              onClick={() => setModUser(u)}
              aria-label={u.esModerador ? `Modificar moderador ${name}` : `Asignar ${name} como moderador`}
              title={u.esModerador ? 'Modificar / quitar moderador' : 'Asignar moderador'}
            >
              <Shield size={15} />
            </Button>
            <Button
              size="icon"
              variant={u.esLider ? 'soft-warning' : 'ghost'}
              onClick={() => handleLeader(u)}
              aria-label={`Cambiar líder: ${name}`}
              aria-pressed={!!u.esLider}
              title={u.esLider ? 'Es líder' : 'Marcar como líder'}
            >
              <Star size={15} />
            </Button>
            <Button
              size="sm"
              variant={suspended ? 'soft-success' : 'soft-warning'}
              icon={suspended ? <CircleCheck size={14} /> : <Ban size={14} />}
              onClick={() => handleSuspend(u)}
            >
              {suspended ? 'Activar' : 'Suspender'}
            </Button>
            <Button size="icon" variant="ghost" onClick={() => setDeleteTarget(u)} aria-label={`Eliminar a ${name}`} title="Eliminar">
              <Trash2 size={15} />
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="page">
      <PageHeader
        title="Usuarios"
        description="Todas las cuentas de la plataforma: clientes, conductores, moderadores y administradores."
        actions={<Button icon={<UserPlus size={16} />} onClick={() => setAddOpen(true)}>Agregar usuario</Button>}
      />

      <div className="toolbar">
        <SearchInput value={search} onChange={handleSearch} placeholder="Buscar por nombre, correo o teléfono" />
        <SegmentedFilter options={ROLE_FILTERS} value={rolFilter} onChange={handleRole} ariaLabel="Filtrar por rol" />
      </div>

      {!loading && users.length > 0 && (
        <p className="text-sm text-muted">
          En esta página: {pageCounts.cliente} clientes · {pageCounts.conductor} conductores
          · {pageCounts.moderador} moderadores · {pageCounts.lider} líderes · {pageCounts.admin} admins
        </p>
      )}

      {notice && <Alert variant={notice.variant} onClose={() => setNotice(null)}>{notice.msg}</Alert>}
      {error && <div className="page-error" role="alert">{error}</div>}

      <DataTable
        columns={columns}
        data={users}
        loading={loading}
        emptyMessage={search ? `Sin resultados para “${search}”` : 'No se encontraron usuarios'}
        footer={(
          <Pagination page={page} totalPages={pagination.totalPages} total={pagination.total} onChange={setPage} />
        )}
      />

      {addOpen && <AddUserModal onClose={() => setAddOpen(false)} onCreated={handleCreated} />}
      {editUser && <EditUserModal user={editUser} onClose={() => setEditUser(null)} onSaved={() => handleSaved()} />}
      {modUser && <ModeratorModal user={modUser} onClose={() => setModUser(null)} onSaved={handleSaved} />}
      {pwUser && (
        <ResetPasswordModal
          name={fullName(pwUser)}
          email={pwUser.email}
          avatar={pwUser.avatar}
          onClose={() => setPwUser(null)}
          onSubmit={handlePassword}
        />
      )}

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Eliminar usuario"
        message={`Se eliminará la cuenta de ${fullName(deleteTarget)}. Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        danger
      />
    </div>
  );
}
