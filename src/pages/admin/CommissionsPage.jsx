import { useState, useEffect } from 'react';
import { getCommissions, markCommissionPaid, getCommissionHistory } from '../../api/admin';
import DataTable from '../../components/admin/DataTable';
import Modal from '../../components/admin/Modal';
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
  page: {
    padding: 32,
    minHeight: '100vh',
    backgroundColor: theme.bg,
    color: theme.text,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 800,
    color: theme.text,
    margin: 0,
  },
  subtitle: {
    fontSize: 14,
    color: theme.muted,
    marginTop: 6,
  },
  statusBadge: (color) => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '4px 12px',
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 600,
    backgroundColor: `${color}20`,
    color,
  }),
  dot: (color) => ({
    width: 7,
    height: 7,
    borderRadius: '50%',
    backgroundColor: color,
  }),
  actionsCell: {
    display: 'flex',
    gap: 8,
  },
  btn: (bgColor) => ({
    padding: '6px 14px',
    borderRadius: 6,
    border: 'none',
    backgroundColor: bgColor,
    color: '#fff',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'opacity 0.15s ease',
    whiteSpace: 'nowrap',
  }),
  historyItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 0',
    borderBottom: `1px solid ${theme.border}`,
  },
  historyLast: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 0',
  },
  historyLabel: {
    fontSize: 13,
    color: theme.muted,
  },
  historyValue: {
    fontSize: 14,
    fontWeight: 600,
    color: theme.text,
  },
  conductorName: {
    fontSize: 14,
    fontWeight: 700,
    color: theme.text,
    marginBottom: 20,
  },
  emptyHistory: {
    textAlign: 'center',
    padding: 32,
    color: theme.muted,
    fontSize: 14,
  },
  errorContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 60,
    textAlign: 'center',
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorMessage: {
    fontSize: 16,
    color: theme.danger,
    marginBottom: 20,
  },
  retryBtn: {
    padding: '10px 24px',
    borderRadius: 8,
    border: 'none',
    backgroundColor: theme.accent,
    color: '#fff',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
  loadingContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 80,
    color: theme.muted,
    fontSize: 15,
  },
};

const currencyFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  minimumFractionDigits: 0,
});

