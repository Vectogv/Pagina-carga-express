import { useState, useEffect } from 'react';
import DataTable from '../../components/admin/DataTable';
import { getModeratorReports } from '../../api/admin';

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
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '4px 12px',
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 600,
  },
  badgeType: {
    backgroundColor: `${theme.accent}20`,
    color: theme.accent,
  },
  truncatedCell: {
    maxWidth: 280,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    display: 'inline-block',
  },
};

function ModeratorReportsPage() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchReports = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getModeratorReports();
      setReports(Array.isArray(res.data) ? res.data : (res.data.data || res.data || []));
    } catch (err) {
      setError(err.response?.data?.message || 'Error al cargar los reportes del moderador');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const columns = [
    {
      key: 'moderator',
      label: 'Moderador',
      render: (val, row) => (
        <span style={{ fontWeight: 600 }}>
          {val || row.moderador || row.moderatorName || '—'}
        </span>
      ),
    },
    {
      key: 'type',
      label: 'Tipo',
      render: (val, row) => (
        <span style={{ ...styles.badge, ...styles.badgeType }}>
          {val || row.tipo || '—'}
        </span>
      ),
    },
    {
      key: 'content',
      label: 'Contenido',
      render: (val, row) => (
        <span style={styles.truncatedCell} title={val || row.contenido || row.description || ''}>
          {val || row.contenido || row.description || '—'}
        </span>
      ),
    },
    {
      key: 'createdAt',
      label: 'Fecha',
      render: (val) =>
        val
          ? new Date(val).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
          : '—',
    },
  ];

  return (
    <div style={styles.page}>
      <div style={styles.pageHeader}>
        <div>
          <h1 style={styles.title}>Reportes del Moderador</h1>
          <p style={styles.subtitle}>Consulta las acciones realizadas por los moderadores</p>
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
        data={reports}
        loading={loading}
        emptyMessage="No hay reportes del moderador"
      />
    </div>
  );
}

export default ModeratorReportsPage;
