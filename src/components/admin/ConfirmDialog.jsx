import Modal from './Modal';

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
  body: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    padding: '8px 0 0',
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 26,
    marginBottom: 20,
  },
  message: {
    fontSize: 15,
    color: theme.muted,
    margin: '0 0 28px',
    lineHeight: 1.6,
    maxWidth: 360,
  },
  actions: {
    display: 'flex',
    gap: 12,
    width: '100%',
    justifyContent: 'center',
  },
  cancelBtn: {
    padding: '10px 24px',
    borderRadius: 8,
    border: `1px solid ${theme.border}`,
    backgroundColor: 'transparent',
    color: theme.text,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    minWidth: 100,
  },
  confirmBtn: {
    padding: '10px 24px',
    borderRadius: 8,
    border: 'none',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    minWidth: 100,
  },
};

function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  danger = false,
  children,
}) {
  const btnColor = danger ? theme.danger : theme.accent;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <div style={styles.body}>
        <div
          style={{
            ...styles.iconCircle,
            backgroundColor: `${btnColor}20`,
          }}
        >
          {danger ? '⚠️' : '❓'}
        </div>
        <p style={styles.message}>{message}</p>
        {children}
        <div style={styles.actions}>
          <button
            style={styles.cancelBtn}
            onClick={onClose}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = theme.cards;
              e.currentTarget.style.borderColor = theme.muted;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.borderColor = theme.border;
            }}
          >
            {cancelText}
          </button>
          <button
            style={{
              ...styles.confirmBtn,
              backgroundColor: btnColor,
              color: '#fff',
            }}
            onClick={() => {
              onConfirm();
              onClose();
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '0.9';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '1';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default ConfirmDialog;
