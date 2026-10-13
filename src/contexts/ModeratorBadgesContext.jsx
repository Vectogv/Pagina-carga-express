import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { tokenStore } from '../api/axios';
import useSocketPanel from '../hooks/useSocketPanel';
import { getUnreadCount, getModeratorTrips, getModeratorDrivers, getEmergencyCount, getTicketsCount } from '../api/moderator';
import { useAuth } from './AuthContext';
import { useModeratorCity } from './ModeratorCityContext';
import { errorMessage, toList } from '../utils/format';
import { updateFaviconBadge } from '../utils/favicon';
import { avisar } from '../utils/aviso';

const Ctx = createContext(null);

// Estado global de los badges del moderador (Emergencias, Cierres, Conversatorio, Tickets y
// conductores pendientes). Polling cada 60s + actualización inmediata por socket.
export function ModeratorBadgesProvider({ children }) {
  const { user } = useAuth();
  const { ciudadParams } = useModeratorCity();
  const userIdRef = useRef(user?.id);
  useEffect(() => { userIdRef.current = user?.id; }, [user?.id]);
  // Cierres pendientes (H1): la lista completa, no solo el número, para que la
  // página Cierres, el badge y el Centro de control muestren lo mismo.
  const [closures, setClosures] = useState([]);
  const [closuresLoading, setClosuresLoading] = useState(false);
  const [closuresError, setClosuresError] = useState(null);
  const [closuresTotal, setClosuresTotal] = useState(0);
  const closuresIdsRef = useRef(new Set());
  useEffect(() => { closuresIdsRef.current = new Set(closures.map((c) => String(c.id))); }, [closures]);
  const [emergencyBadge, setEmergencyBadge] = useState(0);
  const [unreadBadge, setUnreadBadge] = useState(0);
  const [ticketBadge, setTicketBadge] = useState(0);
  const [pendingDriversBadge, setPendingDriversBadge] = useState(0);
  const openEmergencyRef = useRef(null);
  const openConversationRef = useRef(null);

  const refreshEmergencies = useCallback(async () => {
    if (!tokenStore.access) return;
    try {
      const { data } = await getEmergencyCount(ciudadParams);
      setEmergencyBadge((data?.pendientes ?? 0) + (data?.atendidas ?? 0));
    } catch {
      // Silencioso: el badge es informativo y se reintenta en el siguiente polling.
    }
  }, [ciudadParams]);

  const refreshClosures = useCallback(async () => {
    if (!tokenStore.access) return;
    setClosuresLoading(true);
    try {
      const res = await getModeratorTrips({ page: 1, limit: 50, estado: 'pendiente_confirmacion', ...ciudadParams });
      const lista = toList(res.data, 'trips');
      setClosures(lista);
      // El servidor devuelve un arreglo plano (sin total); si algún día manda {data,total} se usa.
      setClosuresTotal(typeof res.data?.total === 'number' ? res.data.total : lista.length);
      setClosuresError(null);
    } catch (err) {
      setClosuresError(err.response?.status === 403
        ? 'No tienes permisos de moderador o ciudad no asignada'
        : errorMessage(err, 'Error al cargar los cierres pendientes'));
    } finally {
      setClosuresLoading(false);
    }
  }, [ciudadParams]);

  const refreshUnread = useCallback(async () => {
    try {
      const res = await getUnreadCount();
      setUnreadBadge(res.data.total ?? res.data.count ?? 0);
    } catch {
      // Silencioso: el badge es informativo y se reintenta en el siguiente polling.
    }
  }, []);

  // Tickets de soporte abiertos (sin atender) en la zona del moderador.
  const refreshTickets = useCallback(async () => {
    if (!tokenStore.access) return;
    try {
      const { data } = await getTicketsCount(ciudadParams);
      setTicketBadge(data?.abiertos ?? 0);
    } catch {
      // Silencioso: el badge es informativo y se reintenta en el siguiente polling.
    }
  }, [ciudadParams]);

  // Conductores pendientes de verificación en la zona (depende de la ciudad elegida por el admin).
  const refreshPendingDrivers = useCallback(async () => {
    if (!tokenStore.access) return;
    try {
      const res = await getModeratorDrivers({ page: 1, limit: 100, estado: 'pendiente', ...ciudadParams });
      setPendingDriversBadge(res.data?.total ?? toList(res.data, 'drivers').length);
    } catch {
      // Silencioso: el badge es informativo y se reintenta en el siguiente polling.
    }
  }, [ciudadParams]);

  useEffect(() => {
    refreshEmergencies();
    refreshUnread();
    refreshTickets();
    const id = setInterval(() => { refreshEmergencies(); refreshUnread(); refreshTickets(); }, 60000);
    return () => clearInterval(id);
  }, [refreshEmergencies, refreshUnread, refreshTickets]);

  useEffect(() => {
    refreshPendingDrivers();
    const id = setInterval(refreshPendingDrivers, 60000);
    return () => clearInterval(id);
  }, [refreshPendingDrivers]);

  // Los cierres dependen de la ciudad elegida (admin), por eso van en su propio efecto.
  useEffect(() => {
    refreshClosures();
    const id = setInterval(refreshClosures, 60000);
    return () => clearInterval(id);
  }, [refreshClosures]);
  const refreshClosuresRef = useRef(refreshClosures);
  useEffect(() => { refreshClosuresRef.current = refreshClosures; }, [refreshClosures]);

  const socket = useSocketPanel();
  useEffect(() => {
    if (!socket) return undefined;
    const onConnect = () => { refreshEmergencies(); refreshUnread(); refreshTickets(); refreshClosuresRef.current(); };
    socket.on('connect', onConnect);
    if (socket.connected) onConnect();
    // Cierre pendiente nuevo, o un viaje que entra/sale de pendiente_confirmacion.
    // Se agrupan los avisos seguidos para no pedir la lista varias veces (igual que la app).
    let closuresTimer = null;
    const scheduleClosures = () => {
      clearTimeout(closuresTimer);
      closuresTimer = setTimeout(() => refreshClosuresRef.current(), 400);
    };
    const onTrip = (p) => {
      const esCierre = p?.estado === 'pendiente_confirmacion';
      const estaba = closuresIdsRef.current.has(String(p?.id));
      if (esCierre || estaba) scheduleClosures();
    };
    // Ticket nuevo, reabierto o tomado → recalcular con el endpoint autoritativo.
    const onTicket = () => refreshTickets();
    // Cambio de estado de una emergencia → recalcular con el endpoint autoritativo.
    // moderator:emergency:update llega a la sala de la zona; emergency:alert solo a admins.
    const onEmergencia = () => refreshEmergencies();
    // El evento llega a toda la sala de la ciudad (también los mensajes propios y los de
    // hilos de otros moderadores): se ignoran los propios y se recalcula con el backend.
    // Sonido + aviso del navegador solo si la pestaña no está en primer plano (el
    // SOS ya suena en el EmergencyBanner).
    const onMensaje = (data) => {
      if (data?.remitente?.id != null && String(data.remitente.id) === String(userIdRef.current)) return;
      if (openConversationRef.current && String(data.conversacionId) === String(openConversationRef.current)) return;
      refreshUnread();
      if (document.hidden) avisar('Mensaje nuevo', data?.remitente?.nombre ? `De ${data.remitente.nombre}` : 'Conversatorio');
    };
    const handlers = [
      ['moderator:pending_close', scheduleClosures], ['moderator:trip:update', onTrip],
      ['ticket:nuevo', onTicket], ['ticket:estado', onTicket],
      ['emergency:alert', onEmergencia], ['moderator:emergency:update', onEmergencia],
      ['conversation:message', onMensaje],
    ];
    handlers.forEach(([ev, fn]) => socket.on(ev, fn));
    // Socket compartido (useSocketPanel): se quitan los listeners, no se desconecta.
    return () => {
      clearTimeout(closuresTimer);
      socket.off('connect', onConnect);
      handlers.forEach(([ev, fn]) => socket.off(ev, fn));
    };
  }, [socket, refreshEmergencies, refreshUnread, refreshTickets]);

  const closuresBadge = closuresTotal;

  // Favicon con badge rojo y contador en el título de la pestaña (total de pendientes de atención).
  useEffect(() => {
    const total = emergencyBadge + closuresBadge + unreadBadge + ticketBadge;
    updateFaviconBadge(total);
    document.title = total > 0 ? `(${total}) Carga Express` : 'Carga Express';
    return () => { document.title = 'Carga Express'; };
  }, [emergencyBadge, closuresBadge, unreadBadge, ticketBadge]);

  const setOpenEmergency = useCallback((id) => { openEmergencyRef.current = id ?? null; }, []);
  const setOpenConversation = useCallback((id) => { openConversationRef.current = id ?? null; }, []);

  const clearEmergency = useCallback(() => { setEmergencyBadge(0); refreshEmergencies(); }, [refreshEmergencies]);
  const clearUnread = useCallback(() => { setUnreadBadge(0); }, []);

  const value = useMemo(() => ({
    emergencyBadge,
    unreadBadge,
    ticketBadge,
    pendingDriversBadge,
    refreshPendingDrivers,
    closuresBadge,
    closures,
    closuresLoading,
    closuresError,
    refreshClosures,
    totalBadges: emergencyBadge + closuresBadge + unreadBadge + ticketBadge,
    refreshEmergencies,
    refreshUnread,
    refreshTickets,
    setOpenEmergency,
    setOpenConversation,
    clearEmergency,
    clearUnread,
  }), [emergencyBadge, unreadBadge, ticketBadge, pendingDriversBadge, refreshPendingDrivers, closuresBadge, closures, closuresLoading, closuresError, refreshClosures, refreshEmergencies, refreshUnread, refreshTickets, setOpenEmergency, setOpenConversation, clearEmergency, clearUnread]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useModeratorBadges() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useModeratorBadges debe usarse dentro de ModeratorBadgesProvider');
  return ctx;
}