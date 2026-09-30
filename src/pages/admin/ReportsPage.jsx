import { useState, useEffect, useMemo, useCallback } from 'react';
import { io } from 'socket.io-client';
import { CircleCheck } from 'lucide-react';
import { getReports, resolveReport } from '../../api/admin';
import { tokenStore } from '../../api/axios';
import { SOCKET_URL } from '../../config';
import { errorMessage, formatDate, toList } from '../../utils/format';
import {
  PageHeader, SegmentedFilter, DataTable, Modal, StatusBadge, Badge, Button, Toast, ToastContainer,
} from '../../components/ui';

const shortId = (id) => String(id ?? '').slice(0, 8);

// report_controller.ts: `reportadoPor` dice quién PRESENTÓ el reporte ('conductor'
// reporta al cliente del viaje; 'cliente' reporta al conductor asignado), no contra quién.
const reporterName = (r) => (r?.reportadoPor === 'conductor' ? r?.conductor?.nombre : r?.cliente?.nombre) || '—';
const reportedName = (r) => (r?.reportadoPor === 'conductor' ? r?.cliente?.nombre : r?.conductor?.nombre) || '—';

// Motivos válidos según quién reporta (report_controller.ts#MOTIVOS).
const MOTIVO_LABELS = {
  no_se_presento: 'No se presentó',
  cobro_incorrecto: 'Cobro incorrecto',
  comportamiento: 'Comportamiento',
  no_pago: 'No pagó',
  otro: 'Otro',
};
const motivoLabel = (v) => MOTIVO_LABELS[v] || v || '—';

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
  const [toast, setToast] = useState(null);

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      // Sin limit el backend devuelve solo los 20 más recientes.
      const res = await getReports({ page: 1, limit: 100 });
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

  // report_controller.ts#avisarAdmin: `report:new` llega en vivo a la sala "admin"
  // con `requiereRevision` cuando es el 2º reporte o más contra la misma cuenta.
  useEffect(() => {
    const token = tokenStore.access;
    if (!token) return undefined;
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      auth: { token: `Bearer ${token}` },
      query: { token: `Bearer ${token}` },
    });
    socket.on('report:new', (payload) => {
      fetchReports();
      if (payload?.requiereRevision) {
        setToast({ msg: 'Nuevo reporte: la cuenta ya lleva 2 o más y necesita revisión', ok: false });
      }
    });
    return () => { socket.disconnect(); };
  }, [fetchReports]);

  const filtered = useMemo(
    () => (filter === 'all' ? reports : reports.filter((r) => r.estado === filter)),
    [reports, filter],
  );

  const filterOptions = useMemo(() => [
    { value: 'all', label: 'Todos', count: reports.length },
    { value: 'pendiente', label: 'Pendientes', count: reports.filter((r) => r.estado === 'pendiente').length },
    { value: 'resuelto', label: 'Resueltos', count: reports.filter((r) => r.estado === 'resuelto').length },
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
    { key: 'reportedBy', label: 'Reportó', render: (_, row) => <span className="text-strong">{reporterName(row)}</span> },
    {
      key: 'against',
      label: 'Contra',
      render: (_, row) => (
        <>
          {reportedName(row)}
          {row.reportadoPor === 'cliente' && row.conductor?.placa && <span className="text-mono text-muted"> ({row.conductor.placa})</span>}
        </>
      ),
    },
    {
      key: 'motivo',
      label: 'Motivo',
      render: (val) => <span className="truncate" style={{ display: 'inline-block', maxWidth: 240 }} title={motivoLabel(val)}>{motivoLabel(val)}</span>,
    },
    { key: 'estado', label: 'Estado', render: (val) => <StatusBadge status={val} /> },
    { key: 'createdAt', label: 'Fecha', render: (val) => <span className="text-muted nowrap">{formatDate(val)}</span> },
    {
      key: 'acciones',
      label: '',
      align: 'right',
      render: (_, row) => row.estado !== 'resuelto' && (
        <Button size="sm" variant="soft-primary" icon={<CircleCheck size={14} />} onClick={() => openResolve(row)}>
          Resolver
        </Button>
      ),
    },
  ];

  return (
    <div className="page">
      <PageHeader
        title="Reportes entre usuarios"
        description="Hoy solo el conductor reporta a su cliente, dentro de los 30 minutos después de terminar el viaje. Los reportes de un cliente contra su conductor que veas aquí son de antes de ese cambio. Desde el 2.º reporte contra la misma cuenta se avisa aquí para que revises el caso; márcalo como resuelto al terminar."
      />

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
        emptyDescription="Los nuevos reportes aparecen aquí en vivo."
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
                <Detail label="Reportó">{reporterName(resolving)}</Detail>
                <Detail label="Contra">
                  {reportedName(resolving)}
                  {resolving.reportadoPor === 'cliente' && resolving.conductor?.placa && ` (${resolving.conductor.placa})`}
                </Detail>
                <Detail label="Motivo">{motivoLabel(resolving.motivo)}</Detail>
                <Detail label="Fecha">{formatDate(resolving.createdAt)}</Detail>
                {resolving.reportadoPor === 'conductor' && resolving.cliente && (
                  <Detail label="Cuenta reportada">
                    <Badge variant={resolving.cliente.visibilidad === 'reducida' ? 'warning' : 'neutral'} size="sm">
                      {resolving.cliente.visibilidad === 'reducida' ? 'Visibilidad reducida' : 'Visibilidad normal'}
                    </Badge>
                    {' '}Reputación {Number(resolving.cliente.reputacion ?? 5).toFixed(1)}
                  </Detail>
                )}
              </div>
            </section>

            {resolving.descripcion && (
              <section className="stack">
                <h3 className="section-title">Descripción</h3>
                <p className="text-secondary">{resolving.descripcion}</p>
              </section>
            )}

            {resolveError && <div className="page-error" role="alert">{resolveError}</div>}
          </div>
        )}
      </Modal>

      {toast && (
        <ToastContainer>
          <Toast message={toast.msg} variant={toast.ok ? 'success' : 'warning'} onClose={() => setToast(null)} duration={6000} />
        </ToastContainer>
      )}
    </div>
  );
}
