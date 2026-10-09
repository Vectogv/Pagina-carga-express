import { useEffect, useState } from 'react';
import { ArrowRight, Phone, Star } from 'lucide-react';
import { Modal, StatusBadge } from '../../../components/ui';
import { formatDate, formatDateTime } from '../../../utils/format';
import { resolveStorageUrl } from '../../../utils/storage';
import { getTripById } from '../../../api/admin';
import PendingCloseResolver from '../../../components/moderator/PendingCloseResolver';
import ServiceStatusTimeline from '../../../components/moderator/ServiceStatusTimeline';
import { MapaRecorrido } from '../../../components/panel';
import {
  tripStatus, tripClient, tripDriver, tripOrigin, tripDestination, tripPrice, tripPriceKind, tripDate,
  personName, placeText, money, shortId, vehicleText,
} from './tripUtils';

// Misma regla que trip_finalization_service.ts (y Ganancias): al finalizar, la
// plataforma retiene el 10 % del precio final. Solo se muestra si hay precio final.
const COMISION = 0.1;

const hasValue = (v) => v != null && v !== '';

function Detail({ label, children }) {
  return (
    <div className="detail-list__item">
      <span className="detail-list__label">{label}</span>
      <span className="detail-list__value">{children}</span>
    </div>
  );
}

/** Sección titulada; `card` la enmarca como en el detalle del moderador. */
function Section({ title, card = false, children }) {
  return (
    <section className={card ? 'trip-detail__card' : 'trip-detail__section'}>
      <h4 className="section-title">{title}</h4>
      {children}
    </section>
  );
}

function PhoneLink({ value }) {
  return <a className="trip-detail__link" href={`tel:${value}`}><Phone size={12} /> {value}</a>;
}

// GET /api/admin/trips no trae teléfonos; GET /api/trips/:id (admin puede verlo) sí:
// { cliente: { nombre, telefono }, conductor: { nombre, telefono, placa, tipoVehiculo,
// calificacion, totalViajes }, receptorNombre, receptorTelefono, tipoVehiculoRequerido,
// tipoProgramacion, fechaProgramada, horaProgramada, tiempoEstimadoMinutos, fotoRecogida,
// fotoEntrega, ... }. Solo se muestran las filas que de verdad tienen dato.
export default function TripDetailModal({ trip, onClose, onResolved }) {
  const [extra, setExtra] = useState(null);
  const tripId = trip?.id;

  useEffect(() => {
    if (!tripId) return undefined;
    let cancelled = false;
    getTripById(tripId)
      .then((res) => { if (!cancelled) setExtra({ id: tripId, data: res.data?.data || res.data }); })
      .catch(() => { /* Complementario: sin esto solo faltan teléfonos, receptor y fotos. */ });
    return () => { cancelled = true; };
  }, [tripId]);

  const detail = extra && String(extra.id) === String(tripId) ? extra.data : null;
  // El estado del detalle es más reciente que el del listado.
  const status = detail?.estado || tripStatus(trip);
  // Dato del detalle si llegó; si no, el del listado.
  const pick = (key) => detail?.[key] ?? trip?.[key] ?? null;

  const client = tripClient(trip);
  const driver = tripDriver(trip);
  const clientPhone = detail?.cliente?.telefono;
  const driverPhone = detail?.conductor?.telefono;
  const driverVehicle = vehicleText(driver) || vehicleText(detail?.conductor);
  const driverRating = detail?.conductor?.calificacion;
  const driverTrips = detail?.conductor?.totalViajes;

  const timeline = [
    ['Creado', tripDate(trip)],
    ['Aceptado', pick('aceptadoAt')],
    ['En curso', pick('enCursoAt')],
    ['Cerrado por el conductor', pick('completadoAt')],
    ['Finalizado', pick('finalizadoAt')],
    ['Cancelado', pick('canceladoAt')],
  ].filter(([, v]) => v);

  const programada = detail?.tipoProgramacion === 'programada';
  const cargoRows = [
    ['Descripción', pick('carga')],
    ['Vehículo requerido', detail?.tipoVehiculoRequerido],
    ['Recibe', detail?.receptorNombre],
    ['Teléfono de quien recibe', detail?.receptorTelefono && <PhoneLink value={detail.receptorTelefono} />],
    ['Programación', programada
      ? ['Programado', [detail.fechaProgramada && formatDate(detail.fechaProgramada), detail.horaProgramada].filter(Boolean).join(' ')]
        .filter(Boolean).join(' · ')
      : null],
  ].filter(([, v]) => hasValue(v));

  const precioFinal = trip?.precioFinal ?? detail?.precioFinal ?? null;
  const precioEstimado = trip?.precioEstimado ?? detail?.precioEstimado ?? null;
  const comision = status === 'finalizado' && precioFinal != null && driver
    ? Math.round(Number(precioFinal) * COMISION * 100) / 100
    : null;

  const photos = [
    ['Recogida', detail?.fotoRecogida],
    ['Entrega', detail?.fotoEntrega],
  ].filter(([, v]) => v);

  const tiempoEstimado = detail?.tiempoEstimadoMinutos;

  return (
    <Modal
      isOpen={!!trip}
      onClose={onClose}
      title={trip ? `Viaje #${shortId(trip)}` : 'Detalle del viaje'}
      description={trip ? <StatusBadge status={status} /> : 'Detalle del servicio, participantes y pago.'}
      size="lg"
    >
      {trip && (
        <div className="trip-detail">
          <Section title="Seguimiento">
            <div className="stack">
              <ServiceStatusTimeline estado={status} />
              {timeline.length > 0 && (
                <div className="detail-list trip-detail__dates">
                  {timeline.map(([label, value]) => <Detail key={label} label={label}>{formatDateTime(value)}</Detail>)}
                </div>
              )}
            </div>
          </Section>

          {status === 'pendiente_confirmacion' && (
            // H1: el cliente no confirmó ni rechazó el cierre a tiempo. El admin puede
            // resolverlo con el mismo endpoint del moderador (sin restricción de zona).
            <PendingCloseResolver tripId={trip.id} onResolved={() => onResolved?.()} />
          )}

          <Section title="Ruta">
            {/* Planeada en azul, recorrido real en rojo: GET /api/admin/trips/:id/recorrido. */}
            <MapaRecorrido key={trip.id} area="admin" viajeId={trip.id} alturaPx={280} />
            <div className="trip-route">
              <div className="trip-route__point">
                <span className="trip-route__dot" aria-hidden="true" />
                <span className="detail-list__label">Origen</span>
                <span className="detail-list__value">{placeText(detail?.origen || tripOrigin(trip))}</span>
              </div>
              <span className="trip-route__line" aria-hidden="true"><ArrowRight size={18} /></span>
              <div className="trip-route__point">
                <span className="trip-route__dot trip-route__dot--end" aria-hidden="true" />
                <span className="detail-list__label">Destino</span>
                <span className="detail-list__value">{placeText(detail?.destino || tripDestination(trip))}</span>
              </div>
            </div>
            {tiempoEstimado != null && (
              <p className="text-sm text-muted trip-detail__note">Tiempo estimado: {tiempoEstimado} min</p>
            )}
          </Section>

          {cargoRows.length > 0 && (
            <Section title="Carga" card>
              <div className="detail-list">
                {cargoRows.map(([label, value]) => <Detail key={label} label={label}>{value}</Detail>)}
              </div>
            </Section>
          )}

          <div className="two-col">
            <Section title="Cliente" card>
              <div className="cell-user__text">
                <span className="cell-user__name">{client ? personName(client) : 'Sin cliente'}</span>
                {client?.email && <span className="cell-user__meta">{client.email}</span>}
                {clientPhone && <PhoneLink value={clientPhone} />}
              </div>
            </Section>

            <Section title="Conductor" card>
              {driver ? (
                <div className="cell-user__text">
                  <span className="cell-user__name">{personName(driver)}</span>
                  {driverVehicle && <span className="cell-user__meta">{driverVehicle}</span>}
                  {driverRating != null && (
                    <span className="cell-user__meta trip-detail__rating">
                      <Star size={12} /> {driverRating}{driverTrips != null && ` · ${driverTrips} viajes`}
                    </span>
                  )}
                  {driverPhone && <PhoneLink value={driverPhone} />}
                </div>
              ) : (
                <span className="text-muted">Sin conductor asignado</span>
              )}
            </Section>
          </div>

          <Section title="Dinero" card>
            <div className="detail-list">
              <Detail label={`Valor del servicio${tripPriceKind(trip) ? ` (${tripPriceKind(trip).toLowerCase()})` : ''}`}>
                <span className="trip-price">{money(tripPrice(trip))}</span>
              </Detail>
              {precioEstimado != null && <Detail label="Precio estimado">{money(precioEstimado)}</Detail>}
              {precioFinal != null && <Detail label="Precio final">{money(precioFinal)}</Detail>}
              {comision != null && (
                <>
                  <Detail label="Comisión plataforma (10 %)">{money(comision)}</Detail>
                  <Detail label="Neto conductor">{money(Math.round((Number(precioFinal) - comision) * 100) / 100)}</Detail>
                </>
              )}
            </div>
          </Section>

          {trip.calificacionCliente != null && (
            <Section title="Calificación">
              <div className="detail-list">
                <Detail label="Calificación del cliente">{trip.calificacionCliente} / 5</Detail>
              </div>
            </Section>
          )}

          {pick('motivoCancelacion') && (
            <Section title="Cancelación">
              <div className="page-error">
                <span><span className="text-strong">Motivo de cancelación:</span> {pick('motivoCancelacion')}</span>
              </div>
            </Section>
          )}

          {photos.length > 0 && (
            <Section title="Evidencias">
              <div className="two-col">
                {photos.map(([label, path]) => (
                  <a key={label} className="stack trip-photo-link" href={resolveStorageUrl(path)} target="_blank" rel="noreferrer">
                    <span className="detail-list__label">Foto de {label.toLowerCase()}</span>
                    <img className="thumb" src={resolveStorageUrl(path)} alt={`Foto de ${label.toLowerCase()}`} />
                  </a>
                ))}
              </div>
            </Section>
          )}
        </div>
      )}
    </Modal>
  );
}
