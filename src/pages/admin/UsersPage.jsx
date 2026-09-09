import { useState, useEffect, useCallback } from 'react';
import Header from '../../components/admin/Header';
import DataTable from '../../components/admin/DataTable';
import Modal from '../../components/admin/Modal';
import ConfirmDialog from '../../components/admin/ConfirmDialog';
import {
  getUsers,
  updateUser,
  suspendUser,
  deleteUser,
  setModerator,
  setLeader,
  registerUser,
} from '../../api/admin';

const theme = {
  bg: '#020208',
  cards: '#0f1220',
  accent: '#6366f1',
  text: '#e2e8f0',
  muted: '#64748b',
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
  border: '#1e2238',
};

const styles = {
  page: {
    minHeight: '100vh',
    backgroundColor: theme.bg,
    color: theme.text,
  },
  content: {
    padding: 16,
  },
  pagination: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 20,
    padding: '14px 20px',
    backgroundColor: theme.cards,
    borderRadius: 12,
    border: `1px solid ${theme.border}`,
  },
  pageInfo: {
    fontSize: 13,
    color: theme.muted,
  },
  pageButtons: {
    display: 'flex',
    gap: 8,
  },
  pageBtn: {
    padding: '6px 14px',
    borderRadius: 8,
    border: `1px solid ${theme.border}`,
    backgroundColor: 'transparent',
    color: theme.text,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  pageBtnActive: {
    backgroundColor: theme.accent,
    borderColor: theme.accent,
    color: '#fff',
  },
  pageBtnDisabled: {
    opacity: 0.4,
    cursor: 'not-allowed',
  },
  avatarCell: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: '50%',
    backgroundColor: theme.accent,
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 13,
    fontWeight: 700,
    flexShrink: 0,
  },
  nameText: {
    fontWeight: 600,
    fontSize: 13,
  },
  badge: {
    display: 'inline-block',
    padding: '3px 10px',
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 600,
    textTransform: 'capitalize',
  },
  actionsCell: {
    display: 'flex',
    gap: 6,
    flexWrap: 'nowrap',
  },
  actionBtn: {
    padding: '5px 10px',
    borderRadius: 6,
    border: 'none',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    whiteSpace: 'nowrap',
  },
  formGroup: {
    marginBottom: 18,
  },
  label: {
    display: 'block',
    fontSize: 13,
    fontWeight: 600,
    color: theme.muted,
    marginBottom: 6,
  },
  input: {
    width: '100%',
    padding: '10px 14px',
    borderRadius: 8,
    border: `1px solid ${theme.border}`,
    backgroundColor: theme.bg,
    color: theme.text,
    fontSize: 13,
    outline: 'none',
    transition: 'border-color 0.15s ease',
    boxSizing: 'border-box',
  },
  select: {
    width: '100%',
    padding: '10px 14px',
    borderRadius: 8,
    border: `1px solid ${theme.border}`,
    backgroundColor: theme.bg,
    color: theme.text,
    fontSize: 13,
    outline: 'none',
    cursor: 'pointer',
    boxSizing: 'border-box',
  },
  saveBtn: {
    width: '100%',
    padding: '10px 0',
    borderRadius: 8,
    border: 'none',
    backgroundColor: theme.accent,
    color: '#fff',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'opacity 0.15s ease',
    marginTop: 8,
  },
  debtTag: {
    fontWeight: 600,
    fontSize: 13,
  },
};

const roleColors = {
  admin: theme.danger,
  moderador: theme.warning,
  lider: '#a78bfa',
  usuario: theme.muted,
};

const statusColors = {
  activo: theme.success,
  suspendido: theme.danger,
  inactivo: theme.muted,
};

