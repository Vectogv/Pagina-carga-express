import { useCallback, useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import Header from '../components/layout/Header';
import EmergencyBanner from '../components/moderator/EmergencyBanner';
import AlertaViajeBanner from '../components/moderator/AlertaViajeBanner';
import AvisoVerificacionBanner from '../components/moderator/AvisoVerificacionBanner';
import '../components/layout/Layout.css';
import { moderatorNav, findNavEntry, tituloPerfil } from '../components/layout/sidebarContent';
import { useZonas, zonaLabelFrom } from '../hooks/useZonas';
import '../components/panel/panel.css';
import { ModeratorBadgesProvider, useModeratorBadges } from '../contexts/ModeratorBadgesContext';
import { ModeratorCityProvider, useModeratorCity } from '../contexts/ModeratorCityContext';
import { useAuth } from '../contexts/AuthContext';
import ModeradorBloqueado from '../components/moderator/ModeradorBloqueado';
import { getMiVerificacion } from '../api/contrato';
import { Button, LoadingState } from '../components/ui';
import { errorMessage } from '../utils/format';

// Admin: elige la ciudad. Moderador real: ve su zona fija (el backend la impone).
function CitySelector() {
  const { user } = useAuth();
  const isAdmin = user?.rol === 'admin' || user?.role === 'admin';
  const { ciudad, setCiudad, zonas } = useModeratorCity();
  const todasZonas = useZonas();
  if (!isAdmin) {
    if (!user?.zonaModerador) return null;
    return <span className="topbar__zona">Zona: {zonaLabelFrom(todasZonas, user.zonaModerador)}</span>;
  }
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
  const [menuOpen, setMenuOpen] = useState(false);

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

  const { group, label } = tituloPerfil(location.pathname) || findNavEntry(moderatorNav, location.pathname);

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
              <AlertaViajeBanner />
              <AvisoVerificacionBanner />
            </div>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

/**
 * Puerta del panel: un moderador sin zona o sin contrato aprobado y vigente ve la
 * pantalla de bloqueo (con el asistente de verificación) en vez del panel. El admin pasa directo.
 * Si una llamada responde 403 MODERADOR_* (p. ej. el contrato venció con el panel abierto),
 * axios avisa con el evento 'moderador-bloqueado' y se vuelve a consultar.
 */
export default function ModeratorLayout() {
  const { isAdmin, logout } = useAuth();
  const [verif, setVerif] = useState(null);
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    try {
      const { data } = await getMiVerificacion();
      setVerif(data);
      setError('');
    } catch (err) {
      setError(errorMessage(err, 'No se pudo comprobar tu acceso'));
    }
  }, []);

  useEffect(() => {
    if (isAdmin) return undefined;
    cargar();
    window.addEventListener('moderador-bloqueado', cargar);
    return () => window.removeEventListener('moderador-bloqueado', cargar);
  }, [isAdmin, cargar]);

  if (!isAdmin) {
    if (error && !verif) {
      return (
        <div style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: 16, textAlign: 'center' }}>
          <div>
            <p className="page-error" role="alert">{error}</p>
            <Button onClick={cargar}>Reintentar</Button>
          </div>
        </div>
      );
    }
    if (!verif) {
      return <div style={{ height: '100dvh', display: 'grid', placeItems: 'center' }}><LoadingState message="Comprobando tu acceso…" /></div>;
    }
    if (verif.bloqueo) return <ModeradorBloqueado data={verif} onRefresh={cargar} onLogout={logout} />;
  }

  return (
    // La ciudad va por fuera: los badges (cierres) usan la ciudad elegida por el admin.
    <ModeratorCityProvider>
      <ModeratorBadgesProvider>
        <ModeratorShell />
      </ModeratorBadgesProvider>
    </ModeratorCityProvider>
  );
}