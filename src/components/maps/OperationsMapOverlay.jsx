import { Suspense, lazy, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import './OperationsMapOverlay.css';

// Leaflet solo se descarga cuando el admin abre el mapa.
const OperationsMap = lazy(() => import('./OperationsMap'));

/**
 * Capa a pantalla casi completa con el mapa de operaciones.
 * Escape cierra, y el foco vuelve al botón que la abrió.
 */
export default function OperationsMapOverlay({ open, onClose, ...props }) {
  const foco = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    foco.current = document.activeElement;
    const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); onClose?.(); } };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      if (foco.current instanceof HTMLElement) foco.current.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="opsmap-overlay" role="dialog" aria-modal="true" aria-label="Mapa de zonas de operación">
      <Suspense fallback={(
        <div className="opsmap-overlay__cargando">
          <span className="opsmap-overlay__spinner" aria-hidden="true" />
          <span>Cargando el mapa…</span>
        </div>
      )}
      >
        <OperationsMap onClose={onClose} {...props} />
      </Suspense>
    </div>,
    document.body,
  );
}
