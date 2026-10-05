import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ArrowLeft, MessageSquarePlus, Send, LifeBuoy } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { clienteApi } from '../../api/cliente';
import { CATEGORIAS_TICKET } from '../../api/tickets';
import { errorMessage, formatDateTime } from '../../utils/format';
import useSondeo from '../../hooks/useSondeo';
import { useEventos } from '../../contexts/ClienteSocketContext';
import { Estado } from './ClientePage';

// Mismos límites que valida el backend (ticket_controller).
const ASUNTO = [3, 150];
const DESCRIPCION = [10, 2000];

function NuevoTicket({ inicial, onCreado, onCancelar }) {
  const [categoria, setCategoria] = useState(inicial?.viajeId ? 'viaje' : 'otro');
  const [asunto, setAsunto] = useState(inicial?.asunto || '');
  const [descripcion, setDescripcion] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  const enviar = async (e) => {
    e.preventDefault();
    const a = asunto.trim();
    const d = descripcion.trim();
    if (a.length < ASUNTO[0]) return setError(`El asunto necesita al menos ${ASUNTO[0]} caracteres.`);
    if (d.length < DESCRIPCION[0]) return setError(`Cuéntanos un poco más: mínimo ${DESCRIPCION[0]} caracteres.`);
    setEnviando(true);
    try {
      const { data } = await clienteApi.crearTicket({ categoria, asunto: a, descripcion: d, ...(inicial?.viajeId ? { viajeId: inicial.viajeId } : {}) });
      onCreado(data);
    } catch (err) {
      setError(errorMessage(err, 'No se pudo crear el ticket.'));
      setEnviando(false);
    }
  };

  return (
    <form className="cli-card cli-form" onSubmit={enviar} noValidate>
      <h2>Nuevo ticket</h2>
      {inicial?.viajeId && <p className="cli-suave">Sobre el viaje #{inicial.viajeId}</p>}
      {error && <p className="cli-error" role="alert">{error}</p>}
      <label htmlFor="t-categoria">Tema</label>
      <select id="t-categoria" value={categoria} onChange={(e) => setCategoria(e.target.value)}>
        {Object.entries(CATEGORIAS_TICKET).map(([v, t]) => <option key={v} value={v}>{t}</option>)}
      </select>
      <label htmlFor="t-asunto">Asunto</label>
      <input id="t-asunto" value={asunto} maxLength={ASUNTO[1]} onChange={(e) => setAsunto(e.target.value)} placeholder="Ej.: El conductor no llegó" />
      <label htmlFor="t-descripcion">¿Qué pasó?</label>
      <textarea id="t-descripcion" rows={5} value={descripcion} maxLength={DESCRIPCION[1]} onChange={(e) => setDescripcion(e.target.value)} placeholder="Cuéntanos con detalle para ayudarte más rápido." />
      <div className="cli-form__acciones">
        <button type="button" className="cli-btn cli-btn--borde" onClick={onCancelar}>Cancelar</button>
        <button type="submit" className="cli-btn" disabled={enviando}>{enviando ? 'Enviando…' : 'Enviar ticket'}</button>
      </div>
    </form>
  );
}

function Hilo({ id, onVolver, onCambio }) {
  const { user } = useAuth();
  const [ticket, setTicket] = useState(null);
  const [texto, setTexto] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [confirmarCierre, setConfirmarCierre] = useState(false);
  const fin = useRef(null);

  const cargar = useCallback(() => {
    clienteApi.ticket(id)
      .then(({ data }) => { setTicket(data); setError(''); })
      .catch((err) => setError(errorMessage(err, 'No se pudo cargar la conversación.')));
  }, [id]);
  // Las respuestas de soporte llegan por socket; el sondeo es respaldo.
  useSondeo(cargar, 30000);
  const esEste = (p) => String(p?.ticketId ?? p?.id) === String(id);
  useEventos({
    connect: cargar,
    'ticket:mensaje': (p) => { if (esEste(p)) cargar(); },
    'ticket:estado': (p) => { if (esEste(p)) cargar(); },
  });

  const cantidad = ticket?.mensajes?.length || 0;
  useEffect(() => { fin.current?.scrollIntoView({ block: 'end' }); }, [cantidad]);

  const enviar = async (e) => {
    e.preventDefault();
    const m = texto.trim();
    if (!m) return;
    setEnviando(true);
    try {
      await clienteApi.enviarMensaje(id, m);
      setTexto('');
      cargar();
      onCambio();
    } catch (err) {
      setError(errorMessage(err, 'No se pudo enviar el mensaje.'));
    } finally {
      setEnviando(false);
    }
  };

  const cerrar = async () => {
    try {
      await clienteApi.cerrarTicket(id);
      setConfirmarCierre(false);
      cargar();
      onCambio();
    } catch (err) {
      setError(errorMessage(err, 'No se pudo cerrar el ticket.'));
    }
  };

  if (!ticket) return <div className="cli-card cli-hilo">{error ? <p className="cli-error">{error}</p> : <p className="cli-cargando">Cargando…</p>}</div>;

  const cerrado = ticket.estado === 'cerrado';
  const mio = (m) => String(m.autor?.id) === String(user?.id);

  return (
    <div className="cli-card cli-hilo">
      <div className="cli-hilo__cabeza">
        <button type="button" className="cli-hilo__volver" onClick={onVolver} aria-label="Volver a mis tickets"><ArrowLeft size={18} /></button>
        <div>
          <strong>{ticket.asunto}</strong>
          <small>#{ticket.id} · {CATEGORIAS_TICKET[ticket.categoria] || ticket.categoria}{ticket.moderador ? ` · Te atiende ${ticket.moderador.nombre}` : ''}</small>
        </div>
        <Estado estado={ticket.estado} />
      </div>

      <div className="cli-hilo__mensajes">
        <div className="cli-msg cli-msg--mio">
          <p>{ticket.descripcion}</p>
          <small>{formatDateTime(ticket.createdAt)}</small>
        </div>
        {(ticket.mensajes || []).map((m) => (
          <div key={m.id} className={`cli-msg ${mio(m) ? 'cli-msg--mio' : ''}`}>
            {!mio(m) && <b>{m.autor?.nombre || 'Soporte'} · Soporte</b>}
            <p>{m.mensaje}</p>
            {m.adjunto && <a href={m.adjunto} target="_blank" rel="noreferrer">Ver adjunto</a>}
            <small>{formatDateTime(m.createdAt)}</small>
          </div>
        ))}
        <div ref={fin} />
      </div>

      {error && <p className="cli-error" role="alert">{error}</p>}

      {cerrado ? (
        <p className="cli-hilo__aviso">Este ticket está cerrado. Si necesitas más ayuda, abre uno nuevo.</p>
      ) : (
        <>
          <form className="cli-hilo__escribir" onSubmit={enviar}>
            <label htmlFor="t-mensaje" className="cli-sr">Escribe tu mensaje</label>
            <textarea
              id="t-mensaje" rows={2} value={texto} maxLength={2000} placeholder="Escribe tu mensaje…"
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) enviar(e); }}
            />
            <button type="submit" className="cli-btn" disabled={enviando || !texto.trim()} aria-label="Enviar"><Send size={18} /></button>
          </form>
          <div className="cli-hilo__cerrar">
            {confirmarCierre ? (
              <>¿Se resolvió tu problema? <button type="button" onClick={cerrar}>Sí, cerrar ticket</button> <button type="button" onClick={() => setConfirmarCierre(false)}>No</button></>
            ) : (
              <button type="button" onClick={() => setConfirmarCierre(true)}>Cerrar ticket</button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default function Soporte() {
  const { state } = useLocation();
  const [tickets, setTickets] = useState(null);
  const [error, setError] = useState('');
  const [abierto, setAbierto] = useState(null);
  // Si viene desde un viaje ("Pedir ayuda"), abre el formulario con ese viaje.
  const [nuevo, setNuevo] = useState(state?.viajeId ? state : null);

  const cargar = useCallback(() => {
    clienteApi.tickets()
      .then(({ data }) => { setTickets(data.tickets || []); setError(''); })
      .catch((err) => setError(errorMessage(err, 'No se pudieron cargar tus tickets.')));
  }, []);
  useSondeo(cargar, 60000);
  useEventos({ connect: cargar, 'ticket:mensaje': cargar, 'ticket:estado': cargar });

  const enDetalle = Boolean(abierto || nuevo);

  return (
    <section>
      <div className="cli-titulo">
        <h1>Soporte</h1>
        <button type="button" className="cli-btn" onClick={() => { setAbierto(null); setNuevo({}); }}>
          <MessageSquarePlus size={18} />Nuevo ticket
        </button>
      </div>

      <div className={`cli-soporte ${enDetalle ? 'cli-soporte--detalle' : ''}`}>
        <div className="cli-soporte__lista">
          {error && <p className="cli-error" role="alert">{error}</p>}
          {!tickets && !error && <p className="cli-cargando">Cargando tickets…</p>}
          {tickets?.length === 0 && (
            <div className="cli-vacio cli-vacio--chico">
              <LifeBuoy size={24} />
              <p>No tienes tickets. Si algo salió mal con un envío, cuéntanos y te ayudamos.</p>
            </div>
          )}
          <ul className="cli-lista">
            {tickets?.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  className={`cli-card cli-ticket ${abierto === t.id ? 'cli-ticket--activo' : ''}`}
                  onClick={() => { setNuevo(null); setAbierto(t.id); }}
                >
                  <span className="cli-ticket__fila"><strong>{t.asunto}</strong><Estado estado={t.estado} /></span>
                  <small>#{t.id} · {CATEGORIAS_TICKET[t.categoria] || t.categoria} · {formatDateTime(t.ultimoMensajeAt || t.createdAt)}</small>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="cli-soporte__panel">
          {nuevo ? (
            <NuevoTicket
              inicial={nuevo}
              onCancelar={() => setNuevo(null)}
              onCreado={(t) => { setNuevo(null); setAbierto(t.id); cargar(); }}
            />
          ) : abierto ? (
            <Hilo key={abierto} id={abierto} onVolver={() => setAbierto(null)} onCambio={cargar} />
          ) : (
            <div className="cli-card cli-vacio cli-vacio--chico">
              <LifeBuoy size={24} />
              <p>Elige un ticket para ver la conversación con soporte.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
