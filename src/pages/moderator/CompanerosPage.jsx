import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getContactableUsers } from '../../api/moderator';
import { useModeratorCity } from '../../contexts/ModeratorCityContext';
import { errorMessage, fullName, toList } from '../../utils/format';
import {
  PageHeader, SearchInput, SegmentedFilter, DataTable, Avatar, Badge,
} from '../../components/ui';

// Sin clientes: el moderador solo los contacta desde un ticket, un SOS o una disputa.
const ROLE_FILTERS = [
  { value: '', label: 'Todos' },
  { value: 'moderador', label: 'Moderadores' },
  { value: 'conductor', label: 'Conductores' },
];

// El backend manda `etiqueta` (MODERADOR / ADMIN / CONDUCTOR) como rol legible.
const etiquetaDe = (r) => (r.etiqueta || (r.esModerador ? 'MODERADOR' : r.rol || '')).toUpperCase();
const ROL_VARIANT = { MODERADOR: 'warning', CONDUCTOR: 'success' };
const ROL_LABEL = { MODERADOR: 'Moderador', ADMIN: 'Administrador', CONDUCTOR: 'Conductor' };
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
  const [roleFilter, setRoleFilter] = useState('');

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getContactableUsers({ q: q.trim() || undefined, rol: roleFilter || undefined, limit: 100, ...ciudadParams });
      // Defensa: si un backend viejo aún manda clientes, no se muestran.
      setContacts(toList(res.data, 'users', 'contactableUsers').filter((c) => (c.rol || '') !== 'cliente'));
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
      render: (_, r) => <Link className="btn btn--ghost btn--sm" to={`/moderator/conversations?usuario=${r.id}`}>Chat</Link>,
    },
  ];

  return (
    <div className="page">
      <PageHeader
        title="Equipo"
        description="Moderadores, administrador y conductores de tu zona con los que puedes chatear. A los clientes solo se les escribe desde un ticket, un SOS o una disputa."
      />

      <div className="toolbar">
        <SearchInput value={q} onChange={setQ} placeholder="Buscar por nombre, correo o teléfono" />
        <SegmentedFilter options={ROLE_FILTERS} value={roleFilter} onChange={setRoleFilter} ariaLabel="Filtrar por rol" />
      </div>

      {error && <div className="page-error" role="alert">{error}</div>}

      <DataTable
        columns={columns}
        data={contacts}
        loading={loading}
        emptyMessage={q ? `Sin resultados para “${q}”` : 'No hay contactos para mostrar'}
      />
    </div>
  );
}
