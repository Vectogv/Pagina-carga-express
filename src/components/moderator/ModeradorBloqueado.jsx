import { useEffect, useRef, useState } from 'react';
import { Camera, Check, Eraser, FileDown, LogOut, Upload } from 'lucide-react';
import {
  Alert, Badge, Button, Tabs, TabsList, TabsTrigger, TabsContent,
} from '../ui';
import {
  ESTADO_VERIFICACION, abrirPdf, firmarAcuerdo, getMiPdfContrato, partirMarcadores, subirDocumentosModerador,
} from '../../api/contrato';
import { resolveStorageUrl } from '../../utils/storage';
import { errorMessage, formatDate } from '../../utils/format';
import './ModeradorBloqueado.css';

const MAX_BYTES = 5 * 1024 * 1024;
const PASOS = ['Cédula', 'Rostro', 'Acuerdo', 'Firma'];
const EDITABLE = ['sin_enviar', 'rechazado', 'vencido'];

/** Revisa tipo y tamaño antes de subir (el servidor vuelve a validar). */
function validarImagen(file) {
  if (!file) return null;
  if (!['image/jpeg', 'image/png'].includes(file.type)) return 'Solo se aceptan imágenes JPG o PNG.';
  if (file.size > MAX_BYTES) return 'La imagen pesa más de 5 MB.';
  return null;
}

