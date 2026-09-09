import { useState } from 'react';

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
  header: {
    height: 64,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 32px',
    borderBottom: `1px solid ${theme.border}`,
    backgroundColor: 'transparent',
    position: 'sticky',
    top: 0,
    zIndex: 50,
    backdropFilter: 'blur(8px)',
  },
  left: {
    display: 'flex',
    alignItems: 'center',
    gap: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: 700,
    color: theme.text,
    margin: 0,
  },
  searchWrapper: {
    position: 'relative',
  },
  searchInput: {
    padding: '8px 16px 8px 36px',
    borderRadius: 8,
    border: `1px solid ${theme.border}`,
    backgroundColor: theme.cards,
    color: theme.text,
    fontSize: 13,
    width: 280,
    outline: 'none',
    transition: 'border-color 0.15s ease',
  },
  searchIcon: {
    position: 'absolute',
    left: 12,
    top: '50%',
    transform: 'translateY(-50%)',
    color: theme.muted,
    fontSize: 13,
    pointerEvents: 'none',
  },
  right: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
  },
  notificationButton: {
    position: 'relative',
    background: 'none',
    border: 'none',
    color: theme.muted,
    fontSize: 20,
    cursor: 'pointer',
    padding: 8,
    borderRadius: 8,
    transition: 'color 0.15s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 18,
    height: 18,
    borderRadius: '50%',
    backgroundColor: theme.danger,
    color: '#fff',
    fontSize: 10,
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: 1,
  },
  userSection: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '6px 12px',
    borderRadius: 8,
    cursor: 'pointer',
    transition: 'background-color 0.15s ease',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: '50%',
    backgroundColor: theme.accent,
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 13,
    fontWeight: 700,
  },
  userName: {
    color: theme.text,
    fontSize: 13,
    fontWeight: 600,
  },
};

function Header({ title, onSearch, notifications, user }) {
  const [searchValue, setSearchValue] = useState('');

  const handleSearchChange = (e) => {
    setSearchValue(e.target.value);
    if (onSearch) onSearch(e.target.value);
  };

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'AD';

  return (
    <header style={styles.header}>
      <div style={styles.left}>
        <h1 style={styles.title}>{title}</h1>
        {onSearch && (
          <div style={styles.searchWrapper}>
            <span style={styles.searchIcon}>🔍</span>
            <input
              type="text"
              placeholder="Buscar..."
              value={searchValue}
              onChange={handleSearchChange}
              style={styles.searchInput}
              onFocus={(e) => {
                e.target.style.borderColor = theme.accent;
              }}
              onBlur={(e) => {
                e.target.style.borderColor = theme.border;
              }}
            />
          </div>
        )}
      </div>

      <div style={styles.right}>
        {typeof notifications === 'number' && (
          <button
            style={styles.notificationButton}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = theme.text;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = theme.muted;
            }}
          >
            🔔
            {notifications > 0 && (
              <span style={styles.badge}>
                {notifications > 99 ? '99+' : notifications}
              </span>
            )}
          </button>
        )}

        {user && (
          <div
            style={styles.userSection}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = theme.cards;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <div style={styles.avatar}>{initials}</div>
            <span style={styles.userName}>{user.name}</span>
          </div>
        )}
      </div>
    </header>
  );
}

export default Header;
