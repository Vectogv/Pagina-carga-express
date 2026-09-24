import { useState, useEffect, useMemo, useCallback } from 'react';
import { Eye, Gavel, X } from 'lucide-react';
import { getDisputes, resolveDispute } from '../../api/admin';
import { errorMessage, formatDate, formatCurrency, toList } from '../../utils/format';
import { PageHeader, SegmentedFilter, DataTable, Button, StatusBadge } from '../../components/ui';
import DisputeDetailModal from './disputes/DisputeDetailModal';
import ResolveDisputeModal from './disputes/ResolveDisputeModal';
import { reasonText, tripRef, money, ESTADO_LABELS } from './disputes/disputeUtils';
import './disputes/DisputesPage.css';

export default function DisputesPage() {
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [detail, setDetail] = useState(null);
  const [resolving, setResolving] = useState(null);
  const [notice, setNotice] = useState(null);

  const fetchDisputes = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      // El backend nunca pagina más de 100 por página (ver admin_controller.ts#disputes).
      const res = await getDisputes({ limit: 100 });
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
    () => (filter === 'all' ? disputes : disputes.filter((d) => d.estado === filter)),
    [disputes, filter],
  );

  // Opciones a partir de los estados que realmente trae la respuesta: el endpoint
  // GET /api/admin/disputes solo devuelve disputas 'abierta'/'en_revision' (las
  // 'resuelta' se excluyen a propósito en el backend), así que el filtro se arma
  // con lo que en verdad puede aparecer en vez de valores inventados.
  const filterOptions = useMemo(() => {
    const estadosPresentes = [...new Set(disputes.map((d) => d.estado))];
    const orden = ['abierta', 'en_revision', 'resuelta'];
    const estados = orden.filter((e) => estadosPresentes.includes(e));
    return [
      { value: 'all', label: 'Todas', count: disputes.length },
      ...estados.map((e) => ({
        value: e,
        label: ESTADO_LABELS[e] || e,
        count: disputes.filter((d) => d.estado === e).length,
      })),
    ];
  }, [disputes]);

  // Lanza el error para que el modal de resolución lo muestre y permanezca abierto.
  const handleResolve = async (payload) => {
    const id = resolving.id;
    const res = await resolveDispute(id, payload);
    setResolving(null);
    // El viaje ya no aparece en el listado tras resolverse (el backend solo lista
    // disputas abiertas/en revisión), así que la confirmación se muestra aparte.
    setNotice({
      id,
      resultado: res.data?.resultado || payload.resultado,
      viajeEstado: res.data?.viajeEstado,
    });
    await fetchDisputes();
  };

  const columns = [
    { key: 'id', label: 'Disputa', render: (val) => <span className="text-mono text-muted">#{val}</span> },
    { key: 'viajeId', label: 'Viaje', render: (_, row) => <span className="text-mono text-strong">{tripRef(row)}</span> },
    { key: 'createdAt', label: 'Fecha', render: (val) => <span className="text-muted nowrap">{formatDate(val)}</span> },
    { key: 'cliente', label: 'Cliente', render: (val) => val?.nombre || '—' },
    { key: 'conductor', label: 'Conductor', render: (val) => val?.nombre || '—' },
    { key: 'monto', label: 'Monto', render: (_, row) => (money(row) != null ? formatCurrency(money(row)) : '—') },
    {
      key: 'motivo',
      label: 'Motivo',
      render: (_, row) => <span className="dispute-reason-preview">{reasonText(row)}</span>,
    },
    { key: 'estado', label: 'Estado', render: (val) => <StatusBadge status={val} /> },
    {
      key: 'acciones',
      label: '',
      align: 'right',
      render: (_, row) => (
        <div className="row row--end" style={{ flexWrap: 'nowrap' }}>
          <Button size="sm" variant="ghost" icon={<Eye size={14} />} onClick={(e) => { e.stopPropagation(); setDetail(row); }}>
            Ver
          </Button>
          {row.estado !== 'resuelta' && (
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

      {notice && (
        <div className="page-notice" role="status">
          <span>
            Disputa #{notice.id} resuelta {notice.resultado === 'favor_conductor' ? 'a favor del conductor' : 'a favor del cliente'}.
            {notice.viajeEstado && ` El viaje quedó en estado "${notice.viajeEstado}".`}
          </span>
          <Button size="icon" variant="ghost" onClick={() => setNotice(null)} aria-label="Cerrar aviso">
            <X size={15} />
          </Button>
        </div>
      )}

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
        key={resolving ? resolving.id : 'none'}
        dispute={resolving}
        onClose={() => setResolving(null)}
        onSubmit={handleResolve}
      />
    </div>
  );
}
