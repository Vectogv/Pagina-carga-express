import { useState, useEffect, useCallback } from 'react';
import { Pencil, Search, UserMinus, UserPlus } from 'lucide-react';
import { getUsers, setModerator } from '../../api/admin';
import { errorMessage, fullName, toList } from '../../utils/format';
import {
  Alert, Avatar, Badge, Button, Card, DataTable, Input, Modal, PageHeader, SegmentedFilter, Select,
} from '../../components/ui';
import { getZonaModerador, userId } from './users/constants';
import { useZonas, zonaLabelFrom } from '../../hooks/useZonas';
import './users/users.css';

const isModerador = (u) => u.esModerador || u.es_moderador;

export default function ModeratorsPage() {
  const ZONAS = useZonas();
  const zonaLabel = (z) => zonaLabelFrom(ZONAS, z);
  const [mods, setMods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [zonaFilter, setZonaFilter] = useState('all');

  // Buscador para agregar moderadores
  const [search, setSearch] = useState('');
  const [selectedZonaRaw, setSelectedZona] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);

  const selectedZona = selectedZonaRaw || ZONAS[0]?.value || '';

  // Modal de modificación de zona
  const [edit, setEdit] = useState(null);
  const [editZona, setEditZona] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const fetchMods = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Se piden hasta 100 y se filtra también en cliente (respaldo si el backend ignora `rol`).
      const res = await getUsers({ page: 1, limit: 100, rol: 'moderador' });
      setMods(toList(res.data, 'users').filter(isModerador));
    } catch (err) {
      setError(errorMessage(err, 'Error al cargar moderadores'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMods(); }, [fetchMods]);

  useEffect(() => {
    if (!notice) return undefined;
    const t = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(t);
  }, [notice]);

  const handleRemove = async (u) => {
    try {
      await setModerator(userId(u), { esModerador: false });
      setNotice(`${fullName(u)} ya no es moderador`);
      fetchMods();
    } catch (err) {
      setError(errorMessage(err, 'Error al quitar moderador'));
    }
  };

  const openEdit = (u) => {
    setEditZona(getZonaModerador(u) || ZONAS[0]?.value || '');
    setEdit(u);
  };

  const handleModify = async () => {
    if (!edit) return;
    setSavingEdit(true);
    try {
      await setModerator(userId(edit), { esModerador: true, zonaModerador: editZona });
      setEdit(null);
      setNotice('Zona actualizada');
      fetchMods();
    } catch (err) {
      setError(errorMessage(err, 'Error al modificar'));
    } finally {
      setSavingEdit(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!search.trim()) return;
    setSearching(true);
    try {
      const res = await getUsers({ page: 1, limit: 20, search: search.trim() });
      // Solo usuarios que NO son moderadores y NO son admin
      setSearchResults(toList(res.data, 'users').filter((u) => !isModerador(u) && (u.rol || '').toLowerCase() !== 'admin'));
    } catch (err) {
      setSearchResults([]);
      setError(errorMessage(err, 'Error al buscar usuarios'));
    } finally {
      setSearching(false);
      setSearched(true);
    }
  };

  const handleAddModerador = async (u) => {
    try {
      await setModerator(userId(u), { esModerador: true, zonaModerador: selectedZona });
      setSearch('');
      setSearchResults([]);
      setSearched(false);
      setNotice(`${fullName(u)} asignado como moderador de ${zonaLabel(selectedZona)}`);
      fetchMods();
    } catch (err) {
      setError(errorMessage(err, 'Error al asignar'));
    }
  };

  const zonaOf = (u) => getZonaModerador(u).toLowerCase();
  const filteredMods = zonaFilter === 'all' ? mods : mods.filter((u) => zonaOf(u) === zonaFilter);
  const zonaOptions = [
    { value: 'all', label: 'Todas', count: mods.length },
    ...ZONAS.map((z) => ({ value: z.value, label: z.label, count: mods.filter((u) => zonaOf(u) === z.value).length })),
  ];

  const columns = [
    {
      key: 'nombre',
      label: 'Moderador',
      render: (_, u) => (
        <div className="cell-user">
          <Avatar src={u.avatar} name={fullName(u)} />
          <div className="cell-user__text">
            <span className="cell-user__name">{fullName(u)}</span>
            <span className="cell-user__meta">{u.email || '—'}</span>
          </div>
        </div>
      ),
    },
    { key: 'telefono', label: 'Teléfono', render: (v) => v || '—' },
    { key: 'zona', label: 'Zona', render: (_, u) => <Badge variant="info">{zonaLabel(getZonaModerador(u))}</Badge> },
    {
      key: 'acciones',
      label: '',
      align: 'right',
      render: (_, u) => (
        <div className="row row--end">
          <Button size="sm" variant="secondary" icon={<Pencil size={14} />} onClick={() => openEdit(u)}>Modificar</Button>
          <Button size="sm" variant="soft-danger" icon={<UserMinus size={14} />} onClick={() => handleRemove(u)}>Quitar</Button>
        </div>
      ),
    },
  ];

  return (
    <div className="page">
      <PageHeader title="Moderadores" description="Usuarios con permisos de moderación por zona." />

      <Card title="Agregar moderador" description="Busca un usuario existente y asígnale una zona.">
        <div className="stack">
          <form className="toolbar" onSubmit={handleSearch}>
            <Input
              className="toolbar__spacer"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setSearched(false); }}
              placeholder="Buscar por nombre o correo"
              aria-label="Buscar usuario por nombre o correo"
            />
            <Select className="inline-select" value={selectedZona} onChange={(e) => setSelectedZona(e.target.value)} aria-label="Zona a asignar">
              {ZONAS.map((z) => <option key={z.value} value={z.value}>{z.label}</option>)}
            </Select>
            <Button type="submit" variant="secondary" icon={<Search size={15} />} loading={searching} disabled={!search.trim()}>
              Buscar
            </Button>
          </form>

          {searchResults.length > 0 && (
            <div className="result-list">
              {searchResults.map((u) => (
                <div key={userId(u)} className="result-item">
                  <div className="cell-user">
                    <Avatar src={u.avatar} name={fullName(u)} />
                    <div className="cell-user__text">
                      <span className="cell-user__name">{fullName(u)}</span>
                      <span className="cell-user__meta">{u.email} · {u.rol}</span>
                    </div>
                  </div>
                  <Button size="sm" variant="soft-success" icon={<UserPlus size={14} />} onClick={() => handleAddModerador(u)}>
                    Asignar a {zonaLabel(selectedZona)}
                  </Button>
                </div>
              ))}
            </div>
          )}
          {searched && !searching && searchResults.length === 0 && (
            <p className="text-sm text-muted">Sin resultados. Prueba con otro nombre o correo.</p>
          )}
        </div>
      </Card>

      <div className="toolbar">
        <SegmentedFilter options={zonaOptions} value={zonaFilter} onChange={setZonaFilter} ariaLabel="Filtrar por zona" />
      </div>

      {notice && <Alert variant="success" onClose={() => setNotice(null)}>{notice}</Alert>}
      {error && <div className="page-error" role="alert">{error}</div>}

      <DataTable
        columns={columns}
        data={filteredMods}
        loading={loading}
        emptyMessage={zonaFilter !== 'all' ? `No hay moderadores en ${zonaLabel(zonaFilter)}` : 'No hay moderadores'}
      />

      <Modal
        isOpen={!!edit}
        onClose={() => setEdit(null)}
        title={`Modificar ${fullName(edit)}`}
        description={edit ? `${edit.email || ''} · zona actual: ${zonaLabel(getZonaModerador(edit))}` : undefined}
        size="sm"
        footer={(
          <>
            <Button variant="secondary" onClick={() => setEdit(null)} disabled={savingEdit}>Cancelar</Button>
            <Button onClick={handleModify} loading={savingEdit}>Guardar cambios</Button>
          </>
        )}
      >
        <Select label="Nueva zona" value={editZona} onChange={(e) => setEditZona(e.target.value)}>
          {ZONAS.map((z) => <option key={z.value} value={z.value}>{z.label}</option>)}
        </Select>
      </Modal>
    </div>
  );
}
