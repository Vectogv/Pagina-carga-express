import { useState, useEffect, useMemo, useCallback } from 'react';
import { Check, X } from 'lucide-react';
import { getCancellationRequests, approveCancellation, rejectCancellation } from '../../api/admin';
import { errorMessage, formatDate, toList } from '../../utils/format';
import {
  PageHeader, SegmentedFilter, DataTable, ConfirmDialog, StatusBadge, Button,
} from '../../components/ui';

// Estados del backend (inglés) → claves del mapa de StatusBadge.
const STATUS_KEYS = { pending: 'pendiente', approved: 'aprobada', rejected: 'rechazada' };

const shortId = (id) => String(id ?? '').slice(0, 8);

export default function CancellationRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [confirmAction, setConfirmAction] = useState(null);

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getCancellationRequests();
      setRequests(toList(res.data));
    } catch (err) {
      setError(errorMessage(err, 'Error al cargar las solicitudes de cancelación'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const filtered = useMemo(
    () => (filter === 'all' ? requests : requests.filter((r) => r.status === filter)),
    [requests, filter],
  );

  const filterOptions = useMemo(() => [
    { value: 'all', label: 'Todas', count: requests.length },
    { value: 'pending', label: 'Pendientes', count: requests.filter((r) => r.status === 'pending').length },
    { value: 'approved', label: 'Aprobadas', count: requests.filter((r) => r.status === 'approved').length },
    { value: 'rejected', label: 'Rechazadas', count: requests.filter((r) => r.status === 'rejected').length },
  ], [requests]);

  const isApprove = confirmAction?.action === 'approve';

  const handleConfirm = async () => {
    if (!confirmAction) return;
    try {
      if (isApprove) await approveCancellation(confirmAction.row.id);
      else await rejectCancellation(confirmAction.row.id);
      await fetchRequests();
    } catch (err) {
      setError(errorMessage(err, `Error al ${isApprove ? 'aprobar' : 'rechazar'} la solicitud`));
    }
  };

  const columns = [
    { key: 'id', label: 'ID', render: (val) => <span className="text-mono text-muted">#{shortId(val)}</span> },
    {
      key: 'tripId',
      label: 'Viaje',
      render: (val, row) => {
        const id = val || row.trip?.id;
        return id ? <span className="text-mono text-strong">#{shortId(id)}</span> : '—';
      },
    },
    { key: 'requester', label: 'Solicitante', render: (val, row) => val || row.requester?.name || row.user?.name || '—' },
    {
      key: 'reason',
      label: 'Motivo',
      render: (val) => <span className="truncate" style={{ display: 'inline-block', maxWidth: 240 }} title={val || ''}>{val || '—'}</span>,
    },
    { key: 'status', label: 'Estado', render: (val) => <StatusBadge status={STATUS_KEYS[val] || val} /> },
    { key: 'createdAt', label: 'Fecha', render: (val) => <span className="text-muted nowrap">{formatDate(val)}</span> },
    {
      key: 'acciones',
      label: '',
      align: 'right',
      render: (_, row) => row.status === 'pending' && (
        <div className="row row--end" style={{ flexWrap: 'nowrap' }}>
          <Button size="sm" variant="soft-success" icon={<Check size={14} />} onClick={() => setConfirmAction({ row, action: 'approve' })}>
            Aprobar
          </Button>
          <Button size="sm" variant="soft-danger" icon={<X size={14} />} onClick={() => setConfirmAction({ row, action: 'reject' })}>
            Rechazar
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="page">
      <PageHeader title="Solicitudes de cancelación" description="Revisa y decide sobre las solicitudes de cancelación de viajes." />

      <div className="toolbar">
        <SegmentedFilter options={filterOptions} value={filter} onChange={setFilter} ariaLabel="Filtrar por estado" />
      </div>

      {error && (
        <div className="page-error" role="alert">
          <span>{error}</span>
          <Button size="sm" variant="ghost" onClick={() => setError(null)}>Cerrar</Button>
        </div>
      )}

      <DataTable
        columns={columns}
        data={filtered}
        loading={loading}
        emptyMessage="No hay solicitudes de cancelación para mostrar"
      />

      <ConfirmDialog
        isOpen={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleConfirm}
        title={isApprove ? 'Aprobar cancelación' : 'Rechazar cancelación'}
        message={`¿Deseas ${isApprove ? 'aprobar' : 'rechazar'} la solicitud de cancelación #${confirmAction ? shortId(confirmAction.row.id) : ''}?`}
        confirmText={isApprove ? 'Aprobar' : 'Rechazar'}
        danger={!isApprove}
      />
    </div>
  );
}
