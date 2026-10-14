import { useEffect, useState } from 'react';
import { FileDown } from 'lucide-react';
import { Alert, Badge, Button, Card, LoadingState, PageHeader } from '../../components/ui';
import { abrirPdf, getMiPdfContrato, getMiVerificacion } from '../../api/contrato';
import DocumentoContrato, { ImagenDocumento } from '../../components/moderator/DocumentoContrato';
import { zonaLabelFrom } from '../../hooks/useZonas';
import { errorMessage, formatDate } from '../../utils/format';
import '../admin/VerificacionesModeradoresPage.css';
import '../../components/moderator/ModeradorBloqueado.css';

const DIA = 86400000;

function chip(estado, dias) {
  if (estado === 'suspendido') return { label: 'Suspendido', variant: 'danger' };
  if (estado === 'vencido' || (estado === 'activo' && dias < 0)) return { label: 'Vencido', variant: 'danger' };
  if (estado === 'activo' && dias <= 15) return { label: 'Por vencer', variant: 'warning' };
  if (estado === 'activo') return { label: 'Activo', variant: 'success' };
  return { label: 'Sin contrato vigente', variant: 'neutral' };
}

/** Contrato firmado del moderador activo: estado, vigencia, datos, documentos y la hoja firmada. */
export default function MiContratoPage() {
  const [d, setD] = useState(null);
  const [error, setError] = useState('');
  const [bajando, setBajando] = useState(false);

  useEffect(() => {
    getMiVerificacion()
      .then(({ data }) => setD({ ...data, dias: data?.contratoHasta ? Math.ceil((new Date(data.contratoHasta) - Date.now()) / DIA) : null }))
      .catch((err) => setError(errorMessage(err, 'No se pudo cargar tu contrato')));
  }, []);

  const descargar = async () => {
    setBajando(true);
    try {
      const { data } = await getMiPdfContrato();
      abrirPdf(data, `contrato-${d?.numeroContrato || 'moderador'}.pdf`);
    } catch (err) {
      setError(errorMessage(err, 'No se pudo descargar el PDF'));
    } finally {
      setBajando(false);
    }
  };

  if (!d) return <div className="page">{error ? <Alert variant="danger">{error}</Alert> : <LoadingState />}</div>;

  const { dias } = d;
  const c = chip(d.estado, dias ?? -1);
  const firma = d.firmas?.[0];
  const zona = d.zonaContrato || d.zona;
  const datos = [
    ['Contrato', d.numeroContrato],
    ['Zona', zona && zonaLabelFrom([], zona)],
    ['Inicio', d.contratoDesde && formatDate(d.contratoDesde)],
    ['Fin', d.contratoHasta && formatDate(d.contratoHasta)],
    ['Días restantes', dias != null && (dias >= 0 ? dias : 0)],
    ['Nombre', d.nombre],
    ['Cédula', d.cedula],
    ['Correo', d.email],
    ['Teléfono', d.telefono],
  ].filter(([, v]) => v !== null && v !== undefined && v !== '');

  return (
    <div className="page">
      <PageHeader
        title="Mi contrato"
        description="Tu acuerdo de moderador firmado y su vigencia."
        actions={firma && (
          <Button variant="secondary" icon={<FileDown size={14} />} loading={bajando} onClick={descargar}>Descargar PDF</Button>
        )}
      />
      {error && <Alert variant="danger">{error}</Alert>}
      {c.label === 'Por vencer' && <Alert variant="warning">Tu contrato vence en {dias} días. Gerencia te enviará la renovación.</Alert>}
      {d.notaRechazo && d.estado === 'suspendido' && <Alert variant="danger" title="Motivo de la suspensión">{d.notaRechazo}</Alert>}

      <Card>
        <div className="vermod">
          <div className="vermod__resumen"><Badge variant={c.variant}>{c.label}</Badge></div>
          <dl className="vermod__datos">
            {datos.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
          </dl>
          <h4 className="vermod__h">Documentos</h4>
          <div className="vermod__grid vermod__grid--3">
            <ImagenDocumento titulo="Cédula (frente)" src={d.documentos?.cedulaFrente} />
            <ImagenDocumento titulo="Cédula (reverso)" src={d.documentos?.cedulaReverso} />
            <ImagenDocumento titulo="Rostro" src={d.documentos?.rostro} />
          </div>
        </div>
      </Card>

      <div className="modbloq__acuerdo modbloq__acuerdo--completo">
        <DocumentoContrato
          acuerdo={d.acuerdoFirmado || d.acuerdo}
          numero={d.numeroContrato}
          nombre={d.nombre}
          cedula={d.cedula}
          zona={zona}
          desde={d.contratoDesde}
          hasta={d.contratoHasta}
          firmaUrl={firma?.firmaUrl}
          firmadoAt={firma?.firmadoAt}
        />
      </div>
    </div>
  );
}
