import { NavLink, useLocation } from 'react-router-dom';

const theme = {
  bg: '#020208',
  sidebar: '#070a12',
  cards: '#0f1220',
  accent: '#6366f1',
  text: '#e2e8f0',
  muted: '#64748b',
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
  border: '#1e2238',
};

const navItems = [
  { icon: '📊', label: 'Dashboard', to: '/admin' },
  { icon: '👥', label: 'Usuarios', to: '/admin/users' },
  { icon: '🚗', label: 'Conductores', to: '/admin/drivers' },
  { icon: '🛣️', label: 'Viajes', to: '/admin/trips' },
  { icon: '💰', label: 'Ganancias', to: '/admin/earnings' },
  { icon: '💳', label: 'Comisiones', to: '/admin/commissions' },
  { icon: '📄', label: 'Verificaciones', to: '/admin/verifications' },
  { icon: '⚠️', label: 'Reportes', to: '/admin/reports' },
  { icon: '⚖️', label: 'Disputas', to: '/admin/disputes' },
  { icon: '🚨', label: 'Emergencias', to: '/admin/emergencies' },
  { icon: '🚫', label: 'Cancelaciones', to: '/admin/cancellation-requests' },
  { icon: '📢', label: 'Comunicados', to: '/admin/comunicados' },
  { icon: '📋', label: 'Encuestas', to: '/admin/encuestas' },
  { icon: '📈', label: 'Reportes Moderador', to: '/admin/moderator-reports' },
  { icon: '⚙️', label: 'Configuración', to: '/admin/config' },
  { icon: '💾', label: 'Backups', to: '/admin/backups' },
  { icon: '👤', label: 'Mi Perfil', to: '/admin/profile' },
];

const styles = {
  sidebar: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: 260,
    height: '100vh',
    backgroundColor: theme.sidebar,
    borderRight: `1px solid ${theme.border}`,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    zIndex: 100,
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '20px 24px',
    borderBottom: `1px solid ${theme.border}`,
    flexShrink: 0,
  },
  logoIcon: {
    fontSize: 14,
  },
  logoText: {
    fontSize: 18,
    fontWeight: 700,
    color: theme.text,
    margin: 0,
    letterSpacing: '-0.02em',
  },
  nav: {
    flex: 1,
    overflowY: 'auto',
    padding: '12px 12px',
    scrollbarWidth: 'thin',
    scrollbarColor: `${theme.border} transparent`,
  },
  navLink: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '10px 16px',
    borderRadius: 8,
    textDecoration: 'none',
    color: theme.muted,
    fontSize: 13,
    fontWeight: 500,
    marginBottom: 2,
    transition: 'all 0.15s ease',
    cursor: 'pointer',
  },
  navLinkActive: {
    backgroundColor: `${theme.accent}20`,
    color: theme.accent,
  },
  navIcon: {
    fontSize: 14,
    width: 22,
    textAlign: 'center',
    flexShrink: 0,
  },
  bottom: {
    padding: 16,
    borderTop: `1px solid ${theme.border}`,
    flexShrink: 0,
  },
  logoutButton: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    width: '100%',
    padding: '10px 16px',
    borderRadius: 8,
    border: 'none',
    backgroundColor: `${theme.danger}15`,
    color: theme.danger,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
};

function Sidebar({ onLogout }) {
  const location = useLocation();

  const isActive = (to) => {
    if (to === '/admin') return location.pathname === '/admin';
    return location.pathname.startsWith(to);
  };

  return (
    <aside style={styles.sidebar}>
      <div style={styles.logo}>
        <span style={styles.logoIcon}>🚛</span>
        <h1 style={styles.logoText}>Carga Express</h1>
      </div>

      <nav style={styles.nav}>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/admin'}
            style={({ isHovered }) => ({
              ...styles.navLink,
              ...(isActive(item.to) ? styles.navLinkActive : {}),
              ...(isHovered && !isActive(item.to)
                ? { backgroundColor: `${theme.cards}`, color: theme.text }
                : {}),
            })}
          >
            <span style={styles.navIcon}>{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div style={styles.bottom}>
        <button
          style={styles.logoutButton}
          onClick={onLogout}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = `${theme.danger}30`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = `${theme.danger}15`;
          }}
        >
          <span style={{ fontSize: 14 }}>🚪</span>
          <span>Cerrar Sesión</span>
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
