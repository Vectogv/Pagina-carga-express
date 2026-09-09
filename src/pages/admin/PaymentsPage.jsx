import { useState, useEffect } from 'react';
import { getPendingPayments, confirmPayment, rejectPayment } from '../../api/admin';
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
  proofLink: {
    color: theme.accent,
    textDecoration: 'underline',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 600,
    background: 'none',
    border: 'none',
    padding: 0,
  },
  proofImage: {
    width: '100%',
    maxHeight: 500,
    objectFit: 'contain',
    borderRadius: 8,
    border: `1px solid ${theme.border}`,
    backgroundColor: theme.bg,
  },
  proofPlaceholder: {
    textAlign: 'center',
    padding: 48,
    color: theme.muted,
    fontSize: 14,
  },
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '10px 0',
    borderBottom: `1px solid ${theme.border}`,
  },
  infoRowLast: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '10px 0',
  },
  infoLabel: {
    fontSize: 13,
    color: theme.muted,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: 600,
    color: theme.text,
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

function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function PaymentsPage() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [confirmAction, setConfirmAction] = useState(null);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const [proofOpen, setProofOpen] = useState(false);
  const [proofPayment, setProofPayment] = useState(null);

  const fetchPayments = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getPendingPayments();
      setPayments(Array.isArray(res.data) ? res.data : (res.data.payments || res.data.data || res.data || []));
    } catch (err) {
      setError(err.response?.data?.message || 'Error al cargar los pagos pendientes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const executePaymentAction = async () => {
    if (!selectedPayment) return;
    const userId = selectedPayment.userId || selectedPayment.id;
    try {
      if (confirmAction === 'confirm') {
        await confirmPayment(userId);
      } else {
        await rejectPayment(userId);
      }
      setPayments((prev) =>
        prev.filter(
          (p) => (p.userId || p.id) !== userId
        )
      );
    } catch (err) {
      alert(err.response?.data?.message || 'Error al procesar el pago');
    }
  };

  const openConfirmDialog = (payment, action) => {
    setSelectedPayment(payment);
    setConfirmAction(action);
    setConfirmOpen(true);
  };

  const openProofModal = (payment) => {
    setProofPayment(payment);
    setProofOpen(true);
  };

  const columns = [
    {
      key: 'userName',
      label: 'Usuario',
      render: (val, row) => (
        <span style={{ fontWeight: 600 }}>{val || row.user || 'Desconocido'}</span>
      ),
    },
    {
      key: 'amount',
      label: 'Monto',
      render: (val) => (
        <span style={{ fontWeight: 700, color: theme.success }}>
          {currencyFormatter.format(val || 0)}
        </span>
      ),
    },
    {
      key: 'paymentMethod',
      label: 'Método de Pago',
      render: (val, row) => val || row.method || row.metodo || 'N/A',
    },
    {
      key: 'proof',
      label: 'Comprobante',
      render: (val, row) => {
        const proofUrl = val || row.proofUrl || row.comprobante || row.receipt;
        if (!proofUrl) return <span style={{ color: theme.muted, fontSize: 13 }}>Sin comprobante</span>;
        return (
          <button
            style={styles.proofLink}
            onClick={(e) => {
              e.stopPropagation();
              openProofModal(row);
            }}
          >
            Ver comprobante
          </button>
        );
      },
    },
    {
      key: 'date',
      label: 'Fecha',
      render: (val, row) => formatDate(val || row.createdAt || row.fecha),
    },
    {
      key: 'actions',
      label: 'Acciones',
      render: (_, row) => (
        <div style={styles.actionsCell}>
          <button
            style={styles.btn(theme.success)}
            onClick={(e) => {
              e.stopPropagation();
              openConfirmDialog(row, 'confirm');
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85'; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
          >
            Confirmar
          </button>
          <button
            style={styles.btn(theme.danger)}
            onClick={(e) => {
              e.stopPropagation();
              openConfirmDialog(row, 'reject');
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85'; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
          >
            Rechazar
          </button>
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.loadingContainer}>Cargando pagos pendientes...</div>
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
            onClick={fetchPayments}
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
        <h1 style={styles.title}>Pagos Pendientes</h1>
        <p style={styles.subtitle}>Revisa y gestiona las solicitudes de pago de los usuarios</p>
      </div>

      <DataTable
        columns={columns}
        data={payments}
        loading={false}
        emptyMessage="No hay pagos pendientes"
      />

      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => {
          setConfirmOpen(false);
          setSelectedPayment(null);
          setConfirmAction(null);
        }}
        onConfirm={executePaymentAction}
        title={confirmAction === 'confirm' ? 'Confirmar Pago' : 'Rechazar Pago'}
        message={
          confirmAction === 'confirm'
            ? `¿Deseas confirmar el pago de ${currencyFormatter.format(selectedPayment?.amount || 0)} de ${selectedPayment?.userName || selectedPayment?.user || ''}?`
            : `¿Deseas rechazar el pago de ${currencyFormatter.format(selectedPayment?.amount || 0)} de ${selectedPayment?.userName || selectedPayment?.user || ''}? Esta acción notificará al usuario.`
        }
        confirmText={confirmAction === 'confirm' ? 'Confirmar' : 'Rechazar'}
        cancelText="Cancelar"
        danger={confirmAction === 'reject'}
      />

      <Modal
        isOpen={proofOpen}
        onClose={() => {
          setProofOpen(false);
          setProofPayment(null);
        }}
        title="Comprobante de Pago"
        size="lg"
      >
        {proofPayment && (
          <div>
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>Usuario</span>
              <span style={styles.infoValue}>{proofPayment.userName || proofPayment.user || 'Desconocido'}</span>
            </div>
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>Monto</span>
              <span style={styles.infoValue}>{currencyFormatter.format(proofPayment.amount || 0)}</span>
            </div>
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>Método de Pago</span>
              <span style={styles.infoValue}>{proofPayment.paymentMethod || proofPayment.method || proofPayment.metodo || 'N/A'}</span>
            </div>
            <div style={styles.infoRowLast}>
              <span style={styles.infoLabel}>Fecha</span>
              <span style={styles.infoValue}>{formatDate(proofPayment.date || proofPayment.createdAt || proofPayment.fecha)}</span>
            </div>
            <div style={{ marginTop: 20 }}>
              {(proofPayment.proof || proofPayment.proofUrl || proofPayment.comprobante || proofPayment.receipt) ? (
                <img
                  src={proofPayment.proof || proofPayment.proofUrl || proofPayment.comprobante || proofPayment.receipt}
                  alt="Comprobante de pago"
                  style={styles.proofImage}
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'block';
                  }}
                />
              ) : null}
              <div style={{ ...styles.proofPlaceholder, display: (proofPayment.proof || proofPayment.proofUrl || proofPayment.comprobante || proofPayment.receipt) ? 'none' : 'block' }}>
                No hay imagen de comprobante disponible
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default PaymentsPage;
