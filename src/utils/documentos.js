// Documentos que el servidor exige para aprobar a un conductor
// (Conductor.documentosFaltantes en el backend). La foto de la cédula ya no cuenta.
export const DOCUMENTOS_CONDUCTOR = [
  ['licencia', 'Licencia de conducción'],
  ['soat', 'SOAT'],
  ['tecnomecanica', 'Tecnomecánica'],
  ['tarjeta_propiedad', 'Tarjeta de propiedad'],
  ['foto_vehiculo', 'Foto del vehículo'],
  ['foto_conductor', 'Foto del conductor'],
  ['numero_cedula', 'Número de cédula'],
];
const LABEL = Object.fromEntries(DOCUMENTOS_CONDUCTOR);

// `faltantes` viene del servidor en la fila del listado, en la ficha
// (`documentos.faltantes`) y en las verificaciones del admin. Si no viene
// (servidor viejo), se revisa lo que la fila sí trae.
export function faltantesDe(r) {
  const lista = r?.faltantes ?? r?.documentos?.faltantes;
  if (Array.isArray(lista)) return lista;
  const d = { ...r, ...(r?.documentos || {}) };
  const falta = [];
  if (!d.fotoLicencia) falta.push('licencia');
  if (!d.fotoVehiculo) falta.push('foto_vehiculo');
  if (!d.fotoConductor) falta.push('foto_conductor');
  if (!/^\d{5,20}$/.test(String(d.cedula ?? r?.usuario?.cedula ?? '').trim())) falta.push('numero_cedula');
  return falta;
}

export const textoFaltantes = (faltantes) => (faltantes.length ? `Falta: ${faltantes.map((k) => LABEL[k] || k).join(', ')}` : '');
