import { useEffect } from 'react';
import './Toast.css';

export function Toast({ message, variant = 'info', onClose, duration = 4000 }) {
  useEffect(() => {
    if (duration && onClose) {
      const id = setTimeout(onClose, duration);
      return () => clearTimeout(id);
    }
  }, [duration, onClose]);

  return (
    <div className={`toast toast--${variant}`}>
      <span className="toast__message">{message}</span>
      {onClose && (
        <button onClick={onClose} className="toast__close">
          ✕
        </button>
      )}
    </div>
  );
}

export function ToastContainer({ children }) {
  return <div className="toast-container">{children}</div>;
}
