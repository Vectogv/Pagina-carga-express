import { useState, useEffect, useCallback } from 'react';
import { Check, ExternalLink, FileText, X } from 'lucide-react';
import { getVerifications, approveVerification, rejectVerification } from '../../api/admin';
import { resolveStorageUrl } from '../../utils/storage';
import { errorMessage, formatDate, toList } from '../../utils/format';
import {
  Avatar, Badge, Button, ConfirmDialog, DataTable, Modal, PageHeader, Textarea,
} from '../../components/ui';

const DOC_STATUS = {
  approved: ['Aprobado', 'success'],
  rejected: ['Rechazado', 'danger'],
  pending: ['Pendiente', 'warning'],
};

function DocStatus({ status }) {
  const [label, variant] = DOC_STATUS[status] || [status || 'Pendiente', 'warning'];
  return (
    <Badge variant={variant}>
      <span className="badge__dot" aria-hidden="true" />
      {label}
    </Badge>
  );
}

const driverName = (row) => row?.conductorName || row?.conductor?.name || row?.name || '';
const driverCedula = (row) => row?.cedula || row?.conductor?.cedula || '';

const isImage = (doc) => doc.type === 'image' || /\.(jpg|jpeg|png|gif|webp)$/i.test(doc.url || '');

function DocThumb({ label, path }) {
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
      const res = await getVerifications();
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
      await approveVerification(confirmAction.conductorId || confirmAction.id);
      await fetchVerifications();
    } catch (err) {
      setError(errorMessage(err, 'Error al aprobar verificación'));
    }
  };

  const handleReject = async () => {
    try {
      // Doc §18: {nota} opcional
      const payload = nota.trim() ? { nota: nota.trim() } : {};
      await rejectVerification(confirmAction.conductorId || confirmAction.id, payload);
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
      key: 'conductor',
      label: 'Conductor',
      render: (_, row) => (
        <div className="cell-user">
          <Avatar name={driverName(row)} />
          <div className="cell-user__text">
            <span className="cell-user__name">{driverName(row) || '—'}</span>
            <span className="cell-user__meta">{driverCedula(row) || '—'}</span>
          </div>
        </div>
      ),
    },
    { key: 'cedula', label: 'Cédula', render: (val, row) => <DocStatus status={row.cedulaStatus || val || 'pending'} /> },
    { key: 'licencia', label: 'Licencia', render: (val, row) => <DocStatus status={row.licenciaStatus || val || 'pending'} /> },
    { key: 'vehiculo', label: 'Vehículo', render: (val, row) => <DocStatus status={row.vehiculoStatus || val || 'pending'} /> },
    {
      key: 'acciones',
      label: '',
      align: 'right',
      render: (_, row) => (
        <div className="row row--end">
          <Button size="sm" variant="soft-success" icon={<Check size={14} />} onClick={ask(row, 'approve')}>Aprobar</Button>
          <Button size="sm" variant="soft-danger" icon={<X size={14} />} onClick={ask(row, 'reject')}>Rechazar</Button>
        </div>
      ),
    },
  ];

  const docs = selected ? [
    selected.cedulaImage && { label: 'Cédula', path: selected.cedulaImage },
    selected.licenciaImage && { label: 'Licencia', path: selected.licenciaImage },
    selected.vehiculoImage && { label: 'Vehículo', path: selected.vehiculoImage },
  ].filter(Boolean) : [];
  const extraDocs = selected?.documents || [];
  const isApprove = confirmAction?.type === 'approve';
  const confirmName = driverName(confirmAction) || 'este conductor';

  return (
    <div className="page">
      <PageHeader title="Verificaciones" description="Revisa y gestiona la documentación de los conductores." />

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
                <span className="detail-list__value">{driverName(selected) || '—'}</span>
              </div>
              <div className="detail-list__item">
                <span className="detail-list__label">Cédula</span>
                <span className="detail-list__value">{driverCedula(selected) || '—'}</span>
              </div>
              <div className="detail-list__item">
                <span className="detail-list__label">Fecha de solicitud</span>
                <span className="detail-list__value">{formatDate(selected.createdAt)}</span>
              </div>
              <div className="detail-list__item">
                <span className="detail-list__label">Estado cédula</span>
                <span><DocStatus status={selected.cedulaStatus || 'pending'} /></span>
              </div>
              <div className="detail-list__item">
                <span className="detail-list__label">Estado licencia</span>
                <span><DocStatus status={selected.licenciaStatus || 'pending'} /></span>
              </div>
              <div className="detail-list__item">
                <span className="detail-list__label">Estado vehículo</span>
                <span><DocStatus status={selected.vehiculoStatus || 'pending'} /></span>
              </div>
            </div>

            {(docs.length > 0 || extraDocs.length > 0) && (
              <>
                <hr className="divider" />
                <h3 className="section-title">Documentos cargados</h3>
                <div className="form-grid">
                  {docs.map((d) => <DocThumb key={d.label} label={d.label} path={d.path} />)}
                  {extraDocs.map((doc, i) => {
                    const label = doc.label || `Documento ${i + 1}`;
                    return isImage(doc) ? (
                      <DocThumb key={doc.url || i} label={label} path={doc.url} />
                    ) : (
                      <div key={doc.url || i} className="stack">
                        <span className="detail-list__label">{label}</span>
                        <a href={resolveStorageUrl(doc.url)} target="_blank" rel="noopener noreferrer" className="row text-primary-color text-sm">
                          <FileText size={16} /> Ver documento <ExternalLink size={13} />
                        </a>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
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
