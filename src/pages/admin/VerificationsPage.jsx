import { useState, useEffect } from 'react';
import DataTable from '../../components/admin/DataTable';
import Modal from '../../components/admin/Modal';
import ConfirmDialog from '../../components/admin/ConfirmDialog';
import { getVerifications, approveVerification, rejectVerification } from '../../api/admin';

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
    padding: 32,
    minHeight: '100vh',
    backgroundColor: theme.bg,
    color: theme.text,
  },
  pageHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 28,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: 800,
    color: theme.text,
    margin: 0,
  },
  pageSubtitle: {
    fontSize: 14,
    color: theme.muted,
    margin: '4px 0 0',
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '4px 12px',
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 600,
    whiteSpace: 'nowrap',
  },
  badgePending: {
    backgroundColor: `${theme.warning}20`,
    color: theme.warning,
  },
  badgeApproved: {
    backgroundColor: `${theme.success}20`,
    color: theme.success,
  },
  badgeRejected: {
    backgroundColor: `${theme.danger}20`,
    color: theme.danger,
  },
  actionBtn: {
    padding: '6px 14px',
    borderRadius: 6,
    border: 'none',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    whiteSpace: 'nowrap',
  },
  approveBtn: {
    backgroundColor: `${theme.success}20`,
    color: theme.success,
  },
  rejectBtn: {
    backgroundColor: `${theme.danger}20`,
    color: theme.danger,
  },
  actionsCell: {
    display: 'flex',
    gap: 8,
    flexWrap: 'nowrap',
  },
  errorBanner: {
    padding: '16px 20px',
    borderRadius: 10,
    backgroundColor: `${theme.danger}15`,
    border: `1px solid ${theme.danger}40`,
    color: theme.danger,
    fontSize: 14,
    marginBottom: 20,
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  detailGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
    gap: 16,
  },
  detailCard: {
    backgroundColor: `${"#020208"}`,
    borderRadius: 10,
    border: `1px solid ${theme.border}`,
    padding: 16,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: 700,
    color: theme.muted,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    margin: 0,
  },
  detailValue: {
    fontSize: 14,
    color: theme.text,
    margin: 0,
  },
  docImage: {
    width: '100%',
    maxHeight: 300,
    objectFit: 'contain',
    borderRadius: 8,
    backgroundColor: `${"#020208"}`,
    border: `1px solid ${theme.border}`,
  },
  driverInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  driverAvatar: {
    width: 32,
    height: 32,
    borderRadius: '50%',
    backgroundColor: theme.accent,
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 12,
    fontWeight: 700,
    flexShrink: 0,
  },
  driverName: {
    fontWeight: 600,
    fontSize: 14,
    color: theme.text,
  },
  documentsSection: {
    marginTop: 20,
    paddingTop: 20,
    borderTop: `1px solid ${theme.border}`,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: theme.text,
    margin: '0 0 12px',
  },
};

function StatusBadge({ status }) {
  const map = {
    approved: styles.badgeApproved,
    rejected: styles.badgeRejected,
    pending: styles.badgePending,
  };
  const labels = {
    approved: 'Aprobado',
    rejected: 'Rechazado',
    pending: 'Pendiente',
  };
  return (
    <span style={{ ...styles.badge, ...(map[status] || styles.badgePending) }}>
      {labels[status] || status}
    </span>
  );
}

function DriverCell({ name, cedula }) {
  const initials = name
    ? name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : '??';
  return (
    <div style={styles.driverInfo}>
      <div style={styles.driverAvatar}>{initials}</div>
      <div>
        <div style={styles.driverName}>{name}</div>
        <div style={{ fontSize: 12, color: theme.muted }}>{cedula}</div>
      </div>
    </div>
  );
}

