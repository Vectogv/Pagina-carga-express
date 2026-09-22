import { Menu, ChevronRight } from 'lucide-react';
import './Header.css';

/** Barra superior: menú móvil, ruta (sección › página) y acciones globales. */
export default function Header({ section, title, onMenuToggle, right }) {
  return (
    <header className="topbar">
      <div className="topbar__left">
        <button type="button" className="topbar__menu" onClick={onMenuToggle} aria-label="Abrir menú">
          <Menu size={20} />
        </button>
        <nav className="topbar__crumbs" aria-label="Ruta">
          {section && (
            <>
              <span className="topbar__crumb">{section}</span>
              <ChevronRight size={14} className="topbar__sep" />
            </>
          )}
          <span className="topbar__crumb topbar__crumb--current">{title}</span>
        </nav>
      </div>
      {right && <div className="topbar__actions">{right}</div>}
    </header>
  );
}