function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [rolFilter, setRolFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 15;

  const [editModal, setEditModal] = useState({ open: false, user: null });
  const [editForm, setEditForm] = useState({ nombre: '', apellido: '', email: '', telefono: '', edad: '' });
  const [modModal, setModModal] = useState({ open: false, user: null, esModerador: true, zonaModerador: 'cali' });

  const [confirmDialog, setConfirmDialog] = useState({ open: false, type: '', user: null });
  const [addModal, setAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ nombre: '', apellido: '', email: '', password: '', telefono: '', rol: 'cliente', esModerador: false, zonaModerador: 'cali' });
  const [addSaving, setAddSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getUsers({ page, limit, search });
      const d = res.data;
      let list = Array.isArray(d) ? d : (d.users || d.data || []);
      if (rolFilter !== 'all') {
        list = list.filter((u) => (u.rol || u.role || '').toLowerCase() === rolFilter);
      }
      setUsers(list);
      setTotal(Array.isArray(d) && rolFilter === 'all' ? d.length : list.length);
      setTotalPages(1);
    } catch (err) {
      setError(err.response?.data?.message || 'Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  }, [page, search, rolFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSearch = (val) => {
    setSearch(val);
    setPage(1);
  };

  const openEdit = (user) => {
    setEditForm({
      nombre: user.nombre || user.name || '',
      apellido: user.apellido || '',
      email: user.email || '',
      telefono: user.telefono || user.phone || '',
      edad: user.edad ?? '',
    });
    setEditModal({ open: true, user });
  };

  const handleSaveEdit = async () => {
    if (!editModal.user) return;
    // Doc §18: PUT /api/admin/users/:id {nombre,apellido,email,telefono,edad}
    const payload = {};
    if (editForm.nombre.trim()) payload.nombre = editForm.nombre.trim();
    if (editForm.apellido.trim()) payload.apellido = editForm.apellido.trim();
    if (editForm.email.trim()) payload.email = editForm.email.trim();
    if (editForm.telefono.trim()) payload.telefono = editForm.telefono.trim();
    if (editForm.edad !== '' && !isNaN(Number(editForm.edad))) payload.edad = Number(editForm.edad);
    try {
      await updateUser(editModal.user.id || editModal.user._id, payload);
      setEditModal({ open: false, user: null });
      fetchUsers();
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.errors?.[0]?.message || 'Error al actualizar usuario';
      alert(msg);
    }
  };

  const handleSuspend = async (user) => {
    try {
      await suspendUser(user.id || user._id);
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.message || 'Error al suspender usuario');
    }
  };

  const handleDelete = async () => {
    if (!confirmDialog.user) return;
    try {
      await deleteUser(confirmDialog.user.id || confirmDialog.user._id);
      setConfirmDialog({ open: false, type: '', user: null });
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.message || 'Error al eliminar usuario');
    }
  };

  const openModerator = (user) => {
    const esMod = !!user.esModerador;
    setModModal({ open: true, user, esModerador: !esMod, zonaModerador: user.zonaModerador || 'cali' });
  };
  const handleSetModerator = async () => {
    if (!modModal.user) return;
    try {
      // Doc: PUT /api/admin/users/:id/moderator {esModerador, zonaModerador:"cali"|"popayan"|"pasto"}
      await setModerator(modModal.user.id || modModal.user._id, {
        esModerador: modModal.esModerador,
        zonaModerador: modModal.zonaModerador,
      });
      setModModal({ open: false, user: null, esModerador: true, zonaModerador: 'cali' });
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.message || err.response?.data?.errors?.[0]?.message || 'Error al asignar moderador');
    }
  };

  const handleSetLeader = async (user) => {
    try {
      await setLeader(user.id || user._id);
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.message || 'Error al asignar líder');
    }
  };

  const handleAddUser = async () => {
    if (!addForm.nombre.trim() || !addForm.apellido.trim() || !addForm.email.trim() || !addForm.password.trim()) {
      setToast({ msg: 'Nombre, apellido, email y contraseña son obligatorios', ok: false });
      setTimeout(() => setToast(null), 3000);
      return;
    }
    if (addForm.password.length < 6) {
      setToast({ msg: 'Contraseña mínimo 6 caracteres', ok: false });
      setTimeout(() => setToast(null), 3000);
      return;
    }
    setAddSaving(true);
    try {
      // Doc §1: POST /api/auth/register {nombre,apellido,email,password,telefono,rol}
      const payload = {
        nombre: addForm.nombre.trim(),
        apellido: addForm.apellido.trim(),
        email: addForm.email.trim(),
        password: addForm.password,
        rol: addForm.rol,
      };
      if (addForm.telefono.trim()) payload.telefono = addForm.telefono.trim();
      // Si es conductor, requiere campos extra, se envían vacíos para que backend valide
      const res = await registerUser(payload);
      const newId = res.data?.id || res.data?.user?.id;
      // Si marcó esModerador, asignar después de crear
      if (addForm.esModerador && newId) {
        try {
          await setModerator(newId, { esModerador: true, zonaModerador: addForm.zonaModerador });
        } catch (e) {
          setToast({ msg: 'Usuario creado pero fallo asignar moderador: ' + (e.response?.data?.message || ''), ok: false });
          setTimeout(() => setToast(null), 4000);
        }
      }
      setToast({ msg: `${addForm.esModerador ? 'Moderador' : 'Usuario'} creado correctamente`, ok: true });
      setTimeout(() => setToast(null), 3000);
      setAddModal(false);
      setAddForm({ nombre: '', apellido: '', email: '', password: '', telefono: '', rol: 'cliente', esModerador: false, zonaModerador: 'cali' });
      fetchUsers();
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.errors?.[0]?.message || 'Error al crear usuario';
      setToast({ msg, ok: false });
      setTimeout(() => setToast(null), 4000);
    } finally {
      setAddSaving(false);
    }
  };

  const getInitials = (user) => {
    const name = user.nombre || user.name || '';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || '??';
  };

  const columns = [
    {
      key: 'nombre',
      label: 'Avatar / Nombre',
      render: (_, user) => (
        <div style={styles.avatarCell}>
          <div style={styles.avatar}>{getInitials(user)}</div>
          <span style={styles.nameText}>{user.nombre || user.name || 'Sin nombre'}</span>
        </div>
      ),
    },
    { key: 'email', label: 'Email' },
    {
      key: 'telefono',
      label: 'Telefono',
      render: (_, user) => user.telefono || user.phone || '-',
    },
    {
      key: 'rol',
      label: 'Rol',
      render: (_, user) => {
        const role = user.rol || user.role || 'usuario';
        const color = roleColors[role] || theme.muted;
        return (
          <span style={{ ...styles.badge, backgroundColor: `${color}20`, color }}>
            {role}
          </span>
        );
      },
    },
    {
      key: 'estado',
      label: 'Estado',
      render: (_, user) => {
        const status = user.estado || user.status || 'activo';
        const color = statusColors[status] || theme.muted;
        return (
          <span style={{ ...styles.badge, backgroundColor: `${color}20`, color }}>
            {status}
          </span>
        );
      },
    },
    {
      key: 'deuda',
      label: 'Deuda',
      render: (_, user) => {
        const debt = user.deuda || user.debt || 0;
        const color = debt > 0 ? theme.danger : theme.success;
        return (
          <span style={{ ...styles.debtTag, color }}>
            ${typeof debt === 'number' ? debt.toLocaleString() : debt}
          </span>
        );
      },
    },
    {
      key: 'acciones',
      label: 'Acciones',
      render: (_, user) => {
        const isActive = (user.estado || user.status || 'activo') !== 'suspendido';
        return (
          <div style={styles.actionsCell}>
            <button
              style={{ ...styles.actionBtn, backgroundColor: `${theme.accent}20`, color: theme.accent }}
              onClick={(e) => { e.stopPropagation(); openEdit(user); }}
            >
              Editar
            </button>
            <button
              style={{
                ...styles.actionBtn,
                backgroundColor: `${isActive ? theme.warning : theme.success}20`,
                color: isActive ? theme.warning : theme.success,
              }}
              onClick={(e) => { e.stopPropagation(); handleSuspend(user); }}
            >
              {isActive ? 'Suspender' : 'Activar'}
            </button>
            <button
              style={{ ...styles.actionBtn, backgroundColor: user.esModerador ? `${theme.warning}20` : `${theme.accent}20`, color: user.esModerador ? theme.warning : '#a78bfa' }}
              onClick={(e) => { e.stopPropagation(); openModerator(user); }}
            >
              {user.esModerador ? 'Quitar Mod' : 'Mod'}
            </button>
            <button
              style={{ ...styles.actionBtn, backgroundColor: `${theme.accent}20`, color: '#818cf8' }}
              onClick={(e) => { e.stopPropagation(); handleSetLeader(user); }}
            >
              Lider
            </button>
            <button
              style={{ ...styles.actionBtn, backgroundColor: `${theme.danger}20`, color: theme.danger }}
              onClick={(e) => { e.stopPropagation(); setConfirmDialog({ open: true, type: 'delete', user }); }}
            >
              Elim
            </button>
          </div>
        );
      },
    },
  ];

  const rolTabs = [
    { key: 'all', label: 'Todos' },
    { key: 'cliente', label: 'Clientes' },
    { key: 'conductor', label: 'Conductores' },
    { key: 'admin', label: 'Admins' },
  ];

  return (
    <div style={styles.page}>
      <Header title={users.length > 0 ? `Usuarios — ${rolFilter === 'all' ? 'Todos' : rolFilter}` : 'Usuarios'} onSearch={handleSearch} />
      <div style={{ padding: '0 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {rolTabs.map((t) => (
            <button key={t.key} onClick={() => { setRolFilter(t.key); setPage(1); }} style={{ padding: '6px 12px', borderRadius: 20, border: `1px solid ${rolFilter === t.key ? theme.accent : theme.border}`, background: rolFilter === t.key ? `${theme.accent}20` : 'transparent', color: rolFilter === t.key ? theme.accent : theme.muted, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>{t.label}</button>
          ))}
        </div>
        <button onClick={() => setAddModal(true)} style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: theme.accent, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>+ Agregar Usuario / Moderador</button>
      </div>
      <div style={{ padding: '0 16px', marginTop: 8, display: 'flex', gap: 8, fontSize: 11, color: theme.muted }}>
        <span>👥 Clientes: {users.filter((u) => (u.rol||'').toLowerCase()==='cliente').length}</span>
        <span>•</span>
        <span>🚗 Conductores: {users.filter((u) => (u.rol||'').toLowerCase()==='conductor').length}</span>
        <span>•</span>
        <span>👑 Admin: {users.filter((u) => (u.rol||'').toLowerCase()==='admin').length}</span>
        <span>• Para conductores ve a</span>
        <a href="/admin/drivers" style={{ color: theme.accent, textDecoration: 'underline' }}>Conductores →</a>
      </div>
      <div style={styles.content}>
        {toast && <div style={{ position: 'fixed', bottom: 16, right: 16, background: toast.ok ? theme.success : theme.danger, color: '#fff', padding: '10px 14px', borderRadius: 8, fontSize: 13, zIndex: 9999 }}>{toast.msg}</div>}
        {error && (
          <div style={{ padding: '12px 16px', borderRadius: 8, backgroundColor: `${theme.danger}15`, color: theme.danger, marginBottom: 16, fontSize: 13 }}>
            {error}
          </div>
        )}
        <DataTable columns={columns} data={users} loading={loading} emptyMessage="No se encontraron usuarios" />
        {total > 0 && (
          <div style={styles.pagination}>
            <span style={styles.pageInfo}>
              Pagina {page} de {totalPages} ({total} usuarios)
            </span>
            <div style={styles.pageButtons}>
              <button
                style={{
                  ...styles.pageBtn,
                  ...(page <= 1 ? styles.pageBtnDisabled : {}),
                }}
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Anterior
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const start = Math.max(1, Math.min(page - 2, totalPages - 4));
                const p = start + i;
                if (p > totalPages) return null;
                return (
                  <button
                    key={p}
                    style={{
                      ...styles.pageBtn,
                      ...(p === page ? styles.pageBtnActive : {}),
                    }}
                    onClick={() => setPage(p)}
                  >
                    {p}
                  </button>
                );
              })}
              <button
                style={{
                  ...styles.pageBtn,
                  ...(page >= totalPages ? styles.pageBtnDisabled : {}),
                }}
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      <Modal
        isOpen={editModal.open}
        onClose={() => setEditModal({ open: false, user: null })}
        title="Editar Usuario"
        size="sm"
      >
        <div style={styles.formGroup}>
          <label style={styles.label}>Nombre</label>
          <input
            style={styles.input}
            value={editForm.nombre}
            onChange={(e) => setEditForm({ ...editForm, nombre: e.target.value })}
          />
        </div>
        <div style={styles.formGroup}>
          <label style={styles.label}>Email</label>
          <input
            style={styles.input}
            type="email"
            value={editForm.email}
            onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
          />
        </div>
        <div style={styles.formGroup}>
          <label style={styles.label}>Telefono</label>
          <input
            style={styles.input}
            value={editForm.telefono}
            onChange={(e) => setEditForm({ ...editForm, telefono: e.target.value })}
          />
        </div>
        <div style={styles.formGroup}>
          <label style={styles.label}>Apellido</label>
          <input
            style={styles.input}
            value={editForm.apellido}
            onChange={(e) => setEditForm({ ...editForm, apellido: e.target.value })}
            placeholder="Apellido"
          />
        </div>
        <div style={styles.formGroup}>
          <label style={styles.label}>Edad</label>
          <input
            style={styles.input}
            type="number"
            min="18"
            max="120"
            value={editForm.edad}
            onChange={(e) => setEditForm({ ...editForm, edad: e.target.value })}
            placeholder="Edad (18-120)"
          />
        </div>
        <button style={styles.saveBtn} onClick={handleSaveEdit}>
          Guardar Cambios
        </button>
      </Modal>

      <Modal
        isOpen={modModal.open}
        onClose={() => setModModal({ open: false, user: null, esModerador: true, zonaModerador: 'cali' })}
        title={modModal.esModerador ? 'Asignar Moderador' : 'Quitar Moderador'}
        size="sm"
      >
        <div style={styles.formGroup}>
          <label style={styles.label}>Zona</label>
          <select
            style={styles.select}
            value={modModal.zonaModerador}
            onChange={(e) => setModModal({ ...modModal, zonaModerador: e.target.value })}
            disabled={!modModal.esModerador}
          >
            <option value="cali">Cali</option>
            <option value="popayan">Popayán</option>
            <option value="pasto">Pasto</option>
          </select>
        </div>
        <button style={styles.saveBtn} onClick={handleSetModerator}>
          {modModal.esModerador ? 'Asignar como Moderador' : 'Quitar Moderador'}
        </button>
      </Modal>

      <Modal isOpen={addModal} onClose={() => setAddModal(false)} title="Agregar Usuario / Moderador" size="sm">
        <div style={styles.formGroup}><label style={styles.label}>Nombre *</label><input style={styles.input} value={addForm.nombre} onChange={(e) => setAddForm({ ...addForm, nombre: e.target.value })} placeholder="Nombre" /></div>
        <div style={styles.formGroup}><label style={styles.label}>Apellido *</label><input style={styles.input} value={addForm.apellido} onChange={(e) => setAddForm({ ...addForm, apellido: e.target.value })} placeholder="Apellido" /></div>
        <div style={styles.formGroup}><label style={styles.label}>Email *</label><input style={styles.input} type="email" value={addForm.email} onChange={(e) => setAddForm({ ...addForm, email: e.target.value })} placeholder="email@ejemplo.com" /></div>
        <div style={styles.formGroup}><label style={styles.label}>Contraseña * (6-32)</label><input style={styles.input} type="password" value={addForm.password} onChange={(e) => setAddForm({ ...addForm, password: e.target.value })} placeholder="Mínimo 6 caracteres" /></div>
        <div style={styles.formGroup}><label style={styles.label}>Teléfono</label><input style={styles.input} value={addForm.telefono} onChange={(e) => setAddForm({ ...addForm, telefono: e.target.value })} placeholder="3001234567" /></div>
        <div style={styles.formGroup}>
          <label style={styles.label}>Rol *</label>
          <select style={styles.select} value={addForm.rol} onChange={(e) => setAddForm({ ...addForm, rol: e.target.value })}>
            <option value="cliente">Cliente</option>
            <option value="conductor">Conductor</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <div style={{ ...styles.formGroup, background: `${theme.accent}10`, border: `1px solid ${theme.accent}30`, borderRadius: 8, padding: 12 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: theme.text }}>
            <input type="checkbox" checked={addForm.esModerador} onChange={(e) => setAddForm({ ...addForm, esModerador: e.target.checked })} />
            Asignar como Moderador
          </label>
          {addForm.esModerador && (
            <div style={{ marginTop: 10 }}>
              <label style={styles.label}>Zona del moderador</label>
              <select style={styles.select} value={addForm.zonaModerador} onChange={(e) => setAddForm({ ...addForm, zonaModerador: e.target.value })}>
                <option value="cali">Cali</option>
                <option value="popayan">Popayán</option>
                <option value="pasto">Pasto</option>
              </select>
              <p style={{ fontSize: 11, color: theme.muted, margin: '6px 0 0' }}>El moderador solo verá y gestionará conductores de su ciudad.</p>
            </div>
          )}
        </div>
        <button style={{ ...styles.saveBtn, opacity: addSaving ? 0.6 : 1 }} disabled={addSaving} onClick={handleAddUser}>{addSaving ? 'Creando...' : 'Crear Usuario'}</button>
      </Modal>

      <ConfirmDialog
        isOpen={confirmDialog.open}
        onClose={() => setConfirmDialog({ open: false, type: '', user: null })}
        onConfirm={handleDelete}
        title="Eliminar Usuario"
        message={`Estas seguro de eliminar al usuario "${confirmDialog.user?.nombre || confirmDialog.user?.name || ''}"? Esta accion no se puede deshacer.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        danger
      />
    </div>
  );
}

export default UsersPage;
