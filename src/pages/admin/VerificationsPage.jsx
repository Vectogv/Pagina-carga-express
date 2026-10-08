import { useState, useEffect, useCallback } from 'react';
import { Check, Eye, X } from 'lucide-react';
import {
  getVerifications, approveVerification, rejectVerification, resolveSoatException,
} from '../../api/admin';
import { resolveStorageUrl } from '../../utils/storage';
import { faltantesDe, textoFaltantes } from '../../utils/documentos';
import { errorMessage, formatDate, fullName, toList } from '../../utils/format';
import {
  Avatar, Badge, Button, ConfirmDialog, DataTable, Modal, PageHeader, Textarea,
} from '../../components/ui';

const hoy = () => new Date().toISOString().slice(0, 10);
const vencido = (fecha) => !!fecha && String(fecha).slice(0, 10) < hoy();

function Photo({ label, path, vence }) {
  if (!path) return null;
  const url = resolveStorageUrl(path);
  return (
    <div className="stack">
      <span className="detail-list__label">{label}</span>
      <a href={url} target="_blank" rel="noopener noreferrer" aria-label={`Abrir ${label} en una pestaña nueva`}>
        <img src={url} alt={label} className="thumb thumb--link" loading="lazy" />
      </a>
      {vence !== undefined && (
        <span className={vencido(vence) ? 'text-danger' : 'cell-user__meta'}>
          {vence ? `Vence ${formatDate(vence)}${vencido(vence) ? ' (vencido)' : ''}` : 'Sin fecha de vencimiento'}
        </span>
      )}
    </div>
  );
}

const ESTADO_EXCEPCION = {
  pendiente: { label: 'En revisión', variant: 'warning' },
  aprobada: { label: 'Aprobada', variant: 'success' },
  rechazada: { label: 'Rechazada', variant: 'danger' },
};

