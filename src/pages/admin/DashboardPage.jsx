import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Users, Truck, ShieldCheck, Route, Wallet, Siren, FileCheck, Scale, CreditCard, Percent,
  TriangleAlert, Ban, Megaphone, ClipboardList, Settings, DatabaseBackup, UserRound,
  Wifi, Moon, ChevronRight, PackageCheck, CircleCheck, ListChecks,
} from 'lucide-react';
import { getDashboard, getUsers, getPendientes } from '../../api/admin';
import { getModeratorDashboard } from '../../api/moderator';
import useSocketPanel from '../../hooks/useSocketPanel';
import { errorMessage, formatCurrency, formatDate } from '../../utils/format';
import { PageHeader, StatCard, Card, EmptyState, SkeletonCard, Button } from '../../components/ui';
import { FiltroZona } from '../../components/panel';
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

// Pantalla donde se resuelve cada categoría de GET /api/admin/pendientes (gerencia_controller.ts).
const DESTINO = {
  verificaciones: '/admin/verifications',
  soat: '/admin/verifications',
  disputas: '/admin/disputes',
  cierres: '/admin/trips',
  cancelaciones: '/admin/cancellation-requests',
  tickets: '/admin/tickets',
  emergencias: '/admin/emergencies',
  reportes: '/admin/reports',
  comunicados: '/admin/comunicados',
  pagos: '/admin/payments',
};

// GET /api/admin/users manda el total real en la cabecera X-Total-Count.
const totalOf = (res) => {
  const raw = res?.headers?.['x-total-count'];
  const total = Number(raw);
  return raw != null && Number.isFinite(total) ? total : undefined;
};

