import AvisosBoard from '../../components/avisos/AvisosBoard';
import { PageHeader } from '../../components/ui';

export default function AdminAvisosPage() {
  return (
    <div className="page">
      <PageHeader title="Avisos" description="Mensajes cortos visibles para los conductores. Los avisos fijados aparecen primero." />
      <AvisosBoard variante="admin" />
    </div>
  );
}
