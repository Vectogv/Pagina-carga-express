import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, Truck, ShieldCheck, Route, Wallet, Siren, FileCheck, Scale, CreditCard, Percent,
  TriangleAlert, Ban, Megaphone, ClipboardList, Settings, DatabaseBackup, UserRound,
  Activity, Bell, Zap, Wifi, Moon, Pin, ChevronRight,
} from 'lucide-react';
import { getDashboard, getUsers, getDrivers } from '../../api/admin';
import { getModeratorDashboard } from '../../api/moderator';
import { getRolUsuario } from '../../utils/roles';
import { errorMessage, formatCurrency, toList } from '../../utils/format';
import { PageHeader, StatCard, Card, Select, SkeletonCard } from '../../components/ui';
import './DashboardPage.css';

const ICON = 18;

const SHORTCUTS = [
  { title: 'Comisiones', icon: <Percent size={16} />, to: '/admin/commissions' },
  { title: 'Reportes', icon: <TriangleAlert size={16} />, to: '/admin/reports' },
  { title: 'Cancelaciones', icon: <Ban size={16} />, to: '/admin/cancellation-requests' },
  { title: 'Comunicados', icon: <Megaphone size={16} />, to: '/admin/comunicados' },
  { title: 'Encuestas', icon: <ClipboardList size={16} />, to: '/admin/encuestas' },
  { title: 'Configuración', icon: <Settings size={16} />, to: '/admin/config' },
  { title: 'Backups', icon: <DatabaseBackup size={16} />, to: '/admin/backups' },
  { title: 'Mi perfil', icon: <UserRound size={16} />, to: '/admin/profile' },
];

const itemText = (item) => (typeof item === 'string' ? item : item.text || item.label || JSON.stringify(item));

