import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDashboard, getUsers, getDrivers } from '../../api/admin';
import { getModeratorDashboard } from '../../api/moderator';
import StatsCard from '../../components/admin/StatsCard';
import { getRolUsuario } from '../../utils/roles';

const theme = {
  bg: '#020208',
  sidebar: '#070a12',
  cards: '#0f1220',
  accent: '#6366f1',
  text: '#e2e8f0',
  muted: '#64748b',
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
  border: '#1e2238',
};

const skeletonPulse = {
  animation: 'pulse 1.5s ease-in-out infinite',
};

function DashboardPage() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userStats, setUserStats] = useState(null);
  const [ciudad, setCiudad] = useState('todas');
  const [ciudadStats, setCiudadStats] = useState(null);
  const [ciudadError, setCiudadError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    if (ciudad === 'todas') return () => { cancelled = true; };
    (async () => {
      try {
        const res = await getModeratorDashboard(ciudad);
        if (!cancelled) setCiudadStats(res.data?.data || res.data);
      } catch (err) {
        if (!cancelled) setCiudadError({ ciudad, msg: err?.response?.data?.message || err?.response?.data?.error || 'Error al cargar métricas de la ciudad' });
      }
    })();
    return () => { cancelled = true; };
  }, [ciudad]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await getDashboard();
        if (!cancelled) setData(res.data?.data || res.data);
      } catch (err) {
        if (!cancelled) {
          const status = err?.response?.status;
          const msg = err?.response?.data?.message || err?.response?.data?.error;
          if (status === 403) setError('Acceso denegado (403): tu cuenta es moderador, ve a /moderator. Solo admin ve este dashboard.');
          else setError(msg || 'Error al cargar el dashboard');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [uRes, dRes] = await Promise.all([getUsers({ page: 1, limit: 100 }), getDrivers({ page: 1, limit: 100 })]);
        if (cancelled) return;
        const users = Array.isArray(uRes.data) ? uRes.data : (uRes.data.users || uRes.data.data || []);
        const byRol = { admin: 0, conductor: 0, cliente: 0, moderador: 0, lider: 0, otro: 0 };
        let moderadores = 0;
        users.forEach((u) => { const r = getRolUsuario(u); if (byRol[r] !== undefined) byRol[r]++; else byRol.otro++; if (u.esModerador) moderadores++; });
        const drivers = Array.isArray(dRes.data) ? dRes.data : (dRes.data.drivers || dRes.data.data || []);
        setUserStats({ byRol, moderadores, driversTotal: drivers.length });
      } catch {/* sin stats de usuarios */}
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) return <LoadingSkeleton />;
  if (error) return <ErrorState message={error} />;

  const stats = [
    { title: 'Clientes', value: userStats?.byRol.cliente ?? '—', icon: '👤', color: '#22c55e', to: '/admin/clients' },
    { title: 'Conductores', value: userStats?.byRol.conductor ?? data?.totalDrivers ?? '—', icon: '🚗', color: '#8b5cf6', to: '/admin/drivers' },
    { title: 'Moderación', value: userStats?.moderadores ?? '—', icon: '🛡️', color: '#f59e0b', to: '/admin/moderators' },
    { title: 'Viajes Activos', value: data?.activeTrips ?? data?.trips ?? 0, icon: '🛣️', color: theme.success, to: '/admin/trips' },
    { title: 'Ingresos Totales', value: formatCurrency(data?.totalEarnings ?? data?.earnings ?? 0), icon: '💰', color: '#f59e0b', to: '/admin/earnings' },
    { title: 'Emergencias Pendientes', value: data?.pendingEmergencies ?? data?.emergencies ?? 0, icon: '🚨', color: theme.danger, to: '/admin/emergencies' },
    { title: 'Verificaciones Pendientes', value: data?.pendingVerifications ?? data?.verifications ?? 0, icon: '📄', color: '#06b6d4', to: '/admin/verifications' },
    { title: 'Disputas Abiertas', value: data?.openDisputes ?? data?.disputes ?? 0, icon: '⚖️', color: '#f97316', to: '/admin/disputes' },
    { title: 'Pagos Pendientes', value: data?.pendingPayments ?? data?.payments ?? 0, icon: '💳', color: '#ec4899', to: '/admin/payments' },
    { title: 'Comisiones', value: '→', icon: '💳', color: '#6366f1', to: '/admin/commissions' },
    { title: 'Reportes', value: '→', icon: '⚠️', color: '#eab308', to: '/admin/reports' },
    { title: 'Cancelaciones', value: '→', icon: '🚫', color: '#ef4444', to: '/admin/cancellation-requests' },
    { title: 'Comunicados', value: '→', icon: '📢', color: '#06b6d4', to: '/admin/comunicados' },
    { title: 'Encuestas', value: '→', icon: '📋', color: '#22c55e', to: '/admin/encuestas' },
    { title: 'Configuración', value: '→', icon: '⚙️', color: '#64748b', to: '/admin/config' },
    { title: 'Backups', value: '→', icon: '💾', color: '#64748b', to: '/admin/backups' },
    { title: 'Mi Perfil', value: '→', icon: '👤', color: '#6366f1', to: '/admin/profile' },
  ];

  return (
    <div style={styles.page}>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: theme.muted }}>Ciudad:</span>
        <select
          value={ciudad}
          onChange={(e) => setCiudad(e.target.value)}
          style={{
            padding: '8px 12px',
            borderRadius: 8,
            border: `1px solid ${theme.border}`,
            backgroundColor: '#0f1220',
            color: theme.text,
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <option value="todas">Todas (general)</option>
          <option value="cali">Cali</option>
          <option value="popayan">Popayán</option>
          <option value="pasto">Pasto</option>
        </select>
        {ciudad !== 'todas' && <span style={{ fontSize: 12, color: theme.muted }}>Métricas de moderación para esta ciudad</span>}
      </div>

      {ciudad === 'todas' ? (
        <div style={styles.grid}>
          {stats.map((stat) => (
            <StatsCard
              key={stat.title}
              title={stat.title}
              value={stat.value}
              icon={stat.icon}
              color={stat.color}
              onClick={() => navigate(stat.to)}
            />
          ))}
        </div>
      ) : (
        <div style={styles.grid}>
          {ciudadStats && ciudadStats.ciudad === ciudad ? (
            <>
              <StatsCard title="Conductores" value={ciudadStats.totalDrivers ?? '—'} icon="🚗" color="#8b5cf6" onClick={() => navigate('/admin/drivers')} />
              <StatsCard title="Online" value={ciudadStats.onlineDrivers ?? '—'} icon="🟢" color={theme.success} onClick={() => navigate('/admin/drivers')} />
              <StatsCard title="Inactivos" value={ciudadStats.inactiveDrivers ?? '—'} icon="💤" color={theme.danger} onClick={() => navigate('/admin/drivers')} />
              <StatsCard title="Comunicados" value={ciudadStats.totalComunicados ?? '—'} icon="📢" color="#06b6d4" onClick={() => navigate('/admin/comunicados')} />
              <StatsCard title="Avisos" value={ciudadStats.totalAvisos ?? '—'} icon="📌" color="#f59e0b" onClick={() => navigate('/admin/avisos')} />
              <StatsCard title="Reportes" value={ciudadStats.totalReports ?? '—'} icon="⚠️" color="#eab308" onClick={() => navigate('/admin/reports')} />
            </>
          ) : (
            <p style={{ fontSize: 13, color: theme.muted }}>Cargando métricas de {ciudad}...</p>
          )}
        </div>
      )}

      {ciudad !== 'todas' && ciudadError?.ciudad === ciudad && (
        <div style={{ padding: '14px 18px', borderRadius: 10, backgroundColor: `${theme.danger}15`, border: `1px solid ${theme.danger}40`, color: theme.danger, fontSize: 13 }}>
          ⚠️ {ciudadError.msg}
        </div>
      )}



      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Resumen Rápido</h2>
        <div style={styles.summaryGrid}>
          <SummaryCard
            title="Actividad Reciente"
            items={data?.recentActivity ?? []}
            icon="📈"
          />
          <SummaryCard
            title="Alertas"
            items={data?.alerts ?? []}
            icon="🔔"
          />
          <SummaryCard
            title="Acciones Rápidas"
            items={data?.quickActions ?? []}
            icon="⚡"
          />
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ title, items, icon }) {
  return (
    <div
      style={styles.summaryCard}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = theme.accent;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = theme.border;
      }}
    >
      <div style={styles.summaryHeader}>
        <span style={{ fontSize: 18 }}>{icon}</span>
        <h3 style={styles.summaryTitle}>{title}</h3>
      </div>
      {items.length === 0 ? (
        <p style={styles.emptyText}>Sin datos disponibles</p>
      ) : (
        <ul style={styles.summaryList}>
          {items.slice(0, 5).map((item, i) => (
            <li key={i} style={styles.summaryItem}>
              {typeof item === 'string' ? item : item.text || item.label || JSON.stringify(item)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div style={styles.page}>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
      <div style={styles.grid}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} style={{ ...styles.skeletonCard, ...skeletonPulse }}>
            <div style={styles.skeletonIcon} />
            <div style={{ ...styles.skeletonLine, width: '60%' }} />
            <div style={{ ...styles.skeletonLine, width: '40%', height: 28 }} />
          </div>
        ))}
      </div>
    </div>
  );
}

