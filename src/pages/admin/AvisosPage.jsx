import AvisosBoard from '../../components/avisos/AvisosBoard';
import { PageHeader } from '../../components/ui';

export default function AdminAvisosPage() {
  return (
    <div className="page">
      <PageHeader title="Avisos" description="Tablón interno del equipo (administración, moderadores y líderes): mensajes cortos que se publican al instante, sin aprobación. Los fijados aparecen primero. No envía notificaciones; para avisar a todos los usuarios de la app usa Comunicados." />
      <AvisosBoard variante="admin" />
    </div>
  );
}
