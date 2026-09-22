import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import {
  getConversations,
  getUnreadCount,
  getConversationMessages,
  createConversation,
  sendConversationMessage,
} from '../../api/moderator';
import { tokenStore } from '../../api/axios';
import { SOCKET_URL } from '../../config';
import { useAuth } from '../../contexts/AuthContext';
import { errorMessage, toList } from '../../utils/format';
import ConversationList from './ConversationList';
import ConversationThread from './ConversationThread';
import NewConversationModal from './NewConversationModal';
import { isStaff, sortByRecency, toContactList } from './conversationUtils';
import './ConversationsBoard.css';

const DEFAULT_API = {
  getConversations,
  getUnreadCount,
  getConversationMessages,
  createConversation,
  sendMessage: sendConversationMessage,
};

const noop = () => {};

/**
 * Conversatorio: lista de conversaciones (izquierda) + hilo (derecha).
 * En móvil muestra un solo panel a la vez.
 *
 * Props:
 * - getContacts(): promesa con los usuarios contactables (debe ser una referencia estable).
 * - onOpenConversation(id|null): avisa qué conversación está abierta (para badges).
 * - createCity(contact, myCity): ciudad a enviar al crear una conversación.
 * - defaultCity: ciudad a usar si el usuario no tiene zonaModerador.
 * - api: permite sustituir los endpoints (por defecto los del moderador).
 */
