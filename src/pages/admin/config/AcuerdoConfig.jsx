import { useCallback, useEffect, useState } from 'react';
import { Alert, Badge, Button, Card, Input, LoadingState, Textarea } from '../../../components/ui';
import { getAcuerdos, partirMarcadores, publicarAcuerdo } from '../../../api/contrato';
import { errorMessage, formatDateTime } from '../../../utils/format';
import DocumentoContrato from '../../../components/moderator/DocumentoContrato';
import '../../../components/moderator/ModeradorBloqueado.css';
import '../VerificacionesModeradoresPage.css';

const VACIO = { version: '', titulo: '', texto: '' };

/** Acuerdo del moderador: versiones publicadas y formulario para publicar una nueva (queda activa al instante). */
export default function AcuerdoConfig({ notify }) {
  const [lista, setLista] = useState(null);
  const [error, setError] = useState('');
  const [verId, setVerId] = useState(null);
  const [form, setForm] = useState(null);
  const [guardando, setGuardando] = useState(false);

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

  const publicar = async () => {
    setGuardando(true);
    try {
      await publicarAcuerdo({ version: form.version.trim(), titulo: form.titulo.trim(), texto: form.texto });
      notify(`Acuerdo ${form.version.trim()} publicado`);
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
      {marcadores.length > 0 && (
        <Alert variant="warning" title="Faltan datos legales en el acuerdo vigente">
          Completa antes de usarlo en serio: {[...new Set(marcadores)].join(', ')}. Publica una versión nueva con los datos reales
          (revisada por un abogado).
        </Alert>
      )}

      <Card
        title="Acuerdo del moderador"
        description="El moderador lo lee y lo firma al verificarse. Una versión nueva queda activa al publicarla: quien firme desde ese momento firma la nueva. Los contratos ya aprobados siguen vigentes hasta su vencimiento."
        actions={!form && (
          <Button size="sm" onClick={() => setForm(vigente ? { version: '', titulo: vigente.titulo, texto: vigente.texto } : VACIO)}>
            Nueva versión
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
              <Button disabled={!valido} loading={guardando} onClick={publicar}>Publicar y dejar activa</Button>
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
    </div>
  );
}
