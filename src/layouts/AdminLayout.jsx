import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Header from '../components/admin/Header';
import { useAuth } from '../contexts/AuthContext';

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
};

function AdminLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isDashboard = location.pathname === '/admin';

  const pageTitle =
    pathTitleMap[location.pathname] ||
    location.pathname
      .split('/')
      .pop()
      .replace(/-/g, ' ')
      .replace(/^\w/, (c) => c.toUpperCase());

  return (
    <div style={styles.container}>
      <div style={styles.main}>
        <div style={styles.topBar}>
          <div style={styles.logo} onClick={() => navigate('/admin')}>
            <span style={styles.logoIcon}>🚛</span>
            <span style={styles.logoText}>Carga Express</span>
            <span style={styles.logoBadge}>ADMIN</span>
          </div>
          <div style={styles.topActions}>
            {!isDashboard && (
              <button style={styles.backBtn} onClick={() => navigate('/admin')}>
                ← Panel
              </button>
            )}
            <span style={styles.userName}>{user?.nombre || user?.email || 'Admin'}</span>
            <button style={styles.logoutBtn} onClick={logout}>
              Cerrar Sesión
            </button>
          </div>
        </div>
        <Header title={pageTitle} user={user} />
        <div style={styles.content}>
          <div style={styles.centered}>
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    height: '100vh',
    overflow: 'hidden',
    background: 'transparent',
    justifyContent: 'center',
  },
  main: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    overflow: 'hidden',
    maxWidth: 1280,
    width: '100%',
    background: 'transparent',
  },
  topBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 24px',
    borderBottom: '1px solid #1e2238',
    background: 'rgba(7,10,18,0.85)',
    backdropFilter: 'blur(10px)',
    flexShrink: 0,
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    cursor: 'pointer',
  },
  logoIcon: { fontSize: 24 },
  logoText: { fontSize: 16, fontWeight: 800, color: '#e2e8f0', letterSpacing: '-0.02em' },
  logoBadge: {
    fontSize: 10,
    fontWeight: 800,
    color: '#6366f1',
    background: 'rgba(99,102,241,0.15)',
    border: '1px solid rgba(99,102,241,0.3)',
    borderRadius: 6,
    padding: '2px 6px',
    letterSpacing: '0.08em',
  },
  topActions: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    padding: '6px 14px',
    borderRadius: 8,
    border: '1px solid #1e2238',
    background: '#0f1220',
    color: '#e2e8f0',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  },
  userName: {
    fontSize: 13,
    color: '#64748b',
    maxWidth: 160,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  logoutBtn: {
    padding: '6px 14px',
    borderRadius: 8,
    border: 'none',
    background: 'rgba(239,68,68,0.15)',
    color: '#ef4444',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  },
  content: {
    flex: 1,
    overflowY: 'auto',
    overflowX: 'hidden',
    padding: 24,
    background: 'transparent',
    minHeight: 0,
    display: 'flex',
    justifyContent: 'center',
  },
  centered: {
    width: '100%',
    maxWidth: 1180,
  },
};

export default AdminLayout;
