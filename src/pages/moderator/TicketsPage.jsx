import TicketsBoard from '../../components/tickets/TicketsBoard';
import { PageHeader } from '../../components/ui';

export default function TicketsPage() {
  return (
    <div className="page">
      <PageHeader
        title="Tickets de soporte"
        description="Casos abiertos por clientes y conductores de tu ciudad. Toma el ticket, responde por el hilo y márcalo como resuelto."
      />
      <TicketsBoard area="moderator" />
    </div>
  );
}
