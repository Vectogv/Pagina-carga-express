import { useState, useEffect } from 'react';
import { Phone } from 'lucide-react';
import { getTripById } from '../../../api/admin';
import { Modal, StatusBadge, LoadingState } from '../../../components/ui';
import { resolveStorageUrl } from '../../../utils/storage';
import { errorMessage, formatDateTime } from '../../../utils/format';
import { DisputeSummary } from './DisputeParts';

function Photo({ label, path }) {
  if (!path) return null;
  const url = resolveStorageUrl(path);
  return (
    <div className="stack">
      <span className="detail-list__label">{label}</span>
      <a href={url} target="_blank" rel="noopener noreferrer" aria-label={`Abrir ${label} en una pestaña nueva`}>
        <img src={url} alt={label} className="thumb thumb--link" loading="lazy" />
      </a>
    </div>
  );
}

/**
 * El listado GET /api/admin/disputes (admin_controller.ts#disputes) no trae teléfonos,
 * foto de entrega ni coordenadas de la ruta. Esos datos sí los da GET /api/trips/:id
 * (trip_controller.ts#show, accesible para admin), así que se piden aparte al abrir
 * el detalle y se combinan con la fila de la disputa.
 */
export default function DisputeDetailModal({ dispute, onClose }) {
  const [trip, setTrip] = useState(null);
  const [loadingTrip, setLoadingTrip] = useState(false);
  const [tripError, setTripError] = useState(null);

  useEffect(() => {
    if (!dispute?.viajeId) { setTrip(null); return; }
    let cancelled = false;
    setTrip(null);
    setTripError(null);
    setLoadingTrip(true);
    getTripById(dispute.viajeId)
      .then((res) => { if (!cancelled) setTrip(res.data); })
      .catch((err) => { if (!cancelled) setTripError(errorMessage(err, 'No se pudo cargar el detalle del viaje')); })
      .finally(() => { if (!cancelled) setLoadingTrip(false); });
    return () => { cancelled = true; };
  }, [dispute?.viajeId]);

  const origen = trip?.origen?.direccion || dispute?.viaje?.origen;
  const destino = trip?.destino?.direccion || dispute?.viaje?.destino;
  const fotos = Array.isArray(dispute?.fotos) ? dispute.fotos : [];

  return (
    <Modal
      isOpen={!!dispute}
      onClose={onClose}
      title={dispute ? `Disputa #${dispute.id}` : 'Detalle de disputa'}
      description="Información de la disputa, evidencia y datos de contacto."
      size="lg"
    >
      {dispute && (
        <div className="dispute-detail">
          <section className="stack">
            <h3 className="section-title">Resumen</h3>
            <DisputeSummary row={dispute} />
          </section>

          <section className="stack">
            <h3 className="section-title">Ruta del viaje</h3>
            <div className="dispute-route">
              <span><span className="text-strong">Origen: </span>{origen || '—'}</span>
              <span><span className="text-strong">Destino: </span>{destino || '—'}</span>
            </div>
          </section>

          <div className="two-col">
            <section className="stack">
              <h3 className="section-title">Cliente</h3>
              <span className="cell-user__name">{dispute.cliente?.nombre || '—'}</span>
              {dispute.cliente?.email && <span className="cell-user__meta">{dispute.cliente.email}</span>}
              {trip?.cliente?.telefono && (
                <a className="dispute-phone" href={`tel:${trip.cliente.telefono}`}><Phone size={12} /> {trip.cliente.telefono}</a>
              )}
            </section>
            <section className="stack">
              <h3 className="section-title">Conductor</h3>
              <span className="cell-user__name">
                {dispute.conductor?.nombre || '—'}
                {dispute.conductor?.placa && <span className="text-mono text-warning"> {dispute.conductor.placa}</span>}
              </span>
              {trip?.conductor?.telefono && (
                <a className="dispute-phone" href={`tel:${trip.conductor.telefono}`}><Phone size={12} /> {trip.conductor.telefono}</a>
              )}
            </section>
          </div>

          {loadingTrip && <LoadingState message="Cargando datos del viaje…" />}
          {tripError && <div className="page-error" role="alert">{tripError}</div>}

          {dispute.versionCliente && (
            <section className="stack">
              <h3 className="section-title">Motivo del cliente</h3>
              <p className="dispute-text">{dispute.versionCliente}</p>
            </section>
          )}

          {dispute.versionConductor && (
            <section className="stack">
              <h3 className="section-title">Versión del conductor</h3>
              <p className="dispute-text">{dispute.versionConductor}</p>
            </section>
          )}

          {(fotos.length > 0 || dispute.soporteCliente || trip?.fotoEntrega) && (
            <section className="stack">
              <h3 className="section-title">Evidencia</h3>
              <div className="form-grid">
                {trip?.fotoEntrega && <Photo label="Foto de entrega (conductor)" path={trip.fotoEntrega} />}
                {dispute.soporteCliente && <Photo label="Soporte del cliente" path={dispute.soporteCliente} />}
                {fotos.map((f, i) => <Photo key={f || i} label={`Evidencia ${i + 1}`} path={f} />)}
              </div>
            </section>
          )}

          <section className="stack">
            <h3 className="section-title">Cronología</h3>
            <div className="detail-list">
              <div className="detail-list__item">
                <span className="detail-list__label">Disputa abierta</span>
                <span className="detail-list__value">{formatDateTime(dispute.createdAt)}</span>
              </div>
              {trip?.createdAt && (
                <div className="detail-list__item">
                  <span className="detail-list__label">Viaje solicitado</span>
                  <span className="detail-list__value">{formatDateTime(trip.createdAt)}</span>
                </div>
              )}
              {trip?.completadoAt && (
                <div className="detail-list__item">
                  <span className="detail-list__label">Viaje completado</span>
                  <span className="detail-list__value">{formatDateTime(trip.completadoAt)}</span>
                </div>
              )}
              {trip?.canceladoAt && (
                <div className="detail-list__item">
                  <span className="detail-list__label">Viaje cancelado</span>
                  <span className="detail-list__value">{formatDateTime(trip.canceladoAt)}</span>
                </div>
              )}
            </div>
          </section>

          {dispute.estado === 'resuelta' && (
            <section className="stack">
              <h3 className="section-title">Resolución</h3>
              <p className="text-strong">
                Resultado: <span className="text-primary-color">
                  {dispute.resultado === 'favor_conductor' ? 'A favor del conductor' : 'A favor del cliente'}
                </span>
              </p>
            </section>
          )}

          {dispute.estado !== 'resuelta' && (
            <p className="text-sm text-muted">
              Estado actual: <StatusBadge status={dispute.estado} />
            </p>
          )}
        </div>
      )}
    </Modal>
  );
}
