import { useCallback, useEffect, useState } from 'react';
import { Check, FileDown, X } from 'lucide-react';
import {
  Alert, Avatar, Badge, Button, DataTable, LoadingState, Modal, PageHeader, SegmentedFilter, Textarea,
  Toast, ToastContainer,
} from '../../components/ui';
import {
  ESTADO_VERIFICACION, abrirPdf, generarContrato, getPdfVerificacion, suspenderVerificacion, getVerificacionModerador,
  getVerificacionesModeradores, rechazarVerificacion,
} from '../../api/contrato';
import { useZonas, zonaLabelFrom } from '../../hooks/useZonas';
import DocumentoContrato, { ImagenDocumento as Imagen } from '../../components/moderator/DocumentoContrato';
import '../../components/moderator/ModeradorBloqueado.css';
import { errorMessage, formatDate, formatDateTime } from '../../utils/format';
import './VerificacionesModeradoresPage.css';

const FILTROS = [
  { value: 'solicitado', label: 'Solicitados' },
  { value: 'contrato_enviado', label: 'Contrato enviado' },
  { value: 'activo', label: 'Activos' },
  { value: 'rechazado', label: 'Rechazados' },
  { value: 'suspendido', label: 'Suspendidos' },
  { value: 'vencido', label: 'Vencidos' },
  { value: 'sin_enviar', label: 'Sin enviar' },
  { value: '', label: 'Todos' },
];

const ACCIONES = {
  envio_documentos: 'Subió documentos',
  solicito: 'Solicitó el contrato',
  genero_contrato: 'Generó el contrato',
  firmo: 'Firmó',
  rechazo: 'Rechazó',
  suspendio: 'Suspendió',
  vencio: 'Venció',
};

const EstadoBadge = ({ estado }) => {
  const e = ESTADO_VERIFICACION[estado] || { label: estado, variant: 'neutral' };
  return <Badge variant={e.variant}>{e.label}</Badge>;
};

