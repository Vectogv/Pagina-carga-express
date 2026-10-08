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
  const {
    emergencyBadge, closuresBadge, unreadBadge, ticketBadge, pendingDriversBadge, clearUnread,
  } = useModeratorBadges();
  const { isAdmin, ciudadLabel } = useModeratorCity();
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  // Un moderador sin zona asignada recibe 403 en casi todos los endpoints
  // (el backend lo exige). Se avisa una sola vez aquí, en el layout, en vez
  // de repetir el manejo del 403 en cada página.
  const sinZona = !isAdmin && Boolean(user?.esModerador) && !user?.zonaModerador;

  // Al entrar al Conversatorio su badge se pone en 0 (los hilos leídos se marcan en el backend).
  // Emergencias, Cierres y Tickets NO se limpian al entrar: cuentan casos abiertos y bajan
  // solo cuando se atienden/resuelven (el backend manda).
  useEffect(() => {
    if (location.pathname === '/moderator/conversations') clearUnread();
  }, [location.pathname, clearUnread]);

  const badges = {
    '/moderator/emergencies': emergencyBadge,
    '/moderator/cierres': closuresBadge,
    '/moderator/conversations': unreadBadge,
    // Tickets abiertos sin atender: baja solo cuando alguien los toma (el backend manda).
    '/moderator/tickets': ticketBadge,
    // Conductores pendientes de verificar en la zona.
    '/moderator/drivers': pendingDriversBadge,
  };

  const nav = findNavEntry(moderatorNav, location.pathname);
  // La ficha (/moderator/drivers/:id) no está en el menú: cuelga de "Conductores".
  const esFicha = /^\/moderator\/drivers\/\d+/.test(location.pathname);
  const group = esFicha ? 'Conductores' : nav.group;
  const label = esFicha ? 'Ficha del conductor' : nav.label;

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
            {sinZona && (
              <div className="page-error" role="alert">
                Tu cuenta de moderador no tiene una ciudad asignada. La mayoría de las secciones no van a
                cargar datos hasta que un administrador te asigne una zona.
              </div>
            )}
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

export default function ModeratorLayout() {
  return (
    // La ciudad va por fuera: los badges (cierres) usan la ciudad elegida por el admin.
    <ModeratorCityProvider>
      <ModeratorBadgesProvider>
        <ModeratorShell />
      </ModeratorBadgesProvider>
    </ModeratorCityProvider>
  );
}