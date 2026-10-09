import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { tokenStore } from '../api/axios';
import { useAuth } from '../contexts/AuthContext';
import { SOCKET_URL } from '../config';

// Una sola conexión socket.io por sesión para todo el panel (badges, banner SOS, páginas).
// Singleton de módulo: se crea con el token actual y se cierra al cerrar sesión.
let socket = null;
let socketToken = null;

function conectar(token) {
  if (socket && socketToken === token) return socket;
  cerrar();
  socketToken = token;
  socket = io(SOCKET_URL, {
    transports: ['websocket', 'polling'],
    auth: { token: `Bearer ${token}` },
    query: { token: `Bearer ${token}` },
  });
  return socket;
}

function cerrar() {
  if (socket) socket.disconnect();
  socket = null;
  socketToken = null;
}

/**
 * Devuelve la instancia compartida (o null sin sesión). Los consumidores usan
 * `socket.on(ev, fn)` y limpian con `socket.off(ev, fn)`; nunca `disconnect()`.
 */
export default function useSocketPanel() {
  const { user } = useAuth();
  const token = user ? tokenStore.access : null;
  const [instancia, setInstancia] = useState(() => (token ? conectar(token) : null));

  useEffect(() => {
    if (!token) { cerrar(); setInstancia(null); return; }
    setInstancia(conectar(token));
  }, [token]);

  return instancia;
}
