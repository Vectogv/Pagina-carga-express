import { useState, useEffect, useCallback } from 'react';
import { CalendarDays, CalendarRange, RefreshCw, Wallet } from 'lucide-react';
import { getEarnings } from '../../api/admin';
import { errorMessage, formatCurrency, formatNumber } from '../../utils/format';
import { PageHeader, DataTable, StatCard, Button } from '../../components/ui';

const columns = [
  {
    key: 'period',
    label: 'Período',
    render: (_, row) => <span className="text-strong">{row.period || row.month || row.week || '—'}</span>,
  },
  { key: 'totalTrips', label: 'Viajes', align: 'right', render: (v) => formatNumber(v ?? 0) },
  { key: 'totalAmount', label: 'Monto total', align: 'right', render: (v) => formatCurrency(v) },
  { key: 'platformFee', label: 'Comisión plataforma', align: 'right', render: (v) => formatCurrency(v) },
  { key: 'driverPayout', label: 'Pago conductores', align: 'right', render: (v) => formatCurrency(v) },
  {
    key: 'netEarnings',
    label: 'Ganancia neta',
    align: 'right',
    render: (v) => <span className="text-success text-strong">{formatCurrency(v)}</span>,
  },
];

export default function EarningsPage() {
  const [earnings, setEarnings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchEarnings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getEarnings();
      setEarnings(res.data?.data || res.data);
    } catch (err) {
      setError(errorMessage(err, 'Error al cargar las ganancias'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEarnings();
  }, [fetchEarnings]);

  const total = earnings?.totalEarnings ?? earnings?.total ?? 0;
  const breakdown = Array.isArray(earnings?.breakdown) ? earnings.breakdown : [];
  const show = (v) => (loading ? '—' : formatCurrency(v));

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
        <StatCard
          title="Ganancias totales"
          value={show(total)}
          icon={<Wallet size={16} />}
          color="var(--primary)"
          trend={earnings?.totalTrend}
          trendUp={earnings?.totalTrendUp}
        />
        <StatCard
          title="Ganancias del mes"
          value={show(earnings?.monthlyEarnings)}
          icon={<CalendarDays size={16} />}
          color="var(--success)"
          trend={earnings?.monthlyTrend}
          trendUp={earnings?.monthlyTrendUp}
        />
        <StatCard
          title="Ganancias de la semana"
          value={show(earnings?.weeklyEarnings)}
          icon={<CalendarRange size={16} />}
          color="var(--warning)"
          trend={earnings?.weeklyTrend}
          trendUp={earnings?.weeklyTrendUp}
        />
      </div>

      <h3 className="section-title">Desglose por período</h3>
      <DataTable
        columns={columns}
        data={breakdown}
        loading={loading}
        rowKey={(row, i) => row.id ?? row.period ?? row.month ?? row.week ?? i}
        emptyMessage="Sin desglose disponible"
      />
    </div>
  );
}
