import { useCallback, useEffect, useMemo, useState } from 'react';
import { MapPin, Plus, Save, Trash2, RotateCcw } from 'lucide-react';
import { getCoverage, updateCoverage } from '../../../api/admin';
import { errorMessage, toList } from '../../../utils/format';
import { Card, Input, Button, Badge, LoadingState, EmptyState, Alert } from '../../../components/ui';
import './CoverageConfig.css';

const KM_PER_DEG = 111.32;

/** "2.4448, -76.6147" (formato de Google Maps) → { lat, lng } | null */
function parsePoint(text) {
  const m = String(text || '').trim().match(/^(-?\d+(?:\.\d+)?)\s*[,;\s]\s*(-?\d+(?:\.\d+)?)$/);
  if (!m) return null;
  const lat = Number(m[1]);
  const lng = Number(m[2]);
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

const fmt = (n) => Number(n).toFixed(5).replace(/0+$/, '').replace(/\.$/, '');

/** Zona del backend → fila editable con dos esquinas de texto. */
function toRow(z, i) {
  let { norte, sur, este, oeste } = z;
  let legacy = false;
  if (z.tipo === 'circulo') {
    // Zonas antiguas (círculo): se convierten al rectángulo que las contiene.
    const dLat = z.radio / KM_PER_DEG;
    const dLng = z.radio / (KM_PER_DEG * Math.cos((z.lat * Math.PI) / 180));
    norte = z.lat + dLat; sur = z.lat - dLat; este = z.lng + dLng; oeste = z.lng - dLng;
    legacy = true;
  }
  return {
    key: `${z.clave || z.nombre}-${i}`,
    nombre: z.nombre || '',
    activa: z.activa !== false,
    desde: `${fmt(norte)}, ${fmt(oeste)}`,
    hasta: `${fmt(sur)}, ${fmt(este)}`,
    legacy,
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

const sizeKm = (b) => ({
  alto: (b.norte - b.sur) * KM_PER_DEG,
  ancho: (b.este - b.oeste) * KM_PER_DEG * Math.cos((((b.norte + b.sur) / 2) * Math.PI) / 180),
});

function mapUrl(b) {
  // El mapa se encuadra exactamente sobre el rectángulo de la zona.
  const bbox = [b.oeste, b.sur, b.este, b.norte].map((n) => n.toFixed(5)).join(',');
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik`;
}

let rowSeq = 0;
const emptyRow = () => ({ key: `new-${(rowSeq += 1)}`, nombre: '', activa: true, desde: '', hasta: '', legacy: false });

function ZoneEditor({ row, onChange, onRemove }) {
  const bounds = boundsOf(row);
  const desdeError = row.desde && !parsePoint(row.desde) ? 'Formato: latitud, longitud' : '';
  const hastaError = row.hasta && !parsePoint(row.hasta) ? 'Formato: latitud, longitud' : '';
  const size = bounds ? sizeKm(bounds) : null;

  return (
    <Card
      title={row.nombre || 'Nueva zona'}
      description={size ? `Área aprox. ${size.ancho.toFixed(1)} km × ${size.alto.toFixed(1)} km` : 'Define las dos esquinas del área de operación'}
      actions={(
        <>
          <Badge variant={row.activa ? 'success' : 'neutral'}>{row.activa ? 'Operando' : 'Pausada'}</Badge>
          <Button size="icon" variant="ghost" onClick={onRemove} aria-label={`Eliminar zona ${row.nombre}`}>
            <Trash2 size={15} />
          </Button>
        </>
      )}
    >
      {row.legacy && (
        <p className="coverage__notice">
          Esta zona estaba configurada como círculo. Se convirtió al rectángulo que la contiene; revisa las esquinas y guarda.
        </p>
      )}

      <div className="coverage__grid">
        <div className="stack">
          <Input
            label="Ciudad / zona"
            value={row.nombre}
            onChange={(e) => onChange({ nombre: e.target.value })}
            placeholder="Ej: Cali"
            required
          />
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
          <label className="coverage__toggle">
            <input type="checkbox" checked={row.activa} onChange={(e) => onChange({ activa: e.target.checked })} />
            <span>Zona operando (acepta viajes)</span>
          </label>
          {bounds && (
            <dl className="coverage__bounds">
              <div><dt>Norte</dt><dd>{fmt(bounds.norte)}</dd></div>
              <div><dt>Sur</dt><dd>{fmt(bounds.sur)}</dd></div>
              <div><dt>Oeste</dt><dd>{fmt(bounds.oeste)}</dd></div>
              <div><dt>Este</dt><dd>{fmt(bounds.este)}</dd></div>
            </dl>
          )}
        </div>

        <div className="coverage__map">
          {bounds ? (
            <iframe title={`Mapa de ${row.nombre || 'la zona'}`} src={mapUrl(bounds)} loading="lazy" />
          ) : (
            <div className="coverage__map-empty">
              <MapPin size={20} />
              <span>El mapa aparece al completar las dos esquinas</span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

/** PUT /api/admin/config/coverage { zonasCobertura: [{ nombre, activa, norte, sur, este, oeste }] } */
export default function CoverageConfig({ notify }) {
  const [rows, setRows] = useState([]);
  const [initial, setInitial] = useState('[]');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [backendDesactualizado, setBackendDesactualizado] = useState(false);
  const [saving, setSaving] = useState(false);

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
  const remove = (key) => setRows((prev) => prev.filter((r) => r.key !== key));

  const handleSave = async () => {
    if (backendDesactualizado) {
      return notify('El servidor aún no admite este formato de zonas. Despliega el backend antes de guardar.', 'danger');
    }
    const payload = [];
    for (const r of rows) {
      const bounds = boundsOf(r);
      if (!r.nombre.trim()) return notify('Cada zona necesita un nombre', 'danger');
      if (!bounds) return notify(`${r.nombre}: revisa las dos esquinas (latitud, longitud)`, 'danger');
      payload.push({ nombre: r.nombre.trim(), activa: r.activa, ...bounds });
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
        description="Cada ciudad se define como un rectángulo: pega la esquina superior izquierda (noroeste) y la inferior derecha (sureste). Solo se aceptan viajes que empiecen dentro de una zona activa. Sin zonas, la plataforma acepta viajes en cualquier lugar."
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
          Para obtener una coordenada: en Google Maps haz clic derecho sobre el punto y toca la coordenada para copiarla
          (por ejemplo <span className="text-mono">3.5200, -76.6000</span>). La clave de cada zona (p. ej. <span className="text-mono">popayan</span>) es la
          misma que se asigna a moderadores y conductores.
        </p>
      </Card>

      {backendDesactualizado && (
        <Alert variant="warning" title="El servidor todavía no admite este formato">
          Este editor guarda cada ciudad como un rectángulo, y la versión del servidor en línea aún espera el formato
          anterior (centro y radio). Despliega el backend actualizado antes de guardar zonas: si se guardan ahora, el
          servidor no podría leerlas y rechazaría todos los viajes.
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
        <ZoneEditor key={row.key} row={row} onChange={(patch) => update(row.key, patch)} onRemove={() => remove(row.key)} />
      ))}

      <div className="row">
        <Button variant="secondary" icon={<Plus size={15} />} onClick={() => setRows((prev) => [...prev, emptyRow()])}>
          Agregar zona
        </Button>
      </div>
    </div>
  );
}
