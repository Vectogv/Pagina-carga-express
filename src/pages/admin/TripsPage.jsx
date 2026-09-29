import { useState, useEffect, useCallback, useMemo } from 'react';
import { getTrips, getAllPages } from '../../api/admin';
import { errorMessage, formatDateTime } from '../../utils/format';
import {
  Alert, Button, PageHeader, SearchInput, Select, SegmentedFilter, DataTable, Pagination, StatusBadge,
} from '../../components/ui';
import TripDetailModal from './trips/TripDetailModal';
import {
  tripStatus, tripClient, tripDriver, tripOrigin, tripDestination, tripPrice, tripPriceKind, tripDate,
  personName, placeText, money, shortId, vehicleText, EN_SERVICIO, ATENCION, matchesStatus,
} from './trips/tripUtils';
import './trips/TripsPage.css';

const ROWS_PER_PAGE = 15;

// GET /api/admin/trips (admin_controller.ts#trips) solo pagina (page/limit); no
// filtra por estado, texto ni fecha. Se traen varias páginas y se filtra en el
// cliente, igual que en Conductores. `value` puede agrupar varios estados con coma.
const STATUS_GROUPS = [
  {
    label: 'Grupos',
    options: [
      { value: EN_SERVICIO, label: 'En servicio (todas las etapas)' },
      { value: ATENCION, label: 'Requieren atención (SOS, disputa, cierre)' },
    ],
  },
  {
    label: 'Antes del servicio',
    options: [
      { value: 'reservado', label: 'Reservado' },
      { value: 'buscando_conductor', label: 'Buscando conductor' },
    ],
  },
  {
    label: 'En servicio',
    options: [
      { value: 'aceptado', label: 'Aceptado' },
      { value: 'conductor_en_camino', label: 'Conductor en camino' },
      { value: 'conductor_llegada', label: 'Conductor en el origen' },
      { value: 'en_curso', label: 'En curso' },
      { value: 'entregado', label: 'Entregado' },
      { value: 'esperando_confirmacion', label: 'Esperando confirmación del cliente' },
    ],
  },
  {
    label: 'Requieren atención',
    options: [
      { value: 'pendiente_confirmacion', label: 'Cierre por resolver' },
      { value: 'sos', label: 'SOS' },
      { value: 'disputa', label: 'En disputa' },
    ],
  },
  {
    label: 'Cerrados',
    options: [
      { value: 'finalizado', label: 'Finalizado' },
      { value: 'cancelado', label: 'Cancelado' },
    ],
  },
];

// Accesos rápidos (con conteo) a los grupos más consultados; usan el mismo filtro de estado.
const QUICK_FILTERS = [
  { value: 'all', label: 'Todos' },
  { value: EN_SERVICIO, label: 'En servicio' },
  { value: 'finalizado', label: 'Finalizados' },
  { value: 'cancelado', label: 'Cancelados' },
  { value: ATENCION, label: 'SOS / disputa / cierre' },
];

/** Texto largo en una línea: se corta con "…" y el texto completo queda en el tooltip. */
function Clip({ text, className = '' }) {
  return <span className={`truncate ${className}`} title={text}>{text}</span>;
}

