import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getModeratorEmergencies } from '../../api/moderator';
import { io } from 'socket.io-client';

export default function EmergencyBanner() {
  const navigate = useNavigate();
  const [count, setCount] = useState(0);
  const [ciudad, setCiudad] = useState('');
  const audioRef = useRef(null);
  const prevCountRef = useRef(0);

  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem('user') || '{}');
      setCiudad(u.zonaModerador || u.zona_moderador || '');
    } catch {}
  }, []);

  const [hasActiva, setHasActiva] = useState(false);
  const [isNew, setIsNew] = useState(false);
  const [lastEstado, setLastEstado] = useState(null);

  const fetchPendientes = async () => {
    try {
      const res = await fetch('/api/moderator/emergency/count', { headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` } });
      if (res.ok) {
        const cRes = await res.json();
        setCount(cRes.pendientes ?? 0);
        setHasActiva((cRes.pendientes ?? 0) > 0 || (cRes.atendidas ?? 0) > 0);
        prevCountRef.current = cRes.pendientes ?? 0;
        return;
      }
    } catch {}
    try {
      const res = await getModeratorEmergencies({ estado: 'pendiente', page: 1, limit: 100 });
      const d = res.data;
      const list = Array.isArray(d) ? d : (d.data || d.emergencies || []);
      const pendientes = list.filter((e) => (e.estado || '').toLowerCase() === 'pendiente');
      setCount(pendientes.length);
      prevCountRef.current = pendientes.length;
      setHasActiva(pendientes.length > 0);
    } catch {}
  };

  useEffect(() => { fetchPendientes(); }, []);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;
    const socket = io('https://bakend-cargaexpress-production.up.railway.app', {
      transports: ['websocket'],
      auth: { token: `Bearer ${token}` },
      query: { token: `Bearer ${token}` },
    });
    const playSound = () => {
      try {
        if (!audioRef.current) audioRef.current = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==');
        audioRef.current.play().catch(() => {});
      } catch {}
    };
    socket.on('moderator:emergency:update', (p) => {
      setLastEstado(p.estado);
      if (p.estado === 'pendiente') {
        setCount((c) => c + 1);
        setHasActiva(true);
        setIsNew(true);
        setTimeout(() => setIsNew(false), 5000);
        playSound();
        if (Notification?.permission === 'granted') new Notification('🚨 Nueva emergencia', { body: p.motivo || 'Pendiente' });
      } else if (p.estado === 'atendida') {
        setHasActiva(true);
        setIsNew(false);
      } else if (p.estado === 'resuelta') {
        setCount((c) => Math.max(0, c - 1));
        // Si era la última activa, hasActiva debe recalcularse
        fetchPendientes();
        setIsNew(false);
      } else {
        fetchPendientes();
      }
    });
    socket.on('emergency:alert', (p) => {
      setLastEstado('pendiente');
      setIsNew(true);
      setHasActiva(true);
      fetchPendientes();
      playSound();
      if (Notification?.permission === 'granted') new Notification('🚨 Nueva emergencia', { body: p.motivo || 'Emergencia' });
      setTimeout(() => setIsNew(false), 5000);
    });
    if (Notification?.permission === 'default') Notification.requestPermission();
    return () => { socket.disconnect(); };
  }, []);

  if (count === 0 && !hasActiva && !isNew) return null;

  const showNew = isNew && count > 0;
  const showActiva = hasActiva || count > 0;

  const handleNavigate = () => {
    // Si la última fue resuelta, ve a histórico; si no, a activas
    if (lastEstado === 'resuelta') navigate('/moderator/emergencies?tab=historico');
    else navigate('/moderator/emergencies?tab=activas');
  };

  if (showNew) {
    return (
      <div
        onClick={handleNavigate}
        style={{
          background: 'linear-gradient(135deg, #f85149 0%, #da3633 100%)',
          border: '1px solid #f85149',
          borderRadius: 10,
          padding: '12px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          cursor: 'pointer',
          animation: 'pulse 1s infinite',
          boxShadow: '0 4px 16px rgba(248,81,73,0.4)',
        }}
      >
        <span style={{ fontSize: 18, animation: 'bounce 1s infinite' }}>🚨</span>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 13, fontWeight: 800, color: '#fff', margin: 0 }}>¡NUEVA EMERGENCIA!</p>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.9)', margin: 0 }}>{count} sin atender en {ciudad ? ciudad.toUpperCase() : 'tu ciudad'} — Requiere atención inmediata</p>
        </div>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#fff', background: 'rgba(0,0,0,0.2)', padding: '4px 10px', borderRadius: 20 }}>Ver →</span>
      </div>
    );
  }

  if (showActiva) {
    const isResuelta = lastEstado === 'resuelta';
    return (
      <div
        onClick={handleNavigate}
        style={{
          background: isResuelta ? 'rgba(46,160,67,0.12)' : 'rgba(210,153,34,0.12)',
          border: `1px solid ${isResuelta ? '#2ea043' : '#d29922'}`,
          borderRadius: 10,
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          cursor: 'pointer',
        }}
      >
        <span style={{ fontSize: 16 }}>{isResuelta ? '✅' : '⚠️'}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: isResuelta ? '#2ea043' : '#d29922' }}>
          {isResuelta ? 'Emergencia resuelta' : count > 0 ? `${count} emergencia${count > 1 ? 's' : ''} pendiente${count > 1 ? 's' : ''}` : 'Emergencia activa'} en {ciudad ? ciudad.toUpperCase() : 'tu ciudad'}
        </span>
        <span style={{ marginLeft: 'auto', fontSize: 11, color: isResuelta ? '#2ea043' : '#d29922' }}>Ver →</span>
      </div>
    );
  }

  return null;
}
