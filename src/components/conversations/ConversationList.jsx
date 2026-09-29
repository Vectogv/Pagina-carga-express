import { useMemo, useState } from 'react';
import { Lock, MapPin, MessagesSquare, Plus } from 'lucide-react';
import { Avatar, Badge, Button, SearchInput, SegmentedFilter } from '../ui';
import {
  GRUPOS, ROL_BADGE, ciudadDe, formatFechaCompleta, formatHoraLista, getRolEtiqueta, grupoDe, sortByRecency,
} from './conversationUtils';

const TODAS_CIUDADES = '';

/** Texto donde busca el filtro local (nombre, ciudad, rol, correo y último mensaje). */
const textoBuscable = (c, o, ciudadLabel) => [
  o?.nombre, c.nombre, o?.email, o?.telefono, ciudadLabel(ciudadDe(c, o)), c.moderador,
  ROL_BADGE[getRolEtiqueta(o)]?.label, c.ultimoMensaje,
].filter(Boolean).join(' ').toLowerCase();

function ConversationItem({ conversation: c, contact: u, active, ciudadLabel, onSelect }) {
  const rol = ROL_BADGE[getRolEtiqueta(u)];
  const nombre = u?.nombre || c.nombre || 'Usuario';
  const ciudad = ciudadLabel(ciudadDe(c, u));
  const fecha = c.ultimoMensajeAt || c.updatedAt;
  const noLeidos = c.noLeidos || 0;
  const unread = noLeidos > 0;

  return (
    <button
      type="button"
      className={`chat-item ${active ? 'chat-item--active' : ''} ${unread ? 'chat-item--unread' : ''}`}
      onClick={() => onSelect(c)}
      aria-current={active ? 'true' : undefined}
    >
      <Avatar src={c.avatar || u?.avatar} name={nombre} size={40} />
      <span className="chat-item__body">
        <span className="chat-item__row">
          <span className="chat-item__name truncate">{nombre}</span>
          {fecha && (
            <time className="chat-item__time" dateTime={fecha} title={formatFechaCompleta(fecha)}>
              {formatHoraLista(fecha)}
            </time>
          )}
        </span>
        <span className="chat-item__row">
          {c.ultimoMensaje
            ? <span className="chat-item__preview truncate">{c.ultimoMensaje}</span>
            : <span className="chat-item__preview chat-item__preview--empty truncate">Sin mensajes aún</span>}
          {unread && <span className="chat-count" aria-label={`${noLeidos} sin leer`}>{noLeidos > 99 ? '99+' : noLeidos}</span>}
        </span>
        <span className="chat-item__meta">
          <Badge variant={rol.variant} size="sm">{rol.label}</Badge>
          {ciudad && <span className="chat-item__city"><MapPin size={11} aria-hidden="true" />{ciudad}</span>}
        </span>
      </span>
    </button>
  );
}

