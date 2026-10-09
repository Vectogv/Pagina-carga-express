import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoadingState from './components/ui/LoadingState/LoadingState';

const AdminLayout = lazy(() => import('./layouts/AdminLayout'));
const ModeratorLayout = lazy(() => import('./layouts/ModeratorLayout'));
const LoginPage = lazy(() => import('./pages/admin/LoginPage'));
const Legal = lazy(() => import('./pages/Legal'));
const Inicio = lazy(() => import('./pages/Inicio'));
const ClienteLayout = lazy(() => import('./pages/cliente/ClientePage'));
const cliente = {
  index: lazy(() => import('./pages/cliente/ClientePage').then((m) => ({ default: m.ViajeActivo }))),
  viajes: lazy(() => import('./pages/cliente/ClientePage').then((m) => ({ default: m.MisViajes }))),
  soporte: lazy(() => import('./pages/cliente/Soporte')),
  empresa: lazy(() => import('./pages/cliente/Empresa')),
};

const admin = {
  index: lazy(() => import('./pages/admin/DashboardPage')),
  users: lazy(() => import('./pages/admin/UsersPage')),
  clients: lazy(() => import('./pages/admin/ClientsPage')),
  moderators: lazy(() => import('./pages/admin/ModeratorsPage')),
  drivers: lazy(() => import('./pages/admin/DriversPage')),
  mapa: lazy(() => import('./pages/panel/MapaVivoPage')),
  'drivers/:id': lazy(() => import('./pages/panel/PerfilConductorPage').then((m) => ({ default: () => <m.default area="admin" /> }))),
  'clients/:id': lazy(() => import('./pages/panel/PerfilClientePage').then((m) => ({ default: () => <m.default area="admin" /> }))),
  trips: lazy(() => import('./pages/admin/TripsPage')),
  earnings: lazy(() => import('./pages/admin/EarningsPage')),
  commissions: lazy(() => import('./pages/admin/CommissionsPage')),
  payments: lazy(() => import('./pages/admin/PaymentsPage')),
  verifications: lazy(() => import('./pages/admin/VerificationsPage')),
  empresas: lazy(() => import('./pages/admin/EmpresasPage')),
  reports: lazy(() => import('./pages/admin/ReportsPage')),
  tickets: lazy(() => import('./pages/admin/TicketsPage')),
  disputes: lazy(() => import('./pages/admin/DisputesPage')),
  emergencies: lazy(() => import('./pages/admin/EmergenciesPage')),
  'cancellation-requests': lazy(() => import('./pages/admin/CancellationRequestsPage')),
  pendientes: lazy(() => import('./pages/admin/PendientesPage')),
  referidos: lazy(() => import('./pages/admin/ReferidosPage')),
  comunicacion: lazy(() => import('./pages/admin/EnviarComunicacionPage')),
  comunicados: lazy(() => import('./pages/admin/ComunicadosPage')),
  encuestas: lazy(() => import('./pages/admin/EncuestasPage')),
  conversations: lazy(() => import('./pages/admin/ConversationsPage')),
  avisos: lazy(() => import('./pages/admin/AvisosPage')),
  'moderator-reports': lazy(() => import('./pages/admin/ModeratorReportsPage')),
  config: lazy(() => import('./pages/admin/ConfigPage')),
  profile: lazy(() => import('./pages/admin/ProfilePage')),
  backups: lazy(() => import('./pages/admin/BackupsPage')),
};

const moderator = {
  index: lazy(() => import('./pages/moderator/DashboardPage')),
  drivers: lazy(() => import('./pages/moderator/DriversPage')),
  'drivers/inactive': lazy(() => import('./pages/moderator/InactiveDriversPage')),
  'drivers/:id': lazy(() => import('./pages/moderator/DriverDetailPage')),
  'clients/:id': lazy(() => import('./pages/panel/PerfilClientePage').then((m) => ({ default: () => <m.default area="moderator" /> }))),
  mapa: lazy(() => import('./pages/panel/MapaVivoPage').then((m) => ({ default: () => <m.default area="moderator" /> }))),
  conductores: lazy(() => import('./pages/moderator/DriverDirectoryPage')),
  disputes: lazy(() => import('./pages/moderator/DisputesPage')),
  comunicados: lazy(() => import('./pages/moderator/ComunicadosPage')),
  encuestas: lazy(() => import('./pages/moderator/EncuestasPage')),
  avisos: lazy(() => import('./pages/moderator/AvisosPage')),
  profile: lazy(() => import('./pages/moderator/ProfilePage')),
  trips: lazy(() => import('./pages/moderator/TripsPage')),
  reservations: lazy(() => import('./pages/moderator/ReservationsPage')),
  emergencies: lazy(() => import('./pages/moderator/EmergenciasPage')),
  cierres: lazy(() => import('./pages/moderator/CierresPage')),
  tickets: lazy(() => import('./pages/moderator/TicketsPage')),
  conversations: lazy(() => import('./pages/moderator/ConversationsPage')),
  companeros: lazy(() => import('./pages/moderator/CompanerosPage')),
  reports: lazy(() => import('./pages/moderator/MisReportesPage')),
};

const FullScreenLoader = () => (
  <div style={{ height: '100vh', display: 'grid', placeItems: 'center' }}>
    <LoadingState message="Cargando…" />
  </div>
);

function ProtectedRoute({ children, area }) {
  const { isAuthenticated, loading, user } = useAuth();
  if (loading) return <FullScreenLoader />;
  if (!isAuthenticated) {
    const login = { moderator: '/moderator/login', cliente: '/ingresar' }[area] || '/admin/login';
    return <Navigate to={login} replace />;
  }

  const isAdmin = user?.rol === 'admin';
  const isMod = Boolean(user?.esModerador);
  // A dónde va cada quien si entra a un área que no es la suya.
  const casa = isAdmin ? '/admin' : isMod ? '/moderator' : user?.rol === 'cliente' ? '/cliente' : '/ingresar';

  if (area === 'admin' && !isAdmin) return <Navigate to={casa} replace />;
  if (area === 'moderator' && !isMod && !isAdmin) return <Navigate to={casa} replace />;
  if (area === 'cliente' && user?.rol !== 'cliente') return <Navigate to={casa} replace />;
  return children;
}

const renderRoutes = (pages) =>
  Object.entries(pages).map(([path, Page]) =>
    path === 'index'
      ? <Route key="index" index element={<Page />} />
      : <Route key={path} path={path} element={<Page />} />,
  );

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<FullScreenLoader />}>
          <Routes>
            <Route path="/" element={<Inicio />} />
            <Route path="/privacidad" element={<Legal tipo="privacidad" />} />
            <Route path="/terminos" element={<Legal tipo="terminos" />} />
            <Route path="/eliminar-cuenta" element={<Legal tipo="eliminar" />} />
            <Route path="/ingresar" element={<LoginPage />} />
            <Route path="/admin/login" element={<LoginPage />} />
            <Route path="/moderator/login" element={<LoginPage />} />

            <Route path="/admin" element={<ProtectedRoute area="admin"><AdminLayout /></ProtectedRoute>}>
              {renderRoutes(admin)}
              <Route path="mapa-conductores" element={<Navigate to="/admin/mapa" replace />} />
            </Route>

            <Route path="/moderator" element={<ProtectedRoute area="moderator"><ModeratorLayout /></ProtectedRoute>}>
              {renderRoutes(moderator)}
            </Route>

            <Route path="/cliente" element={<ProtectedRoute area="cliente"><ClienteLayout /></ProtectedRoute>}>
              {renderRoutes(cliente)}
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}
