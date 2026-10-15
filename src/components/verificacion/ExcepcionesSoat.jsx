import { useState, useEffect, useCallback } from 'react';
import { Check, X } from 'lucide-react';
import { errorMessage, formatDate, fullName, toList } from '../../utils/format';
import { Avatar, Badge, Button, ConfirmDialog, DataTable, SegmentedFilter, Textarea } from '../ui';

const ESTADO = {
  pendiente: { label: 'En revisión', variant: 'warning' },
  aprobada: { label: 'Aprobada', variant: 'success' },
  rechazada: { label: 'Rechazada', variant: 'danger' },
};

/** Solicitudes de excepción de SOAT. Compartido por admin y moderador: cambian `cargar` y `resolver`. */
export default function ExcepcionesSoat({ cargar, resolver }) {
  const [estado, setEstado] = useState('pendiente');
  const [filas, setFilas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [accion, setAccion] = useState(null); // { ...fila, aprobar }
  const [nota, setNota] = useState('');

  const recargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await cargar({ tipo: 'soat', estado, page: 1, limit: 100 });
      setFilas(toList(res.data));
    } catch (err) {
      setError(errorMessage(err, 'Error al cargar las excepciones de SOAT'));
    } finally {
      setLoading(false);
    }
  }, [cargar, estado]);

  useEffect(() => { recargar(); }, [recargar]);

  const cerrar = () => { setAccion(null); setNota(''); };

  const confirmar = async () => {
    try {
      await resolver(accion.id, { aprobar: accion.aprobar, ...(nota.trim() ? { nota: nota.trim() } : {}) });
      cerrar();
      await recargar();
    } catch (err) {
      cerrar();
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
    { key: 'ciudad', label: 'Zona', render: (v) => v || '—' },
    { key: 'placa', label: 'Vehículo', render: (_, row) => `${row.tipoVehiculo || '—'} ${row.placa || ''}` },
    { key: 'excepcionSoatNota', label: 'Comentario', render: (v) => v || '—' },
    { key: 'updatedAt', label: 'Fecha', render: (v) => <span className="nowrap">{formatDate(v)}</span> },
    {
      key: 'estado',
      label: 'Estado',
      render: (_, row) => <Badge variant={ESTADO[row.excepcionSoatEstado]?.variant}>{ESTADO[row.excepcionSoatEstado]?.label}</Badge>,
    },
    {
      key: 'acciones',
      label: '',
      align: 'right',
      render: (_, row) => row.excepcionSoatEstado === 'pendiente' && (
        <div className="acciones-fila__botones">
          <Button size="sm" variant="soft-success" icon={<Check size={14} />} onClick={() => setAccion({ ...row, aprobar: true })}>Aprobar</Button>
          <Button size="sm" variant="soft-danger" icon={<X size={14} />} onClick={() => setAccion({ ...row, aprobar: false })}>Rechazar</Button>
        </div>
      ),
    },
  ];

  const nombre = fullName(accion?.usuario) || 'este conductor';

  return (
    <div className="stack">
      <SegmentedFilter
        value={estado}
        onChange={setEstado}
        options={[
          { value: 'pendiente', label: 'Pendientes' },
          { value: 'aprobada', label: 'Aprobadas' },
          { value: 'rechazada', label: 'Rechazadas' },
        ]}
      />
      {error && (
        <div className="page-error" role="alert">
          <span>{error}</span>
          <Button size="icon" variant="ghost" onClick={() => setError(null)} aria-label="Cerrar mensaje de error"><X size={15} /></Button>
        </div>
      )}
      <DataTable columns={columns} data={filas} loading={loading} emptyMessage="No hay solicitudes de excepción de SOAT" />
      <ConfirmDialog
        isOpen={!!accion}
        onClose={cerrar}
        onConfirm={confirmar}
        title={accion?.aprobar ? 'Aprobar excepción del SOAT' : 'Rechazar excepción del SOAT'}
        message={accion?.aprobar
          ? `¿Aprobar la excepción del SOAT de ${nombre}? Podrá ser verificado sin SOAT.`
          : `¿Rechazar la excepción del SOAT de ${nombre}? Tendrá que subir el SOAT.`}
        confirmText={accion?.aprobar ? 'Aprobar' : 'Rechazar'}
        danger={!accion?.aprobar}
      >
        <Textarea label="Nota (opcional)" value={nota} onChange={(e) => setNota(e.target.value)} rows={2} />
      </ConfirmDialog>
    </div>
  );
}
