import { Fragment, useEffect, useRef } from 'react';
import {
  AlertTriangle, ArrowLeft, Calendar, Check, CheckCheck, Clock, MessageSquare, RotateCcw, Send, Trash2,
} from 'lucide-react';
import { formatTime } from '../../utils/format';
import { CONEXION, ETIQUETA_CONEXION } from '../../hooks/useConversationSocket';
import { Avatar, Badge, Button } from '../ui';
import {
  ROL_BADGE, fechaSalidaDe, formatDia, formatDiaCorto, formatFechaSalida, getRolEtiqueta, isSameDay,
} from './conversationUtils';

/** Indicador discreto del estado del socket. */
function ConnectionDot({ estado }) {
  const valor = estado || CONEXION.CONECTANDO;
  return (
    <span className={`chat__conn chat__conn--${valor}`} title={ETIQUETA_CONEXION[valor] || valor}>
      <span className="chat__conn-dot" aria-hidden="true" />
      {ETIQUETA_CONEXION[valor] || valor}
    </span>
  );
}

function MessageBubble({ message: m, isMe, onRetry, onDiscard }) {
  const rol = ROL_BADGE[getRolEtiqueta(m.remitente)];
  const esOtroDia = !isSameDay(m.createdAt, new Date());
  const enviando = m.estadoEnvio === 'enviando';
  const fallido = m.estadoEnvio === 'fallido';

  return (
    <div className={`chat-msg ${isMe ? 'chat-msg--me' : ''} ${fallido ? 'chat-msg--failed' : ''}`}>
      {!isMe && (
        <div className="chat-msg__author">
          <span className="chat-msg__author-name">{m.remitente?.nombre || 'Usuario'}</span>
          <Badge variant={rol.variant} size="sm">{rol.label}</Badge>
          {m.remitente?.esModerador && m.remitente.zonaModerador && (
            <span className="chat-msg__zone">{m.remitente.zonaModerador}</span>
          )}
        </div>
      )}
      <div className="chat-msg__bubble">
        <span className="chat-msg__text">{m.mensaje}</span>
        <span className="chat-msg__time">
          {formatTime(m.createdAt)}
          {esOtroDia && <> · {formatDiaCorto(m.createdAt)}</>}
          {isMe && enviando && <Clock size={12} aria-label="Enviando" />}
          {isMe && fallido && <AlertTriangle size={12} aria-label="No se envió" />}
          {isMe && !enviando && !fallido && (m.leido
            ? <CheckCheck size={12} aria-label="Leído" />
            : <Check size={12} aria-label="Enviado" />)}
        </span>
      </div>
      {fallido && (
        <div className="chat-msg__failed">
          <span>No se envió</span>
          <Button size="sm" variant="ghost" icon={<RotateCcw size={12} />} onClick={() => onRetry?.(m)}>Reintentar</Button>
          <Button size="sm" variant="ghost" icon={<Trash2 size={12} />} onClick={() => onDiscard?.(m)}>Descartar</Button>
        </div>
      )}
    </div>
  );
}

export default function ConversationThread({
  conversation, contact, messages, loading, loadError, myId, draft, onDraftChange, onSend,
  onRetry, onDiscard, sending, sendError, estadoConexion, onBack,
}) {
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!conversation) {
    return (
      <div className="chat__thread">
        <div className="chat__placeholder chat__placeholder--center">
          <MessageSquare size={24} />
          <span>Selecciona una conversación</span>
          <ConnectionDot estado={estadoConexion} />
        </div>
      </div>
    );
  }

  const rol = ROL_BADGE[getRolEtiqueta(contact)];
  const nombre = contact?.nombre || conversation.nombre || 'Chat';
  const detalle = contact?.esModerador
    ? (contact.zonaModerador || contact.ciudad || '')
    : (contact?.email || contact?.ciudad || '');
  const salida = fechaSalidaDe(conversation);
  // No se bloquea por un envío lento: cada mensaje lleva su propio estado.
  const canSend = Boolean(draft.trim());

  return (
    <div className="chat__thread">
      <div className="chat__thread-header">
        <Button size="icon" variant="ghost" className="chat__back" onClick={onBack} aria-label="Volver a conversaciones">
          <ArrowLeft size={16} />
        </Button>
        <Avatar src={conversation.avatar || contact?.avatar} name={nombre} size={36} />
        <div className="chat__thread-title">
          <div className="row">
            <span className="text-strong truncate">{nombre}</span>
            <Badge variant={rol.variant} size="sm">{rol.label}</Badge>
          </div>
          {detalle && <span className="text-sm text-muted truncate">{detalle}</span>}
        </div>
        <ConnectionDot estado={estadoConexion} />
        {salida && (
          <span className="chat__salida">
            <Calendar size={12} /> Salida: {formatFechaSalida(salida)}
          </span>
        )}
      </div>

      <div className="chat__messages">
        {loading && <p className="chat__placeholder">Cargando mensajes…</p>}
        {!loading && loadError && <p className="chat__placeholder">{loadError}</p>}
        {!loading && !loadError && messages.length === 0 && (
          <p className="chat__placeholder">Sin mensajes aún. Saluda al conductor o cliente…</p>
        )}
        {!loading && messages.map((m, i) => {
          const isMe = String(m.remitente?.id) === String(myId);
          const prev = messages[i - 1];
          const showDay = !prev || !isSameDay(m.createdAt, prev.createdAt);
          return (
            <Fragment key={m.id}>
              {showDay && <div className="chat__day">{formatDia(m.createdAt)}</div>}
              <MessageBubble message={m} isMe={isMe} onRetry={onRetry} onDiscard={onDiscard} />
            </Fragment>
          );
        })}
        <div ref={endRef} />
      </div>

      {sendError && <div className="chat__send-error" role="alert">{sendError}</div>}

      <form
        className="chat__composer"
        aria-busy={sending ? 'true' : 'false'}
        onSubmit={(e) => { e.preventDefault(); onSend(); }}
      >
        <input
          className="chat__input"
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
          placeholder={`Escribe a ${nombre}… (máx. 500)`}
          maxLength={500}
          aria-label={`Mensaje para ${nombre}`}
        />
        <Button type="submit" size="icon" disabled={!canSend} aria-label="Enviar mensaje">
          <Send size={16} />
        </Button>
      </form>
    </div>
  );
}
