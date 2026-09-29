import Badge from './Badge';
import { statusLabel, statusVariant } from './status';

export default function StatusBadge({ status, label, size = 'md' }) {
  if (!status) return <span className="text-muted">—</span>;
  // El backend devuelve el estado crudo como estadoLabel cuando no tiene etiqueta
  // (p. ej. pendiente_confirmacion); en ese caso se usa la etiqueta local.
  const text = label && label !== status ? label : statusLabel(status);
  return (
    <Badge variant={statusVariant(status)} size={size}>
      <span className="badge__dot" aria-hidden="true" />
      {text}
    </Badge>
  );
}