// GET /api/admin/verifications (admin_controller.ts#pendingVerifications) solo
// trae conductores con estadoVerificacion 'pendiente' y no incluye estado por
// documento; la única acción posible es aprobar o rechazar al conductor entero.
export default function VerificationsPage() {
  const [verifications, setVerifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const [nota, setNota] = useState('');

  const fetchVerifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getVerifications({ page: 1, limit: 100 });
      setVerifications(toList(res.data));
    } catch (err) {
      setError(errorMessage(err, 'Error al cargar las verificaciones'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchVerifications(); }, [fetchVerifications]);

  const closeConfirm = () => { setConfirmAction(null); setNota(''); };

  const handleApprove = async () => {
    try {
      await approveVerification(confirmAction.id);
      closeConfirm();
      await fetchVerifications();
    } catch (err) {
      setError(errorMessage(err, 'Error al aprobar verificación'));
    }
  };

  const handleReject = async () => {
    try {
      const payload = nota.trim() ? { nota: nota.trim() } : {};
      await rejectVerification(confirmAction.id, payload);
      closeConfirm();
      await fetchVerifications();
    } catch (err) {
      setError(errorMessage(err, 'Error al rechazar verificación'));
    }
  };

  const ask = (row, type) => (e) => {
    e.stopPropagation();
    setConfirmAction({ ...row, type });
  };

  const handleSoat = async () => {
    try {
      const payload = { aprobar: confirmAction.type === 'soat-approve' };
      if (nota.trim()) payload.nota = nota.trim();
      await resolveSoatException(confirmAction.id, payload);
      closeConfirm();
      setSelected(null);
      await fetchVerifications();
    } catch (err) {
      setError(errorMessage(err, 'Error al resolver la excepción del SOAT'));
    }
  };

  const columns = [
    {
      key: 'usuario',
      label: 'Conductor',
      render: (_, row) => (
        <div className="cell-user">
          <Avatar name={fullName(row.usuario)} />
          <div className="cell-user__text">
            <span className="cell-user__name">{fullName(row.usuario) || 'Sin nombre'}</span>
            <span className="cell-user__meta">{row.usuario?.email || '—'}</span>
          </div>
        </div>
      ),
    },
    { key: 'cedula', label: 'Cédula', render: (v) => v || '—' },
    {
      key: 'vehiculo',
      label: 'Vehículo',
      render: (_, row) => (
        <div className="cell-user__text">
          <span>{row.tipoVehiculo || '—'}</span>
          <span className="cell-user__meta">{row.placa || ''}{row.capacidad ? ` (${row.capacidad})` : ''}</span>
        </div>
      ),
    },
    { key: 'telefono', label: 'Teléfono', render: (_, row) => row.usuario?.telefono || '—' },
    {
      key: 'soat',
      label: 'SOAT',
      render: (_, row) => {
        if (row.excepcionSoatEstado) {
          const e = ESTADO_EXCEPCION[row.excepcionSoatEstado];
          return <Badge variant={e.variant}>Excepción: {e.label.toLowerCase()}</Badge>;
        }
        if (!row.fotoSoat) return <span className="cell-user__meta">Sin SOAT</span>;
        return <span className={vencido(row.soatVence) ? 'text-danger' : ''}>{formatDate(row.soatVence)}</span>;
      },
    },
    { key: 'createdAt', label: 'Solicitado', render: (v) => <span className="nowrap">{formatDate(v)}</span> },
    {
      key: 'acciones',
      label: '',
      align: 'right',
      render: (_, row) => {
        // Sin los 6 documentos y el número de cédula el servidor responde 422: se bloquea aquí con el motivo.
        const bloqueado = textoFaltantes(faltantesDe(row));
        return (
          <div className="acciones-fila">
            <div className="acciones-fila__botones">
              <Button size="sm" variant="ghost" icon={<Eye size={14} />} onClick={(e) => { e.stopPropagation(); setSelected(row); }}>
                Ver
              </Button>
              <Button size="sm" variant="soft-success" icon={<Check size={14} />} disabled={!!bloqueado} title={bloqueado || undefined} onClick={ask(row, 'approve')}>Aprobar</Button>
              <Button size="sm" variant="soft-danger" icon={<X size={14} />} onClick={ask(row, 'reject')}>Rechazar</Button>
            </div>
            {bloqueado && <span className="acciones-fila__aviso">{bloqueado}</span>}
          </div>
        );
      },
    },
  ];

  const isApprove = confirmAction?.type === 'approve';
  const isSoat = confirmAction?.type === 'soat-approve' || confirmAction?.type === 'soat-reject';
  const isSoatApprove = confirmAction?.type === 'soat-approve';
  const confirmName = fullName(confirmAction?.usuario) || 'este conductor';
  const soatSel = selected ? ESTADO_EXCEPCION[selected.excepcionSoatEstado] : null;

  return (
    <div className="page">
      <PageHeader title="Verificaciones" description="Conductores nuevos esperando que revises su licencia, SOAT, técnico-mecánica, tarjeta de propiedad, foto del vehículo, foto del conductor y número de cédula. Para aprobarlos necesitan todo eso y SOAT vigente o una excepción de SOAT aprobada. Mientras no los apruebes no pueden recibir viajes." />

      {error && (
        <div className="page-error" role="alert">
          <span>{error}</span>
          <Button size="icon" variant="ghost" onClick={() => setError(null)} aria-label="Cerrar mensaje de error">
            <X size={15} />
          </Button>
        </div>
      )}

      <DataTable
        columns={columns}
        data={verifications}
        loading={loading}
        emptyMessage="No hay verificaciones pendientes"
        onRowClick={setSelected}
      />

      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title="Detalle de verificación" size="lg">
        {selected && (
          <div className="stack">
            <div className="detail-list">
              <div className="detail-list__item">
                <span className="detail-list__label">Conductor</span>
                <span className="detail-list__value">{fullName(selected.usuario) || '—'}</span>
              </div>
              <div className="detail-list__item">
                <span className="detail-list__label">Correo</span>
                <span className="detail-list__value">{selected.usuario?.email || '—'}</span>
              </div>
              <div className="detail-list__item">
                <span className="detail-list__label">Teléfono</span>
                <span className="detail-list__value">{selected.usuario?.telefono || '—'}</span>
              </div>
              <div className="detail-list__item">
                <span className="detail-list__label">Cédula</span>
                <span className="detail-list__value">{selected.cedula || '—'}</span>
              </div>
              <div className="detail-list__item">
                <span className="detail-list__label">Vehículo</span>
                <span className="detail-list__value">{selected.tipoVehiculo || '—'} {selected.placa ? `· ${selected.placa}` : ''}</span>
              </div>
              <div className="detail-list__item">
                <span className="detail-list__label">Capacidad</span>
                <span className="detail-list__value">{selected.capacidad || '—'}</span>
              </div>
              <div className="detail-list__item">
                <span className="detail-list__label">Fecha de solicitud</span>
                <span className="detail-list__value">{formatDate(selected.createdAt)}</span>
              </div>
            </div>

            <hr className="divider" />
            <h3 className="section-title">Documentos cargados</h3>
            <div className="form-grid">
              <Photo label="Cédula (frente, ya no se exige)" path={selected.fotoCedula} />
              <Photo label="Cédula (reverso)" path={selected.fotoCedulaReverso} />
              <Photo label="Licencia" path={selected.fotoLicencia} />
              <Photo label="Vehículo" path={selected.fotoVehiculo} />
              <Photo label="Tarjeta de propiedad" path={selected.fotoTarjetaPropiedad} />
              <Photo label="Técnico-mecánica" path={selected.fotoTecnomecanica} vence={selected.tecnomecanicaVence} />
              <Photo label="SOAT" path={selected.fotoSoat} vence={selected.soatVence} />
            </div>

            {selected.excepcionSoatEstado && (
              <>
                <hr className="divider" />
                <h3 className="section-title">Excepción del SOAT</h3>
                <div className="detail-list">
                  <div className="detail-list__item">
                    <span className="detail-list__label">Estado</span>
                    <span className="detail-list__value"><Badge variant={soatSel.variant}>{soatSel.label}</Badge></span>
                  </div>
                  <div className="detail-list__item">
                    <span className="detail-list__label">{selected.excepcionSoatEstado === 'pendiente' ? 'Comentario del conductor' : 'Nota'}</span>
                    <span className="detail-list__value">{selected.excepcionSoatNota || '—'}</span>
                  </div>
                </div>
                {selected.excepcionSoatEstado === 'pendiente' && (
                  <div className="row row--end">
                    <Button size="sm" variant="soft-success" icon={<Check size={14} />} onClick={ask(selected, 'soat-approve')}>Aprobar excepción</Button>
                    <Button size="sm" variant="soft-danger" icon={<X size={14} />} onClick={ask(selected, 'soat-reject')}>Rechazar excepción</Button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={!!confirmAction}
        onClose={closeConfirm}
        onConfirm={isSoat ? handleSoat : isApprove ? handleApprove : handleReject}
        title={isSoat
          ? (isSoatApprove ? 'Aprobar excepción del SOAT' : 'Rechazar excepción del SOAT')
          : isApprove ? 'Aprobar verificación' : 'Rechazar verificación'}
        message={isSoat
          ? (isSoatApprove
            ? `¿Aprobar la excepción del SOAT de ${confirmName}? Podrá ser verificado sin SOAT.`
            : `¿Rechazar la excepción del SOAT de ${confirmName}? Tendrá que subir el SOAT.`)
          : isApprove
            ? `¿Aprobar la verificación de ${confirmName}?`
            : `¿Rechazar la verificación de ${confirmName}? Esta acción no se puede deshacer.`}
        confirmText={isApprove || isSoatApprove ? 'Aprobar' : 'Rechazar'}
        danger={!(isApprove || isSoatApprove)}
      >
        {(!isApprove || isSoat) && (
          <Textarea
            label="Nota (opcional)"
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            placeholder="Ej.: Documento ilegible"
            rows={2}
          />
        )}
      </ConfirmDialog>
    </div>
  );
}
