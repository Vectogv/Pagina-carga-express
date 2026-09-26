import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft, Hand, ImagePlus, LifeBuoy, MapPin, Paperclip, Phone, Route, Send, UserRound, X,
} from 'lucide-react';
import { CATEGORIAS_TICKET, ESTADOS_TICKET, ticketsApi } from '../../api/tickets';
import { useAuth } from '../../contexts/AuthContext';
import useConversationSocket, { CONEXION, ETIQUETA_CONEXION } from '../../hooks/useConversationSocket';
import { useZonas, zonaLabelFrom } from '../../hooks/useZonas';
import { errorMessage, formatDateTime, timeAgo } from '../../utils/format';
import { resolveStorageUrl } from '../../utils/storage';
import {
  Badge, Button, Pagination, SegmentedFilter, Select, StatusBadge, statusLabel,
} from '../ui';
import './TicketsBoard.css';

const ROL_AUTOR = {
  usuario: { label: 'Usuario', variant: 'info' },
  moderador: { label: 'Moderador', variant: 'violet' },
  admin: { label: 'Admin', variant: 'primary' },
};

const ROL_USUARIO = { cliente: 'Cliente', conductor: 'Conductor' };

const EVENTOS_SOCKET = ['ticket:nuevo', 'ticket:mensaje', 'ticket:estado'];
const PAGE_SIZE = 20;

const sameId = (a, b) => a != null && b != null && String(a) === String(b);

function ConnectionDot({ estado }) {
  const valor = estado || CONEXION.CONECTANDO;
  return (
    <span className={`tickets__conn tickets__conn--${valor}`} title={ETIQUETA_CONEXION[valor] || valor}>
      <span className="tickets__conn-dot" aria-hidden="true" />
      {ETIQUETA_CONEXION[valor] || valor}
    </span>
  );
}

function Attachment({ path, label = 'Adjunto' }) {
  if (!path) return null;
  const url = resolveStorageUrl(path);
  return (
    <a className="tk-msg__attachment" href={url} target="_blank" rel="noopener noreferrer" aria-label={`Abrir ${label}`}>
      <img src={url} alt={label} loading="lazy" />
    </a>
  );
}

function TicketItem({ ticket: t, active, zonas, onSelect }) {
  return (
    <button
      type="button"
      className={`ticket-item ${active ? 'ticket-item--active' : ''}`}
      onClick={() => onSelect(t)}
      aria-current={active ? 'true' : undefined}
    >
      <span className="ticket-item__top">
        <span className="ticket-item__subject truncate">#{t.id} · {t.asunto}</span>
        <span className="ticket-item__time">{timeAgo(t.ultimoMensajeAt || t.updatedAt || t.createdAt)}</span>
      </span>
      <span className="ticket-item__meta">
        <StatusBadge status={t.estado} size="sm" />
        <Badge size="sm">{CATEGORIAS_TICKET[t.categoria] || t.categoria}</Badge>
        {t.zona && <span className="ticket-item__meta-text"><MapPin size={11} />{zonaLabelFrom(zonas, t.zona)}</span>}
      </span>
      <span className="ticket-item__who truncate">
        {t.usuario?.nombre || 'Usuario'}
        {t.usuario?.rol && ` · ${ROL_USUARIO[t.usuario.rol] || t.usuario.rol}`}
        {t.moderador?.nombre && ` → ${t.moderador.nombre}`}
      </span>
    </button>
  );
}

function Message({ message: m, isMe, origen = false }) {
  const rol = ROL_AUTOR[m.rolAutor] || ROL_AUTOR.usuario;
  return (
    <div className={`tk-msg ${isMe ? 'tk-msg--me' : ''} ${origen ? 'tk-msg--origen' : ''}`}>
      {!isMe && (
        <div className="tk-msg__author">
          <span className="tk-msg__author-name">{m.autor?.nombre || 'Usuario'}</span>
          <Badge variant={rol.variant} size="sm">{origen ? 'Descripción inicial' : rol.label}</Badge>
        </div>
      )}
      <div className="tk-msg__bubble">
        <span className="tk-msg__text">{m.mensaje}</span>
        <Attachment path={m.adjunto} label={`Adjunto del mensaje ${m.id}`} />
        <span className="tk-msg__time">{formatDateTime(m.createdAt)}</span>
      </div>
    </div>
  );
}

