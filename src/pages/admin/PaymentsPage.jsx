import { useState, useEffect, useCallback } from 'react';
import { Check, Clock, ImageOff, RefreshCw, Wallet, X } from 'lucide-react';
import { getPendingPayments, confirmPayment, rejectPayment } from '../../api/admin';
import { resolveStorageUrl } from '../../utils/storage';
import { errorMessage, formatCurrency, formatDateTime, toList } from '../../utils/format';
import {
  PageHeader, DataTable, Modal, ConfirmDialog, StatCard, Button,
} from '../../components/ui';
import './PaymentsPage.css';

const userIdOf = (p) => p?.userId || p?.id;
const userNameOf = (p) => p?.userName || p?.user || 'Desconocido';
const methodOf = (p) => p?.paymentMethod || p?.method || p?.metodo || '—';
const dateOf = (p) => p?.date || p?.createdAt || p?.fecha;
const proofOf = (p) => p?.proof || p?.proofUrl || p?.comprobante || p?.receipt || '';

/** Imagen de comprobante con fallback cuando no carga. */
function ProofImage({ path, className, alt = 'Comprobante de pago' }) {
  const [failed, setFailed] = useState(false);
  if (!path || failed) {
    return (
      <span className={`${className} payments__proof-fallback`}>
        <ImageOff size={16} aria-hidden="true" />
        <span className="sr-only">Comprobante no disponible</span>
      </span>
    );
  }
  return <img src={resolveStorageUrl(path)} alt={alt} className={className} loading="lazy" onError={() => setFailed(true)} />;
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  // { payment, action: 'confirm' | 'reject' }
  const [pending, setPending] = useState(null);
  const [proofPayment, setProofPayment] = useState(null);

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getPendingPayments();
      setPayments(toList(res.data, 'payments'));
    } catch (err) {
      setError(errorMessage(err, 'Error al cargar los pagos pendientes'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const executePaymentAction = async () => {
    if (!pending) return;
    const { payment, action } = pending;
    const userId = userIdOf(payment);
    setNotice(null);
    try {
      if (action === 'confirm') await confirmPayment(userId);
      else await rejectPayment(userId);
      setPayments((prev) => prev.filter((p) => userIdOf(p) !== userId));
      setNotice(`Pago de ${userNameOf(payment)} ${action === 'confirm' ? 'confirmado' : 'rechazado'}.`);
      if (proofPayment && userIdOf(proofPayment) === userId) setProofPayment(null);
    } catch (err) {
      setError(errorMessage(err, 'Error al procesar el pago'));
    }
  };

  const total = payments.reduce((s, p) => s + Number(p.amount || 0), 0);

  const columns = [
    {
      key: 'proof',
      label: 'Comprobante',
      render: (_, row) => (proofOf(row) ? (
        <button
          type="button"
          className="payments__thumb-btn"
          onClick={(e) => { e.stopPropagation(); setProofPayment(row); }}
          aria-label={`Ver comprobante de ${userNameOf(row)}`}
        >
          <ProofImage path={proofOf(row)} className="payments__thumb" />
        </button>
      ) : <span className="text-muted text-sm">Sin comprobante</span>),
    },
    { key: 'userName', label: 'Usuario', render: (_, row) => <span className="text-strong">{userNameOf(row)}</span> },
    {
      key: 'amount',
      label: 'Monto',
      align: 'right',
      render: (v) => <span className="text-success text-strong">{formatCurrency(v)}</span>,
    },
    { key: 'paymentMethod', label: 'Método', render: (_, row) => methodOf(row) },
    { key: 'date', label: 'Fecha', render: (_, row) => <span className="nowrap">{formatDateTime(dateOf(row))}</span> },
    {
      key: 'actions',
      label: '',
      align: 'right',
      render: (_, row) => (
        <div className="row row--end">
          <Button size="sm" variant="soft-success" icon={<Check size={14} />} onClick={(e) => { e.stopPropagation(); setPending({ payment: row, action: 'confirm' }); }}>
            Confirmar
          </Button>
          <Button size="sm" variant="soft-danger" icon={<X size={14} />} onClick={(e) => { e.stopPropagation(); setPending({ payment: row, action: 'reject' }); }}>
            Rechazar
          </Button>
        </div>
      ),
    },
  ];

  const isConfirm = pending?.action === 'confirm';
  const pendingDesc = pending ? `${formatCurrency(pending.payment.amount)} de ${userNameOf(pending.payment)}` : '';

  return (
    <div className="page">
      <PageHeader
        title="Pagos pendientes"
        description="Revisa los comprobantes enviados por los usuarios y confirma o rechaza cada pago."
        actions={(
          <Button variant="secondary" icon={<RefreshCw size={14} />} onClick={fetchPayments} loading={loading}>
            Actualizar
          </Button>
        )}
      />

      <div className="stats-grid">
        <StatCard title="Pagos por revisar" value={loading ? '—' : payments.length} icon={<Clock size={16} />} color="var(--warning)" />
        <StatCard title="Monto pendiente" value={loading ? '—' : formatCurrency(total)} icon={<Wallet size={16} />} color="var(--success)" />
      </div>

      {error && (
        <div className="page-error" role="alert">
          <span>{error}</span>
          <Button size="sm" variant="ghost" onClick={fetchPayments}>Reintentar</Button>
        </div>
      )}
      {notice && <div className="payments__notice" role="status">{notice}</div>}

      <DataTable
        columns={columns}
        data={payments}
        loading={loading}
        rowKey={(row, i) => userIdOf(row) ?? i}
        onRowClick={setProofPayment}
        emptyMessage="No hay pagos pendientes"
        emptyDescription="Los comprobantes enviados por los usuarios aparecerán aquí."
      />

      <ConfirmDialog
        isOpen={!!pending}
        onClose={() => setPending(null)}
        onConfirm={executePaymentAction}
        title={isConfirm ? 'Confirmar pago' : 'Rechazar pago'}
        message={isConfirm
          ? `¿Confirmar el pago de ${pendingDesc}?`
          : `¿Rechazar el pago de ${pendingDesc}? Esta acción notificará al usuario.`}
        confirmText={isConfirm ? 'Confirmar' : 'Rechazar'}
        danger={!isConfirm}
      />

      <Modal
        isOpen={!!proofPayment}
        onClose={() => setProofPayment(null)}
        title="Comprobante de pago"
        size="lg"
        footer={proofPayment && (
          <>
            <Button variant="soft-danger" icon={<X size={14} />} onClick={() => setPending({ payment: proofPayment, action: 'reject' })}>
              Rechazar
            </Button>
            <Button variant="success" icon={<Check size={14} />} onClick={() => setPending({ payment: proofPayment, action: 'confirm' })}>
              Confirmar
            </Button>
          </>
        )}
      >
        {proofPayment && (
          <div className="stack">
            <dl className="detail-list">
              <div className="detail-list__item">
                <dt className="detail-list__label">Usuario</dt>
                <dd className="detail-list__value">{userNameOf(proofPayment)}</dd>
              </div>
              <div className="detail-list__item">
                <dt className="detail-list__label">Monto</dt>
                <dd className="detail-list__value text-success text-strong">{formatCurrency(proofPayment.amount)}</dd>
              </div>
              <div className="detail-list__item">
                <dt className="detail-list__label">Método de pago</dt>
                <dd className="detail-list__value">{methodOf(proofPayment)}</dd>
              </div>
              <div className="detail-list__item">
                <dt className="detail-list__label">Fecha</dt>
                <dd className="detail-list__value">{formatDateTime(dateOf(proofPayment))}</dd>
              </div>
            </dl>
            {proofOf(proofPayment) ? (
              <a href={resolveStorageUrl(proofOf(proofPayment))} target="_blank" rel="noreferrer" className="payments__proof-link">
                <ProofImage key={proofOf(proofPayment)} path={proofOf(proofPayment)} className="payments__proof" />
              </a>
            ) : (
              <p className="payments__proof-empty">No hay imagen de comprobante disponible.</p>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
