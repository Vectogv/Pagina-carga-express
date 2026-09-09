import { Outlet, useLocation, useNavigate, NavLink } from 'react-router-dom';
import Header from '../components/admin/Header';
import { useAuth } from '../contexts/AuthContext';

const theme = {
  bg: '#020208',
  cards: '#0f1220',
  accent: '#f59e0b',
  text: '#e2e8f0',
  muted: '#64748b',
  border: '#1e2238',
};

const navItems = [
  { icon: '📊', label: 'Dashboard', to: '/moderator' },
  { icon: '👥', label: 'Conductores', to: '/moderator/drivers' },
  { icon: '😴', label: 'Inactivos', to: '/moderator/drivers/inactive' },
  { icon: '📢', label: 'Comunicados', to: '/moderator/comunicados' },
  { icon: '📊', label: 'Encuestas', to: '/moderator/encuestas' },
  { icon: '📌', label: 'Avisos', to: '/moderator/avisos' },
  { icon: '👤', label: 'Mi Perfil', to: '/moderator/profile' },
];

const pathTitleMap = {
  '/moderator': 'Dashboard Moderador',
  '/moderator/drivers': 'Conductores',
  '/moderator/drivers/inactive': 'Inactivos',
  '/moderator/comunicados': 'Comunicados',
  '/moderator/encuestas': 'Encuestas',
  '/moderator/avisos': 'Avisos',
};

export default function ModeratorLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isDashboard = location.pathname === '/moderator';
  const pageTitle = pathTitleMap[location.pathname] || 'Moderador';

  return (
    <div style={styles.container}>
      <aside style={styles.sidebar}>
        <div style={styles.logo} onClick={() => navigate('/moderator')}>
          <span style={{ fontSize: 22 }}>🛡️</span>
          <div>
            <h1 style={styles.logoText}>Moderación</h1>
            <p style={styles.logoSub}>{user?.zonaModerador || user?.zona_moderador || '—'} • {user?.nombre || ''}</p>
          </div>
        </div>
        <nav style={styles.nav}>
          {navItems.map((item) => {
            const active = item.to === '/moderator' ? location.pathname === '/moderator' : location.pathname.startsWith(item.to);
            return (
              <NavLink key={item.to} to={item.to} end={item.to === '/moderator'} style={{ ...styles.navLink, ...(active ? styles.navLinkActive : {}) }}>
                <span style={styles.navIcon}>{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
        <div style={styles.bottom}>
          <button style={styles.logoutBtn} onClick={logout}>🚪 Cerrar Sesión</button>
        </div>
      </aside>

      <div style={styles.main}>
        <div style={styles.topBar}>
          <span style={styles.topTitle}>{pageTitle}</span>
          <div style={styles.topActions}>
            {!isDashboard && <button style={styles.backBtn} onClick={() => navigate('/moderator')}>← Panel</button>}
            <span style={styles.cityBadge}>{user?.zonaModerador || user?.zona_moderador || 'Sin zona'}</span>
            <button style={styles.logoutTop} onClick={logout}>Salir</button>
          </div>
        </div>
        <Header title={pageTitle} user={user} />
        <div style={styles.content}>
          <div style={styles.centered}><Outlet /></div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: { display: 'flex', height: '100vh', overflow: 'hidden', background: 'transparent' },
  sidebar: { width: 260, height: '100vh', background: '#070a12', borderRight: '1px solid #1e2238', display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0 },
  logo: { display: 'flex', alignItems: 'center', gap: 10, padding: '18px 16px', borderBottom: '1px solid #1e2238', cursor: 'pointer' },
  logoText: { fontSize: 15, fontWeight: 800, color: '#e2e8f0', margin: 0 },
  logoSub: { fontSize: 11, color: '#64748b', margin: 0, textTransform: 'capitalize' },
  nav: { flex: 1, overflowY: 'auto', padding: '10px 10px' },
  navLink: { display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', borderRadius: 8, color: '#64748b', fontSize: 13, fontWeight: 500, marginBottom: 2, textDecoration: 'none' },
  navLinkActive: { background: 'rgba(245,158,11,0.12)', color: '#f59e0b' },
  navIcon: { fontSize: 15, width: 20, textAlign: 'center' },
  bottom: { padding: 12, borderTop: '1px solid #1e2238' },
  logoutBtn: { width: '100%', padding: '8px 14px', borderRadius: 8, border: 'none', background: 'rgba(239,68,68,0.12)', color: '#ef4444', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  main: { flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', minWidth: 0, background: 'transparent' },
  topBar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1px solid #1e2238', background: 'rgba(7,10,18,0.85)', backdropFilter: 'blur(10px)', flexShrink: 0 },
  topTitle: { fontSize: 13, fontWeight: 700, color: '#e2e8f0' },
  topActions: { display: 'flex', alignItems: 'center', gap: 8 },
  backBtn: { padding: '5px 10px', borderRadius: 6, border: '1px solid #1e2238', background: '#0f1220', color: '#e2e8f0', fontSize: 12, cursor: 'pointer' },
  cityBadge: { fontSize: 11, fontWeight: 700, color: '#f59e0b', background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 20, padding: '3px 10px', textTransform: 'capitalize' },
  logoutTop: { padding: '5px 10px', borderRadius: 6, border: 'none', background: 'rgba(239,68,68,0.12)', color: '#ef4444', fontSize: 12, cursor: 'pointer' },
  content: { flex: 1, overflowY: 'auto', padding: 16, background: 'transparent', minHeight: 0 },
  centered: { maxWidth: 1100, margin: '0 auto', width: '100%' },
};
