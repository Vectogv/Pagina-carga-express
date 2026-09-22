import { useState, useEffect, useMemo, useCallback } from 'react';
import { CircleCheck } from 'lucide-react';
import { getReports, resolveReport } from '../../api/admin';
import { errorMessage, formatDate, toList } from '../../utils/format';
import {
  PageHeader, SegmentedFilter, DataTable, Modal, StatusBadge, Button,
} from '../../components/ui';

const shortId = (id) => String(id ?? '').slice(0, 8);
const reporterName = (r) => r?.reportedBy || r?.reporter?.name || '—';
const reportedName = (r) => r?.against || r?.reported?.name || '—';

function Detail({ label, children }) {
  return (
    <div className="detail-list__item">
      <span className="detail-list__label">{label}</span>
      <span className="detail-list__value">{children}</span>
    </div>
  );
}

export default function ReportsPage() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [resolving, setResolving] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [resolveError, setResolveError] = useState(null);

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getReports();
      setReports(toList(res.data));
    } catch (err) {
      setError(errorMessage(err, 'Error al cargar los reportes'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const filtered = useMemo(
    () => (filter === 'all' ? reports : reports.filter((r) => r.status === filter)),
    [reports, filter],
  );

  const filterOptions = useMemo(() => [
    { value: 'all', label: 'Todos', count: reports.length },
    { value: 'pending', label: 'Pendientes', count: reports.filter((r) => r.status === 'pending').length },
    { value: 'resolved', label: 'Resueltos', count: reports.filter((r) => r.status === 'resolved').length },
  ], [reports]);

  const openResolve = (row) => {
    setResolving(row);
    setResolveError(null);
  };

  const closeResolve = () => {
    setResolving(null);
    setResolveError(null);
  };

  const handleResolve = async () => {
    if (!resolving) return;
    setSubmitting(true);
    setResolveError(null);
    try {
      await resolveReport(resolving.id);
      await fetchReports();
      closeResolve();
    } catch (err) {
      setResolveError(errorMessage(err, 'Error al resolver el reporte'));
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    { key: 'id', label: 'ID', render: (val) => <span className="text-mono text-muted">#{shortId(val)}</span> },
    { key: 'reportedBy', label: 'Reportado por', render: (_, row) => <span className="text-strong">{reporterName(row)}</span> },
    { key: 'against', label: 'Contra', render: (_, row) => reportedName(row) },
    {
      key: 'reason',
      label: 'Motivo',
      render: (val) => <span className="truncate" style={{ display: 'inline-block', maxWidth: 240 }} title={val || ''}>{val || '—'}</span>,
    },
    { key: 'status', label: 'Estado', render: (val) => <StatusBadge status={val === 'resolved' ? 'resuelto' : 'pendiente'} /> },
    { key: 'createdAt', label: 'Fecha', render: (val) => <span className="text-muted nowrap">{formatDate(val)}</span> },
    {
      key: 'acciones',
      label: '',
      align: 'right',
      render: (_, row) => row.status !== 'resolved' && (
        <Button size="sm" variant="soft-primary" icon={<CircleCheck size={14} />} onClick={() => openResolve(row)}>
          Resolver
        </Button>
      ),
    },
  ];

  return (
    <div className="page">
      <PageHeader title="Reportes" description="Reportes enviados por usuarios sobre otros usuarios de la plataforma." />

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
        emptyMessage="No hay reportes para mostrar"
      />

      <Modal
        isOpen={!!resolving}
        onClose={submitting ? undefined : closeResolve}
        title="Resolver reporte"
        description="Revisa el reporte y márcalo como resuelto."
        size="lg"
        footer={(
          <>
            <Button variant="secondary" onClick={closeResolve} disabled={submitting}>Cancelar</Button>
            <Button onClick={handleResolve} loading={submitting}>
              Marcar como resuelto
            </Button>
          </>
        )}
      >
        {resolving && (
          <div className="stack" style={{ gap: 'var(--space-5)' }}>
            <section className="stack">
              <h3 className="section-title">Reporte</h3>
              <div className="detail-list">
                <Detail label="Reportado por">{reporterName(resolving)}</Detail>
                <Detail label="Contra">{reportedName(resolving)}</Detail>
                <Detail label="Motivo">{resolving.reason || '—'}</Detail>
                <Detail label="Fecha">{formatDate(resolving.createdAt)}</Detail>
              </div>
            </section>

            {resolving.description && (
              <section className="stack">
                <h3 className="section-title">Descripción</h3>
                <p className="text-secondary">{resolving.description}</p>
              </section>
            )}

            {resolveError && <div className="page-error" role="alert">{resolveError}</div>}
          </div>
        )}
      </Modal>
    </div>
  );
}
