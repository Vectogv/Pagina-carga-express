import { useNavigate } from 'react-router-dom';
import './Header.css';

export default function Header({ title = '', subtitle = '', onMenuToggle = null, showBack = false }) {
  const navigate = useNavigate();

  return (
    <div className="header">
      <div className="header__left">
        {onMenuToggle && (
          <button className="header__menu" onClick={onMenuToggle} aria-label="Abrir menú">
            ☰
          </button>
        )}
        <div className="header__titles">
          <h1 className="header__title">{title}</h1>
          {subtitle && <p className="header__subtitle">{subtitle}</p>}
        </div>
      </div>
      {showBack && (
        <div className="header__actions">
          <button className="header__back" onClick={() => navigate('..')}>
            ← Volver
          </button>
        </div>
      )}
    </div>
  );
}