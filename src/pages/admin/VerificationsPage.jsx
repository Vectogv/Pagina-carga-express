import { useState, useEffect, useCallback } from 'react';
import { Check, Eye, X } from 'lucide-react';
import { getVerifications, approveVerification, rejectVerification } from '../../api/admin';
import { resolveStorageUrl } from '../../utils/storage';
import { errorMessage, formatDate, fullName, toList } from '../../utils/format';
import {
  Avatar, Button, ConfirmDialog, DataTable, Modal, PageHeader, Textarea,
} from '../../components/ui';

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
    { key: 'createdAt', label: 'Solicitado', render: (v) => <span className="nowrap">{formatDate(v)}</span> },
    {
      key: 'acciones',
      label: '',
      align: 'right',
      render: (_, row) => (
        <div className="row row--end" style={{ flexWrap: 'nowrap' }}>
          <Button size="sm" variant="ghost" icon={<Eye size={14} />} onClick={(e) => { e.stopPropagation(); setSelected(row); }}>
            Ver
          </Button>
          <Button size="sm" variant="soft-success" icon={<Check size={14} />} onClick={ask(row, 'approve')}>Aprobar</Button>
          <Button size="sm" variant="soft-danger" icon={<X size={14} />} onClick={ask(row, 'reject')}>Rechazar</Button>
        </div>
      ),
    },
  ];

  const isApprove = confirmAction?.type === 'approve';
  const confirmName = fullName(confirmAction?.usuario) || 'este conductor';

  return (
    <div className="page">
      <PageHeader title="Verificaciones" description="Conductores a la espera de que se revise su documentación." />

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
              <Photo label="Cédula" path={selected.fotoCedula} />
              <Photo label="Licencia" path={selected.fotoLicencia} />
              <Photo label="Vehículo" path={selected.fotoVehiculo} />
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={!!confirmAction}
        onClose={closeConfirm}
        onConfirm={isApprove ? handleApprove : handleReject}
        title={isApprove ? 'Aprobar verificación' : 'Rechazar verificación'}
        message={isApprove
          ? `¿Aprobar la verificación de ${confirmName}?`
          : `¿Rechazar la verificación de ${confirmName}? Esta acción no se puede deshacer.`}
        confirmText={isApprove ? 'Aprobar' : 'Rechazar'}
        danger={!isApprove}
      >
        {!isApprove && (
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
