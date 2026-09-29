import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, Truck, ShieldCheck, Route, Wallet, Siren, FileCheck, Scale, CreditCard, Percent,
  TriangleAlert, Ban, Megaphone, ClipboardList, Settings, DatabaseBackup, UserRound,
  Wifi, Moon, Pin, ChevronRight, PackageCheck,
} from 'lucide-react';
import {
  getDashboard, getUsers, getEmergencies, getVerifications, getDisputes, getPendingPayments,
} from '../../api/admin';
import { getModeratorDashboard } from '../../api/moderator';
import { useZonas } from '../../hooks/useZonas';
import { errorMessage, formatCurrency, toList } from '../../utils/format';
import { PageHeader, StatCard, Card, Select, SkeletonCard } from '../../components/ui';
import './DashboardPage.css';

const ICON = 18;

const SHORTCUTS = [
  { title: 'Comisiones', icon: <Percent size={16} />, to: '/admin/commissions' },
  { title: 'Reportes entre usuarios', icon: <TriangleAlert size={16} />, to: '/admin/reports' },
  { title: 'Solicitudes de cancelación', icon: <Ban size={16} />, to: '/admin/cancellation-requests' },
  { title: 'Comunicados', icon: <Megaphone size={16} />, to: '/admin/comunicados' },
  { title: 'Encuestas', icon: <ClipboardList size={16} />, to: '/admin/encuestas' },
  { title: 'Configuración', icon: <Settings size={16} />, to: '/admin/config' },
  { title: 'Backups', icon: <DatabaseBackup size={16} />, to: '/admin/backups' },
  { title: 'Mi perfil', icon: <UserRound size={16} />, to: '/admin/profile' },
];

// Los listados de pendientes se piden con limit=100 (tope del backend): si llegan
// 100 exactos puede haber más, así que se muestra "100+" en vez de un número recortado.
const LIMIT = 100;
const countOf = (res) => {
  const n = toList(res.data).length;
  return n >= LIMIT ? `${LIMIT}+` : n;
};
// GET /api/admin/users manda el total real en la cabecera X-Total-Count.
const totalOf = (res) => {
  const raw = res?.headers?.['x-total-count'];
  const total = Number(raw);
  return raw != null && Number.isFinite(total) ? total : toList(res?.data, 'users').length;
};

