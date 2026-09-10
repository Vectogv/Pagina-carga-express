import { Fragment, useState, useEffect, useRef } from 'react';
import {
  getConversations,
  getUnreadCount,
  getConversationMessages,
  createConversation,
  sendConversationMessage,
  getModeratorDrivers,
} from '../../api/moderator';
import { io } from 'socket.io-client';

const theme = {
  bg: '#020617',
  cards: '#0B1220',
  border: '#1E293B',
  text: '#F8FAFC',
  muted: '#94A3B8',
  accent: '#1F6FEB',
  success: '#22C55E',
  danger: '#EF4444',
};

// Contactos internos fijos (Admin + moderadores de otras ciudades).
// Mientras no exista endpoint de búsqueda, definir manualmente: id, nombre, ciudad/zona, rol.
// Agrega aquí los ids de otros moderadores cuando los conozcas.
const INTERNAL_CONTACTS = [
  { id: 1, nombre: 'Administrador', email: 'admin@cargaexpress.com', ciudad: 'Nacional', rol: 'admin', esModerador: false },
  { id: 72, nombre: 'Moderador Cali', email: 'moderador@gmail.com', ciudad: 'cali', rol: 'moderador', esModerador: true },
];

const getErrMsg = (err) =>
  err?.response?.data?.message || err?.response?.data?.error || err?.message || 'Error inesperado';

const getRolEtiqueta = (u) => {
  if (!u) return 'CLIENTE';
  if (u.esModerador) return 'MODERADOR';
  if (u.rol === 'admin' || u.role === 'admin') return 'ADMIN';
  if (u.rol === 'conductor') return 'CONDUCTOR';
  return 'CLIENTE';
};

const ROL_STYLE = {
  ADMIN: { background: 'rgba(239,68,68,0.15)', color: '#F87171' },
  MODERADOR: { background: 'rgba(245,158,11,0.16)', color: '#FBBF24' },
  CONDUCTOR: { background: 'rgba(139,92,246,0.16)', color: '#C084FC' },
  CLIENTE: { background: 'rgba(31,111,235,0.15)', color: '#60A5FA' },
};

const isSameDay = (a, b) => {
  const da = new Date(a), db = new Date(b);
  return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate();
};

const formatHora = (v) => (v ? new Date(v).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }) : '');
const formatDia = (v) => {
  const s = v ? new Date(v).toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' }) : '';
  return s.charAt(0).toUpperCase() + s.slice(1);
};

