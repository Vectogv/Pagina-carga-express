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

const rolVariant = (r) => {
  if (r.esModerador) return 'warning';
  if (r.rol === 'conductor') return 'success';
  if (r.rol === 'cliente') return 'info';
  return 'neutral';
};
const rolLabel = (r) => (r.esModerador ? `Moderador · ${r.zonaModerador || r.zona || '—'}` : (r.rol || 'Usuario'));

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
      const res = await getContactableUsers({ q, search: q, limit: 100, ...ciudadParams });
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
    { key: 'etiqueta', label: 'Zona', render: (_, r) => r.etiqueta || r.zona || r.zonaModerador || '—' },
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
        data={filtered}
        loading={loading}
        emptyMessage={q ? `Sin resultados para “${q}”` : 'No hay compañeros para mostrar'}
      />
    </div>
  );
}
