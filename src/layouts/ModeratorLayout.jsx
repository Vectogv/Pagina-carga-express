import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import Header from '../components/layout/Header';
import EmergencyBanner from '../components/moderator/EmergencyBanner';
import '../components/layout/Layout.css';
import { moderatorNavItems } from '../components/layout/sidebarContent';

const pathTitleMap = {
  '/moderator': 'Dashboard',
  '/moderator/drivers': 'Conductores',
  '/moderator/drivers/inactive': 'Conductores Inactivos',
  '/moderator/trips': 'Viajes',
  '/moderator/emergencies': 'Emergencias',
  '/moderator/conversations': 'Conversatorio',
  '/moderator/comunicados': 'Comunicados',
  '/moderator/encuestas': 'Encuestas',
  '/moderator/avisos': 'Avisos',
  '/moderator/profile': 'Mi Perfil',
};

export default function ModeratorLayout() {
  const location = useLocation();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const fetchUnread = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) return;
        const res = await fetch('/api/moderator/conversations/unread-count', { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) { const d = await res.json(); if (!cancelled) setUnread(d.total ?? d.count ?? 0); }
      } catch { /* ignore */ }
    };
    fetchUnread();
    const id = setInterval(fetchUnread, 60000);
    const token = localStorage.getItem('accessToken');
    if (token) {
      import('socket.io-client').then(({ io }) => {
        const socket = io('https://bakend-cargaexpress-production.up.railway.app', { transports: ['websocket'], auth: { token: `Bearer ${token}` }, query: { token: `Bearer ${token}` } });
        socket.on('conversation:message', () => fetchUnread());
      });
    }
    return () => { cancelled = true; clearInterval(id); };
  }, [location.pathname]);

  const isEmptyLabel = (label) => label === 'Dashboard' && location.pathname !== '/moderator';

  const pageTitle = pathTitleMap[location.pathname] || (location.pathname.split('/').pop().replace(/-/g, ' ').replace(/^\w/, (c) => c.toUpperCase()));
  const isHome = location.pathname === '/moderator';

  return (
    <div className="app-shell">
      <Sidebar
        items={moderatorNavItems.map((i) => i.to === '/moderator/conversations' ? { ...i, showUnread: true } : i)}
        title="Moderación"
        subtitle="Carga Express"
        unreadCount={unread}
      />
      <div className="app-main">
        <Header title={isEmptyLabel(pageTitle) ? 'Dashboard' : pageTitle} subtitle={!isHome ? undefined : 'Panel del moderador'} showBack={!isHome} />
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