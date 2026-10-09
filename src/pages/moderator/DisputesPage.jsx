import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getModeratorDisputes } from '../../api/moderator';
import { useModeratorCity } from '../../contexts/ModeratorCityContext';
import { errorMessage, formatCurrency, formatDate, formatDateTime, toList } from '../../utils/format';
import { resolveStorageUrl } from '../../utils/storage';
import {
  PageHeader, SegmentedFilter, DataTable, Modal, Button, StatusBadge, Pagination,
} from '../../components/ui';
import { TarjetaPersona } from '../../components/panel';

const LIMIT = 20;
const FILTROS = [
  { value: 'abierta,en_revision', label: 'Activas' },
  { value: 'resuelta', label: 'Resueltas' },
  { value: '', label: 'Todas' },
];
const RESULTADO = { favor_conductor: 'A favor del conductor', favor_cliente: 'A favor del cliente' };

// Solo lectura: el moderador ve las disputas de su zona y llega al viaje, al conductor y
// al chat; resolverlas es exclusivo del administrador.
export default function ModeratorDisputesPage() {
  const { ciudadParams } = useModeratorCity();
  const [searchParams] = useSearchParams();
  const viajeParam = searchParams.get('viaje');
  const [disputes, setDisputes] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [estado, setEstado] = useState(viajeParam ? '' : FILTROS[0].value);
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState(null);

  const fetchDisputes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getModeratorDisputes({ page, limit: LIMIT, estado: estado || undefined, viaje: viajeParam || undefined, ...ciudadParams });
      setDisputes(toList(res.data, 'data', 'disputes'));
      setTotal(res.data?.total ?? 0);
    } catch (err) {
      const st = err.response?.status;
      if (st === 403) setError(err.response?.data?.error || 'No tienes permisos de moderador o ciudad no asignada');
      else setError(errorMessage(err, 'Error al cargar las disputas'));
    } finally {
      setLoading(false);
    }
  }, [page, estado, viajeParam, ciudadParams]);

  useEffect(() => { fetchDisputes(); }, [fetchDisputes]);

  // ?viaje=ID (desde el viaje o la ficha del conductor): filtra en el cliente y abre la primera.
  const visibles = viajeParam ? disputes.filter((d) => String(d.viajeId) === String(viajeParam)) : disputes;
  useEffect(() => {
    if (!loading && viajeParam && visibles.length > 0 && !detail) setDetail(visibles[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, viajeParam]);

  const columns = [
    { key: 'id', label: 'Disputa', render: (v) => <span className="text-mono text-muted">#{v}</span> },
    { key: 'estado', label: 'Estado', render: (v) => <StatusBadge status={v} /> },
    { key: 'problema', label: 'Problema', render: (v, r) => v || r.descripcion || r.versionCliente || '—' },
    {
      key: 'viajeId',
      label: 'Viaje',
      render: (v) => <Link className="text-mono text-strong" to={`/moderator/trips?viaje=${v}`} onClick={(e) => e.stopPropagation()}>#{v}</Link>,
    },
    {
      key: 'conductor',
      label: 'Conductor',
      render: (c) => (c ? <TarjetaPersona persona={c} tipo="conductor" area="moderator" /> : '—'),
    },
    // Una disputa es un caso: el servidor ya manda el teléfono solo cuando corresponde.
    { key: 'cliente', label: 'Cliente', render: (c) => (c ? <TarjetaPersona persona={c} tipo="cliente" area="moderator" /> : '—') },
    { key: 'createdAt', label: 'Fecha', render: (v) => <span className="nowrap text-muted">{formatDate(v)}</span> },
  ];

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));
  const d = detail;
  const fotos = Array.isArray(d?.fotos) ? d.fotos : [];

  return (
    <div className="page">
      <PageHeader
        title="Disputas"
        description="Disputas de los viajes de tu zona. Puedes leer las dos versiones y escribirle al cliente o al conductor; la resolución es del administrador."
      />

      <div className="toolbar">
        <SegmentedFilter options={FILTROS} value={estado} onChange={(v) => { setEstado(v); setPage(1); }} ariaLabel="Filtrar por estado" />
        {viajeParam && (
          <Link className="btn btn--ghost btn--sm" to="/moderator/disputes">Ver todas (filtrando viaje #{viajeParam})</Link>
        )}
      </div>

      {error && <div className="page-error" role="alert">{error}</div>}

      <DataTable
        columns={columns}
        data={visibles}
        loading={loading}
        onRowClick={setDetail}
        emptyMessage={viajeParam ? `El viaje #${viajeParam} no tiene disputas en esta lista` : 'No hay disputas para mostrar'}
      />

      {!viajeParam && totalPages > 1 && <Pagination page={page} totalPages={totalPages} total={total} onChange={setPage} />}

      <Modal
        isOpen={!!d}
        onClose={() => setDetail(null)}
        title={d ? `Disputa #${d.id}` : ''}
        description={d ? `Viaje #${d.viajeId} · ${formatDateTime(d.createdAt)}` : undefined}
        size="lg"
        footer={d && (
          <>
            <Button variant="secondary" onClick={() => setDetail(null)}>Cerrar</Button>
            <Link className="btn btn--soft-primary btn--sm" to={`/moderator/trips?viaje=${d.viajeId}`}>Ver viaje</Link>
            {d.conductor?.usuarioId && (
              <Link className="btn btn--soft-primary btn--sm" to={`/moderator/conversations?usuario=${d.conductor.usuarioId}`}>Chat con conductor</Link>
            )}
            {d.cliente?.id && (
              <Link className="btn btn--soft-primary btn--sm" to={`/moderator/conversations?usuario=${d.cliente.id}`}>Chat con cliente</Link>
            )}
          </>
        )}
      >
        {d && (
          <div className="stack">
            <div className="detail-list">
              <div className="detail-list__item"><span className="detail-list__label">Estado</span><span className="detail-list__value"><StatusBadge status={d.estado} /></span></div>
              <div className="detail-list__item"><span className="detail-list__label">Problema</span><span className="detail-list__value">{d.problema || '—'}</span></div>
              <div className="detail-list__item"><span className="detail-list__label">Descripción</span><span className="detail-list__value">{d.descripcion || '—'}</span></div>
              <div className="detail-list__item">
                <span className="detail-list__label">Conductor</span>
                <span className="detail-list__value">{d.conductor ? <TarjetaPersona persona={d.conductor} tipo="conductor" area="moderator" /> : '—'}</span>
              </div>
              <div className="detail-list__item">
                <span className="detail-list__label">Cliente</span>
                <span className="detail-list__value">{d.cliente ? <TarjetaPersona persona={d.cliente} tipo="cliente" area="moderator" /> : '—'}</span>
              </div>
              <div className="detail-list__item"><span className="detail-list__label">Ruta</span><span className="detail-list__value">{d.viaje?.origen || '—'} → {d.viaje?.destino || '—'}</span></div>
              <div className="detail-list__item"><span className="detail-list__label">Monto</span><span className="detail-list__value">{d.viaje?.montoFinal != null ? formatCurrency(d.viaje.montoFinal) : '—'}</span></div>
            </div>
            {d.versionCliente && (<><h3 className="section-title">Versión del cliente</h3><p>{d.versionCliente}</p></>)}
            {d.versionConductor && (<><h3 className="section-title">Versión del conductor</h3><p>{d.versionConductor}</p></>)}
            {(fotos.length > 0 || d.soporteCliente) && (
              <>
                <h3 className="section-title">Evidencias</h3>
                <div className="form-grid">
                  {[...(d.soporteCliente ? [d.soporteCliente] : []), ...fotos].map((p, i) => {
                    const url = resolveStorageUrl(p);
                    return url ? (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                        <img src={url} alt={`Evidencia ${i + 1}`} className="thumb thumb--link" loading="lazy" />
                      </a>
                    ) : null;
                  })}
                </div>
              </>
            )}
            {d.estado === 'resuelta' && (
              <div className="detail-list">
                <div className="detail-list__item"><span className="detail-list__label">Resultado</span><span className="detail-list__value">{RESULTADO[d.resultado] || d.resultado || '—'}</span></div>
                {d.comentarioAdmin && <div className="detail-list__item"><span className="detail-list__label">Comentario del admin</span><span className="detail-list__value">{d.comentarioAdmin}</span></div>}
                {d.resueltaAt && <div className="detail-list__item"><span className="detail-list__label">Resuelta</span><span className="detail-list__value">{formatDateTime(d.resueltaAt)}</span></div>}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
