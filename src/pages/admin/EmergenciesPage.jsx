import { useState, useEffect, useMemo } from 'react';
import DataTable from '../../components/admin/DataTable';
import Modal from '../../components/admin/Modal';
import ConfirmDialog from '../../components/admin/ConfirmDialog';
import { getEmergencies, resolveEmergency } from '../../api/admin';

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

const pulseKeyframes = `
@keyframes emergencyPulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
`;

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
  title: {
    fontSize: 24,
    fontWeight: 800,
    color: theme.text,
    margin: 0,
  },
  subtitle: {
    fontSize: 14,
    color: theme.muted,
    margin: '4px 0 0',
  },
  filterBar: {
    display: 'flex',
    gap: 8,
    marginBottom: 20,
  },
  filterBtn: {
    padding: '8px 18px',
    borderRadius: 8,
    border: `1px solid ${theme.border}`,
    backgroundColor: 'transparent',
    color: theme.muted,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  filterBtnActive: {
    backgroundColor: `${theme.accent}20`,
    color: theme.accent,
    borderColor: `${theme.accent}50`,
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '4px 12px',
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 600,
    gap: 6,
  },
  badgePending: {
    backgroundColor: `${theme.danger}20`,
    color: theme.danger,
    animation: 'emergencyPulse 2s ease-in-out infinite',
  },
  badgeResolved: {
    backgroundColor: `${theme.success}20`,
    color: theme.success,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: '50%',
    display: 'inline-block',
  },
  dotPending: {
    backgroundColor: theme.danger,
  },
  dotResolved: {
    backgroundColor: theme.success,
  },
  resolveBtn: {
    padding: '6px 14px',
    borderRadius: 6,
    border: 'none',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    backgroundColor: `${theme.accent}20`,
    color: theme.accent,
  },
  detailBtn: {
    padding: '6px 14px',
    borderRadius: 6,
    border: 'none',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    backgroundColor: `${theme.muted}20`,
    color: theme.muted,
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
    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: 14,
  },
  detailCard: {
    backgroundColor: theme.bg,
    borderRadius: 10,
    border: `1px solid ${theme.border}`,
    padding: 14,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: 700,
    color: theme.muted,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    margin: '0 0 6px',
  },
  detailValue: {
    fontSize: 14,
    color: theme.text,
    margin: 0,
    wordBreak: 'break-word',
  },
  label: {
    fontSize: 13,
    fontWeight: 600,
    color: theme.muted,
    marginBottom: 8,
    display: 'block',
  },
  textarea: {
    width: '100%',
    minHeight: 80,
    padding: 14,
    borderRadius: 10,
    border: `1px solid ${theme.border}`,
    backgroundColor: theme.bg,
    color: theme.text,
    fontSize: 14,
    fontFamily: 'inherit',
    resize: 'vertical',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.15s ease',
  },
};

function StatusBadge({ status }) {
  const isPending = status === 'pending';
  return (
    <span
      style={{
        ...styles.badge,
        ...(isPending ? styles.badgePending : styles.badgeResolved),
      }}
    >
      <span style={{ ...styles.dot, ...(isPending ? styles.dotPending : styles.dotResolved) }} />
      {isPending ? 'Pendiente' : 'Resuelta'}
    </span>
  );
}