export default function TripsPage() {
  const [trips, setTrips] = useState([]);
  const [truncated, setTruncated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selected, setSelected] = useState(null);

  const fetchTrips = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { rows, truncated: more } = await getAllPages(getTrips, {}, { maxPages: 5 });
      setTrips(rows);
      setTruncated(more);
    } catch (err) {
      setError(errorMessage(err, 'Error al cargar viajes'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTrips(); }, [fetchTrips]);

  const withReset = (setter) => (val) => {
    setter(val);
    setPage(1);
  };

  // Búsqueda + fechas (sin estado): base de los conteos por grupo.
  const baseFiltered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const from = dateFrom ? new Date(dateFrom).getTime() : null;
    const to = dateTo ? new Date(dateTo).getTime() + 24 * 60 * 60 * 1000 : null;
    return trips.filter((trip) => {
      const created = trip.createdAt ? new Date(trip.createdAt).getTime() : null;
      if (from != null && (created == null || created < from)) return false;
      if (to != null && (created == null || created >= to)) return false;
      if (!q) return true;
      const haystack = [
        personName(tripClient(trip)), personName(tripDriver(trip)),
        tripOrigin(trip), tripDestination(trip), trip.carga, trip.id,
      ].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(q);
    });
  }, [trips, search, dateFrom, dateTo]);

  const filtered = useMemo(
    () => baseFiltered.filter((trip) => matchesStatus(statusFilter, trip)),
    [baseFiltered, statusFilter],
  );

  const quickOptions = useMemo(
    () => QUICK_FILTERS.map((o) => ({ ...o, count: baseFiltered.filter((t) => matchesStatus(o.value, t)).length })),
    [baseFiltered],
  );

  const activeFilters = [search.trim(), statusFilter !== 'all', dateFrom, dateTo].filter(Boolean).length;
  const clearFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((currentPage - 1) * ROWS_PER_PAGE, currentPage * ROWS_PER_PAGE);

  const columns = [
    {
      key: 'viaje',
      label: 'Viaje',
      render: (_, trip) => (
        <div className="cell-user__text">
          <span className="text-mono text-primary-color">#{shortId(trip)}</span>
          <span className="cell-user__meta nowrap">{formatDateTime(tripDate(trip))}</span>
        </div>
      ),
    },
    { key: 'estado', label: 'Estado', render: (_, trip) => <StatusBadge status={tripStatus(trip)} /> },
    {
      key: 'ruta',
      label: 'Ruta',
      render: (_, trip) => (
        <div className="trip-route-cell">
          <span className="trip-route-cell__line">
            <span className="trip-route-cell__tag">Origen</span>
            <Clip text={placeText(tripOrigin(trip))} />
          </span>
          <span className="trip-route-cell__line">
            <span className="trip-route-cell__tag">Destino</span>
            <Clip text={placeText(tripDestination(trip))} />
          </span>
        </div>
      ),
    },
    {
      key: 'cliente',
      label: 'Cliente',
      render: (_, trip) => {
        const client = tripClient(trip);
        return (
          <div className="cell-user__text trip-cell">
            <Clip className="cell-user__name" text={client ? personName(client) : 'Sin cliente'} />
            {client?.email && <Clip className="cell-user__meta" text={client.email} />}
          </div>
        );
      },
    },
    {
      key: 'conductor',
      label: 'Conductor',
      render: (_, trip) => {
        const driver = tripDriver(trip);
        if (!driver) return <span className="text-muted">Sin asignar</span>;
        const vehicle = vehicleText(driver);
        return (
          <div className="cell-user__text trip-cell">
            <Clip className="cell-user__name" text={personName(driver)} />
            {vehicle && <Clip className="cell-user__meta" text={vehicle} />}
          </div>
        );
      },
    },
    {
      key: 'valor',
      label: 'Valor',
      align: 'right',
      render: (_, trip) => {
        const kind = tripPriceKind(trip);
        return (
          <div className="cell-user__text">
            <span className="text-strong nowrap">{money(tripPrice(trip))}</span>
            {kind && <span className="cell-user__meta nowrap">{kind}</span>}
          </div>
        );
      },
    },
    {
      key: 'acciones',
      label: '',
      align: 'right',
      render: (_, trip) => (
        <Button
          size="sm"
          variant="ghost"
          onClick={(e) => { e.stopPropagation(); setSelected(trip); }}
        >
          Ver detalle
        </Button>
      ),
    },
  ];

  return (
    <div className="page">
      <PageHeader
        title="Viajes"
        description="Todos los servicios de carga de la plataforma, de cualquier ciudad. Toca un viaje para ver su detalle; si quedó con el cierre por resolver, puedes resolverlo desde ahí."
      />

      <div className="trips-filters">
        <div className="toolbar">
          <SearchInput value={search} onChange={withReset(setSearch)} placeholder="Buscar por cliente, conductor, dirección, carga o #" />
          <Select className="inline-select" value={statusFilter} onChange={(e) => withReset(setStatusFilter)(e.target.value)} aria-label="Filtrar por estado">
            <option value="all">Todos los estados</option>
            {STATUS_GROUPS.map((g) => (
              <optgroup key={g.label} label={g.label}>
                {g.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </optgroup>
            ))}
          </Select>
          <div className="trips-dates" role="group" aria-label="Rango de fechas de creación">
            <label className="trips-date">
              Desde
              <input
                type="date"
                className="trips-date__input"
                value={dateFrom}
                max={dateTo || undefined}
                onChange={(e) => withReset(setDateFrom)(e.target.value)}
              />
            </label>
            <label className="trips-date">
              Hasta
              <input
                type="date"
                className="trips-date__input"
                value={dateTo}
                min={dateFrom || undefined}
                onChange={(e) => withReset(setDateTo)(e.target.value)}
              />
            </label>
          </div>
        </div>

        <SegmentedFilter
          options={quickOptions}
          value={statusFilter}
          onChange={withReset(setStatusFilter)}
          ariaLabel="Grupos de estado"
        />
      </div>

      {error && <div className="page-error" role="alert">{error}</div>}
      {truncated && !loading && (
        <Alert variant="info">Se cargaron los {trips.length} viajes más recientes; los filtros no incluyen los más antiguos.</Alert>
      )}

      {!loading && (
        <div className="row row--between trips-summary">
          <span className="text-sm text-muted">
            <span className="text-strong">{filtered.length}</span> {filtered.length === 1 ? 'viaje' : 'viajes'}
            {activeFilters > 0
              ? ` · ${activeFilters} ${activeFilters === 1 ? 'filtro activo' : 'filtros activos'}`
              : ' · sin filtros'}
          </span>
          {activeFilters > 0 && (
            <Button size="sm" variant="ghost" onClick={clearFilters}>Limpiar filtros</Button>
          )}
        </div>
      )}

      <DataTable
        columns={columns}
        data={paginated}
        loading={loading}
        emptyMessage="No se encontraron viajes"
        emptyDescription="Ajusta la búsqueda o los filtros para ver otros resultados."
        onRowClick={setSelected}
        footer={filtered.length > 0 ? <Pagination page={currentPage} totalPages={totalPages} total={filtered.length} onChange={setPage} /> : null}
      />

      <TripDetailModal
        trip={selected}
        onClose={() => setSelected(null)}
        onResolved={() => { setSelected(null); fetchTrips(); }}
      />
    </div>
  );
}
