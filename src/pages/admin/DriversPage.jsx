import { useState, useEffect, useCallback } from 'react';
import { getDrivers, approveVerification, rejectVerification, notifyDriver, reportDriver, updateUser, deleteUser, suspendUser, setLeader, updateDriverCity } from '../../api/admin';
import ConfirmDialog from '../../components/admin/ConfirmDialog';
import Modal from '../../components/admin/Modal';
import { resolveStorageUrl } from '../../utils/storage';

const theme = {
  bg: '#0a0e14',
  cards: '#111827',
  accent: '#22c55e',
  text: '#f1f5f9',
  muted: '#94a3b8',
  border: '#1e293b',
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
};

const headerIcons = {
  foto: '👤',
  email: '✉️',
  telefono: '📞',
  vehiculo: '🚗',
  ciudad: '🏢',
  estado: '●',
  verificacion: '✓',
};

export default function DriversPage() {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [detailModal, setDetailModal] = useState({ open: false, driver: null });
  const [editModal, setEditModal] = useState({ open: false, driver: null });
  const [editForm, setEditForm] = useState({ nombre: '', apellido: '', email: '', telefono: '', ciudad: '' });
  const [savingEdit, setSavingEdit] = useState(false);
  const [action, setAction] = useState(null);
  const [nota, setNota] = useState('');
  const [toast, setToast] = useState(null);
  const [showFilters, setShowFilters] = useState(false);

  const fetchDrivers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getDrivers({ page: 1, limit: 100, search });
      const d = res.data;
      const list = Array.isArray(d) ? d : (d.drivers || d.data || []);
      setDrivers(list);
    } catch (err) {
      setError(err.response?.data?.message || 'Error al cargar conductores');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { fetchDrivers(); }, [fetchDrivers]);

  const showToast = (msg, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3000); };

  const handleApprove = async () => {
    try {
      await approveVerification(action.driver.id);
      showToast('Conductor verificado ✓');
      setAction(null);
      fetchDrivers();
    } catch (err) { showToast(err.response?.data?.message || 'Error al aprobar', false); }
  };
  const handleReject = async () => {
    try {
      const payload = nota.trim() ? { nota: nota.trim() } : {};
      await rejectVerification(action.driver.id, payload);
      showToast('Verificación rechazada');
      setAction(null); setNota('');
      fetchDrivers();
    } catch (err) { showToast(err.response?.data?.message || 'Error al rechazar', false); }
  };
  const handleNotify = async () => {
    try {
      await notifyDriver(action.driver.id);
      showToast('Notificación enviada');
      setAction(null);
    } catch (err) { showToast(err.response?.data?.message || 'Requiere FCM', false); }
  };
  const handleReport = async () => {
    if (!nota.trim()) return showToast('Escribe descripción', false);
    try {
      await reportDriver(action.driver.id, { descripcion: nota.trim() });
      showToast('Reporte enviado a admin');
      setAction(null); setNota('');
    } catch (err) { showToast(err.response?.data?.message || 'Error', false); }
  };
  const handleDelete = async () => {
    try {
      await deleteUser(action.driver.usuarioId || action.driver.usuario?.id);
      showToast('Conductor eliminado');
      setAction(null);
      fetchDrivers();
    } catch (err) { showToast(err.response?.data?.message || 'Error al eliminar', false); }
  };
  const handleSuspend = async () => {
    try {
      await suspendUser(action.driver.usuarioId || action.driver.usuario?.id);
      showToast(action.driver.usuario?.suspendido ? 'Conductor activado' : 'Conductor suspendido');
      setAction(null);
      fetchDrivers();
    } catch (err) { showToast(err.response?.data?.message || 'Error', false); }
  };
  const handleLeader = async () => {
    try {
      const esLider = action.driver.usuario?.esLider ? false : true;
      await setLeader(action.driver.usuarioId || action.driver.usuario?.id, { esLider });
      showToast(esLider ? 'Marcado como líder ⭐' : 'Líder retirado');
      setAction(null);
      fetchDrivers();
    } catch (err) { showToast(err.response?.data?.message || 'Error', false); }
  };
  const openEdit = (driver) => {
    const u = driver.usuario || {};
    setEditForm({
      nombre: u.nombre || '',
      apellido: u.apellido || '',
      email: u.email || '',
      telefono: u.telefono || '',
      ciudad: driver.ciudad || '',
    });
    setEditModal({ open: true, driver });
  };
  const handleEditSave = async () => {
    const driver = editModal.driver;
    if (!driver) return;
    setSavingEdit(true);
    try {
      const usuarioId = driver.usuarioId || driver.usuario?.id;
      const payload = {};
      if (editForm.nombre.trim()) payload.nombre = editForm.nombre.trim();
      if (editForm.apellido.trim()) payload.apellido = editForm.apellido.trim();
      if (editForm.email.trim()) payload.email = editForm.email.trim();
      if (editForm.telefono.trim()) payload.telefono = editForm.telefono.trim();
      if (Object.keys(payload).length) await updateUser(usuarioId, payload);
      const ciudad = editForm.ciudad.trim().toLowerCase();
      if (ciudad && ciudad !== String(driver.ciudad || '').toLowerCase()) {
        await updateDriverCity(driver.id, { ciudad });
      }
      showToast('Conductor actualizado ✓');
      setEditModal({ open: false, driver: null });
      fetchDrivers();
    } catch (err) { showToast(err.response?.data?.message || 'Error al editar', false); }
    finally { setSavingEdit(false); }
  };

  const handleExport = () => {
    const csv = ['Nombre,Email,Teléfono,Vehículo,Ciudad,Estado,Verificación'].concat(
      filtered.map((d) => {
        const u = d.usuario || {};
        return `"${u.nombre || ''} ${u.apellido || ''}","${u.email || ''}","${u.telefono || ''}","${d.tipoVehiculo || ''} ${d.placa || ''}","${d.ciudad || ''}","${d.online ? 'Conectado' : 'Desconectado'}","${d.estadoVerificacion || ''}"`;
      })
    ).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'conductores.csv'; a.click();
    URL.revokeObjectURL(url);
    showToast('Exportado conductores.csv');
  };

  const getInitials = (row) => {
    const u = row.usuario || {};
    const name = `${u.nombre || ''} ${u.apellido || ''}`.trim() || row.nombre || '';
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || '??';
  };

  const getStatus = (row) => {
    if (row.online && row.estadoVerificacion === 'aprobado') return { label: 'Conectado', color: '#22c55e', bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.25)' };
    if (row.online) return { label: 'En Ruta', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.25)' };
    return { label: 'Desconectado', color: '#64748b', bg: 'rgba(100,116,139,0.12)', border: 'rgba(100,116,139,0.2)' };
  };
  const getVerif = (row) => {
    const v = row.estadoVerificacion || 'pendiente';
    if (v === 'aprobado' || v === 'verificado') return { label: 'Verificado', color: '#16a34a', bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.2)' };
    if (v === 'rechazado') return { label: 'Rechazado', color: '#dc2626', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.2)' };
    return { label: 'Pendiente', color: '#d97706', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.25)' };
  };

  const filtered = drivers.filter((d) => {
    const q = search.toLowerCase();
    const u = d.usuario || {};
    const matchesSearch = !q || `${u.nombre || ''} ${u.apellido || ''}`.toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q) || (u.telefono || '').includes(q) || (d.placa || '').toLowerCase().includes(q);
    const status = d.online ? (d.estadoVerificacion === 'aprobado' ? 'conectado' : 'en_ruta') : 'desconectado';
    const verif = d.estadoVerificacion || 'pendiente';
    const matchesStatus = filterStatus === 'all' || status === filterStatus || verif === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const paginated = filtered.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  useEffect(() => { setPage(1); }, [search, filterStatus, rowsPerPage]);

  return (
    <div style={styles.page}>
      <div style={styles.titleRow}>
        <h1 style={styles.title}>Conductores</h1>
        <div style={styles.titleActions}>
          <button onClick={() => setShowFilters(!showFilters)} style={styles.filterBtn}>
            <span>⚙️</span> Filtros Avanzados
          </button>
        </div>
      </div>

      <div style={styles.toolbar}>
        <div style={styles.searchWrap}>
          <span style={styles.searchIcon}>🔍</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar conductores por nombre, correo, teléfono o placa..."
            style={styles.searchInput}
          />
        </div>
        <div style={styles.toolbarActions}>
          <button onClick={() => alert('Añadir conductor: usa Usuarios → Agregar')} style={styles.primaryBtn}>
            <span>+</span> Añadir Conductor
          </button>
          <button onClick={handleExport} style={styles.secondaryBtn}>
            <span>↓</span> Exportar
          </button>
        </div>
      </div>

      {showFilters && (
        <div style={styles.filtersPanel}>
          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>Estado</label>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={styles.filterSelect}>
              <option value="all">Todos</option>
              <option value="conectado">Conectado</option>
              <option value="desconectado">Desconectado</option>
              <option value="en_ruta">En Ruta</option>
              <option value="pendiente">Verificación Pendiente</option>
              <option value="aprobado">Verificado</option>
            </select>
          </div>
          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>Ciudad</label>
            <select onChange={(e) => setSearch(e.target.value)} style={styles.filterSelect} defaultValue="">
              <option value="">Todas las ciudades</option>
              <option value="cali">Cali</option>
              <option value="popayan">Popayán</option>
              <option value="pasto">Pasto</option>
            </select>
          </div>
        </div>
      )}

      {error && <div style={styles.error}>{error}</div>}

      <style>{`
        .drivers-table-wrap { overflow-x: auto; }
        .drivers-table-wrap::-webkit-scrollbar { height: 10px; }
        .drivers-table-wrap::-webkit-scrollbar-track { background: #0f172a; border-radius: 6px; }
        .drivers-table-wrap::-webkit-scrollbar-thumb { background: #334155; border-radius: 6px; border: 2px solid #0f172a; }
        .drivers-table-wrap::-webkit-scrollbar-thumb:hover { background: #475569; }
        .drivers-table-wrap { scrollbar-width: thin; scrollbar-color: #334155 #0f172a; }
      `}</style>

      <div style={styles.tableCard}>
        <div style={{ ...styles.tableWrap, ...{ minWidth: 0 } }} className="drivers-table-wrap">
          <table style={{ ...styles.table, minWidth: 900 }}>
            <thead>
              <tr>
                <th style={styles.th}><span style={styles.thIcon}>{headerIcons.foto}</span> Foto / Nombre</th>
                <th style={styles.th}><span style={styles.thIcon}>{headerIcons.email}</span> Email</th>
                <th style={styles.th}><span style={styles.thIcon}>{headerIcons.telefono}</span> Teléfono</th>
                <th style={styles.th}><span style={styles.thIcon}>{headerIcons.vehiculo}</span> Vehículo</th>
                <th style={styles.th}><span style={styles.thIcon}>{headerIcons.ciudad}</span> Ciudad</th>
                <th style={styles.th}><span style={styles.thIcon}>{headerIcons.estado}</span> Estado</th>
                <th style={styles.th}><span style={styles.thIcon}>{headerIcons.verificacion}</span> Verificación</th>
                <th style={styles.th}>Detalles</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} style={styles.tr}>
                    <td colSpan={8} style={{ padding: 16 }}><div style={styles.skeleton} /></td>
                  </tr>
                ))
              ) : paginated.length === 0 ? (
                <tr><td colSpan={8} style={styles.empty}>No se encontraron conductores</td></tr>
              ) : (
                paginated.map((row, idx) => {
                  const u = row.usuario || {};
                  const nombre = `${u.nombre || ''} ${u.apellido || ''}`.trim() || 'Sin nombre';
                  const st = getStatus(row);
                  const vf = getVerif(row);
                  return (
                    <tr key={row.id || idx} style={{ ...styles.tr, background: idx % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent' }}>
                      <td style={styles.td}>
                        <div style={styles.avatarCell}>
                          <div style={styles.avatarWrap}>
                            {row.fotoConductor ? (
                              <img src={resolveStorageUrl(row.fotoConductor)} alt="" style={styles.avatarImg} />
                            ) : (
                              <div style={styles.avatarFallback}>{getInitials(row)}</div>
                            )}
                          </div>
                          <span style={styles.nameText}>{nombre}</span>
                        </div>
                      </td>
                      <td style={styles.td}><span style={styles.cellText}>{u.email || '-'}</span></td>
                      <td style={styles.td}><span style={styles.cellText}>{u.telefono || '-'}</span></td>
                      <td style={styles.td}>
                        <span style={styles.cellText}>{row.tipoVehiculo || '-'}</span>
                        <span style={styles.cellSub}>{row.placa ? `${row.placa} ` : ''}{row.capacidad ? `(${row.capacidad})` : ''}</span>
                      </td>
                      <td style={styles.td}><span style={{ ...styles.cityBadge }}>{row.ciudad || '-'}</span></td>
                      <td style={styles.td}><span style={{ ...styles.statusTag, background: st.bg, color: st.color, border: `1px solid ${st.border}` }}>{st.label}</span></td>
                      <td style={styles.td}><span style={{ ...styles.statusTag, background: vf.bg, color: vf.color, border: `1px solid ${vf.border}` }}>{vf.label}</span></td>
                      <td style={styles.td}>
                        <div style={styles.actionsCell}>
                          <div style={styles.actionsCell}>
                            <button onClick={() => setDetailModal({ open: true, driver: row })} style={styles.iconBtn} title="Ver detalle">👁️</button>
                            <button onClick={() => openEdit(row)} style={styles.iconBtn} title="Editar">✏️</button>
                            <button onClick={() => setAction({ type: 'delete', driver: row })} style={styles.iconBtnDanger} title="Eliminar">🗑️</button>
                            <button onClick={() => setAction({ type: 'suspend', driver: row })} style={styles.iconBtn} title={u.suspendido ? 'Activar' : 'Suspender'}>{u.suspendido ? '▶️' : '⏸️'}</button>
                            <button onClick={() => setAction({ type: 'leader', driver: row })} style={{ ...styles.iconBtn, color: u.esLider ? '#f59e0b' : undefined }} title={u.esLider ? 'Quitar líder' : 'Hacer líder'}>⭐</button>
                            <button onClick={() => setAction({ type: 'notify', driver: row })} style={styles.iconBtn} title="Notificar">🔔</button>
                            <button onClick={() => setAction({ type: 'report', driver: row })} style={styles.iconBtn} title="Reportar">⚠️</button>
                          </div>
                          {row.estadoVerificacion === 'pendiente' && (
                            <>
                              <button onClick={() => setAction({ type: 'approve', driver: row })} style={{ ...styles.miniBtn, background: 'rgba(34,197,94,0.12)', color: '#22c55e' }}>✓</button>
                              <button onClick={() => setAction({ type: 'reject', driver: row })} style={{ ...styles.miniBtn, background: 'rgba(239,68,68,0.12)', color: '#ef4444' }}>✕</button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div style={styles.footer}>
          <span style={styles.footerText}>
            {filtered.length === 0 ? '0 conductores' : `${(page - 1) * rowsPerPage + 1}-${Math.min(page * rowsPerPage, filtered.length)} de ${filtered.length}`}
          </span>
          <div style={styles.footerActions}>
            <span style={styles.footerText}>Filas por página</span>
            <select value={rowsPerPage} onChange={(e) => setRowsPerPage(Number(e.target.value))} style={styles.rowsSelect}>
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
            </select>
            <div style={styles.pagination}>
              <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} style={styles.pageBtn}>‹</button>
              <span style={styles.pageInfo}>{page} de {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} style={styles.pageBtn}>›</button>
            </div>
          </div>
        </div>
      </div>

      {toast && <div style={styles.toast}>{toast.msg}</div>}

      <ConfirmDialog isOpen={action?.type === 'approve'} onClose={() => setAction(null)} onConfirm={handleApprove} title="Aprobar conductor" message={`¿Aprobar a ${action?.driver?.usuario?.nombre || ''}?`} confirmText="Aprobar" />
      <ConfirmDialog isOpen={action?.type === 'reject'} onClose={() => { setAction(null); setNota(''); }} onConfirm={handleReject} title="Rechazar" message="Motivo:" confirmText="Rechazar" danger>
        <textarea value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Documento ilegible" rows={2} style={styles.textarea} />
      </ConfirmDialog>
      <ConfirmDialog isOpen={action?.type === 'notify'} onClose={() => setAction(null)} onConfirm={handleNotify} title="Notificar" message={`¿Notificar a ${action?.driver?.usuario?.email || ''}?`} confirmText="Notificar" />
      <ConfirmDialog isOpen={action?.type === 'report'} onClose={() => { setAction(null); setNota(''); }} onConfirm={handleReport} title="Reportar" message="Descripción:" confirmText="Reportar" danger>
        <textarea value={nota} onChange={(e) => setNota(e.target.value)} rows={3} style={styles.textarea} />
      </ConfirmDialog>
      <ConfirmDialog isOpen={action?.type === 'delete'} onClose={() => setAction(null)} onConfirm={handleDelete} title="Eliminar conductor" message={`¿Eliminar definitivamente a ${action?.driver?.usuario?.nombre || ''} ${action?.driver?.usuario?.apellido || ''}? Se borrarán sus viajes, ganancias y datos.`} confirmText="Eliminar" danger />
      <ConfirmDialog isOpen={action?.type === 'suspend'} onClose={() => setAction(null)} onConfirm={handleSuspend} title={action?.driver?.usuario?.suspendido ? 'Activar conductor' : 'Suspender conductor'} message={action?.driver?.usuario?.suspendido ? '¿Activar la cuenta de este conductor para que pueda usar la app?' : '¿Suspender la cuenta de este conductor? No podrá usar la app.'} confirmText={action?.driver?.usuario?.suspendido ? 'Activar' : 'Suspender'} danger={!action?.driver?.usuario?.suspendido} />
      <ConfirmDialog isOpen={action?.type === 'leader'} onClose={() => setAction(null)} onConfirm={handleLeader} title={action?.driver?.usuario?.esLider ? 'Quitar líder' : 'Marcar como líder'} message={action?.driver?.usuario?.esLider ? '¿Quitar el rol de líder a este conductor?' : '¿Marcar a este conductor como líder?'} confirmText={action?.driver?.usuario?.esLider ? 'Quitar' : 'Marcar'} />

      <Modal isOpen={detailModal.open} onClose={() => setDetailModal({ open: false, driver: null })} title="Detalle del Conductor" size="md">
        {detailModal.driver && (() => {
          const d = detailModal.driver;
          const u = d.usuario || {};
          return (
            <div>
              <div style={{ textAlign: 'center', marginBottom: 16 }}>
                {d.fotoConductor ? (
                  <img src={resolveStorageUrl(d.fotoConductor)} alt="" style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', border: '3px solid #22c55e' }} />
                ) : (
                  <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg, #334155, #1e293b)', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, margin: '0 auto', border: '3px solid #334155' }}>{getInitials(d)}</div>
                )}
                <div style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9', marginTop: 8 }}>{u.nombre} {u.apellido}</div>
                <div style={{ fontSize: 12, color: '#94a3b8' }}>{u.email}</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><p style={styles.detailLabel}>Placa</p><p style={styles.detailValue}>{d.placa || '-'}</p></div>
                <div><p style={styles.detailLabel}>Tipo</p><p style={styles.detailValue}>{d.tipoVehiculo || '-'}</p></div>
                <div><p style={styles.detailLabel}>Ciudad</p><p style={styles.detailValue}>{d.ciudad || '-'}</p></div>
                <div><p style={styles.detailLabel}>Capacidad</p><p style={styles.detailValue}>{d.capacidad || '-'}</p></div>
                <div><p style={styles.detailLabel}>Calificación</p><p style={styles.detailValue}>{d.calificacion || '0.0'} ★</p></div>
                <div><p style={styles.detailLabel}>Viajes</p><p style={styles.detailValue}>{d.totalViajes ?? 0}</p></div>
              </div>
            </div>
          );
        })()}
      </Modal>

      <Modal isOpen={editModal.open} onClose={() => setEditModal({ open: false, driver: null })} title="Editar Conductor" size="md">
        {editModal.driver && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <p style={styles.editLabel}>Nombre</p>
                <input value={editForm.nombre} onChange={(e) => setEditForm({ ...editForm, nombre: e.target.value })} style={styles.editInput} placeholder="Nombre" />
              </div>
              <div>
                <p style={styles.editLabel}>Apellido</p>
                <input value={editForm.apellido} onChange={(e) => setEditForm({ ...editForm, apellido: e.target.value })} style={styles.editInput} placeholder="Apellido" />
              </div>
              <div>
                <p style={styles.editLabel}>Email</p>
                <input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} style={styles.editInput} placeholder="Email" />
              </div>
              <div>
                <p style={styles.editLabel}>Teléfono</p>
                <input value={editForm.telefono} onChange={(e) => setEditForm({ ...editForm, telefono: e.target.value })} style={styles.editInput} placeholder="Teléfono" />
              </div>
              <div>
                <p style={styles.editLabel}>Ciudad</p>
                <select value={editForm.ciudad} onChange={(e) => setEditForm({ ...editForm, ciudad: e.target.value })} style={styles.editInput}>
                  <option value="">Selecciona ciudad</option>
                  <option value="cali">Cali</option>
                  <option value="popayan">Popayán</option>
                  <option value="pasto">Pasto</option>
                  <option value="medellin">Medellín</option>
                  <option value="bogota">Bogotá</option>
                  <option value="cartagena">Cartagena</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
              <button onClick={() => setEditModal({ open: false, driver: null })} style={styles.cancelBtn}>Cancelar</button>
              <button onClick={handleEditSave} disabled={savingEdit} style={{ ...styles.saveBtn, opacity: savingEdit ? 0.6 : 1 }}>
                {savingEdit ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

const styles = {
  page: { display: 'flex', flexDirection: 'column', gap: 16 },
  titleRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 },
  title: { fontSize: 22, fontWeight: 800, color: '#f1f5f9', margin: 0, letterSpacing: '-0.02em' },
  titleActions: { display: 'flex', gap: 8 },
  filterBtn: { padding: '8px 14px', borderRadius: 8, border: '1px solid #334155', background: '#1e293b', color: '#94a3b8', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 },
  toolbar: { display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' },
  searchWrap: { flex: 1, minWidth: 280, position: 'relative', display: 'flex', alignItems: 'center' },
  searchIcon: { position: 'absolute', left: 12, fontSize: 14, opacity: 0.6 },
  searchInput: { width: '100%', padding: '10px 14px 10px 36px', borderRadius: 10, border: '1px solid #334155', background: '#111827', color: '#f1f5f9', fontSize: 13, outline: 'none' },
  toolbarActions: { display: 'flex', gap: 8 },
  primaryBtn: { display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #22c55e, #16a34a)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 12px rgba(34,197,94,0.25)' },
  secondaryBtn: { display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 10, border: '1px solid #334155', background: '#1e293b', color: '#e2e8f0', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  filtersPanel: { display: 'flex', gap: 16, padding: 14, background: '#111827', border: '1px solid #1e293b', borderRadius: 10, flexWrap: 'wrap' },
  filterGroup: { display: 'flex', flexDirection: 'column', gap: 6 },
  filterLabel: { fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' },
  filterSelect: { padding: '7px 10px', borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#f1f5f9', fontSize: 12 },
  error: { padding: 12, borderRadius: 8, background: 'rgba(239,68,68,0.1)', color: '#ef4444', fontSize: 13 },
  tableCard: { background: '#111827', border: '1px solid #1e293b', borderRadius: 12, overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.3)' },
  tableWrap: { overflowX: 'auto', minWidth: 0 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 900 },
  th: { padding: '12px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #1e293b', background: '#0f172a', whiteSpace: 'nowrap' },
  thIcon: { marginRight: 6, opacity: 0.7 },
  tr: { borderBottom: '1px solid rgba(30,41,59,0.5)', transition: 'background 0.15s' },
  td: { padding: '10px 14px', verticalAlign: 'middle' },
  avatarCell: { display: 'flex', alignItems: 'center', gap: 10 },
  avatarWrap: { position: 'relative', width: 32, height: 32, flexShrink: 0 },
  avatarImg: { width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', border: '2px solid #334155' },
  avatarFallback: { width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #334155, #1e293b)', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, border: '2px solid #334155' },
  nameText: { fontWeight: 600, color: '#f1f5f9', fontSize: 13 },
  cellText: { color: '#cbd5e1', fontSize: 13 },
  cellSub: { color: '#64748b', fontSize: 11, display: 'block' },
  cityBadge: { padding: '3px 8px', borderRadius: 12, background: 'rgba(148,163,184,0.12)', color: '#94a3b8', fontSize: 11, textTransform: 'capitalize' },
  statusTag: { display: 'inline-flex', padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' },
  actionsCell: { display: 'flex', gap: 6, alignItems: 'flex-start' },
  iconBtn: { width: 28, height: 28, borderRadius: 6, border: '1px solid #334155', background: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 12 },
  iconBtnDanger: { width: 28, height: 28, borderRadius: 6, border: '1px solid rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 12 },
  miniBtn: { padding: '4px 8px', borderRadius: 6, border: 'none', fontSize: 11, fontWeight: 600, cursor: 'pointer' },
  editLabel: { fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', margin: '0 0 6px' },
  editInput: { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #334155', background: '#0a0e14', color: '#f1f5f9', fontSize: 13, outline: 'none', boxSizing: 'border-box' },
  cancelBtn: { padding: '9px 18px', borderRadius: 8, border: '1px solid #334155', background: '#1e293b', color: '#e2e8f0', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  saveBtn: { padding: '9px 18px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #22c55e, #16a34a)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' },
  footer: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderTop: '1px solid #1e293b', background: '#0f172a', flexWrap: 'wrap', gap: 12 },
  footerText: { fontSize: 12, color: '#64748b' },
  footerActions: { display: 'flex', alignItems: 'center', gap: 12 },
  rowsSelect: { padding: '5px 8px', borderRadius: 6, border: '1px solid #334155', background: '#111827', color: '#e2e8f0', fontSize: 12 },
  pagination: { display: 'flex', alignItems: 'center', gap: 8 },
  pageBtn: { width: 28, height: 28, borderRadius: 6, border: '1px solid #334155', background: '#1e293b', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  pageInfo: { fontSize: 12, color: '#94a3b8', minWidth: 60, textAlign: 'center' },
  skeleton: { height: 16, background: '#1e293b', borderRadius: 6, animation: 'pulse 1.5s infinite' },
  empty: { padding: 32, textAlign: 'center', color: '#64748b', fontSize: 13 },
  toast: { position: 'fixed', bottom: 20, right: 20, background: '#22c55e', color: '#fff', padding: '10px 16px', borderRadius: 8, fontSize: 13, zIndex: 9999 },
  textarea: { width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #1e293b', background: '#0a0e14', color: '#f1f5f9', fontSize: 13 },
  detailLabel: { fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' },
  detailValue: { fontSize: 13, color: '#f1f5f9' },
};
