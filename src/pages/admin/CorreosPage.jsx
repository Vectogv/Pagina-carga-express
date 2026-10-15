import { useEffect, useRef, useState } from 'react';
import { getPlantillasCorreo, updatePlantillaCorreo, sendCorreo } from '../../api/correo';
import { errorMessage, formatDateTime } from '../../utils/format';
import { useZonas } from '../../hooks/useZonas';
import { PageHeader, Card, Select, Input, Textarea, Alert, Button, LoadingState } from '../../components/ui';
import VistaPreviaCorreo from '../../components/panel/VistaPreviaCorreo';
import VariablesCorreo from '../../components/panel/VariablesCorreo';

/** Gerencia edita las plantillas de correo y puede enviarlas a los conductores de una zona. */
export default function CorreosPage() {
  const zonas = useZonas();
  const [plantillas, setPlantillas] = useState(null);
  const [variables, setVariables] = useState([]);
  const [clave, setClave] = useState('');
  const [form, setForm] = useState({ nombre: '', asunto: '', cuerpo: '', activo: true });
  const [zona, setZona] = useState('');
  const [para, setPara] = useState('');
  const [nombreLibre, setNombreLibre] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState(null);
  const [ok, setOk] = useState(null);
  const ultimo = useRef('cuerpo');

  const elegir = (lista, c) => {
    const p = lista.find((x) => x.clave === c) || lista[0];
    if (!p) return;
    setClave(p.clave);
    setForm({ nombre: p.nombre, asunto: p.asunto, cuerpo: p.cuerpo, activo: p.activo });
  };

  useEffect(() => {
    getPlantillasCorreo('admin')
      .then(({ data }) => {
        setPlantillas(data.data || []);
        setVariables(data.variables || []);
        elegir(data.data || [], '');
      })
      .catch((err) => setError(errorMessage(err, 'No se pudieron cargar las plantillas')));
  }, []);

  const actual = plantillas?.find((p) => p.clave === clave);
  const cambiado = actual && ['nombre', 'asunto', 'cuerpo', 'activo'].some((k) => actual[k] !== form[k]);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const insertar = (campo, fn) => setForm((f) => ({ ...f, [campo]: fn(f[campo]) }));

  const accion = async (fn, okMsg, errMsg) => {
    try {
      setOcupado(true);
      setError(null);
      setOk(null);
      setOk(await fn() || okMsg);
    } catch (err) {
      setError(errorMessage(err, errMsg));
    } finally {
      setOcupado(false);
    }
  };

  const guardar = () => accion(async () => {
    await updatePlantillaCorreo(clave, form);
    setPlantillas((l) => l.map((p) => (p.clave === clave ? { ...p, ...form, updatedAt: new Date().toISOString() } : p)));
  }, 'Plantilla guardada', 'No se pudo guardar la plantilla');

  const enviarZona = () => {
    if (!window.confirm(`¿Enviar "${form.asunto}" por correo a los conductores de ${zona}?`)) return;
    accion(async () => {
      const { data } = await sendCorreo('admin', { asunto: form.asunto, cuerpo: form.cuerpo, zona, destino: 'conductores' });
      return `Enviados: ${data.enviados} de ${data.total}. Omitidos: ${data.omitidos} (sin correo o sin cupo). Cupo restante hoy: ${data.cupoRestante}.`;
    }, '', 'No se pudo enviar el correo');
  };

  const enviarLibre = () => {
    if (!window.confirm(`¿Enviar "${form.asunto}" a ${para.trim()}?`)) return;
    accion(async () => {
      const { data } = await sendCorreo('admin', { asunto: form.asunto, cuerpo: form.cuerpo, email: para.trim(), nombre: nombreLibre.trim() });
      if (!data.enviados) throw new Error('No se envió: se acabó el cupo del día o el servicio de correo falló.');
      return `Correo enviado a ${para.trim()}. Cupo restante hoy: ${data.cupoRestante}.`;
    }, '', 'No se pudo enviar el correo');
  };

  if (!plantillas && !error) return <div className="page"><LoadingState /></div>;

  return (
    <div>
      <PageHeader
        title="Correos"
        description="Plantillas de correo con el logo de CargaExpress. Envíalas a un conductor desde su perfil (botón Correo) o a todos los de una zona desde aquí."
      />
      {error && <Alert variant="danger" onClose={() => setError(null)}>{error}</Alert>}
      {ok && <Alert variant="success" onClose={() => setOk(null)}>{ok}</Alert>}
      <Alert variant="info">
        Los correos salen de cargaexpressgv@gmail.com por Brevo (máximo 250 al día). Pueden llegar a spam hasta que CargaExpress tenga un dominio propio.
      </Alert>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16, marginTop: 12 }}>
        <Card title="Plantilla">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Select label="Plantilla" value={clave} onChange={(e) => elegir(plantillas, e.target.value)}>
              {(plantillas || []).map((p) => (
                <option key={p.clave} value={p.clave}>{p.nombre}{p.activo ? '' : ' (inactiva)'}</option>
              ))}
            </Select>
            {actual?.updatedAt && <span className="text-sm text-muted">Última edición: {formatDateTime(actual.updatedAt)}</span>}
            <Input label="Nombre" value={form.nombre} maxLength={100} onChange={set('nombre')} />
            <Input id="correo-asunto" onFocus={() => { ultimo.current = 'asunto'; }} label="Asunto" value={form.asunto} maxLength={150} onChange={set('asunto')} />
            <Textarea id="correo-cuerpo" onFocus={() => { ultimo.current = 'cuerpo'; }} label="Mensaje" value={form.cuerpo} maxLength={5000} rows={10} onChange={set('cuerpo')} />
            <VariablesCorreo variables={variables} ids={{ asunto: 'correo-asunto', cuerpo: 'correo-cuerpo' }} ultimo={ultimo} onInsert={insertar} />
            <label className="text-sm" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="checkbox" checked={form.activo} onChange={(e) => setForm((f) => ({ ...f, activo: e.target.checked }))} />
              Activa (se puede elegir al enviar)
            </label>
            <div>
              <Button onClick={guardar} disabled={ocupado || !cambiado || !form.nombre.trim() || !form.asunto.trim() || !form.cuerpo.trim()}>
                Guardar plantilla
              </Button>
            </div>
          </div>
        </Card>
        <Card title="Vista previa (con datos de ejemplo)">
          <VistaPreviaCorreo area="admin" asunto={form.asunto} cuerpo={form.cuerpo} />
        </Card>
      </div>
      <Card title="Enviar a los conductores de una zona" style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>
          <div style={{ minWidth: 220 }}>
            <Select label="Zona" value={zona} onChange={(e) => setZona(e.target.value)}>
              <option value="">Elige una zona…</option>
              {zonas.map((z) => <option key={z.value} value={z.value}>{z.label}</option>)}
            </Select>
          </div>
          <Button onClick={enviarZona} disabled={ocupado || !zona || !form.asunto.trim() || !form.cuerpo.trim()}>
            Enviar el texto de arriba
          </Button>
        </div>
        <p className="text-sm text-muted" style={{ marginTop: 8 }}>Máximo 100 correos por envío. Se envía el texto tal como está en el editor, aunque no lo hayas guardado.</p>
      </Card>
      <Card title="Enviar a cualquier correo" style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>
          <div style={{ minWidth: 240, flex: '1 1 240px' }}>
            <Input label="Para" type="email" required maxLength={254} placeholder="persona@gmail.com" value={para} onChange={(e) => setPara(e.target.value)} />
          </div>
          <div style={{ minWidth: 200, flex: '1 1 200px' }}>
            <Input label="Nombre (opcional, para {{nombre}})" maxLength={100} value={nombreLibre} onChange={(e) => setNombreLibre(e.target.value)} />
          </div>
          <Button onClick={enviarLibre} disabled={ocupado || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(para.trim()) || !form.asunto.trim() || !form.cuerpo.trim()}>
            Enviar el texto de arriba
          </Button>
        </div>
        <p className="text-sm text-muted" style={{ marginTop: 8 }}>Sirve para cualquier dirección, aunque no sea usuaria. Usa la plantilla, el asunto y el mensaje del editor de arriba (la vista previa muestra cómo se verá).</p>
      </Card>
    </div>
  );
}
