// Helpers para disputas. El backend usa campos en español (ver GET /api/admin/disputes
// en app/controllers/admin_controller.ts#disputes): no hay "status"/"claimant"/"type"
// en inglés, así que estos helpers trabajan directo sobre esos campos reales.

/** Estados reales que envía el backend (migración disputas + admin_controller#disputes). */
export const ESTADOS_DISPUTA = ['abierta', 'en_revision', 'resuelta'];

export const ESTADO_LABELS = {
  abierta: 'Abierta',
  en_revision: 'En revisión',
  resuelta: 'Resuelta',
};

/**
 * Motivo/razón de la disputa: el backend no expone "problema"/"descripcion" en el
 * listado de admin, solo `versionCliente` y `versionConductor` (quien la abrió llena
 * la suya primero). Se usa la del cliente como motivo principal porque casi siempre
 * es quien reclama; si no existe, se cae a la del conductor.
 */
export const reasonText = (row) => row?.versionCliente || row?.versionConductor || 'Sin descripción';

export const tripRef = (row) => (row?.viajeId ? `#${row.viajeId}` : '—');

export const money = (row) => row?.viaje?.montoFinal;
