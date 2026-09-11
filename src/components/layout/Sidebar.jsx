import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './Sidebar.css';

export default function Sidebar({ items = [], title = 'Carga Express', subtitle = '', badges = {} }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const displayName = user?.nombre || user?.name || '';
  const roleLabel = user?.rol === 'admin' ? 'Administrador' : user?.esModerador ? 'Moderador' : user?.rol || 'Usuario';
  const city = user?.zonaModerador || user?.zona_moderador || '';

  return (
    <aside className="sidebar">
      <div className="sidebar__header" onClick={() => navigate(items[0]?.to || '/')} style={{ cursor: 'pointer' }}>
        <div className="sidebar__logo-icon">
          <span className="sidebar__logo-emoji">{user?.esModerador ? '🛡️' : '🚚'}</span>
        </div>
        <div>
          <h1 className="sidebar__title">{title}</h1>
          <p className="sidebar__subtitle">{subtitle || roleLabel}{city ? ` · ${city}` : ''}</p>
        </div>
      </div>

      <nav className="sidebar__nav">
        {items.map((item) => {
          const isActive = item.to === '/'
            ? location.pathname === item.to
            : location.pathname.startsWith(item.to);
          const badgeCount = badges[item.to] || 0;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={`sidebar__link ${isActive ? 'sidebar__link--active' : ''}`}
            >
              <span className="sidebar__icon">{item.icon}</span>
              <span className="sidebar__label">{item.label}</span>
              {item.badge && <span className="sidebar__badge">{item.badge}</span>}
              {badgeCount > 0 && <span className="sidebar__unread">{badgeCount}</span>}
            </NavLink>
          );
        })}
      </nav>

      <div className="sidebar__footer">
        <div className="sidebar__user">
          <img
            src={`https://i.pravatar.cc/100?u=${user?.email || 'user'}`}
            alt={displayName}
            className="sidebar__avatar"
            onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling.style.display = 'flex'; }}
          />
          <div className="sidebar__avatar-fallback" style={{ display: 'none' }}>
            {(displayName || roleLabel).slice(0, 2).toUpperCase()}
          </div>
          <div className="sidebar__user-info">
            <span className="sidebar__user-name">{displayName || roleLabel}</span>
            <span className="sidebar__user-role">{roleLabel}</span>
          </div>
        </div>
        <button className="sidebar__logout" onClick={logout}>
          <span>↪</span> Cerrar Sesión
        </button>
      </div>
    </aside>
  );
}