function CommissionsPage() {
  const [commissions, setCommissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selectedCommission, setSelectedCommission] = useState(null);

  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyData, setHistoryData] = useState([]);
  const [historyConductor, setHistoryConductor] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  const fetchCommissions = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getCommissions();
      setCommissions(Array.isArray(res.data) ? res.data : (res.data.commissions || res.data.data || res.data || []));
    } catch (err) {
      setError(err.response?.data?.message || 'Error al cargar las comisiones');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCommissions();
  }, []);

  const handleMarkPaid = async () => {
    if (!selectedCommission) return;
    try {
      await markCommissionPaid(selectedCommission.conductorId || selectedCommission.id);
      setCommissions((prev) =>
        prev.map((c) =>
          (c.conductorId || c.id) === (selectedCommission.conductorId || selectedCommission.id)
            ? { ...c, status: 'paid', estado: 'pagado' }
            : c
        )
      );
    } catch (err) {
      alert(err.response?.data?.message || 'Error al marcar como pagado');
    }
  };

  const handleViewHistory = async (commission) => {
    setHistoryConductor(commission);
    setHistoryOpen(true);
    setHistoryLoading(true);
    setHistoryData([]);
    try {
      const res = await getCommissionHistory(commission.conductorId || commission.id);
      setHistoryData(res.data);
    } catch {
      setHistoryData([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const columns = [
    {
      key: 'conductorName',
      label: 'Conductor',
      render: (val, row) => (
        <span style={{ fontWeight: 600 }}>{val || row.conductor || 'Desconocido'}</span>
      ),
    },
    {
      key: 'totalAmount',
      label: 'Monto Total',
      render: (val) => currencyFormatter.format(val || 0),
    },
    {
      key: 'commission',
      label: 'Comisión',
      render: (val, row) => (
        <span style={{ color: theme.warning, fontWeight: 700 }}>
          {currencyFormatter.format(val || row.platformFee || 0)}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Estado',
      render: (val, row) => {
        const status = val || row.estado || 'pending';
        const isPaid = status === 'paid' || status === 'pagado';
        const color = isPaid ? theme.success : theme.warning;
        const label = isPaid ? 'Pagado' : 'Pendiente';
        return (
          <span style={styles.statusBadge(color)}>
            <span style={styles.dot(color)} />
            {label}
          </span>
        );
      },
    },
    {
      key: 'actions',
      label: 'Acciones',
      render: (_, row) => {
        const status = row.status || row.estado || 'pending';
        const isPaid = status === 'paid' || status === 'pagado';
        return (
          <div style={styles.actionsCell}>
            {!isPaid && (
              <button
                style={styles.btn(theme.success)}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedCommission(row);
                  setConfirmOpen(true);
                }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85'; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
              >
                Marcar como Pagado
              </button>
            )}
            <button
              style={styles.btn(theme.accent)}
              onClick={(e) => {
                e.stopPropagation();
                handleViewHistory(row);
              }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85'; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
            >
              Ver Historial
            </button>
          </div>
        );
      },
    },
  ];

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.loadingContainer}>Cargando comisiones...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.page}>
        <div style={styles.errorContainer}>
          <div style={styles.errorIcon}>⚠️</div>
          <p style={styles.errorMessage}>{error}</p>
          <button
            style={styles.retryBtn}
            onClick={fetchCommissions}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85'; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.title}>Comisiones</h1>
        <p style={styles.subtitle}>Gestión y seguimiento de comisiones por conductor</p>
      </div>

      <DataTable
        columns={columns}
        data={commissions}
        loading={false}
        emptyMessage="No hay comisiones registradas"
      />

      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => {
          setConfirmOpen(false);
          setSelectedCommission(null);
        }}
        onConfirm={handleMarkPaid}
        title="Marcar como Pagado"
        message={`¿Deseas marcar la comisión de ${selectedCommission?.conductorName || selectedCommission?.conductor || ''} como pagada? Esta acción no se puede deshacer.`}
        confirmText="Marcar Pagado"
        cancelText="Cancelar"
      />

      <Modal
        isOpen={historyOpen}
        onClose={() => {
          setHistoryOpen(false);
          setHistoryConductor(null);
          setHistoryData([]);
        }}
        title="Historial de Comisiones"
        size="md"
      >
        {historyConductor && (
          <div>
            <p style={styles.conductorName}>
              Conductor: {historyConductor.conductorName || historyConductor.conductor || 'Desconocido'}
            </p>
            {historyLoading ? (
              <div style={styles.emptyHistory}>Cargando historial...</div>
            ) : historyData.length === 0 ? (
              <div style={styles.emptyHistory}>No hay historial de comisiones para este conductor</div>
            ) : (
              <div>
                {historyData.map((entry, idx) => (
                  <div
                    key={entry.id || idx}
                    style={idx === historyData.length - 1 ? styles.historyLast : styles.historyItem}
                  >
                    <div>
                      <div style={styles.historyLabel}>{entry.period || entry.date || `Período ${idx + 1}`}</div>
                      <div style={{ ...styles.historyValue, marginTop: 4 }}>
                        {currencyFormatter.format(entry.amount || entry.commission || 0)}
                      </div>
                    </div>
                    <span
                      style={styles.statusBadge(
                        (entry.status === 'paid' || entry.estado === 'pagado') ? theme.success : theme.warning
                      )}
                    >
                      <span
                        style={styles.dot(
                          (entry.status === 'paid' || entry.estado === 'pagado') ? theme.success : theme.warning
                        )}
                      />
                      {(entry.status === 'paid' || entry.estado === 'pagado') ? 'Pagado' : 'Pendiente'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

export default CommissionsPage;
