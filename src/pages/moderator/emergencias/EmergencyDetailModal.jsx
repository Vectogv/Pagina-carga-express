import { CheckCheck, ExternalLink, Phone, Siren, Star } from 'lucide-react';
import { formatCurrency, formatDateTime } from '../../../utils/format';
import {
  Modal, Badge, Button, StatusBadge, Textarea,
} from '../../../components/ui';
import RouteMap from '../../../components/maps/RouteMap';
import { sosRouteProps, hasRoutePoints } from '../../../components/maps/sosRoute';
import { MapaRecorrido } from '../../../components/panel';
import EmergencyChat from './EmergencyChat';

const mapsUrl = (lat, lng) => `https://www.google.com/maps?q=${lat},${lng}`;

const ROL_LABEL = { conductor: 'Conductor', cliente: 'Cliente' };

function PhoneLink({ value }) {
  if (!value) return null;
  return <a className="em-link" href={`tel:${value}`}><Phone size={12} /> {value}</a>;
}

export default function EmergencyDetailModal({
  selected, tripDetail, onClose,
  chat, observacion, onObservacionChange,
  actionLoading, onAcknowledge, onResolve,
}) {
  if (!selected) return null;
  // El servidor manda en `usuario` a quien activó el SOS (con su rol); no hay que adivinarlo.
  const solicitante = selected.usuario;
  const conductor = tripDetail?.conductor;
  const hasLocation = selected.lat && selected.lng;
  const mapa = sosRouteProps(selected, tripDetail);
  // Con viaje: ruta planeada (azul), recorrido real (rojo) y el punto del SOS. Sin viaje: solo el punto.
  const viajeId = selected.viajeId || selected.tripId || selected.viaje?.id || tripDetail?.id || null;
  const marcaSos = hasLocation ? { lat: selected.lat, lng: selected.lng, at: selected.createdAt } : null;
  const busy = actionLoading === selected.id;
  const chatTitle = solicitante?.nombre ? `Chat con ${solicitante.nombre}` : 'Chat de emergencia';

  let footer = null;
  if (selected.estado === 'pendiente') {
    footer = (
      <Button variant="danger" icon={<Siren size={15} />} loading={busy} onClick={onAcknowledge}>
        Atender
      </Button>
    );
  } else if (selected.estado === 'atendida') {
    footer = (
      <Button variant="success" icon={<CheckCheck size={15} />} loading={busy} disabled={!observacion.trim()} onClick={onResolve}>
        Resolver
      </Button>
    );
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={`Caso #${String(selected.id || '').slice(0, 8)}`}
      description={(
        <span className="row">
          <StatusBadge status={selected.estado} label={selected.estadoLabel} />
          <span>{formatDateTime(selected.createdAt)}</span>
        </span>
      )}
      size="lg"
      footer={footer}
    >
      <div className="em-detail">
        <section className="em-card">
          <h4 className="section-title">El problema</h4>
          <p className="em-detail__motivo">{selected.motivo || '—'}</p>
          <p className="text-sm text-muted row">
            <span className="text-mono">Lat {selected.lat ?? '—'}, Lng {selected.lng ?? '—'}</span>
            {hasLocation && (
              <a className="em-link" href={mapsUrl(selected.lat, selected.lng)} target="_blank" rel="noreferrer">
                <ExternalLink size={12} /> Ver mapa
              </a>
            )}
          </p>
        </section>

        {viajeId ? (
          <section className="em-card">
            <h4 className="section-title">Mapa del SOS</h4>
            <MapaRecorrido key={viajeId} area="moderator" viajeId={viajeId} alturaPx={280} marcaSos={marcaSos} />
          </section>
        ) : hasRoutePoints(mapa) && (
          <section className="em-card">
            <h4 className="section-title">Mapa del SOS</h4>
            <RouteMap {...mapa} alto={280} />
          </section>
        )}

        {solicitante && (
          <section className="em-card em-card--danger">
            <h4 className="section-title em-card__danger-title"><Siren size={13} /> Solicitante · quien activó el SOS</h4>
            <div className="em-person">
              <span className="em-person__name">
                {solicitante.nombre || '—'}
                {ROL_LABEL[solicitante.rol] && <Badge variant="danger" size="sm">{ROL_LABEL[solicitante.rol]}</Badge>}
              </span>
              <PhoneLink value={solicitante.telefono} />
              {solicitante.email && <span className="text-sm text-muted">{solicitante.email}</span>}
            </div>
          </section>
        )}

        {tripDetail && (
          <section className="em-card">
            <h4 className="section-title">Conductor</h4>
            <div className="detail-list">
              <div className="detail-list__item"><span className="detail-list__label">Nombre</span><span className="detail-list__value">{conductor?.nombre || '—'}</span></div>
              <div className="detail-list__item"><span className="detail-list__label">Placa</span><span className="detail-list__value text-mono">{conductor?.placa || '—'}</span></div>
              <div className="detail-list__item">
                <span className="detail-list__label">Teléfono</span>
                <span className="detail-list__value">{conductor?.telefono ? <PhoneLink value={conductor.telefono} /> : '—'}</span>
              </div>
              <div className="detail-list__item"><span className="detail-list__label">Tipo</span><span className="detail-list__value">{conductor?.tipoVehiculo || '—'}</span></div>
              <div className="detail-list__item"><span className="detail-list__label">Ciudad</span><span className="detail-list__value">{conductor?.ciudad || '—'}</span></div>
              <div className="detail-list__item">
                <span className="detail-list__label">Calificación</span>
                <span className="detail-list__value em-inline"><Star size={13} className="text-warning" /> {conductor?.calificacion || '0.0'}</span>
              </div>
              <div className="detail-list__item">
                <span className="detail-list__label">Precio</span>
                <span className="detail-list__value">{formatCurrency(tripDetail.dinero?.precioFinal || tripDetail.dinero?.precioCliente)}</span>
              </div>
            </div>
          </section>
        )}

        <EmergencyChat title={chatTitle} readOnly={selected.estado === 'resuelta'} {...chat} />

        {selected.estado === 'atendida' && (
          <section className="em-card">
            <h4 className="section-title">Gestión del caso</h4>
            <p className="text-sm text-muted">
              Atendido por {selected.administrador || selected.atendidoPor || '—'}{selected.atendidaAt ? ` · ${formatDateTime(selected.atendidaAt)}` : ''}
            </p>
            <Textarea
              label="Observación / gestión realizada"
              required
              value={observacion}
              onChange={(e) => onObservacionChange(e.target.value)}
              placeholder="Describe la gestión realizada…"
              rows={3}
            />
          </section>
        )}

        {selected.estado === 'resuelta' && (
          <section className="em-card em-card--success">
            <h4 className="section-title em-card__success-title"><CheckCheck size={13} /> Resuelta</h4>
            <p className="text-secondary">{selected.observacion || 'Sin observación'}</p>
            <p className="text-sm text-muted">
              Atendido por {selected.administrador || selected.atendidoPor || '—'}{selected.atendidaAt ? ` · ${formatDateTime(selected.atendidaAt)}` : ''}
            </p>
            <p className="text-sm text-muted">
              Resuelto por {selected.resueltoPor || '—'}{selected.resueltaAt ? ` · ${formatDateTime(selected.resueltaAt)}` : ''}
            </p>
          </section>
        )}
      </div>
    </Modal>
  );
}
