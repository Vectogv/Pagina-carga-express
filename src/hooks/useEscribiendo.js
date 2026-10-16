import { useEffect, useRef, useState } from 'react';
import useSocketPanel from './useSocketPanel';

/**
 * Indicador "escribiendo…" de un chat (conversación o ticket).
 * - Emite `chat:escribiendo` al teclear (máx. 1 vez cada 2 s) y `false` al enviar
 *   (borrador vacío), tras 3 s sin teclear o al salir.
 * - Devuelve el nombre de quien escribe (o null); se apaga a los 5 s sin señal,
 *   con `false` o al llegar un mensaje nuevo (`ultimoMensajeId`).
 */
export default function useEscribiendo(tipo, id, draft, ultimoMensajeId) {
  const socket = useSocketPanel();
  const [nombre, setNombre] = useState(null);
  const ultimoEmit = useRef(0);
  const emitiendo = useRef(false);
  const timerParar = useRef(null);
  const timerOcultar = useRef(null);

  const emitir = (escribiendo) => {
    if (!socket || id == null) return;
    emitiendo.current = escribiendo;
    socket.emit('chat:escribiendo', { tipo, id: Number(id), escribiendo });
  };

  // Emisión según el borrador.
  useEffect(() => {
    if (!draft) {
      clearTimeout(timerParar.current);
      if (emitiendo.current) emitir(false);
      return;
    }
    const ahora = Date.now();
    if (ahora - ultimoEmit.current >= 2000) { ultimoEmit.current = ahora; emitir(true); }
    clearTimeout(timerParar.current);
    timerParar.current = setTimeout(() => emitir(false), 3000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);

  // Al salir del chat o cambiar de chat.
  useEffect(() => () => {
    clearTimeout(timerParar.current);
    if (emitiendo.current) emitir(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, tipo, id]);

  // Recepción.
  useEffect(() => {
    setNombre(null);
    if (!socket) return undefined;
    const onEsc = (p) => {
      if (!p || p.tipo !== tipo || Number(p.id) !== Number(id)) return;
      clearTimeout(timerOcultar.current);
      if (p.escribiendo) {
        setNombre(p.nombre || 'Alguien');
        timerOcultar.current = setTimeout(() => setNombre(null), 5000);
      } else setNombre(null);
    };
    socket.on('chat:escribiendo', onEsc);
    return () => { socket.off('chat:escribiendo', onEsc); clearTimeout(timerOcultar.current); };
  }, [socket, tipo, id]);

  // Llegó un mensaje: ya no está escribiendo.
  useEffect(() => { setNombre(null); }, [ultimoMensajeId]);

  return nombre;
}