/** Campo de imagen con vista previa: la nueva elegida o la que ya está en el servidor. */
function CampoImagen({ label, file, actual, onChange, capture }) {
  const [preview, setPreview] = useState('');
  useEffect(() => {
    if (!file) { setPreview(''); return undefined; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  const src = preview || (actual ? resolveStorageUrl(actual) : '');
  const elegir = (e) => { onChange(e.target.files?.[0] || null); e.target.value = ''; };

  return (
    <div className="modbloq__campo">
      <span className="modbloq__campo-label">{label}</span>
      <div className="modbloq__preview">
        {src ? <img src={src} alt={label} /> : <span>Sin imagen</span>}
      </div>
      <div className="modbloq__campo-acciones">
        {capture && (
          <label className="btn btn--secondary btn--sm modbloq__file">
            <Camera size={14} aria-hidden="true" /> Tomar foto
            <input type="file" accept="image/jpeg,image/png" capture={capture} onChange={elegir} />
          </label>
        )}
        <label className="btn btn--secondary btn--sm modbloq__file">
          <Upload size={14} aria-hidden="true" /> {src ? 'Cambiar' : 'Subir archivo'}
          <input type="file" accept="image/jpeg,image/png" onChange={elegir} />
        </label>
      </div>
    </div>
  );
}

/** Lienzo para firmar con el dedo o el mouse. Sin librerías. */
function LienzoFirma({ onChange }) {
  const ref = useRef(null);
  const dibujando = useRef(false);

  useEffect(() => {
    const c = ref.current;
    const dpr = window.devicePixelRatio || 1;
    c.width = c.clientWidth * dpr;
    c.height = c.clientHeight * dpr;
    const ctx = c.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#111827';
  }, []);

  const punto = (e) => {
    const r = ref.current.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  };
  const down = (e) => {
    ref.current.setPointerCapture(e.pointerId);
    dibujando.current = true;
    const ctx = ref.current.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(...punto(e));
  };
  const move = (e) => {
    if (!dibujando.current) return;
    const ctx = ref.current.getContext('2d');
    ctx.lineTo(...punto(e));
    ctx.stroke();
  };
  const up = () => {
    if (!dibujando.current) return;
    dibujando.current = false;
    onChange(ref.current);
  };
  const borrar = () => {
    const c = ref.current;
    c.getContext('2d').clearRect(0, 0, c.width, c.height);
    onChange(null);
  };

  return (
    <div className="modbloq__lienzo-wrap">
      <canvas
        ref={ref}
        className="modbloq__lienzo"
        aria-label="Espacio para firmar"
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
      />
      <Button variant="ghost" size="sm" icon={<Eraser size={14} />} onClick={borrar}>Borrar</Button>
    </div>
  );
}

function TextoAcuerdo({ texto, onFinal }) {
  const ref = useRef(null);
  const revisar = () => {
    const el = ref.current;
    if (el && el.scrollTop + el.clientHeight >= el.scrollHeight - 8) onFinal();
  };
  // Si el texto cabe sin desplazar, ya está leído.
  useEffect(revisar);
  return (
    <div ref={ref} className="modbloq__acuerdo" onScroll={revisar} tabIndex={0}>
      {partirMarcadores(texto).map((parte, i) =>
        i % 2 === 1 ? <mark key={i} className="modbloq__marca">{parte}</mark> : parte)}
    </div>
  );
}

function Asistente({ data, onRefresh }) {
  const docs = data.documentos || {};
  const acuerdo = data.acuerdo;
  const [paso, setPaso] = useState(0);
  const [archivos, setArchivos] = useState({ cedulaFrente: null, cedulaReverso: null, rostro: null });
  const [leido, setLeido] = useState(false);
  const [acepto, setAcepto] = useState(false);
  const [modoFirma, setModoFirma] = useState('dibujada');
  const [lienzo, setLienzo] = useState(null);
  const [fotoFirma, setFotoFirma] = useState(null);
  const [firmaPreview, setFirmaPreview] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (modoFirma === 'dibujada') { setFirmaPreview(lienzo ? lienzo.toDataURL('image/png') : ''); return undefined; }
    if (!fotoFirma) { setFirmaPreview(''); return undefined; }
    const url = URL.createObjectURL(fotoFirma);
    setFirmaPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [modoFirma, lienzo, fotoFirma]);

  const elegir = (campo) => (file) => {
    const err = validarImagen(file);
    setError(err || '');
    if (!err) setArchivos((a) => ({ ...a, [campo]: file }));
  };

  // Sube solo lo nuevo de este paso; lo que ya está en el servidor se conserva.
  const subirYSeguir = async (campos) => {
    const form = new FormData();
    campos.forEach((c) => archivos[c] && form.append(c, archivos[c]));
    setError('');
    if ([...form.keys()].length) {
      setEnviando(true);
      try {
        await subirDocumentosModerador(form);
      } catch (err) {
        setError(errorMessage(err, 'No se pudieron subir las imágenes'));
        return;
      } finally {
        setEnviando(false);
      }
    }
    setPaso((p) => p + 1);
  };

  const firmar = async () => {
    setError('');
    setEnviando(true);
    try {
      const firma = modoFirma === 'dibujada'
        ? await new Promise((ok) => lienzo.toBlob(ok, 'image/png'))
        : fotoFirma;
      const form = new FormData();
      form.append('acuerdoId', String(acuerdo.id));
      form.append('hashTexto', acuerdo.hash);
      form.append('tipoFirma', modoFirma);
      form.append('firma', firma, modoFirma === 'dibujada' ? 'firma.png' : fotoFirma.name);
      await firmarAcuerdo(form);
      await onRefresh();
    } catch (err) {
      setError(errorMessage(err, 'No se pudo registrar la firma'));
      if (err?.response?.data?.code === 'ACUERDO_CAMBIO') {
        // Gerencia publicó otra versión mientras leía: hay que leer la nueva.
        await onRefresh();
        setPaso(2); setLeido(false); setAcepto(false);
      }
      if (err?.response?.data?.code === 'FALTAN_DOCUMENTOS') setPaso(0);
    } finally {
      setEnviando(false);
    }
  };

  const cedulaLista = (archivos.cedulaFrente || docs.cedulaFrente) && (archivos.cedulaReverso || docs.cedulaReverso);
  const rostroListo = archivos.rostro || docs.rostro;
  const firmaLista = modoFirma === 'dibujada' ? Boolean(lienzo) : Boolean(fotoFirma);

  if (!acuerdo) {
    return <Alert variant="warning">Todavía no hay un acuerdo publicado. Comunícate con el administrador.</Alert>;
  }

  return (
    <div className="modbloq__asistente">
      <ol className="modbloq__pasos" aria-label="Pasos de la verificación">
        {PASOS.map((p, i) => (
          <li key={p} className={i === paso ? 'is-actual' : i < paso ? 'is-hecho' : ''} aria-current={i === paso ? 'step' : undefined}>
            <span className="modbloq__paso-num">{i < paso ? <Check size={12} /> : i + 1}</span>
            <span className="modbloq__paso-nombre">{p}</span>
          </li>
        ))}
      </ol>

      {error && <Alert variant="danger">{error}</Alert>}

      {paso === 0 && (
        <section>
          <h3 className="modbloq__h">Tu cédula, por los dos lados</h3>
          <p className="modbloq__ayuda">Foto nítida, sin reflejos y con los cuatro bordes visibles. JPG o PNG, hasta 5 MB.</p>
          <div className="modbloq__grid">
            <CampoImagen label="Frente" file={archivos.cedulaFrente} actual={docs.cedulaFrente} onChange={elegir('cedulaFrente')} capture="environment" />
            <CampoImagen label="Reverso" file={archivos.cedulaReverso} actual={docs.cedulaReverso} onChange={elegir('cedulaReverso')} capture="environment" />
          </div>
          <div className="modbloq__nav">
            <span />
            <Button disabled={!cedulaLista} loading={enviando} onClick={() => subirYSeguir(['cedulaFrente', 'cedulaReverso'])}>Continuar</Button>
          </div>
        </section>
      )}

      {paso === 1 && (
        <section>
          <h3 className="modbloq__h">Foto de tu rostro</h3>
          <p className="modbloq__ayuda">De frente, con buena luz, sin gafas oscuras ni gorra. El administrador la compara con tu cédula.</p>
          <div className="modbloq__grid modbloq__grid--uno">
            <CampoImagen label="Rostro" file={archivos.rostro} actual={docs.rostro} onChange={elegir('rostro')} capture="user" />
          </div>
          <div className="modbloq__nav">
            <Button variant="ghost" onClick={() => setPaso(0)}>Atrás</Button>
            <Button disabled={!rostroListo} loading={enviando} onClick={() => subirYSeguir(['rostro'])}>Continuar</Button>
          </div>
        </section>
      )}

      {paso === 2 && (
        <section>
          <h3 className="modbloq__h">{acuerdo.titulo}</h3>
          <p className="modbloq__ayuda">Versión {acuerdo.version}. Léelo completo: el botón se activa al llegar al final.</p>
          <TextoAcuerdo texto={acuerdo.texto} onFinal={() => setLeido(true)} />
          <label className={`modbloq__check${leido ? '' : ' is-disabled'}`}>
            <input type="checkbox" disabled={!leido} checked={acepto} onChange={(e) => setAcepto(e.target.checked)} />
            Leí y acepto el acuerdo
          </label>
          <div className="modbloq__nav">
            <Button variant="ghost" onClick={() => setPaso(1)}>Atrás</Button>
            <Button disabled={!leido || !acepto} onClick={() => setPaso(3)}>Continuar</Button>
          </div>
        </section>
      )}

      {paso === 3 && (
        <section>
          <h3 className="modbloq__h">Firma el acuerdo</h3>
          <p className="modbloq__ayuda">Firma igual que en tu cédula. Puedes dibujarla aquí o subir una foto de tu firma en papel blanco.</p>
          <Tabs value={modoFirma} onValueChange={(v) => { setModoFirma(v); setError(''); }}>
            <TabsList>
              <TabsTrigger value="dibujada">Dibujar</TabsTrigger>
              <TabsTrigger value="foto">Subir foto</TabsTrigger>
            </TabsList>
            <TabsContent value="dibujada">
              <LienzoFirma onChange={setLienzo} />
            </TabsContent>
            <TabsContent value="foto">
              <label className="btn btn--secondary btn--sm modbloq__file">
                <Upload size={14} aria-hidden="true" /> {fotoFirma ? 'Cambiar foto' : 'Elegir foto de la firma'}
                <input
                  type="file"
                  accept="image/jpeg,image/png"
                  onChange={(e) => {
                    const f = e.target.files?.[0] || null;
                    e.target.value = '';
                    const err = validarImagen(f);
                    setError(err || '');
                    if (!err) setFotoFirma(f);
                  }}
                />
              </label>
            </TabsContent>
          </Tabs>
          {firmaPreview && (
            <div className="modbloq__firma-preview">
              <span className="modbloq__campo-label">Vista previa</span>
              <img src={firmaPreview} alt="Vista previa de la firma" />
            </div>
          )}
          <p className="modbloq__ayuda">Al firmar quedan registrados la versión del acuerdo, la fecha, tu IP y tu dispositivo.</p>
          <div className="modbloq__nav">
            <Button variant="ghost" onClick={() => setPaso(2)}>Atrás</Button>
            <Button disabled={!firmaLista} loading={enviando} onClick={firmar}>Firmar y enviar</Button>
          </div>
        </section>
      )}
    </div>
  );
}

/** Pantalla que ve el moderador sin zona o sin contrato vigente, en vez del panel. */
export default function ModeradorBloqueado({ data, onRefresh, onLogout }) {
  const [descargando, setDescargando] = useState(false);
  const [errorPdf, setErrorPdf] = useState('');
  const estado = ESTADO_VERIFICACION[data.estado] || ESTADO_VERIFICACION.sin_enviar;
  const sinZona = data.bloqueo === 'MODERADOR_SIN_ZONA';

  const verPdf = async () => {
    setDescargando(true);
    setErrorPdf('');
    try {
      const { data: blob } = await getMiPdfContrato();
      abrirPdf(blob, 'contrato-moderador.pdf');
    } catch (err) {
      setErrorPdf(errorMessage(err, 'No se pudo descargar el contrato'));
    } finally {
      setDescargando(false);
    }
  };

  return (
    <div className="modbloq">
      <header className="modbloq__top">
        <span className="modbloq__marca-app">Carga Express · Moderación</span>
        <Button variant="ghost" size="sm" icon={<LogOut size={14} />} onClick={onLogout}>Cerrar sesión</Button>
      </header>

      <main className="modbloq__card">
        <div className="modbloq__titulo">
          <h1>Comunícate con el administrador para que autorice tu acceso</h1>
          <div className="modbloq__chips">
            <Badge variant={estado.variant}>Contrato: {estado.label}</Badge>
            {sinZona && <Badge variant="danger">Sin zona asignada</Badge>}
          </div>
        </div>
        <p className="modbloq__mensaje">{data.mensaje}</p>

        {sinZona && (
          <Alert variant="warning">
            Tu cuenta no tiene una ciudad asignada (o tiene "general", que no es una ciudad). El administrador debe asignarte una zona.
          </Alert>
        )}
        {data.estado === 'rechazado' && (
          <Alert variant="danger" title="Tu verificación fue rechazada">
            {data.notaRechazo || 'Sin nota.'} Corrige lo indicado y vuelve a enviarla.
          </Alert>
        )}
        {data.estado === 'vencido' && (
          <Alert variant="warning" title="Tu contrato venció">
            {data.contratoHasta ? `Venció el ${formatDate(data.contratoHasta)}. ` : ''}Firma de nuevo para renovarlo por 3 meses.
          </Alert>
        )}

        {data.estado === 'pendiente' && (
          <div className="modbloq__revision">
            <Alert variant="info" title="En revisión">
              Recibimos tus documentos y tu firma. El administrador los revisa y, al aprobarlos, tu contrato queda vigente por 3 meses.
            </Alert>
            {errorPdf && <Alert variant="danger">{errorPdf}</Alert>}
            <Button variant="secondary" icon={<FileDown size={14} />} loading={descargando} onClick={verPdf}>
              Ver mi contrato firmado (PDF)
            </Button>
          </div>
        )}

        {data.estado === 'aprobado' && !sinZona && (
          <Alert variant="success">Tu contrato está aprobado. Actualiza la página.</Alert>
        )}

        {EDITABLE.includes(data.estado) && <Asistente data={data} onRefresh={onRefresh} />}
      </main>
    </div>
  );
}
