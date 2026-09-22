import ConversationsBoard from '../../components/conversations/ConversationsBoard';
import { PageHeader } from '../../components/ui';
import { getContactableUsers } from '../../api/moderator';
import { useModeratorBadges } from '../../contexts/ModeratorBadgesContext';
import { useModeratorCity } from '../../contexts/ModeratorCityContext';

// Referencia estable: el tablero la usa como dependencia de efectos.
// Con `q` el backend busca también clientes (mín. 3 caracteres).
const loadContacts = (q) => getContactableUsers({ limit: 50, q: q || undefined });

export default function ConversationsPage() {
  const { setOpenConversation } = useModeratorBadges();
  const { ciudad } = useModeratorCity();
  return (
    <div className="page">
      <PageHeader title="Conversatorio" description="Mensajes con conductores, clientes, el administrador y otros moderadores." />
      <ConversationsBoard
        getContacts={loadContacts}
        onOpenConversation={setOpenConversation}
        defaultCity={ciudad && ciudad !== 'general' ? ciudad : undefined}
      />
    </div>
  );
}