function DashboardPage() {
  const socket = useSocketPanel();
  const navigate = useNavigate();
  const [zona, setZona] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Los conteos de la zona salen de /moderator/dashboard (el admin sin ciudad = todas las zonas)
      // y los pendientes de /admin/pendientes, que ya filtra por zona y cuenta solo lo sin resolver.
      // Los clientes no tienen zona: su total es siempre el de toda la plataforma.
      const [general, zonaRes, pendRes, cRes, mRes] = await Promise.all([
        zona ? null : getDashboard(),
        getModeratorDashboard(zona || null),
        getPendientes(zona ? { zona } : undefined),
        getUsers({ page: 1, limit: 1, rol: 'cliente' }),
        getUsers({ page: 1, limit: 1, rol: 'moderador', zona: zona || undefined }),
      ]);
      setData({
        general: general ? (general.data?.data || general.data) : null,
        zona: zonaRes.data?.data || zonaRes.data,
        categorias: pendRes.data?.categorias || [],
        clientes: totalOf(cRes),
        moderadores: totalOf(mRes),
      });
    } catch (err) {
      if (err?.response?.status === 403) setError('Acceso denegado (403): tu cuenta es moderador, ve a /moderator. Solo admin ve este dashboard.');
      else setError(errorMessage(err, 'Error al cargar el dashboard'));
    } finally {
      setLoading(false);
    }
  }, [zona]);

  useEffect(() => { cargar(); }, [cargar]);

  // Lo que llega en vivo a la sala "admin" y cambia los pendientes (report_controller#avisarAdmin, SOS).
  useEffect(() => {
    if (!socket) return undefined;
    const refrescar = () => cargar();
    socket.on('emergency:alert', refrescar);
    socket.on('report:new', refrescar);
    return () => {
      socket.off('emergency:alert', refrescar);
      socket.off('report:new', refrescar);
    };
  }, [socket, cargar]);

  const header = (
    <PageHeader
      title="Resumen general"
      description="Cifras clave de la plataforma y lo que está esperando una acción tuya. Toca una tarjeta para ir a esa sección."
      actions={<FiltroZona value={zona} onChange={setZona} />}
    />
  );

  if (loading && !data) {
    return (
      <div className="page">
        {header}
        <div className="stats-grid">
          {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="page">
        {header}
        <div className="page-error" role="alert">{error}</div>
      </div>
    );
  }

  const z = data.zona || {};
  const cat = (clave) => data.categorias.find((c) => c.clave === clave)?.total;
  const urgentes = data.categorias.filter((c) => c.total > 0);
  const alcance = zona ? 'En esta zona' : undefined;

  const stats = [
    { title: 'Clientes', value: data.clientes, icon: <Users size={ICON} />, color: 'var(--success)', to: '/admin/clients', subtitle: zona ? 'Toda la plataforma' : undefined },
    { title: 'Conductores', value: z.totalDrivers, icon: <Truck size={ICON} />, color: 'var(--accent-violet)', to: '/admin/drivers', subtitle: alcance },
    { title: 'Moderadores', value: data.moderadores, icon: <ShieldCheck size={ICON} />, color: 'var(--warning)', to: '/admin/moderators', subtitle: alcance },
    { title: 'Conductores en línea', value: z.onlineDrivers, icon: <Wifi size={ICON} />, color: 'var(--primary)', to: '/admin/drivers' },
    // inactiveDrivers = sin viajes en los días de inactividad configurados (Configuración → General).
    { title: 'Conductores inactivos', value: z.inactiveDrivers, icon: <Moon size={ICON} />, color: 'var(--text-muted)', to: '/admin/drivers' },
    { title: 'Viajes activos', value: z.viajesActivos, icon: <Route size={ICON} />, color: 'var(--info)', to: '/admin/trips', subtitle: z.enCurso != null ? `${z.enCurso} en curso` : undefined },
    ...(data.general ? [
      // todayShipments = viajes creados hoy que ya están en estado 'finalizado'.
      { title: 'Viajes finalizados hoy', value: data.general.todayShipments, icon: <PackageCheck size={ICON} />, color: 'var(--info)', to: '/admin/trips' },
      // totalEarnings suma ganancias.monto = neto del conductor, no el ingreso de la plataforma.
      { title: 'Ganancias netas de conductores', value: formatCurrency(data.general.totalEarnings ?? 0), icon: <Wallet size={ICON} />, color: 'var(--success)', to: '/admin/earnings' },
    ] : []),
    // emergenciasPendientes no cuenta las ya atendidas por un moderador.
    { title: 'Emergencias sin atender', value: z.emergenciasPendientes, icon: <Siren size={ICON} />, color: 'var(--danger)', to: '/admin/emergencies' },
    { title: 'Verificaciones pendientes', value: cat('verificaciones'), icon: <FileCheck size={ICON} />, color: 'var(--info)', to: '/admin/verifications' },
    { title: 'Disputas abiertas', value: cat('disputas'), icon: <Scale size={ICON} />, color: 'var(--warning)', to: '/admin/disputes' },
    { title: 'Reportes pendientes', value: cat('reportes'), icon: <TriangleAlert size={ICON} />, color: 'var(--warning)', to: '/admin/reports' },
    { title: 'Pagos por confirmar', value: cat('pagos'), icon: <CreditCard size={ICON} />, color: 'var(--accent-violet)', to: '/admin/payments' },
  ];

  return (
    <div className="page">
      {header}

      {error && <div className="page-error" role="alert">{error}</div>}

      <div className="stats-grid">
        {stats.map((s) => <StatCard key={s.title} {...s} />)}
      </div>

      <Card
        title="Pendientes urgentes"
        description="Lo que más tiempo lleva esperando, por categoría."
        actions={<Button variant="secondary" size="sm" icon={<ListChecks size={14} />} onClick={() => navigate('/admin/pendientes')}>Ver todos</Button>}
      >
        {urgentes.length === 0 ? (
          <EmptyState
            icon={<CircleCheck size={22} />}
            title="Nada pendiente"
            description={zona ? 'En esta zona no hay nada esperando revisión.' : 'No hay nada esperando revisión.'}
          />
        ) : (
          <div className="dashboard__panels">
            {urgentes.map((c) => (
              <div key={c.clave} className="stack" style={{ gap: 'var(--space-2)' }}>
                <Link to={DESTINO[c.clave] || '/admin/pendientes'} className="dashboard__card-title">
                  <span className="dashboard__card-icon"><ChevronRight size={14} /></span>
                  <strong>{c.titulo}</strong>
                  <span className="text-muted">· {c.total}</span>
                </Link>
                <ul className="dashboard__list">
                  {c.items.map((i) => (
                    <li key={`${c.clave}-${i.id}`} className="dashboard__list-item row" style={{ justifyContent: 'space-between' }}>
                      <span>{i.titulo}</span>
                      {i.createdAt && <span className="text-muted nowrap">{formatDate(i.createdAt)}</span>}
                    </li>
                  ))}
                  {c.total > c.items.length && <li className="dashboard__list-item text-muted">y {c.total - c.items.length} más</li>}
                </ul>
              </div>
            ))}
          </div>
        )}
      </Card>

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
