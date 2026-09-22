import { NavLink, useLocation } from 'react-router-dom';
import { LogOut, Truck } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import Avatar from '../ui/Avatar/Avatar';
import { fullName } from '../../utils/format';
import './Sidebar.css';

const isItemActive = (item, pathname) =>
  item.end ? pathname === item.to : pathname === item.to || pathname.startsWith(`${item.to}/`);

export default function Sidebar({ nav = [], title = 'Carga Express', subtitle = '', badges = {}, open = false, onClose }) {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();

  const displayName = fullName(user);
  const roleLabel = user?.rol === 'admin' ? 'Administrador' : user?.esModerador ? 'Moderador' : 'Usuario';

  return (
    <>
      <div className={`sidebar__backdrop ${open ? 'sidebar__backdrop--visible' : ''}`} onClick={onClose} aria-hidden="true" />
      <aside className={`sidebar ${open ? 'sidebar--open' : ''}`} aria-label="Navegación principal">
        <div className="sidebar__brand">
          <div className="sidebar__logo"><Truck size={18} strokeWidth={2.2} /></div>
          <div className="sidebar__brand-text">
            <span className="sidebar__title">{title}</span>
            {subtitle && <span className="sidebar__subtitle">{subtitle}</span>}
          </div>
        </div>

        <nav className="sidebar__nav">
          {nav.map((group, gi) => (
            <div key={group.title || gi} className="sidebar__group">
              {group.title && <span className="sidebar__group-title">{group.title}</span>}
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = isItemActive(item, pathname);
                const count = badges[item.to] || 0;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={`sidebar__link ${active ? 'sidebar__link--active' : ''}`}
                    aria-current={active ? 'page' : undefined}
                    onClick={() => onClose?.()}
                  >
                    <Icon size={17} className="sidebar__icon" />
                    <span className="sidebar__label">{item.label}</span>
                    {count > 0 && <span className="sidebar__count">{count > 99 ? '99+' : count}</span>}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="sidebar__footer">
          <div className="sidebar__user">
            <Avatar src={user?.avatar || user?.fotoPerfil} name={displayName} size={32} />
            <div className="sidebar__user-info">
              <span className="sidebar__user-name">{displayName}</span>
              <span className="sidebar__user-role">{roleLabel}</span>
            </div>
            <button type="button" className="sidebar__logout" onClick={logout} aria-label="Cerrar sesión" title="Cerrar sesión">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
