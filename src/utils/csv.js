export const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`

/** Descarga un Blob como archivo. */
export function descargarBlob(blob, nombre) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombre
  a.click()
  URL.revokeObjectURL(url)
}

/** header: array de títulos; filas: array de arrays. */
export function descargarCsv(nombre, header, filas) {
  const lineas = [header.join(','), ...filas.map((f) => f.map(csvCell).join(','))]
  descargarBlob(new Blob([lineas.join('\n')], { type: 'text/csv' }), nombre)
}
