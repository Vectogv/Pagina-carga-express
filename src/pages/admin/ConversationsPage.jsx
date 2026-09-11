import ConversationsBoard from '../../components/conversations/ConversationsBoard';
import { getContactableUsers } from '../../api/moderator';

export default function AdminConversationsPage() {
  return (
    <ConversationsBoard
      getContacts={() => getContactableUsers({ limit: 50 })}
      createCity={(contact) => (contact?.zonaModerador || contact?.zona_moderador || contact?.ciudad || 'cali')}
    />
  );
}