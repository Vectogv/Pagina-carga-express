import { useState, useEffect, useMemo } from 'react';
import DataTable from '../../components/admin/DataTable';
import Modal from '../../components/admin/Modal';
import { getReports, resolveReport } from '../../api/admin';

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
  },
  badgePending: {
    backgroundColor: `${theme.warning}20`,
    color: theme.warning,
  },
  badgeResolved: {
    backgroundColor: `${theme.success}20`,
    color: theme.success,
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
  textarea: {
    width: '100%',
    minHeight: 120,
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
  textareaLabel: {
    fontSize: 13,
    fontWeight: 600,
    color: theme.muted,
    marginBottom: 8,
    display: 'block',
  },
  submitBtn: {
    marginTop: 16,
    padding: '10px 24px',
    borderRadius: 8,
    border: 'none',
    backgroundColor: theme.accent,
    color: '#fff',
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    width: '100%',
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
  count: {
    fontSize: 13,
    color: theme.muted,
    marginLeft: 8,
  },
};

function StatusBadge({ status }) {
  const isResolved = status === 'resolved';
  return (
    <span
      style={{
        ...styles.badge,
        ...(isResolved ? styles.badgeResolved : styles.badgePending),
      }}
    >
      {isResolved ? 'Resuelto' : 'Pendiente'}
    </span>
  );
}

function ReportsPage() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [resolveModal, setResolveModal] = useState(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchReports = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getReports();
      setReports(Array.isArray(res.data) ? res.data : (res.data.data || res.data || []));
    } catch (err) {
      setError(err.response?.data?.message || 'Error al cargar los reportes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const filtered = useMemo(() => {
    if (filter === 'all') return reports;
    return reports.filter((r) => r.status === filter);
  }, [reports, filter]);

  const counts = useMemo(() => ({
    all: reports.length,
    pending: reports.filter((r) => r.status === 'pending').length,
    resolved: reports.filter((r) => r.status === 'resolved').length,
  }), [reports]);

  const handleResolve = async () => {
    if (!resolveModal) return;
    setSubmitting(true);
    try {
      await resolveReport(resolveModal.id, { notes: resolutionNotes });
      await fetchReports();
      setResolveModal(null);
      setResolutionNotes('');
    } catch (err) {
      setError(err.response?.data?.message || 'Error al resolver el reporte');
    } finally {
      setSubmitting(false);
    }
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
      key: 'reportedBy',
      label: 'Reportado por',
      render: (val, row) => (
        <span style={{ fontWeight: 600 }}>
          {val || row.reporter?.name || '—'}
        </span>
      ),
    },
    {
      key: 'against',
      label: 'Contra',
      render: (val, row) => (
        <span>{val || row.reported?.name || '—'}</span>
      ),
    },
    {
      key: 'reason',
      label: 'Motivo',
      render: (val) => (
        <span style={{ maxWidth: 200, display: 'inline-block', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {val || '—'}
        </span>
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
      render: (_, row) =>
        row.status !== 'resolved' ? (
          <button
            style={styles.resolveBtn}
            onClick={(e) => {
              e.stopPropagation();
              setResolveModal(row);
              setResolutionNotes('');
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
        ) : (
          <span style={{ fontSize: 12, color: theme.success, fontWeight: 600 }}>✓ Resuelto</span>
        ),
    },
  ];

  return (
    <div style={styles.page}>
      <div style={styles.pageHeader}>
        <div>
          <h1 style={styles.title}>Reportes</h1>
          <p style={styles.subtitle}>Gestiona los reportes de usuarios</p>
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
          { key: 'all', label: 'Todos' },
          { key: 'pending', label: 'Pendientes' },
          { key: 'resolved', label: 'Resueltos' },
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
            <span style={styles.count}>{counts[f.key]}</span>
          </button>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        loading={loading}
        emptyMessage="No hay reportes para mostrar"
      />

      <Modal
        isOpen={!!resolveModal}
        onClose={() => {
          setResolveModal(null);
          setResolutionNotes('');
        }}
        title="Resolver Reporte"
        size="md"
      >
        {resolveModal && (
          <div>
            <div style={styles.detailGrid}>
              <div style={styles.detailCard}>
                <p style={styles.detailLabel}>Reportado por</p>
                <p style={styles.detailValue}>{resolveModal.reportedBy || resolveModal.reporter?.name || '—'}</p>
              </div>
              <div style={styles.detailCard}>
                <p style={styles.detailLabel}>Contra</p>
                <p style={styles.detailValue}>{resolveModal.against || resolveModal.reported?.name || '—'}</p>
              </div>
              <div style={styles.detailCard}>
                <p style={styles.detailLabel}>Motivo</p>
                <p style={styles.detailValue}>{resolveModal.reason || '—'}</p>
              </div>
              <div style={styles.detailCard}>
                <p style={styles.detailLabel}>Fecha</p>
                <p style={styles.detailValue}>
                  {resolveModal.createdAt
                    ? new Date(resolveModal.createdAt).toLocaleDateString('es-CO')
                    : '—'}
                </p>
              </div>
            </div>

            {resolveModal.description && (
              <div style={{ marginTop: 16 }}>
                <p style={styles.detailLabel}>Descripción</p>
                <p style={{ ...styles.detailValue, lineHeight: 1.6, color: theme.muted }}>
                  {resolveModal.description}
                </p>
              </div>
            )}

            <div style={{ marginTop: 20 }}>
              <label style={styles.textareaLabel}>Notas de resolución</label>
              <textarea
                style={styles.textarea}
                placeholder="Escribe las notas de resolución..."
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                onFocus={(e) => {
                  e.target.style.borderColor = theme.accent;
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = theme.border;
                }}
              />
            </div>

            <button
              style={styles.submitBtn}
              onClick={handleResolve}
              disabled={!resolutionNotes.trim() || submitting}
              onMouseEnter={(e) => {
                if (!submitting) {
                  e.currentTarget.style.opacity = '0.9';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '1';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              {submitting ? 'Resolviendo...' : 'Marcar como Resuelto'}
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default ReportsPage;
