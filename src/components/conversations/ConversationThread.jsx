import { Fragment, useEffect, useLayoutEffect, useRef } from 'react';
import {
  AlertTriangle, ArrowLeft, Check, CheckCheck, Clock, Loader2, MapPin, MessagesSquare, Plus, RotateCcw, Send,
  Trash2, Truck, UserRound,
} from 'lucide-react';
import { CONEXION, ETIQUETA_CONEXION } from '../../hooks/useConversationSocket';
import { Avatar, Badge, Button, EmptyState, StatusBadge } from '../ui';
import {
  ROL_BADGE, ciudadDe, formatDia, formatFechaCompleta, formatHora, getRolEtiqueta, isSameDay, sameId, viajeCorto,
} from './conversationUtils';

const MAX_CHARS = 500;
// Mensajes seguidos del mismo remitente dentro de esta ventana se agrupan.
const VENTANA_GRUPO_MS = 5 * 60 * 1000;

/** Indicador discreto del estado del socket. */
function ConnectionDot({ estado }) {
  const valor = estado || CONEXION.CONECTANDO;
  return (
    <span className={`chat__conn chat__conn--${valor}`} title={ETIQUETA_CONEXION[valor] || valor}>
      <span className="chat__conn-dot" aria-hidden="true" />
      <span className="chat__conn-label">{ETIQUETA_CONEXION[valor] || valor}</span>
    </span>
  );
}

