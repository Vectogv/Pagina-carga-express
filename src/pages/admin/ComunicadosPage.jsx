import { useState, useEffect, useMemo } from 'react';
import DataTable from '../../components/admin/DataTable';
import ConfirmDialog from '../../components/admin/ConfirmDialog';
import { getModeratorReports, approveComunicado, rejectComunicado } from '../../api/admin';

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
  count: {
    fontSize: 13,
    color: theme.muted,
    marginLeft: 8,
  },
  truncatedCell: {
    maxWidth: 200,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    display: 'inline-block',
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

function ComunicadosPage() {
  const [comunicados, setComunicados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [confirmAction, setConfirmAction] = useState(null);
  const [notaRechazo, setNotaRechazo] = useState('');

  const fetchComunicados = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getModeratorReports();
      const all = res.data.data || res.data || [];
      const list = Array.isArray(all) ? all : [];
      setComunicados(list.filter((item) => item.type === 'comunicado' || item.tipo === 'comunicado' || !item.type));
    } catch (err) {
      setError(err.response?.data?.message || 'Error al cargar los comunicados');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComunicados();
  }, []);

  const filtered = useMemo(() => {
    if (filter === 'all') return comunicados;
    return comunicados.filter((c) => c.status === filter);
  }, [comunicados, filter]);

  const counts = useMemo(() => ({
    all: comunicados.length,
    pending: comunicados.filter((c) => c.status === 'pending').length,
    approved: comunicados.filter((c) => c.status === 'approved').length,
    rejected: comunicados.filter((c) => c.status === 'rejected').length,
  }), [comunicados]);

  const handleApprove = async () => {
    if (!confirmAction) return;
    try {
      await approveComunicado(confirmAction.id);
      await fetchComunicados();
    } catch (err) {
      setError(err.response?.data?.message || 'Error al aprobar comunicado');
    }
    setConfirmAction(null);
  };

  const handleReject = async () => {
    if (!confirmAction) return;
    try {
      const payload = notaRechazo.trim() ? { notaRechazo: notaRechazo.trim() } : {};
      await rejectComunicado(confirmAction.id, payload);
      await fetchComunicados();
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.errors?.[0]?.message || 'Error al rechazar comunicado');
    }
    setConfirmAction(null);
    setNotaRechazo('');
  };

  const columns = [
    {
      key: 'title',
      label: 'Título',
      render: (val, row) => (
        <span style={{ fontWeight: 600 }}>{val || row.titulo || '—'}</span>
      ),
    },
    {
      key: 'author',
      label: 'Autor',
      render: (val, row) => val || row.autor || row.reporter?.name || '—',
    },
    {
      key: 'content',
      label: 'Contenido',
      render: (val, row) => (
        <span style={styles.truncatedCell} title={val || row.contenido || ''}>
          {val || row.contenido || '—'}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Estado',
      render: (val) => <StatusBadge status={val || 'pending'} />,
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
          <h1 style={styles.title}>Comunicados</h1>
          <p style={styles.subtitle}>Gestiona y modera los comunicados publicados</p>
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
          { key: 'approved', label: 'Aprobados' },
          { key: 'rejected', label: 'Rechazados' },
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
        emptyMessage="No hay comunicados para mostrar"
      />

      <ConfirmDialog
        isOpen={!!confirmAction}
        onClose={() => { setConfirmAction(null); setNotaRechazo(''); }}
        onConfirm={confirmAction?.type === 'approve' ? handleApprove : handleReject}
        title={confirmAction?.type === 'approve' ? 'Aprobar Comunicado' : 'Rechazar Comunicado'}
        message={
          confirmAction?.type === 'approve'
            ? `¿Estás seguro de que deseas aprobar el comunicado "${confirmAction?.title || confirmAction?.titulo || ''}"?`
            : `¿Estás seguro de que deseas rechazar el comunicado "${confirmAction?.title || confirmAction?.titulo || ''}"? Esta acción no se puede deshacer.`
        }
        confirmText={confirmAction?.type === 'approve' ? 'Aprobar' : 'Rechazar'}
        danger={confirmAction?.type === 'reject'}
      >
        {confirmAction?.type === 'reject' && (
          <div style={{ marginTop: 12 }}>
            <label style={{ fontSize: 12, color: theme.muted, display: 'block', marginBottom: 6 }}>Nota de rechazo (opcional) — {"{notaRechazo}"}</label>
            <textarea value={notaRechazo} onChange={(e) => setNotaRechazo(e.target.value)} placeholder="Motivo del rechazo" rows={2} style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: `1px solid ${theme.border}`, backgroundColor: theme.bg, color: theme.text, fontSize: 13, resize: 'vertical', boxSizing: 'border-box' }} />
          </div>
        )}
      </ConfirmDialog>
    </div>
  );
}

export default ComunicadosPage;
