/** Mapa único de estados del backend → etiqueta + color. */
const STATUS = {
  // Viajes
  buscando_conductor: ['Buscando conductor', 'info'],
  reservado: ['Reservado', 'info'],
  aceptado: ['Aceptado', 'primary'],
  conductor_en_camino: ['Conductor en camino', 'primary'],
  conductor_llegada: ['Conductor en origen', 'primary'],
  en_curso: ['En curso', 'warning'],
  esperando_confirmacion: ['Esperando confirmación', 'warning'],
  pendiente_confirmacion: ['Pendiente de confirmación', 'warning'],
  pendiente_cierre: ['Pendiente de cierre', 'warning'],
  finalizado: ['Finalizado', 'success'],
  completado: ['Completado', 'success'],
  cancelado: ['Cancelado', 'neutral'],
  cancelada: ['Cancelada', 'neutral'],
  sos: ['SOS', 'danger'],
  disputa: ['En disputa', 'danger'],
  // Revisión / aprobación
  pendiente: ['Pendiente', 'warning'],
  en_revision: ['En revisión', 'info'],
  aprobado: ['Aprobado', 'success'],
  aprobada: ['Aprobada', 'success'],
  rechazado: ['Rechazado', 'danger'],
  rechazada: ['Rechazada', 'danger'],
  aceptada: ['Aceptada', 'success'],
  // Incidentes
  abierta: ['Abierta', 'danger'],
  atendida: ['Atendida', 'warning'],
  resuelta: ['Resuelta', 'success'],
  resuelto: ['Resuelto', 'success'],
  // Tickets de soporte
  abierto: ['Abierto', 'danger'],
  en_proceso: ['En proceso', 'warning'],
  cerrado: ['Cerrado', 'neutral'],
  // Cuentas / pagos
  activo: ['Activo', 'success'],
  activa: ['Activa', 'success'],
  inactivo: ['Inactivo', 'neutral'],
  suspendido: ['Suspendido', 'danger'],
  suspension_por_pago: ['Suspendido por pago', 'danger'],
  pagado: ['Pagado', 'success'],
};

const humanize = (s) => String(s).replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

export function statusVariant(status) {
  return STATUS[status]?.[1] || 'neutral';
}

export function statusLabel(status) {
  if (!status) return '—';
  return STATUS[status]?.[0] || humanize(status);
}
