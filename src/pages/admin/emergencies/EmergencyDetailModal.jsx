import { MapPin, Siren } from 'lucide-react';
import { Modal, StatusBadge } from '../../../components/ui';
import RouteMap from '../../../components/maps/RouteMap';
import { sosRouteProps, hasRoutePoints } from '../../../components/maps/sosRoute';
import { formatCurrency, formatDateTime } from '../../../utils/format';
import EmergencyChat from './EmergencyChat';
import { shortId, userName, ruta, coords, mapsUrl } from './emergencyUtils';

function Detail({ label, children }) {
  return (
    <div className="detail-list__item">
      <span className="detail-list__label">{label}</span>
      <span className="detail-list__value">{children}</span>
    </div>
  );
}

function MapLink({ lat, lng, danger, children }) {
  return (
    <a
      className={`btn btn--sm ${danger ? 'btn--soft-danger' : 'btn--secondary'}`}
      href={mapsUrl(lat, lng)}
      target="_blank"
      rel="noopener noreferrer"
    >
      <span className="btn__icon">{danger ? <Siren size={14} /> : <MapPin size={14} />}</span>
      <span className="btn__label">{children}</span>
    </a>
  );
}

function Party({ role, person }) {
  return (
    <div className="emergency-party">
      <span className="detail-list__label">{role}</span>
      <span className="text-strong">{person?.nombre || '—'}</span>
      {person?.telefono
        ? <a className="text-sm text-primary-color" href={`tel:${person.telefono}`}>{person.telefono}</a>
        : <span className="text-sm text-muted">—</span>}
      {person?.placa && (
        <span className="text-sm text-muted">Placa: {person.placa}{person.tipoVehiculo ? ` · ${person.tipoVehiculo}` : ''}</span>
      )}
    </div>
  );
}

function TripSection({ emergency, trip }) {
  const activador = emergency.usuario;
  const driverIsRequester = trip.conductor?.telefono && activador?.telefono === trip.conductor.telefono;
  const solicitante = driverIsRequester ? trip.conductor : trip.cliente;
  const contraparte = driverIsRequester ? trip.cliente : trip.conductor;

  return (
    <>
      <section className="stack">
        <h3 className="section-title">Ruta de emergencia</h3>
        <div className="detail-list">
          <Detail label="Salida">{trip.origen?.direccion || '—'}</Detail>
          <Detail label="Destino">{trip.destino?.direccion || '—'}</Detail>
          <Detail label="Estado del viaje"><StatusBadge status={trip.estado} /></Detail>
          <Detail label="Carga">{trip.carga || 'SOS'}</Detail>
          <Detail label="Precio">{formatCurrency(trip.precioFinal ?? trip.precioEstimado ?? 0)}</Detail>
          <Detail label="Tiempo estimado">{trip.tiempoEstimadoMinutos != null ? `${trip.tiempoEstimadoMinutos} min` : '—'}</Detail>
        </div>
        <div className="row">
          {trip.origen?.lat != null && <MapLink lat={trip.origen.lat} lng={trip.origen.lng}>Salida en mapa</MapLink>}
          {trip.destino?.lat != null && <MapLink lat={trip.destino.lat} lng={trip.destino.lng}>Destino en mapa</MapLink>}
          {emergency.lat && emergency.lng && <MapLink lat={emergency.lat} lng={emergency.lng} danger>SOS en mapa</MapLink>}
        </div>
      </section>

      {(solicitante || contraparte) && (
        <section className="stack">
          <h3 className="section-title">Involucrados</h3>
          <div className="two-col">
            <Party role={`Solicitante (${driverIsRequester ? 'conductor' : 'cliente'})`} person={solicitante} />
            <Party role={`Contraparte (${driverIsRequester ? 'cliente' : 'conductor'})`} person={contraparte} />
          </div>
        </section>
      )}
    </>
  );
}

export default function EmergencyDetailModal({ emergency, trip, chat, onClose }) {
  const mapa = sosRouteProps(emergency, trip);

  return (
    <Modal
      isOpen={!!emergency}
      onClose={onClose}
      title={emergency ? `Emergencia #${shortId(emergency.id)}` : 'Detalle de emergencia'}
      description="Alerta SOS, viaje asociado y conversación de atención."
      size="lg"
    >
      {emergency && (
        <div className="emergency-detail">
          <section className="stack">
            <h3 className="section-title">Alerta</h3>
            <div className="detail-list">
              <Detail label="ID emergencia"><span className="text-mono">#{shortId(emergency.id)}</span></Detail>
              <Detail label="Usuario">{userName(emergency)}</Detail>
              <Detail label="Tipo">SOS</Detail>
              <Detail label="Ruta del viaje">{ruta(emergency) || emergency.viaje?.estado || '—'}</Detail>
              <Detail label="Ubicación">{coords(emergency) || emergency.ubicacion || '—'}</Detail>
              <Detail label="Estado">
                <StatusBadge status={emergency.atendida ? 'resuelta' : 'abierta'} label={emergency.atendida ? 'Resuelta' : 'Pendiente'} />
              </Detail>
              <Detail label="Fecha">{formatDateTime(emergency.createdAt)}</Detail>
            </div>
          </section>

          {hasRoutePoints(mapa) && (
            <section className="stack">
              <h3 className="section-title">Mapa del SOS</h3>
              <RouteMap {...mapa} alto={280} />
            </section>
          )}

          {emergency.description && (
            <section className="stack">
              <h3 className="section-title">Descripción</h3>
              <p className="text-secondary">{emergency.description}</p>
            </section>
          )}

          {emergency.notes && (
            <section className="stack">
              <h3 className="section-title">Notas de resolución</h3>
              <p>{emergency.notes}</p>
            </section>
          )}

          {trip && <TripSection emergency={emergency} trip={trip} />}

          <section className="stack">
            <h3 className="section-title">Chat de emergencia</h3>
            <EmergencyChat emergency={emergency} messages={chat.messages} loading={chat.loading} error={chat.error} />
          </section>
        </div>
      )}
    </Modal>
  );
}
