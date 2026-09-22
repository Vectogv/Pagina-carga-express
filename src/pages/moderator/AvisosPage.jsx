import AvisosBoard from '../../components/avisos/AvisosBoard';
import { PageHeader } from '../../components/ui';

export default function ModeratorAvisosPage() {
  return (
    <div className="page">
      <PageHeader title="Avisos" description="Mensajes cortos para los conductores de tu ciudad. Los avisos fijados aparecen primero." />
      <AvisosBoard variante="ciudad" />
    </div>
  );
}
