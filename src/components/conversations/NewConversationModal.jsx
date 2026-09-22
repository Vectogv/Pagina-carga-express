import { Avatar, Badge, Button, Modal, SearchInput } from '../ui';
import { ROL_BADGE, fullNameOf, getRolEtiqueta } from './conversationUtils';

function ContactRow({ name, subtitle, etiqueta, avatar, onCreate, disabled }) {
  const rol = ROL_BADGE[etiqueta];
  return (
    <div className="chat-contact">
      <Avatar src={avatar} name={name} size={32} />
      <div className="chat-contact__text">
        <div className="row">
          <span className="text-strong truncate">{name}</span>
          <Badge variant={rol.variant} size="sm">{rol.label}</Badge>
        </div>
        <span className="text-sm text-muted truncate">{subtitle}</span>
      </div>
      <Button size="sm" variant="soft-primary" onClick={onCreate} disabled={disabled}>Crear</Button>
    </div>
  );
}

/**
 * Selector de contacto para iniciar una conversación.
 * `internal`: contactos internos (admin / moderadores); `platform`: usuarios de la plataforma.
 */
export default function NewConversationModal({
  isOpen, onClose, search, onSearchChange, internal, platform, error, creating, onCreate,
}) {
  const empty = internal.length === 0 && platform.length === 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={creating ? undefined : onClose}
      title="Nueva conversación"
      description="Conductores, clientes, admin o moderadores de otras ciudades."
      footer={<Button variant="secondary" onClick={onClose} disabled={creating}>Cerrar</Button>}
    >
      <div className="stack">
        <SearchInput value={search} onChange={onSearchChange} placeholder="Buscar por nombre, correo o teléfono (clientes: mín. 3 letras)" />
        {error && <div className="page-error" role="alert">{error}</div>}

        {internal.length > 0 && (
          <div className="stack">
            <p className="section-title">Internos</p>
            {internal.map((c) => (
              <ContactRow
                key={`i-${c.id}`}
                name={c.nombre}
                subtitle={`${c.email || ''} · ${c.zonaModerador || (c.rol === 'admin' ? 'Nacional' : '—')}`}
                etiqueta={c.esModerador ? 'MODERADOR' : 'ADMIN'}
                avatar={c.avatar}
                onCreate={() => onCreate(c, undefined)}
                disabled={creating}
              />
            ))}
          </div>
        )}

        {platform.length > 0 && (
          <div className="stack">
            <p className="section-title">Usuarios</p>
            {platform.map((u, i) => {
              const uo = u.usuario || u;
              return (
                <ContactRow
                  key={`p-${uo.id ?? i}-${u.viajeId ?? ''}`}
                  name={fullNameOf(uo) || 'Usuario'}
                  subtitle={`${uo.email || ''} · ${uo.ciudad || '—'}`}
                  etiqueta={getRolEtiqueta(uo)}
                  avatar={uo.avatar}
                  onCreate={() => onCreate(uo, u.viajeId)}
                  disabled={creating}
                />
              );
            })}
          </div>
        )}

        {empty && (
          <p className="text-sm text-muted chat__placeholder">
            {search ? `Sin resultados para “${search}”` : 'No hay contactos disponibles'}
          </p>
        )}
      </div>
    </Modal>
  );
}
