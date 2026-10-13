import { Link } from 'react-router-dom';
import { Avatar } from '../ui';
import { fullName } from '../../utils/format';

/**
 * Persona (conductor o cliente) con avatar, nombre enlazado a su perfil y meta debajo.
 * props: { persona, tipo: 'conductor'|'cliente', area: 'admin'|'moderator', size?, compacta? }
 * El contacto del cliente nunca se muestra si `completo === false` o `contactoVisible === false`.
 */
export default function TarjetaPersona({ persona, tipo = 'conductor', area = 'moderator', size = 32, compacta = false }) {
  if (!persona) return <span className="text-muted">—</span>;
  const u = persona.usuario || persona;
  const nombre = fullName(u) || persona.nombre || '—';
  const foto = persona.avatar || persona.fotoConductor || persona.usuario?.avatar;
  const id = tipo === 'conductor' ? persona.id : (persona.usuarioId || persona.id);
  const to = id != null ? `/${area}/${tipo === 'conductor' ? 'drivers' : 'clients'}/${id}` : null;

  let meta = null;
  if (tipo === 'conductor') {
    meta = [persona.placa, persona.tipoVehiculo].filter(Boolean).join(' · ');
  } else if (persona.completo !== false && persona.contactoVisible !== false) {
    meta = [u.telefono, u.email].filter(Boolean).join(' · ');
  }

  return (
    <div className={`cell-user${compacta ? ' tp--compacta' : ''}`}>
      <Avatar src={foto} name={nombre} size={size} />
      <div className="cell-user__text">
        {to ? <Link to={to} className="cell-user__name">{nombre}</Link> : <span className="cell-user__name">{nombre}</span>}
        {meta && !compacta && <span className="cell-user__meta">{meta}</span>}
      </div>
    </div>
  );
}
