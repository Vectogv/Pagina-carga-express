import './Alert.css';

export default function Alert({ variant = 'info', title, children, onClose }) {
  return (
    <div className={`alert alert--${variant}`}>
      <div className="alert__content">
        {title && <p className="alert__title">{title}</p>}
        {children && <div className="alert__description">{children}</div>}
      </div>
      {onClose && (
        <button onClick={onClose} className="alert__close">
          ✕
        </button>
      )}
    </div>
  );
}
