import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { getUnreadCount } from '../api/moderator';
import { updateFaviconBadge } from '../utils/favicon';

const SOCKET_URL = 'https://bakend-cargaexpress-production.up.railway.app';

const Ctx = createContext(null);

// Estado global de los badges del moderador (Emergencias y Conversatorio).
// Polling cada 60s + actualización inmediata por socket.
export function ModeratorBadgesProvider({ children }) {
  const [emergencyBadge, setEmergencyBadge] = useState(0);
  const [unreadBadge, setUnreadBadge] = useState(0);
  const openEmergencyRef = useRef(null);
  const openConversationRef = useRef(null);

  const refreshEmergencies = useCallback(async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return;
      const res = await fetch('/api/moderator/emergency/count', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const d = await res.json();
        setEmergencyBadge((d.pendientes ?? 0) + (d.atendidas ?? 0));
      }
    } catch { /* silencioso */ }
  }, []);

  const refreshUnread = useCallback(async () => {
    try {
      const res = await getUnreadCount();
      setUnreadBadge(res.data.total ?? res.data.count ?? 0);
    } catch { /* silencioso */ }
  }, []);

  useEffect(() => {
    refreshEmergencies();
    refreshUnread();
    const id = setInterval(() => { refreshEmergencies(); refreshUnread(); }, 60000);
    return () => clearInterval(id);
  }, [refreshEmergencies, refreshUnread]);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;
    const socket = io(SOCKET_URL, { transports: ['websocket'], auth: { token: `Bearer ${token}` }, query: { token: `Bearer ${token}` } });
    socket.on('connect', () => { refreshEmergencies(); refreshUnread(); });
    // Cambio de estado de una emergencia → recalcular con el endpoint autoritativo.
    ['emergency:new', 'emergency:acknowledged', 'emergency:resolved', 'emergency:alert', 'moderator:emergency:update'].forEach((ev) => socket.on(ev, () => refreshEmergencies()));
    socket.on('emergency:message', (data) => {
      const openId = openEmergencyRef.current;
      const msgId = data.alertaId ?? data.emergenciaId ?? data.emergencyId ?? data.id;
      if (openId && String(msgId) === String(openId)) return;
      setEmergencyBadge((p) => p + 1);
    });
    socket.on('conversation:message', (data) => {
      if (openConversationRef.current && String(data.conversacionId) === String(openConversationRef.current)) return;
      setUnreadBadge((p) => p + 1);
    });
    return () => { socket.disconnect(); };
  }, [refreshEmergencies, refreshUnread]);

  // Favicon con badge rojo (total de pendientes de atención).
  useEffect(() => {
    updateFaviconBadge(emergencyBadge + unreadBadge);
  }, [emergencyBadge, unreadBadge]);

  const setOpenEmergency = useCallback((id) => { openEmergencyRef.current = id ?? null; }, []);
  const setOpenConversation = useCallback((id) => { openConversationRef.current = id ?? null; }, []);

  const clearEmergency = useCallback(() => { setEmergencyBadge(0); refreshEmergencies(); }, [refreshEmergencies]);
  const clearUnread = useCallback(() => { setUnreadBadge(0); }, []);

  const value = useMemo(() => ({
    emergencyBadge,
    unreadBadge,
    totalBadges: emergencyBadge + unreadBadge,
    refreshEmergencies,
    refreshUnread,
    setOpenEmergency,
    setOpenConversation,
    clearEmergency,
    clearUnread,
  }), [emergencyBadge, unreadBadge, refreshEmergencies, refreshUnread, setOpenEmergency, setOpenConversation, clearEmergency, clearUnread]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useModeratorBadges() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useModeratorBadges debe usarse dentro de ModeratorBadgesProvider');
  return ctx;
}