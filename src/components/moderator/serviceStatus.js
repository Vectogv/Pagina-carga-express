// Flujo de estados de un servicio (viaje) y estados especiales fuera del flujo.

export const flow = [
  'creado',
  'buscando_conductor',
  'pendiente',
  'aceptado',
  'conductor_en_camino',
  'conductor_llegada',
  'en_curso',
  'entregado',
  'esperando_confirmacion',
  'finalizado',
];

export const labels = {
  creado: 'Creado',
  buscando_conductor: 'Buscando',
  pendiente: 'Oferta',
  aceptado: 'Aceptado',
  conductor_en_camino: 'En camino',
  conductor_llegada: 'Llegó',
  en_curso: 'En curso',
  entregado: 'Entregado',
  esperando_confirmacion: 'Confirmación',
  finalizado: 'Finalizado',
};

/** tone: danger | warning (se traduce a clases CSS con tokens). */
export const special = {
  cancelado: { label: 'Viaje cancelado', tone: 'danger' },
  rechazado: { label: 'Viaje rechazado', tone: 'danger' },
  disputa: { label: 'Disputa abierta', tone: 'warning' },
  sos: { label: 'Emergencia — Atender con urgencia', tone: 'danger' },
};
