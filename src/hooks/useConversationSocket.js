import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { tokenStore } from '../api/axios';
import { SOCKET_URL } from '../config';

/** Estados posibles de la conexión en tiempo real (claves cortas para CSS). */
export const CONEXION = {
  CONECTANDO: 'conectando',
  CONECTADO: 'conectado',
  RECONECTANDO: 'reconectando',
  SIN_CONEXION: 'sin-conexion',
};

/** Texto visible de cada estado. */
export const ETIQUETA_CONEXION = {
  [CONEXION.CONECTANDO]: 'Conectando…',
  [CONEXION.CONECTADO]: 'En línea',
  [CONEXION.RECONECTANDO]: 'Reconectando…',
  [CONEXION.SIN_CONEXION]: 'Sin conexión',
};

/**
 * Abre un único socket para escuchar un evento y expone el estado de la conexión.
 *
 * - El socket se crea una sola vez por usuario (`authKey`): los callbacks viajan
 *   en refs para que cambiar de conversación no vuelva a conectar ni duplique
 *   listeners.
 * - Al desmontar se quitan los listeners y se cierra el socket.
 *
 * @param evento      nombre del evento a escuchar (p. ej. 'conversation:message')
 *                    o una lista de nombres
 * @param onEvento    se llama con el payload del evento y el nombre del evento
 * @param onReconectar se llama al reconectar (no en la primera conexión) para
 *                     recuperar lo que se perdió mientras no había red
 * @param authKey     identificador del usuario; sin él no se conecta
 */
export default function useConversationSocket({ evento, onEvento, onReconectar, authKey }) {
  const [estado, setEstado] = useState(CONEXION.CONECTANDO);
  // Clave estable para el efecto: una lista nueva en cada render no debe reconectar.
  const eventosKey = Array.isArray(evento) ? evento.join(',') : String(evento || '');
  const onEventoRef = useRef(onEvento);
  const onReconectarRef = useRef(onReconectar);

  useEffect(() => { onEventoRef.current = onEvento; }, [onEvento]);
  useEffect(() => { onReconectarRef.current = onReconectar; }, [onReconectar]);

  useEffect(() => {
    const token = tokenStore.access;
    if (!authKey || !token) {
      setEstado(CONEXION.SIN_CONEXION);
      return undefined;
    }

    setEstado(CONEXION.CONECTANDO);
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      // El servidor prefiere handshake.auth; query se mantiene por compatibilidad.
      auth: { token: `Bearer ${token}` },
      query: { token: `Bearer ${token}` },
    });

    // No es estado de React: solo distingue la primera conexión de una reconexión.
    let huboConexion = false;

    const eventos = eventosKey.split(',').filter(Boolean);
    const alEvento = eventos.map((nombre) => [nombre, (data) => { onEventoRef.current?.(data, nombre); }]);

    const alConectar = () => {
      setEstado(CONEXION.CONECTADO);
      if (huboConexion) onReconectarRef.current?.();
      huboConexion = true;
    };

    const alDesconectar = (motivo) => {
      // 'io client disconnect' solo pasa al desmontar: no habrá reintentos.
      setEstado(motivo === 'io client disconnect' ? CONEXION.SIN_CONEXION : CONEXION.RECONECTANDO);
    };

    const alErrorConexion = () => {
      if (!socket.active) { setEstado(CONEXION.SIN_CONEXION); return; }
      setEstado(huboConexion ? CONEXION.RECONECTANDO : CONEXION.CONECTANDO);
    };

    const alIntentarReconectar = () => {
      setEstado(huboConexion ? CONEXION.RECONECTANDO : CONEXION.CONECTANDO);
    };

    const alFallarReconexion = () => { setEstado(CONEXION.SIN_CONEXION); };

    alEvento.forEach(([nombre, fn]) => socket.on(nombre, fn));
    socket.on('connect', alConectar);
    socket.on('disconnect', alDesconectar);
    socket.on('connect_error', alErrorConexion);
    socket.io.on('reconnect_attempt', alIntentarReconectar);
    socket.io.on('reconnect_failed', alFallarReconexion);

    return () => {
      alEvento.forEach(([nombre, fn]) => socket.off(nombre, fn));
      socket.off('connect', alConectar);
      socket.off('disconnect', alDesconectar);
      socket.off('connect_error', alErrorConexion);
      socket.io.off('reconnect_attempt', alIntentarReconectar);
      socket.io.off('reconnect_failed', alFallarReconexion);
      socket.disconnect();
    };
  }, [authKey, eventosKey]);

  return estado;
}
