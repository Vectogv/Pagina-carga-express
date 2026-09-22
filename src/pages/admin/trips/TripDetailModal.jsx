import { ArrowRight } from 'lucide-react';
import { Modal, StatusBadge, statusLabel } from '../../../components/ui';
import { formatDateTime } from '../../../utils/format';
import {
  tripStatus, tripClient, tripDriver, tripOrigin, tripDestination, tripPrice, tripDate,
  placeText, money, shortId,
} from './tripUtils';

function Detail({ label, children }) {
  return (
    <div className="detail-list__item">
      <span className="detail-list__label">{label}</span>
      <span className="detail-list__value">{children}</span>
    </div>
  );
}

function Person({ role, person, fallback }) {
  return (
    <div className="trip-person">
      <span className="detail-list__label">{role}</span>
      <span className="text-strong truncate">{person?.nombre || person?.name || fallback}</span>
      <span className="text-sm text-muted truncate">{person?.email || '—'}</span>
      <span className="text-sm text-muted">{person?.telefono || person?.phone || '—'}</span>
    </div>
  );
}

export default function TripDetailModal({ trip, onClose }) {
  const status = tripStatus(trip);

  return (
    <Modal
      isOpen={!!trip}
      onClose={onClose}
      title={trip ? `Viaje #${shortId(trip)}` : 'Detalle del viaje'}
      description="Detalle del servicio, participantes y pago."
      size="lg"
    >
      {trip && (
        <div className="trip-detail">
          <div className="row row--between">
            <span className="text-mono text-primary-color">#{shortId(trip)}</span>
            <StatusBadge status={status} />
          </div>

          <div className="trip-route">
            <div className="trip-route__point">
              <span className="trip-route__dot" aria-hidden="true" />
              <span className="detail-list__label">Origen</span>
              <span className="detail-list__value">{placeText(tripOrigin(trip))}</span>
            </div>
            <span className="trip-route__line" aria-hidden="true"><ArrowRight size={18} /></span>
            <div className="trip-route__point">
              <span className="trip-route__dot trip-route__dot--end" aria-hidden="true" />
              <span className="detail-list__label">Destino</span>
              <span className="detail-list__value">{placeText(tripDestination(trip))}</span>
            </div>
          </div>

          <section className="stack">
            <h3 className="section-title">Participantes</h3>
            <div className="two-col">
              <Person role="Cliente" person={tripClient(trip)} fallback="Sin cliente" />
              <Person role="Conductor" person={tripDriver(trip)} fallback="Sin conductor" />
            </div>
          </section>

          <section className="stack">
            <h3 className="section-title">Información del viaje</h3>
            <div className="detail-list">
              <Detail label="Fecha">{formatDateTime(tripDate(trip))}</Detail>
              <Detail label="Estado">{statusLabel(status)}</Detail>
              <Detail label="Distancia">{trip.distancia || trip.distance || '—'}</Detail>
              <Detail label="Duración">{trip.duracion || trip.duration || '—'}</Detail>
            </div>
          </section>

          <section className="stack">
            <h3 className="section-title">Pago</h3>
            <div className="detail-list">
              <Detail label="Precio"><span className="trip-price">{money(tripPrice(trip))}</span></Detail>
              <Detail label="Método de pago">{trip.metodoPago || trip.paymentMethod || '—'}</Detail>
              <Detail label="Comisión">{money(trip.comision || trip.commission || 0)}</Detail>
              <Detail label="Propina">{money(trip.propina || trip.tip || 0)}</Detail>
            </div>
          </section>
        </div>
      )}
    </Modal>
  );
}
