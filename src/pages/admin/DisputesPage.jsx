import { useState, useEffect, useMemo, useCallback } from 'react';
import { Eye, Gavel } from 'lucide-react';
import { getDisputes, resolveDispute } from '../../api/admin';
import { errorMessage, formatDate, toList } from '../../utils/format';
import { PageHeader, SegmentedFilter, DataTable, Button } from '../../components/ui';
import { DisputeTypeBadge, DisputeStatusBadge } from './disputes/DisputeParts';
import DisputeDetailModal from './disputes/DisputeDetailModal';
import ResolveDisputeModal from './disputes/ResolveDisputeModal';
import { shortId, claimantName, tripRef } from './disputes/disputeUtils';
import './disputes/DisputesPage.css';

export default function DisputesPage() {
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [detail, setDetail] = useState(null);
  const [resolving, setResolving] = useState(null);

  const fetchDisputes = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getDisputes();
      setDisputes(toList(res.data));
    } catch (err) {
      setError(errorMessage(err, 'Error al cargar las disputas'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDisputes();
  }, [fetchDisputes]);

  const filtered = useMemo(
    () => (filter === 'all' ? disputes : disputes.filter((d) => d.status === filter)),
    [disputes, filter],
  );

  const filterOptions = useMemo(() => [
    { value: 'all', label: 'Todas', count: disputes.length },
    { value: 'pending', label: 'Pendientes', count: disputes.filter((d) => d.status === 'pending').length },
    { value: 'resolved', label: 'Resueltas', count: disputes.filter((d) => d.status === 'resolved').length },
  ], [disputes]);

  // Lanza el error para que el modal de resolución lo muestre y permanezca abierto.
  const handleResolve = async (payload) => {
    await resolveDispute(resolving.id || resolving._id, payload);
    setResolving(null);
    await fetchDisputes();
  };

  const columns = [
    { key: 'id', label: 'ID', render: (val) => <span className="text-mono text-muted">#{shortId(val)}</span> },
    { key: 'tripId', label: 'Viaje', render: (_, row) => <span className="text-mono text-strong">{tripRef(row)}</span> },
    { key: 'claimant', label: 'Reclamante', render: (_, row) => claimantName(row) },
    { key: 'type', label: 'Tipo', render: (val) => <DisputeTypeBadge type={val} /> },
    { key: 'status', label: 'Estado', render: (val) => <DisputeStatusBadge status={val} /> },
    { key: 'createdAt', label: 'Fecha', render: (val) => <span className="text-muted nowrap">{formatDate(val)}</span> },
    {
      key: 'acciones',
      label: '',
      align: 'right',
      render: (_, row) => (
        <div className="row row--end" style={{ flexWrap: 'nowrap' }}>
          <Button size="sm" variant="ghost" icon={<Eye size={14} />} onClick={(e) => { e.stopPropagation(); setDetail(row); }}>
            Ver
          </Button>
          {row.status !== 'resolved' && (
            <Button size="sm" variant="soft-primary" icon={<Gavel size={14} />} onClick={(e) => { e.stopPropagation(); setResolving(row); }}>
              Resolver
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="page">
      <PageHeader title="Disputas" description="Conflictos entre conductores y clientes pendientes de decisión." />

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
        onRowClick={setDetail}
        emptyMessage="No hay disputas para mostrar"
      />

      <DisputeDetailModal dispute={detail} onClose={() => setDetail(null)} />

      <ResolveDisputeModal
        key={resolving ? (resolving.id || resolving._id) : 'none'}
        dispute={resolving}
        onClose={() => setResolving(null)}
        onSubmit={handleResolve}
      />
    </div>
  );
}
