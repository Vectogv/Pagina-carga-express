import { useState, useEffect, useCallback } from 'react';
import Header from '../../components/admin/Header';
import DataTable from '../../components/admin/DataTable';
import Modal from '../../components/admin/Modal';
import { getDrivers, approveVerification, rejectVerification, notifyDriver, reportDriver } from '../../api/admin';
import ConfirmDialog from '../../components/admin/ConfirmDialog';

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
  page: { minHeight: '100vh', backgroundColor: theme.bg, color: theme.text },
  content: { padding: 14 },
  pagination: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, padding: '10px 14px', backgroundColor: theme.cards, borderRadius: 10, border: `1px solid ${theme.border}` },
  pageInfo: { fontSize: 11, color: theme.muted },
  pageButtons: { display: 'flex', gap: 6 },
  pageBtn: { padding: '4px 10px', borderRadius: 6, border: `1px solid ${theme.border}`, backgroundColor: 'transparent', color: theme.text, fontSize: 11, fontWeight: 600, cursor: 'pointer' },
  pageBtnActive: { backgroundColor: theme.accent, borderColor: theme.accent, color: '#fff' },
  pageBtnDisabled: { opacity: 0.4, cursor: 'not-allowed' },
  avatarCell: { display: 'flex', alignItems: 'center', gap: 8 },
  avatar: { width: 28, height: 28, borderRadius: '50%', backgroundColor: `${theme.success}30`, color: theme.success, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 },
  avatarImg: { width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 },
  nameText: { fontWeight: 600, fontSize: 12 },
  badge: { display: 'inline-block', padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600, textTransform: 'capitalize' },
  stars: { display: 'flex', alignItems: 'center', gap: 3, fontSize: 12, color: theme.warning },
  starsNum: { fontSize: 11, color: theme.muted, marginLeft: 3 },
  actionBtn: { padding: '4px 8px', borderRadius: 5, border: 'none', fontSize: 11, fontWeight: 600, cursor: 'pointer', backgroundColor: `${theme.accent}20`, color: theme.accent },
  detailSection: { marginBottom: 16 },
  detailTitle: { fontSize: 12, fontWeight: 700, color: theme.text, marginBottom: 10, paddingBottom: 6, borderBottom: `1px solid ${theme.border}` },
  detailGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 },
  detailItem: { display: 'flex', flexDirection: 'column', gap: 3 },
  detailLabel: { fontSize: 10, fontWeight: 600, color: theme.muted, textTransform: 'uppercase', letterSpacing: '0.05em' },
  detailValue: { fontSize: 12, color: theme.text },
  driverPhoto: { width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${theme.accent}`, marginBottom: 10 },
  driverPhotoPlaceholder: { width: 56, height: 56, borderRadius: '50%', backgroundColor: `${theme.accent}20`, color: theme.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, marginBottom: 10, border: `2px solid ${theme.accent}40` },
  driverName: { fontSize: 15, fontWeight: 700, color: theme.text, marginBottom: 2, textAlign: 'center' },
  driverEmail: { fontSize: 11, color: theme.muted, textAlign: 'center', marginBottom: 4 },
  verificationStatus: { display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600 },
};

const statusColors = { activo: theme.success, inactivo: theme.muted, pendiente: theme.warning, verificado: theme.success, no_verificado: theme.danger, rechazado: theme.danger, aprobado: theme.success };

function DriversPage() {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 15;
  const [detailModal, setDetailModal] = useState({ open: false, driver: null });
  const [action, setAction] = useState(null); // {type:'approve'|'reject'|'notify'|'report', driver}
  const [nota, setNota] = useState('');
  const [toast, setToast] = useState(null);

  const fetchDrivers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getDrivers({ page, limit, search });
      const d = res.data;
      const list = Array.isArray(d) ? d : (d.drivers || d.data || []);
      setDrivers(list);
      setTotal(Array.isArray(d) ? list.length : (d.total || list.length));
      setTotalPages(Array.isArray(d) ? 1 : (d.totalPages || 1));
    } catch (err) {
      setError(err.response?.data?.message || 'Error al cargar conductores');
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { fetchDrivers(); }, [fetchDrivers]);

  const handleSearch = (val) => { setSearch(val); setPage(1); };

  const showToast = (msg, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3000); };

  const handleApprove = async () => {
    try {
      await approveVerification(action.driver.usuarioId || action.driver.id);
      showToast('Conductor aprobado');
      setAction(null);
      fetchDrivers();
    } catch (err) { showToast(err.response?.data?.message || 'Error al aprobar', false); }
  };
  const handleReject = async () => {
    try {
      const payload = nota.trim() ? { nota: nota.trim() } : {};
      await rejectVerification(action.driver.usuarioId || action.driver.id, payload);
      showToast('Conductor rechazado');
      setAction(null); setNota('');
      fetchDrivers();
    } catch (err) { showToast(err.response?.data?.message || 'Error al rechazar', false); }
  };
  const handleNotify = async () => {
    try {
      await notifyDriver(action.driver.usuarioId || action.driver.id);
      showToast('Notificación enviada');
      setAction(null);
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.status === 403 ? 'Requiere rol moderador' : 'Error al notificar';
      showToast(msg, false);
    }
  };
  const handleReport = async () => {
    if (!nota.trim()) return showToast('Escribe la descripción', false);
    try {
      await reportDriver(action.driver.usuarioId || action.driver.id, { descripcion: nota.trim() });
      showToast('Reporte enviado');
      setAction(null); setNota('');
      fetchDrivers();
    } catch (err) { showToast(err.response?.data?.message || 'Error al reportar', false); }
  };

  const getInitials = (row) => {
    const u = row.usuario || {};
    const name = `${u.nombre || row.nombre || ''} ${u.apellido || row.apellido || ''}`.trim() || row.nombre || '';
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || '??';
  };

  const renderStars = (rating) => {
    const val = parseFloat(rating) || 0;
    const full = Math.floor(val);
    const half = val - full >= 0.5;
    return (
      <div style={styles.stars}>
        {Array.from({ length: 5 }, (_, i) => (
          <span key={i} style={{ opacity: i < full ? 1 : i === full && half ? 0.6 : 0.25 }}>★</span>
        ))}
        <span style={styles.starsNum}>{val.toFixed(1)}</span>
      </div>
    );
  };

  const columns = [
    {
      key: 'nombre',
      label: 'Foto / Nombre',
      render: (_, row) => {
        const u = row.usuario || {};
        const photo = row.fotoConductor || row.foto || row.photo || row.avatar;
        const nombre = `${u.nombre || ''} ${u.apellido || ''}`.trim() || row.nombre || 'Sin nombre';
        return (
          <div style={styles.avatarCell}>
            {photo ? <img src={photo} alt="" style={styles.avatarImg} /> : <div style={styles.avatar}>{getInitials(row)}</div>}
            <span style={styles.nameText}>{nombre}</span>
          </div>
        );
      },
    },
    { key: 'email', label: 'Email', render: (_, r) => r.usuario?.email || r.email || '-' },
    { key: 'telefono', label: 'Teléfono', render: (_, r) => r.usuario?.telefono || r.telefono || '-' },
    {
      key: 'vehiculo',
      label: 'Vehículo',
      render: (_, r) => {
        const placa = r.placa || r.vehicle?.placa || '';
        const tipo = r.tipoVehiculo || r.tipo_vehiculo || '';
        const cap = r.capacidad || '';
        const txt = `${tipo} ${placa} ${cap ? '(' + cap + ')' : ''}`.trim();
        return txt || placa || '-';
      },
    },
    { key: 'ciudad', label: 'Ciudad', render: (_, r) => r.ciudad || r.city || '-' },
    {
      key: 'estado',
      label: 'Estado',
      render: (_, r) => {
        const online = r.online;
        const status = online ? 'activo' : 'inactivo';
        const color = online ? theme.success : theme.muted;
        return <span style={{ ...styles.badge, backgroundColor: `${color}20`, color }}>{online ? 'En línea' : 'Desconectado'}</span>;
      },
    },
    {
      key: 'verificacion',
      label: 'Verificación',
      render: (_, r) => {
        const v = r.estadoVerificacion || r.estado_verificacion || 'pendiente';
        const map = { pendiente: theme.warning, aprobado: theme.success, verificado: theme.success, rechazado: theme.danger };
        const color = map[v] || theme.muted;
        return <span style={{ ...styles.badge, backgroundColor: `${color}20`, color }}>{v}</span>;
      },
    },
    { key: 'estrellas', label: 'Estrellas', render: (_, r) => renderStars(r.calificacion || r.rating || 0) },
    {
      key: 'acciones',
      label: 'Acciones',
      render: (_, r) => {
        const ver = r.estadoVerificacion || 'pendiente';
        return (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button style={styles.actionBtn} onClick={(e) => { e.stopPropagation(); setDetailModal({ open: true, driver: r }); }}>Ver</button>
            {ver === 'pendiente' && (
              <>
                <button style={{ ...styles.actionBtn, backgroundColor: `${theme.success}20`, color: theme.success }} onClick={(e) => { e.stopPropagation(); setAction({ type: 'approve', driver: r }); }}>Aprobar</button>
                <button style={{ ...styles.actionBtn, backgroundColor: `${theme.danger}20`, color: theme.danger }} onClick={(e) => { e.stopPropagation(); setAction({ type: 'reject', driver: r }); }}>Rechazar</button>
              </>
            )}
            <button style={{ ...styles.actionBtn, backgroundColor: `${theme.warning}20`, color: theme.warning }} onClick={(e) => { e.stopPropagation(); setAction({ type: 'notify', driver: r }); }}>Notificar</button>
            <button style={{ ...styles.actionBtn, backgroundColor: `${theme.muted}20`, color: theme.muted }} onClick={(e) => { e.stopPropagation(); setNota(''); setAction({ type: 'report', driver: r }); }}>Reportar</button>
          </div>
        );
      },
    },
  ];

  const driver = detailModal.driver;
  const u = driver?.usuario || {};
  const verification = driver?.estadoVerificacion || 'pendiente';
  const verColor = { pendiente: theme.warning, aprobado: theme.success, verificado: theme.success, rechazado: theme.danger }[verification] || theme.muted;

  return (
    <div style={styles.page}>
      <Header title="Conductores" onSearch={handleSearch} />
      <div style={styles.content}>
        {error && <div style={{ padding: '12px 16px', borderRadius: 8, backgroundColor: `${theme.danger}15`, color: theme.danger, marginBottom: 16, fontSize: 13 }}>{error}</div>}
        <DataTable columns={columns} data={drivers} loading={loading} emptyMessage="No se encontraron conductores" />
        {total > 0 && (
          <div style={styles.pagination}>
            <span style={styles.pageInfo}>Pagina {page} de {totalPages} ({total} conductores)</span>
            <div style={styles.pageButtons}>
              <button style={{ ...styles.pageBtn, ...(page <= 1 ? styles.pageBtnDisabled : {}) }} disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Anterior</button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const start = Math.max(1, Math.min(page - 2, totalPages - 4));
                const p = start + i;
                if (p > totalPages) return null;
                return <button key={p} style={{ ...styles.pageBtn, ...(p === page ? styles.pageBtnActive : {}) }} onClick={() => setPage(p)}>{p}</button>;
              })}
              <button style={{ ...styles.pageBtn, ...(page >= totalPages ? styles.pageBtnDisabled : {}) }} disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Siguiente</button>
            </div>
          </div>
        )}
      </div>

      {toast && <div style={{ position: 'fixed', bottom: 20, right: 20, background: toast.ok ? theme.success : theme.danger, color: '#fff', padding: '10px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, zIndex: 9999 }}>{toast.msg}</div>}

      <ConfirmDialog isOpen={action?.type === 'approve'} onClose={() => setAction(null)} onConfirm={handleApprove} title="Aprobar conductor" message={`¿Aprobar a ${(action?.driver?.usuario?.nombre||'') + ' ' + (action?.driver?.usuario?.apellido||'')}?`} confirmText="Aprobar" />
      <ConfirmDialog isOpen={action?.type === 'reject'} onClose={() => { setAction(null); setNota(''); }} onConfirm={handleReject} title="Rechazar conductor" message="¿Rechazar verificación? Esta acción requiere nota." confirmText="Rechazar" danger>
        <div style={{ marginTop: 12 }}><label style={{ fontSize: 12, color: theme.muted }}>Nota (opcional)</label><textarea value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Ej: Documento ilegible" rows={2} style={{ width: '100%', marginTop: 6, padding: '8px 10px', borderRadius: 8, border: `1px solid ${theme.border}`, background: theme.bg, color: theme.text, fontSize: 13 }} /></div>
      </ConfirmDialog>
      <ConfirmDialog isOpen={action?.type === 'notify'} onClose={() => setAction(null)} onConfirm={handleNotify} title="Notificar conductor inactivo" message={`¿Enviar notificación a ${action?.driver?.usuario?.email || ''}?`} confirmText="Notificar" />
      <ConfirmDialog isOpen={action?.type === 'report'} onClose={() => { setAction(null); setNota(''); }} onConfirm={handleReport} title="Reportar conductor" message="Describe el motivo del reporte" confirmText="Reportar" danger>
        <div style={{ marginTop: 12 }}><textarea value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Ej: Inactivo 2 semanas" rows={3} style={{ width: '100%', marginTop: 6, padding: '8px 10px', borderRadius: 8, border: `1px solid ${theme.border}`, background: theme.bg, color: theme.text, fontSize: 13 }} /></div>
      </ConfirmDialog>

      <Modal isOpen={detailModal.open} onClose={() => setDetailModal({ open: false, driver: null })} title="Detalle del Conductor" size="md">
        {driver && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: 4 }}>
              {driver.fotoConductor ? <img src={driver.fotoConductor} alt="" style={styles.driverPhoto} /> : <div style={styles.driverPhotoPlaceholder}>{getInitials(driver)}</div>}
              <div style={styles.driverName}>{`${u.nombre || ''} ${u.apellido || ''}`.trim() || 'Sin nombre'}</div>
              <div style={styles.driverEmail}>{u.email || driver.email || '-'}</div>
              <div style={styles.driverEmail}>Cédula: {driver.cedula || '-'} • Ciudad: {driver.ciudad || '-'}</div>
              <div style={{ marginBottom: 20 }}>
                <span style={{ ...styles.verificationStatus, backgroundColor: `${verColor}20`, color: verColor }}>
                  {verification === 'aprobado' ? '✓' : verification === 'rechazado' ? '✕' : '○'} Verificación: {verification}
                </span>
                {driver.notaRechazo && <div style={{ fontSize: 12, color: theme.danger, marginTop: 6 }}>Nota: {driver.notaRechazo}</div>}
              </div>
            </div>

            <div style={styles.detailSection}>
              <div style={styles.detailTitle}>Información Personal</div>
              <div style={styles.detailGrid}>
                <div style={styles.detailItem}><span style={styles.detailLabel}>Teléfono</span><span style={styles.detailValue}>{u.telefono || '-'}</span></div>
                <div style={styles.detailItem}><span style={styles.detailLabel}>Estado</span><span style={styles.detailValue}>{driver.online ? 'En línea' : 'Desconectado'}</span></div>
                <div style={styles.detailItem}><span style={styles.detailLabel}>Calificación</span><span style={styles.detailValue}>{renderStars(driver.calificacion || 0)}</span></div>
                <div style={styles.detailItem}><span style={styles.detailLabel}>Viajes Totales</span><span style={styles.detailValue}>{driver.totalViajes ?? 0}</span></div>
                <div style={styles.detailItem}><span style={styles.detailLabel}>Horas Activo</span><span style={styles.detailValue}>{driver.horasActivo || '0.0'}</span></div>
                <div style={styles.detailItem}><span style={styles.detailLabel}>Suspendido</span><span style={styles.detailValue}>{u.suspendido ? 'Sí' : 'No'}</span></div>
              </div>
            </div>

            <div style={styles.detailSection}>
              <div style={styles.detailTitle}>Vehículo</div>
              <div style={styles.detailGrid}>
                <div style={styles.detailItem}><span style={styles.detailLabel}>Placa</span><span style={styles.detailValue}>{driver.placa || '-'}</span></div>
                <div style={styles.detailItem}><span style={styles.detailLabel}>Tipo</span><span style={styles.detailValue}>{driver.tipoVehiculo || '-'}</span></div>
                <div style={styles.detailItem}><span style={styles.detailLabel}>Capacidad</span><span style={styles.detailValue}>{driver.capacidad || '-'}</span></div>
                <div style={styles.detailItem}><span style={styles.detailLabel}>Ciudad</span><span style={styles.detailValue}>{driver.ciudad || '-'}</span></div>
                <div style={styles.detailItem}><span style={styles.detailLabel}>Foto Cédula</span><span style={styles.detailValue}>{driver.fotoCedula ? <a href={driver.fotoCedula} target="_blank" rel="noreferrer" style={{ color: theme.accent }}>Ver</a> : '—'}</span></div>
                <div style={styles.detailItem}><span style={styles.detailLabel}>Foto Licencia</span><span style={styles.detailValue}>{driver.fotoLicencia ? <a href={driver.fotoLicencia} target="_blank" rel="noreferrer" style={{ color: theme.accent }}>Ver</a> : '—'}</span></div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default DriversPage;
