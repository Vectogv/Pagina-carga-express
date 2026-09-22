import Badge from './Badge';
import { statusLabel, statusVariant } from './status';

export default function StatusBadge({ status, label, size = 'md' }) {
  if (!status) return <span className="text-muted">—</span>;
  return (
    <Badge variant={statusVariant(status)} size={size}>
      <span className="badge__dot" aria-hidden="true" />
      {label || statusLabel(status)}
    </Badge>
  );
}
