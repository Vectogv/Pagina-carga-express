import { useState, useEffect, useCallback, useMemo } from 'react';
import { Percent, Receipt, RefreshCw, Route, Wallet } from 'lucide-react';
import { getEarnings, getAllPages } from '../../api/admin';
import { errorMessage, formatCurrency, formatDateTime, fullName } from '../../utils/format';
import {
  PageHeader, DataTable, StatCard, Button, SegmentedFilter, Pagination, Alert, SearchInput, Select,
} from '../../components/ui';

// Estadísticas de ganancias (equivale a "Pagos y Finanzas › Dashboard" de la app).
//
// GET /api/admin/earnings (admin_controller.ts#earnings) devuelve una fila por viaje
// finalizado: { id, monto, conductorId, viajeId, conductor{nombre,apellido,placa},
// viaje{origen,destino,estado}, createdAt }. `monto` es el NETO del conductor: al
// finalizar, trip_finalization_service.ts guarda montoNeto = bruto − 10 % de comisión.
// El endpoint no manda montoBruto ni comision, así que se reconstruyen con esa regla
// (bruto = neto / 0,9; comisión = bruto − neto). No filtra por fecha: se traen las
// páginas (100 por página) y los periodos se calculan aquí.

const COMISION = 0.1;
const MAX_PAGES = 10; // hasta 1000 viajes finalizados
const ROWS_PER_PAGE = 15;
const DAY_MS = 24 * 60 * 60 * 1000;

const PERIODOS = [
  { value: 'hoy', label: 'Hoy' },
  { value: 'semana', label: 'Semana' },
  { value: 'mes', label: 'Mes' },
  { value: 'trimestre', label: 'Trimestre' },
  { value: 'anio', label: 'Año' },
];
const DIAS = { semana: 7, mes: 30, trimestre: 90, anio: 365 };
const PERIODO_ANTERIOR = {
  hoy: 'ayer',
  semana: 'los 7 días anteriores',
  mes: 'los 30 días anteriores',
  trimestre: 'los 90 días anteriores',
  anio: 'el año anterior',
};

/** [desde, hasta) del periodo actual y del anterior de igual duración. */
function rangos(periodo) {
  const now = Date.now();
  if (periodo === 'hoy') {
    const inicio = new Date();
    inicio.setHours(0, 0, 0, 0);
    const desde = inicio.getTime();
    return { desde, hasta: now + 1, prevDesde: desde - DAY_MS, prevHasta: desde };
  }
  const ms = DIAS[periodo] * DAY_MS;
  return { desde: now - ms, hasta: now + 1, prevDesde: now - 2 * ms, prevHasta: now - ms };
}

const neto = (row) => Number(row?.monto) || 0;
const bruto = (row) => neto(row) / (1 - COMISION);
const timeOf = (row) => {
  const t = new Date(row?.createdAt).getTime();
  return Number.isNaN(t) ? null : t;
};
const driverLabel = (row) => {
  const name = row?.conductor ? fullName(row.conductor) : '';
  return name && name !== '—' ? name : `Conductor #${row?.conductorId ?? '—'}`;
};
const percent = (v) => `${v.toFixed(1).replace('.', ',')} %`;

const tripColumns = [
  {
    key: 'viajeId',
    label: 'Viaje',
    render: (_, row) => (
      <div className="cell-user__text">
        <span className="text-mono text-primary-color nowrap">#{row.viajeId ?? row.viaje?.id ?? '—'}</span>
        <span className="cell-user__meta nowrap">{formatDateTime(row.createdAt)}</span>
      </div>
    ),
  },
  {
    key: 'ruta',
    label: 'Ruta',
    render: (_, row) => (
      <div className="cell-user__text">
        <span className="truncate"><span className="text-muted">Origen: </span>{row.viaje?.origen || '—'}</span>
        <span className="truncate"><span className="text-muted">Destino: </span>{row.viaje?.destino || '—'}</span>
      </div>
    ),
  },
  {
    key: 'conductor',
    label: 'Conductor',
    render: (_, row) => (
      <div className="cell-user__text">
        <span className="cell-user__name">{driverLabel(row)}</span>
        <span className="cell-user__meta text-mono">{row.conductor?.placa || '—'}</span>
      </div>
    ),
  },
  {
    key: 'bruto',
    label: 'Valor del viaje',
    align: 'right',
    render: (_, row) => <span className="nowrap">{formatCurrency(bruto(row))}</span>,
  },
  {
    key: 'comision',
    label: 'Comisión (10 %)',
    align: 'right',
    render: (_, row) => <span className="nowrap text-muted">{formatCurrency(bruto(row) - neto(row))}</span>,
  },
  {
    key: 'monto',
    label: 'Ganancia neta',
    align: 'right',
    render: (v) => <span className="text-success text-strong nowrap">{formatCurrency(v)}</span>,
  },
];