function DashboardPage() {
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
        if (!cancelled) setCiudadError({ ciudad, msg: errorMessage(err, 'Error al cargar métricas de la ciudad') });
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
          if (err?.response?.status === 403) setError('Acceso denegado (403): tu cuenta es moderador, ve a /moderator. Solo admin ve este dashboard.');
          else setError(errorMessage(err, 'Error al cargar el dashboard'));
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
        const users = toList(uRes.data, 'users');
        const byRol = { admin: 0, conductor: 0, cliente: 0, moderador: 0, lider: 0, otro: 0 };
        let moderadores = 0;
        users.forEach((u) => {
          const r = getRolUsuario(u);
          if (byRol[r] !== undefined) byRol[r] += 1; else byRol.otro += 1;
          if (u.esModerador) moderadores += 1;
        });
        const drivers = toList(dRes.data, 'drivers');
        setUserStats({ byRol, moderadores, driversTotal: drivers.length });
      } catch {
        // Las métricas por rol son complementarias: si fallan, las tarjetas muestran "—".
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const header = (
    <PageHeader
      title="Resumen general"
      description="Indicadores clave de la operación y accesos a cada sección."
      actions={(
        <Select value={ciudad} onChange={(e) => setCiudad(e.target.value)} aria-label="Ciudad" className="dashboard__city">
          <option value="todas">Todas las ciudades</option>
          <option value="cali">Cali</option>
          <option value="popayan">Popayán</option>
          <option value="pasto">Pasto</option>
        </Select>
      )}
    />
  );

  if (loading) {
    return (
      <div className="page">
        {header}
        <div className="stats-grid">
          {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page">
        {header}
        <div className="page-error" role="alert">{error}</div>
      </div>
    );
  }

  const stats = [
    { title: 'Clientes', value: userStats?.byRol.cliente ?? '—', icon: <Users size={ICON} />, color: 'var(--success)', to: '/admin/clients' },
    { title: 'Conductores', value: userStats?.byRol.conductor ?? data?.totalDrivers ?? '—', icon: <Truck size={ICON} />, color: 'var(--accent-violet)', to: '/admin/drivers' },
    { title: 'Moderación', value: userStats?.moderadores ?? '—', icon: <ShieldCheck size={ICON} />, color: 'var(--warning)', to: '/admin/moderators' },
    { title: 'Viajes activos', value: data?.activeTrips ?? data?.trips ?? 0, icon: <Route size={ICON} />, color: 'var(--primary)', to: '/admin/trips' },
    {
      title: 'Ingresos totales',
      value: typeof (data?.totalEarnings ?? data?.earnings) === 'string' ? (data?.totalEarnings ?? data?.earnings) : formatCurrency(data?.totalEarnings ?? data?.earnings ?? 0),
      icon: <Wallet size={ICON} />,
      color: 'var(--success)',
      to: '/admin/earnings',
    },
    { title: 'Emergencias pendientes', value: data?.pendingEmergencies ?? data?.emergencies ?? 0, icon: <Siren size={ICON} />, color: 'var(--danger)', to: '/admin/emergencies' },
    { title: 'Verificaciones pendientes', value: data?.pendingVerifications ?? data?.verifications ?? 0, icon: <FileCheck size={ICON} />, color: 'var(--info)', to: '/admin/verifications' },
    { title: 'Disputas abiertas', value: data?.openDisputes ?? data?.disputes ?? 0, icon: <Scale size={ICON} />, color: 'var(--warning)', to: '/admin/disputes' },
    { title: 'Pagos pendientes', value: data?.pendingPayments ?? data?.payments ?? 0, icon: <CreditCard size={ICON} />, color: 'var(--accent-violet)', to: '/admin/payments' },
  ];

  const cityReady = ciudadStats && ciudadStats.ciudad === ciudad;
  const cityStats = cityReady ? [
    { title: 'Conductores', value: ciudadStats.totalDrivers ?? '—', icon: <Truck size={ICON} />, color: 'var(--accent-violet)', to: '/admin/drivers' },
    { title: 'En línea', value: ciudadStats.onlineDrivers ?? '—', icon: <Wifi size={ICON} />, color: 'var(--success)', to: '/admin/drivers' },
    { title: 'Inactivos', value: ciudadStats.inactiveDrivers ?? '—', icon: <Moon size={ICON} />, color: 'var(--danger)', to: '/admin/drivers' },
    { title: 'Comunicados', value: ciudadStats.totalComunicados ?? '—', icon: <Megaphone size={ICON} />, color: 'var(--info)', to: '/admin/comunicados' },
    { title: 'Avisos', value: ciudadStats.totalAvisos ?? '—', icon: <Pin size={ICON} />, color: 'var(--warning)', to: '/admin/avisos' },
    { title: 'Reportes', value: ciudadStats.totalReports ?? '—', icon: <TriangleAlert size={ICON} />, color: 'var(--warning)', to: '/admin/reports' },
  ] : [];

  const showCityError = ciudad !== 'todas' && ciudadError?.ciudad === ciudad;

  return (
    <div className="page">
      {header}

      {ciudad === 'todas' ? (
        <div className="stats-grid">
          {stats.map((s) => <StatCard key={s.title} {...s} />)}
        </div>
      ) : (
        <>
          <p className="text-sm text-muted">Métricas de moderación para esta ciudad.</p>
          {showCityError ? (
            <div className="page-error" role="alert">{ciudadError.msg}</div>
          ) : (
            <div className="stats-grid">
              {cityReady
                ? cityStats.map((s) => <StatCard key={s.title} {...s} />)
                : Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          )}
        </>
      )}

      <div className="dashboard__panels">
        <SummaryCard title="Actividad reciente" icon={<Activity size={16} />} items={data?.recentActivity ?? []} />
        <SummaryCard title="Alertas" icon={<Bell size={16} />} items={data?.alerts ?? []} />
        <SummaryCard title="Acciones rápidas" icon={<Zap size={16} />} items={data?.quickActions ?? []} />
      </div>

      <Card title="Accesos directos" description="Otras secciones del panel.">
        <nav className="dashboard__shortcuts" aria-label="Accesos directos">
          {SHORTCUTS.map((s) => (
            <Link key={s.to} to={s.to} className="dashboard__shortcut">
              <span className="dashboard__shortcut-icon">{s.icon}</span>
              <span className="dashboard__shortcut-label">{s.title}</span>
              <ChevronRight size={14} className="dashboard__shortcut-arrow" />
            </Link>
          ))}
        </nav>
      </Card>
    </div>
  );
}

function SummaryCard({ title, icon, items }) {
  return (
    <Card
      title={(
        <span className="dashboard__card-title">
          <span className="dashboard__card-icon">{icon}</span>
          {title}
        </span>
      )}
    >
      {items.length === 0 ? (
        <p className="text-sm text-muted">Sin datos disponibles</p>
      ) : (
        <ul className="dashboard__list">
          {items.slice(0, 5).map((item, i) => (
            <li key={i} className="dashboard__list-item">{itemText(item)}</li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export default DashboardPage;
