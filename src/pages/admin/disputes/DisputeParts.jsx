import { Badge, StatusBadge } from '../../../components/ui';
import { formatDate } from '../../../utils/format';
import { DISPUTE_TYPES, shortId, claimantName, tripRef } from './disputeUtils';

export function DisputeTypeBadge({ type }) {
  const [label, variant] = DISPUTE_TYPES[type] || [type || '—', 'neutral'];
  return <Badge variant={variant} size="sm">{label}</Badge>;
}

export function DisputeStatusBadge({ status }) {
  return <StatusBadge status={status === 'resolved' ? 'resuelto' : 'pendiente'} />;
}

function Detail({ label, children }) {
  return (
    <div className="detail-list__item">
      <span className="detail-list__label">{label}</span>
      <span className="detail-list__value">{children}</span>
    </div>
  );
}

export function DisputeFields({ row }) {
  return (
    <div className="detail-list">
      <Detail label="ID disputa"><span className="text-mono">#{shortId(row.id)}</span></Detail>
      <Detail label="Viaje"><span className="text-mono">{tripRef(row)}</span></Detail>
      <Detail label="Reclamante">{claimantName(row)}</Detail>
      <Detail label="Tipo"><DisputeTypeBadge type={row.type} /></Detail>
      <Detail label="Estado"><DisputeStatusBadge status={row.status} /></Detail>
      <Detail label="Fecha">{formatDate(row.createdAt)}</Detail>
    </div>
  );
}
