import { useState, useEffect, useCallback } from 'react';
import { getAdminSanciones, crearAdminSancion, resolverAdminSancion } from '../../api/admin';
import { errorMessage, formatDate, toList } from '../../utils/format';
import {
  PageHeader, DataTable, SegmentedFilter, StatusBadge, Button, Modal, Input, Textarea, Toast, ToastContainer,
} from '../../components/ui';
import { SancionModal } from '../../components/panel';

const FILTROS = [
  { value: '', label: 'Todas' },
  { value: 'activa', label: 'Activas' },
  { value: 'apelada', label: 'Apeladas' },
  { value: 'confirmada', label: 'Confirmadas' },
  { value: 'anulada', label: 'Anuladas' },
];

// Sanciones de toda la plataforma (3.4). El admin resuelve apelaciones (confirmar / modificar /
// anular) y aplica las graves (suspensión larga, bloqueo) por id de usuario.
export default function SancionesPage() {
  const [rows, setRows] = useState([]);
  const [estado, setEstado] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const [nueva, setNueva] = useState(false);
  const [usuarioId, setUsuarioId] = useState('');
  const [mod, setMod] = useState(null);
  const [dias, setDias] = useState('');
  const [motivo, setMotivo] = useState('');
  const [modErr, setModErr] = useState('');
  const closeToast = useCallback(() => setToast(null), []);

  const cargar = useCallback(async () => {
    try {
      setError(null);
      const res = await getAdminSanciones(estado ? { estado } : {});
      setRows(toList(res.data));
    } catch (err) {
      setError(errorMessage(err, 'No se pudieron cargar las sanciones'));
    } finally {
      setLoading(false);
    }
  }, [estado]);

  useEffect(() => { cargar(); }, [cargar]);

  const resolver = async (s, accion, extra = {}) => {
    try {
      await resolverAdminSancion(s.id, { accion, ...extra });
      setToast({ message: 'Sanción actualizada', variant: 'success' });
      setMod(null);
      cargar();
    } catch (err) {
      const msg = errorMessage(err, 'No se pudo actualizar la sanción');
      if (mod) setModErr(msg); else setToast({ message: msg, variant: 'error' });
    }
  };

  const columns = [
    {
      key: 'acciones', label: '',
      render: (_, s) => (s.estado === 'apelada' || s.estado === 'activa') ? (
        <div className="row" style={{ flexWrap: 'wrap', gap: 6 }}>
          {s.estado === 'apelada' && <Button size="sm" variant="soft-danger" onClick={() => resolver(s, 'confirmar')}>Confirmar</Button>}
          <Button size="sm" variant="soft-success" onClick={() => resolver(s, 'anular')}>Anular</Button>
          <Button size="sm" variant="secondary" onClick={() => { setMod({ s }); setDias(s.dias ?? ''); setMotivo(s.motivo || ''); setModErr(''); }}>Modificar</Button>
        </div>
      ) : null,
    },
    { key: 'usuarioId', label: 'Usuario', render: (v) => <span className="text-mono">#{v}</span> },
    { key: 'tipoLabel', label: 'Sanción', render: (v, s) => <div className="cell-user__text"><strong>{v}</strong>{s.dias ? <span className="cell-user__meta">{s.dias} días</span> : null}</div> },
    { key: 'estado', label: 'Estado', render: (v) => <StatusBadge status={v} /> },
    { key: 'motivo', label: 'Motivo', render: (v, s) => <div style={{ whiteSpace: 'normal' }}>{v}{s.apelacion && <div className="text-sm text-muted">Apelación: {s.apelacion}</div>}</div> },
    { key: 'rolAplicador', label: 'Aplicada por', render: (v) => v || '—' },
    { key: 'createdAt', label: 'Fecha', render: (v) => formatDate(v) },
  ];

  return (
    <div className="page">
      <PageHeader
        title="Sanciones"
        description="Advertencias, cobros y suspensiones. Aquí se resuelven las apelaciones y se aplican las sanciones graves."
        actions={<Button variant="primary" onClick={() => setNueva(true)}>Nueva sanción</Button>}
      />
      {error && <div className="page-error" role="alert">{error}</div>}
      <div className="filters-row">
        <SegmentedFilter options={FILTROS} value={estado} onChange={setEstado} />
      </div>
      <DataTable columns={columns} data={rows} loading={loading && rows.length === 0} emptyMessage="No hay sanciones con este filtro." />

      <Modal isOpen={nueva && !usuarioId.match(/^\d+$/)} onClose={() => setNueva(false)} title="Nueva sanción">
        <Input label="ID del usuario" type="number" value={usuarioId} onChange={(e) => setUsuarioId(e.target.value)} />
      </Modal>
      {nueva && /^\d+$/.test(usuarioId) && (
        <SancionModal
          isOpen esAdmin titulo={`Sancionar al usuario #${usuarioId}`}
          onClose={() => { setNueva(false); setUsuarioId(''); }}
          onSubmit={async (b) => {
            await crearAdminSancion({ usuarioId: Number(usuarioId), ...b });
            setNueva(false); setUsuarioId('');
            setToast({ message: 'Sanción aplicada', variant: 'success' });
            cargar();
          }}
        />
      )}

      <Modal isOpen={!!mod} onClose={() => setMod(null)} title="Modificar sanción"
        footer={<Button variant="primary" onClick={() => resolver(mod.s, 'modificar', { ...(dias !== '' ? { dias: Number(dias) } : {}), motivo })}>Guardar</Button>}>
        <Input label="Días" type="number" value={dias} onChange={(e) => setDias(e.target.value)} />
        <Textarea label="Motivo (mínimo 20 caracteres)" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
        {modErr && <div className="page-error" role="alert">{modErr}</div>}
      </Modal>
      {toast && (<ToastContainer><Toast message={toast.message} variant={toast.variant} onClose={closeToast} /></ToastContainer>)}
    </div>
  );
}
