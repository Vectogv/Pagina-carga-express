// Texto del aviso tras notificar a un conductor. El servidor responde
// `canales: { bandeja, push, correo }` con true/false por canal (admin y moderador).
const ORDEN = ['bandeja', 'push', 'correo'];

export function textoCanales(canales) {
  if (!canales || typeof canales !== 'object') return 'Notificación enviada';
  const claves = ORDEN.filter((k) => k in canales).concat(Object.keys(canales).filter((k) => !ORDEN.includes(k)));
  if (!claves.length) return 'Notificación enviada';
  const ok = claves.filter((k) => canales[k]);
  const no = claves.filter((k) => !canales[k]);
  if (!ok.length) return `No llegó por: ${no.join(', ')}`;
  return `Enviado: ${ok.join(', ')}${no.length ? ` · No llegó por: ${no.join(', ')}` : ''}`;
}
