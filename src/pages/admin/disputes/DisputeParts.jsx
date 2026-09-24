import { StatusBadge } from '../../../components/ui';
import { formatDate, formatCurrency } from '../../../utils/format';
import { tripRef, money } from './disputeUtils';

/** Celda de persona (nombre + dato secundario) para la tabla y el detalle. */
export function PersonCell({ nombre, meta }) {
  return (
    <div className="cell-user__text">
      <span className="cell-user__name">{nombre || '—'}</span>
      {meta && <span className="cell-user__meta">{meta}</span>}
    </div>
  );
}

/** Resumen común mostrado tanto en el detalle como en el modal de resolución. */
export function DisputeSummary({ row }) {
  return (
    <div className="detail-list">
      <div className="detail-list__item">
        <span className="detail-list__label">Disputa</span>
        <span className="detail-list__value text-mono">#{row.id}</span>
      </div>
      <div className="detail-list__item">
        <span className="detail-list__label">Viaje</span>
        <span className="detail-list__value text-mono">{tripRef(row)}</span>
      </div>
      <div className="detail-list__item">
        <span className="detail-list__label">Cliente</span>
        <span className="detail-list__value">{row.cliente?.nombre || '—'}</span>
      </div>
      <div className="detail-list__item">
        <span className="detail-list__label">Conductor</span>
        <span className="detail-list__value">{row.conductor?.nombre || '—'}</span>
      </div>
      <div className="detail-list__item">
        <span className="detail-list__label">Monto del viaje</span>
        <span className="detail-list__value">{money(row) != null ? formatCurrency(money(row)) : '—'}</span>
      </div>
      <div className="detail-list__item">
        <span className="detail-list__label">Estado</span>
        <span className="detail-list__value"><StatusBadge status={row.estado} /></span>
      </div>
      <div className="detail-list__item">
        <span className="detail-list__label">Fecha de apertura</span>
        <span className="detail-list__value">{formatDate(row.createdAt)}</span>
      </div>
    </div>
  );
}
