import { Loader2 } from 'lucide-react';
import { Avatar, Badge, Button, Modal, SearchInput } from '../ui';
import { ROL_BADGE, fullNameOf, getRolEtiqueta } from './conversationUtils';

function ContactRow({ name, subtitle, etiqueta, avatar, onCreate, disabled, existe }) {
  const rol = ROL_BADGE[etiqueta];
  return (
    <div className="chat-contact">
      <Avatar src={avatar} name={name} size={32} />
      <div className="chat-contact__text">
        <div className="row">
          <span className="text-strong truncate">{name}</span>
          <Badge variant={rol.variant} size="sm">{rol.label}</Badge>
          {existe && <span className="chat-contact__hint">Ya tienen conversación</span>}
        </div>
        <span className="text-sm text-muted truncate">{subtitle}</span>
      </div>
      <Button size="sm" variant="soft-primary" onClick={onCreate} disabled={disabled}>
        {existe ? 'Abrir' : 'Crear'}
      </Button>
    </div>
  );
}

/**
 * Selector de contacto para iniciar una conversación.
 * `internal`: contactos internos (admin / moderadores); `platform`: conductores de la zona.
 * La búsqueda es del servidor (nombre, apellido, teléfono y correo). Los clientes no
 * salen aquí: el moderador solo los contacta desde un ticket, un SOS o una disputa.
 */
export default function NewConversationModal({
  isOpen, onClose, search, onSearchChange, searching, internal, platform, error, creating, onCreate, yaExiste,
}) {
  const empty = internal.length === 0 && platform.length === 0;
  const q = (search || '').trim();

  return (
    <Modal
      isOpen={isOpen}
      onClose={creating ? undefined : onClose}
      title="Nueva conversación"
      description="Conductores de tu zona, administrador o moderadores de otras ciudades."
      footer={<Button variant="secondary" onClick={onClose} disabled={creating}>Cerrar</Button>}
    >
      <div className="stack">
        <SearchInput value={search} onChange={onSearchChange} placeholder="Buscar por nombre, apellido, teléfono o correo" />

        {searching && (
          <p className="chat__searching">
            <Loader2 size={14} /> Buscando…
          </p>
        )}
        {error && <div className="page-error" role="alert">{error}</div>}

        {internal.length > 0 && (
          <div className="stack">
            <p className="section-title chat-contact__section">Equipo <span className="chat__section-count">{internal.length}</span></p>
            {internal.map((c, i) => {
              // Igual que en la lista de usuarios: el contacto puede llegar envuelto
              // en { usuario, viajeId } según el endpoint que lo devuelva.
              const co = c.usuario || c;
              return (
                <ContactRow
                  key={`i-${co.id ?? i}`}
                  name={fullNameOf(co) || co.nombre || 'Usuario'}
                  subtitle={[co.email, co.zonaModerador || (co.rol === 'admin' ? 'Nacional' : null)]
                    .filter(Boolean).join(' · ') || '—'}
                  etiqueta={getRolEtiqueta(co)}
                  avatar={co.avatar}
                  existe={Boolean(yaExiste?.(co.id))}
                  onCreate={() => onCreate(co, c.viajeId)}
                  disabled={creating}
                />
              );
            })}
          </div>
        )}

        {platform.length > 0 && (
          <div className="stack">
            <p className="section-title chat-contact__section">Conductores <span className="chat__section-count">{platform.length}</span></p>
            {platform.map((u, i) => {
              const uo = u.usuario || u;
              return (
                <ContactRow
                  key={`p-${uo.id ?? i}-${u.viajeId ?? ''}`}
                  name={fullNameOf(uo) || 'Usuario'}
                  subtitle={[uo.email, uo.telefono, uo.ciudad].filter(Boolean).join(' · ') || '—'}
                  etiqueta={getRolEtiqueta(uo)}
                  avatar={uo.avatar}
                  existe={Boolean(yaExiste?.(uo.id))}
                  onCreate={() => onCreate(uo, u.viajeId)}
                  disabled={creating}
                />
              );
            })}
          </div>
        )}

        {empty && !searching && (
          <p className="text-sm text-muted chat__placeholder">
            {q ? `Sin resultados para “${q}”` : 'No hay contactos disponibles'}
          </p>
        )}
      </div>
    </Modal>
  );
}