function DashboardPage() {
  const ZONAS = useZonas();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userStats, setUserStats] = useState(null);
  const [pending, setPending] = useState(null);
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
        // Antes se contaban a mano los primeros 100 usuarios, así que con más de 100
        // cuentas los números salían recortados. Se usa el total del backend por rol.
        const [cRes, mRes] = await Promise.all([
          getUsers({ page: 1, limit: 1, rol: 'cliente' }),
          getUsers({ page: 1, limit: 1, rol: 'moderador' }),
        ]);
        if (cancelled) return;
        setUserStats({ clientes: totalOf(cRes), moderadores: totalOf(mRes) });
      } catch {
        // Las métricas por rol son complementarias: si fallan, las tarjetas muestran "—".
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // El dashboard (admin_controller.ts#dashboard) no trae conteos de pendientes;
  // se piden aparte a los mismos endpoints que ya filtran "pendiente" en el
  // backend, así el número es real y no un campo inventado.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [emRes, verRes, dispRes, payRes] = await Promise.all([
          getEmergencies({ page: 1, limit: LIMIT }),
          getVerifications({ page: 1, limit: LIMIT }),
          getDisputes({ page: 1, limit: LIMIT }),
          getPendingPayments(),
        ]);
        if (cancelled) return;
        setPending({
          emergencies: countOf(emRes),
          verifications: countOf(verRes),
          disputes: countOf(dispRes),
          payments: toList(payRes.data).length,
        });
      } catch {
        // Complementario: si falla, las tarjetas muestran "—".
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const header = (
    <PageHeader
      title="Resumen general"
      description="Cifras clave de la plataforma y lo que está esperando una acción tuya. Toca una tarjeta para ir a esa sección."
      actions={(
        <Select value={ciudad} onChange={(e) => setCiudad(e.target.value)} aria-label="Ciudad" className="dashboard__city">
          <option value="todas">Todas las ciudades</option>
          {ZONAS.map((z) => <option key={z.value} value={z.value}>{z.label}</option>)}
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
    { title: 'Clientes', value: userStats?.clientes ?? '—', icon: <Users size={ICON} />, color: 'var(--success)', to: '/admin/clients' },
    { title: 'Conductores', value: data?.totalDrivers ?? '—', icon: <Truck size={ICON} />, color: 'var(--accent-violet)', to: '/admin/drivers' },
    { title: 'Moderadores', value: userStats?.moderadores ?? '—', icon: <ShieldCheck size={ICON} />, color: 'var(--warning)', to: '/admin/moderators' },
    // activeVehicles = conductores con online=true (admin_controller.ts#dashboard).
    { title: 'Conductores en línea', value: data?.activeVehicles ?? '—', icon: <Route size={ICON} />, color: 'var(--primary)', to: '/admin/drivers' },
    // todayShipments = viajes creados hoy que ya están en estado 'finalizado'.
    { title: 'Viajes finalizados hoy', value: data?.todayShipments ?? '—', icon: <PackageCheck size={ICON} />, color: 'var(--info)', to: '/admin/trips' },
    // totalEarnings suma ganancias.monto = neto del conductor (90 %), no el ingreso de la plataforma.
    { title: 'Ganancias netas de conductores', value: formatCurrency(data?.totalEarnings ?? 0), icon: <Wallet size={ICON} />, color: 'var(--success)', to: '/admin/earnings' },
    { title: 'Emergencias pendientes', value: pending?.emergencies ?? '—', icon: <Siren size={ICON} />, color: 'var(--danger)', to: '/admin/emergencies' },
    { title: 'Verificaciones pendientes', value: pending?.verifications ?? '—', icon: <FileCheck size={ICON} />, color: 'var(--info)', to: '/admin/verifications' },
    { title: 'Disputas abiertas', value: pending?.disputes ?? '—', icon: <Scale size={ICON} />, color: 'var(--warning)', to: '/admin/disputes' },
    { title: 'Pagos pendientes', value: pending?.payments ?? '—', icon: <CreditCard size={ICON} />, color: 'var(--accent-violet)', to: '/admin/payments' },
  ];

  const cityReady = ciudadStats && ciudadStats.ciudad === ciudad;
  // moderator_controller.ts#dashboard: totalComunicados y totalReports cuentan los del
  // usuario que consulta (el admin), no los de la ciudad, así que no se muestran aquí.
  const cityStats = cityReady ? [
    { title: 'Conductores', value: ciudadStats.totalDrivers ?? '—', icon: <Truck size={ICON} />, color: 'var(--accent-violet)', to: '/admin/drivers' },
    { title: 'Conductores en línea', value: ciudadStats.onlineDrivers ?? '—', icon: <Wifi size={ICON} />, color: 'var(--success)', to: '/admin/drivers' },
    { title: 'Sin viajes en 7 días', value: ciudadStats.inactiveDrivers ?? '—', icon: <Moon size={ICON} />, color: 'var(--danger)', to: '/admin/drivers' },
    { title: 'Avisos de la ciudad', value: ciudadStats.totalAvisos ?? '—', icon: <Pin size={ICON} />, color: 'var(--warning)', to: '/admin/avisos' },
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
          <p className="text-sm text-muted">Conductores y avisos de esta ciudad.</p>
          {showCityError ? (
            <div className="page-error" role="alert">{ciudadError.msg}</div>
          ) : (
            <div className="stats-grid">
              {cityReady
                ? cityStats.map((s) => <StatCard key={s.title} {...s} />)
                : Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          )}
        </>
      )}

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

export default DashboardPage;
