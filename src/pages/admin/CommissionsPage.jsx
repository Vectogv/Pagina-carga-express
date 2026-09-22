import { useState, useEffect, useCallback } from 'react';
import { CircleCheck, Clock, History, RefreshCw, Users } from 'lucide-react';
import { getCommissions, markCommissionPaid, getCommissionHistory } from '../../api/admin';
import { errorMessage, formatCurrency, formatDate, toList } from '../../utils/format';
import {
  PageHeader, DataTable, Modal, ConfirmDialog, StatCard, StatusBadge, Button, LoadingState,
} from '../../components/ui';
import './CommissionsPage.css';

const keyOf = (c) => c?.conductorId || c?.id;
const nameOf = (c) => c?.conductorName || c?.conductor || 'Desconocido';
const isPaid = (c) => {
  const s = c?.status || c?.estado;
  return s === 'paid' || s === 'pagado';
};
const amountOf = (c) => c?.commission || c?.platformFee || 0;

export default function CommissionsPage() {
  const [commissions, setCommissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  const [selected, setSelected] = useState(null);

  const [historyConductor, setHistoryConductor] = useState(null);
  const [historyData, setHistoryData] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState(null);

  const fetchCommissions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getCommissions();
      setCommissions(toList(res.data, 'commissions'));
    } catch (err) {
      setError(errorMessage(err, 'Error al cargar las comisiones'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCommissions();
  }, [fetchCommissions]);

  const handleMarkPaid = async () => {
    if (!selected) return;
    const id = keyOf(selected);
    setNotice(null);
    try {
      await markCommissionPaid(id);
      setCommissions((prev) => prev.map((c) => (keyOf(c) === id ? { ...c, status: 'paid', estado: 'pagado' } : c)));
      setNotice(`Comisión de ${nameOf(selected)} marcada como pagada.`);
    } catch (err) {
      setError(errorMessage(err, 'Error al marcar como pagado'));
    }
  };

  const handleViewHistory = async (commission) => {
    setHistoryConductor(commission);
    setHistoryLoading(true);
    setHistoryError(null);
    setHistoryData([]);
    try {
      const res = await getCommissionHistory(keyOf(commission));
      setHistoryData(toList(res.data, 'history', 'historial'));
    } catch (err) {
      setHistoryError(errorMessage(err, 'No se pudo cargar el historial'));
    } finally {
      setHistoryLoading(false);
    }
  };

  const closeHistory = () => {
    setHistoryConductor(null);
    setHistoryData([]);
  };

  const pending = commissions.filter((c) => !isPaid(c));
  const pendingTotal = pending.reduce((s, c) => s + Number(amountOf(c) || 0), 0);
  const paidTotal = commissions.filter(isPaid).reduce((s, c) => s + Number(amountOf(c) || 0), 0);

  const columns = [
    { key: 'conductorName', label: 'Conductor', render: (_, row) => <span className="text-strong">{nameOf(row)}</span> },
    { key: 'totalAmount', label: 'Monto total', align: 'right', render: (v) => formatCurrency(v) },
    {
      key: 'commission',
      label: 'Comisión',
      align: 'right',
      render: (_, row) => <span className="text-warning text-strong">{formatCurrency(amountOf(row))}</span>,
    },
    {
      key: 'status',
      label: 'Estado',
      render: (_, row) => <StatusBadge status={isPaid(row) ? 'pagado' : 'pendiente'} />,
    },
    {
      key: 'actions',
      label: '',
      align: 'right',
      render: (_, row) => (
        <div className="row row--end">
          {!isPaid(row) && (
            <Button size="sm" variant="soft-success" icon={<CircleCheck size={14} />} onClick={() => setSelected(row)}>
              Marcar pagado
            </Button>
          )}
          <Button size="sm" variant="ghost" icon={<History size={14} />} onClick={() => handleViewHistory(row)}>
            Historial
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="page">
      <PageHeader
        title="Comisiones"
        description="Seguimiento de las comisiones que cada conductor debe a la plataforma."
        actions={(
          <Button variant="secondary" icon={<RefreshCw size={14} />} onClick={fetchCommissions} loading={loading}>
            Actualizar
          </Button>
        )}
      />

      <div className="stats-grid">
        <StatCard title="Pendiente por cobrar" value={loading ? '—' : formatCurrency(pendingTotal)} icon={<Clock size={16} />} color="var(--warning)" />
        <StatCard title="Cobrado" value={loading ? '—' : formatCurrency(paidTotal)} icon={<CircleCheck size={16} />} color="var(--success)" />
        <StatCard title="Conductores con deuda" value={loading ? '—' : pending.length} icon={<Users size={16} />} color="var(--primary)" />
      </div>

      {error && (
        <div className="page-error" role="alert">
          <span>{error}</span>
          <Button size="sm" variant="ghost" onClick={fetchCommissions}>Reintentar</Button>
        </div>
      )}
      {notice && <div className="commissions__notice" role="status">{notice}</div>}

      <DataTable
        columns={columns}
        data={commissions}
        loading={loading}
        rowKey={(row, i) => keyOf(row) ?? i}
        emptyMessage="No hay comisiones registradas"
      />

      <ConfirmDialog
        isOpen={!!selected}
        onClose={() => setSelected(null)}
        onConfirm={handleMarkPaid}
        title="Marcar como pagado"
        message={`¿Marcar la comisión de ${nameOf(selected)} (${formatCurrency(amountOf(selected))}) como pagada? Esta acción no se puede deshacer.`}
        confirmText="Marcar pagado"
      />

      <Modal
        isOpen={!!historyConductor}
        onClose={closeHistory}
        title="Historial de comisiones"
        description={historyConductor ? `Conductor: ${nameOf(historyConductor)}` : undefined}
        size="md"
      >
        {historyLoading && <LoadingState message="Cargando historial..." />}
        {!historyLoading && historyError && <div className="page-error" role="alert">{historyError}</div>}
        {!historyLoading && !historyError && historyData.length === 0 && (
          <p className="text-muted commissions__empty">Este conductor no tiene historial de comisiones.</p>
        )}
        {!historyLoading && historyData.length > 0 && (
          <ul className="commissions__history">
            {historyData.map((entry, idx) => (
              <li key={entry.id || idx} className="commissions__history-item">
                <div className="commissions__history-text">
                  <span className="text-sm text-muted">
                    {entry.period || (entry.date ? formatDate(entry.date) : `Período ${idx + 1}`)}
                  </span>
                  <span className="text-strong">{formatCurrency(entry.amount || entry.commission || 0)}</span>
                </div>
                <StatusBadge status={isPaid(entry) ? 'pagado' : 'pendiente'} />
              </li>
            ))}
          </ul>
        )}
      </Modal>
    </div>
  );
}
