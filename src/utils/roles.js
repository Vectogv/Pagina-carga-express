const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1)

export function getRolUsuario(u) {
  if (u.rol === 'admin') return 'admin'
  if (u.esModerador) return u.esLider ? 'moderador_lider' : 'moderador'
  if (u.esLider) return 'lider'
  if (u.rol === 'conductor') return 'conductor'
  if (u.rol === 'cliente') return 'cliente'
  return 'desconocido'
}

export function getLabelRol(u) {
  const r = getRolUsuario(u)
  const labels = {
    admin: 'Admin',
    moderador: u.zonaModerador ? `Moderador ${capitalize(u.zonaModerador)}` : 'Moderador',
    moderador_lider: u.zonaModerador ? `Moderador-Líder ${capitalize(u.zonaModerador)}` : 'Moderador-Líder',
    lider: 'Líder Conductores',
    conductor: 'Conductor',
    cliente: 'Cliente',
    desconocido: '—',
  }
  return labels[r]
}
