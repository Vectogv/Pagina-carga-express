import { useState, useEffect } from 'react';
import { getEarnings } from '../../api/admin';
import StatsCard from '../../components/admin/StatsCard';
import DataTable from '../../components/admin/DataTable';

const theme = {
  bg: '#020208',
  cards: '#0f1220',
  accent: '#6366f1',
  text: '#e2e8f0',
  muted: '#64748b',
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
  border: '#1e2238',
};

const styles = {
  page: {
    padding: 32,
    minHeight: '100vh',
    backgroundColor: theme.bg,
    color: theme.text,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 800,
    color: theme.text,
    margin: 0,
  },
  subtitle: {
    fontSize: 14,
    color: theme.muted,
    marginTop: 6,
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: 20,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: theme.text,
    margin: '0 0 16px',
  },
  errorContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 60,
    textAlign: 'center',
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorMessage: {
    fontSize: 16,
    color: theme.danger,
    marginBottom: 20,
  },
  retryBtn: {
    padding: '10px 24px',
    borderRadius: 8,
    border: 'none',
    backgroundColor: theme.accent,
    color: '#fff',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'opacity 0.15s ease',
  },
  loadingContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 80,
    color: theme.muted,
    fontSize: 15,
  },
};

const currencyFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  minimumFractionDigits: 0,
});

const earningsColumns = [
  {
    key: 'period',
    label: 'Período',
    render: (val, row) => (
      <span style={{ fontWeight: 600 }}>{row.period || row.month || row.week || 'N/A'}</span>
    ),
  },
  {
    key: 'totalTrips',
    label: 'Viajes',
    render: (val) => val ?? 0,
  },
  {
    key: 'totalAmount',
    label: 'Monto Total',
    render: (val) => currencyFormatter.format(val || 0),
  },
  {
    key: 'platformFee',
    label: 'Comisión Plataforma',
    render: (val) => currencyFormatter.format(val || 0),
  },
  {
    key: 'driverPayout',
    label: 'Pago Conductores',
    render: (val) => currencyFormatter.format(val || 0),
  },
  {
    key: 'netEarnings',
    label: 'Ganancia Neta',
    render: (val) => (
      <span style={{ color: theme.success, fontWeight: 700 }}>
        {currencyFormatter.format(val || 0)}
      </span>
    ),
  },
];

function EarningsPage() {
  const [earnings, setEarnings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchEarnings = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getEarnings();
      setEarnings(res.data?.data || res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Error al cargar las ganancias');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEarnings();
  }, []);

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.loadingContainer}>Cargando ganancias...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.page}>
        <div style={styles.errorContainer}>
          <div style={styles.errorIcon}>⚠️</div>
          <p style={styles.errorMessage}>{error}</p>
          <button
            style={styles.retryBtn}
            onClick={fetchEarnings}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85'; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  const totalEarnings = earnings?.totalEarnings ?? earnings?.total ?? 0;
  const monthlyEarnings = earnings?.monthlyEarnings || 0;
  const weeklyEarnings = earnings?.weeklyEarnings || 0;
  const breakdown = earnings?.breakdown || [];

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.title}>Ganancias</h1>
        <p style={styles.subtitle}>Resumen general de ingresos y ganancias de la plataforma</p>
      </div>

      <div style={styles.statsGrid}>
        <StatsCard
          title="Ganancias Totales"
          value={currencyFormatter.format(totalEarnings)}
          icon="💰"
          color={theme.accent}
          trend={earnings?.totalTrend}
          trendUp={earnings?.totalTrendUp}
        />
        <StatsCard
          title="Ganancias Mensuales"
          value={currencyFormatter.format(monthlyEarnings)}
          icon="📅"
          color={theme.success}
          trend={earnings?.monthlyTrend}
          trendUp={earnings?.monthlyTrendUp}
        />
        <StatsCard
          title="Ganancias Semanales"
          value={currencyFormatter.format(weeklyEarnings)}
          icon="📊"
          color={theme.warning}
          trend={earnings?.weeklyTrend}
          trendUp={earnings?.weeklyTrendUp}
        />
      </div>

      <div>
        <h2 style={styles.sectionTitle}>Desglose por Período</h2>
        <DataTable
          columns={earningsColumns}
          data={breakdown}
          loading={false}
          emptyMessage="No hay datos de desglose disponibles"
        />
      </div>
    </div>
  );
}

export default EarningsPage;
