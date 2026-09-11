import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import Header from '../components/layout/Header';
import EmergencyBanner from '../components/moderator/EmergencyBanner';
import '../components/layout/Layout.css';
import { moderatorNavItems } from '../components/layout/sidebarContent';
import { ModeratorBadgesProvider, useModeratorBadges } from '../contexts/ModeratorBadgesContext';
import { ModeratorCityProvider, useModeratorCity } from '../contexts/ModeratorCityContext';
import { MODERATOR_CITY_LABELS } from '../constants/cities';
import { useAuth } from '../contexts/AuthContext';

const pathTitleMap = {
  '/moderator': 'Dashboard',
  '/moderator/drivers': 'Conductores',
  '/moderator/drivers/inactive': 'Conductores Inactivos',
  '/moderator/trips': 'Viajes',
  '/moderator/emergencies': 'Emergencias',
  '/moderator/companeros': 'Compañeros (contactables)',
  '/moderator/conversations': 'Conversatorio',
  '/moderator/comunicados': 'Comunicados',
  '/moderator/encuestas': 'Encuestas',
  '/moderator/avisos': 'Avisos',
  '/moderator/reports': 'Notificaciones',
  '/moderator/profile': 'Mi Perfil',
};

function CitySelector() {
  const { user } = useAuth();
  const isAdmin = user?.rol === 'admin' || user?.role === 'admin';
  const { ciudad, setCiudad } = useModeratorCity();
  if (!isAdmin) return null;
  return (
    <select
      value={ciudad}
      onChange={(e) => setCiudad(e.target.value)}
      aria-label="Ciudad"
      style={{
        padding: '7px 12px',
        borderRadius: 8,
        border: '1px solid #1e2238',
        backgroundColor: '#0f1220',
        color: '#e2e8f0',
        fontSize: 13,
        fontWeight: 600,
        cursor: 'pointer',
      }}
    >
      {Object.entries(MODERATOR_CITY_LABELS).map(([key, label]) => (
        <option key={key} value={key}>{label}</option>
      ))}
    </select>
  );
}

function ModeratorShell() {
  const location = useLocation();
  const { emergencyBadge, unreadBadge, clearEmergency, clearUnread } = useModeratorBadges();
  const { isAdmin, ciudadLabel } = useModeratorCity();

  // Al entrar a cada sección, su badge se pone en 0 (los mensajes/hilos leídos se marcan en el backend).
  useEffect(() => {
    if (location.pathname === '/moderator/emergencies') clearEmergency();
    if (location.pathname === '/moderator/conversations') clearUnread();
  }, [location.pathname, clearEmergency, clearUnread]);

  const badges = {
    '/moderator/emergencies': emergencyBadge,
    '/moderator/conversations': unreadBadge,
  };

  const isEmptyLabel = (label) => label === 'Dashboard' && location.pathname !== '/moderator';

  const pageTitle = pathTitleMap[location.pathname] || (location.pathname.split('/').pop().replace(/-/g, ' ').replace(/^\w/, (c) => c.toUpperCase()));
  const isHome = location.pathname === '/moderator';

  return (
    <div className="app-shell">
      <Sidebar
        items={moderatorNavItems}
        title="Moderación"
        subtitle={isAdmin ? `Carga Express · Viendo: ${ciudadLabel}` : 'Carga Express'}
        badges={badges}
      />
      <div className="app-main">
        <Header
          title={isEmptyLabel(pageTitle) ? 'Dashboard' : pageTitle}
          subtitle={!isHome ? undefined : 'Centro de Control Operativo'}
          showBack={!isHome}
          right={<CitySelector />}
        />
        <div className="app-content">
          <div className="app-centered">
            <div className="app-emergency">
              <EmergencyBanner />
            </div>
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ModeratorLayout() {
  return (
    <ModeratorBadgesProvider>
      <ModeratorCityProvider>
        <ModeratorShell />
      </ModeratorCityProvider>
    </ModeratorBadgesProvider>
  );
}