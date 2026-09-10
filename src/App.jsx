import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import AdminLayout from './layouts/AdminLayout'
import ModeratorLayout from './layouts/ModeratorLayout'
import LoginPage from './pages/admin/LoginPage'
import DashboardPage from './pages/admin/DashboardPage'
import UsersPage from './pages/admin/UsersPage'
import DriversPage from './pages/admin/DriversPage'
import TripsPage from './pages/admin/TripsPage'
import EarningsPage from './pages/admin/EarningsPage'
import CommissionsPage from './pages/admin/CommissionsPage'
import VerificationsPage from './pages/admin/VerificationsPage'
import ReportsPage from './pages/admin/ReportsPage'
import DisputesPage from './pages/admin/DisputesPage'
import EmergenciesPage from './pages/admin/EmergenciesPage'
import CancellationRequestsPage from './pages/admin/CancellationRequestsPage'
import ComunicadosPage from './pages/admin/ComunicadosPage'
import EncuestasPage from './pages/admin/EncuestasPage'
import ModeratorReportsPage from './pages/admin/ModeratorReportsPage'
import ConfigPage from './pages/admin/ConfigPage'
import ProfilePage from './pages/admin/ProfilePage'
import BackupsPage from './pages/admin/BackupsPage'
import PaymentsPage from './pages/admin/PaymentsPage'
import ModeratorsPage from './pages/admin/ModeratorsPage'
import ClientsPage from './pages/admin/ClientsPage'
import ModeratorDashboard from './pages/moderator/DashboardPage'
import ModeratorDrivers from './pages/moderator/DriversPage'
import ModeratorInactive from './pages/moderator/InactiveDriversPage'
import ModeratorComunicados from './pages/moderator/ComunicadosPage'
import ModeratorEncuestas from './pages/moderator/EncuestasPage'
import ModeratorAvisos from './pages/moderator/AvisosPage'
import ModeratorProfile from './pages/moderator/ProfilePage'
import ModeratorTrips from './pages/moderator/TripsPage'
import ModeratorEmergencias from './pages/moderator/EmergenciasPage'

function ProtectedRoute({ children, requireModerator, requireAdmin }) {
  const { isAuthenticated, loading, user } = useAuth()
  if (loading) return <div style={loadingStyle}>Cargando...</div>
  if (!isAuthenticated) return <Navigate to="/admin/login" replace />
  const isAdmin = user?.rol === 'admin' || user?.role === 'admin'
  const isMod = user?.esModerador || user?.es_moderador
  if (requireModerator && !isMod && !isAdmin) return <Navigate to="/admin" replace />
  if (requireModerator && isAdmin && !isMod) {
    // Admin sin ser moderador también puede ver moderador, pero si prefiere admin lo dejamos pasar
  }
  if (requireAdmin && !isAdmin) {
    if (isMod) return <Navigate to="/moderator" replace />
    return <Navigate to="/admin/login" replace />
  }
  // Si es moderador intentando entrar a /admin, redirige a /moderator
  if (!requireModerator && !requireAdmin) {
    // Ruta /admin sin flag: solo admin
    if (!isAdmin && isMod) return <Navigate to="/moderator" replace />
  }
  return children
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/admin/login" element={<LoginPage />} />
      <Route path="/moderator/login" element={<LoginPage />} />

      <Route
        path="/admin"
        element={
          <ProtectedRoute requireAdmin>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="clients" element={<ClientsPage />} />
        <Route path="moderators" element={<ModeratorsPage />} />
        <Route path="drivers" element={<DriversPage />} />
        <Route path="trips" element={<TripsPage />} />
        <Route path="earnings" element={<EarningsPage />} />
        <Route path="commissions" element={<CommissionsPage />} />
        <Route path="payments" element={<PaymentsPage />} />
        <Route path="verifications" element={<VerificationsPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="disputes" element={<DisputesPage />} />
        <Route path="emergencies" element={<EmergenciesPage />} />
        <Route path="cancellation-requests" element={<CancellationRequestsPage />} />
        <Route path="comunicados" element={<ComunicadosPage />} />
        <Route path="encuestas" element={<EncuestasPage />} />
        <Route path="moderator-reports" element={<ModeratorReportsPage />} />
        <Route path="config" element={<ConfigPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="backups" element={<BackupsPage />} />
      </Route>

      <Route
        path="/moderator"
        element={
          <ProtectedRoute requireModerator>
            <ModeratorLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<ModeratorDashboard />} />
        <Route path="drivers" element={<ModeratorDrivers />} />
        <Route path="drivers/inactive" element={<ModeratorInactive />} />
        <Route path="comunicados" element={<ModeratorComunicados />} />
        <Route path="encuestas" element={<ModeratorEncuestas />} />
        <Route path="avisos" element={<ModeratorAvisos />} />
        <Route path="profile" element={<ModeratorProfile />} />
        <Route path="trips" element={<ModeratorTrips />} />
        <Route path="emergencies" element={<ModeratorEmergencias />} />
      </Route>

      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}

const loadingStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: '100vh',
  background: '#020208',
  color: '#e2e8f0',
  fontSize: '18px',
}

export default App
