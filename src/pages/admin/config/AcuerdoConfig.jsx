import { useCallback, useEffect, useState } from 'react';
import { Alert, Badge, Button, Card, ConfirmDialog, Input, LoadingState, Textarea } from '../../../components/ui';
import {
  getAcuerdos, getConfigAcuerdo, getVerificacionesModeradores, guardarConfigAcuerdo, partirMarcadores, publicarAcuerdo, subirFirmaGerencia,
} from '../../../api/contrato';
import { resolveStorageUrl } from '../../../utils/storage';
import { limpiarFirma } from '../../../utils/limpiarFirma';
import { errorMessage, formatDateTime } from '../../../utils/format';
import DocumentoContrato from '../../../components/moderator/DocumentoContrato';
import '../../../components/moderator/ModeradorBloqueado.css';
import '../VerificacionesModeradoresPage.css';

const VACIO = { version: '', titulo: '', texto: '' };

/** Datos de gerencia que llenan el contrato. Se congelan en cada contrato al generarlo. */
function DatosGerencia({ notify }) {
  const [cfg, setCfg] = useState(null);
  const [form, setForm] = useState(null);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState('');

  const aplicar = (data) => {
    setCfg(data);
    setForm({
      nombreContratante: data.nombreContratante || '',
      cedulaContratante: data.cedulaContratante || '',
      porcentajeModerador: String(data.porcentajeModerador ?? 20),
      clausulaPenalSmmlv: String(data.clausulaPenalSmmlv ?? 2),
    });
  };
  useEffect(() => {
    getConfigAcuerdo().then(({ data }) => aplicar(data)).catch((err) => setError(errorMessage(err, 'No se pudieron cargar los datos de gerencia')));
  }, []);

  const set = (k, soloDigitos) => (e) => {
    const v = soloDigitos ? e.target.value.replace(/\D/g, '') : e.target.value;
    setForm((f) => ({ ...f, [k]: v }));
  };

  const guardar = async () => {
    setGuardando('datos');
    try {
      const { data } = await guardarConfigAcuerdo({
        nombreContratante: form.nombreContratante.trim(),
        cedulaContratante: form.cedulaContratante.trim() || null,
        porcentajeModerador: Number(form.porcentajeModerador),
        clausulaPenalSmmlv: Number(form.clausulaPenalSmmlv),
      });
      aplicar(data);
      notify('Datos del contrato guardados');
    } catch (err) {
      notify(errorMessage(err, 'No se pudieron guardar'), 'danger');
    } finally {
      setGuardando('');
    }
  };

  const subirFirma = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setGuardando('firma');
    try {
      const fd = new FormData();
      fd.append('firma', await limpiarFirma(file), 'firma.png');
      const { data } = await subirFirmaGerencia(fd);
      aplicar(data);
      notify('Firma de gerencia cargada');
    } catch (err) {
      notify(errorMessage(err, 'No se pudo subir la firma'), 'danger');
    } finally {
      setGuardando('');
    }
  };

  if (error) return <Alert variant="danger">{error}</Alert>;
  if (!form) return <LoadingState />;

  const pct = Number(form.porcentajeModerador);
  const penal = Number(form.clausulaPenalSmmlv);
  const valido = form.nombreContratante.trim().length >= 3
    && (!form.cedulaContratante || /^\d{6,10}$/.test(form.cedulaContratante))
    && form.porcentajeModerador !== '' && pct >= 0 && pct <= 100
    && penal > 0 && penal <= 1000;

  return (
    <Card
      title="Datos de gerencia para el contrato"
      description="Llenan el contrato del moderador. Cada contrato guarda los valores del momento en que se genera: cambiarlos aquí no altera los ya generados."
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {(!cfg.nombreContratante || !cfg.firmaGerenciaUrl) && (
          <Alert variant="warning">Sin el nombre del contratante y la firma de gerencia no se pueden generar contratos.</Alert>
        )}
        <Input label="Nombre del contratante" required value={form.nombreContratante} onChange={set('nombreContratante')} helperText="Titular de CargaExpress que firma el contrato." />
        <Input label="Cédula del contratante" inputMode="numeric" maxLength={10} value={form.cedulaContratante} onChange={set('cedulaContratante', true)} helperText="Opcional. Si la dejas vacía, el contrato no la menciona." />
        <Input label="Porcentaje del moderador (%)" required type="number" min={0} max={100} value={form.porcentajeModerador} onChange={set('porcentajeModerador')} helperText="Cláusula cuarta: se liquida cada mes contra cuenta de cobro." />
        <Input label="Cláusula penal (SMMLV)" required type="number" min={1} max={1000} value={form.clausulaPenalSmmlv} onChange={set('clausulaPenalSmmlv')} helperText="Cláusula décima, en salarios mínimos mensuales." />
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button disabled={!valido} loading={guardando === 'datos'} onClick={guardar}>Guardar datos</Button>
        </div>
        <div>
          <strong>Firma de gerencia</strong>
          <p className="vermod__meta">Imagen JPG o PNG, hasta 2 MB, preferiblemente con fondo blanco. Es privada: solo sale en los contratos.</p>
          {cfg.firmaGerenciaUrl ? (
            <img src={resolveStorageUrl(cfg.firmaGerenciaUrl)} alt="Firma de gerencia" style={{ maxWidth: 260, maxHeight: 120, background: '#fff', border: '1px solid var(--color-border, #ddd)', borderRadius: 8, padding: 8, display: 'block', margin: '8px 0' }} />
          ) : <p className="vermod__ayuda">Todavía no se ha cargado.</p>}
          <label>
            <input type="file" accept="image/png,image/jpeg" onChange={subirFirma} disabled={guardando === 'firma'} hidden />
            <span className="btn btn--secondary btn--sm" role="button">{guardando === 'firma' ? 'Subiendo…' : cfg.firmaGerenciaUrl ? 'Cambiar firma' : 'Cargar firma'}</span>
          </label>
        </div>
      </div>
    </Card>
  );
}

