import { X } from 'lucide-react';
import './Alert.css';

export default function Alert({ variant = 'info', title, children, onClose }) {
  return (
    <div className={`alert alert--${variant}`} role={variant === 'danger' ? 'alert' : 'status'}>
      <div className="alert__content">
        {title && <p className="alert__title">{title}</p>}
        {children && <div className="alert__description">{children}</div>}
      </div>
      {onClose && (
        <button type="button" onClick={onClose} className="alert__close" aria-label="Cerrar">
          <X size={14} />
        </button>
      )}
    </div>
  );
}
