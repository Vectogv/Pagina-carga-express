import { useEffect, useState, useCallback } from 'react';
import { Gavel } from 'lucide-react';
import { Link } from 'react-router-dom';
import { direccionCorta } from '../../utils/direccion';
import { useModeratorBadges } from '../../contexts/ModeratorBadgesContext';
import {
  PageHeader, DataTable, Button, Modal, Toast, ToastContainer, StatusBadge,
} from '../../components/ui';
import { TarjetaPersona } from '../../components/panel';
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
    const msg = { disputa: `Viaje #${id} enviado a disputa`, sancion: `Sanción aplicada (viaje #${id})` }[resolucion] || `Viaje #${id} finalizado`;
    setToast({ message: msg, variant: 'success' });
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
      render: (_, r) => (r.cliente
        ? <TarjetaPersona persona={{ ...r.cliente, contactoVisible: r.contactoVisible === true }} tipo="cliente" area="moderator" />
        : '—'),
    },
    {
      key: 'conductor',
      label: 'Conductor',
      render: (_, r) => (r.conductor ? <TarjetaPersona persona={r.conductor} tipo="conductor" area="moderator" /> : '—'),
    },
    {
      key: 'estado',
      label: 'Estado',
      render: (v, r) => (
        <span>
          <StatusBadge status={v} />
          {v === 'cierre_en_revision' && r.distanciaCierreKm != null && (
            <span className="text-sm text-muted"> · a {Number(r.distanciaCierreKm).toFixed(1)} km del destino</span>
          )}
        </span>
      ),
    },
    { key: 'origenDireccion', label: 'Origen', render: (v) => <span title={v || ''}>{direccionCorta(v)}</span> },
    { key: 'destinoDireccion', label: 'Destino', render: (v) => <span title={v || ''}>{direccionCorta(v)}</span> },
  ];

  return (
    <div className="page">
      <PageHeader
        title="Cierres por resolver"
        description="Viajes que el conductor cerró y el cliente no confirmó a tiempo, o que se cerraron lejos del destino. Revisa cada caso: entrega válida, disputa o sanción."
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
        {selected && <PendingCloseResolver tripId={selected.id} trip={selected} onResolved={onResolved} showTitle={false} />}
      </Modal>

      {toast && (
        <ToastContainer>
          <Toast message={toast.message} variant={toast.variant} onClose={closeToast} />
        </ToastContainer>
      )}
    </div>
  );
}
