import './Card.css';

export default function Card({ children, title, description, actions, className = '', ...props }) {
  return (
    <div className={`card ${className}`} {...props}>
      {(title || description || actions) && (
        <div className="card__header">
          <div className="card__header-text">
            {title && <h3 className="card__title">{title}</h3>}
            {description && <p className="card__description">{description}</p>}
          </div>
          {actions && <div className="card__actions">{actions}</div>}
        </div>
      )}
      <div className="card__content">{children}</div>
    </div>
  );
}