const ORDENES = [
  ['recientes', 'Más recientes primero'],
  ['antiguos', 'Más antiguos primero'],
  ['mayor', 'Mayor valor primero'],
  ['menor', 'Menor valor primero'],
];

/** Texto donde se busca: conductor, placa, origen, destino y número de viaje. */
const searchText = (row) => [
  driverLabel(row), row.conductor?.placa, row.viaje?.origen, row.viaje?.destino, row.viajeId ?? row.viaje?.id,
].filter(Boolean).join(' ').toLowerCase();

export default function EarningsPage() {
  const [earnings, setEarnings] = useState([]);
  const [truncated, setTruncated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [periodo, setPeriodo] = useState('mes');
  const [page, setPage] = useState(1);
  const [busqueda, setBusqueda] = useState('');
  const [orden, setOrden] = useState('recientes');

  const fetchEarnings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { rows, truncated: more } = await getAllPages(getEarnings, {}, { maxPages: MAX_PAGES });
      setEarnings(rows);
      setTruncated(more);
    } catch (err) {
      setError(errorMessage(err, 'Error al cargar las estadísticas'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEarnings();
  }, [fetchEarnings]);

  const stats = useMemo(() => {
    const { desde, hasta, prevDesde, prevHasta } = rangos(periodo);
    const actuales = [];
    let totalPrevio = 0;
    earnings.forEach((row) => {
      const t = timeOf(row);
      if (t == null) return;
      if (t >= desde && t < hasta) actuales.push(row);
      else if (t >= prevDesde && t < prevHasta) totalPrevio += neto(row);
    });

    const totalNeto = actuales.reduce((s, r) => s + neto(r), 0);
    const totalBruto = actuales.reduce((s, r) => s + bruto(r), 0);
    const variacion = totalPrevio > 0 ? ((totalNeto - totalPrevio) / totalPrevio) * 100 : null;

    const porConductor = new Map();
    actuales.forEach((row) => {
      const key = String(row.conductorId ?? driverLabel(row));
      const entry = porConductor.get(key) || { key, nombre: driverLabel(row), placa: row.conductor?.placa || '', viajes: 0, monto: 0 };
      entry.viajes += 1;
      entry.monto += neto(row);
      porConductor.set(key, entry);
    });
    const top = [...porConductor.values()]
      .sort((a, b) => b.monto - a.monto)
      .slice(0, 10)
      .map((c) => ({ ...c, share: totalNeto > 0 ? (c.monto / totalNeto) * 100 : 0 }));

    actuales.sort((a, b) => (timeOf(b) ?? 0) - (timeOf(a) ?? 0));
    return {
      actuales,
      totalNeto,
      comision: totalBruto - totalNeto,
      viajes: actuales.length,
      ticket: actuales.length ? totalBruto / actuales.length : 0,
      variacion,
      top,
    };
  }, [earnings, periodo]);

  const handlePeriodo = (value) => {
    setPeriodo(value);
    setPage(1);
  };
  const handleBusqueda = (value) => {
    setBusqueda(value);
    setPage(1);
  };

  // Detalle por viaje: filtro de texto + orden elegido, sobre los viajes del periodo.
  const detalle = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const rows = q ? stats.actuales.filter((r) => searchText(r).includes(q)) : [...stats.actuales];
    if (orden === 'antiguos') rows.sort((a, b) => (timeOf(a) ?? 0) - (timeOf(b) ?? 0));
    else if (orden === 'mayor') rows.sort((a, b) => neto(b) - neto(a));
    else if (orden === 'menor') rows.sort((a, b) => neto(a) - neto(b));
    // 'recientes' ya viene ordenado en stats.actuales.
    return { rows, totalNeto: rows.reduce((acc, r) => acc + neto(r), 0) };
  }, [stats.actuales, busqueda, orden]);

  const totalPages = Math.max(1, Math.ceil(detalle.rows.length / ROWS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const paginated = detalle.rows.slice((currentPage - 1) * ROWS_PER_PAGE, currentPage * ROWS_PER_PAGE);

  const show = (v) => (loading ? '—' : formatCurrency(v));
  const variacionTxt = stats.variacion == null
    ? null
    : `${stats.variacion >= 0 ? '+' : ''}${percent(stats.variacion)}`;

  const topColumns = [
    {
      key: 'nombre',
      label: 'Conductor',
      render: (_, c) => (
        <div className="cell-user__text">
          <span className="cell-user__name">{c.nombre}</span>
          <span className="cell-user__meta">{c.placa || '—'}</span>
        </div>
      ),
    },
    { key: 'viajes', label: 'Viajes', align: 'right' },
    {
      key: 'monto',
      label: 'Ganancia neta',
      align: 'right',
      render: (v) => <span className="text-success text-strong nowrap">{formatCurrency(v)}</span>,
    },
    { key: 'share', label: '% del total', align: 'right', render: (v) => <span className="nowrap">{percent(v)}</span> },
  ];

  const emptyPeriodo = 'Sin viajes finalizados en este periodo';

  return (
    <div className="page">
      <PageHeader
        title="Estadísticas"
        description="Cuánto se movió en viajes finalizados. Los montos de ganancia son NETOS del conductor (el 90 % de cada viaje); la comisión de la plataforma es el 10 % restante."
        actions={(
          <Button variant="secondary" icon={<RefreshCw size={14} />} onClick={fetchEarnings} loading={loading}>
            Actualizar
          </Button>
        )}
      />

      <div className="toolbar">
        <SegmentedFilter options={PERIODOS} value={periodo} onChange={handlePeriodo} ariaLabel="Periodo" />
      </div>

      {error && (
        <div className="page-error" role="alert">
          <span>{error}</span>
          <Button size="sm" variant="ghost" onClick={fetchEarnings}>Reintentar</Button>
        </div>
      )}
      {truncated && !loading && (
        <Alert variant="info">
          Se cargaron los {earnings.length} viajes finalizados más recientes; los periodos largos pueden no incluir los más antiguos.
        </Alert>
      )}

      <div className="stats-grid">
        <StatCard
          title="Ganancias netas de conductores"
          value={show(stats.totalNeto)}
          icon={<Wallet size={16} />}
          color="var(--success)"
          trend={loading ? undefined : variacionTxt}
          trendUp={(stats.variacion ?? 0) >= 0}
          subtitle={loading ? undefined : (variacionTxt ? `vs. ${PERIODO_ANTERIOR[periodo]}` : `Sin datos de ${PERIODO_ANTERIOR[periodo]} para comparar`)}
        />
        <StatCard
          title="Comisión de la plataforma"
          value={show(stats.comision)}
          icon={<Percent size={16} />}
          color="var(--primary)"
          subtitle="10 % del valor de cada viaje"
        />
        <StatCard
          title="Viajes finalizados"
          value={loading ? '—' : stats.viajes}
          icon={<Route size={16} />}
          color="var(--info)"
        />
        <StatCard
          title="Valor promedio por viaje"
          value={show(stats.ticket)}
          icon={<Receipt size={16} />}
          color="var(--warning)"
          subtitle="Lo que pagó el cliente, en promedio"
        />
      </div>

      <h3 className="section-title">Ganancias por conductor (top 10 del periodo)</h3>
      <p className="text-sm text-muted">Haz clic en un conductor para ver solo sus viajes en el detalle.</p>
      <DataTable
        columns={topColumns}
        data={stats.top}
        loading={loading}
        rowKey={(row) => row.key}
        onRowClick={(c) => handleBusqueda(c.placa || c.nombre)}
        emptyMessage={emptyPeriodo}
        emptyDescription="Cambia el periodo para ver otros resultados."
      />

      <h3 className="section-title">Detalle por viaje</h3>
      <div className="toolbar">
        <SearchInput
          value={busqueda}
          onChange={handleBusqueda}
          placeholder="Buscar por conductor, placa, dirección o # de viaje"
        />
        <Select value={orden} onChange={(e) => { setOrden(e.target.value); setPage(1); }} aria-label="Ordenar viajes">
          {ORDENES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </Select>
      </div>
      {!loading && stats.actuales.length > 0 && (
        <p className="text-sm text-muted">
          {detalle.rows.length} {detalle.rows.length === 1 ? 'viaje' : 'viajes'}
          {busqueda.trim() ? ` que coinciden con “${busqueda.trim()}”` : ' en el periodo'}
          {' · '}ganancia neta {formatCurrency(detalle.totalNeto)}
        </p>
      )}
      <DataTable
        columns={tripColumns}
        data={paginated}
        loading={loading}
        emptyMessage={busqueda.trim() ? `Sin viajes que coincidan con “${busqueda.trim()}”` : emptyPeriodo}
        emptyDescription={busqueda.trim() ? 'Prueba con otro nombre, placa o dirección.' : 'Cambia el periodo para ver otros resultados.'}
        footer={detalle.rows.length > 0
          ? <Pagination page={currentPage} totalPages={totalPages} total={detalle.rows.length} onChange={setPage} />
          : null}
      />
    </div>
  );
}
