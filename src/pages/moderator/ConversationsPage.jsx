import { useSearchParams } from 'react-router-dom';
import ConversationsBoard from '../../components/conversations/ConversationsBoard';
import { PageHeader } from '../../components/ui';
import { getContactableUsers } from '../../api/moderator';
import { useModeratorBadges } from '../../contexts/ModeratorBadgesContext';
import { useModeratorCity } from '../../contexts/ModeratorCityContext';

// Referencia estable: el tablero la usa como dependencia de efectos.
// El backend solo devuelve conductores de la zona y equipo (nunca clientes).
const loadContacts = (q) => getContactableUsers({ limit: 50, q: q || undefined });

export default function ConversationsPage() {
  const { setOpenConversation } = useModeratorBadges();
  const { ciudad } = useModeratorCity();
  // ?usuario=ID abre (o crea) el chat con ese usuario: viene de la ficha del conductor,
  // del detalle del viaje o del Equipo.
  const [searchParams] = useSearchParams();
  const abrirCon = searchParams.get('usuario') || null;
  return (
    <div className="page">
      <PageHeader
        title="Conversatorio"
        description="Mensajes con los conductores de tu zona, el administrador y otros moderadores. Con un cliente solo desde un ticket, un SOS o una disputa."
      />
      <ConversationsBoard
        getContacts={loadContacts}
        onOpenConversation={setOpenConversation}
        defaultCity={ciudad && ciudad !== 'general' ? ciudad : undefined}
        abrirCon={abrirCon}
      />
    </div>
  );
}
