import { useEffect, useState, useCallback } from 'react';
import { Gavel } from 'lucide-react';
import { Link } from 'react-router-dom';
import { direccionCorta } from '../../utils/direccion';
import { useModeratorBadges } from '../../contexts/ModeratorBadgesContext';
import { fullName } from '../../utils/format';
import {
  PageHeader, DataTable, Button, Modal, Toast, ToastContainer,
} from '../../components/ui';
import PendingCloseResolver from '../../components/moderator/PendingCloseResolver';

// Viajes en `pendiente_confirmacion`: el conductor cerró el viaje, el cliente no
// confirmó ni rechazó a tiempo y el moderador de la zona decide (misma función que
// la pestaña "Cierres" de la app). La lista vive en ModeratorBadgesContext, que la
// mantiene al día por socket (moderator:pending_close / moderator:trip:update).
export default function ModeratorCierresPage() {
  const { closures, closuresLoading, closuresError, refreshClosures } = useModeratorBadges();
  const [selected, setSelected] = useState(null);
  const [toast, setToast] = useState(null);
  const closeToast = useCallback(() => setToast(null), []);

  useEffect(() => { refreshClosures(); }, [refreshClosures]);

  const onResolved = (resolucion) => {
    const id = selected?.id;
    setSelected(null);
    setToast({ message: resolucion === 'disputa' ? `Viaje #${id} enviado a disputa` : `Viaje #${id} finalizado`, variant: 'success' });
    refreshClosures();
  };

  const columns = [
    {
      key: 'accion',
      label: '',
      render: (_, r) => (
        <Button
          size="sm"
          variant="primary"
          icon={<Gavel size={14} />}
          onClick={(e) => { e.stopPropagation(); setSelected(r); }}
        >
          Resolver cierre
        </Button>
      ),
    },
    {
      key: 'id',
      label: 'Viaje',
      render: (v) => (
        <Link className="text-mono text-primary-color" to={`/moderator/trips?viaje=${v}`} onClick={(e) => e.stopPropagation()}>
          #{String(v).slice(0, 8)}
        </Link>
      ),
    },
    {
      key: 'cliente',
      label: 'Cliente',
      render: (_, r) => (r.cliente ? (
        <div className="cell-user__text">
          <span className="cell-user__name">{fullName(r.cliente)}</span>
          {r.cliente.telefono && <span className="cell-user__meta">{r.cliente.telefono}</span>}
        </div>
      ) : '—'),
    },
    {
      key: 'conductor',
      label: 'Conductor',
      render: (_, r) => (r.conductor ? (
        <div className="cell-user__text">
          {r.conductor.id ? (
            <Link className="cell-user__name" to={`/moderator/drivers/${r.conductor.id}`} onClick={(e) => e.stopPropagation()}>
              {r.conductor.nombre || r.conductor.telefono || '—'}
            </Link>
          ) : <span className="cell-user__name">{r.conductor.nombre || r.conductor.telefono || '—'}</span>}
          {r.conductor.placa && <span className="cell-user__meta text-mono">{r.conductor.placa}</span>}
        </div>
      ) : '—'),
    },
    { key: 'origenDireccion', label: 'Origen', render: (v) => <span title={v || ''}>{direccionCorta(v)}</span> },
    { key: 'destinoDireccion', label: 'Destino', render: (v) => <span title={v || ''}>{direccionCorta(v)}</span> },
  ];

  return (
    <div className="page">
      <PageHeader
        title="Cierres por resolver"
        description="Viajes que el conductor cerró y el cliente no confirmó a tiempo. Revisa cada caso y decide si se finaliza o se envía a disputa."
      />

      {closuresError && <div className="page-error" role="alert">{closuresError}</div>}

      <DataTable
        columns={columns}
        data={closures}
        loading={closuresLoading && closures.length === 0}
        emptyMessage="No hay viajes esperando confirmación del cliente en tu zona."
        onRowClick={(r) => setSelected(r)}
      />

      <Modal
        isOpen={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? `Resolver cierre · Viaje #${String(selected.id).slice(0, 8)}` : ''}
        description={selected ? `${selected.origenDireccion || '—'} → ${selected.destinoDireccion || '—'}` : undefined}
      >
        {selected && <PendingCloseResolver tripId={selected.id} onResolved={onResolved} showTitle={false} />}
      </Modal>

      {toast && (
        <ToastContainer>
          <Toast message={toast.message} variant={toast.variant} onClose={closeToast} />
        </ToastContainer>
      )}
    </div>
  );
}
