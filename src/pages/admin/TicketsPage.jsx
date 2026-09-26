import TicketsBoard from '../../components/tickets/TicketsBoard';
import { PageHeader } from '../../components/ui';

export default function TicketsPage() {
  return (
    <div className="page">
      <PageHeader
        title="Tickets de soporte"
        description="Casos abiertos por clientes y conductores desde la app. Filtra por zona y estado, responde, cambia el estado o asigna un moderador."
      />
      <TicketsBoard area="admin" />
    </div>
  );
}
