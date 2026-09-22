import { Fragment, useMemo, useState } from 'react';
import { Calendar, Lock, MapPin, MessagesSquare, Plus } from 'lucide-react';
import { Avatar, Badge, Button, SearchInput } from '../ui';
import {
  ROL_BADGE, fechaSalidaDe, formatFechaSalida, formatHoraLista, getRolEtiqueta, sortByRecency,
} from './conversationUtils';

const LABEL_SEQ = ['Moderación', 'Clientes'];

/** Agrupa las conversaciones en secciones (Moderación / Clientes) y, dentro, por ciudad. */
function groupConversations(conversations, other) {
  const secciones = [];
  const index = {};
  conversations.forEach((c) => {
    const o = other(c);
    const label = o?.esModerador ? 'Moderación' : 'Clientes';
    if (!(label in index)) { index[label] = secciones.length; secciones.push({ label, ciudades: [] }); }
    const seccion = secciones[index[label]];
    const ciudad = c.ciudad || o?.ciudad || 'General';
    let grupo = seccion.ciudades.find((g) => g.ciudad === ciudad);
    if (!grupo) { grupo = { ciudad, items: [] }; seccion.ciudades.push(grupo); }
    grupo.items.push(c);
  });
  secciones.sort((a, b) => LABEL_SEQ.indexOf(a.label) - LABEL_SEQ.indexOf(b.label));
  secciones.forEach((s) => s.ciudades.forEach((g) => { g.items = sortByRecency(g.items); }));
  return secciones;
}

/** Texto donde busca el filtro local (nombre, ciudad, rol, correo y último mensaje). */
const textoBuscable = (c, o) => [
  o?.nombre, c.nombre, o?.email, o?.ciudad, o?.zonaModerador, c.ciudad,
  ROL_BADGE[getRolEtiqueta(o)]?.label, c.ultimoMensaje,
].filter(Boolean).join(' ').toLowerCase();

function ConversationItem({ conversation: c, contact: u, active, onSelect }) {
  const rol = ROL_BADGE[getRolEtiqueta(u)];
  const nombre = u?.nombre || c.nombre || 'Usuario';
  const subtitulo = u?.esModerador ? (u.zonaModerador || u.ciudad || 'Moderador') : (u?.ciudad || '');
  const salida = fechaSalidaDe(c);
  const unread = c.noLeidos > 0;

  return (
    <button
      type="button"
      className={`chat-item ${active ? 'chat-item--active' : ''} ${unread ? 'chat-item--unread' : ''}`}
      onClick={() => onSelect(c)}
      aria-current={active ? 'true' : undefined}
    >
      <Avatar src={c.avatar || u?.avatar} name={nombre} size={36} />
      <span className="chat-item__body">
        <span className="chat-item__top">
          <span className="chat-item__name truncate">{nombre}</span>
          <span className="chat-item__time">{formatHoraLista(c.ultimoMensajeAt || c.updatedAt)}</span>
        </span>
        <span className="chat-item__meta">
          <Badge variant={rol.variant} size="sm">{rol.label}</Badge>
          {subtitulo && <span className="chat-item__meta-text"><MapPin size={11} />{subtitulo}</span>}
          {salida && <span className="chat-item__meta-text"><Calendar size={11} />{formatFechaSalida(salida)}</span>}
        </span>
        <span className="chat-item__preview truncate">{c.ultimoMensaje || 'Sin mensajes'}</span>
      </span>
      {unread && <span className="chat-count" aria-label={`${c.noLeidos} sin leer`}>{c.noLeidos}</span>}
    </button>
  );
}

export default function ConversationList({ conversations, loading, selectedId, unreadTotal, canCreate, other, onSelect, onNew }) {
  const [filtro, setFiltro] = useState('');

  const { noLeidas, secciones, vacioPorFiltro } = useMemo(() => {
    const q = filtro.trim().toLowerCase();
    const lista = q ? conversations.filter((c) => textoBuscable(c, other(c)).includes(q)) : conversations;
    const sinLeer = sortByRecency(lista.filter((c) => (c.noLeidos || 0) > 0));
    const leidas = lista.filter((c) => !((c.noLeidos || 0) > 0));
    return {
      noLeidas: sinLeer,
      secciones: groupConversations(leidas, other),
      vacioPorFiltro: Boolean(q) && lista.length === 0,
    };
  }, [conversations, filtro, other]);

  return (
    <div className="chat__list">
      <div className="chat__list-header">
        <h3 className="chat__list-title">
          Conversaciones
          {unreadTotal > 0 && <span className="chat-count">{unreadTotal}</span>}
        </h3>
        {canCreate ? (
          <Button size="sm" variant="soft-primary" icon={<Plus size={14} />} onClick={onNew}>Nueva</Button>
        ) : (
          <span className="chat__readonly" title="Los moderadores inician el chat y tú respondes aquí">
            <Lock size={12} /> Solo responder
          </span>
        )}
      </div>

      {conversations.length > 0 && (
        <div className="chat__list-search">
          <SearchInput value={filtro} onChange={setFiltro} placeholder="Filtrar conversaciones…" />
        </div>
      )}

      <div className="chat__list-scroll">
        {loading && <p className="chat__placeholder">Cargando conversaciones…</p>}
        {!loading && conversations.length === 0 && (
          <div className="chat__placeholder">
            <MessagesSquare size={20} />
            <span>Sin conversaciones</span>
          </div>
        )}
        {!loading && vacioPorFiltro && (
          <p className="chat__placeholder">{`Sin resultados para “${filtro.trim()}”`}</p>
        )}

        {!loading && noLeidas.length > 0 && (
          <div className="chat__unread-block">
            <p className="chat__section chat__section--unread">
              Sin leer
              <span className="chat-count">{noLeidas.length}</span>
            </p>
            {noLeidas.map((c) => (
              <ConversationItem
                key={c.id}
                conversation={c}
                contact={other(c)}
                active={String(selectedId) === String(c.id)}
                onSelect={onSelect}
              />
            ))}
          </div>
        )}

        {!loading && secciones.map((s) => (
          <Fragment key={s.label}>
            <p className="chat__section">{s.label}</p>
            {s.ciudades.map((g) => (
              <Fragment key={`${s.label}-${g.ciudad}`}>
                <p className="chat__city"><MapPin size={11} />{g.ciudad}</p>
                {g.items.map((c) => (
                  <ConversationItem
                    key={c.id}
                    conversation={c}
                    contact={other(c)}
                    active={String(selectedId) === String(c.id)}
                    onSelect={onSelect}
                  />
                ))}
              </Fragment>
            ))}
          </Fragment>
        ))}
      </div>
    </div>
  );
}
