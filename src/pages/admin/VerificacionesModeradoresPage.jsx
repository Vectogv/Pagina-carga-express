import { useCallback, useEffect, useState } from 'react';
import { Check, FileDown, X } from 'lucide-react';
import {
  Alert, Avatar, Badge, Button, DataTable, LoadingState, Modal, PageHeader, SegmentedFilter, Textarea,
  Toast, ToastContainer,
} from '../../components/ui';
import {
  ESTADO_VERIFICACION, abrirPdf, aprobarVerificacion, getPdfVerificacion, getVerificacionModerador,
  getVerificacionesModeradores, rechazarVerificacion,
} from '../../api/contrato';
import { useZonas, zonaLabelFrom } from '../../hooks/useZonas';
import { resolveStorageUrl } from '../../utils/storage';
import { errorMessage, formatDate, formatDateTime } from '../../utils/format';
import './VerificacionesModeradoresPage.css';

const FILTROS = [
  { value: 'pendiente', label: 'En revisión' },
  { value: '', label: 'Todos' },
  { value: 'aprobado', label: 'Aprobados' },
  { value: 'rechazado', label: 'Rechazados' },
  { value: 'vencido', label: 'Vencidos' },
  { value: 'sin_enviar', label: 'Sin enviar' },
];

const ACCIONES = {
  envio_documentos: 'Subió documentos',
  firmo: 'Firmó',
  aprobo: 'Aprobó',
  rechazo: 'Rechazó',
  vencio: 'Venció',
};

const EstadoBadge = ({ estado }) => {
  const e = ESTADO_VERIFICACION[estado] || { label: estado, variant: 'neutral' };
  return <Badge variant={e.variant}>{e.label}</Badge>;
};

function Imagen({ titulo, src, blanco }) {
  return (
    <figure className="vermod__img">
      <figcaption>{titulo}</figcaption>
      {src ? (
        <a href={resolveStorageUrl(src)} target="_blank" rel="noopener noreferrer" title="Abrir en grande">
          <img src={resolveStorageUrl(src)} alt={titulo} className={blanco ? 'is-papel' : ''} />
        </a>
      ) : <div className="vermod__vacio">Sin subir</div>}
    </figure>
  );
}

function Detalle({ userId, onClose, onCambio, notify }) {
  const [d, setD] = useState(null);
  const [error, setError] = useState('');
  const [rechazando, setRechazando] = useState(false);
  const [nota, setNota] = useState('');
  const [enviando, setEnviando] = useState('');

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
      if (tipo === 'aprobar') await aprobarVerificacion(userId);
      else await rechazarVerificacion(userId, nota.trim());
      notify(tipo === 'aprobar' ? 'Contrato aprobado por 3 meses' : 'Verificación rechazada');
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
  const footer = d?.estado === 'pendiente' && (
    rechazando ? (
      <>
        <Button variant="ghost" onClick={() => setRechazando(false)}>Volver</Button>
        <Button variant="danger" disabled={!notaOk} loading={enviando === 'rechazar'} onClick={() => accion('rechazar')}>Rechazar</Button>
      </>
    ) : (
      <>
        <Button variant="danger" icon={<X size={14} />} onClick={() => setRechazando(true)}>Rechazar</Button>
        <Button variant="success" icon={<Check size={14} />} loading={enviando === 'aprobar'} onClick={() => accion('aprobar')}>Aprobar 3 meses</Button>
      </>
    )
  );

  return (
    <Modal isOpen onClose={onClose} size="xl" title={d ? d.nombre : 'Verificación'} description={d?.email} footer={footer || null}>
      {error && <Alert variant="danger">{error}</Alert>}
      {!d && !error && <LoadingState />}
      {d && (
        <div className="vermod">
          <div className="vermod__resumen">
            <EstadoBadge estado={d.estado} />
            {d.telefono && <span>Tel. {d.telefono}</span>}
            {d.contratoHasta && <span>Vigente {formatDate(d.contratoDesde)} – {formatDate(d.contratoHasta)}</span>}
            {d.aprobadoPor && <span>Aprobó {d.aprobadoPor} · {formatDateTime(d.aprobadoAt)}</span>}
          </div>
          {d.notaRechazo && <Alert variant="danger" title="Nota del último rechazo">{d.notaRechazo}</Alert>}

          {rechazando && (
            <Textarea
              label="¿Qué debe corregir? (la ve el moderador)"
              required
              rows={3}
              maxLength={1000}
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              helperText="Entre 5 y 1000 caracteres."
            />
          )}

          <h4 className="vermod__h">Cédula y firma</h4>
          <p className="vermod__ayuda">Compara la firma con la de la cédula y el rostro con la foto del documento.</p>
          <div className="vermod__grid">
            <Imagen titulo="Cédula (frente)" src={d.documentos?.cedulaFrente} />
            <Imagen titulo={firma ? `Firma (${firma.tipoFirma === 'dibujada' ? 'dibujada' : 'foto'})` : 'Firma'} src={firma?.firmaUrl} blanco />
            <Imagen titulo="Cédula (reverso)" src={d.documentos?.cedulaReverso} />
            <Imagen titulo="Rostro" src={d.documentos?.rostro} />
          </div>

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
  const [estado, setEstado] = useState('pendiente');
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
    { key: 'estado', label: 'Estado', render: (e) => <EstadoBadge estado={e} /> },
    { key: 'contratoHasta', label: 'Vence', render: (v) => (v ? formatDate(v) : '—') },
    { key: 'actualizadoAt', label: 'Último cambio', render: (v) => (v ? formatDateTime(v) : '—') },
  ];

  return (
    <div className="page">
      <PageHeader
        title="Verificaciones de moderadores"
        description="Cédula, rostro y contrato firmado. Al aprobar, el moderador opera 3 meses; al vencer, debe firmar de nuevo."
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
        emptyDescription="Cuando un moderador envíe sus documentos y firme, aparece aquí."
      />
      {abierto && <Detalle userId={abierto} onClose={() => setAbierto(null)} onCambio={cargar} notify={notify} />}
      {toast && (
        <ToastContainer>
          <Toast key={toast.id} message={toast.message} variant={toast.variant} onClose={() => setToast(null)} />
        </ToastContainer>
      )}
    </div>
  );
}
