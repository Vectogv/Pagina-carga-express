import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import { SOCKET_URL } from '../config'
import { tokenStore } from '../api/axios'

/**
 * Una sola conexión en tiempo real para toda la sección del cliente. El backend
 * mete al cliente en su sala `client:{id}` y le manda ahí el estado del viaje,
 * la ubicación del conductor y las respuestas de soporte.
 */
const ClienteSocketContext = createContext({ socket: null, conectado: false })

export function ClienteSocketProvider({ children }) {
  const [socket, setSocket] = useState(null)
  const [conectado, setConectado] = useState(false)

  useEffect(() => {
    const token = tokenStore.access
    if (!token) return undefined
    const s = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      auth: { token: `Bearer ${token}` },
    })
    s.on('connect', () => setConectado(true))
    s.on('disconnect', () => setConectado(false))
    s.on('connect_error', (err) => {
      setConectado(false)
      // Cuenta suspendida: no tiene sentido seguir reintentando.
      if (err?.data?.code === 'CUENTA_SUSPENDIDA') s.disconnect()
    })
    setSocket(s)
    return () => { s.disconnect(); setSocket(null) }
  }, [])

  return <ClienteSocketContext.Provider value={{ socket, conectado }}>{children}</ClienteSocketContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export const useClienteSocket = () => useContext(ClienteSocketContext)

/** Escucha eventos del socket; `eventos` es { nombre: handler }. Siempre usa el handler más reciente. */
// eslint-disable-next-line react-refresh/only-export-components
export function useEventos(eventos) {
  const { socket } = useClienteSocket()
  const ref = useRef(eventos)
  useEffect(() => { ref.current = eventos })
  const nombres = Object.keys(eventos).join(',')

  useEffect(() => {
    if (!socket) return undefined
    const lista = nombres.split(',').filter((n) => n && n !== 'connect')
    const oyentes = lista.map((n) => [n, (data) => ref.current[n]?.(data)])
    oyentes.forEach(([n, fn]) => socket.on(n, fn))
    // Al reconectar se recarga, por si se perdió algo mientras no había conexión.
    const alConectar = () => ref.current.connect?.()
    socket.on('connect', alConectar)
    return () => {
      oyentes.forEach(([n, fn]) => socket.off(n, fn))
      socket.off('connect', alConectar)
    }
  }, [socket, nombres])
}
