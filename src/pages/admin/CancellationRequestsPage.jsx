import { useState, useEffect, useMemo, useCallback } from 'react';
import { Check, X } from 'lucide-react';
import { getCancellationRequests, approveCancellation, rejectCancellation } from '../../api/admin';
import { errorMessage, formatDate, toList } from '../../utils/format';
import {
  PageHeader, SegmentedFilter, DataTable, ConfirmDialog, StatusBadge, Button,
} from '../../components/ui';

const shortId = (id) => String(id ?? '').slice(0, 8);

// GET /api/admin/cancellation-requests (admin_controller.ts#cancellationRequests)
// solo devuelve solicitudes con estado 'pendiente'; una vez aprobada/rechazada
// deja de aparecer en el listado. Por eso las procesadas en esta sesión se
// guardan aparte para poder seguir viéndolas en los filtros correspondientes.
export default function CancellationRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [resolvedHere, setResolvedHere] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [confirmAction, setConfirmAction] = useState(null);

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getCancellationRequests({ page: 1, limit: 100 });
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

  const all = useMemo(() => [...requests, ...resolvedHere], [requests, resolvedHere]);

  const filtered = useMemo(
    () => (filter === 'all' ? all : all.filter((r) => r.estado === filter)),
    [all, filter],
  );

  const filterOptions = useMemo(() => [
    { value: 'all', label: 'Todas', count: all.length },
    { value: 'pendiente', label: 'Pendientes', count: all.filter((r) => r.estado === 'pendiente').length },
    { value: 'aprobado', label: 'Aprobadas', count: all.filter((r) => r.estado === 'aprobado').length },
    { value: 'rechazado', label: 'Rechazadas', count: all.filter((r) => r.estado === 'rechazado').length },
  ], [all]);

  const isApprove = confirmAction?.action === 'approve';

  const handleConfirm = async () => {
    if (!confirmAction) return;
    const { row } = confirmAction;
    try {
      if (isApprove) await approveCancellation(row.id);
      else await rejectCancellation(row.id);
      setResolvedHere((prev) => [{ ...row, estado: isApprove ? 'aprobado' : 'rechazado' }, ...prev]);
      setConfirmAction(null);
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
      render: (val, row) => (
        <div className="cell-user__text">
          <span className="text-mono text-strong">#{shortId(val)}</span>
          <span className="cell-user__meta truncate">{row.origenDireccion || '—'} → {row.destinoDireccion || '—'}</span>
        </div>
      ),
    },
    {
      key: 'conductor',
      label: 'Conductor',
      render: (val) => (val?.nombre || val?.placa)
        ? <span>{val.nombre || '—'}{val.placa ? ` · ${val.placa}` : ''}</span>
        : '—',
    },
    {
      key: 'motivo',
      label: 'Motivo',
      render: (val) => <span className="truncate" style={{ display: 'inline-block', maxWidth: 240 }} title={val || ''}>{val || '—'}</span>,
    },
    { key: 'estado', label: 'Estado', render: (val) => <StatusBadge status={val} /> },
    { key: 'createdAt', label: 'Fecha', render: (val) => <span className="text-muted nowrap">{formatDate(val)}</span> },
    {
      key: 'acciones',
      label: '',
      align: 'right',
      render: (_, row) => row.estado === 'pendiente' && (
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
