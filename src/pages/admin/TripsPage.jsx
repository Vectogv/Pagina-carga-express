import { useState, useEffect, useCallback, useMemo } from 'react';
import { ArrowRight } from 'lucide-react';
import { getTrips } from '../../api/admin';
import { errorMessage, formatDateTime, toList } from '../../utils/format';
import {
  PageHeader, SearchInput, SegmentedFilter, DataTable, Pagination, StatusBadge,
} from '../../components/ui';
import TripDetailModal from './trips/TripDetailModal';
import {
  tripStatus, tripClient, tripDriver, tripOrigin, tripDestination, tripPrice, tripDate,
  personName, placeText, money, shortId,
} from './trips/tripUtils';
import './trips/TripsPage.css';

const ROWS_PER_PAGE = 15;

// GET /api/admin/trips (admin_controller.ts#trips) solo pagina (page/limit); no
// filtra por estado, texto ni fecha. Se trae un lote amplio y se filtra en el
// cliente, igual que en Conductores.
const STATUS_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: 'buscando_conductor', label: 'Buscando conductor' },
  { value: 'aceptado', label: 'Aceptado' },
  { value: 'en_curso', label: 'En curso' },
  { value: 'finalizado', label: 'Finalizado' },
  { value: 'cancelado', label: 'Cancelado' },
  { value: 'disputa', label: 'En disputa' },
];

const clip = (s) => {
  const text = placeText(s);
  return text.length > 18 ? `${text.slice(0, 18)}…` : text;
};

export default function TripsPage() {
  const [trips, setTrips] = useState([]);
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
      const res = await getTrips({ page: 1, limit: 100 });
      setTrips(toList(res.data, 'trips'));
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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const from = dateFrom ? new Date(dateFrom).getTime() : null;
    const to = dateTo ? new Date(dateTo).getTime() + 24 * 60 * 60 * 1000 : null;
    return trips.filter((trip) => {
      if (statusFilter !== 'all' && tripStatus(trip) !== statusFilter) return false;
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
  }, [trips, search, statusFilter, dateFrom, dateTo]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((currentPage - 1) * ROWS_PER_PAGE, currentPage * ROWS_PER_PAGE);

  const columns = [
    {
      key: 'id',
      label: 'ID',
      render: (_, trip) => <span className="text-mono text-primary-color">#{shortId(trip)}</span>,
    },
    { key: 'cliente', label: 'Cliente', render: (_, trip) => personName(tripClient(trip)) },
    { key: 'conductor', label: 'Conductor', render: (_, trip) => personName(tripDriver(trip)) },
    {
      key: 'ruta',
      label: 'Origen → Destino',
      render: (_, trip) => (
        <span className="trip-route-cell">
          <span className="truncate">{clip(tripOrigin(trip))}</span>
          <ArrowRight size={14} className="trip-route-cell__arrow" aria-hidden="true" />
          <span className="truncate">{clip(tripDestination(trip))}</span>
        </span>
      ),
    },
    { key: 'estado', label: 'Estado', render: (_, trip) => <StatusBadge status={tripStatus(trip)} /> },
    {
      key: 'precio',
      label: 'Precio',
      align: 'right',
      render: (_, trip) => <span className="text-strong nowrap">{money(tripPrice(trip))}</span>,
    },
    {
      key: 'fecha',
      label: 'Fecha',
      render: (_, trip) => <span className="text-muted nowrap">{formatDateTime(tripDate(trip))}</span>,
    },
  ];

  return (
    <div className="page">
      <PageHeader title="Viajes" description="Historial de servicios de carga solicitados en la plataforma." />

      <div className="toolbar">
        <SearchInput value={search} onChange={withReset(setSearch)} placeholder="Buscar viajes" />
        <SegmentedFilter
          options={STATUS_OPTIONS}
          value={statusFilter}
          onChange={withReset(setStatusFilter)}
          ariaLabel="Filtrar por estado"
        />
        <label className="trips-date">
          Desde
          <input
            type="date"
            className="trips-date__input"
            value={dateFrom}
            onChange={(e) => withReset(setDateFrom)(e.target.value)}
          />
        </label>
        <label className="trips-date">
          Hasta
          <input
            type="date"
            className="trips-date__input"
            value={dateTo}
            onChange={(e) => withReset(setDateTo)(e.target.value)}
          />
        </label>
      </div>

      {error && <div className="page-error" role="alert">{error}</div>}

      <DataTable
        columns={columns}
        data={paginated}
        loading={loading}
        emptyMessage="No se encontraron viajes"
        emptyDescription="Ajusta la búsqueda o los filtros para ver otros resultados."
        onRowClick={setSelected}
        footer={filtered.length > 0 ? <Pagination page={currentPage} totalPages={totalPages} total={filtered.length} onChange={setPage} /> : null}
      />

      <TripDetailModal trip={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