function MessageBubble({ message: m, isMe, showAuthor, groupEnd, onRetry, onDiscard }) {
  const rol = ROL_BADGE[getRolEtiqueta(m.remitente)];
  const enviando = m.estadoEnvio === 'enviando';
  const fallido = m.estadoEnvio === 'fallido';

  return (
    <div
      className={[
        'chat-msg',
        isMe ? 'chat-msg--me' : '',
        fallido ? 'chat-msg--failed' : '',
        groupEnd ? 'chat-msg--group-end' : '',
      ].filter(Boolean).join(' ')}
    >
      {!isMe && showAuthor && (
        <div className="chat-msg__author">
          <span className="chat-msg__author-name">{m.remitente?.nombre || 'Usuario'}</span>
          <Badge variant={rol.variant} size="sm">{rol.label}</Badge>
        </div>
      )}
      <div className="chat-msg__bubble">
        <span className="chat-msg__text">{m.mensaje}</span>
      </div>
      {(groupEnd || fallido || enviando) && (
        <span className="chat-msg__time" title={formatFechaCompleta(m.createdAt)}>
          {formatHora(m.createdAt)}
          {isMe && enviando && <Clock size={12} aria-label="Enviando" />}
          {isMe && fallido && <AlertTriangle size={12} aria-label="No se envió" />}
          {isMe && !enviando && !fallido && (m.leido
            ? <CheckCheck size={13} className="chat-msg__read" aria-label="Leído" />
            : <Check size={13} aria-label="Enviado" />)}
        </span>
      )}
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

/** ¿El mensaje continúa el grupo del anterior (mismo remitente, mismo día, pocos minutos)? */
const continuaGrupo = (prev, m) => Boolean(prev)
  && sameId(prev.remitente?.id, m.remitente?.id)
  && isSameDay(prev.createdAt, m.createdAt)
  && Math.abs(new Date(m.createdAt) - new Date(prev.createdAt)) < VENTANA_GRUPO_MS;

export default function ConversationThread({
  conversation, contact, messages, loading, loadError, myId, draft, onDraftChange, onSend,
  onRetry, onDiscard, sending, sendError, estadoConexion, onBack, canCreate, onNew, ciudadLabel, atendidoPor,
}) {
  const endRef = useRef(null);
  const inputRef = useRef(null);
  const convIdRef = useRef(null);
  const convId = conversation?.id;

  // Al cambiar de conversación salta al final sin animación; con mensajes nuevos, suave.
  useEffect(() => {
    const cambio = convIdRef.current !== convId;
    convIdRef.current = convId;
    endRef.current?.scrollIntoView({ behavior: cambio ? 'auto' : 'smooth', block: 'end' });
  }, [messages, convId]);

  // Enfoca el compositor al abrir una conversación (solo con puntero fino: en móvil abriría el teclado).
  useEffect(() => {
    if (convId == null) return;
    if (window.matchMedia?.('(pointer: fine)').matches) inputRef.current?.focus();
  }, [convId]);

  // Altura automática del textarea (hasta un máximo; luego hace scroll).
  useLayoutEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }, [draft, convId]);

  if (!conversation) {
    return (
      <div className="chat__thread chat__thread--empty">
        <EmptyState
          icon={<MessagesSquare size={24} />}
          title="Selecciona una conversación"
          description="Elige un chat de la lista para ver el historial y responder en tiempo real."
          action={canCreate ? (
            <Button variant="soft-primary" icon={<Plus size={14} />} onClick={onNew}>Nueva conversación</Button>
          ) : null}
        />
        <ConnectionDot estado={estadoConexion} />
      </div>
    );
  }

  const rol = ROL_BADGE[getRolEtiqueta(contact)];
  const nombre = contact?.nombre || conversation.nombre || 'Chat';
  const ciudad = ciudadLabel(ciudadDe(conversation, contact));
  const contactoDato = contact?.telefono || contact?.email || '';
  const viaje = conversation.viaje;
  const restantes = MAX_CHARS - draft.length;
  // No se bloquea por un envío lento: cada mensaje lleva su propio estado.
  const canSend = Boolean(draft.trim());

  const handleKeyDown = (e) => {
    if (e.key !== 'Enter' || e.shiftKey || e.nativeEvent.isComposing) return;
    e.preventDefault();
    if (canSend) onSend();
  };

  return (
    <div className="chat__thread">
      <div className="chat__thread-header">
        <Button size="icon" variant="ghost" className="chat__back" onClick={onBack} aria-label="Volver a conversaciones">
          <ArrowLeft size={18} />
        </Button>
        <Avatar src={conversation.avatar || contact?.avatar} name={nombre} size={40} />
        <div className="chat__thread-title">
          <div className="chat__thread-name">
            <span className="truncate">{nombre}</span>
            <Badge variant={rol.variant} size="sm">{rol.label}</Badge>
          </div>
          <div className="chat__thread-sub">
            {ciudad && <span className="chat__thread-meta"><MapPin size={12} aria-hidden="true" />{ciudad}</span>}
            {contactoDato && <span className="chat__thread-meta truncate">{contactoDato}</span>}
            {atendidoPor && (
              <span className="chat__thread-meta truncate" title="Moderador a cargo de esta conversación">
                <UserRound size={12} aria-hidden="true" />{atendidoPor}
              </span>
            )}
          </div>
        </div>
        <div className="chat__thread-actions">
          {viaje?.id != null && (
            <span
              className="chat__trip"
              title={[viaje.origenDireccion, viaje.destinoDireccion].filter(Boolean).join(' → ') || undefined}
            >
              <Truck size={13} aria-hidden="true" />
              <span className="chat__trip-id">Viaje #{viajeCorto(viaje.id)}</span>
              {viaje.estado && <StatusBadge status={viaje.estado} size="sm" />}
            </span>
          )}
          <ConnectionDot estado={estadoConexion} />
        </div>
      </div>

      <div className="chat__messages" role="log" aria-live="polite" aria-label={`Mensajes con ${nombre}`}>
        {loading && <p className="chat__placeholder">Cargando mensajes…</p>}
        {!loading && loadError && <p className="chat__placeholder chat__placeholder--error">{loadError}</p>}
        {!loading && !loadError && messages.length === 0 && (
          <div className="chat__placeholder chat__placeholder--center">
            <span className="chat__placeholder-icon"><MessagesSquare size={20} /></span>
            <strong>Sin mensajes aún</strong>
            <span>Escribe el primer mensaje para {nombre}.</span>
          </div>
        )}
        {!loading && messages.map((m, i) => {
          const isMe = sameId(m.remitente?.id, myId);
          const prev = messages[i - 1];
          const next = messages[i + 1];
          const showDay = !prev || !isSameDay(m.createdAt, prev.createdAt);
          return (
            <Fragment key={m.id}>
              {showDay && (
                <div className="chat__day" role="separator">
                  <span>{formatDia(m.createdAt)}</span>
                </div>
              )}
              <MessageBubble
                message={m}
                isMe={isMe}
                showAuthor={!continuaGrupo(prev, m)}
                groupEnd={!continuaGrupo(m, next)}
                onRetry={onRetry}
                onDiscard={onDiscard}
              />
            </Fragment>
          );
        })}
        <div ref={endRef} />
      </div>

      {sendError && <div className="chat__send-error" role="alert">{sendError}</div>}

      <form
        className="chat__composer"
        aria-busy={sending ? 'true' : 'false'}
        onSubmit={(e) => { e.preventDefault(); if (canSend) onSend(); }}
      >
        <div className="chat__input-wrap">
          <textarea
            ref={inputRef}
            className="chat__input"
            rows={1}
            value={draft}
            onChange={(e) => onDraftChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Escribe un mensaje a ${nombre}…`}
            maxLength={MAX_CHARS}
            aria-label={`Mensaje para ${nombre}`}
          />
          <div className="chat__composer-hint">
            <span className="chat__composer-keys">Enter para enviar · Shift + Enter para salto de línea</span>
            {restantes <= 100 && (
              <span className={`chat__composer-count ${restantes <= 20 ? 'chat__composer-count--low' : ''}`}>
                {restantes}
              </span>
            )}
          </div>
        </div>
        <Button
          type="submit"
          size="icon"
          className="chat__send"
          disabled={!canSend}
          aria-label={sending ? 'Enviando mensaje' : 'Enviar mensaje'}
        >
          {sending ? <Loader2 size={16} className="chat__spin" /> : <Send size={16} />}
        </Button>
      </form>
    </div>
  );
}
