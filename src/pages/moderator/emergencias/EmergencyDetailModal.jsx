import { CheckCheck, ExternalLink, FolderOpen, Phone, Siren, Star } from 'lucide-react';
import { formatCurrency, formatDateTime } from '../../../utils/format';
import {
  Modal, Badge, Button, StatusBadge, Textarea,
} from '../../../components/ui';
import EmergencyChat from './EmergencyChat';

const mapsUrl = (lat, lng) => `https://www.google.com/maps?q=${lat},${lng}`;

/** Determina quién activó el SOS (conductor o cliente) comparando con los datos del viaje. */
function resolveParties(alerta, viaje) {
  if (!viaje) return null;
  const esConductor = (viaje.conductor?.telefono && alerta.usuario?.telefono && viaje.conductor.telefono === alerta.usuario.telefono)
    || viaje.conductor?.nombre === alerta.usuario?.nombre;
  return {
    solicitante: esConductor ? viaje.conductor : viaje.cliente,
    contraparte: esConductor ? viaje.cliente : viaje.conductor,
    solicitanteRol: esConductor ? 'Conductor' : 'Cliente',
    contraparteRol: esConductor ? 'Cliente' : 'Conductor',
  };
}

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
  const parties = resolveParties(selected, tripDetail);
  const conductor = tripDetail?.conductor;
  const hasLocation = selected.lat && selected.lng;
  const busy = actionLoading === selected.id;
  const chatTitle = parties?.solicitante
    ? `Chat con ${parties.solicitante.nombre || selected.usuario?.nombre || 'solicitante'}`
    : 'Chat de emergencia';

  let footer = null;
  if (selected.estado === 'pendiente') {
    footer = (
      <Button variant="danger" icon={<FolderOpen size={15} />} loading={busy} onClick={onAcknowledge}>
        Abrir caso
      </Button>
    );
  } else if (selected.estado === 'atendida') {
    footer = (
      <Button variant="success" icon={<CheckCheck size={15} />} loading={busy} disabled={!observacion.trim()} onClick={onResolve}>
        Marcar resuelta
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

        {parties && (
          <div className="two-col">
            <section className="em-card em-card--danger">
              <h4 className="section-title em-card__danger-title"><Siren size={13} /> Solicitante · quien activó el SOS</h4>
              <div className="em-person">
                <span className="em-person__name">
                  {parties.solicitante?.nombre || selected.usuario?.nombre || '—'}
                  <Badge variant="danger" size="sm">{parties.solicitanteRol}</Badge>
                </span>
                <PhoneLink value={parties.solicitante?.telefono || selected.usuario?.telefono} />
                {parties.solicitante?.email && <span className="text-sm text-muted">{parties.solicitante.email}</span>}
                {parties.solicitante?.placa && (
                  <span className="text-sm text-muted em-inline">
                    Placa {parties.solicitante.placa} · {parties.solicitante.tipoVehiculo || '—'} · <Star size={12} /> {parties.solicitante.calificacion || '0.0'}
                  </span>
                )}
              </div>
            </section>
            <section className="em-card">
              <h4 className="section-title">Contraparte · {parties.contraparteRol}</h4>
              <div className="em-person">
                <span className="em-person__name">{parties.contraparte?.nombre || '—'}</span>
                <PhoneLink value={parties.contraparte?.telefono} />
                {parties.contraparte?.placa && (
                  <span className="text-sm text-muted">Placa {parties.contraparte.placa} · {parties.contraparte.tipoVehiculo || '—'}</span>
                )}
              </div>
            </section>
          </div>
        )}

        {tripDetail && (
          <section className="em-card">
            <h4 className="section-title">Conductor</h4>
            <div className="detail-list">
              <div className="detail-list__item"><span className="detail-list__label">Nombre</span><span className="detail-list__value">{conductor?.nombre || '—'}</span></div>
              <div className="detail-list__item"><span className="detail-list__label">Placa</span><span className="detail-list__value text-mono">{conductor?.placa || '—'}</span></div>
              <div className="detail-list__item"><span className="detail-list__label">Cédula</span><span className="detail-list__value">{conductor?.cedula || conductor?.cedulaConductor || '—'}</span></div>
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
