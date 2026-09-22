import ConversationsBoard from '../../components/conversations/ConversationsBoard';
import { PageHeader } from '../../components/ui';
import { getContactableUsers } from '../../api/moderator';

// Referencia estable: el tablero la usa como dependencia de efectos.
// Con `q` el backend busca también clientes (mín. 3 caracteres).
const loadContacts = (q) => getContactableUsers({ limit: 50, q: q || undefined });

// Ciudad de la conversación: la zona del contacto; si no tiene, la del usuario actual.
// Si ninguna existe se envía vacía y el backend decide.
const createCity = (contact, myCity) =>
  contact?.zonaModerador || contact?.zona_moderador || contact?.ciudad || myCity;

export default function AdminConversationsPage() {
  return (
    <div className="page">
      <PageHeader title="Conversatorio" description="Mensajes con moderadores, conductores y clientes." />
      <ConversationsBoard getContacts={loadContacts} createCity={createCity} />
    </div>
  );
}