export default function ConversationList({
  conversations, loading, selectedId, unreadTotal, canCreate, other, ciudadLabel, onSelect, onNew,
}) {
  const [filtro, setFiltro] = useState('');
  const [vista, setVista] = useState('todas');
  const [ciudadSel, setCiudadSel] = useState(TODAS_CIUDADES);

  // Ciudades presentes en la lista: el selector solo aparece si hay más de una.
  const ciudades = useMemo(() => {
    const set = new Set();
    conversations.forEach((c) => { const k = ciudadDe(c, other(c)); if (k) set.add(k); });
    return [...set].sort((a, b) => ciudadLabel(a).localeCompare(ciudadLabel(b), 'es'));
  }, [conversations, other, ciudadLabel]);
  const ciudadActiva = ciudades.includes(ciudadSel) ? ciudadSel : TODAS_CIUDADES;

  const { grupos, totalNoLeidas, vacioPorFiltro } = useMemo(() => {
    const q = filtro.trim().toLowerCase();
    const base = conversations.filter((c) => {
      const o = other(c);
      if (ciudadActiva && ciudadDe(c, o) !== ciudadActiva) return false;
      return !q || textoBuscable(c, o, ciudadLabel).includes(q);
    });
    const noLeidas = base.filter((c) => (c.noLeidos || 0) > 0);
    const lista = vista === 'no-leidas' ? noLeidas : base;
    const porGrupo = {};
    sortByRecency(lista).forEach((c) => {
      const key = grupoDe(other(c));
      (porGrupo[key] = porGrupo[key] || []).push(c);
    });
    return {
      grupos: GRUPOS.filter((g) => porGrupo[g.key]?.length).map((g) => ({ ...g, items: porGrupo[g.key] })),
      totalNoLeidas: noLeidas.length,
      vacioPorFiltro: conversations.length > 0 && lista.length === 0,
    };
  }, [conversations, filtro, other, ciudadLabel, ciudadActiva, vista]);

  const hayFiltros = Boolean(filtro.trim()) || Boolean(ciudadActiva);

  return (
    <div className="chat__list">
      <div className="chat__list-header">
        <h3 className="chat__list-title">
          Conversaciones
          {unreadTotal > 0 && <span className="chat-count" aria-label={`${unreadTotal} mensajes sin leer`}>{unreadTotal}</span>}
        </h3>
        {canCreate ? (
          <Button size="sm" variant="primary" icon={<Plus size={14} />} onClick={onNew}>Nueva</Button>
        ) : (
          <span className="chat__readonly" title="Los moderadores inician el chat y tú respondes aquí">
            <Lock size={12} /> Solo responder
          </span>
        )}
      </div>

      {conversations.length > 0 && (
        <div className="chat__list-tools">
          <SearchInput value={filtro} onChange={setFiltro} placeholder="Buscar conversación…" />
          <div className="chat__list-filters">
            <SegmentedFilter
              ariaLabel="Filtrar conversaciones"
              value={vista}
              onChange={setVista}
              options={[
                { value: 'todas', label: 'Todas' },
                { value: 'no-leidas', label: 'No leídas', count: totalNoLeidas },
              ]}
            />
            {ciudades.length > 1 && (
              <select
                className="chat__city-select"
                value={ciudadActiva}
                onChange={(e) => setCiudadSel(e.target.value)}
                aria-label="Filtrar por ciudad"
              >
                <option value={TODAS_CIUDADES}>Todas</option>
                {ciudades.map((k) => <option key={k} value={k}>{ciudadLabel(k)}</option>)}
              </select>
            )}
          </div>
        </div>
      )}

      <div className="chat__list-scroll">
        {loading && <p className="chat__placeholder">Cargando conversaciones…</p>}

        {!loading && conversations.length === 0 && (
          <div className="chat__placeholder">
            <span className="chat__placeholder-icon"><MessagesSquare size={20} /></span>
            <strong>Aún no hay conversaciones</strong>
            <span>{canCreate ? 'Usa «Nueva» para escribirle a alguien.' : 'Aquí aparecerán los chats que te inicien.'}</span>
          </div>
        )}

        {!loading && vacioPorFiltro && (
          <div className="chat__placeholder">
            <span>
              {vista === 'no-leidas' && !hayFiltros ? 'Estás al día: no hay mensajes sin leer.' : 'Sin resultados con estos filtros.'}
            </span>
            {hayFiltros && (
              <Button size="sm" variant="ghost" onClick={() => { setFiltro(''); setCiudadSel(TODAS_CIUDADES); }}>
                Limpiar filtros
              </Button>
            )}
          </div>
        )}

        {!loading && grupos.map((g) => (
          <section key={g.key} className="chat__group" aria-label={g.label}>
            <h4 className="chat__section">
              {g.label}
              <span className="chat__section-count">{g.items.length}</span>
            </h4>
            {g.items.map((c) => (
              <ConversationItem
                key={c.id}
                conversation={c}
                contact={other(c)}
                active={String(selectedId) === String(c.id)}
                ciudadLabel={ciudadLabel}
                onSelect={onSelect}
              />
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}