export default function ConversationsBoard({ getContacts, onOpenConversation, createCity, defaultCity, api = DEFAULT_API }) {
  const {
    getConversations: fetchConvs,
    getUnreadCount: fetchUnreadCount,
    getConversationMessages: fetchMsgs,
    createConversation: apiCreateConv,
    sendMessage: apiSendMsg,
  } = api;
  const { user } = useAuth();
  const myId = user?.id;
  // Sin zona definida no se inventa una: el backend usa la zonaModerador del usuario.
  const myCity = user?.zonaModerador || defaultCity || undefined;

  const [conversations, setConversations] = useState([]);
  const [contactMap, setContactMap] = useState({});
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
  const selectedIdRef = useRef(null);
  const sentIdsRef = useRef(new Set());
  const autoOpenedRef = useRef(false);

  // En los endpoints del moderador, `usuario` es el otro participante.
  // En /api/conversations (admin), `usuario` es quien consulta y el otro participante
  // llega como nombre en `moderador`. Normaliza al "otro" en ambos casos.
  const other = useCallback((c) => {
    const u = c?.usuario || c;
    if (u && myId != null && String(u.id) === String(myId)) {
      const nombre = c?.moderador || c?.otro?.nombre || c?.otroUsuario?.nombre || 'Usuario';
      return {
        id: c?.moderadorId ?? u.id,
        nombre,
        rol: c?.moderador ? 'moderador' : (u.rol || 'cliente'),
        esModerador: Boolean(c?.moderador || u.esModerador),
        ciudad: c?.ciudad || '',
        email: c?.moderadorEmail || '',
      };
    }
    // La lista de conversaciones no trae esModerador en `usuario`; lo completamos con contactable-users.
    const cm = u?.id != null ? contactMap[String(u.id)] : null;
    if (cm) {
      return {
        ...u,
        esModerador: cm.esModerador || u.esModerador || false,
        zonaModerador: cm.zonaModerador || u.zonaModerador,
        ciudad: cm.ciudad || cm.zonaModerador || u.ciudad || '',
      };
    }
    return u;
  }, [contactMap, myId]);

  const canCreate = typeof apiCreateConv === 'function';

  const touchConversation = (convId, mensaje, createdAt) => {
    setConversations((prev) => sortByRecency(
      prev.map((c) => (String(c.id) === String(convId)
        ? { ...c, ultimoMensaje: mensaje, ultimoMensajeAt: createdAt, updatedAt: createdAt }
        : c)),
    ));
  };

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetchConvs({ limit: 100 });
      const d = res.data;
      const list = d && !Array.isArray(d) && d.id ? [d] : toList(d, 'conversations');
      setConversations(sortByRecency(list));
    } catch {
      // Silencioso: la lista queda vacía y se muestra "Sin conversaciones".
    } finally {
      setLoading(false);
    }
  }, [fetchConvs]);

  const fetchContactsMap = useCallback(async () => {
    try {
      const res = await getContacts();
      const m = {};
      toContactList(res?.data ?? res).forEach((u) => { if (u?.id != null) m[String(u.id)] = u; });
      setContactMap(m);
    } catch {
      // Silencioso: el mapa solo completa etiquetas de rol/ciudad.
    }
  }, [getContacts]);

  const fetchUnread = useCallback(async () => {
    try {
      const res = await fetchUnreadCount();
      setUnreadTotal(res.data.total ?? res.data.count ?? 0);
    } catch {
      // Silencioso: el contador es informativo y se reintenta en el siguiente polling.
    }
  }, [fetchUnreadCount]);

  const openConversation = useCallback(async (conv) => {
    setSelected(conv);
    setMobileOpen(true);
    setSendError('');
    setMsgLoading(true);
    try {
      const res = await fetchMsgs(conv.id);
      setMessages(toList(res.data, 'messages'));
      setConversations((prev) => prev.map((c) => (String(c.id) === String(conv.id) ? { ...c, noLeidos: 0 } : c)));
      fetchUnread();
    } catch {
      // Silencioso: el hilo queda vacío; el usuario puede reintentar abriéndolo de nuevo.
    } finally {
      setMsgLoading(false);
    }
  }, [fetchMsgs, fetchUnread]);

  useEffect(() => {
    fetchConversations();
    fetchUnread();
    fetchContactsMap();
    const id = setInterval(fetchUnread, 60000);
    return () => clearInterval(id);
  }, [fetchConversations, fetchUnread, fetchContactsMap]);

  useEffect(() => { selectedIdRef.current = selected?.id ?? null; }, [selected]);

  useEffect(() => { (onOpenConversation || noop)(selected?.id ?? null); }, [selected, onOpenConversation]);

  // Al cargar, abre automáticamente la conversación no leída más reciente.
  useEffect(() => {
    if (loading || autoOpenedRef.current) return;
    if (selected) { autoOpenedRef.current = true; return; }
    const unread = sortByRecency(conversations.filter((c) => (c.noLeidos || 0) > 0));
    if (unread.length > 0) { autoOpenedRef.current = true; openConversation(unread[0]); }
  }, [conversations, loading, selected, openConversation]);

  useEffect(() => {
    const token = tokenStore.access;
    if (!token) return undefined;
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      auth: { token: `Bearer ${token}` },
      // El servidor de producción aún lee el token desde el query del handshake.
      query: { token: `Bearer ${token}` },
    });
    socket.on('conversation:message', (data) => {
      const curId = selectedIdRef.current;
      const isMe = String(data.remitente?.id) === String(myId);
      if (String(data.conversacionId) === String(curId)) {
        const real = String(data.id);
        setMessages((prev) => {
          if (isMe) {
            if (sentIdsRef.current.has(real)) { sentIdsRef.current.delete(real); return prev; }
            const tmp = prev.find((m) => String(m.id).startsWith('tmp-') && m.remitente?.esModerador && m.mensaje === data.mensaje);
            if (tmp) return prev.map((m) => (String(m.id) === String(tmp.id) ? data : m));
          }
          return prev.some((m) => String(m.id) === real) ? prev : [...prev, data];
        });
      } else {
        setConversations((prev) => {
          const item = prev.find((c) => String(c.id) === String(data.conversacionId));
          if (item) {
            return sortByRecency(prev.map((c) => (String(c.id) === String(data.conversacionId)
              ? {
                ...c,
                ultimoMensaje: data.mensaje,
                ultimoMensajeAt: data.createdAt,
                updatedAt: data.createdAt,
                noLeidos: isMe ? (c.noLeidos || 0) : (c.noLeidos || 0) + 1,
              }
              : c)));
          }
          return sortByRecency([
            { id: data.conversacionId, usuario: data.remitente, ultimoMensaje: data.mensaje, ultimoMensajeAt: data.createdAt, updatedAt: data.createdAt, noLeidos: isMe ? 0 : 1 },
            ...prev,
          ]);
        });
        if (!isMe) fetchUnread();
      }
    });
    return () => { socket.disconnect(); };
  }, [myId, fetchUnread]);

  const handleSend = async () => {
    const text = nuevo.trim();
    if (!text || enviando || !selected) return;
    const tempId = `tmp-${Date.now()}`;
    setNuevo('');
    setSendError('');
    setEnviando(true);
    setMessages((prev) => [
      ...prev,
      { id: tempId, mensaje: text, createdAt: new Date().toISOString(), leido: false, remitente: { id: myId, nombre: 'Tú', rol: 'moderador', esModerador: true } },
    ]);
    try {
      const res = await apiSendMsg(selected.id, { mensaje: text });
      const msg = res.data;
      sentIdsRef.current.add(String(msg.id));
      setMessages((prev) => prev.map((m) => (String(m.id) === tempId ? msg : m)));
      touchConversation(selected.id, msg.mensaje, msg.createdAt);
    } catch (err) {
      setMessages((prev) => prev.filter((m) => String(m.id) !== tempId));
      setNuevo(text);
      setSendError(errorMessage(err, 'No se pudo enviar el mensaje'));
    } finally {
      setEnviando(false);
    }
  };

  const handleCreate = async (contact, viajeId) => {
    if (!apiCreateConv) {
      setCreateError('Este panel solo responde conversaciones; los moderadores deben iniciar el chat contigo.');
      return;
    }
    const contactId = contact?.id ?? contact?.usuario?.id;
    if (!contactId) { setCreateError('Contacto sin identificador'); return; }
    setCreateError('');
    setCreating(true);
    try {
      const ciudad = (createCity ? createCity(contact, myCity) : myCity) || undefined;
      const res = await apiCreateConv({ usuarioId: contactId, viajeId, ciudad });
      const conv = res.data;
      setConversations((prev) => (prev.some((c) => String(c.id) === String(conv.id)) ? prev : [conv, ...prev]));
      setShowNew(false);
      openConversation(conv);
    } catch (err) {
      setCreateError(errorMessage(err, 'No se pudo crear la conversación'));
    } finally {
      setCreating(false);
    }
  };

  const openNewModal = () => {
    setCreateError('');
    setSearch('');
    setShowNew(true);
  };

  // Búsqueda en el servidor (con debounce) mientras el modal está abierto.
  useEffect(() => {
    if (!showNew) return undefined;
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const res = await getContacts(search.trim());
        if (!cancelled) setUsers(toContactList(res?.data ?? res));
      } catch {
        if (!cancelled) setUsers([]);
      }
    }, search ? 300 : 0);
    return () => { cancelled = true; clearTimeout(t); };
  }, [showNew, search, getContacts]);

  const contacts = users.filter((u) => String((u.usuario || u).id) !== String(myId));
  const filteredInternal = contacts.filter((u) => isStaff(u.usuario || u)).slice(0, 20);
  const filteredPlatform = contacts.filter((u) => !isStaff(u.usuario || u)).slice(0, 20);

  return (
    <div className={`chat ${mobileOpen && selected ? 'chat--thread-open' : ''}`}>
      <ConversationList
        conversations={conversations}
        loading={loading}
        selectedId={selected?.id}
        unreadTotal={unreadTotal}
        canCreate={canCreate}
        other={other}
        onSelect={openConversation}
        onNew={openNewModal}
      />

      <ConversationThread
        conversation={selected}
        contact={selected ? other(selected) : null}
        messages={messages}
        loading={msgLoading}
        myId={myId}
        draft={nuevo}
        onDraftChange={setNuevo}
        onSend={handleSend}
        sending={enviando}
        sendError={sendError}
        onBack={() => setMobileOpen(false)}
      />

      <NewConversationModal
        isOpen={showNew}
        onClose={() => setShowNew(false)}
        search={search}
        onSearchChange={setSearch}
        internal={filteredInternal}
        platform={filteredPlatform}
        error={createError}
        creating={creating}
        onCreate={handleCreate}
      />
    </div>
  );
}
