import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { direccionCorta } from '../../utils/direccion';
import { getModeratorReservations } from '../../api/moderator';
import { useModeratorCity } from '../../contexts/ModeratorCityContext';
import { errorMessage, formatCurrency, formatDate, toList } from '../../utils/format';
import {
  PageHeader, SegmentedFilter, DataTable, Pagination, StatusBadge, Badge,
} from '../../components/ui';
import { TarjetaPersona } from '../../components/panel';

const LIMIT = 20;

const TABS = [
  { value: 'proximas', label: 'Próximas' },
  { value: 'todas', label: 'Todas' },
  { value: 'canceladas', label: 'Canceladas' },
];

const VISTAS = [
  { value: 'dia', label: 'Por día' },
  { value: 'lista', label: 'Lista' },
];

const diaLargo = new Intl.DateTimeFormat('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });

/** "jueves, 16 de octubre" a partir de 'YYYY-MM-DD' (mediodía para que la zona horaria no corra el día). */
function tituloDia(fecha) {
  const d = fecha ? new Date(`${fecha}T12:00:00`) : null;
  return d && !Number.isNaN(d.getTime()) ? diaLargo.format(d) : 'Sin fecha';
}

const sinConductor = (r) => !r.conductor;

export default function ModeratorReservationsPage() {
  const { ciudadParams } = useModeratorCity();
  const [tab, setTab] = useState('proximas');
  const [vista, setVista] = useState('dia');
  const [soloSinConductor, setSoloSinConductor] = useState(false);
  const [page, setPage] = useState(1);
  const [reservations, setReservations] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const setTabAndReset = (value) => { setTab(value); setPage(1); };

  const fetchReservations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { page, limit: LIMIT, ...ciudadParams };
      if (tab === 'proximas') params.proximas = true;
      // El servidor lista solo `reservado` por defecto; las canceladas quedan archivadas y se piden aparte.
      if (tab === 'canceladas') params.estado = 'cancelado';
      const res = await getModeratorReservations(params);
      const d = res.data || {};
      setReservations(toList(d, 'data'));
      setTotal(typeof d.total === 'number' ? d.total : 0);
    } catch (err) {
      if (err.response?.status === 403) setError('No tienes permisos de moderador o ciudad no asignada');
      else setError(errorMessage(err, 'Error al cargar reservas'));
    } finally {
      setLoading(false);
    }
  }, [tab, page, ciudadParams]);

  useEffect(() => { fetchReservations(); }, [fetchReservations]);

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));
  const totalSinConductor = reservations.filter(sinConductor).length;
  // ponytail: el filtro es sobre la página cargada (las reservas por ciudad son pocas); si crece, parámetro en el servidor.
  const visibles = soloSinConductor ? reservations.filter(sinConductor) : reservations;

  // Vista "Por día": las reservas ya vienen ordenadas por fecha y hora; se parten por fecha.
  const porDia = useMemo(() => {
    const grupos = new Map();
    for (const r of visibles) {
      const k = r.fechaProgramada || '';
      if (!grupos.has(k)) grupos.set(k, []);
      grupos.get(k).push(r);
    }
    return [...grupos.entries()];
  }, [visibles]);

  const columnas = (conFecha) => [
    { key: 'id', label: 'ID', render: (v) => <Link className="text-mono text-primary-color" to={`/moderator/trips?viaje=${v}`}>#{String(v).slice(0, 8)}</Link> },
    {
      key: 'estado',
      label: 'Estado',
      render: (v, r) => (
        <span className="nowrap">
          <StatusBadge status={v} label={r.estadoLabel} />
          {r.urgente && <> <Badge variant="danger" title="Reabierta porque el conductor canceló con menos de 24 h">Urgente</Badge></>}
        </span>
      ),
    },
    {
      key: 'programada',
      label: conFecha ? 'Programada' : 'Hora',
      render: (_, r) => <span className="nowrap">{conFecha ? `${formatDate(r.fechaProgramada)} · ` : ''}{r.horaProgramada || '—'}</span>,
    },
    { key: 'origenDireccion', label: 'Origen', render: (v) => <span title={v || ''}>{direccionCorta(v)}</span> },
    { key: 'destinoDireccion', label: 'Destino', render: (v) => <span title={v || ''}>{direccionCorta(v)}</span> },
    {
      key: 'cliente',
      label: 'Cliente',
      render: (_, r) => (r.cliente
        ? <TarjetaPersona persona={{ ...r.cliente, contactoVisible: r.contactoVisible === true }} tipo="cliente" area="moderator" />
        : '—'),
    },
    {
      key: 'conductor',
      label: 'Conductor',
      render: (_, r) => (r.conductor
        ? <TarjetaPersona persona={r.conductor} tipo="conductor" area="moderator" />
        : <Badge variant="warning">Sin conductor</Badge>),
    },
    {
      key: 'precio',
      label: 'Precio',
      align: 'right',
      render: (_, r) => {
        const p = r.precioFinal || r.precioEstimado;
        return p ? <span className="nowrap">{formatCurrency(p)}</span> : '—';
      },
    },
  ];

  const emptyMessage = soloSinConductor
    ? 'Todas las reservas de esta página tienen conductor'
    : tab === 'proximas' ? 'No hay reservas próximas en tu ciudad' : tab === 'canceladas' ? 'No hay reservas canceladas en tu ciudad' : 'No hay reservas activas en tu ciudad';
  const paginacion = totalPages > 1 ? <Pagination page={page} totalPages={totalPages} total={total} onChange={setPage} /> : null;
  const agrupar = vista === 'dia' && !loading && porDia.length > 0;

  return (
    <div className="page">
      <PageHeader title="Reservas" description="Viajes programados con anticipación en tu ciudad, con o sin conductor asignado." />

      <div className="toolbar">
        <SegmentedFilter options={TABS} value={tab} onChange={setTabAndReset} ariaLabel="Reservas a mostrar" />
        <SegmentedFilter options={VISTAS} value={vista} onChange={setVista} ariaLabel="Cómo ver las reservas" />
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <input type="checkbox" checked={soloSinConductor} onChange={(e) => setSoloSinConductor(e.target.checked)} />
          <span>Solo sin conductor</span>
          {totalSinConductor > 0 && <Badge variant="warning">{totalSinConductor}</Badge>}
        </label>
      </div>

      {error && <div className="page-error" role="alert">{error}</div>}

      {agrupar ? (
        <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
          {porDia.map(([fecha, filas]) => {
            const libres = filas.filter(sinConductor).length;
            return (
              <section key={fecha || 'sin-fecha'}>
                <h2 className="section-title" style={{ marginBottom: 'var(--space-2)' }}>
                  {tituloDia(fecha)} · {filas.length} {filas.length === 1 ? 'reserva' : 'reservas'}
                  {libres > 0 && <> · <span className="text-danger">{libres} sin conductor</span></>}
                </h2>
                <DataTable columns={columnas(false)} data={filas} />
              </section>
            );
          })}
          {paginacion}
        </div>
      ) : (
        <DataTable columns={columnas(true)} data={visibles} loading={loading} emptyMessage={emptyMessage} footer={paginacion} />
      )}
    </div>
  );
}
