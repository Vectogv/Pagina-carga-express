import './LoadingState.css';

export default function LoadingState({ message = 'Cargando...' }) {
  return (
    <div className="loading-state">
      <div className="loading-state__spinner" />
      <p className="loading-state__message">{message}</p>
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="skeleton-card">
      <div className="skeleton skeleton--icon" />
      <div className="skeleton skeleton--line" style={{ width: '60%' }} />
      <div className="skeleton skeleton--line" style={{ width: '40%', height: 24 }} />
    </div>
  );
}

export function SkeletonTable({ rows = 5 }) {
  return (
    <div className="skeleton-table">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton-row">
          <div className="skeleton" style={{ flex: 1, height: 14 }} />
          <div className="skeleton" style={{ flex: 2, height: 14 }} />
          <div className="skeleton" style={{ flex: 1, height: 14 }} />
        </div>
      ))}
    </div>
  );
}
