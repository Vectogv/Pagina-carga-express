import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare } from 'lucide-react';
import { getContactableUsers } from '../../api/moderator';
import { useModeratorCity } from '../../contexts/ModeratorCityContext';
import { errorMessage, fullName, toList } from '../../utils/format';
import {
  PageHeader, SearchInput, SegmentedFilter, DataTable, Avatar, Badge,
} from '../../components/ui';

// Solo personal administrativo: moderadores y administración. Los conductores van en
// Conductores → Directorio (su ficha tiene el botón de chat); a los clientes solo se les
// escribe desde un ticket, un SOS o una disputa. El servidor filtra con ?rol=.
const ROLE_FILTERS = [
  { value: 'moderador', label: 'Moderadores' },
  { value: 'admin', label: 'Administración' },
];

// El backend manda `etiqueta` (MODERADOR / ADMIN / CONDUCTOR) como rol legible.
const etiquetaDe = (r) => (r.etiqueta || (r.esModerador ? 'MODERADOR' : r.rol || '')).toUpperCase();
const ROL_VARIANT = { MODERADOR: 'warning', ADMIN: 'info' };
const ROL_LABEL = { MODERADOR: 'Moderador', ADMIN: 'Administrador' };
const rolVariant = (r) => ROL_VARIANT[etiquetaDe(r)] || 'neutral';
const rolLabel = (r) => ROL_LABEL[etiquetaDe(r)] || 'Usuario';
const capitalize = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
// Solo los moderadores tienen zona asignada.
const zonaLabel = (r) => capitalize((r.zonaModerador || '').trim()) || '—';

export default function CompanerosPage() {
  const { ciudadParams } = useModeratorCity();
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [q, setQ] = useState('');
  const [roleFilter, setRoleFilter] = useState('moderador');

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getContactableUsers({ q: q.trim() || undefined, rol: roleFilter, limit: 100, ...ciudadParams });
      // Defensa: aquí solo va personal (nunca clientes ni conductores).
      setContacts(toList(res.data, 'users', 'contactableUsers').filter((c) => c.esModerador || c.rol === 'admin'));
    } catch (err) {
      if (err.response?.status === 403) setError('No tienes permisos de moderador o ciudad no asignada');
      else setError(errorMessage(err, 'Error al cargar el equipo'));
    } finally {
      setLoading(false);
    }
  }, [q, roleFilter, ciudadParams]);

  useEffect(() => {
    const id = setTimeout(fetchContacts, q ? 350 : 0);
    return () => clearTimeout(id);
  }, [fetchContacts, q]);

  const columns = [
    {
      key: 'nombre',
      label: 'Nombre',
      render: (_, r) => (
        <div className="cell-user">
          <Avatar src={r.avatar} name={fullName(r)} />
          <span className="cell-user__name">{fullName(r)}</span>
        </div>
      ),
    },
    { key: 'rol', label: 'Rol', render: (_, r) => <Badge variant={rolVariant(r)}>{rolLabel(r)}</Badge> },
    { key: 'email', label: 'Correo', render: (v) => v || '—' },
    { key: 'telefono', label: 'Teléfono', render: (v, r) => r.telefono || r.phone || v || '—' },
    { key: 'zonaModerador', label: 'Zona', render: (_, r) => zonaLabel(r) },
    {
      key: 'chat',
      label: '',
      render: (_, r) => (
        <Link className="btn btn--secondary btn--sm" to={`/moderator/conversations?usuario=${r.id}`}>
          <MessageSquare size={14} /> Chat
        </Link>
      ),
    },
  ];

  return (
    <div className="page">
      <PageHeader
        title="Equipo de la zona"
        description="Personal administrativo: moderadores y administración con los que puedes coordinar. Los conductores están en Conductores → Directorio."
      />

      <div className="toolbar">
        <SearchInput value={q} onChange={setQ} placeholder="Buscar nombre, correo o teléfono" />
        <SegmentedFilter options={ROLE_FILTERS} value={roleFilter} onChange={setRoleFilter} ariaLabel="Filtrar por cargo" />
      </div>

      {error && <div className="page-error" role="alert">{error}</div>}

      <DataTable
        columns={columns}
        data={contacts}
        loading={loading}
        emptyMessage={q ? `Sin resultados para “${q}”` : (roleFilter === 'admin' ? 'No hay administradores para mostrar' : 'No hay otros moderadores para mostrar')}
      />
    </div>
  );
}
