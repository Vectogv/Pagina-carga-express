import { useCallback, useEffect, useMemo, useState } from 'react';
import { MapPin, Maximize2, Plus, Save, Trash2, RotateCcw } from 'lucide-react';
import { getCoverage, updateCoverage } from '../../../api/admin';
import { errorMessage, toList } from '../../../utils/format';
import { Card, Input, Select, Button, Badge, LoadingState, EmptyState, Alert } from '../../../components/ui';
import OperationsMapOverlay from '../../../components/maps/OperationsMapOverlay';
import './CoverageConfig.css';

const KM_PER_DEG = 111.32;
const RADIO_MIN = 0.2;
const RADIO_MAX = 300;

/** "2.4448, -76.6147" (formato de Google Maps) → { lat, lng } | null */
function parsePoint(text) {
  const m = String(text || '').trim().match(/^(-?\d+(?:\.\d+)?)\s*[,;\s]\s*(-?\d+(?:\.\d+)?)$/);
  if (!m) return null;
  const lat = Number(m[1]);
  const lng = Number(m[2]);
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

/** Radio en km escrito por el admin → número válido | null */
function parseRadio(text) {
  const n = Number(String(text ?? '').trim().replace(',', '.'));
  if (!Number.isFinite(n) || n <= 0 || n > RADIO_MAX) return null;
  return n;
}

const fmt = (n) => Number(n).toFixed(5).replace(/0+$/, '').replace(/\.$/, '');
const numero = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 });

/** Zona del backend → fila editable (rectángulo con dos esquinas o círculo con centro y radio). */
function toRow(z, i) {
  const base = {
    key: `${z.clave || z.nombre}-${i}`,
    nombre: z.nombre || '',
    activa: z.activa !== false,
  };
  if (z.tipo === 'circulo' || (z.radio !== undefined && z.norte === undefined)) {
    return {
      ...base,
      tipo: 'circulo',
      centro: `${fmt(z.lat ?? z.centro?.lat)}, ${fmt(z.lng ?? z.centro?.lng)}`,
      radio: String(z.radio),
      desde: '',
      hasta: '',
    };
  }
  return {
    ...base,
    tipo: 'rect',
    centro: '',
    radio: '',
    desde: `${fmt(z.norte)}, ${fmt(z.oeste)}`,
    hasta: `${fmt(z.sur)}, ${fmt(z.este)}`,
  };
}

/** Dos esquinas cualesquiera → límites del rectángulo. */
function boundsOf(row) {
  const a = parsePoint(row.desde);
  const b = parsePoint(row.hasta);
  if (!a || !b) return null;
  const bounds = {
    norte: Math.max(a.lat, b.lat),
    sur: Math.min(a.lat, b.lat),
    este: Math.max(a.lng, b.lng),
    oeste: Math.min(a.lng, b.lng),
  };
  if (bounds.norte === bounds.sur || bounds.este === bounds.oeste) return null;
  return bounds;
}

/** Fila → figura normalizada como la entiende el backend, o null si aún está incompleta. */
function shapeOf(row) {
  if (row.tipo === 'circulo') {
    const centro = parsePoint(row.centro);
    const radio = parseRadio(row.radio);
    if (!centro || !radio) return null;
    return { tipo: 'circulo', lat: centro.lat, lng: centro.lng, radio };
  }
  const bounds = boundsOf(row);
  return bounds ? { tipo: 'rect', ...bounds } : null;
}

const sizeKm = (b) => ({
  alto: (b.norte - b.sur) * KM_PER_DEG,
  ancho: (b.este - b.oeste) * KM_PER_DEG * Math.cos((((b.norte + b.sur) / 2) * Math.PI) / 180),
});

/** Círculo → rectángulo que lo contiene (para la vista previa y para cambiar de tipo). */
function circleBounds(shape) {
  const dLat = shape.radio / KM_PER_DEG;
  const dLng = shape.radio / (KM_PER_DEG * Math.max(0.05, Math.cos((shape.lat * Math.PI) / 180)));
  return {
    norte: shape.lat + dLat,
    sur: shape.lat - dLat,
    este: shape.lng + dLng,
    oeste: shape.lng - dLng,
  };
}

/** Resumen visible en la cabecera de cada zona. */
function describeShape(shape) {
  if (!shape) return null;
  if (shape.tipo === 'circulo') {
    const area = Math.PI * shape.radio * shape.radio;
    return `Radio ${numero.format(shape.radio)} km · ${numero.format(shape.radio * 2)} km de diámetro · ${numero.format(area)} km²`;
  }
  const size = sizeKm(shape);
  return `Área aprox. ${size.ancho.toFixed(1)} km × ${size.alto.toFixed(1)} km`;
}

