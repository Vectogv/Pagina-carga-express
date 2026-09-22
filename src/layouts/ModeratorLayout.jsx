import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import Header from '../components/layout/Header';
import EmergencyBanner from '../components/moderator/EmergencyBanner';
import '../components/layout/Layout.css';
import { moderatorNav, findNavEntry } from '../components/layout/sidebarContent';
import { ModeratorBadgesProvider, useModeratorBadges } from '../contexts/ModeratorBadgesContext';
import { ModeratorCityProvider, useModeratorCity } from '../contexts/ModeratorCityContext';
import { useAuth } from '../contexts/AuthContext';

function CitySelector() {
  const { user } = useAuth();
  const isAdmin = user?.rol === 'admin' || user?.role === 'admin';
  const { ciudad, setCiudad, zonas } = useModeratorCity();
  if (!isAdmin) return null;
  return (
    <select
      className="topbar__select"
      value={ciudad}
      onChange={(e) => setCiudad(e.target.value)}
      aria-label="Ciudad"
    >
      <option value="general">General (todas)</option>
      {zonas.map((z) => (
        <option key={z.value} value={z.value}>{z.label}</option>
      ))}
    </select>
  );
}

function ModeratorShell() {
  const location = useLocation();
  const { emergencyBadge, unreadBadge, clearEmergency, clearUnread } = useModeratorBadges();
  const { isAdmin, ciudadLabel } = useModeratorCity();
  const [menuOpen, setMenuOpen] = useState(false);

  // Al entrar a cada sección, su badge se pone en 0 (los mensajes/hilos leídos se marcan en el backend).
  useEffect(() => {
    if (location.pathname === '/moderator/emergencies') clearEmergency();
    if (location.pathname === '/moderator/conversations') clearUnread();
  }, [location.pathname, clearEmergency, clearUnread]);

  const badges = {
    '/moderator/emergencies': emergencyBadge,
    '/moderator/conversations': unreadBadge,
  };

  const { group, label } = findNavEntry(moderatorNav, location.pathname);

  return (
    <div className="app-shell">
      <Sidebar
        nav={moderatorNav}
        title="Carga Express"
        subtitle={isAdmin ? `Moderación · ${ciudadLabel}` : 'Moderación'}
        badges={badges}
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
      />
      <div className="app-main">
        <Header section={group} title={label} onMenuToggle={() => setMenuOpen(true)} right={<CitySelector />} />
        <main className="app-content">
          <div className="app-centered">
            <div className="app-emergency">
              <EmergencyBanner />
            </div>
            <Outlet />
          </div>
        </main>
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