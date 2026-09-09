import { useState, useEffect, useMemo } from 'react';
import DataTable from '../../components/admin/DataTable';
import ConfirmDialog from '../../components/admin/ConfirmDialog';
import { getCancellationRequests, approveCancellation, rejectCancellation } from '../../api/admin';

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
  badgeApproved: {
    backgroundColor: `${theme.success}20`,
    color: theme.success,
  },
  badgeRejected: {
    backgroundColor: `${theme.danger}20`,
    color: theme.danger,
  },
  approveBtn: {
    padding: '6px 14px',
    borderRadius: 6,
    border: 'none',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    backgroundColor: `${theme.success}20`,
    color: theme.success,
  },
  rejectBtn: {
    padding: '6px 14px',
    borderRadius: 6,
    border: 'none',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
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
};

const statusLabels = {
  pending: 'Pendiente',
  approved: 'Aprobada',
  rejected: 'Rechazada',
};

function StatusBadge({ status }) {
  const badgeStyles = {
    pending: styles.badgePending,
    approved: styles.badgeApproved,
    rejected: styles.badgeRejected,
  };

  return (
    <span style={{ ...styles.badge, ...(badgeStyles[status] || styles.badgePending) }}>
      {statusLabels[status] || status || '—'}
    </span>
  );
}

function CancellationRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [confirmAction, setConfirmAction] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getCancellationRequests();
      setRequests(Array.isArray(res.data) ? res.data : (res.data.data || res.data || []));
    } catch (err) {
      setError(err.response?.data?.message || 'Error al cargar las solicitudes de cancelación');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const filtered = useMemo(() => {
    if (filter === 'all') return requests;
    return requests.filter((r) => r.status === filter);
  }, [requests, filter]);

  const counts = useMemo(() => ({
    all: requests.length,
    pending: requests.filter((r) => r.status === 'pending').length,
    approved: requests.filter((r) => r.status === 'approved').length,
    rejected: requests.filter((r) => r.status === 'rejected').length,
  }), [requests]);

  const handleConfirm = async () => {
    if (!confirmAction) return;
    setSubmitting(true);
    try {
      if (confirmAction.action === 'approve') {
        await approveCancellation(confirmAction.row.id);
      } else {
        await rejectCancellation(confirmAction.row.id);
      }
      await fetchRequests();
      setConfirmAction(null);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          `Error al ${confirmAction.action === 'approve' ? 'aprobar' : 'rechazar'} la solicitud`
      );
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
      key: 'tripId',
      label: 'Viaje',
      render: (val, row) => (
        <span style={{ fontWeight: 600 }}>
          {val || row.trip?.id ? `#${String(val || row.trip?.id).slice(0, 8)}` : '—'}
        </span>
      ),
    },
    {
      key: 'requester',
      label: 'Solicitante',
      render: (val, row) => (
        <span>{val || row.requester?.name || row.user?.name || '—'}</span>
      ),
    },
    {
      key: 'reason',
      label: 'Motivo',
      render: (val) => (
        <span style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'inline-block' }}>
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
      render: (_, row) => (
        <div style={styles.actionsCell}>
          {row.status === 'pending' && (
            <>
              <button
                style={styles.approveBtn}
                onClick={(e) => {
                  e.stopPropagation();
                  setConfirmAction({ row, action: 'approve' });
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
                style={styles.rejectBtn}
                onClick={(e) => {
                  e.stopPropagation();
                  setConfirmAction({ row, action: 'reject' });
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
            </>
          )}
        </div>
      ),
    },
  ];

  const isApprove = confirmAction?.action === 'approve';

  return (
    <div style={styles.page}>
      <div style={styles.pageHeader}>
        <div>
          <h1 style={styles.title}>Solicitudes de Cancelación</h1>
          <p style={styles.subtitle}>Revisa y gestiona las solicitudes de cancelación de viajes</p>
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
          { key: 'approved', label: 'Aprobadas' },
          { key: 'rejected', label: 'Rechazadas' },
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
        emptyMessage="No hay solicitudes de cancelación para mostrar"
      />

      {/* Approve Confirm Dialog */}
      <ConfirmDialog
        isOpen={!!confirmAction && isApprove}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleConfirm}
        title="Aprobar Cancelación"
        message={`¿Deseas aprobar la solicitud de cancelación #${confirmAction?.row ? String(confirmAction.row.id).slice(0, 8) : ''}?`}
        confirmText={submitting ? 'Aprobando...' : 'Aprobar'}
        danger={false}
      />

      {/* Reject Confirm Dialog */}
      <ConfirmDialog
        isOpen={!!confirmAction && !isApprove}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleConfirm}
        title="Rechazar Cancelación"
        message={`¿Deseas rechazar la solicitud de cancelación #${confirmAction?.row ? String(confirmAction.row.id).slice(0, 8) : ''}?`}
        confirmText={submitting ? 'Rechazando...' : 'Rechazar'}
        danger
      />
    </div>
  );
}

export default CancellationRequestsPage;