function Detalle({ ZONAS, userId, onClose, onCambio, notify }) {
  const [d, setD] = useState(null);
  const [error, setError] = useState('');
  const [modoNota, setModoNota] = useState(''); // 'rechazar' | 'suspender'
  const [nota, setNota] = useState('');
  const [enviando, setEnviando] = useState('');
  const [cedulaOk, setCedulaOk] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const { data } = await getVerificacionModerador(userId);
      setD(data);
    } catch (err) {
      setError(errorMessage(err, 'No se pudo cargar la verificación'));
    }
  }, [userId]);
  useEffect(() => { cargar(); }, [cargar]);

  const accion = async (tipo) => {
    setEnviando(tipo);
    try {
      if (tipo === 'generar') await generarContrato(userId);
      else if (tipo === 'suspender') await suspenderVerificacion(userId, nota.trim());
      else await rechazarVerificacion(userId, nota.trim());
      notify({ generar: 'Contrato generado y enviado al moderador', suspender: 'Contrato suspendido', rechazar: 'Verificación rechazada' }[tipo]);
      onCambio();
      onClose();
    } catch (err) {
      notify(errorMessage(err, 'No se pudo guardar'), 'danger');
    } finally {
      setEnviando('');
    }
  };

  const verPdf = async () => {
    setEnviando('pdf');
    try {
      const { data } = await getPdfVerificacion(userId);
      abrirPdf(data, `contrato-moderador-${userId}.pdf`);
    } catch (err) {
      notify(errorMessage(err, 'No se pudo descargar el PDF'), 'danger');
    } finally {
      setEnviando('');
    }
  };

  const firma = d?.firmas?.[0]; // la más reciente primero
  const notaOk = nota.trim().length >= 5 && nota.trim().length <= 1000;
  const puedeRechazar = ['solicitado', 'contrato_enviado'].includes(d?.estado);
  const footer = d && (modoNota ? (
    <>
      <Button variant="ghost" onClick={() => setModoNota('')}>Volver</Button>
      <Button variant="danger" disabled={!notaOk} loading={enviando === modoNota} onClick={() => accion(modoNota)}>
        {modoNota === 'suspender' ? 'Suspender' : 'Rechazar'}
      </Button>
    </>
  ) : (
    <>
      {puedeRechazar && <Button variant="danger" icon={<X size={14} />} onClick={() => setModoNota('rechazar')}>Rechazar</Button>}
      {d.estado === 'activo' && <Button variant="danger" onClick={() => setModoNota('suspender')}>Suspender</Button>}
      {d.estado === 'solicitado' && (
        <Button variant="success" icon={<Check size={14} />} disabled={!cedulaOk || !d.cedula} loading={enviando === 'generar'} onClick={() => accion('generar')}>Aceptar y generar contrato</Button>
      )}
    </>
  ));

  return (
    <Modal isOpen onClose={onClose} size="xl" title={d ? d.nombre : 'Verificación'} description={d?.email} footer={footer || null}>
      {error && <Alert variant="danger">{error}</Alert>}
      {!d && !error && <LoadingState />}
      {d && (
        <div className="vermod">
          <div className="vermod__resumen">
            <EstadoBadge estado={d.estado} />
            {d.telefono && <span>Tel. {d.telefono}</span>}
            {d.numeroContrato && <span>Contrato {d.numeroContrato}</span>}
            {d.zonaContrato && <span>Zona {zonaLabelFrom(ZONAS, d.zonaContrato)}</span>}
            {d.contratoHasta && <span>Vigencia {formatDate(d.contratoDesde)} – {formatDate(d.contratoHasta)}</span>}
            {d.generadoPor && <span>Generó {d.generadoPor} · {formatDateTime(d.generadoAt)}</span>}
          </div>
          {d.notaRechazo && <Alert variant="danger" title="Nota del último rechazo o suspensión">{d.notaRechazo}</Alert>}

          {modoNota && (
            <Textarea
              label={modoNota === 'suspender' ? 'Motivo de la suspensión (lo ve el moderador)' : '¿Qué debe corregir? (la ve el moderador)'}
              required
              rows={3}
              maxLength={1000}
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              helperText="Entre 5 y 1000 caracteres."
            />
          )}

          {d.estado === 'solicitado' ? (
            <>
              <h4 className="vermod__h">Solicitud</h4>
              <dl className="vermod__datos">
                <div><dt>Nombre</dt><dd>{d.nombre}</dd></div>
                <div><dt>Cédula</dt><dd>{d.cedula || '—'}</dd></div>
                <div><dt>Correo</dt><dd>{d.email || '—'}</dd></div>
                <div><dt>Teléfono</dt><dd>{d.telefono || '—'}</dd></div>
                <div><dt>Zona</dt><dd>{d.zona ? zonaLabelFrom(ZONAS, d.zona) : 'Sin zona'}</dd></div>
              </dl>
              <p className="vermod__ayuda">Compara el rostro y el número con la foto de la cédula. Si todo coincide, acepta y se genera el contrato.</p>
              <div className="vermod__grid vermod__grid--3">
                <div>
                  <Imagen titulo="Cédula (frente)" src={d.documentos?.cedulaFrente} />
                  <p className="vermod__ayuda">Número escrito: <strong>{d.cedula || 'No lo escribió'}</strong></p>
                </div>
                <Imagen titulo="Cédula (reverso)" src={d.documentos?.cedulaReverso} />
                <Imagen titulo="Rostro" src={d.documentos?.rostro} />
              </div>
              {d.cedula ? (
                <label className="modbloq__check">
                  <input type="checkbox" checked={cedulaOk} onChange={(e) => setCedulaOk(e.target.checked)} />
                  Verifiqué que el número de cédula coincide con la foto
                </label>
              ) : <Alert variant="warning">El moderador no escribió su número de cédula: recházalo con una nota para que lo escriba.</Alert>}
            </>
          ) : (<>
          <h4 className="vermod__h">Cédula y firma</h4>
          <p className="vermod__ayuda">Compara la firma con la de la cédula y el rostro con la foto del documento.</p>
          <div className="vermod__grid">
            <Imagen titulo="Cédula (frente)" src={d.documentos?.cedulaFrente} />
            <Imagen titulo={firma ? `Firma (${firma.tipoFirma === 'dibujada' ? 'dibujada' : 'foto'})` : 'Firma'} src={firma?.firmaUrl} blanco />
            <Imagen titulo="Cédula (reverso)" src={d.documentos?.cedulaReverso} />
            <Imagen titulo="Rostro" src={d.documentos?.rostro} />
          </div>
          </>)}

          {d.acuerdo && (
            <>
              <h4 className="vermod__h">Contrato</h4>
              <div className="modbloq__acuerdo">
                <DocumentoContrato
                  acuerdo={d.acuerdo}
                  numero={d.numeroContrato}
                  nombre={d.nombre}
                  cedula={d.cedula}
                  zona={d.zonaContrato || d.zona}
                  desde={d.contratoDesde}
                  hasta={d.contratoHasta}
                  firmas={d.firmasContrato}
                />
              </div>
            </>
          )}

          <h4 className="vermod__h">Firmas</h4>
          {d.firmas?.length ? (
            <ul className="vermod__lista">
              {d.firmas.map((f) => (
                <li key={f.id}>
                  <div>
                    <strong>Acuerdo {f.version}</strong> · {formatDateTime(f.firmadoAt)} · {f.tipoFirma}
                    <div className="vermod__meta">IP {f.ip || '—'} · {f.userAgent || 'Dispositivo desconocido'}</div>
                    <div className="vermod__meta vermod__hash">SHA-256 {f.hashTexto}</div>
                  </div>
                </li>
              ))}
            </ul>
          ) : <p className="vermod__ayuda">Todavía no ha firmado.</p>}
          {firma && (
            <Button variant="secondary" size="sm" icon={<FileDown size={14} />} loading={enviando === 'pdf'} onClick={verPdf}>
              Ver PDF del contrato firmado
            </Button>
          )}

          <h4 className="vermod__h">Auditoría</h4>
          {d.auditoria?.length ? (
            <ul className="vermod__lista">
              {d.auditoria.map((a) => (
                <li key={a.id}>
                  <div>
                    <strong>{ACCIONES[a.accion] || a.accion}</strong> · {a.actor} · {formatDateTime(a.fecha)}
                    {(a.detalle || a.ip) && (
                      <div className="vermod__meta">{[a.detalle, a.ip && `IP ${a.ip}`].filter(Boolean).join(' · ')}</div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : <p className="vermod__ayuda">Sin movimientos.</p>}
        </div>
      )}
    </Modal>
  );
}

export default function VerificacionesModeradoresPage() {
  const ZONAS = useZonas();
  const [estado, setEstado] = useState('solicitado');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [abierto, setAbierto] = useState(null);
  const [toast, setToast] = useState(null);
  const notify = useCallback((message, variant = 'success') => setToast({ id: Date.now(), message, variant }), []);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await getVerificacionesModeradores(estado ? { estado } : {});
      setRows(Array.isArray(data) ? data : []);
      setError('');
    } catch (err) {
      setError(errorMessage(err, 'No se pudieron cargar las verificaciones'));
    } finally {
      setLoading(false);
    }
  }, [estado]);
  useEffect(() => { cargar(); }, [cargar]);

  const columns = [
    {
      key: 'nombre',
      label: 'Moderador',
      render: (_, r) => (
        <div className="vermod__persona">
          <Avatar src={r.avatar} name={r.nombre} size={32} />
          <div>
            <div>{r.nombre}</div>
            <div className="vermod__meta">{r.email}</div>
          </div>
        </div>
      ),
    },
    { key: 'zona', label: 'Zona', render: (z) => (z ? zonaLabelFrom(ZONAS, z) : <Badge variant="danger">Sin zona</Badge>) },
    { key: 'numeroContrato', label: 'Contrato', render: (v) => v || '—' },
    { key: 'estado', label: 'Estado', render: (e) => <EstadoBadge estado={e} /> },
    { key: 'contratoHasta', label: 'Vence', render: (v) => (v ? formatDate(v) : '—') },
    { key: 'actualizadoAt', label: 'Último cambio', render: (v) => (v ? formatDateTime(v) : '—') },
  ];

  return (
    <div className="page">
      <PageHeader
        title="Solicitudes de moderadores"
        description="El moderador envía su cédula y una foto del rostro. Gerencia revisa, acepta y genera el contrato (3 meses); el moderador lo firma y queda activo."
      />
      <SegmentedFilter options={FILTROS} value={estado} onChange={setEstado} ariaLabel="Estado de la verificación" />
      {error && <Alert variant="danger">{error}</Alert>}
      <DataTable
        columns={columns}
        data={rows}
        loading={loading}
        rowKey="userId"
        onRowClick={(r) => setAbierto(r.userId)}
        emptyMessage="No hay verificaciones en este estado"
        emptyDescription="Cuando un moderador solicite su contrato, aparece aquí."
      />
      {abierto && <Detalle ZONAS={ZONAS} userId={abierto} onClose={() => setAbierto(null)} onCambio={cargar} notify={notify} />}
      {toast && (
        <ToastContainer>
          <Toast key={toast.id} message={toast.message} variant={toast.variant} onClose={() => setToast(null)} />
        </ToastContainer>
      )}
    </div>
  );
}
