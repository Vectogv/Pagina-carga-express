import { Modal } from '../../../components/ui';
import { DisputeFields } from './DisputeParts';
import { personLabel, shortId } from './disputeUtils';

export default function DisputeDetailModal({ dispute, onClose }) {
  const winner = dispute?.winner === 'claimant'
    ? personLabel(dispute?.claimant)
    : personLabel(dispute?.respondent);

  return (
    <Modal
      isOpen={!!dispute}
      onClose={onClose}
      title={dispute ? `Disputa #${shortId(dispute.id)}` : 'Detalle de disputa'}
      description="Información de la disputa, evidencia y resolución."
      size="lg"
    >
      {dispute && (
        <div className="dispute-detail">
          <section className="stack">
            <h3 className="section-title">Resumen</h3>
            <DisputeFields row={dispute} />
          </section>

          {dispute.description && (
            <section className="stack">
              <h3 className="section-title">Descripción de la disputa</h3>
              <p className="dispute-text">{dispute.description}</p>
            </section>
          )}

          {dispute.evidence && (
            <section className="stack">
              <h3 className="section-title">Evidencia</h3>
              <p className="dispute-text">{dispute.evidence}</p>
            </section>
          )}

          {dispute.resolution && (
            <section className="stack">
              <h3 className="section-title">Resolución</h3>
              <p className="dispute-text">{dispute.resolution}</p>
              {dispute.winner && (
                <p className="text-strong">Ganador: <span className="text-primary-color">{winner || '—'}</span></p>
              )}
            </section>
          )}
        </div>
      )}
    </Modal>
  );
}