/**
 * Bandeja de tickets de soporte: lista (izquierda) + detalle con hilo (derecha).
 *
 * - `area` = 'admin' | 'moderator'. El admin ve todas las zonas y puede asignar
 *   moderador; el moderador ve solo su zona (el backend la fija).
 * - Tiempo real: un socket escucha ticket:nuevo / ticket:mensaje / ticket:estado.
 */
export default function TicketsBoard({ area }) {
  const api = useMemo(() => ticketsApi(area), [area]);
  const isAdmin = area === 'admin';
  const { user } = useAuth();
  const myId = user?.id;
  const zonas = useZonas();

  const [filtroEstado, setFiltroEstado] = useState('activos');
  const [filtroZona, setFiltroZona] = useState('');
  const [soloMios, setSoloMios] = useState(false);
  const [page, setPage] = useState(1);

  const [tickets, setTickets] = useState([]);
  const [meta, setMeta] = useState({ total: 0, lastPage: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');

  const [draft, setDraft] = useState('');
  const [file, setFile] = useState(null);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const [acting, setActing] = useState(false);

  const [moderadores, setModeradores] = useState([]);
  const endRef = useRef(null);
  const fileInputRef = useRef(null);

  const listParams = useMemo(() => {
    const params = { page, limit: PAGE_SIZE };
    if (filtroEstado === 'activos') params.estado = 'abierto,en_proceso';
    else if (filtroEstado !== 'all') params.estado = filtroEstado;
    if (isAdmin && filtroZona) params.zona = filtroZona;
    if (soloMios) params.mios = 1;
    return params;
  }, [page, filtroEstado, filtroZona, soloMios, isAdmin]);

  const fetchList = useCallback(async (silencioso = false) => {
    if (!silencioso) setLoading(true);
    setError('');
    try {
      const { data } = await api.list(listParams);
      setTickets(Array.isArray(data?.tickets) ? data.tickets : []);
      setMeta({ total: data?.meta?.total ?? 0, lastPage: data?.meta?.lastPage ?? 1 });
    } catch (err) {
      setError(errorMessage(err, 'No se pudieron cargar los tickets'));
    } finally {
      setLoading(false);
    }
  }, [api, listParams]);

  useEffect(() => { fetchList(); }, [fetchList]);
  useEffect(() => { setPage(1); }, [filtroEstado, filtroZona, soloMios]);

  const fetchDetail = useCallback(async (id, silencioso = false) => {
    if (!id) return;
    if (!silencioso) setDetailLoading(true);
    setDetailError('');
    try {
      const { data } = await api.get(id);
      setDetail(data);
    } catch (err) {
      setDetailError(errorMessage(err, 'No se pudo cargar el ticket'));
    } finally {
      setDetailLoading(false);
    }
  }, [api]);

  useEffect(() => {
    setDetail(null);
    setDraft('');
    setFile(null);
    setSendError('');
    if (selectedId) fetchDetail(selectedId);
  }, [selectedId, fetchDetail]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [detail?.mensajes?.length]);

  // Moderadores asignables (admin): los de la zona del ticket abierto.
  useEffect(() => {
    if (!isAdmin || !detail) return;
    let cancelado = false;
    api.moderators(detail.zona ? { zona: detail.zona } : {})
      .then(({ data }) => { if (!cancelado) setModeradores(Array.isArray(data?.moderadores) ? data.moderadores : []); })
      .catch(() => { if (!cancelado) setModeradores([]); });
    return () => { cancelado = true; };
  }, [api, isAdmin, detail?.id, detail?.zona]); // eslint-disable-line react-hooks/exhaustive-deps

  // Aplica un ticket actualizado (respuesta HTTP o socket) a la lista y al detalle.
  const mergeTicket = useCallback((ticket) => {
    if (!ticket?.id) return;
    setTickets((prev) => prev.map((t) => (sameId(t.id, ticket.id) ? { ...t, ...ticket } : t)));
    setDetail((prev) => (prev && sameId(prev.id, ticket.id) ? { ...prev, ...ticket, mensajes: prev.mensajes } : prev));
  }, []);

  const onSocketEvent = useCallback((payload, evento) => {
    if (evento === 'ticket:nuevo') {
      fetchList(true);
      return;
    }
    if (evento === 'ticket:mensaje') {
      const { ticketId, mensaje } = payload || {};
      setDetail((prev) => {
        if (!prev || !sameId(prev.id, ticketId) || !mensaje) return prev;
        if ((prev.mensajes || []).some((m) => sameId(m.id, mensaje.id))) return prev;
        return { ...prev, estado: payload.estado || prev.estado, mensajes: [...(prev.mensajes || []), mensaje] };
      });
      fetchList(true);
      return;
    }
    if (evento === 'ticket:estado') {
      fetchList(true);
      setDetail((prev) => {
        if (!prev || !sameId(prev.id, payload?.id)) return prev;
        return { ...prev, estado: payload.estado, moderador: payload.moderador ?? prev.moderador, zona: payload.zona ?? prev.zona };
      });
    }
  }, [fetchList]);

  const estadoConexion = useConversationSocket({
    evento: EVENTOS_SOCKET,
    onEvento: onSocketEvent,
    onReconectar: () => { fetchList(true); if (selectedId) fetchDetail(selectedId, true); },
    authKey: myId,
  });

  const handleSend = async () => {
    const texto = draft.trim();
    if (!texto || !detail || sending) return;
    setSending(true);
    setSendError('');
    try {
      let body = { mensaje: texto };
      let config;
      if (file) {
        body = new FormData();
        body.append('mensaje', texto);
        body.append('file', file);
        config = { headers: { 'Content-Type': 'multipart/form-data' } };
      }
      const { data } = await api.sendMessage(detail.id, body, config);
      setDetail((prev) => {
        if (!prev) return prev;
        const yaEsta = (prev.mensajes || []).some((m) => sameId(m.id, data.id));
        return {
          ...prev,
          estado: data.ticketEstado || prev.estado,
          moderador: !prev.moderador && data.moderadorId && !isAdmin ? { id: myId, nombre: user?.nombre || 'Yo' } : prev.moderador,
          mensajes: yaEsta ? prev.mensajes : [...(prev.mensajes || []), data],
        };
      });
      setDraft('');
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      fetchList(true);
    } catch (err) {
      setSendError(errorMessage(err, 'No se pudo enviar la respuesta'));
    } finally {
      setSending(false);
    }
  };

  const runAction = async (fn, fallback) => {
    if (!detail || acting) return;
    setActing(true);
    setDetailError('');
    try {
      const { data } = await fn();
      mergeTicket(data);
      fetchList(true);
    } catch (err) {
      setDetailError(errorMessage(err, fallback));
    } finally {
      setActing(false);
    }
  };

  const handleTake = () => runAction(() => api.take(detail.id), 'No se pudo tomar el ticket');
  const handleStatus = (estado) => {
    if (!estado || estado === detail?.estado) return;
    runAction(() => api.setStatus(detail.id, estado), 'No se pudo cambiar el estado');
  };
  const handleAssign = (valor) => {
    const moderadorId = valor ? Number(valor) : null;
    runAction(() => api.assign(detail.id, moderadorId), 'No se pudo asignar el moderador');
  };

  const filterOptions = [
    { value: 'activos', label: 'Activos' },
    { value: 'abierto', label: 'Abiertos' },
    { value: 'en_proceso', label: 'En proceso' },
    { value: 'resuelto', label: 'Resueltos' },
    { value: 'cerrado', label: 'Cerrados' },
    { value: 'all', label: 'Todos' },
  ];

  const esMio = detail?.moderador && sameId(detail.moderador.id, myId);
  const cerrado = detail?.estado === 'cerrado';
  const puedeTomar = detail && !cerrado && !esMio && (isAdmin || !detail.moderador);
  const zonaLabel = detail?.zona ? zonaLabelFrom(zonas, detail.zona) : 'Sin zona';

  return (
    <div className={`tickets ${selectedId ? 'tickets--detail' : ''}`}>
      <div className="tickets__list">
        <div className="tickets__list-header">
          <h3 className="tickets__list-title">
            <LifeBuoy size={16} /> Tickets
            {meta.total > 0 && <span className="text-muted text-sm">({meta.total})</span>}
          </h3>
          <ConnectionDot estado={estadoConexion} />
        </div>

        <div className="tickets__list-filters">
          <SegmentedFilter options={filterOptions} value={filtroEstado} onChange={setFiltroEstado} ariaLabel="Filtrar por estado" />
          {isAdmin && (
            <Select aria-label="Filtrar por zona" value={filtroZona} onChange={(e) => setFiltroZona(e.target.value)}>
              <option value="">Todas las zonas</option>
              {zonas.map((z) => <option key={z.value} value={z.value}>{z.label}</option>)}
            </Select>
          )}
          <label className="tickets__mine">
            <input type="checkbox" checked={soloMios} onChange={(e) => setSoloMios(e.target.checked)} />
            Solo los que atiendo yo
          </label>
        </div>

        <div className="tickets__list-scroll">
          {loading && <p className="tickets__placeholder">Cargando tickets…</p>}
          {!loading && error && <p className="tickets__placeholder">{error}</p>}
          {!loading && !error && tickets.length === 0 && (
            <div className="tickets__placeholder">
              <LifeBuoy size={20} />
              <span>No hay tickets con este filtro</span>
            </div>
          )}
          {!loading && tickets.map((t) => (
            <TicketItem key={t.id} ticket={t} zonas={zonas} active={sameId(t.id, selectedId)} onSelect={(tk) => setSelectedId(tk.id)} />
          ))}
        </div>

        {meta.lastPage > 1 && (
          <div className="tickets__list-footer">
            <Pagination page={page} totalPages={meta.lastPage} total={meta.total} onChange={setPage} />
          </div>
        )}
      </div>

      <div className="tickets__detail">
        {!selectedId && (
          <div className="tickets__placeholder tickets__placeholder--center">
            <LifeBuoy size={24} />
            <span>Selecciona un ticket para ver el hilo</span>
          </div>
        )}

        {selectedId && detailLoading && <p className="tickets__placeholder tickets__placeholder--center">Cargando ticket…</p>}
        {selectedId && !detailLoading && !detail && detailError && (
          <p className="tickets__placeholder tickets__placeholder--center">{detailError}</p>
        )}

        {detail && (
          <>
            <div className="tickets__detail-header">
              <div className="tickets__detail-title">
                <Button size="icon" variant="ghost" className="tickets__back" onClick={() => setSelectedId(null)} aria-label="Volver a la lista">
                  <ArrowLeft size={16} />
                </Button>
                <h3 className="truncate">#{detail.id} · {detail.asunto}</h3>
              </div>
              <div className="tickets__detail-badges">
                <StatusBadge status={detail.estado} />
                <Badge>{CATEGORIAS_TICKET[detail.categoria] || detail.categoria}</Badge>
                <span className="text-sm text-muted"><MapPin size={12} /> {zonaLabel}</span>
                <span className="text-sm text-muted">Abierto {formatDateTime(detail.createdAt)}</span>
                {detail.moderador && (
                  <span className="text-sm text-muted">Atiende: <strong>{esMio ? 'Tú' : detail.moderador.nombre}</strong></span>
                )}
              </div>
              <div className="tickets__detail-actions">
                {puedeTomar && (
                  <Button size="sm" variant="soft-primary" icon={<Hand size={14} />} onClick={handleTake} loading={acting}>
                    {detail.moderador ? 'Tomar de todos modos' : 'Tomar ticket'}
                  </Button>
                )}
                <Select
                  label="Estado"
                  value={detail.estado}
                  disabled={acting}
                  onChange={(e) => handleStatus(e.target.value)}
                >
                  {ESTADOS_TICKET.map((e) => <option key={e} value={e}>{statusLabel(e)}</option>)}
                </Select>
                {isAdmin && (
                  <Select
                    label="Asignado a"
                    value={detail.moderador?.id ?? ''}
                    disabled={acting}
                    onChange={(e) => handleAssign(e.target.value)}
                  >
                    <option value="">Sin asignar</option>
                    {detail.moderador && !moderadores.some((m) => sameId(m.id, detail.moderador.id)) && (
                      <option value={detail.moderador.id}>{detail.moderador.nombre}</option>
                    )}
                    {moderadores.map((m) => <option key={m.id} value={m.id}>{m.nombre}{m.zona ? ` · ${zonaLabelFrom(zonas, m.zona)}` : ''}</option>)}
                  </Select>
                )}
              </div>
              {detailError && <div className="page-error" role="alert">{detailError}</div>}
            </div>

            <div className="tickets__detail-body">
              <div className="tickets__info">
                <div className="tickets__info-card">
                  <span><UserRound size={12} /> {ROL_USUARIO[detail.usuario?.rol] || 'Usuario'}</span>
                  <strong>{detail.usuario?.nombre || '—'}</strong>
                  {detail.usuario?.email && <span className="truncate">{detail.usuario.email}</span>}
                  {detail.usuario?.telefono && (
                    <a href={`tel:${detail.usuario.telefono}`}><Phone size={12} /> {detail.usuario.telefono}</a>
                  )}
                </div>
                {detail.viaje && (
                  <div className="tickets__info-card">
                    <span><Route size={12} /> Viaje #{detail.viaje.id} · {statusLabel(detail.viaje.estado)}</span>
                    <strong className="truncate">{detail.viaje.origenDireccion || '—'}</strong>
                    <span className="truncate">→ {detail.viaje.destinoDireccion || '—'}</span>
                  </div>
                )}
                {detail.adjunto && (
                  <div className="tickets__info-card">
                    <span><Paperclip size={12} /> Adjunto del ticket</span>
                    <Attachment path={detail.adjunto} label="Adjunto del ticket" />
                  </div>
                )}
              </div>

              <div className="tickets__messages">
                <Message
                  origen
                  message={{
                    id: `origen-${detail.id}`,
                    autor: detail.usuario,
                    rolAutor: 'usuario',
                    mensaje: detail.descripcion,
                    createdAt: detail.createdAt,
                  }}
                  isMe={false}
                />
                {(detail.mensajes || []).map((m) => (
                  <Message key={m.id} message={m} isMe={sameId(m.autor?.id, myId)} />
                ))}
                <div ref={endRef} />
              </div>
            </div>

            {sendError && <div className="tickets__send-error" role="alert">{sendError}</div>}

            {cerrado ? (
              <div className="tickets__closed">
                Este ticket está cerrado. Cambia el estado para volver a responder.
              </div>
            ) : (
              <form
                className="tickets__composer"
                aria-busy={sending ? 'true' : 'false'}
                onSubmit={(e) => { e.preventDefault(); handleSend(); }}
              >
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={`Responder a ${detail.usuario?.nombre || 'usuario'}… (máx. 2000)`}
                  maxLength={2000}
                  aria-label="Respuesta"
                  onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSend(); }}
                />
                <div className="tickets__composer-row">
                  <label className="tickets__file">
                    <ImagePlus size={14} />
                    {file ? file.name : 'Adjuntar imagen'}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/heic"
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                    />
                    {file && (
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        aria-label="Quitar adjunto"
                        onClick={(e) => { e.preventDefault(); setFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                      >
                        <X size={12} />
                      </Button>
                    )}
                  </label>
                  <Button type="submit" icon={<Send size={14} />} disabled={!draft.trim()} loading={sending}>
                    Responder
                  </Button>
                </div>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}
