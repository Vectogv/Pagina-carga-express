import { useEffect, useCallback } from 'react';

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

const sizes = {
  sm: 400,
  md: 560,
  lg: 720,
};

const keyframes = `
@keyframes modalFadeIn {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}
@keyframes overlayFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
`;

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: 24,
    animation: 'overlayFadeIn 0.2s ease-out',
  },
  modal: {
    backgroundColor: theme.cards,
    borderRadius: 16,
    border: `1px solid ${theme.border}`,
    width: '100%',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    animation: 'modalFadeIn 0.25s ease-out',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px 24px',
    borderBottom: `1px solid ${theme.border}`,
    flexShrink: 0,
  },
  title: {
    fontSize: 18,
    fontWeight: 700,
    color: theme.text,
    margin: 0,
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: theme.muted,
    fontSize: 20,
    cursor: 'pointer',
    padding: 6,
    borderRadius: 6,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.15s ease',
    lineHeight: 1,
  },
  body: {
    padding: 24,
    overflowY: 'auto',
    flex: 1,
    color: theme.text,
    fontSize: 14,
    lineHeight: 1.6,
  },
};

function Modal({ isOpen, onClose, title, children, size = 'md' }) {
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <>
      <style>{keyframes}</style>
      <div style={styles.overlay} onClick={onClose}>
        <div
          style={{ ...styles.modal, maxWidth: sizes[size] || sizes.md }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={styles.header}>
            <h2 style={styles.title}>{title}</h2>
            <button
              style={styles.closeBtn}
              onClick={onClose}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = theme.text;
                e.currentTarget.style.backgroundColor = `${theme.danger}20`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = theme.muted;
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              ✕
            </button>
          </div>
          <div style={styles.body}>{children}</div>
        </div>
      </div>
    </>
  );
}

export default Modal;
