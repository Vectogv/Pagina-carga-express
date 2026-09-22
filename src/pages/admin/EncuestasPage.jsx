import { useState, useEffect, useMemo, useCallback } from 'react';
import { Check, X } from 'lucide-react';
import { getAdminEncuestas, approveEncuesta } from '../../api/admin';
import { errorMessage, formatDate, toList } from '../../utils/format';
import {
  PageHeader, SegmentedFilter, DataTable, ConfirmDialog, StatusBadge, Button, Pagination,
} from '../../components/ui';

const PAGE_SIZE = 50;

// El backend responde 'aprobada' | 'pendiente' (antes 'approved' | 'pending'); se normaliza.
const statusOf = (e) => (e.status === 'approved' || e.status === 'aprobada' ? 'approved' : 'pending');
const titleOf = (row) => row?.title || row?.titulo || '';

function EncuestasPage() {
  const [encuestas, setEncuestas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [confirmAction, setConfirmAction] = useState(null);

  const fetchEncuestas = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getAdminEncuestas({ page, limit: PAGE_SIZE });
      setEncuestas(toList(res.data, 'encuestas'));
    } catch (err) {
      setError(errorMessage(err, 'Error al cargar las encuestas'));
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchEncuestas();
  }, [fetchEncuestas]);

  const filtered = useMemo(() => {
    if (filter === 'all') return encuestas;
    return encuestas.filter((e) => statusOf(e) === filter);
  }, [encuestas, filter]);

  const counts = useMemo(() => ({
    all: encuestas.length,
    pending: encuestas.filter((e) => statusOf(e) === 'pending').length,
    approved: encuestas.filter((e) => statusOf(e) === 'approved').length,
  }), [encuestas]);

  const handleApprove = async () => {
    if (!confirmAction) return;
    try {
      await approveEncuesta(confirmAction.id);
      await fetchEncuestas();
    } catch (err) {
      setError(errorMessage(err, 'Error al aprobar encuesta'));
    }
  };

  const hasMore = encuestas.length === PAGE_SIZE;

  const columns = [
    {
      key: 'title',
      label: 'Pregunta',
      render: (val, row) => <span className="text-strong">{val || row.titulo || '—'}</span>,
    },
    {
      key: 'author',
      label: 'Creador',
      render: (val, row) => val || row.creator || row.creador || row.reporter?.name || '—',
    },
    {
      key: 'status',
      label: 'Estado',
      render: (_, row) => <StatusBadge status={statusOf(row) === 'approved' ? 'aprobada' : 'pendiente'} />,
    },
    {
      key: 'date',
      label: 'Fecha',
      render: (val, row) => <span className="nowrap">{formatDate(val || row.createdAt)}</span>,
    },
    {
      key: 'acciones',
      label: '',
      align: 'right',
      render: (_, row) => (statusOf(row) === 'approved' ? null : (
        <div className="row row--end">
          <Button size="sm" variant="soft-success" icon={<Check size={14} />} onClick={() => setConfirmAction(row)}>
            Aprobar
          </Button>
        </div>
      )),
    },
  ];

  return (
    <div className="page">
      <PageHeader title="Encuestas" description="Revisa y aprueba las encuestas creadas por los moderadores." />

      <div className="toolbar">
        <SegmentedFilter
          ariaLabel="Filtrar por estado"
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: 'Todas', count: counts.all },
            { value: 'pending', label: 'Pendientes', count: counts.pending },
            { value: 'approved', label: 'Aprobadas', count: counts.approved },
          ]}
        />
      </div>

      {error && (
        <div className="page-error" role="alert">
          <span>{error}</span>
          <Button size="icon" variant="ghost" onClick={() => setError(null)} aria-label="Cerrar mensaje">
            <X size={14} />
          </Button>
        </div>
      )}

      <DataTable
        columns={columns}
        data={filtered}
        loading={loading}
        emptyMessage="No hay encuestas para mostrar"
        footer={(page > 1 || hasMore) && (
          <Pagination page={page} totalPages={hasMore ? page + 1 : page} onChange={setPage} />
        )}
      />

      <ConfirmDialog
        isOpen={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleApprove}
        title="Aprobar encuesta"
        message={`¿Deseas aprobar la encuesta “${titleOf(confirmAction)}”?`}
        confirmText="Aprobar"
      />
    </div>
  );
}

export default EncuestasPage;
