import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { direccionCorta } from '../../utils/direccion';
import { getModeratorReservations } from '../../api/moderator';
import { useModeratorCity } from '../../contexts/ModeratorCityContext';
import { errorMessage, formatCurrency, formatDate, toList } from '../../utils/format';
import {
  PageHeader, SegmentedFilter, DataTable, Pagination, StatusBadge,
} from '../../components/ui';
import { TarjetaPersona } from '../../components/panel';

const LIMIT = 20;

const TABS = [
  { value: 'proximas', label: 'Próximas' },
  { value: 'todas', label: 'Todas' },
];

export default function ModeratorReservationsPage() {
  const { ciudadParams } = useModeratorCity();
  const [tab, setTab] = useState('proximas');
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

  const columns = [
    { key: 'id', label: 'ID', render: (v) => <Link className="text-mono text-primary-color" to={`/moderator/trips?viaje=${v}`}>#{String(v).slice(0, 8)}</Link> },
    { key: 'estado', label: 'Estado', render: (v, r) => <StatusBadge status={v} label={r.estadoLabel} /> },
    {
      key: 'programada',
      label: 'Programada',
      render: (_, r) => <span className="nowrap">{formatDate(r.fechaProgramada)} · {r.horaProgramada || '—'}</span>,
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
        : <span className="text-muted">Sin asignar</span>),
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

  return (
    <div className="page">
      <PageHeader title="Reservas" description="Viajes programados con anticipación en tu ciudad, con o sin conductor asignado." />

      <div className="toolbar">
        <SegmentedFilter options={TABS} value={tab} onChange={setTabAndReset} ariaLabel="Reservas a mostrar" />
      </div>

      {error && <div className="page-error" role="alert">{error}</div>}

      <DataTable
        columns={columns}
        data={reservations}
        loading={loading}
        emptyMessage={tab === 'proximas' ? 'No hay reservas próximas en tu ciudad' : 'No hay reservas en tu ciudad'}
        footer={totalPages > 1 ? <Pagination page={page} totalPages={totalPages} total={total} onChange={setPage} /> : null}
      />
    </div>
  );
}
