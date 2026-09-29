import { useState, useEffect, useCallback } from 'react';
import { getContactableUsers } from '../../api/moderator';
import { useModeratorCity } from '../../contexts/ModeratorCityContext';
import { errorMessage, fullName, toList } from '../../utils/format';
import {
  PageHeader, SearchInput, SegmentedFilter, DataTable, Avatar, Badge,
} from '../../components/ui';

const ROLE_FILTERS = [
  { value: '', label: 'Todos' },
  { value: 'moderador', label: 'Moderadores' },
  { value: 'conductor', label: 'Conductores' },
  { value: 'cliente', label: 'Clientes' },
];

// El backend manda `etiqueta` (MODERADOR / ADMIN / CONDUCTOR / CLIENTE) como rol legible.
const etiquetaDe = (r) => (r.etiqueta || (r.esModerador ? 'MODERADOR' : r.rol || '')).toUpperCase();
const ROL_VARIANT = { MODERADOR: 'warning', CONDUCTOR: 'success', CLIENTE: 'info' };
const ROL_LABEL = { MODERADOR: 'Moderador', ADMIN: 'Administrador', CONDUCTOR: 'Conductor', CLIENTE: 'Cliente' };
const rolVariant = (r) => ROL_VARIANT[etiquetaDe(r)] || 'neutral';
const rolLabel = (r) => ROL_LABEL[etiquetaDe(r)] || 'Usuario';
const capitalize = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
// Solo los moderadores tienen zona asignada.
const zonaLabel = (r) => capitalize((r.zonaModerador || '').trim()) || '—';
const MIN_CLIENT_QUERY = 3;

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
      const res = await getContactableUsers({ q: q.trim() || undefined, limit: 100, ...ciudadParams });
      setContacts(toList(res.data, 'users', 'contactableUsers'));
    } catch (err) {
      if (err.response?.status === 403) setError('No tienes permisos de moderador o ciudad no asignada');
      else setError(errorMessage(err, 'Error al cargar compañeros'));
    } finally {
      setLoading(false);
    }
  }, [q, ciudadParams]);

  useEffect(() => {
    const id = setTimeout(fetchContacts, q ? 350 : 0);
    return () => clearTimeout(id);
  }, [fetchContacts, q]);

  const filtered = contacts.filter((c) => {
    if (!roleFilter) return true;
    if (roleFilter === 'moderador') return !!c.esModerador;
    return (c.rol || '') === roleFilter;
  });
  // El backend solo devuelve clientes cuando la búsqueda tiene al menos 3 letras.
  const needsClientQuery = roleFilter === 'cliente' && q.trim().length < MIN_CLIENT_QUERY;

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
  ];

  return (
    <div className="page">
      <PageHeader title="Compañeros" description="Moderadores, conductores y clientes con los que puedes comunicarte." />

      <div className="toolbar">
        <SearchInput value={q} onChange={setQ} placeholder="Buscar por nombre, correo o teléfono" />
        <SegmentedFilter options={ROLE_FILTERS} value={roleFilter} onChange={setRoleFilter} ariaLabel="Filtrar por rol" />
      </div>

      {error && <div className="page-error" role="alert">{error}</div>}

      <DataTable
        columns={columns}
        data={needsClientQuery ? [] : filtered}
        loading={loading}
        emptyMessage={
          needsClientQuery
            ? 'Escribe al menos 3 letras para buscar clientes'
            : (q ? `Sin resultados para “${q}”` : 'No hay compañeros para mostrar')
        }
      />
    </div>
  );
}
