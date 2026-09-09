import { useState, useEffect, useMemo } from 'react';
import DataTable from '../../components/admin/DataTable';
import ConfirmDialog from '../../components/admin/ConfirmDialog';
import { getModeratorReports, approveEncuesta } from '../../api/admin';

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
    whiteSpace: 'nowrap',
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
};

function StatusBadge({ status }) {
  const isApproved = status === 'approved';
  return (
    <span
      style={{
        ...styles.badge,
        ...(isApproved ? styles.badgeApproved : styles.badgePending),
      }}
    >
      {isApproved ? 'Aprobado' : 'Pendiente'}
    </span>
  );
}

function EncuestasPage() {
  const [encuestas, setEncuestas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [confirmAction, setConfirmAction] = useState(null);

  const fetchEncuestas = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getModeratorReports();
      const all = Array.isArray(res.data) ? res.data : (res.data.data || res.data || []);
      setEncuestas(
        all.filter((item) => item.type === 'encuesta' || item.tipo === 'encuesta')
      );
    } catch (err) {
      setError(err.response?.data?.message || 'Error al cargar las encuestas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEncuestas();
  }, []);

  const filtered = useMemo(() => {
    if (filter === 'all') return encuestas;
    return encuestas.filter((e) => e.status === filter);
  }, [encuestas, filter]);

  const counts = useMemo(() => ({
    all: encuestas.length,
    pending: encuestas.filter((e) => e.status === 'pending').length,
    approved: encuestas.filter((e) => e.status === 'approved').length,
  }), [encuestas]);

  const handleApprove = async () => {
    if (!confirmAction) return;
    try {
      await approveEncuesta(confirmAction.id);
      await fetchEncuestas();
    } catch (err) {
      setError(err.response?.data?.message || 'Error al aprobar encuesta');
    }
    setConfirmAction(null);
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
      key: 'creator',
      label: 'Creador',
      render: (val, row) => val || row.creador || row.reporter?.name || '—',
    },
    {
      key: 'questions',
      label: 'Preguntas',
      render: (val, row) => {
        const count = val || (row.preguntas ? row.preguntas.length : null);
        return count != null ? (
          <span
            style={{
              padding: '4px 10px',
              borderRadius: 6,
              backgroundColor: `${theme.accent}20`,
              color: theme.accent,
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            {count}
          </span>
        ) : '—';
      },
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
        <button
          style={styles.approveBtn}
          onClick={(e) => {
            e.stopPropagation();
            setConfirmAction(row);
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
      ),
    },
  ];

  return (
    <div style={styles.page}>
      <div style={styles.pageHeader}>
        <div>
          <h1 style={styles.title}>Encuestas</h1>
          <p style={styles.subtitle}>Gestiona y aprueba las encuestas creadas por usuarios</p>
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
        emptyMessage="No hay encuestas para mostrar"
      />

      <ConfirmDialog
        isOpen={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleApprove}
        title="Aprobar Encuesta"
        message={`¿Estás seguro de que deseas aprobar la encuesta "${confirmAction?.title || confirmAction?.titulo || ''}"?`}
        confirmText="Aprobar"
      />
    </div>
  );
}

export default EncuestasPage;
