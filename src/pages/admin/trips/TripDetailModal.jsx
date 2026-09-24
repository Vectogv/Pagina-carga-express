import { ArrowRight } from 'lucide-react';
import { Modal, StatusBadge, statusLabel } from '../../../components/ui';
import { formatDateTime } from '../../../utils/format';
import {
  tripStatus, tripClient, tripDriver, tripOrigin, tripDestination, tripPrice, tripDate,
  personName, placeText, money, shortId,
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
      <span className="text-strong truncate">{person ? personName(person) : fallback}</span>
      <span className="text-sm text-muted truncate">{person?.email || '—'}</span>
      <span className="text-sm text-muted">{person?.telefono || '—'}</span>
      {person?.placa && <span className="text-sm text-muted">{person.tipoVehiculo} · {person.placa}</span>}
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
              <Detail label="Fecha de solicitud">{formatDateTime(tripDate(trip))}</Detail>
              <Detail label="Estado">{statusLabel(status)}</Detail>
              <Detail label="Carga">{trip.carga || '—'}</Detail>
              {trip.calificacionCliente != null && <Detail label="Calificación del cliente">{trip.calificacionCliente} / 5</Detail>}
              {trip.motivoCancelacion && <Detail label="Motivo de cancelación">{trip.motivoCancelacion}</Detail>}
            </div>
          </section>

          <section className="stack">
            <h3 className="section-title">Pago</h3>
            <div className="detail-list">
              <Detail label="Precio"><span className="trip-price">{money(tripPrice(trip))}</span></Detail>
              {trip.precioEstimado != null && <Detail label="Precio estimado">{money(trip.precioEstimado)}</Detail>}
              {trip.precioFinal != null && <Detail label="Precio final">{money(trip.precioFinal)}</Detail>}
            </div>
          </section>

          <section className="stack">
            <h3 className="section-title">Cronología</h3>
            <div className="detail-list">
              {trip.aceptadoAt && <Detail label="Aceptado">{formatDateTime(trip.aceptadoAt)}</Detail>}
              {trip.completadoAt && <Detail label="Completado">{formatDateTime(trip.completadoAt)}</Detail>}
              {trip.finalizadoAt && <Detail label="Finalizado">{formatDateTime(trip.finalizadoAt)}</Detail>}
              {trip.canceladoAt && <Detail label="Cancelado">{formatDateTime(trip.canceladoAt)}</Detail>}
            </div>
          </section>
        </div>
      )}
    </Modal>
  );
}
