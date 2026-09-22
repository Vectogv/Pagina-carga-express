import { useEffect } from 'react';
import { X } from 'lucide-react';
import './Toast.css';

/** variant: info | success | warning | danger (error es alias de danger) */
export function Toast({ message, variant = 'info', onClose, duration = 4000 }) {
  useEffect(() => {
    if (duration && onClose) {
      const id = setTimeout(onClose, duration);
      return () => clearTimeout(id);
    }
    return undefined;
  }, [duration, onClose]);

  const v = variant === 'error' ? 'danger' : variant;

  return (
    <div className={`toast toast--${v}`} role={v === 'danger' ? 'alert' : 'status'}>
      <span className="toast__message">{message}</span>
      {onClose && (
        <button type="button" onClick={onClose} className="toast__close" aria-label="Cerrar notificación">
          <X size={14} />
        </button>
      )}
    </div>
  );
}

export function ToastContainer({ children }) {
  return <div className="toast-container">{children}</div>;
}
