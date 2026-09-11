import { useNavigate } from 'react-router-dom';

const styles = {
  card: {
    backgroundColor: 'var(--bg-surface)',
    borderRadius: 'var(--radius-lg)',
    padding: 'var(--space-5)',
    border: '1px solid var(--border)',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-3)',
    transition: 'border-color var(--transition-fast), transform var(--transition-fast), box-shadow var(--transition-fast)',
    cursor: 'default',
    minWidth: 0,
  },
  topRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 12,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 16,
    flexShrink: 0,
  },
  trendBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '4px 10px',
    borderRadius: 'var(--radius-pill)',
    fontSize: 'var(--text-xs)',
    fontWeight: 'var(--font-semibold)',
  },
  title: {
    fontSize: 'var(--text-xs)',
    fontWeight: 'var(--font-semibold)',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    margin: 0,
  },
  value: {
    fontSize: 'var(--text-2xl)',
    fontWeight: 'var(--font-extrabold)',
    color: 'var(--text-primary)',
    margin: 0,
    lineHeight: 1.1,
  },
  subtitle: {
    fontSize: 'var(--text-sm)',
    color: 'var(--text-secondary)',
    margin: 0,
  },
};

function StatsCard({ title, value, icon, color, subtitle = null, trend, trendUp, to, onClick }) {
  const navigate = useNavigate();
  const accentColor = color || 'var(--primary)';
  const clickable = !!(to || onClick);

  const handleClick = () => {
    if (onClick) return onClick();
    if (to) navigate(to);
  };

  const trendStyles = trend
    ? {
        ...styles.trendBadge,
        backgroundColor: `color-mix(in srgb, ${accentColor} 14%, transparent)`,
        color: accentColor,
      }
    : {};

  return (
    <div
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={handleClick}
      onKeyDown={(e) => { if (clickable && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); handleClick(); } }}
      style={{ ...styles.card, cursor: clickable ? 'pointer' : 'default' }}
      onMouseEnter={(e) => {
        if (!clickable) return;
        e.currentTarget.style.borderColor = accentColor;
        e.currentTarget.style.transform = 'translateY(-3px)';
        e.currentTarget.style.boxShadow = 'var(--shadow-md)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--border)';
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <div style={styles.topRow}>
        <div
          style={{
            ...styles.iconCircle,
            backgroundColor: `color-mix(in srgb, ${accentColor} 12%, transparent)`,
            color: accentColor,
          }}
        >
          {icon}
        </div>
        {trend && (
          <span style={trendStyles}>
            {trendUp ? '↑' : '↓'} {trend}
          </span>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <p style={styles.title}>{title}</p>
        <p style={styles.value}>{value}</p>
        {subtitle && <p style={styles.subtitle}>{subtitle}</p>}
      </div>
    </div>
  );
}

export default StatsCard;