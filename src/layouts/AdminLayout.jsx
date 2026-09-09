import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Header from '../components/admin/Header';
import { useAuth } from '../contexts/AuthContext';

const theme = {
  bg: '#0a0e14',
  cards: '#111827',
  accent: '#22c55e',
  text: '#f1f5f9',
  muted: '#94a3b8',
  border: '#1e293b',
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
  const pageTitle = pathTitleMap[location.pathname] || location.pathname.split('/').pop().replace(/-/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

  return (
    <div style={styles.container}>
      <div style={styles.bgPattern} />
      <div style={styles.main}>
        <div style={styles.topBar}>
          <div style={styles.logo} onClick={() => navigate('/admin')}>
            <div style={styles.logoIconWrap}>
              <span style={styles.logoIcon}>🚚</span>
            </div>
            <span style={styles.logoText}>Carga Express</span>
            <span style={styles.logoBadge}>ADMIN</span>
          </div>
          <div style={styles.topActions}>
            {!isDashboard && (
              <button style={styles.backBtn} onClick={() => navigate('/admin')}>
                ← Panel
              </button>
            )}
            <div style={styles.userBlock}>
              <img
                src={`https://i.pravatar.cc/100?u=${user?.email || 'admin'}`}
                alt="AD"
                style={styles.avatar}
                onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'flex'; }}
              />
              <div style={{ ...styles.avatarFallback, display: 'none' }}>AD</div>
              <div style={styles.userInfo}>
                <span style={styles.userName}>Alejandra Díaz</span>
                <span style={styles.userRole}>{user?.rol === 'admin' ? 'Admin' : user?.rol || 'Admin'}</span>
              </div>
            </div>
            <button style={styles.logoutBtn} onClick={logout}>
              <span>↪</span> Cerrar Sesión
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
    background: '#0a0e14',
    justifyContent: 'center',
    position: 'relative',
  },
  bgPattern: {
    position: 'fixed',
    inset: 0,
    background: `
      radial-gradient(ellipse 800px 400px at 20% 0%, rgba(34,197,94,0.04), transparent 60%),
      radial-gradient(ellipse 600px 300px at 80% 30%, rgba(99,102,241,0.03), transparent 60%),
      radial-gradient(circle, rgba(255,255,255,0.025) 1px, transparent 1px)
    `,
    backgroundSize: 'auto, auto, 24px 24px',
    pointerEvents: 'none',
    zIndex: 0,
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
    position: 'relative',
    zIndex: 1,
  },
  topBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 20px',
    borderBottom: '1px solid #1e293b',
    background: 'rgba(17,24,39,0.85)',
    backdropFilter: 'blur(12px)',
    flexShrink: 0,
  },
  logo: { display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' },
  logoIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 12px rgba(34,197,94,0.25)',
  },
  logoIcon: { fontSize: 18, filter: 'brightness(1.1)' },
  logoText: { fontSize: 16, fontWeight: 800, color: '#f1f5f9', letterSpacing: '-0.02em' },
  logoBadge: {
    fontSize: 9,
    fontWeight: 800,
    color: '#60a5fa',
    background: 'rgba(59,130,246,0.12)',
    border: '1px solid rgba(59,130,246,0.25)',
    borderRadius: 6,
    padding: '3px 7px',
    letterSpacing: '0.1em',
  },
  topActions: { display: 'flex', alignItems: 'center', gap: 14 },
  backBtn: {
    padding: '6px 12px',
    borderRadius: 8,
    border: '1px solid #1e293b',
    background: '#1e293b',
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
  },
  userBlock: { display: 'flex', alignItems: 'center', gap: 10 },
  avatar: { width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', border: '2px solid #334155' },
  avatarFallback: {
    width: 36,
    height: 36,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 12,
    fontWeight: 700,
  },
  userInfo: { display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1.2 },
  userName: { fontSize: 13, fontWeight: 600, color: '#f1f5f9' },
  userRole: { fontSize: 11, color: '#94a3b8' },
  logoutBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '7px 14px',
    borderRadius: 8,
    border: 'none',
    background: 'linear-gradient(135deg, #ef4444, #dc2626)',
    color: '#fff',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(239,68,68,0.25)',
  },
  content: {
    flex: 1,
    overflowY: 'auto',
    overflowX: 'hidden',
    padding: 20,
    background: 'transparent',
    minHeight: 0,
    display: 'flex',
    justifyContent: 'center',
  },
  centered: { width: '100%', maxWidth: 1180 },
};

export default AdminLayout;
