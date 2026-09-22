import { Fragment, useEffect, useRef } from 'react';
import { ArrowLeft, Calendar, Check, CheckCheck, MessageSquare, Send } from 'lucide-react';
import { formatTime } from '../../utils/format';
import { Avatar, Badge, Button } from '../ui';
import {
  ROL_BADGE, fechaSalidaDe, formatDia, formatDiaCorto, formatFechaSalida, getRolEtiqueta, isSameDay,
} from './conversationUtils';

function MessageBubble({ message: m, isMe }) {
  const rol = ROL_BADGE[getRolEtiqueta(m.remitente)];
  const esOtroDia = !isSameDay(m.createdAt, new Date());
  const leido = m.leido || String(m.id).startsWith('tmp-');

  return (
    <div className={`chat-msg ${isMe ? 'chat-msg--me' : ''}`}>
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
          {isMe && (leido
            ? <CheckCheck size={12} aria-label="Leído" />
            : <Check size={12} aria-label="Enviado" />)}
        </span>
      </div>
    </div>
  );
}

export default function ConversationThread({
  conversation, contact, messages, loading, myId, draft, onDraftChange, onSend, sending, sendError, onBack,
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
  const canSend = Boolean(draft.trim()) && !sending;

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
        {salida && (
          <span className="chat__salida">
            <Calendar size={12} /> Salida: {formatFechaSalida(salida)}
          </span>
        )}
      </div>

      <div className="chat__messages">
        {loading && <p className="chat__placeholder">Cargando mensajes…</p>}
        {!loading && messages.length === 0 && (
          <p className="chat__placeholder">Sin mensajes aún. Saluda al conductor o cliente…</p>
        )}
        {!loading && messages.map((m, i) => {
          const isMe = String(m.remitente?.id) === String(myId) || Boolean(m.remitente?.esModerador);
          const prev = messages[i - 1];
          const showDay = !prev || !isSameDay(m.createdAt, prev.createdAt);
          return (
            <Fragment key={m.id}>
              {showDay && <div className="chat__day">{formatDia(m.createdAt)}</div>}
              <MessageBubble message={m} isMe={isMe} />
            </Fragment>
          );
        })}
        <div ref={endRef} />
      </div>

      {sendError && <div className="chat__send-error" role="alert">{sendError}</div>}

      <form
        className="chat__composer"
        onSubmit={(e) => { e.preventDefault(); onSend(); }}
      >
        <input
          className="chat__input"
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
          placeholder="Escribe un mensaje… (máx. 500)"
          maxLength={500}
          aria-label="Mensaje"
        />
        <Button type="submit" size="icon" disabled={!canSend} aria-label="Enviar mensaje">
          <Send size={16} />
        </Button>
      </form>
    </div>
  );
}
