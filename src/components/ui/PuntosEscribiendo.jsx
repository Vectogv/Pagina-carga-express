import './PuntosEscribiendo.css';

/** Burbuja con 3 puntos que saltan + "Nombre está escribiendo". Sin nombre no pinta nada. */
export default function PuntosEscribiendo({ nombre }) {
  if (!nombre) return null;
  return (
    <div className="escribiendo" role="status" aria-live="polite">
      <span className="escribiendo__burbuja" aria-hidden="true"><i /><i /><i /></span>
      <span className="escribiendo__texto">{nombre} está escribiendo</span>
    </div>
  );
}
