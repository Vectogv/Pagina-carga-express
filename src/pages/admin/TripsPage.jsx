import { useState, useEffect, useCallback } from 'react';
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

const LIMIT = 15;

const STATUS_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'activo', label: 'Activo' },
  { value: 'completado', label: 'Completado' },
  { value: 'cancelado', label: 'Cancelado' },
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
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selected, setSelected] = useState(null);

  const fetchTrips = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { page, limit: LIMIT, search };
      if (statusFilter !== 'all') params.status = statusFilter;
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;
      const res = await getTrips(params);
      const d = res.data;
      const list = toList(d, 'trips');
      setTrips(list);
      setTotal(Array.isArray(d) ? list.length : (d?.total || list.length));
      setTotalPages(Array.isArray(d) ? 1 : (d?.totalPages || 1));
    } catch (err) {
      setError(errorMessage(err, 'Error al cargar viajes'));
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, dateFrom, dateTo]);

  useEffect(() => {
    const t = setTimeout(fetchTrips, 300);
    return () => clearTimeout(t);
  }, [fetchTrips]);

  // Cualquier cambio de filtro vuelve a la primera página.
  const withReset = (setter) => (val) => {
    setter(val);
    setPage(1);
  };

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
        data={trips}
        loading={loading}
        emptyMessage="No se encontraron viajes"
        emptyDescription="Ajusta la búsqueda o los filtros para ver otros resultados."
        onRowClick={setSelected}
        footer={total > 0 ? <Pagination page={page} totalPages={totalPages} total={total} onChange={setPage} /> : null}
      />

      <TripDetailModal trip={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
