import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import api, { tokenStore } from '../api/axios';
import { getUnreadCount, getModeratorTrips } from '../api/moderator';
import { useAuth } from './AuthContext';
import { useModeratorCity } from './ModeratorCityContext';
import { errorMessage, toList } from '../utils/format';
import { updateFaviconBadge } from '../utils/favicon';
import { SOCKET_URL } from '../config';

const Ctx = createContext(null);

// Estado global de los badges del moderador (Emergencias, Cierres, Conversatorio y Tickets).
// Polling cada 60s + actualización inmediata por socket.
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
  const closuresIdsRef = useRef(new Set());
  useEffect(() => { closuresIdsRef.current = new Set(closures.map((c) => String(c.id))); }, [closures]);
  const [emergencyBadge, setEmergencyBadge] = useState(0);
  const [unreadBadge, setUnreadBadge] = useState(0);
  const [ticketBadge, setTicketBadge] = useState(0);
  const openEmergencyRef = useRef(null);
  const openConversationRef = useRef(null);

  const refreshEmergencies = useCallback(async () => {
    if (!tokenStore.access) return;
    try {
      const { data } = await api.get('/api/moderator/emergency/count');
      setEmergencyBadge((data?.pendientes ?? 0) + (data?.atendidas ?? 0));
    } catch {
      // Silencioso: el badge es informativo y se reintenta en el siguiente polling.
    }
  }, []);

  const refreshClosures = useCallback(async () => {
    if (!tokenStore.access) return;
    setClosuresLoading(true);
    try {
      const res = await getModeratorTrips({ page: 1, limit: 50, estado: 'pendiente_confirmacion', ...ciudadParams });
      setClosures(toList(res.data, 'trips'));
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
      const { data } = await api.get('/api/moderator/tickets/count');
      setTicketBadge(data?.abiertos ?? 0);
    } catch {
      // Silencioso: el badge es informativo y se reintenta en el siguiente polling.
    }
  }, []);

  useEffect(() => {
    refreshEmergencies();
    refreshUnread();
    refreshTickets();
    const id = setInterval(() => { refreshEmergencies(); refreshUnread(); refreshTickets(); }, 60000);
    return () => clearInterval(id);
  }, [refreshEmergencies, refreshUnread, refreshTickets]);

  // Los cierres dependen de la ciudad elegida (admin), por eso van en su propio efecto.
  useEffect(() => {
    refreshClosures();
    const id = setInterval(refreshClosures, 60000);
    return () => clearInterval(id);
  }, [refreshClosures]);
  const refreshClosuresRef = useRef(refreshClosures);
  useEffect(() => { refreshClosuresRef.current = refreshClosures; }, [refreshClosures]);

  useEffect(() => {
    const token = tokenStore.access;
    if (!token) return;
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      auth: { token: `Bearer ${token}` },
      query: { token: `Bearer ${token}` },
    });
    socket.on('connect', () => { refreshEmergencies(); refreshUnread(); refreshTickets(); refreshClosuresRef.current(); });
    // Cierre pendiente nuevo, o un viaje que entra/sale de pendiente_confirmacion.
    // Se agrupan los avisos seguidos para no pedir la lista varias veces (igual que la app).
    let closuresTimer = null;
    const scheduleClosures = () => {
      clearTimeout(closuresTimer);
      closuresTimer = setTimeout(() => refreshClosuresRef.current(), 400);
    };
    socket.on('moderator:pending_close', scheduleClosures);
    socket.on('moderator:trip:update', (p) => {
      const esCierre = p?.estado === 'pendiente_confirmacion';
      const estaba = closuresIdsRef.current.has(String(p?.id));
      if (esCierre || estaba) scheduleClosures();
    });
    // Ticket nuevo, reabierto o tomado → recalcular con el endpoint autoritativo.
    ['ticket:nuevo', 'ticket:estado'].forEach((ev) => socket.on(ev, () => refreshTickets()));
    // Cambio de estado de una emergencia → recalcular con el endpoint autoritativo.
    // moderator:emergency:update llega a la sala de la zona; emergency:alert solo a admins.
    ['emergency:alert', 'moderator:emergency:update'].forEach((ev) => socket.on(ev, () => refreshEmergencies()));
    // El evento llega a toda la sala de la ciudad (también los mensajes propios y los de
    // hilos de otros moderadores): se ignoran los propios y se recalcula con el backend.
    socket.on('conversation:message', (data) => {
      if (data?.remitente?.id != null && String(data.remitente.id) === String(userIdRef.current)) return;
      if (openConversationRef.current && String(data.conversacionId) === String(openConversationRef.current)) return;
      refreshUnread();
    });
    return () => { clearTimeout(closuresTimer); socket.disconnect(); };
  }, [refreshEmergencies, refreshUnread, refreshTickets]);

  const closuresBadge = closures.length;

  // Favicon con badge rojo (total de pendientes de atención).
  useEffect(() => {
    updateFaviconBadge(emergencyBadge + closuresBadge + unreadBadge + ticketBadge);
  }, [emergencyBadge, closuresBadge, unreadBadge, ticketBadge]);

  const setOpenEmergency = useCallback((id) => { openEmergencyRef.current = id ?? null; }, []);
  const setOpenConversation = useCallback((id) => { openConversationRef.current = id ?? null; }, []);

  const clearEmergency = useCallback(() => { setEmergencyBadge(0); refreshEmergencies(); }, [refreshEmergencies]);
  const clearUnread = useCallback(() => { setUnreadBadge(0); }, []);

  const value = useMemo(() => ({
    emergencyBadge,
    unreadBadge,
    ticketBadge,
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
  }), [emergencyBadge, unreadBadge, ticketBadge, closuresBadge, closures, closuresLoading, closuresError, refreshClosures, refreshEmergencies, refreshUnread, refreshTickets, setOpenEmergency, setOpenConversation, clearEmergency, clearUnread]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useModeratorBadges() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useModeratorBadges debe usarse dentro de ModeratorBadgesProvider');
  return ctx;
}