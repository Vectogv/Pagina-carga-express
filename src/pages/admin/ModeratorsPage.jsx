import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Ban, Copy, Link2, Pencil, RefreshCw, Search, UserMinus, UserPlus } from 'lucide-react';
import { getUsers, setModerator } from '../../api/admin';
import {
  anularInvitacionModerador, crearInvitacionModerador, getInvitacionesModerador, reenviarInvitacionModerador,
} from '../../api/invitacion';
import { errorMessage, fullName, toList } from '../../utils/format';
import {
  Alert, Avatar, Badge, Button, Card, ConfirmDialog, DataTable, Input, Modal, PageHeader, Pagination, Select,
} from '../../components/ui';
import { FiltroZona } from '../../components/panel';
import { getZonaModerador, paginacionDe, userId } from './users/constants';
import { useZonas, zonaLabelFrom } from '../../hooks/useZonas';
import './users/users.css';

const isModerador = (u) => u.esModerador || u.es_moderador;
const LIMIT = 20;

export default function ModeratorsPage() {
  const ZONAS = useZonas();
  const zonaLabel = (z) => zonaLabelFrom(ZONAS, z);
  const [mods, setMods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [zonaFilter, setZonaFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: undefined, totalPages: 1 });
  const [removeTarget, setRemoveTarget] = useState(null);

  // Modal "Asignar moderador de zona": buscador de usuarios
  const [asignarOpen, setAsignarOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedZonaRaw, setSelectedZona] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);

  const selectedZona = selectedZonaRaw || ZONAS[0]?.value || '';

  // Invitaciones con enlace
  const [invOpen, setInvOpen] = useState(false);
  const [invZonaRaw, setInvZona] = useState('');
  const [invEmail, setInvEmail] = useState('');
  const [invSaving, setInvSaving] = useState(false);
  const [invError, setInvError] = useState(null);
  const [invResultado, setInvResultado] = useState(null);
  const [invitaciones, setInvitaciones] = useState([]);
  const [anularTarget, setAnularTarget] = useState(null);
  const invZona = invZonaRaw || ZONAS[0]?.value || '';

  // Modal de modificación de zona
  const [edit, setEdit] = useState(null);
  const [editZona, setEditZona] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const fetchMods = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // GET /api/admin/users filtra `rol=moderador` y `zona` en el servidor y pagina con X-Total-Count.
      const res = await getUsers({ page, limit: LIMIT, rol: 'moderador', zona: zonaFilter || undefined });
      const rows = toList(res.data, 'users');
      setMods(rows.filter(isModerador));
      setPagination(paginacionDe(res.headers, rows.length, page, LIMIT));
    } catch (err) {
      setError(errorMessage(err, 'Error al cargar moderadores'));
    } finally {
      setLoading(false);
    }
  }, [page, zonaFilter]);

  useEffect(() => { fetchMods(); }, [fetchMods]);

  useEffect(() => {
    if (!notice) return undefined;
    const t = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(t);
  }, [notice]);

  const handleRemove = async () => {
    const u = removeTarget;
    if (!u) return;
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
      cerrarAsignar();
      setNotice(`${fullName(u)} asignado como moderador de ${zonaLabel(selectedZona)}`);
      fetchMods();
    } catch (err) {
      setError(errorMessage(err, 'Error al asignar'));
    }
  };

  const fetchInvitaciones = useCallback(async () => {
    try {
      const res = await getInvitacionesModerador();
      setInvitaciones(toList(res.data, 'data'));
    } catch {
      setInvitaciones([]);
    }
  }, []);

  useEffect(() => { fetchInvitaciones(); }, [fetchInvitaciones]);

  const cerrarAsignar = () => {
    setAsignarOpen(false);
    setSearch('');
    setSearchResults([]);
    setSearched(false);
  };

  const abrirInvitar = () => {
    setInvEmail('');
    setInvError(null);
    setInvResultado(null);
    setInvOpen(true);
  };

  const handleInvitar = async () => {
    setInvSaving(true);
    setInvError(null);
    try {
      const res = await crearInvitacionModerador({ zona: invZona, email: invEmail.trim() || undefined, dias: 7 });
      setInvResultado(res.data);
      fetchInvitaciones();
    } catch (err) {
      setInvError(errorMessage(err, 'No se pudo crear la invitación'));
    } finally {
      setInvSaving(false);
    }
  };

  const copiarEnlace = async (enlace) => {
    try {
      await navigator.clipboard.writeText(enlace);
      setNotice('Enlace copiado');
    } catch {
      setNotice('No se pudo copiar: selecciona el enlace y cópialo a mano');
    }
  };

  const handleReenviar = async (inv) => {
    try {
      const res = await reenviarInvitacionModerador(inv.id, { dias: 7 });
      setInvResultado(res.data);
      setInvError(null);
      setInvOpen(true);
      fetchInvitaciones();
    } catch (err) {
      setError(errorMessage(err, 'No se pudo generar el enlace nuevo'));
    }
  };

  const handleAnular = async () => {
    const inv = anularTarget;
    if (!inv) return;
    try {
      await anularInvitacionModerador(inv.id);
      setNotice('Invitación anulada');
      fetchInvitaciones();
    } catch (err) {
      setError(errorMessage(err, 'No se pudo anular la invitación'));
    }
  };
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
          <Link className="btn btn--soft-primary btn--sm" to={`/admin/moderators/${userId(u)}`}>Ver perfil</Link>
          <Button size="sm" variant="secondary" icon={<Pencil size={14} />} onClick={() => openEdit(u)}>Modificar</Button>
          <Button size="sm" variant="soft-danger" icon={<UserMinus size={14} />} onClick={() => setRemoveTarget(u)}>Quitar</Button>
        </div>
      ),
    },
  ];

  return (
    <div className="page">
      <PageHeader
        title="Moderadores"
        description="Personas que atienden emergencias, verifican conductores y publican avisos en una ciudad. Cada moderador tiene una sola zona."
        actions={(
          <>
            <Button variant="secondary" icon={<UserPlus size={15} />} onClick={() => setAsignarOpen(true)}>Asignar moderador de zona</Button>
            <Button icon={<Link2 size={15} />} onClick={abrirInvitar}>Invitar con enlace</Button>
          </>
        )}
      />

      <Card title="Invitaciones con enlace" description="Enlaces personales de un solo uso para que alguien pida ser moderador sin tener cuenta.">
        {invitaciones.length === 0 ? (
          <p className="text-sm text-muted">Aún no hay invitaciones.</p>
        ) : (
          <div className="result-list">
            {invitaciones.slice(0, 10).map((inv) => (
              <div key={inv.id} className="result-item">
                <div className="cell-user__text">
                  <span className="cell-user__name">{zonaLabel(inv.zona)} · {inv.email || 'sin correo'}</span>
                  <span className="cell-user__meta">
                    Vence {new Date(inv.venceAt).toLocaleDateString('es-CO')}
                  </span>
                </div>
                <div className="row row--end">
                  <Badge variant={{ pendiente: 'info', usada: 'success', anulada: 'neutral', vencida: 'warning' }[inv.estado] || 'neutral'}>{inv.estado}</Badge>
                  {(inv.estado === 'pendiente' || inv.estado === 'vencida') && (
                    <Button size="sm" variant="secondary" icon={<RefreshCw size={14} />} onClick={() => handleReenviar(inv)}>Enlace nuevo</Button>
                  )}
                  {inv.estado === 'pendiente' && (
                    <Button size="sm" variant="soft-danger" icon={<Ban size={14} />} onClick={() => setAnularTarget(inv)}>Anular</Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="toolbar">
        <FiltroZona value={zonaFilter} onChange={(v) => { setZonaFilter(v); setPage(1); }} />
      </div>

      {notice && <Alert variant="success" onClose={() => setNotice(null)}>{notice}</Alert>}
      {error && <div className="page-error" role="alert">{error}</div>}

      <DataTable
        columns={columns}
        data={mods}
        loading={loading}
        emptyMessage={zonaFilter ? `No hay moderadores en ${zonaLabel(zonaFilter)}` : 'No hay moderadores'}
        footer={<Pagination page={page} totalPages={pagination.totalPages} total={pagination.total} onChange={setPage} />}
      />

      <ConfirmDialog
        isOpen={!!removeTarget}
        onClose={() => setRemoveTarget(null)}
        onConfirm={handleRemove}
        title="Quitar moderador"
        message={`¿Quitar a ${fullName(removeTarget)} como moderador de ${zonaLabel(getZonaModerador(removeTarget))}? Su cuenta sigue activa, solo pierde el acceso al panel de moderación.`}
        confirmText="Quitar"
        danger
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
      <Modal
        isOpen={asignarOpen}
        onClose={cerrarAsignar}
        title="Asignar moderador de zona"
        description="Busca un usuario existente y asígnale una zona."
        size="md"
      >
        <div className="stack">
          <form className="toolbar" onSubmit={handleSearch}>
            <Input
              className="toolbar__spacer"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setSearched(false); }}
              placeholder="Buscar nombre o correo"
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
      </Modal>

      <Modal
        isOpen={invOpen}
        onClose={() => setInvOpen(false)}
        title="Invitar con enlace"
        description="Genera un enlace personal (vence en 7 días) para que la persona pida ser moderadora."
        size="sm"
        footer={invResultado ? (
          <Button onClick={() => setInvOpen(false)}>Listo</Button>
        ) : (
          <>
            <Button variant="secondary" onClick={() => setInvOpen(false)} disabled={invSaving}>Cancelar</Button>
            <Button onClick={handleInvitar} loading={invSaving}>Crear invitación</Button>
          </>
        )}
      >
        {invResultado ? (
          <div className="stack">
            <Alert variant="success">
              {invResultado.correoEnviado === true && `Invitación enviada a ${invResultado.email}. `}
              {invResultado.correoEnviado === false && 'No se pudo enviar el correo: comparte el enlace a mano. '}
              Este enlace solo se muestra ahora.
            </Alert>
            <Input label="Enlace" readOnly value={invResultado.enlace} onFocus={(e) => e.target.select()} />
            <Button variant="secondary" icon={<Copy size={14} />} onClick={() => copiarEnlace(invResultado.enlace)}>Copiar enlace</Button>
          </div>
        ) : (
          <div className="stack">
            {invError && <div className="page-error" role="alert">{invError}</div>}
            <Select label="Zona" value={invZona} onChange={(e) => setInvZona(e.target.value)}>
              {ZONAS.map((z) => <option key={z.value} value={z.value}>{z.label}</option>)}
            </Select>
            <Input
              label="Correo (opcional)"
              type="email"
              value={invEmail}
              onChange={(e) => setInvEmail(e.target.value)}
              helperText="Si lo pones, enviamos el enlace por correo y solo ese correo podrá usarlo."
            />
          </div>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={!!anularTarget}
        onClose={() => setAnularTarget(null)}
        onConfirm={handleAnular}
        title="Anular invitación"
        message="El enlace dejará de funcionar. ¿Anular esta invitación?"
        confirmText="Anular"
        danger
      />
    </div>
  );
}