function EmergenciesPage() {
  const [emergencies, setEmergencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [detailModal, setDetailModal] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchEmergencies = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getEmergencies();
      setEmergencies(Array.isArray(res.data) ? res.data : (res.data.data || res.data || []));
    } catch (err) {
      setError(err.response?.data?.message || 'Error al cargar las emergencias');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmergencies();
  }, []);

  const filtered = useMemo(() => {
    if (filter === 'all') return emergencies;
    return emergencies.filter((e) => e.status === filter);
  }, [emergencies, filter]);

  const counts = useMemo(() => ({
    all: emergencies.length,
    pending: emergencies.filter((e) => e.status === 'pending').length,
    resolved: emergencies.filter((e) => e.status === 'resolved').length,
  }), [emergencies]);

  const handleResolve = async () => {
    if (!confirmModal) return;
    setSubmitting(true);
    try {
      await resolveEmergency(confirmModal.id, notes.trim() || undefined);
      await fetchEmergencies();
      setConfirmModal(null);
      setNotes('');
    } catch (err) {
      setError(err.response?.data?.message || 'Error al resolver la emergencia');
    } finally {
      setSubmitting(false);
    }
  };

  const openConfirm = (row) => {
    setConfirmModal(row);
    setNotes('');
  };

  const columns = [
    {
      key: 'id',
      label: 'ID',
      render: (val) => (
        <span style={{ fontSize: 12, color: theme.muted }}>#{String(val).slice(0, 8)}</span>
      ),
    },
    {
      key: 'user',
      label: 'Usuario',
      render: (val, row) => (
        <span style={{ fontWeight: 600 }}>
          {row.userName || val?.name || val || '—'}
        </span>
      ),
    },
    {
      key: 'type',
      label: 'Tipo',
      render: (val) => (
        <span style={{ textTransform: 'capitalize' }}>{val || '—'}</span>
      ),
    },
    {
      key: 'location',
      label: 'Ubicación',
      render: (val, row) => (
        <span>{val || row.ubicacion || '—'}</span>
      ),
    },
    {
      key: 'status',
      label: 'Estado',
      render: (val) => <StatusBadge status={val} />,
    },
    {
      key: 'createdAt',
      label: 'Fecha',
      render: (val) =>
        val
          ? new Date(val).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
          : '—',
    },
    {
      key: 'acciones',
      label: 'Acciones',
      render: (_, row) => (
        <div style={styles.actionsCell}>
          <button
            style={styles.detailBtn}
            onClick={(e) => {
              e.stopPropagation();
              setDetailModal(row);
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = `${theme.muted}40`;
              e.currentTarget.style.color = theme.text;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = `${theme.muted}20`;
              e.currentTarget.style.color = theme.muted;
            }}
          >
            Ver Detalles
          </button>
          {row.status !== 'resolved' && (
            <button
              style={styles.resolveBtn}
              onClick={(e) => {
                e.stopPropagation();
                openConfirm(row);
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = theme.accent;
                e.currentTarget.style.color = '#fff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = `${theme.accent}20`;
                e.currentTarget.style.color = theme.accent;
              }}
            >
              Resolver
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div style={styles.page}>
      <style>{pulseKeyframes}</style>

      <div style={styles.pageHeader}>
        <div>
          <h1 style={styles.title}>Emergencias</h1>
          <p style={styles.subtitle}>Gestiona las alertas de emergencia activas</p>
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

      <div style={styles.filterBar}>
        {[
          { key: 'all', label: 'Todas' },
          { key: 'pending', label: 'Pendientes' },
          { key: 'resolved', label: 'Resueltas' },
        ].map((f) => (
          <button
            key={f.key}
            style={{
              ...styles.filterBtn,
              ...(filter === f.key ? styles.filterBtnActive : {}),
            }}
            onClick={() => setFilter(f.key)}
            onMouseEnter={(e) => {
              if (filter !== f.key) {
                e.currentTarget.style.borderColor = theme.muted;
                e.currentTarget.style.color = theme.text;
              }
            }}
            onMouseLeave={(e) => {
              if (filter !== f.key) {
                e.currentTarget.style.borderColor = theme.border;
                e.currentTarget.style.color = theme.muted;
              }
            }}
          >
            {f.label}
            <span style={{ marginLeft: 8, opacity: 0.6 }}>{counts[f.key]}</span>
          </button>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        loading={loading}
        emptyMessage="No hay emergencias para mostrar"
      />

      {/* Detail Modal */}
      <Modal
        isOpen={!!detailModal}
        onClose={() => setDetailModal(null)}
        title="Detalles de Emergencia"
        size="lg"
      >
        {detailModal && (
          <div>
            <div style={styles.detailGrid}>
              <div style={styles.detailCard}>
                <p style={styles.detailLabel}>ID Emergencia</p>
                <p style={styles.detailValue}>#{String(detailModal.id).slice(0, 8)}</p>
              </div>
              <div style={styles.detailCard}>
                <p style={styles.detailLabel}>Usuario</p>
                <p style={styles.detailValue}>
                  {detailModal.userName || detailModal.user?.name || '—'}
                </p>
              </div>
              <div style={styles.detailCard}>
                <p style={styles.detailLabel}>Tipo</p>
                <p style={styles.detailValue}>{detailModal.type || '—'}</p>
              </div>
              <div style={styles.detailCard}>
                <p style={styles.detailLabel}>Ubicación</p>
                <p style={styles.detailValue}>{detailModal.location || detailModal.ubicacion || '—'}</p>
              </div>
              <div style={styles.detailCard}>
                <p style={styles.detailLabel}>Estado</p>
                <StatusBadge status={detailModal.status} />
              </div>
              <div style={styles.detailCard}>
                <p style={styles.detailLabel}>Fecha</p>
                <p style={styles.detailValue}>
                  {detailModal.createdAt
                    ? new Date(detailModal.createdAt).toLocaleDateString('es-CO', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })
                    : '—'}
                </p>
              </div>
            </div>

            {detailModal.description && (
              <div style={{ marginTop: 16 }}>
                <p style={styles.label}>Descripción</p>
                <p style={{ ...styles.detailValue, lineHeight: 1.7, color: theme.muted }}>
                  {detailModal.description}
                </p>
              </div>
            )}

            {detailModal.notes && (
              <div style={{ marginTop: 16 }}>
                <p style={styles.label}>Notas de resolución</p>
                <p style={{ ...styles.detailValue, lineHeight: 1.7 }}>
                  {detailModal.notes}
                </p>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Confirm Resolve Dialog */}
      <ConfirmDialog
        isOpen={!!confirmModal}
        onClose={() => {
          setConfirmModal(null);
          setNotes('');
        }}
        onConfirm={handleResolve}
        title="Resolver Emergencia"
        message={`¿Deseas marcar la emergencia #${confirmModal ? String(confirmModal.id).slice(0, 8) : ''} como resuelta?`}
        confirmText={submitting ? 'Resolviendo...' : 'Resolver'}
        danger={false}
      >
        <textarea
          style={styles.textarea}
          placeholder="Notas opcionales sobre la resolución..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onFocus={(e) => { e.target.style.borderColor = theme.accent; }}
          onBlur={(e) => { e.target.style.borderColor = theme.border; }}
        />
      </ConfirmDialog>
    </div>
  );
}

export default EmergenciesPage;