function mapUrl(b) {
  // El mapa se encuadra exactamente sobre el área de la zona.
  const bbox = [b.oeste, b.sur, b.este, b.norte].map((n) => n.toFixed(5)).join(',');
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik`;
}

let rowSeq = 0;
const emptyRow = () => ({
  key: `new-${(rowSeq += 1)}`,
  nombre: '',
  activa: true,
  tipo: 'circulo',
  centro: '',
  radio: '',
  desde: '',
  hasta: '',
});

/** Cambio de tipo conservando lo ya escrito (rectángulo ⇄ círculo). */
function convertRow(row, tipo) {
  if (tipo === row.tipo) return {};
  const shape = shapeOf(row);
  if (tipo === 'circulo') {
    if (!shape || shape.tipo !== 'rect') return { tipo };
    const lat = (shape.norte + shape.sur) / 2;
    const lng = (shape.este + shape.oeste) / 2;
    // Radio que cubre todo el rectángulo (media diagonal), para no perder cobertura.
    const alto = (shape.norte - shape.sur) * KM_PER_DEG;
    const ancho = (shape.este - shape.oeste) * KM_PER_DEG * Math.cos((lat * Math.PI) / 180);
    const radio = Math.min(RADIO_MAX, Math.max(RADIO_MIN, Math.hypot(alto, ancho) / 2));
    return { tipo, centro: `${fmt(lat)}, ${fmt(lng)}`, radio: String(Math.round(radio * 100) / 100) };
  }
  if (!shape || shape.tipo !== 'circulo') return { tipo };
  const b = circleBounds(shape);
  return { tipo, desde: `${fmt(b.norte)}, ${fmt(b.oeste)}`, hasta: `${fmt(b.sur)}, ${fmt(b.este)}` };
}

function ZoneEditor({ row, onChange, onRemove, onOpenMap }) {
  const shape = shapeOf(row);
  const preview = shape ? (shape.tipo === 'circulo' ? circleBounds(shape) : shape) : null;
  const esCirculo = row.tipo === 'circulo';

  const centroError = row.centro && !parsePoint(row.centro) ? 'Formato: latitud, longitud' : '';
  const radioError = row.radio && !parseRadio(row.radio) ? `Entre ${RADIO_MIN} y ${RADIO_MAX} km` : '';
  const desdeError = row.desde && !parsePoint(row.desde) ? 'Formato: latitud, longitud' : '';
  const hastaError = row.hasta && !parsePoint(row.hasta) ? 'Formato: latitud, longitud' : '';

  return (
    <Card
      title={row.nombre || 'Nueva zona'}
      description={describeShape(shape) || (esCirculo ? 'Marca el centro y el radio de la zona' : 'Define las dos esquinas del área de operación')}
      actions={(
        <>
          <Badge variant={esCirculo ? 'info' : 'neutral'}>{esCirculo ? 'Radio' : 'Rectángulo'}</Badge>
          <Badge variant={row.activa ? 'success' : 'neutral'}>{row.activa ? 'Operando' : 'Pausada'}</Badge>
          <Button size="sm" variant="secondary" icon={<Maximize2 size={15} />} onClick={onOpenMap} aria-label={`Abrir el mapa de ${row.nombre || 'la nueva zona'}`}>
            Abrir mapa
          </Button>
          <Button size="icon" variant="ghost" onClick={onRemove} aria-label={`Eliminar zona ${row.nombre}`}>
            <Trash2 size={15} />
          </Button>
        </>
      )}
    >
      <div className="coverage__grid">
        <div className="stack">
          <div className="coverage__row">
            <Input
              label="Ciudad / zona"
              value={row.nombre}
              onChange={(e) => onChange({ nombre: e.target.value })}
              placeholder="Ej: Cali"
              required
            />
            <Select
              label="Forma de la zona"
              value={row.tipo}
              onChange={(e) => onChange(convertRow(row, e.target.value))}
              helperText={esCirculo ? 'Centro y kilómetros' : 'Dos esquinas opuestas'}
            >
              <option value="circulo">Radio</option>
              <option value="rect">Rectángulo</option>
            </Select>
          </div>

          {esCirculo ? (
            <>
              <Input
                label="Centro (latitud, longitud)"
                value={row.centro}
                onChange={(e) => onChange({ centro: e.target.value })}
                placeholder="2.44480, -76.61470"
                error={centroError}
                helperText="Pega la coordenada desde Google Maps o márcala en el mapa"
              />
              <Input
                label="Radio (km)"
                type="number"
                min={RADIO_MIN}
                max={RADIO_MAX}
                step={0.1}
                value={row.radio}
                onChange={(e) => onChange({ radio: e.target.value })}
                placeholder="8"
                error={radioError}
              />
            </>
          ) : (
            <>
              <Input
                label="Desde (esquina noroeste)"
                value={row.desde}
                onChange={(e) => onChange({ desde: e.target.value })}
                placeholder="3.5200, -76.6000"
                error={desdeError}
                helperText="Pega la coordenada desde Google Maps"
              />
              <Input
                label="Hasta (esquina sureste)"
                value={row.hasta}
                onChange={(e) => onChange({ hasta: e.target.value })}
                placeholder="3.3300, -76.4500"
                error={hastaError}
              />
            </>
          )}

          <label className="coverage__toggle">
            <input type="checkbox" checked={row.activa} onChange={(e) => onChange({ activa: e.target.checked })} />
            <span>Zona operando (acepta viajes)</span>
          </label>

          {shape && shape.tipo === 'rect' && (
            <dl className="coverage__bounds">
              <div><dt>Norte</dt><dd>{fmt(shape.norte)}</dd></div>
              <div><dt>Sur</dt><dd>{fmt(shape.sur)}</dd></div>
              <div><dt>Oeste</dt><dd>{fmt(shape.oeste)}</dd></div>
              <div><dt>Este</dt><dd>{fmt(shape.este)}</dd></div>
            </dl>
          )}
          {shape && shape.tipo === 'circulo' && (
            <dl className="coverage__bounds">
              <div><dt>Latitud</dt><dd>{fmt(shape.lat)}</dd></div>
              <div><dt>Longitud</dt><dd>{fmt(shape.lng)}</dd></div>
              <div><dt>Radio</dt><dd>{numero.format(shape.radio)} km</dd></div>
              <div><dt>Área</dt><dd>{numero.format(Math.PI * shape.radio * shape.radio)} km²</dd></div>
            </dl>
          )}
        </div>

        <div className="coverage__map">
          {preview ? (
            <>
              <iframe title={`Mapa de ${row.nombre || 'la zona'}`} src={mapUrl(preview)} loading="lazy" />
              <Button
                size="sm"
                variant="secondary"
                icon={<Maximize2 size={14} />}
                className="coverage__map-open"
                onClick={onOpenMap}
                aria-label={`Abrir el mapa a pantalla completa para ${row.nombre || 'la nueva zona'}`}
              >
                Abrir mapa
              </Button>
            </>
          ) : (
            <div className="coverage__map-empty">
              <MapPin size={20} />
              <span>
                {esCirculo
                  ? 'Abre el mapa para marcar el centro y dibujar el radio'
                  : 'El mapa aparece al completar las dos esquinas'}
              </span>
              <Button size="sm" variant="secondary" icon={<Maximize2 size={14} />} onClick={onOpenMap}>
                Abrir mapa
              </Button>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

/**
 * PUT /api/admin/config/coverage con zonas rectangulares
 * ({ nombre, activa, norte, sur, este, oeste }) o circulares
 * ({ nombre, activa, tipo: 'circulo', lat, lng, radio }, radio en km).
 */
export default function CoverageConfig({ notify }) {
  const [rows, setRows] = useState([]);
  const [initial, setInitial] = useState('[]');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [backendDesactualizado, setBackendDesactualizado] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mapaDe, setMapaDe] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    setBackendDesactualizado(false);
    try {
      const res = await getCoverage();
      const next = toList(res.data, 'zonasCobertura').map(toRow);
      setRows(next);
      setInitial(JSON.stringify(next));
    } catch (err) {
      // Si falta el endpoint, el backend todavía es el anterior: guardar zonas en
      // el formato nuevo dejaría la cobertura ilegible y bloquearía los viajes.
      if (err?.response?.status === 404) setBackendDesactualizado(true);
      else setLoadError(errorMessage(err, 'No se pudieron cargar las zonas'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const dirty = useMemo(() => JSON.stringify(rows) !== initial, [rows, initial]);
  const update = (key, patch) => setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const remove = (key) => {
    setRows((prev) => prev.filter((r) => r.key !== key));
    setMapaDe((actual) => (actual === key ? null : actual));
  };

  const filaDelMapa = rows.find((r) => r.key === mapaDe) || null;
  const figuraDelMapa = filaDelMapa ? shapeOf(filaDelMapa) : null;

  // Zonas de las demás filas, para dibujarlas como referencia y no solaparlas.
  const otrasZonas = useMemo(() => {
    if (!mapaDe) return [];
    return rows
      .filter((r) => r.key !== mapaDe)
      .map((r) => {
        const s = shapeOf(r);
        return s ? { ...s, nombre: r.nombre, activa: r.activa } : null;
      })
      .filter(Boolean);
  }, [rows, mapaDe]);

  /** El mapa solo devuelve datos al editor: guardar sigue siendo el botón «Guardar zonas». */
  const aplicarDesdeElMapa = ({ lat, lng, radio }) => {
    if (!mapaDe) return;
    update(mapaDe, { tipo: 'circulo', centro: `${fmt(lat)}, ${fmt(lng)}`, radio: String(radio) });
    setMapaDe(null);
    notify('Radio aplicado a la zona. Pulsa «Guardar zonas» para publicarlo.');
  };

  const handleSave = async () => {
    if (backendDesactualizado) {
      return notify('El servidor aún no admite este formato de zonas. Despliega el backend antes de guardar.', 'danger');
    }
    const payload = [];
    for (const r of rows) {
      const shape = shapeOf(r);
      if (!r.nombre.trim()) return notify('Cada zona necesita un nombre', 'danger');
      if (!shape) {
        return notify(
          r.tipo === 'circulo'
            ? `${r.nombre}: revisa el centro (latitud, longitud) y el radio en km`
            : `${r.nombre}: revisa las dos esquinas (latitud, longitud)`,
          'danger',
        );
      }
      payload.push({ nombre: r.nombre.trim(), activa: r.activa, ...shape });
    }
    setSaving(true);
    try {
      const res = await updateCoverage({ zonasCobertura: payload });
      const next = toList(res.data, 'zonasCobertura').map(toRow);
      setRows(next);
      setInitial(JSON.stringify(next));
      notify('Zonas de operación guardadas');
    } catch (err) {
      notify(errorMessage(err, 'Error al guardar la cobertura'), 'danger');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingState message="Cargando zonas…" />;

  return (
    <div className="stack">
      <Card
        title="Zonas de operación"
        description="Cada ciudad se define con un radio (centro y kilómetros) o con un rectángulo (esquina noroeste y sureste). Solo se aceptan viajes que empiecen dentro de una zona activa. Sin zonas, la plataforma acepta viajes en cualquier lugar."
        actions={(
          <>
            {dirty && (
              <Button variant="ghost" icon={<RotateCcw size={15} />} onClick={() => setRows(JSON.parse(initial))} disabled={saving}>
                Descartar
              </Button>
            )}
            <Button icon={<Save size={15} />} onClick={handleSave} loading={saving} disabled={!dirty || backendDesactualizado}>
              Guardar zonas
            </Button>
          </>
        )}
      >
        <p className="text-sm text-secondary">
          Usa «Abrir mapa» para marcar el centro con un clic y ajustar el radio arrastrando el tirador; verás la distancia
          y el área cubierta. También puedes pegar coordenadas de Google Maps (clic derecho sobre el punto y toca la
          coordenada, por ejemplo <span className="text-mono">3.5200, -76.6000</span>). La clave de cada zona (p. ej.{' '}
          <span className="text-mono">popayan</span>) es la misma que se asigna a moderadores y conductores.
        </p>
      </Card>

      {backendDesactualizado && (
        <Alert variant="warning" title="El servidor todavía no admite este formato">
          Este editor guarda cada ciudad como un radio o un rectángulo, y la versión del servidor en línea aún espera el
          formato anterior. Despliega el backend actualizado antes de guardar zonas: si se guardan ahora, el servidor no
          podría leerlas y rechazaría todos los viajes.
        </Alert>
      )}

      {loadError && (
        <div className="page-error" role="alert">
          <span>{loadError}</span>
          <Button size="sm" variant="ghost" onClick={load}>Reintentar</Button>
        </div>
      )}

      {rows.length === 0 && !loadError && !backendDesactualizado && (
        <Card>
          <EmptyState
            icon={<MapPin size={22} />}
            title="Sin zonas configuradas"
            description="Agrega la primera ciudad donde opera Carga Express."
          />
        </Card>
      )}

      {rows.map((row) => (
        <ZoneEditor
          key={row.key}
          row={row}
          onChange={(patch) => update(row.key, patch)}
          onRemove={() => remove(row.key)}
          onOpenMap={() => setMapaDe(row.key)}
        />
      ))}

      <div className="row">
        <Button variant="secondary" icon={<Plus size={15} />} onClick={() => setRows((prev) => [...prev, emptyRow()])}>
          Agregar zona
        </Button>
      </div>

      <OperationsMapOverlay
        open={!!filaDelMapa}
        onClose={() => setMapaDe(null)}
        zoneName={filaDelMapa?.nombre || ''}
        initialCircle={figuraDelMapa?.tipo === 'circulo' ? figuraDelMapa : null}
        referenceRect={figuraDelMapa?.tipo === 'rect' ? figuraDelMapa : null}
        otherZones={otrasZonas}
        onApply={aplicarDesdeElMapa}
      />
    </div>
  );
}