function VerificationsPage() {
  const [verifications, setVerifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const [nota, setNota] = useState('');

  const fetchVerifications = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getVerifications();
      setVerifications(Array.isArray(res.data) ? res.data : (res.data.data || res.data || []));
    } catch (err) {
      setError(err.response?.data?.message || 'Error al cargar las verificaciones');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVerifications();
  }, []);

  const handleApprove = async () => {
    if (!confirmAction) return;
    try {
      await approveVerification(confirmAction.conductorId || confirmAction.id);
      await fetchVerifications();
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.errors?.[0]?.message || 'Error al aprobar verificación');
    }
    setConfirmAction(null);
  };

  const handleReject = async () => {
    if (!confirmAction) return;
    try {
      const payload = nota.trim() ? { nota: nota.trim() } : {};
      await rejectVerification(confirmAction.conductorId || confirmAction.id, payload);
      await fetchVerifications();
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.errors?.[0]?.message || 'Error al rechazar verificación');
    }
    setConfirmAction(null);
    setNota('');
  };

  const columns = [
    {
      key: 'conductor',
      label: 'Conductor',
      render: (_, row) => (
        <DriverCell
          name={row.conductorName || row.conductor?.name || row.name}
          cedula={row.cedula || row.conductor?.cedula}
        />
      ),
    },
    {
      key: 'cedula',
      label: 'Cédula',
      render: (val, row) => <StatusBadge status={row.cedulaStatus || val || 'pending'} />,
    },
    {
      key: 'licencia',
      label: 'Licencia',
      render: (val, row) => <StatusBadge status={row.licenciaStatus || val || 'pending'} />,
    },
    {
      key: 'vehiculo',
      label: 'Vehículo',
      render: (val, row) => <StatusBadge status={row.vehiculoStatus || val || 'pending'} />,
    },
    {
      key: 'acciones',
      label: 'Acciones',
      render: (_, row) => (
        <div style={styles.actionsCell}>
          <button
            style={{ ...styles.actionBtn, ...styles.approveBtn }}
            onClick={(e) => {
              e.stopPropagation();
              setConfirmAction({ ...row, type: 'approve' });
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = theme.success;
              e.currentTarget.style.color = '#fff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = `${theme.success}20`;
              e.currentTarget.style.color = theme.success;
            }}
          >
            Aprobar
          </button>
          <button
            style={{ ...styles.actionBtn, ...styles.rejectBtn }}
            onClick={(e) => {
              e.stopPropagation();
              setConfirmAction({ ...row, type: 'reject' });
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = theme.danger;
              e.currentTarget.style.color = '#fff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = `${theme.danger}20`;
              e.currentTarget.style.color = theme.danger;
            }}
          >
            Rechazar
          </button>
        </div>
      ),
    },
  ];

  return (
    <div style={styles.page}>
      <div style={styles.pageHeader}>
        <div>
          <h1 style={styles.pageTitle}>Verificaciones de Conductores</h1>
          <p style={styles.pageSubtitle}>
            Revisa y gestiona la documentación de los conductores
          </p>
        </div>
      </div>

      {error && (
        <div style={styles.errorBanner}>
          <span>⚠</span>
          <span>{error}</span>
          <button
            style={{
              marginLeft: 'auto',
              background: 'none',
              border: 'none',
              color: theme.danger,
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: 13,
            }}
            onClick={() => setError(null)}
          >
            ✕
          </button>
        </div>
      )}

      <DataTable
        columns={columns}
        data={verifications}
        loading={loading}
        emptyMessage="No hay verificaciones pendientes"
        onRowClick={setSelected}
      />

      <Modal
        isOpen={!!selected}
        onClose={() => setSelected(null)}
        title="Detalles de Verificación"
        size="lg"
      >
        {selected && (
          <>
            <div style={styles.detailGrid}>
              <div style={styles.detailCard}>
                <p style={styles.detailLabel}>Conductor</p>
                <p style={styles.detailValue}>
                  {selected.conductorName || selected.conductor?.name || '—'}
                </p>
              </div>
              <div style={styles.detailCard}>
                <p style={styles.detailLabel}>Cédula</p>
                <p style={styles.detailValue}>
                  {selected.cedula || selected.conductor?.cedula || '—'}
                </p>
              </div>
              <div style={styles.detailCard}>
                <p style={styles.detailLabel}>Estado Cédula</p>
                <StatusBadge status={selected.cedulaStatus || 'pending'} />
              </div>
              <div style={styles.detailCard}>
                <p style={styles.detailLabel}>Estado Licencia</p>
                <StatusBadge status={selected.licenciaStatus || 'pending'} />
              </div>
              <div style={styles.detailCard}>
                <p style={styles.detailLabel}>Estado Vehículo</p>
                <StatusBadge status={selected.vehiculoStatus || 'pending'} />
              </div>
              <div style={styles.detailCard}>
                <p style={styles.detailLabel}>Fecha de Solicitud</p>
                <p style={styles.detailValue}>
                  {selected.createdAt
                    ? new Date(selected.createdAt).toLocaleDateString('es-CO')
                    : '—'}
                </p>
              </div>
            </div>

            {(selected.documents || selected.cedulaImage || selected.licenciaImage || selected.vehiculoImage) && (
              <div style={styles.documentsSection}>
                <p style={styles.sectionTitle}>Documentos Cargados</p>
                <div style={styles.detailGrid}>
                  {selected.cedulaImage && (
                    <div style={styles.detailCard}>
                      <p style={styles.detailLabel}>Cédula</p>
                      <img
                        src={selected.cedulaImage}
                        alt="Cédula"
                        style={styles.docImage}
                      />
                    </div>
                  )}
                  {selected.licenciaImage && (
                    <div style={styles.detailCard}>
                      <p style={styles.detailLabel}>Licencia</p>
                      <img
                        src={selected.licenciaImage}
                        alt="Licencia"
                        style={styles.docImage}
                      />
                    </div>
                  )}
                  {selected.vehiculoImage && (
                    <div style={styles.detailCard}>
                      <p style={styles.detailLabel}>Vehículo</p>
                      <img
                        src={selected.vehiculoImage}
                        alt="Vehículo"
                        style={styles.docImage}
                      />
                    </div>
                  )}
                  {selected.documents?.map((doc, i) => (
                    <div key={i} style={styles.detailCard}>
                      <p style={styles.detailLabel}>{doc.label || `Documento ${i + 1}`}</p>
                      {doc.type === 'image' || doc.url?.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                        <img src={doc.url} alt={doc.label} style={styles.docImage} />
                      ) : (
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: theme.accent, fontSize: 13 }}
                        >
                          Ver documento
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={!!confirmAction}
        onClose={() => { setConfirmAction(null); setNota(''); }}
        onConfirm={confirmAction?.type === 'approve' ? handleApprove : handleReject}
        title={confirmAction?.type === 'approve' ? 'Aprobar Verificación' : 'Rechazar Verificación'}
        message={
          confirmAction?.type === 'approve'
            ? `¿Estás seguro de que deseas aprobar la verificación de ${confirmAction?.conductorName || confirmAction?.conductor?.name || 'este conductor'}?`
            : `¿Estás seguro de que deseas rechazar la verificación de ${confirmAction?.conductorName || confirmAction?.conductor?.name || 'este conductor'}? Esta acción no se puede deshacer.`
        }
        confirmText={confirmAction?.type === 'approve' ? 'Aprobar' : 'Rechazar'}
        danger={confirmAction?.type === 'reject'}
      >
        {confirmAction?.type === 'reject' && (
          <div style={{ marginTop: 12 }}>
            <label style={{ fontSize: 12, color: theme.muted, display: 'block', marginBottom: 6 }}>Nota (opcional) — doc §18: {"{nota}"}</label>
            <textarea
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              placeholder="Ej: Documento ilegible"
              rows={2}
              style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: `1px solid ${theme.border}`, backgroundColor: theme.bg, color: theme.text, fontSize: 13, resize: 'vertical', boxSizing: 'border-box' }}
            />
          </div>
        )}
      </ConfirmDialog>
    </div>
  );
}

export default VerificationsPage;
