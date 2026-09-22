import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { ChevronRight, CircleCheck, Siren } from 'lucide-react';
import api, { tokenStore } from '../../api/axios';
import { getModeratorEmergencies } from '../../api/moderator';
import { SOCKET_URL } from '../../config';
import { toList } from '../../utils/format';
import './EmergencyBanner.css';

const ALERT_SOUND = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==';

function readModeratorCity() {
  try {
    const u = JSON.parse(localStorage.getItem('user') || '{}');
    return u.zonaModerador || u.zona_moderador || '';
  } catch {
    // Usuario guardado corrupto: se muestra "tu ciudad".
    return '';
  }
}

function notify(body) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  new Notification('Nueva emergencia', { body });
}

export default function EmergencyBanner() {
  const navigate = useNavigate();
  const [ciudad] = useState(readModeratorCity);
  const [count, setCount] = useState(0);
  const [hasActiva, setHasActiva] = useState(false);
  const [isNew, setIsNew] = useState(false);
  const [lastEstado, setLastEstado] = useState(null);
  const audioRef = useRef(null);

  const fetchPendientes = useCallback(async () => {
    try {
      const { data } = await api.get('/api/moderator/emergency/count');
      const pendientes = data?.pendientes ?? 0;
      setCount(pendientes);
      setHasActiva(pendientes > 0 || (data?.atendidas ?? 0) > 0);
      return;
    } catch {
      // Endpoint /count no disponible: se usa el listado como respaldo.
    }
    try {
      const res = await getModeratorEmergencies({ estado: 'pendiente', page: 1, limit: 100 });
      const pendientes = toList(res.data, 'emergencies').filter((e) => (e.estado || '').toLowerCase() === 'pendiente');
      setCount(pendientes.length);
      setHasActiva(pendientes.length > 0);
    } catch {
      // Silencioso: el banner es informativo y se actualiza por socket.
    }
  }, []);

  useEffect(() => { fetchPendientes(); }, [fetchPendientes]);

  useEffect(() => {
    const token = tokenStore.access;
    if (!token) return undefined;
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      auth: { token: `Bearer ${token}` },
      query: { token: `Bearer ${token}` },
    });
    const timers = [];
    const flagNew = () => {
      setIsNew(true);
      timers.push(setTimeout(() => setIsNew(false), 5000));
    };
    const playSound = () => {
      try {
        if (!audioRef.current) audioRef.current = new Audio(ALERT_SOUND);
        audioRef.current.play().catch(() => { /* autoplay bloqueado por el navegador */ });
      } catch {
        // Audio no soportado en este navegador.
      }
    };

    socket.on('moderator:emergency:update', (p) => {
      setLastEstado(p.estado);
      if (p.estado === 'pendiente') {
        setCount((c) => c + 1);
        setHasActiva(true);
        flagNew();
        playSound();
        notify(p.motivo || 'Pendiente');
      } else if (p.estado === 'atendida') {
        setHasActiva(true);
        setIsNew(false);
      } else if (p.estado === 'resuelta') {
        setCount((c) => Math.max(0, c - 1));
        // Si era la última activa, hasActiva debe recalcularse.
        fetchPendientes();
        setIsNew(false);
      } else {
        fetchPendientes();
      }
    });
    socket.on('emergency:alert', (p) => {
      setLastEstado('pendiente');
      setHasActiva(true);
      flagNew();
      fetchPendientes();
      playSound();
      notify(p.motivo || 'Emergencia');
    });
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') Notification.requestPermission();
    return () => {
      timers.forEach(clearTimeout);
      socket.disconnect();
    };
  }, [fetchPendientes]);

  if (count === 0 && !hasActiva && !isNew) return null;

  const place = ciudad ? ciudad.toUpperCase() : 'tu ciudad';
  const handleNavigate = () => {
    // Si la última fue resuelta, va al histórico; si no, a las activas.
    navigate(lastEstado === 'resuelta' ? '/moderator/emergencies?tab=historico' : '/moderator/emergencies?tab=activas');
  };

  if (isNew && count > 0) {
    return (
      <div role="alert">
        <button type="button" className="emergency-banner emergency-banner--new" onClick={handleNavigate}>
          <span className="emergency-banner__icon"><Siren size={18} /></span>
          <span className="emergency-banner__text">
            <span className="emergency-banner__title">Nueva emergencia</span>
            <span className="emergency-banner__meta">{count} sin atender en {place} · Requiere atención inmediata</span>
          </span>
          <span className="emergency-banner__cta"><span className="emergency-banner__cta-text">Atender</span><ChevronRight size={14} /></span>
        </button>
      </div>
    );
  }

  const isResuelta = lastEstado === 'resuelta';
  const title = isResuelta
    ? 'Emergencia resuelta'
    : count > 0 ? `${count} emergencia${count > 1 ? 's' : ''} pendiente${count > 1 ? 's' : ''}` : 'Emergencia activa';

  return (
    <button
      type="button"
      className={`emergency-banner ${isResuelta ? 'emergency-banner--resolved' : ''}`}
      onClick={handleNavigate}
    >
      <span className="emergency-banner__icon">{isResuelta ? <CircleCheck size={18} /> : <Siren size={18} />}</span>
      <span className="emergency-banner__text">
        <span className="emergency-banner__title">{title}</span>
        <span className="emergency-banner__meta">En {place}</span>
      </span>
      <span className="emergency-banner__cta"><span className="emergency-banner__cta-text">Ver</span><ChevronRight size={14} /></span>
    </button>
  );
}
