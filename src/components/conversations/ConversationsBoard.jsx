import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  getConversations,
  getUnreadCount,
  getConversationMessages,
  createConversation,
  sendConversationMessage,
} from '../../api/moderator';
import { useAuth } from '../../contexts/AuthContext';
import { errorMessage, toList } from '../../utils/format';
import useConversationSocket from '../../hooks/useConversationSocket';
import ConversationList from './ConversationList';
import ConversationThread from './ConversationThread';
import NewConversationModal from './NewConversationModal';
import {
  esTemporal,
  fullNameOf,
  isStaff,
  mergeMensaje,
  normalizarNombre,
  ordenarPorFecha,
  reemplazarOptimista,
  sameId,
  sortByRecency,
  toContactList,
} from './conversationUtils';
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
 * Tiempo real: un único socket (useConversationSocket) escucha
 * 'conversation:message'. El envío es por HTTP POST y el 201 es el acuse de
 * recibo; la conciliación entre el mensaje optimista, la respuesta HTTP y el
 * evento de socket se hace siempre por id real.
 *
 * Props:
 * - getContacts(q): promesa con los usuarios contactables (referencia estable).
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
  const [selectedId, setSelectedId] = useState(null);
  // Caché de mensajes por conversación: al cambiar y volver no se pierden ni se
  // mezclan con los de otra conversación.
  const [messagesByConv, setMessagesByConv] = useState({});
  const [loading, setLoading] = useState(true);
  const [msgLoading, setMsgLoading] = useState(false);
  const [msgError, setMsgError] = useState('');
  const [nuevo, setNuevo] = useState('');
  // Nº de envíos en vuelo: el compositor no se bloquea por uno lento.
  const [enviando, setEnviando] = useState(0);
  const [showNew, setShowNew] = useState(false);
  const [search, setSearch] = useState('');
  const [buscandoContactos, setBuscandoContactos] = useState(false);
  const [users, setUsers] = useState([]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sendError, setSendError] = useState('');
  const [createError, setCreateError] = useState('');
  const [creating, setCreating] = useState(false);

  const selectedIdRef = useRef(null);
  const conversationsRef = useRef([]);
  // tmpId → { convId, texto, realId }: mensajes propios a la espera del id real.
  const pendientesRef = useRef(new Map());
  // convId → nº de mensajes recibidos por socket y aún sin abrir. El backend no
  // cuenta como "no leídas" las conversaciones en las que el moderador es el
  // usuario (solo las que él inició), así que el conteo local hace de piso para
  // no perder el aviso al refrescar la lista.
  const noLeidosLocalRef = useRef(new Map());
  const peticionRef = useRef(0);
  const contadorTmpRef = useRef(0);
  const autoOpenedRef = useRef(false);
  const timersRef = useRef({});

  /** Reprograma una tarea diferida por clave (evita ráfagas de peticiones). */
  const programar = useCallback((clave, fn, ms) => {
    const timers = timersRef.current;
    if (timers[clave]) clearTimeout(timers[clave]);
    timers[clave] = setTimeout(() => { timers[clave] = null; fn(); }, ms);
  }, []);

  useEffect(() => {
    const timers = timersRef.current;
    return () => { Object.values(timers).forEach((t) => t && clearTimeout(t)); };
  }, []);

  useEffect(() => { conversationsRef.current = conversations; }, [conversations]);
  useEffect(() => { selectedIdRef.current = selectedId; }, [selectedId]);

  // En los endpoints del moderador, `usuario` es el otro participante.
  // En /api/conversations (admin), `usuario` es quien consulta y el otro participante
  // llega como nombre en `moderador`. Normaliza al "otro" en ambos casos.
  const other = useCallback((c) => {
    const u = c?.usuario || c;
    if (u && myId != null && sameId(u.id, myId)) {
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

  const touchConversation = useCallback((convId, mensaje, createdAt) => {
    setConversations((prev) => sortByRecency(
      prev.map((c) => (sameId(c.id, convId)
        ? { ...c, ultimoMensaje: mensaje, ultimoMensajeAt: createdAt, updatedAt: createdAt }
        : c)),
    ));
  }, []);

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetchConvs({ limit: 100 });
      const d = res.data;
      const list = d && !Array.isArray(d) && d.id ? [d] : toList(d, 'conversations');
      const locales = noLeidosLocalRef.current;
      setConversations(sortByRecency(list.map((c) => {
        const local = locales.get(String(c.id)) || 0;
        return local > (c.noLeidos || 0) ? { ...c, noLeidos: local } : c;
      })));
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

  /**
   * Carga los mensajes de una conversación. El endpoint también marca como
   * leídos los mensajes del otro participante, así que sirve para el acuse de
   * lectura cuando llega un mensaje con el hilo abierto.
   * Descarta respuestas obsoletas (petición vieja o cambio de conversación).
   */
  const cargarMensajes = useCallback(async (convId, { mostrarCarga = true } = {}) => {
    if (convId == null) return;
    const key = String(convId);
    const ticket = peticionRef.current + 1;
    peticionRef.current = ticket;
    if (mostrarCarga) { setMsgLoading(true); setMsgError(''); }
    try {
      const res = await fetchMsgs(convId);
      if (ticket !== peticionRef.current || !sameId(convId, selectedIdRef.current)) return;
      // El endpoint ya marcó como leídos los mensajes del otro participante.
      noLeidosLocalRef.current.delete(key);
      const delServidor = ordenarPorFecha(toList(res.data, 'messages'));
      const idsServidor = new Set(delServidor.map((m) => String(m.id)));
      setMessagesByConv((prev) => {
        // Conserva los optimistas que el servidor todavía no conoce (enviando o fallidos).
        const conservados = (prev[key] || []).filter((m) => {
          if (!esTemporal(m.id)) return false;
          const p = pendientesRef.current.get(String(m.id));
          return !(p?.realId && idsServidor.has(String(p.realId)));
        });
        return { ...prev, [key]: ordenarPorFecha([...delServidor, ...conservados]) };
      });
      setConversations((prev) => prev.map((c) => (sameId(c.id, convId) ? { ...c, noLeidos: 0 } : c)));
      fetchUnread();
    } catch (err) {
      if (ticket !== peticionRef.current || !sameId(convId, selectedIdRef.current)) return;
      if (mostrarCarga) setMsgError(errorMessage(err, 'No se pudieron cargar los mensajes'));
    } finally {
      if (ticket === peticionRef.current && mostrarCarga) setMsgLoading(false);
    }
  }, [fetchMsgs, fetchUnread]);

  const openConversation = useCallback((conv) => {
    const convId = conv?.id;
    if (convId == null) return;
    // La conversación puede venir de "Nueva conversación" y no estar en la lista.
    setConversations((prev) => (prev.some((c) => sameId(c.id, convId)) ? prev : sortByRecency([conv, ...prev])));
    setSelectedId(convId);
    selectedIdRef.current = convId; // inmediato: el socket no espera al render
    setMobileOpen(true);
    setSendError('');
    setMsgError('');
    cargarMensajes(convId, { mostrarCarga: true });
  }, [cargarMensajes]);

  useEffect(() => {
    fetchConversations();
    fetchUnread();
    fetchContactsMap();
    const id = setInterval(fetchUnread, 60000);
    return () => clearInterval(id);
  }, [fetchConversations, fetchUnread, fetchContactsMap]);

  useEffect(() => { (onOpenConversation || noop)(selectedId ?? null); }, [selectedId, onOpenConversation]);

  const selected = useMemo(
    () => (selectedId == null ? null : conversations.find((c) => sameId(c.id, selectedId)) || null),
    [conversations, selectedId],
  );

  // El total del servidor no incluye las conversaciones donde el moderador es el
  // usuario; el mayor de los dos evita que el badge se quede corto.
  const totalNoLeidas = useMemo(
    () => Math.max(unreadTotal, conversations.reduce((s, c) => s + (c.noLeidos || 0), 0)),
    [unreadTotal, conversations],
  );

  const messages = useMemo(
    () => (selectedId == null ? [] : messagesByConv[String(selectedId)] || []),
    [messagesByConv, selectedId],
  );

  // Al cargar, abre automáticamente la conversación no leída más reciente.
  useEffect(() => {
    if (loading || autoOpenedRef.current) return;
    if (selectedId != null) { autoOpenedRef.current = true; return; }
    const unread = sortByRecency(conversations.filter((c) => (c.noLeidos || 0) > 0));
    if (unread.length > 0) { autoOpenedRef.current = true; openConversation(unread[0]); }
  }, [conversations, loading, selectedId, openConversation]);

  /** Evento de socket: un mensaje nuevo en cualquier conversación. */
  const handleMensaje = useCallback((data) => {
    const convId = data?.conversacionId;
    if (convId == null || data?.id == null) return;
    const key = String(convId);
    const esMio = sameId(data.remitente?.id, myId);
    const abierta = sameId(convId, selectedIdRef.current);

    // Si el socket adelanta a la respuesta HTTP, el optimista pasa a ser el mensaje real.
    let tmpPendiente = null;
    if (esMio) {
      for (const [tmpId, p] of pendientesRef.current) {
        if (!p.realId && p.convId === key && p.texto === data.mensaje) {
          pendientesRef.current.set(tmpId, { ...p, realId: String(data.id) });
          tmpPendiente = tmpId;
          break;
        }
      }
    }

    setMessagesByConv((prev) => {
      const actual = prev[key];
      if (!actual) return prev; // sin caché: se cargará al abrir la conversación
      return {
        ...prev,
        [key]: tmpPendiente ? reemplazarOptimista(actual, tmpPendiente, data) : mergeMensaje(actual, data),
      };
    });

    if (!esMio && !abierta) {
      const locales = noLeidosLocalRef.current;
      locales.set(key, (locales.get(key) || 0) + 1);
    }

    const conocida = conversationsRef.current.some((c) => sameId(c.id, convId));
    if (conocida) {
      setConversations((prev) => sortByRecency(prev.map((c) => {
        if (!sameId(c.id, convId)) return c;
        let noLeidos = c.noLeidos || 0;
        if (abierta) noLeidos = 0;
        else if (!esMio) noLeidos += 1;
        return { ...c, ultimoMensaje: data.mensaje, ultimoMensajeAt: data.createdAt, updatedAt: data.createdAt, noLeidos };
      })));
    } else {
      setConversations((prev) => (prev.some((c) => sameId(c.id, convId)) ? prev : sortByRecency([{
        id: convId,
        usuario: data.remitente,
        ultimoMensaje: data.mensaje,
        ultimoMensajeAt: data.createdAt,
        updatedAt: data.createdAt,
        noLeidos: esMio ? 0 : 1,
      }, ...prev])));
      // La ficha provisional se completa con los datos reales (ciudad, viaje, rol).
      programar('lista', fetchConversations, 800);
    }

    if (esMio) return;
    if (abierta) {
      // Acuse de lectura: recargar los mensajes los marca leídos en el servidor.
      programar('leido', () => cargarMensajes(convId, { mostrarCarga: false }), 500);
    } else {
      programar('unread', fetchUnread, 500);
    }
  }, [myId, programar, fetchConversations, fetchUnread, cargarMensajes]);

  /** Al reconectar se recupera lo perdido mientras no había conexión. */
  const handleReconectar = useCallback(() => {
    fetchConversations();
    fetchUnread();
    const abierta = selectedIdRef.current;
    if (abierta != null) cargarMensajes(abierta, { mostrarCarga: false });
  }, [fetchConversations, fetchUnread, cargarMensajes]);

  const estadoConexion = useConversationSocket({
    evento: 'conversation:message',
    onEvento: handleMensaje,
    onReconectar: handleReconectar,
    authKey: myId,
  });

  /**
   * Envía (o reintenta) un mensaje. El optimista se identifica con un id
   * temporal y se reemplaza por el mensaje real del 201; si falla queda
   * marcado como fallido sin perder el texto.
   */
  const enviarTexto = useCallback(async (convId, texto, tmpIdPrevio) => {
    const key = String(convId);
    contadorTmpRef.current += 1;
    const tmpId = tmpIdPrevio || `tmp-${Date.now()}-${contadorTmpRef.current}`;
    pendientesRef.current.set(tmpId, { convId: key, texto, realId: null });
    const optimista = {
      id: tmpId,
      conversacionId: convId,
      mensaje: texto,
      leido: false,
      createdAt: new Date().toISOString(),
      estadoEnvio: 'enviando',
      remitente: { id: myId, nombre: fullNameOf(user) || 'Tú', rol: user?.rol || 'moderador', esModerador: Boolean(user?.esModerador) },
    };
    setMessagesByConv((prev) => {
      const actual = prev[key] || [];
      const lista = actual.some((m) => sameId(m.id, tmpId))
        ? actual.map((m) => (sameId(m.id, tmpId) ? { ...m, estadoEnvio: 'enviando' } : m))
        : ordenarPorFecha([...actual, optimista]);
      return { ...prev, [key]: lista };
    });
    setSendError('');
    setEnviando((n) => n + 1);
    try {
      const res = await apiSendMsg(convId, { mensaje: texto });
      const msg = res.data;
      setMessagesByConv((prev) => ({ ...prev, [key]: reemplazarOptimista(prev[key], tmpId, msg) }));
      pendientesRef.current.delete(tmpId);
      touchConversation(convId, msg.mensaje, msg.createdAt);
    } catch (err) {
      pendientesRef.current.delete(tmpId);
      setMessagesByConv((prev) => ({
        ...prev,
        [key]: (prev[key] || []).map((m) => (sameId(m.id, tmpId) ? { ...m, estadoEnvio: 'fallido' } : m)),
      }));
      setSendError(errorMessage(err, 'No se pudo enviar el mensaje'));
    } finally {
      setEnviando((n) => Math.max(0, n - 1));
    }
  }, [apiSendMsg, myId, user, touchConversation]);

  const handleSend = () => {
    const text = nuevo.trim();
    if (!text || selectedId == null) return;
    setNuevo('');
    enviarTexto(selectedId, text);
  };

  const handleRetry = (m) => {
    if (selectedId == null || !m?.mensaje) return;
    enviarTexto(selectedId, m.mensaje, String(m.id));
  };

  const handleDiscard = (m) => {
    if (selectedId == null) return;
    const key = String(selectedId);
    pendientesRef.current.delete(String(m.id));
    setMessagesByConv((prev) => ({ ...prev, [key]: (prev[key] || []).filter((x) => !sameId(x.id, m.id)) }));
    setSendError('');
  };

  // Solo las conversaciones en las que yo participo sirven para reutilizar hilo:
  // el admin (y un moderador de la misma ciudad) también ve las de otros.
  const miNombre = normalizarNombre(fullNameOf(user) || user?.nombre);
  const conversacionCon = useCallback((contactId) => conversations.find((c) => {
    const esMia = sameId(c?.usuario?.id, myId) || (c?.moderador && normalizarNombre(c.moderador) === miNombre);
    return esMia && sameId(other(c)?.id, contactId);
  }) || null, [conversations, myId, miNombre, other]);

  const handleCreate = async (contact, viajeId) => {
    const contactId = contact?.id ?? contact?.usuario?.id;
    if (!contactId) { setCreateError('Contacto sin identificador'); return; }
    // Ya hay una conversación con esa persona: se abre en lugar de crear otra.
    const existente = conversacionCon(contactId);
    if (existente) { setShowNew(false); openConversation(existente); return; }
    if (!apiCreateConv) {
      setCreateError('Este panel solo responde conversaciones; los moderadores deben iniciar el chat contigo.');
      return;
    }
    setCreateError('');
    setCreating(true);
    try {
      const ciudad = (createCity ? createCity(contact, myCity) : myCity) || undefined;
      const res = await apiCreateConv({ usuarioId: contactId, viajeId, ciudad });
      const conv = res.data;
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

  // Búsqueda en el servidor (con debounce) mientras el modal está abierto:
  // busca por nombre, apellido, teléfono y correo. Nunca trae todos los usuarios
  // (el backend limita y solo incluye clientes con 3+ caracteres).
  useEffect(() => {
    if (!showNew) return undefined;
    let cancelled = false;
    const q = search.trim();
    setBuscandoContactos(true);
    const t = setTimeout(async () => {
      try {
        const res = await getContacts(q);
        if (!cancelled) setUsers(toContactList(res?.data ?? res));
      } catch {
        if (!cancelled) setUsers([]);
      } finally {
        if (!cancelled) setBuscandoContactos(false);
      }
    }, q ? 300 : 0);
    return () => { cancelled = true; clearTimeout(t); };
  }, [showNew, search, getContacts]);

  const contacts = users.filter((u) => !sameId((u.usuario || u).id, myId));
  const filteredInternal = contacts.filter((u) => isStaff(u.usuario || u)).slice(0, 20);
  const filteredPlatform = contacts.filter((u) => !isStaff(u.usuario || u)).slice(0, 20);
  const contacto = selected ? other(selected) : null;

  return (
    <div className={`chat ${mobileOpen && selected ? 'chat--thread-open' : ''}`}>
      <ConversationList
        conversations={conversations}
        loading={loading}
        selectedId={selectedId}
        unreadTotal={totalNoLeidas}
        canCreate={canCreate}
        other={other}
        onSelect={openConversation}
        onNew={openNewModal}
      />

      <ConversationThread
        conversation={selected}
        contact={contacto}
        messages={messages}
        loading={msgLoading}
        loadError={msgError}
        myId={myId}
        draft={nuevo}
        onDraftChange={setNuevo}
        onSend={handleSend}
        onRetry={handleRetry}
        onDiscard={handleDiscard}
        sending={enviando > 0}
        sendError={sendError}
        estadoConexion={estadoConexion}
        onBack={() => setMobileOpen(false)}
      />

      <NewConversationModal
        isOpen={showNew}
        onClose={() => setShowNew(false)}
        search={search}
        onSearchChange={setSearch}
        searching={buscandoContactos}
        internal={filteredInternal}
        platform={filteredPlatform}
        error={createError}
        creating={creating}
        onCreate={handleCreate}
        yaExiste={(id) => Boolean(conversacionCon(id))}
      />
    </div>
  );
}
