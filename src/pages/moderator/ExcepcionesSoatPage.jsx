import { getSoatExcepciones, resolveSoatException } from '../../api/moderator';
import { PageHeader } from '../../components/ui';
import ExcepcionesSoat from '../../components/verificacion/ExcepcionesSoat';

export default function ExcepcionesSoatPage() {
  return (
    <div className="page">
      <PageHeader title="Excepciones de SOAT" description="Conductores de tu zona que piden verificarse sin SOAT. Aprueba o rechaza cada solicitud." />
      <ExcepcionesSoat cargar={getSoatExcepciones} resolver={resolveSoatException} />
    </div>
  );
}
