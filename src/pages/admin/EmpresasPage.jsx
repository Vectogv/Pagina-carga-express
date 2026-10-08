import { useState, useEffect, useCallback } from 'react';
import { Check, Eye, X } from 'lucide-react';
import { getEmpresas, approveEmpresa, rejectEmpresa } from '../../api/admin';
import { resolveStorageUrl } from '../../utils/storage';
import { errorMessage, formatDate, fullName, toList } from '../../utils/format';
import {
  Badge, Button, ConfirmDialog, DataTable, Modal, PageHeader, Pagination, Select, Textarea,
} from '../../components/ui';

const ESTADOS = {
  pendiente: { label: 'Pendiente', variant: 'warning' },
  aprobada: { label: 'Aprobada', variant: 'success' },
  rechazada: { label: 'Rechazada', variant: 'danger' },
};

// Documento: miniatura si es imagen; si la URL termina en .pdf, un enlace.
function Doc({ label, path }) {
  if (!path) return null;
  const url = resolveStorageUrl(path);
  const esPdf = /\.pdf($|\?)/i.test(path);
  return (
    <div className="stack">
      <span className="detail-list__label">{label}</span>
      {esPdf
        ? <a href={url} target="_blank" rel="noopener noreferrer">Ver PDF</a>
        : (
          <a href={url} target="_blank" rel="noopener noreferrer" aria-label={`Abrir ${label} en una pestaña nueva`}>
            <img src={url} alt={label} className="thumb thumb--link" loading="lazy" />
          </a>
        )}
    </div>
  );
}

const Dato = ({ label, value }) => (
  <div className="detail-list__item">
    <span className="detail-list__label">{label}</span>
    <span className="detail-list__value">{value || '—'}</span>
  </div>
);

const duenoDe = (e) => e?.dueno || e?.['dueño'];

