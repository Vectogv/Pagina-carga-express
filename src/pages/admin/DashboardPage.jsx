import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDashboard, getUsers, getDrivers } from '../../api/admin';
import StatsCard from '../../components/admin/StatsCard';

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
        const [uRes, dRes] = await Promise.all([
          getUsers({ page: 1, limit: 100 }),
          getDrivers({ page: 1, limit: 100 }),
        ]);
        if (cancelled) return;
        const users = Array.isArray(uRes.data) ? uRes.data : (uRes.data.users || uRes.data.data || []);
        const drivers = Array.isArray(dRes.data) ? dRes.data : (dRes.data.drivers || dRes.data.data || []);
        const byRol = { admin: 0, conductor: 0, cliente: 0, otro: 0 };
        const byEstado = { activo: 0, suspendido: 0 };
        const byCiudad = {};
        users.forEach((u) => {
          const r = (u.rol || u.role || 'otro').toLowerCase();
          if (byRol[r] !== undefined) byRol[r]++; else byRol.otro++;
          const e = u.suspendido ? 'suspendido' : 'activo';
          byEstado[e]++;
        });
        drivers.forEach((d) => {
          const c = (d.ciudad || 'sin-ciudad').toLowerCase();
          byCiudad[c] = (byCiudad[c] || 0) + 1;
        });
        const pendingVerif = drivers.filter((d) => (d.estadoVerificacion || d.estado_verificacion) === 'pendiente').length;
        setUserStats({ total: users.length, byRol, byEstado, byCiudad, driversTotal: drivers.length, pendingVerif, activos: byEstado.activo });
      } catch {}
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) return <LoadingSkeleton />;
  if (error) return <ErrorState message={error} />;

  const stats = [
    { title: 'Clientes', value: '→', icon: '👤', color: '#22c55e', to: '/admin/clients' },
    { title: 'Conductores', value: '→', icon: '🚗', color: '#8b5cf6', to: '/admin/drivers' },
    { title: 'Moderación', value: '→', icon: '🛡️', color: '#f59e0b', to: '/admin/moderators' },
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

      {userStats && (
        <div style={styles.userStatsSection}>
          <h2 style={styles.sectionTitle}>Estadísticas de Usuarios — lo importante</h2>
          <div style={styles.userStatsGrid}>
            <div style={styles.userStatCard}>
              <p style={styles.userStatLabel}>Estado</p>
              <p style={{ ...styles.userStatValue, color: userStats.byEstado.suspendido ? '#ef4444' : '#22c55e' }}>{userStats.activos} activos</p>
              <div style={styles.miniBars}>
                <div style={{ flex: userStats.byEstado.activo, background: '#22c55e', height: 6, borderRadius: 3 }} />
                <div style={{ flex: userStats.byEstado.suspendido, background: '#ef4444', height: 6, borderRadius: 3 }} />
              </div>
              <p style={styles.userStatSub}>{userStats.byEstado.suspendido} suspendidos</p>
            </div>
            <div style={styles.userStatCard} onClick={() => navigate('/admin/verifications')} title="Ver verificaciones">
              <p style={styles.userStatLabel}>Verificación Conductores</p>
              <p style={styles.userStatValue}>{userStats.pendingVerif} pendientes</p>
              <p style={styles.userStatSub}>{userStats.driversTotal} conductores • {userStats.driversTotal - userStats.pendingVerif} verificados</p>
            </div>
            <div style={styles.userStatCard}>
              <p style={styles.userStatLabel}>Por Ciudad</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                {Object.entries(userStats.byCiudad).length === 0 ? <p style={styles.userStatSub}>Sin datos</p> :
                  Object.entries(userStats.byCiudad).sort((a,b)=>b[1]-a[1]).slice(0,4).map(([c,n])=>(
                    <div key={c} style={{ display:'flex', justifyContent:'space-between', fontSize:12 }}><span style={{ color: '#e2e8f0', textTransform:'capitalize' }}>{c}</span><span style={{ color: '#64748b', fontWeight:600 }}>{n}</span></div>
                  ))}
              </div>
            </div>
          </div>
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
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 14,
    ...{
      '@media (max-width: 1200px)': {
        gridTemplateColumns: 'repeat(3, 1fr)',
      },
      '@media (max-width: 900px)': {
        gridTemplateColumns: 'repeat(2, 1fr)',
      },
      '@media (max-width: 600px)': {
        gridTemplateColumns: '1fr',
      },
    },
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
