import { Badge } from '../../../components/ui';
import { getLabelRol, getRolUsuario } from '../../../utils/roles';
import './users.css';

const VARIANT = {
  admin: 'primary',
  moderador: 'info',
  moderador_lider: 'info',
  conductor: 'neutral',
  cliente: 'neutral',
  desconocido: 'neutral',
};

/** Badge de rol: admin→primary, moderador→info, líder→violeta, conductor/cliente→neutral. */
export default function RoleBadge({ user }) {
  const rol = getRolUsuario(user);
  const label = getLabelRol(user);
  if (rol === 'lider') {
    // Badge no expone una variante violeta: se replica su marcado con una clase local.
    return <span className="badge badge--md badge--violet">{label}</span>;
  }
  return <Badge variant={VARIANT[rol] || 'neutral'}>{label}</Badge>;
}
