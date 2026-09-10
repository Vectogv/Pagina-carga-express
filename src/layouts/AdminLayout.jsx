import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import Header from '../components/layout/Header';
import '../components/layout/Layout.css';
import { adminNavItems } from '../components/layout/sidebarContent';

const pathTitleMap = {
  '/admin': 'Dashboard',
  '/admin/users': 'Usuarios',
  '/admin/drivers': 'Conductores',
  '/admin/trips': 'Viajes',
  '/admin/earnings': 'Ganancias',
  '/admin/commissions': 'Comisiones',
  '/admin/verifications': 'Verificaciones',
  '/admin/reports': 'Reportes',
  '/admin/disputes': 'Disputas',
  '/admin/emergencies': 'Emergencias',
  '/admin/cancellation-requests': 'Cancelaciones',
  '/admin/comunicados': 'Comunicados',
  '/admin/encuestas': 'Encuestas',
  '/admin/moderator-reports': 'Reportes Moderador',
  '/admin/config': 'Configuración',
  '/admin/backups': 'Backups',
  '/admin/profile': 'Mi Perfil',
  '/admin/payments': 'Pagos',
  '/admin/moderators': 'Moderadores',
  '/admin/clients': 'Clientes',
};

function AdminLayout() {
  const location = useLocation();
  const isDashboard = location.pathname === '/admin';
  const pageTitle = pathTitleMap[location.pathname] || location.pathname.split('/').pop().replace(/-/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

  return (
    <div className="app-shell">
      <Sidebar items={adminNavItems} title="Carga Express" subtitle="Panel Administrativo" />
      <div className="app-main">
        <Header
          title={pageTitle}
          subtitle={isDashboard ? 'Visión general de la operación' : undefined}
          showBack={!isDashboard}
        />
        <div className="app-content">
          <div className="app-centered">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminLayout;