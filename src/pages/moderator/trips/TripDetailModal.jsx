import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Car, CheckCheck, CircleCheck, MapPin, Phone, Siren, Star } from 'lucide-react';
import { acknowledgeEmergency, resolveEmergency } from '../../../api/moderator';
import PendingCloseResolver from '../../../components/moderator/PendingCloseResolver';
import { Textarea } from '../../../components/ui/Input/Input';
import ServiceStatusTimeline from '../../../components/moderator/ServiceStatusTimeline';
import { errorMessage, formatCurrency, formatDateTime, fullName } from '../../../utils/format';
import { resolveStorageUrl } from '../../../utils/storage';
import { MapaRecorrido } from '../../../components/panel';
import {
  Modal, Avatar, Badge, Button, StatusBadge, LoadingState,
} from '../../../components/ui';

/** Ruta planeada (azul) y recorrido real (rojo) desde GET /api/moderator/trips/:id/recorrido. */
function RouteMap({ viajeId, origen, destino, marcaSos }) {
  return (
    <section className="trip-detail__section">
      <h4 className="section-title">Ruta</h4>
      <MapaRecorrido area="moderator" viajeId={viajeId} alturaPx={280} marcaSos={marcaSos} />
      <div className="trip-detail__route">
        <div className="trip-detail__stop">
          <MapPin size={14} className="text-success" />
          <span><span className="text-strong">Origen: </span>{origen?.direccion || '—'}</span>
        </div>
        <div className="trip-detail__stop">
          <MapPin size={14} className="text-danger" />
          <span><span className="text-strong">Destino: </span>{destino?.direccion || '—'}</span>
        </div>
      </div>
    </section>
  );
}

function EmergencyItem({ alerta, onChanged }) {
  const [busy, setBusy] = useState(false);
  const [observacion, setObservacion] = useState('');
  const [error, setError] = useState(null);

  const run = async (fn) => {
    setBusy(true);
    setError(null);
    try {
      await fn(alerta.id);
      onChanged();
    } catch (err) {
      setError(errorMessage(err, 'No se pudo actualizar la emergencia'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`trip-emergency trip-emergency--${alerta.estado || 'pendiente'}`}>
      <div className="row row--between">
        <span className="text-strong">{alerta.motivo || 'Emergencia'}</span>
        <StatusBadge status={alerta.estado} label={alerta.estadoLabel} size="sm" />
      </div>
      {(alerta.atendidoPor || alerta.resueltoPor) && (
        <p className="text-sm text-muted">
          {alerta.atendidoPor && `Atendida por ${alerta.atendidoPor}${alerta.atendidaAt ? ` · ${formatDateTime(alerta.atendidaAt)}` : ''}`}
          {alerta.atendidoPor && alerta.resueltoPor && ' — '}
          {alerta.resueltoPor && `Resuelta por ${alerta.resueltoPor}${alerta.resueltaAt ? ` · ${formatDateTime(alerta.resueltaAt)}` : ''}`}
        </p>
      )}
      <p className="text-sm text-muted">
        Usuario: {alerta.usuario?.nombre || '—'} {alerta.usuario?.telefono || ''} · <span className="text-mono">{alerta.lat}, {alerta.lng}</span> · {formatDateTime(alerta.createdAt)}
      </p>
      {error && <div className="page-error" role="alert">{error}</div>}
      {alerta.estado === 'pendiente' && (
        <div>
          <Button size="sm" variant="danger" icon={<Siren size={14} />} loading={busy} onClick={() => run(acknowledgeEmergency)}>
            Atender
          </Button>
        </div>
      )}
      {alerta.estado === 'atendida' && (
        <>
          {/* Misma regla que Emergencias: resolver exige dejar constancia de la gestión. */}
          <Textarea
            label="Observación / gestión realizada"
            value={observacion}
            onChange={(e) => setObservacion(e.target.value)}
            disabled={busy}
          />
          <div>
            <Button
              size="sm"
              variant="success"
              icon={<CheckCheck size={14} />}
              loading={busy}
              disabled={!observacion.trim()}
              onClick={() => run((id) => resolveEmergency(id, { observacion: observacion.trim() }))}
            >
              Resolver
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

export default function TripDetailModal({
  isOpen, onClose, detail, loading, error, emergencies, onEmergencyChanged,
}) {
  const title = detail ? `Viaje #${String(detail.id).slice(0, 8)}` : 'Detalle del viaje';
  const alertas = detail?.alertas?.length
    ? detail.alertas
    : (detail ? emergencies.filter((e) => String(e.viajeId || e.tripId) === String(detail.id)) : []);
  const ganancia = detail?.ganancias?.[0];
  const conductor = detail?.conductor;
  const cliente = detail?.cliente;
  // Punto del SOS más reciente del viaje (si lo hay) para marcarlo en el mapa.
  const sos = alertas.find((a) => a.lat != null && a.lng != null);
  const marcaSos = sos ? { lat: sos.lat, lng: sos.lng, at: sos.createdAt } : null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description={detail ? <StatusBadge status={detail.estado} label={detail.estadoLabel} /> : undefined}
      size="lg"
    >
      {loading && !detail && <LoadingState message="Cargando detalle…" />}
      {error && <div className="page-error" role="alert">{error}</div>}
      {detail && (
        <div className="trip-detail">
          <section className="trip-detail__section">
            <h4 className="section-title">Seguimiento</h4>
            <ServiceStatusTimeline estado={detail.estado} />
            {detail.disputa && (
              <div className="row">
                <Link className="btn btn--soft-danger btn--sm" to={`/moderator/disputes?viaje=${detail.id}`}>Ver disputa</Link>
              </div>
            )}
          </section>

          <RouteMap key={detail.id} viajeId={detail.id} origen={detail.origen} destino={detail.destino} marcaSos={marcaSos} />

          <div className="two-col">
            <section className="trip-detail__card">
              <h4 className="section-title">Cliente</h4>
              <div className="cell-user">
                <Avatar src={cliente?.avatar} name={fullName(cliente)} size={40} />
                <div className="cell-user__text">
                  <span className="cell-user__name">{cliente?.nombre || '—'}</span>
                  {detail.contactoVisible === false ? (
                    <span className="cell-user__meta">Contacto reservado: solo con ticket, SOS o disputa</span>
                  ) : (
                    <>
                      {cliente?.telefono && (
                        <a className="trip-detail__link" href={`tel:${cliente.telefono}`}><Phone size={12} /> {cliente.telefono}</a>
                      )}
                      {cliente?.email && <span className="cell-user__meta">{cliente.email}</span>}
                    </>
                  )}
                </div>
              </div>
              {cliente?.id && (
                <div className="row">
                  <Link className="btn btn--soft-primary btn--sm" to={`/moderator/clients/${cliente.id}`}>Ver perfil</Link>
                </div>
              )}
            </section>

            <section className="trip-detail__card">
              <h4 className="section-title">Conductor</h4>
              <div className="cell-user">
                <span className="trip-detail__vehicle"><Car size={18} /></span>
                <div className="cell-user__text">
                  <span className="cell-user__name">
                    {conductor?.nombre || '—'} {conductor?.placa && <span className="text-mono text-warning">{conductor.placa}</span>}
                  </span>
                  <span className="cell-user__meta">
                    {[conductor?.tipoVehiculo, conductor?.ciudad].filter(Boolean).join(' · ')}
                  </span>
                  <span className="cell-user__meta trip-detail__rating">
                    <Star size={12} /> {conductor?.calificacion || '0.0'} · {conductor?.totalViajes || 0} viajes
                    <Badge variant={conductor?.online ? 'success' : 'neutral'} size="sm">
                      <span className="badge__dot" aria-hidden="true" />
                      {conductor?.online ? 'En línea' : 'Desconectado'}
                    </Badge>
                  </span>
                  {conductor?.telefono && (
                    <a className="trip-detail__link" href={`tel:${conductor.telefono}`}><Phone size={12} /> {conductor.telefono}</a>
                  )}
                </div>
              </div>
              {(conductor?.id || conductor?.usuarioId) && (
                <div className="row">
                  {conductor.id && (
                    <Link className="btn btn--soft-primary btn--sm" to={`/moderator/drivers/${conductor.id}`}>Ver ficha</Link>
                  )}
                  {conductor.usuarioId && (
                    <Link className="btn btn--soft-primary btn--sm" to={`/moderator/conversations?usuario=${conductor.usuarioId}`}>Chat con conductor</Link>
                  )}
                </div>
              )}
            </section>
          </div>

          <section className="trip-detail__card">
            <h4 className="section-title">Dinero</h4>
            <div className="detail-list">
              <div className="detail-list__item">
                <span className="detail-list__label">Precio al cliente</span>
                <span className="detail-list__value">{formatCurrency(detail.dinero?.precioCliente)}</span>
              </div>
              <div className="detail-list__item">
                <span className="detail-list__label">Estimado</span>
                <span className="detail-list__value">{formatCurrency(detail.dinero?.precioEstimado)}</span>
              </div>
              <div className="detail-list__item">
                <span className="detail-list__label">Oferta aceptada</span>
                <span className="detail-list__value">{formatCurrency(detail.dinero?.ofertaAceptada)}</span>
              </div>
              <div className="detail-list__item">
                <span className="detail-list__label">Precio final</span>
                <span className="detail-list__value text-success">{formatCurrency(detail.dinero?.precioFinal)}</span>
              </div>
            </div>
            {ganancia && (
              <div className="trip-detail__earning">
                <span className="text-muted">Ganancia conductor:</span>
                <span>{formatCurrency(ganancia.montoBruto)} bruto · {formatCurrency(ganancia.montoNeto)} neto · Comisión: {formatCurrency(ganancia.comision)}</span>
                <Badge variant={ganancia.comisionPagada ? 'success' : 'warning'} size="sm">
                  {ganancia.comisionPagada ? 'Pagada' : 'Pendiente'}
                </Badge>
              </div>
            )}
          </section>

          {detail.ofertas?.length > 0 && (
            <section className="trip-detail__card">
              <h4 className="section-title">Ofertas ({detail.ofertas.length})</h4>
              <ul className="trip-detail__offers">
                {detail.ofertas.map((o) => (
                  <li key={o.id} className="row row--between">
                    <span>{o.conductor?.nombre || o.conductor?.placa || 'Conductor'} · <span className="text-strong">{formatCurrency(o.monto)}</span></span>
                    <StatusBadge status={o.estado} size="sm" />
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="trip-detail__section">
            <h4 className="section-title">Emergencias</h4>
            {alertas.length > 0 ? (
              <div className="stack">
                {alertas.map((a) => <EmergencyItem key={a.id} alerta={a} onChanged={onEmergencyChanged} />)}
              </div>
            ) : (
              <p className="text-sm text-muted trip-detail__none"><CircleCheck size={14} /> Sin emergencias para este viaje</p>
            )}
          </section>

          {detail.estado === 'pendiente_confirmacion' && (
            <PendingCloseResolver tripId={detail.id} onResolved={onEmergencyChanged} />
          )}

          {detail.motivoCancelacion && (
            <div className="page-error"><span className="text-strong">Motivo de cancelación:</span> {detail.motivoCancelacion}</div>
          )}

          {detail.fotoEntrega && (
            <section className="trip-detail__section">
              <h4 className="section-title">Foto de entrega</h4>
              <a href={resolveStorageUrl(detail.fotoEntrega)} target="_blank" rel="noreferrer">
                <img className="trip-detail__photo" src={resolveStorageUrl(detail.fotoEntrega)} alt="Foto de entrega" />
              </a>
            </section>
          )}
        </div>
      )}
    </Modal>
  );
}
