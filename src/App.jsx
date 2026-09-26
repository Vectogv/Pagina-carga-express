import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoadingState from './components/ui/LoadingState/LoadingState';

const AdminLayout = lazy(() => import('./layouts/AdminLayout'));
const ModeratorLayout = lazy(() => import('./layouts/ModeratorLayout'));
const LoginPage = lazy(() => import('./pages/admin/LoginPage'));

const admin = {
  index: lazy(() => import('./pages/admin/DashboardPage')),
  users: lazy(() => import('./pages/admin/UsersPage')),
  clients: lazy(() => import('./pages/admin/ClientsPage')),
  moderators: lazy(() => import('./pages/admin/ModeratorsPage')),
  drivers: lazy(() => import('./pages/admin/DriversPage')),
  trips: lazy(() => import('./pages/admin/TripsPage')),
  earnings: lazy(() => import('./pages/admin/EarningsPage')),
  commissions: lazy(() => import('./pages/admin/CommissionsPage')),
  payments: lazy(() => import('./pages/admin/PaymentsPage')),
  verifications: lazy(() => import('./pages/admin/VerificationsPage')),
  reports: lazy(() => import('./pages/admin/ReportsPage')),
  tickets: lazy(() => import('./pages/admin/TicketsPage')),
  disputes: lazy(() => import('./pages/admin/DisputesPage')),
  emergencies: lazy(() => import('./pages/admin/EmergenciesPage')),
  'cancellation-requests': lazy(() => import('./pages/admin/CancellationRequestsPage')),
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
  comunicados: lazy(() => import('./pages/moderator/ComunicadosPage')),
  encuestas: lazy(() => import('./pages/moderator/EncuestasPage')),
  avisos: lazy(() => import('./pages/moderator/AvisosPage')),
  profile: lazy(() => import('./pages/moderator/ProfilePage')),
  trips: lazy(() => import('./pages/moderator/TripsPage')),
  emergencies: lazy(() => import('./pages/moderator/EmergenciasPage')),
  tickets: lazy(() => import('./pages/moderator/TicketsPage')),
  conversations: lazy(() => import('./pages/moderator/ConversationsPage')),
  companeros: lazy(() => import('./pages/moderator/CompanerosPage')),
  reports: lazy(() => import('./pages/moderator/NotificacionesPage')),
};

const FullScreenLoader = () => (
  <div style={{ height: '100vh', display: 'grid', placeItems: 'center' }}>
    <LoadingState message="Cargando…" />
  </div>
);

function ProtectedRoute({ children, area }) {
  const { isAuthenticated, loading, user } = useAuth();
  if (loading) return <FullScreenLoader />;
  if (!isAuthenticated) return <Navigate to={area === 'moderator' ? '/moderator/login' : '/admin/login'} replace />;

  const isAdmin = user?.rol === 'admin';
  const isMod = Boolean(user?.esModerador);

  if (area === 'admin' && !isAdmin) return <Navigate to={isMod ? '/moderator' : '/admin/login'} replace />;
  if (area === 'moderator' && !isMod && !isAdmin) return <Navigate to="/admin/login" replace />;
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
            <Route path="/admin/login" element={<LoginPage />} />
            <Route path="/moderator/login" element={<LoginPage />} />

            <Route path="/admin" element={<ProtectedRoute area="admin"><AdminLayout /></ProtectedRoute>}>
              {renderRoutes(admin)}
            </Route>

            <Route path="/moderator" element={<ProtectedRoute area="moderator"><ModeratorLayout /></ProtectedRoute>}>
              {renderRoutes(moderator)}
            </Route>

            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}
