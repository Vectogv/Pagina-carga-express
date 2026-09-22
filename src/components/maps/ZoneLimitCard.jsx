import { useMemo, useState } from 'react';
import { Maximize2, MapPin, Ruler, TriangleAlert } from 'lucide-react';
import { Badge, Button, Card } from '../ui';
import { useZonasCompletas } from '../../hooks/useZonas';
import OperationsMapOverlay from './OperationsMapOverlay';

const numero = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 });
const coord = (n) => Number(n).toFixed(5);
const KM_POR_GRADO = 111.32;

const claveDe = (v) => String(v || '')
  .normalize('NFD')
  .replace(/[̀-ͯ]/g, '')
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '_')
  .replace(/^_+|_+$/g, '');

/** Ancho y alto aproximados de un rectángulo, en kilómetros. */
const tamanoRect = (z) => ({
  alto: (z.norte - z.sur) * KM_POR_GRADO,
  ancho: (z.este - z.oeste) * KM_POR_GRADO * Math.cos((((z.norte + z.sur) / 2) * Math.PI) / 180),
});

/**
 * Límite de la zona donde opera quien mira (solo lectura).
 *
 * La zona la define el administrador en Configuración → Cobertura; aquí solo se
 * muestra. El backend acepta viajes únicamente si empiezan dentro de este
 * límite, así que conviene que el moderador lo tenga a la vista.
 */
export default function ZoneLimitCard({ zonaClave, title = 'Tu zona de operación' }) {
  const { zonas, cargando } = useZonasCompletas();
  const [abierto, setAbierto] = useState(false);

  const clave = claveDe(zonaClave);
  const zona = useMemo(
    () => (clave ? zonas.find((z) => claveDe(z.clave || z.nombre) === clave) || null : null),
    [zonas, clave],
  );

  const esCirculo = zona?.tipo === 'circulo' || (zona && zona.radio != null && zona.norte == null);

  let cuerpo;
  if (cargando) {
    cuerpo = <p className="text-sm text-muted">Cargando la zona…</p>;
  } else if (!clave || clave === 'general') {
    cuerpo = (
      <p className="text-sm text-muted">
        Tu cuenta no tiene una ciudad asignada, así que ves la operación completa. Si esto no es lo que esperabas,
        pídele al administrador que te asigne una zona.
      </p>
    );
  } else if (zonas.length === 0) {
    cuerpo = (
      <p className="text-sm text-secondary">
        <TriangleAlert size={14} aria-hidden="true" /> El administrador todavía no ha configurado ninguna zona de
        cobertura, así que por ahora se aceptan viajes en cualquier ubicación.
      </p>
    );
  } else if (!zona) {
    cuerpo = (
      <p className="text-sm text-secondary">
        <TriangleAlert size={14} aria-hidden="true" /> Tu zona (<span className="text-mono">{clave}</span>) no está entre
        las configuradas. Pídele al administrador que la cree o que te reasigne.
      </p>
    );
  } else if (esCirculo) {
    const area = Math.PI * zona.radio * zona.radio;
    cuerpo = (
      <dl className="detail-list">
        <div className="detail-list__item">
          <span className="detail-list__label">Centro</span>
          <span className="detail-list__value text-mono">{coord(zona.lat)}, {coord(zona.lng)}</span>
        </div>
        <div className="detail-list__item">
          <span className="detail-list__label">Radio</span>
          <span className="detail-list__value text-mono">{numero.format(zona.radio)} km</span>
        </div>
        <div className="detail-list__item">
          <span className="detail-list__label">Distancia cubierta</span>
          <span className="detail-list__value text-mono">{numero.format(zona.radio * 2)} km de diámetro</span>
        </div>
        <div className="detail-list__item">
          <span className="detail-list__label">Área aproximada</span>
          <span className="detail-list__value text-mono">{numero.format(area)} km²</span>
        </div>
      </dl>
    );
  } else {
    const t = tamanoRect(zona);
    cuerpo = (
      <dl className="detail-list">
        <div className="detail-list__item">
          <span className="detail-list__label">Límites</span>
          <span className="detail-list__value text-mono">
            N {coord(zona.norte)} · S {coord(zona.sur)}
          </span>
        </div>
        <div className="detail-list__item">
          <span className="detail-list__label" />
          <span className="detail-list__value text-mono">
            O {coord(zona.oeste)} · E {coord(zona.este)}
          </span>
        </div>
        <div className="detail-list__item">
          <span className="detail-list__label">Tamaño</span>
          <span className="detail-list__value text-mono">
            {t.ancho.toFixed(1)} km × {t.alto.toFixed(1)} km
          </span>
        </div>
      </dl>
    );
  }

  return (
    <>
      <Card
        title={title}
        description={zona
          ? 'Solo se aceptan viajes que empiecen dentro de este límite.'
          : 'Zona asignada a tu cuenta.'}
        actions={(
          <>
            {zona && <Badge variant={esCirculo ? 'info' : 'neutral'}>{esCirculo ? 'Radio' : 'Rectángulo'}</Badge>}
            {zona && <Badge variant={zona.activa === false ? 'neutral' : 'success'}>{zona.activa === false ? 'Pausada' : 'Operando'}</Badge>}
            {zona && (
              <Button
                size="sm"
                variant="secondary"
                icon={<Maximize2 size={15} />}
                onClick={() => setAbierto(true)}
                aria-label={`Ver en el mapa el límite de ${zona.nombre}`}
              >
                Ver en el mapa
              </Button>
            )}
          </>
        )}
      >
        <div className="stack">
          <p className="row text-sm text-secondary">
            {zona ? <MapPin size={14} aria-hidden="true" /> : <Ruler size={14} aria-hidden="true" />}
            <span>{zona?.nombre || 'Sin zona'}</span>
          </p>
          {cuerpo}
        </div>
      </Card>

      {zona && (
        <OperationsMapOverlay
          open={abierto}
          onClose={() => setAbierto(false)}
          readOnly
          zoneName={zona.nombre}
          initialCircle={esCirculo ? { lat: Number(zona.lat), lng: Number(zona.lng), radio: Number(zona.radio) } : null}
          referenceRect={esCirculo ? null : {
            norte: Number(zona.norte), sur: Number(zona.sur), este: Number(zona.este), oeste: Number(zona.oeste),
          }}
          otherZones={[]}
        />
      )}
    </>
  );
}
