import { useState, useEffect } from 'react';
import { getBackups, runBackup } from '../../api/admin';

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

function BackupsPage() {
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);
  const [toasts, setToasts] = useState([]);

  const fetchBackups = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getBackups();
      setBackups(Array.isArray(res.data) ? res.data : (res.data?.backups || res.data?.data || res.data || []));
    } catch (err) {
      setError(err?.response?.data?.message || 'Error al cargar los backups');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBackups();
  }, []);

  const showToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  };

  const handleCreateBackup = async () => {
    setCreating(true);
    try {
      await runBackup();
      showToast('Backup creado exitosamente');
      await fetchBackups();
    } catch {
      showToast('Error al crear el backup', 'error');
    } finally {
      setCreating(false);
    }
  };

  const formatSize = (bytes) => {
    if (!bytes) return '--';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '--';
    try {
      return new Date(dateStr).toLocaleString('es-CO', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const getStatusStyle = (status) => {
    const s = (status || '').toLowerCase();
    if (s === 'completado' || s === 'completed' || s === 'exitoso' || s === 'success') {
      return { color: theme.success, bg: `${theme.success}22` };
    }
    if (s === 'pendiente' || s === 'pending' || s === 'en progreso' || s === 'running') {
      return { color: theme.warning, bg: `${theme.warning}22` };
    }
    if (s === 'error' || s === 'fallido' || s === 'failed') {
      return { color: theme.danger, bg: `${theme.danger}22` };
    }
    return { color: theme.muted, bg: `${theme.muted}22` };
  };

  if (loading) return <LoadingSkeleton />;

  return (
    <div style={styles.page}>
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>

      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Gestión de Backups</h1>
          <p style={styles.subtitle}>Crea y administra copias de seguridad del sistema</p>
        </div>
        <button
          onClick={handleCreateBackup}
          disabled={creating}
          style={{
            ...styles.btn,
            ...styles.btnPrimary,
            opacity: creating ? 0.6 : 1,
          }}
        >
          {creating ? '⏳ Creando...' : '+ Crear Backup'}
        </button>
      </div>

      {error && (
        <div style={styles.errorBanner}>
          <span>⚠️ {error}</span>
        </div>
      )}

      <div style={styles.card}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>ID</th>
              <th style={styles.th}>Fecha</th>
              <th style={styles.th}>Tamaño</th>
              <th style={styles.th}>Estado</th>
            </tr>
          </thead>
          <tbody>
            {backups.length === 0 ? (
              <tr>
                <td colSpan={4} style={styles.emptyCell}>
                  No hay backups registrados
                </td>
              </tr>
            ) : (
              backups.map((backup, idx) => {
                const status = getStatusStyle(backup.status || backup.estado);
                return (
                  <tr
                    key={backup.id || backup._id || idx}
                    style={idx % 2 === 0 ? styles.rowEven : styles.rowOdd}
                  >
                    <td style={styles.td}>
                      <span style={{ color: theme.muted, fontSize: 13, fontFamily: 'monospace' }}>
                        {(backup.id || backup._id || idx + 1).toString().slice(0, 8)}
                      </span>
                    </td>
                    <td style={styles.td}>
                      {formatDate(backup.createdAt || backup.fecha || backup.date)}
                    </td>
                    <td style={styles.td}>{formatSize(backup.size || backup.tamano)}</td>
                    <td style={styles.td}>
                      <span
                        style={{
                          ...styles.statusBadge,
                          color: status.color,
                          backgroundColor: status.bg,
                        }}
                      >
                        {backup.status || backup.estado || 'Desconocido'}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div style={styles.toastContainer}>
        {toasts.map((toast) => (
          <div
            key={toast.id}
            style={{
              ...styles.toast,
              borderLeftColor: toast.type === 'success' ? theme.success : theme.danger,
            }}
          >
            <span>{toast.type === 'success' ? '✅' : '❌'}</span>
            <span style={{ flex: 1, fontSize: 14, color: theme.text }}>{toast.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div style={styles.page}>
      <div style={{ ...styles.header, marginBottom: 24 }}>
        <div>
          <div style={{ ...styles.skeletonLine, width: 200, height: 28 }} />
          <div style={{ ...styles.skeletonLine, width: 280, height: 16, marginTop: 8 }} />
        </div>
        <div style={{ ...styles.skeletonLine, width: 150, height: 42, borderRadius: 10 }} />
      </div>
      <div style={styles.card}>
        <div style={styles.skeletonRow}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} style={{ ...styles.skeletonLine, flex: 1, height: 14 }} />
          ))}
        </div>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} style={styles.skeletonRow}>
            {[1, 2, 3, 4].map((j) => (
              <div key={j} style={{ ...styles.skeletonLine, flex: 1, height: 14 }} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

const styles = {
  page: { padding: 32 },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    flexWrap: 'wrap',
    gap: 16,
  },
  title: { fontSize: 24, fontWeight: 700, color: theme.text, margin: 0 },
  subtitle: { fontSize: 14, color: theme.muted, margin: '4px 0 0' },
  card: {
    backgroundColor: theme.cards,
    borderRadius: 14,
    border: `1px solid ${theme.border}`,
    overflow: 'hidden',
  },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: {
    padding: '14px 20px',
    textAlign: 'left',
    fontSize: 12,
    fontWeight: 700,
    color: theme.muted,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    borderBottom: `1px solid ${theme.border}`,
    backgroundColor: `${"#020208"}`,
  },
  td: {
    padding: '14px 20px',
    fontSize: 14,
    color: theme.text,
    borderBottom: `1px solid ${theme.border}`,
  },
  rowEven: { backgroundColor: 'transparent' },
  rowOdd: { backgroundColor: `${"#020208"}44` },
  emptyCell: {
    padding: 48,
    textAlign: 'center',
    color: theme.muted,
    fontSize: 14,
  },
  statusBadge: {
    display: 'inline-flex',
    padding: '4px 12px',
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 600,
  },
  errorBanner: {
    backgroundColor: `${theme.danger}22`,
    border: `1px solid ${theme.danger}`,
    borderRadius: 10,
    padding: '12px 20px',
    color: theme.danger,
    fontSize: 14,
    marginBottom: 20,
  },
  btn: {
    padding: '12px 24px',
    borderRadius: 10,
    border: 'none',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
  btnPrimary: { backgroundColor: theme.accent, color: '#ffffff' },
  toastContainer: {
    position: 'fixed',
    top: 24,
    right: 24,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    zIndex: 9999,
  },
  toast: {
    backgroundColor: theme.cards,
    border: `1px solid ${theme.border}`,
    borderLeftWidth: 4,
    borderRadius: 10,
    padding: '12px 16px',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
    animation: 'slideIn 0.3s ease forwards',
    minWidth: 280,
  },
  skeletonLine: { height: 16, borderRadius: 4, backgroundColor: theme.border },
  skeletonRow: {
    display: 'flex',
    gap: 16,
    padding: '14px 20px',
    borderBottom: `1px solid ${theme.border}`,
  },
};

export default BackupsPage;
