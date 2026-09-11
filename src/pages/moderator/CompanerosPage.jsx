import { useState, useEffect, useCallback } from 'react';
import DataTable from '../../components/admin/DataTable';
import { getContactableUsers } from '../../api/moderator';
import { useModeratorCity } from '../../contexts/ModeratorCityContext';

const theme = { bg: '#020208', cards: '#0f1220', accent: '#f59e0b', text: '#e2e8f0', muted: '#64748b', border: '#1e2238', success: '#22c55e', danger: '#ef4444' };

const rolColor = (rol, esModerador) => {
  if (esModerador) return theme.accent;
  if (rol === 'conductor') return theme.success;
  if (rol === 'cliente') return '#06b6d4';
  return theme.muted;
};
const rolLabel = (r) => (r.esModerador ? `Moderador · ${r.zonaModerador || r.zona || '—'}` : (r.rol || 'Usuario'));

export default function CompanerosPage() {
  const { ciudadParams } = useModeratorCity();
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [q, setQ] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  const fetch = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const params = { q, search: q, limit: 100, ...ciudadParams };
      const res = await getContactableUsers(params);
      const d = res.data;
      setContacts(Array.isArray(d) ? d : (d.users || d.contactableUsers || d.data || []));
    } catch (err) {
      if (err.response?.status === 403) setError('No tienes permisos de moderador o ciudad no asignada');
      else setError(err.response?.data?.message || 'Error al cargar compañeros');
    } finally { setLoading(false); }
  }, [q, ciudadParams]);

  useEffect(() => {
    const id = setTimeout(fetch, q ? 350 : 0);
    return () => clearTimeout(id);
  }, [fetch]);

  const filtered = contacts.filter((c) => {
    if (!roleFilter) return true;
    if (roleFilter === 'moderador') return !!c.esModerador;
    return (c.rol || '') === roleFilter;
  });

  const tpl = (v) => <span style={{ fontSize: 13 }}>{v || '—'}</span>;

  const columns = [
    { key: 'nombre', label: 'Nombre', render: (val, r) => <span style={{ fontWeight: 600 }}>{val || r.name || '—'}</span> },
    { key: 'rol', label: 'Rol', render: (_, r) => <span style={{ padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: `${rolColor(r.rol, r.esModerador)}20`, color: rolColor(r.rol, r.esModerador) }}>{rolLabel(r)}</span> },
    { key: 'email', label: 'Email', render: tpl },
    { key: 'telefono', label: 'Teléfono', render: (v, r) => tpl(r.telefono || r.phone || v) },
    { key: 'etiqueta', label: 'Zona', render: (v, r) => tpl(r.etiqueta || r.zona || r.zonaModerador || (r.esModerador ? r.zonaModerador : '')) },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        {[['', 'Todos'], ['moderador', 'Moderadores'], ['conductor', 'Conductores'], ['cliente', 'Clientes']].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setRoleFilter(key)}
            style={{
              padding: '6px 14px', borderRadius: 8, border: `1px solid ${theme.border}`,
              background: roleFilter === key ? 'rgba(245,158,11,0.15)' : 'transparent',
              color: roleFilter === key ? theme.accent : theme.muted, fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}
          >
            {label}
          </button>
        ))}
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nombre, correo o teléfono..."
          style={{ flex: 1, minWidth: 200, padding: '8px 12px', borderRadius: 8, border: `1px solid ${theme.border}`, background: theme.bg, color: theme.text, fontSize: 12 }}
        />
      </div>
      {error && <div style={{ padding: 10, background: 'rgba(239,68,68,0.1)', color: theme.danger, borderRadius: 8, fontSize: 13 }}>{error}</div>}
      <DataTable columns={columns} data={filtered} loading={loading} emptyMessage="No hay compañeros para mostrar" />
    </div>
  );
}