/** Acuerdo del moderador: versiones publicadas y formulario para publicar una nueva (queda activa al instante). */
export default function AcuerdoConfig({ notify }) {
  const [lista, setLista] = useState(null);
  const [error, setError] = useState('');
  const [verId, setVerId] = useState(null);
  const [form, setForm] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [aFirmar, setAFirmar] = useState(null);

  const cargar = useCallback(async () => {
    try {
      const { data } = await getAcuerdos();
      setLista(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(errorMessage(err, 'No se pudieron cargar los acuerdos'));
    }
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  const vigente = lista?.find((a) => a.activo);
  const marcadores = vigente ? partirMarcadores(vigente.texto).filter((_, i) => i % 2 === 1) : [];
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const largo = form?.texto.trim().length || 0;
  const valido = form && /^[\w.-]{1,20}$/.test(form.version.trim()) && form.titulo.trim().length >= 5 && largo >= 200;

  const editar = () => {
    if (!vigente) return setForm(VACIO);
    const [mayor, menor] = vigente.version.replace(/^v/i, '').split('.').map(Number);
    const sig = Number.isFinite(mayor) && Number.isFinite(menor) ? `v${mayor}.${menor + 1}` : '';
    setForm({ version: sig, titulo: vigente.titulo, texto: vigente.texto });
  };

  const pedirConfirmacion = async () => {
    try {
      const listas = await Promise.all(['activo', 'contrato_enviado'].map((estado) => getVerificacionesModeradores({ estado })));
      setAFirmar(listas.reduce((n, { data }) => n + (Array.isArray(data) ? data.length : 0), 0));
    } catch {
      setAFirmar(0);
    }
  };

  const publicar = async () => {
    setAFirmar(null);
    setGuardando(true);
    try {
      const { data } = await publicarAcuerdo({ version: form.version.trim(), titulo: form.titulo.trim(), texto: form.texto });
      const n = data?.firmanDeNuevo || 0;
      notify(`Acuerdo ${form.version.trim()} publicado${n ? `: ${n} moderador${n === 1 ? '' : 'es'} firman de nuevo` : ''}`);
      setForm(null);
      cargar();
    } catch (err) {
      notify(errorMessage(err, 'No se pudo publicar'), 'danger');
    } finally {
      setGuardando(false);
    }
  };

  if (error) return <Alert variant="danger">{error}</Alert>;
  if (!lista) return <LoadingState />;

  return (
    <div className="config__section">
      <DatosGerencia notify={notify} />
      {marcadores.length > 0 && (
        <Alert variant="warning" title="Faltan datos legales en el acuerdo vigente">
          Completa antes de usarlo en serio: {[...new Set(marcadores)].join(', ')}. Publica una versión nueva con los datos reales
          (revisada por un abogado).
        </Alert>
      )}

      <Card
        title="Acuerdo del moderador"
        description="El moderador lo lee y lo firma al verificarse. Al publicar una versión nueva, todos los moderadores con contrato deben firmarla de nuevo para seguir operando; conservan su número y vigencia."
        actions={!form && (
          <Button size="sm" onClick={editar}>
            Editar contrato
          </Button>
        )}
      >
        {form ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Input label="Versión" required placeholder="v1.0" value={form.version} onChange={set('version')} helperText="Letras, números, punto o guion; hasta 20 caracteres. No se puede repetir." />
            <Input label="Título" required value={form.titulo} onChange={set('titulo')} />
            <Textarea label="Texto" required rows={14} value={form.texto} onChange={set('texto')} helperText={`${largo.toLocaleString('es-CO')} caracteres (mínimo 200). Los datos que falten van entre corchetes, p. ej. [NIT].`} />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <Button variant="ghost" onClick={() => setForm(null)}>Cancelar</Button>
              <Button disabled={!valido} loading={guardando} onClick={pedirConfirmacion}>Publicar y dejar activa</Button>
            </div>
          </div>
        ) : (
          <ul className="vermod__lista">
            {lista.map((a) => (
              <li key={a.id}>
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
                  <strong>{a.version}</strong>
                  {a.activo && <Badge variant="success">Vigente</Badge>}
                  <span>{a.titulo}</span>
                  <span className="vermod__meta">{formatDateTime(a.createdAt)}</span>
                  <Button variant="ghost" size="sm" onClick={() => setVerId(verId === a.id ? null : a.id)}>
                    {verId === a.id ? 'Ocultar texto' : 'Ver texto'}
                  </Button>
                </div>
                <div className="vermod__meta vermod__hash">SHA-256 {a.hash}</div>
                {verId === a.id && (
                  <div className="modbloq__acuerdo" style={{ marginTop: 8 }}>
                    <DocumentoContrato acuerdo={a} />
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
      <ConfirmDialog
        isOpen={aFirmar !== null}
        onClose={() => setAFirmar(null)}
        onConfirm={publicar}
        title="Publicar nueva versión"
        confirmText="Publicar"
        message={aFirmar
          ? `${aFirmar} moderador${aFirmar === 1 ? ' tendrá' : 'es tendrán'} que firmar de nuevo y quedarán bloqueados hasta hacerlo.`
          : 'Ningún moderador tiene contrato vigente: nadie debe firmar de nuevo.'}
      />
    </div>
  );
}