function ErrorState({ message }) {
  return (
    <div style={styles.errorWrapper}>
      <span style={{ fontSize: 48 }}>⚠️</span>
      <h2 style={styles.errorTitle}>Algo salió mal</h2>
      <p style={styles.errorMessage}>{message}</p>
    </div>
  );
}

function formatCurrency(value) {
  if (typeof value === 'string') return value;
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(value);
}

const styles = {
  page: {
    display: 'flex',
    flexDirection: 'column',
    gap: 32,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
    gap: 12,
  },
  section: { display: 'flex', flexDirection: 'column', gap: 12 },
  sectionTitle: { fontSize: 16, fontWeight: 700, color: theme.text, margin: 0 },
  userStatsSection: { display: 'flex', flexDirection: 'column', gap: 12, background: 'rgba(15,18,32,0.6)', border: '1px solid #1e2238', borderRadius: 12, padding: 16 },
  userStatsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 12 },
  userStatCard: { background: '#0f1220', border: '1px solid #1e2238', borderRadius: 10, padding: 14, cursor: 'default' },
  userStatLabel: { fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 4px' },
  userStatValue: { fontSize: 20, fontWeight: 800, color: '#e2e8f0', margin: 0 },
  userStatSub: { fontSize: 11, color: '#64748b', margin: '4px 0 0' },
  miniBars: { display: 'flex', gap: 4, marginTop: 8 },
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 14,
  },
  summaryCard: {
    backgroundColor: theme.cards,
    borderRadius: 12,
    border: `1px solid ${theme.border}`,
    padding: 16,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    transition: 'border-color 0.2s ease',
  },
  summaryHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: 700,
    color: theme.text,
    margin: 0,
  },
  summaryList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  summaryItem: {
    fontSize: 13,
    color: theme.muted,
    padding: '6px 10px',
    borderRadius: 6,
    backgroundColor: `${"#020208"}`,
  },
  emptyText: {
    fontSize: 13,
    color: theme.muted,
    margin: 0,
  },
  skeletonCard: {
    backgroundColor: theme.cards,
    borderRadius: 12,
    border: `1px solid ${theme.border}`,
    padding: 16,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  skeletonIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: theme.border,
  },
  skeletonLine: {
    height: 16,
    borderRadius: 4,
    backgroundColor: theme.border,
  },
  errorWrapper: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 64,
    textAlign: 'center',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: theme.text,
    margin: 0,
  },
  errorMessage: {
    fontSize: 13,
    color: theme.muted,
    margin: 0,
    maxWidth: 400,
  },
};

export default DashboardPage;
