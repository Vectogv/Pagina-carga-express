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

const styles = {
  card: {
    backgroundColor: theme.cards,
    borderRadius: 12,
    padding: 16,
    border: `1px solid ${theme.border}`,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    transition: 'border-color 0.2s ease, transform 0.2s ease',
    cursor: 'default',
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
    fontSize: 14,
  },
  trendBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '4px 10px',
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 600,
  },
  title: {
    fontSize: 13,
    fontWeight: 600,
    color: theme.muted,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    margin: 0,
  },
  value: {
    fontSize: 14,
    fontWeight: 800,
    color: theme.text,
    margin: 0,
    lineHeight: 1.2,
  },
};

function StatsCard({ title, value, icon, color, trend, trendUp, to, onClick }) {
  const accentColor = color || theme.accent;
  const clickable = !!(to || onClick);

  const trendStyles = trend
    ? {
        ...styles.trendBadge,
        backgroundColor: trendUp ? `${theme.success}20` : `${theme.danger}20`,
        color: trendUp ? theme.success : theme.danger,
      }
    : {};

  return (
    <div
      onClick={onClick}
      style={{
        ...styles.card,
        cursor: clickable ? 'pointer' : 'default',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = accentColor;
        e.currentTarget.style.transform = 'translateY(-3px)';
        e.currentTarget.style.boxShadow = `0 12px 28px rgba(0,0,0,0.4), 0 0 0 1px ${accentColor}30`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = theme.border;
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <div style={styles.topRow}>
        <div
          style={{
            ...styles.iconCircle,
            backgroundColor: `${accentColor}20`,
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
      <div>
        <p style={styles.title}>{title}</p>
        <p style={styles.value}>{value}</p>
      </div>
    </div>
  );
}

export default StatsCard;
