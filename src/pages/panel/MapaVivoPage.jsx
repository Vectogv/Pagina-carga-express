import { PageHeader } from '../../components/ui';
import { MapaVivo } from '../../components/panel';
import { useModeratorCity } from '../../contexts/ModeratorCityContext';

// Solo dentro del ModeratorLayout (tiene el proveedor de ciudad): el admin que usa el panel
// del moderador filtra por la ciudad elegida arriba.
function MapaModerador() {
  const { ciudadParams } = useModeratorCity();
  return <MapaVivo area="moderator" paramsExtra={ciudadParams} />;
}

export default function MapaVivoPage({ area = 'admin' }) {
  return (
    <div className="page">
      <PageHeader title="Mapa en vivo" description="Conductores conectados con su última ubicación. Se actualiza cada 10 segundos." />
      {area === 'admin' ? <MapaVivo area="admin" /> : <MapaModerador />}
    </div>
  );
}
