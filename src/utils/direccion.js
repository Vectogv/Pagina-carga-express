// "Calle 5 #10-20, Centro, Popayán, Cauca, Colombia" -> "Calle 5 #10-20 · Popayán"
export function direccionCorta(texto) {
  if (!texto) return '—';
  const partes = String(texto).split(',').map((p) => p.trim())
    .filter((p) => p && !/^colombia$/i.test(p) && !/^\d+$/.test(p));
  if (partes.length === 0) return '—';
  if (partes.length <= 2) return partes.join(', ');
  return `${partes[0]} · ${partes[partes.length - 2]}`;
}
