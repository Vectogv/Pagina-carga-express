import { useState, useEffect, useMemo, useCallback } from 'react';
import { Check, X } from 'lucide-react';
import { getAdminComunicados, approveComunicado, rejectComunicado } from '../../api/admin';
import { errorMessage, formatDate, toList } from '../../utils/format';
import {
  PageHeader, SegmentedFilter, DataTable, ConfirmDialog, StatusBadge, Button, Textarea, Pagination,
} from '../../components/ui';

const PAGE_SIZE = 50;

// El backend devuelve status en inglés; StatusBadge usa los estados en español.
const STATUS_BADGE = { pending: 'pendiente', approved: 'aprobado', rejected: 'rechazado' };
const statusOf = (c) => c.status || 'pending';
const titleOf = (row) => row?.title || row?.titulo || '';

function ComunicadosPage() {
  const [comunicados, setComunicados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [confirmAction, setConfirmAction] = useState(null);
  const [notaRechazo, setNotaRechazo] = useState('');

  const fetchComunicados = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getAdminComunicados({ page, limit: PAGE_SIZE });
      setComunicados(toList(res.data, 'comunicados'));
    } catch (err) {
      setError(errorMessage(err, 'Error al cargar los comunicados'));
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchComunicados();
  }, [fetchComunicados]);

  const filtered = useMemo(() => {
    if (filter === 'all') return comunicados;
    return comunicados.filter((c) => statusOf(c) === filter);
  }, [comunicados, filter]);

  const counts = useMemo(() => ({
    all: comunicados.length,
    pending: comunicados.filter((c) => statusOf(c) === 'pending').length,
    approved: comunicados.filter((c) => statusOf(c) === 'approved').length,
    rejected: comunicados.filter((c) => statusOf(c) === 'rejected').length,
  }), [comunicados]);

  const closeConfirm = () => { setConfirmAction(null); setNotaRechazo(''); };

  const handleApprove = async () => {
    if (!confirmAction) return;
    try {
      await approveComunicado(confirmAction.id);
      await fetchComunicados();
    } catch (err) {
      setError(errorMessage(err, 'Error al aprobar comunicado'));
    }
  };

  const handleReject = async () => {
    if (!confirmAction) return;
    try {
      const payload = notaRechazo.trim() ? { notaRechazo: notaRechazo.trim() } : {};
      await rejectComunicado(confirmAction.id, payload);
      await fetchComunicados();
    } catch (err) {
      setError(errorMessage(err, 'Error al rechazar comunicado'));
    }
  };

  const isApprove = confirmAction?.type === 'approve';
  const hasMore = comunicados.length === PAGE_SIZE;

  const columns = [
    {
      key: 'title',
      label: 'Título',
      render: (val, row) => <span className="text-strong">{val || row.titulo || '—'}</span>,
    },
    {
      key: 'author',
      label: 'Autor',
      render: (val, row) => val || row.autor || row.reporter?.name || '—',
    },
    {
      key: 'body',
      label: 'Contenido',
      render: (val, row) => {
        const text = val || row.content || row.contenido || '';
        return (
          <span className="truncate text-secondary" style={{ display: 'inline-block', maxWidth: 280 }} title={text}>
            {text || '—'}
          </span>
        );
      },
    },
    {
      key: 'status',
      label: 'Estado',
      render: (_, row) => <StatusBadge status={STATUS_BADGE[statusOf(row)] || statusOf(row)} />,
    },
    {
      key: 'createdAt',
      label: 'Fecha',
      render: (val) => <span className="nowrap">{formatDate(val)}</span>,
    },
    {
      key: 'acciones',
      label: '',
      align: 'right',
      render: (_, row) => (
        <div className="row row--end" style={{ flexWrap: 'nowrap' }}>
          {statusOf(row) !== 'approved' && (
            <Button size="sm" variant="soft-success" icon={<Check size={14} />} onClick={() => setConfirmAction({ ...row, type: 'approve' })}>
              Aprobar
            </Button>
          )}
          {statusOf(row) !== 'rejected' && (
            <Button size="sm" variant="soft-danger" icon={<X size={14} />} onClick={() => setConfirmAction({ ...row, type: 'reject' })}>
              Rechazar
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="page">
      <PageHeader title="Comunicados" description="Revisa y modera los comunicados publicados por los moderadores." />

      <div className="toolbar">
        <SegmentedFilter
          ariaLabel="Filtrar por estado"
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: 'Todos', count: counts.all },
            { value: 'pending', label: 'Pendientes', count: counts.pending },
            { value: 'approved', label: 'Aprobados', count: counts.approved },
            { value: 'rejected', label: 'Rechazados', count: counts.rejected },
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
        emptyMessage="No hay comunicados para mostrar"
        footer={(page > 1 || hasMore) && (
          <Pagination page={page} totalPages={hasMore ? page + 1 : page} onChange={setPage} />
        )}
      />

      <ConfirmDialog
        isOpen={!!confirmAction}
        onClose={closeConfirm}
        onConfirm={isApprove ? handleApprove : handleReject}
        title={isApprove ? 'Aprobar comunicado' : 'Rechazar comunicado'}
        message={
          isApprove
            ? `¿Deseas aprobar el comunicado “${titleOf(confirmAction)}”?`
            : `¿Deseas rechazar el comunicado “${titleOf(confirmAction)}”? Esta acción no se puede deshacer.`
        }
        confirmText={isApprove ? 'Aprobar' : 'Rechazar'}
        danger={!isApprove}
      >
        {confirmAction?.type === 'reject' && (
          <Textarea
            label="Nota de rechazo (opcional)"
            value={notaRechazo}
            onChange={(e) => setNotaRechazo(e.target.value)}
            placeholder="Motivo del rechazo"
            rows={3}
          />
        )}
      </ConfirmDialog>
    </div>
  );
}

export default ComunicadosPage;
