import { useNavigate } from 'react-router-dom';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import './StatCard.css';

/** Tarjeta KPI. `icon` es un elemento de lucide-react; `color` una variable CSS (p. ej. 'var(--success)'). */
export default function StatCard({ title, value, icon, color, subtitle, trend, trendUp, to, onClick }) {
  const navigate = useNavigate();
  const clickable = Boolean(to || onClick);
  const Tag = clickable ? 'button' : 'div';

  const handleClick = () => {
    if (onClick) onClick();
    else if (to) navigate(to);
  };

  return (
    <Tag
      type={clickable ? 'button' : undefined}
      className="stat"
      onClick={clickable ? handleClick : undefined}
      style={color ? { '--stat-color': color } : undefined}
    >
      <div className="stat__top">
        <span className="stat__label">{title}</span>
        {icon && <span className="stat__icon">{icon}</span>}
      </div>
      <span className="stat__value">{value ?? '—'}</span>
      {(subtitle || trend) && (
        <div className="stat__bottom">
          {trend && (
            <span className={`stat__trend ${trendUp ? 'stat__trend--up' : 'stat__trend--down'}`}>
              {trendUp ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
              {trend}
            </span>
          )}
          {subtitle && <span className="stat__subtitle">{subtitle}</span>}
        </div>
      )}
    </Tag>
  );
}
