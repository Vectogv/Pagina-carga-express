import { useState, useEffect, useCallback } from 'react';
import { CalendarDays, CalendarRange, RefreshCw, Wallet } from 'lucide-react';
import { getEarnings, getDashboard } from '../../api/admin';
import { errorMessage, formatCurrency, formatDateTime, fullName, toList } from '../../utils/format';
import { PageHeader, DataTable, StatCard, Button, StatusBadge } from '../../components/ui';

// GET /api/admin/earnings (admin_controller.ts#earnings) devuelve el listado de
// ganancias por viaje (monto, conductor, viaje), no un resumen con desglose por
// período. Los totales (hoy / mes / acumulado) sí los da GET /api/admin/dashboard.
const columns = [
  { key: 'id', label: 'ID', render: (v) => <span className="text-mono text-muted">#{v}</span> },
  {
    key: 'conductor',
    label: 'Conductor',
    render: (_, row) => (
      <div className="cell-user__text">
        <span className="cell-user__name">{fullName(row.conductor) || '—'}</span>
        <span className="cell-user__meta">{row.conductor?.placa || '—'}</span>
      </div>
    ),
  },
  {
    key: 'viaje',
    label: 'Viaje',
    render: (_, row) => (
      <div className="cell-user__text">
        <span className="truncate">{row.viaje?.origen || '—'} → {row.viaje?.destino || '—'}</span>
        {row.viaje?.estado && <StatusBadge status={row.viaje.estado} />}
      </div>
    ),
  },
  {
    key: 'monto',
    label: 'Monto',
    align: 'right',
    render: (v) => <span className="text-success text-strong">{formatCurrency(v)}</span>,
  },
  { key: 'createdAt', label: 'Fecha', render: (v) => <span className="text-muted nowrap">{formatDateTime(v)}</span> },
];

export default function EarningsPage() {
  const [earnings, setEarnings] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchEarnings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [eRes, dRes] = await Promise.all([
        getEarnings({ page: 1, limit: 100 }),
        getDashboard().catch(() => null),
      ]);
      setEarnings(toList(eRes.data, 'earnings'));
      if (dRes) setDashboard(dRes.data?.data || dRes.data);
    } catch (err) {
      setError(errorMessage(err, 'Error al cargar las ganancias'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEarnings();
  }, [fetchEarnings]);

  const show = (v) => (loading ? '—' : formatCurrency(v ?? 0));

  return (
    <div className="page">
      <PageHeader
        title="Ganancias"
        description="Resumen de ingresos y ganancias de la plataforma."
        actions={(
          <Button variant="secondary" icon={<RefreshCw size={14} />} onClick={fetchEarnings} loading={loading}>
            Actualizar
          </Button>
        )}
      />

      {error && (
        <div className="page-error" role="alert">
          <span>{error}</span>
          <Button size="sm" variant="ghost" onClick={fetchEarnings}>Reintentar</Button>
        </div>
      )}

      <div className="stats-grid">
        <StatCard title="Ganancias totales" value={show(dashboard?.totalEarnings)} icon={<Wallet size={16} />} color="var(--primary)" />
        <StatCard title="Ganancias del mes" value={show(dashboard?.monthEarnings)} icon={<CalendarDays size={16} />} color="var(--success)" />
        <StatCard title="Ganancias de hoy" value={show(dashboard?.todayEarnings)} icon={<CalendarRange size={16} />} color="var(--warning)" />
      </div>

      <h3 className="section-title">Últimas ganancias por viaje</h3>
      <DataTable
        columns={columns}
        data={earnings}
        loading={loading}
        emptyMessage="Sin ganancias registradas"
      />
    </div>
  );
}