export default function EmpresasPage() {
  const [empresas, setEmpresas] = useState([]);
  const [estado, setEstado] = useState('pendiente');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const [nota, setNota] = useState('');

  const fetchEmpresas = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getEmpresas({ estado: estado || undefined, page });
      setEmpresas(toList(res.data));
      setMeta(res.data?.meta || res.data || {});
    } catch (err) {
      setError(errorMessage(err, 'Error al cargar las empresas'));
    } finally {
      setLoading(false);
    }
  }, [estado, page]);

  useEffect(() => { fetchEmpresas(); }, [fetchEmpresas]);

  const closeConfirm = () => { setConfirmAction(null); setNota(''); };
  const isApprove = confirmAction?.type === 'approve';

  const handleConfirm = async () => {
    try {
      if (isApprove) await approveEmpresa(confirmAction.id);
      else await rejectEmpresa(confirmAction.id, { nota: nota.trim() });
      closeConfirm();
      setSelected(null);
      await fetchEmpresas();
    } catch (err) {
      closeConfirm();
      setError(errorMessage(err, 'No se pudo completar la acción'));
    }
  };

  const ask = (row, type) => (e) => { e.stopPropagation(); setConfirmAction({ ...row, type }); };

  const columns = [
    { key: 'nombre', label: 'Empresa', render: (v) => <strong>{v}</strong> },
    { key: 'nit', label: 'NIT', render: (v) => v || '—' },
    {
      key: 'dueno',
      label: 'Dueño',
      render: (_, row) => (
        <div className="cell-user__text">
          <span className="cell-user__name">{fullName(duenoDe(row))}</span>
          <span className="cell-user__meta">{duenoDe(row)?.email || '—'}</span>
        </div>
      ),
    },
    {
      key: 'estado',
      label: 'Estado',
      render: (v) => <Badge variant={ESTADOS[v]?.variant || 'neutral'}>{ESTADOS[v]?.label || v}</Badge>,
    },
    { key: 'createdAt', label: 'Solicitada', render: (v) => <span className="nowrap">{formatDate(v)}</span> },
    {
      key: 'acciones',
      label: '',
      align: 'right',
      render: (_, row) => (
        <div className="row row--end" style={{ flexWrap: 'nowrap' }}>
          <Button size="sm" variant="ghost" icon={<Eye size={14} />} onClick={(e) => { e.stopPropagation(); setSelected(row); }}>Ver</Button>
          {row.estado === 'pendiente' && (
            <>
              <Button size="sm" variant="soft-success" icon={<Check size={14} />} onClick={ask(row, 'approve')}>Aprobar</Button>
              <Button size="sm" variant="soft-danger" icon={<X size={14} />} onClick={ask(row, 'reject')}>Rechazar</Button>
            </>
          )}
        </div>
      ),
    },
  ];

  const duenoSel = duenoDe(selected);

  return (
    <div className="page">
      <PageHeader title="Empresas" description="Cuentas de empresa de clientes. Revisa el RUT y la cámara de comercio antes de aprobar." />

      <div className="toolbar">
        <Select className="inline-select" value={estado} onChange={(e) => { setEstado(e.target.value); setPage(1); }} aria-label="Filtrar por estado">
          <option value="">Todos los estados</option>
          <option value="pendiente">Pendientes</option>
          <option value="aprobada">Aprobadas</option>
          <option value="rechazada">Rechazadas</option>
        </Select>
      </div>

      {error && (
        <div className="page-error" role="alert">
          <span>{error}</span>
          <Button size="icon" variant="ghost" onClick={() => setError(null)} aria-label="Cerrar mensaje de error"><X size={15} /></Button>
        </div>
      )}

      <DataTable
        columns={columns}
        data={empresas}
        loading={loading}
        emptyMessage="No hay empresas en este estado"
        onRowClick={setSelected}
      />
      <Pagination
        page={page}
        totalPages={meta.lastPage || meta.last_page || (empresas.length >= 20 ? page + 1 : page)}
        total={meta.total}
        onChange={setPage}
      />

      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title="Detalle de la empresa" size="lg">
        {selected && (
          <div className="stack">
            <div className="detail-list">
              <Dato label="Empresa" value={selected.nombre} />
              <Dato label="NIT" value={selected.nit} />
              <Dato label="Dirección" value={selected.direccion} />
              <Dato label="Teléfono" value={selected.telefono} />
              <Dato label="Dueño" value={fullName(duenoSel)} />
              <Dato label="Correo del dueño" value={duenoSel?.email} />
              <Dato label="Teléfono del dueño" value={duenoSel?.telefono} />
              <Dato label="Solicitada" value={formatDate(selected.createdAt)} />
              <Dato label="Estado" value={ESTADOS[selected.estado]?.label || selected.estado} />
              {selected.notaRechazo && <Dato label="Motivo del rechazo" value={selected.notaRechazo} />}
            </div>
            <hr className="divider" />
            <h3 className="section-title">Documentos</h3>
            <div className="form-grid">
              <Doc label="RUT" path={selected.rut} />
              <Doc label="Cámara de comercio" path={selected.camara} />
            </div>
            {selected.estado === 'pendiente' && (
              <div className="row row--end">
                <Button size="sm" variant="soft-success" icon={<Check size={14} />} onClick={ask(selected, 'approve')}>Aprobar</Button>
                <Button size="sm" variant="soft-danger" icon={<X size={14} />} onClick={ask(selected, 'reject')}>Rechazar</Button>
              </div>
            )}
          </div>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={!!confirmAction}
        onClose={closeConfirm}
        onConfirm={handleConfirm}
        title={isApprove ? 'Aprobar empresa' : 'Rechazar empresa'}
        message={isApprove
          ? `¿Aprobar la empresa ${confirmAction?.nombre || ''}?`
          : `¿Rechazar la empresa ${confirmAction?.nombre || ''}? Le llegará la nota al dueño.`}
        confirmText={isApprove ? 'Aprobar' : 'Rechazar'}
        danger={!isApprove}
      >
        {!isApprove && (
          <Textarea
            label="Motivo del rechazo"
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            placeholder="Ej.: El RUT no se lee"
            rows={2}
          />
        )}
      </ConfirmDialog>
    </div>
  );
}