export default function ConversationsPage() {
  const [conversations, setConversations] = useState([]);
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msgLoading, setMsgLoading] = useState(false);
  const [nuevo, setNuevo] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState([]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sendError, setSendError] = useState('');
  const [createError, setCreateError] = useState('');
  const [creating, setCreating] = useState(false);
  const endRef = useRef(null);
  const selectedIdRef = useRef(null);
  const pendingRef = useRef(new Set());
  const sentIdsRef = useRef(new Set());
  const myId = (() => { try { return JSON.parse(localStorage.getItem('user') || '{}').id; } catch { /* silencioso */ } })();
  const myCity = (() => { try { return JSON.parse(localStorage.getItem('user') || '{}').zonaModerador || 'cali'; } catch { /* silencioso */ } return 'cali'; })();

  const sortByRecency = (list) =>
    list.sort((a, b) => new Date(b.updatedAt || b.ultimoMensajeAt) - new Date(a.updatedAt || a.ultimoMensajeAt));

  const touchConversation = (convId, mensaje, createdAt) => {
    setConversations((prev) =>
      sortByRecency(
        prev.map((c) =>
          String(c.id) === String(convId) ? { ...c, ultimoMensaje: mensaje, ultimoMensajeAt: createdAt, updatedAt: createdAt } : c,
        ),
      ),
    );
  };

  const fetchConversations = async () => {
    try {
      const res = await getConversations();
      const d = res.data;
      const list = Array.isArray(d) ? d : d.conversations || d.data || [];
      setConversations(sortByRecency(list));
    } catch { /* silencioso */ }
    finally { setLoading(false); }
  };

  const fetchUnread = async () => {
    try {
      const res = await getUnreadCount();
      setUnreadTotal(res.data.total ?? res.data.count ?? 0);
    } catch { /* silencioso */ }
  };

  useEffect(() => {
    fetchConversations();
    fetchUnread();
    const id = setInterval(fetchUnread, 60000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => { selectedIdRef.current = selected?.id ?? null; }, [selected]);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;
    const socket = io('https://bakend-cargaexpress-production.up.railway.app', { transports: ['websocket'], auth: { token: `Bearer ${token}` }, query: { token: `Bearer ${token}` } });
    socket.on('conversation:message', (data) => {
      const curId = selectedIdRef.current;
      const isMe = String(data.remitente?.id) === String(myId);
      if (String(data.conversacionId) === String(curId)) {
        const real = String(data.id);
        setMessages((prev) => {
          if (isMe) {
            if (sentIdsRef.current.has(real)) { sentIdsRef.current.delete(real); return prev; }
            const tmp = prev.find((m) => String(m.id).startsWith('tmp-') && m.remitente?.esModerador && m.mensaje === data.mensaje);
            if (tmp) return prev.map((m) => String(m.id) === String(tmp.id) ? data : m);
          }
          return prev.some((m) => String(m.id) === real) ? prev : [...prev, data];
        });
      } else {
        setConversations((prev) => {
          const item = prev.find((c) => String(c.id) === String(data.conversacionId));
          if (item) {
            return sortByRecency(
              prev.map((c) => String(c.id) === String(data.conversacionId)
                ? { ...c, ultimoMensaje: data.mensaje, ultimoMensajeAt: data.createdAt, updatedAt: data.createdAt, noLeidos: isMe ? (c.noLeidos || 0) : (c.noLeidos || 0) + 1 }
                : c),
            );
          }
          return sortByRecency([
            { id: data.conversacionId, usuario: data.remitente, ultimoMensaje: data.mensaje, ultimoMensajeAt: data.createdAt, updatedAt: data.createdAt, noLeidos: isMe ? 0 : 1 },
            ...prev,
          ]);
        });
        if (!isMe) fetchUnread();
      }
    });
    return () => socket.disconnect();
  }, [myId]);

  useEffect(() => { if (endRef.current) endRef.current.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const openConversation = async (conv) => {
    setSelected(conv);
    setMobileOpen(true);
    setSendError('');
    setMsgLoading(true);
    try {
      const res = await getConversationMessages(conv.id);
      const d = res.data;
      setMessages(Array.isArray(d) ? d : d.messages || d.data || []);
      setConversations((prev) => prev.map((c) => String(c.id) === String(conv.id) ? { ...c, noLeidos: 0 } : c));
      fetchUnread();
    } catch { /* silencioso */ } finally { setMsgLoading(false); }
  };

  const handleSend = async () => {
    const text = nuevo.trim();
    if (!text || enviando || !selected) return;
    const tempId = `tmp-${Date.now()}`;
    setNuevo('');
    setSendError('');
    setEnviando(true);
    pendingRef.current.add(tempId);
    setMessages((prev) => [
      ...prev,
      { id: tempId, mensaje: text, createdAt: new Date().toISOString(), leido: false, remitente: { id: myId, nombre: 'Tú', rol: 'moderador', esModerador: true } },
    ]);
    try {
      const res = await sendConversationMessage(selected.id, { mensaje: text });
      const msg = res.data;
      pendingRef.current.delete(tempId);
      sentIdsRef.current.add(String(msg.id));
      setMessages((prev) => prev.map((m) => String(m.id) === tempId ? msg : m));
      touchConversation(selected.id, msg.mensaje, msg.createdAt);
    } catch (err) {
      pendingRef.current.delete(tempId);
      setMessages((prev) => prev.filter((m) => String(m.id) !== tempId));
      setNuevo(text);
      setSendError(getErrMsg(err));
    } finally { setEnviando(false); }
  };

  const handleCreate = async (usuarioId, viajeId) => {
    setCreateError('');
    setCreating(true);
    try {
      const res = await createConversation({ usuarioId, viajeId, ciudad: myCity });
      const conv = res.data;
      setConversations((prev) => prev.some((c) => String(c.id) === String(conv.id)) ? prev : [conv, ...prev]);
      setShowNew(false);
      openConversation(conv);
    } catch (err) {
      setCreateError(getErrMsg(err));
    } finally { setCreating(false); }
  };

  const openNewModal = async () => {
    setCreateError('');
    setSearch('');
    setShowNew(true);
    try {
      const res = await getModeratorDrivers({ page: 1, limit: 50 });
      const d = res.data;
      setUsers(Array.isArray(d) ? d.slice(0, 20) : []);
    } catch { /* silencioso */ }
  };

  const formatFechaSalida = (v) => v ? new Intl.DateTimeFormat('es-CO', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(v)) : '-';

  const internalContacts = INTERNAL_CONTACTS.filter((c) => String(c.id) !== String(myId));
  const q = search.toLowerCase();
  const filteredInternal = internalContacts.filter((c) => !q || `${c.nombre} ${c.email} ${c.ciudad} ${c.rol}`.toLowerCase().includes(q));
  const filteredPlatform = users
    .filter((u) => {
      const uo = u.usuario || u;
      return !q || `${uo.nombre || ''} ${uo.email || ''} ${uo.ciudad || ''}`.toLowerCase().includes(q);
    })
    .slice(0, 10);

  const contactoSeleccionado = selected?.usuario || selected;
  const etiquetaSeleccion = getRolEtiqueta(contactoSeleccionado);

  const renderContactoRow = (icono, nombre, subtitulo, etiqueta, onClick, disabled) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8, background: theme.bg, border: `1px solid ${theme.border}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        <span style={{ fontSize: 16, flexShrink: 0 }}>{icono}</span>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: theme.text, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{nombre}</p>
          <p style={{ fontSize: 11, color: theme.muted, margin: 0 }}>{subtitulo}</p>
        </div>
        <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4, ...ROL_STYLE[etiqueta] }}>{etiqueta}</span>
      </div>
      <button onClick={onClick} disabled={disabled} style={{ padding: '4px 10px', borderRadius: 6, border: 'none', background: disabled ? '#334155' : theme.accent, color: '#fff', fontSize: 11, cursor: disabled ? 'not-allowed' : 'pointer' }}>
        {disabled ? '…' : 'Crear'}
      </button>
    </div>
  );

  return (
    <div style={{ display: 'flex', maxHeight: 560, height: 560, maxWidth: 900, margin: '0 auto', width: '100%', background: theme.cards, border: `1px solid ${theme.border}`, borderRadius: 12, overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}>
      {/* Inbox - izquierda */}
      <div style={{ width: 280, borderRight: `1px solid ${theme.border}`, display: 'flex', flexDirection: 'column', background: '#0d1117' }} className="inbox-panel">
        <div style={{ padding: 12, borderBottom: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: theme.text, margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
            Conversaciones
            {unreadTotal > 0 && <span style={{ background: theme.danger, color: '#fff', padding: '2px 7px', borderRadius: 10, fontSize: 10, fontWeight: 700 }}>{unreadTotal}</span>}
          </h3>
          <button onClick={openNewModal} aria-label="Nueva conversación" style={{ width: 28, height: 28, borderRadius: '50%', border: 'none', background: theme.accent, color: '#fff', fontSize: 16, cursor: 'pointer' }}>+</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <p style={{ padding: 16, color: theme.muted, fontSize: 12, textAlign: 'center' }}>Cargando...</p>
          ) : conversations.length === 0 ? (
            <p style={{ padding: 16, color: theme.muted, fontSize: 12, textAlign: 'center' }}>Sin conversaciones</p>
          ) : conversations.map((c) => {
            const u = c.usuario || c;
            const etiqueta = getRolEtiqueta(u);
            const estilo = ROL_STYLE[etiqueta];
            const subtitulo = u.esModerador ? (u.zonaModerador || u.ciudad || 'Moderador') : (u.ciudad || '');
            return (
              <div key={c.id} onClick={() => openConversation(c)} style={{ padding: '10px 12px', borderBottom: `1px solid ${theme.border}`, cursor: 'pointer', background: String(selected?.id) === String(c.id) ? 'rgba(255,255,255,0.06)' : 'transparent', borderLeft: String(selected?.id) === String(c.id) ? `2px solid ${theme.accent}` : '2px solid transparent', display: 'flex', gap: 10, alignItems: 'center' }}>
                <img src={c.avatar || `https://i.pravatar.cc/40?u=${u.email || c.id}`} alt="" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: theme.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.nombre || c.nombre || 'Usuario'}</span>
                    <span style={{ fontSize: 10, color: theme.muted, flexShrink: 0 }}>{formatHora(c.ultimoMensajeAt)}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center', marginTop: 2, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 4, ...estilo }}>{etiqueta}</span>
                    {subtitulo && <span style={{ fontSize: 10, color: theme.muted }}>📍 {subtitulo}</span>}
                    {(c.fechaSalida || c.viaje?.fechaSalida || c.createdAt) && <span style={{ fontSize: 10, color: theme.accent, background: 'rgba(245,158,11,0.1)', padding: '1px 4px', borderRadius: 4 }}>📅 {formatFechaSalida(c.fechaSalida || c.viaje?.fechaSalida || c.createdAt)}</span>}
                  </div>
                  <p style={{ fontSize: 12, color: theme.muted, margin: '4px 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.ultimoMensaje || 'Sin mensajes'}</p>
                </div>
                {c.noLeidos > 0 && <span style={{ background: theme.danger, color: '#fff', minWidth: 18, height: 18, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, padding: '0 4px' }}>{c.noLeidos}</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Hilo - derecha */}
      <div className="thread-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#0d1117' }}>
        {!selected ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: theme.muted, fontSize: 13, gap: 6 }}>
            <span style={{ fontSize: 28 }}>💬</span>
            <span>Selecciona una conversación</span>
          </div>
        ) : (
          <>
            <div style={{ padding: '10px 14px', borderBottom: `1px solid ${theme.border}`, display: 'flex', alignItems: 'center', gap: 10, background: theme.cards, flexWrap: 'wrap' }}>
              <button onClick={() => setMobileOpen(false)} className="mobile-back" style={{ display: 'none', padding: '6px 10px', borderRadius: 6, border: `1px solid ${theme.border}`, background: 'transparent', color: theme.muted, cursor: 'pointer' }}>← Volver</button>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: theme.text }}>{contactoSeleccionado?.nombre || selected.nombre || 'Chat'}</span>
                  <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4, ...ROL_STYLE[etiquetaSeleccion] }}>{etiquetaSeleccion}</span>
                </div>
                <span style={{ fontSize: 11, color: theme.muted }}>
                  {contactoSeleccionado?.esModerador ? (contactoSeleccionado.zonaModerador || contactoSeleccionado.ciudad || '') : (contactoSeleccionado?.email || contactoSeleccionado?.ciudad || '')}
                </span>
              </div>
              {(selected.fechaSalida || selected.viaje?.fechaSalida || selected.createdAt) && <span style={{ fontSize: 11, color: theme.accent, background: 'rgba(245,158,11,0.12)', padding: '2px 6px', borderRadius: 10, fontWeight: 600 }}>📅 Salida: {formatFechaSalida(selected.fechaSalida || selected.viaje?.fechaSalida || selected.createdAt)}</span>}
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {msgLoading ? <p style={{ textAlign: 'center', color: theme.muted, fontSize: 12 }}>Cargando mensajes...</p> : messages.length === 0 ? <p style={{ textAlign: 'center', color: theme.muted, fontSize: 12, fontStyle: 'italic' }}>Sin mensajes aún. Saluda al conductor o cliente…</p> : messages.map((m, i) => {
                const isMe = String(m.remitente?.id) === String(myId) || !!m.remitente?.esModerador;
                const prev = messages[i - 1];
                const showDay = !prev || !isSameDay(m.createdAt, prev.createdAt);
                const e = getRolEtiqueta(m.remitente);
                const esOtroDia = !isSameDay(m.createdAt, new Date());
                return (
                  <Fragment key={m.id}>
                    {showDay && (
                      <div style={{ alignSelf: 'center', fontSize: 10, fontWeight: 700, color: theme.muted, background: '#21262d', padding: '3px 10px', borderRadius: 10 }}>
                        {formatDia(m.createdAt)}
                      </div>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                      {!isMe && (
                        <div style={{ display: 'flex', gap: 6, fontSize: 10, color: theme.muted, marginBottom: 2, alignItems: 'center' }}>
                          <span style={{ fontWeight: 600, color: theme.text }}>{m.remitente?.nombre || 'Usuario'}</span>
                          <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 4, ...ROL_STYLE[e] }}>{e}</span>
                          {m.remitente?.esModerador && m.remitente.zonaModerador && <span style={{ color: theme.accent }}>{m.remitente.zonaModerador}</span>}
                        </div>
                      )}
                      <div style={{ maxWidth: '70%', padding: '8px 12px', borderRadius: isMe ? '12px 12px 2px 12px' : '12px 12px 12px 2px', background: isMe ? theme.accent : '#21262d', color: '#fff', fontSize: 13, wordBreak: 'break-word' }}>
                        <span style={{ color: isMe ? 'rgba(255,255,255,0.85)' : theme.text }}>{m.mensaje}</span>
                        <span style={{ display: 'block', textAlign: 'right', fontSize: 10, color: isMe ? 'rgba(255,255,255,0.65)' : theme.muted, marginTop: 2 }}>
                          {formatHora(m.createdAt)}
                          {esOtroDia && <> · {new Date(m.createdAt).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}</>}
                          {' '}{isMe && (m.leido || String(m.id).startsWith('tmp-') ? '✓✓' : '✓')}
                        </span>
                      </div>
                    </div>
                  </Fragment>
                );
              })}
              <div ref={endRef} />
            </div>
            {sendError && (
              <div style={{ padding: '8px 12px', background: 'rgba(239,68,68,0.12)', borderTop: '1px solid rgba(239,68,68,0.25)', color: '#F87171', fontSize: 12 }}>
                {sendError}
              </div>
            )}
            <div style={{ padding: 10, borderTop: `1px solid ${theme.border}`, display: 'flex', gap: 8, background: theme.cards }}>
              <input value={nuevo} onChange={(e) => setNuevo(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSend(); } }} placeholder="Escribe un mensaje... (max 500)" maxLength={500} style={{ flex: 1, padding: '8px 12px', borderRadius: 20, border: `1px solid ${theme.border}`, background: '#0d1117', color: theme.text, fontSize: 13 }} />
              <button onClick={handleSend} disabled={!nuevo.trim() || enviando} style={{ padding: '8px 14px', borderRadius: 20, border: 'none', background: !nuevo.trim() || enviando ? '#30363d' : theme.accent, color: '#fff', fontWeight: 600, cursor: !nuevo.trim() || enviando ? 'not-allowed' : 'pointer' }}>➤</button>
            </div>
          </>
        )}
      </div>

      {/* Modal nueva conversación */}
      {showNew && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }} onClick={() => { if (!creating) setShowNew(false); }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: theme.cards, border: `1px solid ${theme.border}`, borderRadius: 12, padding: 16, width: '92%', maxWidth: 440, maxHeight: '80vh', overflowY: 'auto' }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: theme.text, margin: '0 0 4px' }}>Nueva conversación</h3>
            <p style={{ fontSize: 11, color: theme.muted, margin: '0 0 10px' }}>Conductores, clientes, admin o moderadores de otras ciudades.</p>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar contacto..." style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: `1px solid ${theme.border}`, background: theme.bg, color: theme.text, fontSize: 12, marginBottom: 10, boxSizing: 'border-box' }} />
            {createError && (
              <div style={{ padding: '8px 10px', borderRadius: 8, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', color: '#F87171', fontSize: 12, marginBottom: 10 }}>
                {createError}
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 320, overflowY: 'auto' }}>
              {filteredInternal.length > 0 && (
                <>
                  <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: theme.muted, margin: '4px 0 0' }}>Internos</p>
                  {filteredInternal.map((c) => renderContactoRow(
                    c.esModerador ? '🛡️' : '🛡️',
                    c.nombre,
                    `${c.email} · ${c.ciudad}`,
                    c.esModerador ? 'MODERADOR' : 'ADMIN',
                    () => handleCreate(c.id, undefined),
                    creating,
                  ))}
                </>
              )}
              {filteredPlatform.length > 0 && (
                <>
                  <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: theme.muted, margin: '4px 0 0' }}>Usuarios</p>
                  {filteredPlatform.map((u) => {
                    const uo = u.usuario || u;
                    return renderContactoRow(
                      uo.rol === 'conductor' ? '🚚' : '👤',
                      `${uo.nombre || ''} ${uo.apellido || ''}`.trim() || 'Usuario',
                      `${uo.email || ''} • ${uo.ciudad || '-'}`,
                      getRolEtiqueta(uo),
                      () => handleCreate(uo.id || u.id, u.viajeId),
                      creating,
                    );
                  })}
                </>
              )}
              {filteredInternal.length === 0 && filteredPlatform.length === 0 && (
                <p style={{ fontSize: 12, color: theme.muted, textAlign: 'center', padding: '16px 0' }}>Sin resultados para "{search}"</p>
              )}
            </div>
            <button onClick={() => { if (!creating) setShowNew(false); }} style={{ marginTop: 10, width: '100%', padding: '8px', borderRadius: 8, border: `1px solid ${theme.border}`, background: 'transparent', color: theme.muted, cursor: 'pointer' }}>Cerrar</button>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .inbox-panel { width: 100% !important; }
          .mobile-back { display: block !important; }
          ${mobileOpen ? '.inbox-panel { display: none !important; }' : '.thread-panel { display: none !important; }'}
        }
        .mobile-back { display: none; }
      `}</style>
    </div>
  );
}