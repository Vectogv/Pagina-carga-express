import { resolveStorageUrl } from '../../utils/storage';
import { faltantesDe, textoFaltantes } from '../../utils/documentos';
import { formatDate, fullName } from '../../utils/format';
import useDocumentosConductor from '../../hooks/useDocumentosConductor';
import { Avatar, Badge, StatusBadge } from '../ui';
import './DetalleVerificacion.css';

// Cada documento -> campo con la foto y campo con el vencimiento en la fila del conductor.
const CAMPOS = {
  licencia: ['fotoLicencia'],
  soat: ['fotoSoat', 'soatVence'],
  tecnomecanica: ['fotoTecnomecanica', 'tecnomecanicaVence'],
  tarjeta_propiedad: ['fotoTarjetaPropiedad'],
  foto_vehiculo: ['fotoVehiculo'],
  foto_conductor: ['fotoConductor'],
};
const TIPOS = { piaggio: 'Piaggio', furgon: 'Furgón', camioneta: 'Camioneta' };
const norm = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().split(' ')[0];
const hoy = () => new Date().toISOString().slice(0, 10);
const vencido = (f) => !!f && String(f).slice(0, 10) < hoy();

const Dato = ({ label, children }) => (
  <div className="detail-list__item">
    <span className="detail-list__label">{label}</span>
    <span className="detail-list__value">{children || '—'}</span>
  </div>
);

function Documento({ etiqueta, path, vence, falta }) {
  const url = resolveStorageUrl(path);
  return (
    <div className="stack dv-doc">
      <span className="detail-list__label">{etiqueta}</span>
      {url ? (
        <a href={url} target="_blank" rel="noopener noreferrer" aria-label={`Abrir ${etiqueta} en grande`}>
          <img src={url} alt={etiqueta} className="thumb thumb--link" loading="lazy" />
        </a>
      ) : (
        <Badge variant={falta ? 'danger' : 'success'} size="sm">{falta ? 'Falta' : 'Cargado'}</Badge>
      )}
      {vence !== undefined && url && (
        <span className={vencido(vence) ? 'text-danger text-sm' : 'cell-user__meta'}>
          {vence ? `Vence ${formatDate(vence)}${vencido(vence) ? ' (vencido)' : ''}` : 'Sin fecha de vencimiento'}
        </span>
      )}
    </div>
  );
}

/**
 * Detalle completo de un conductor en verificación (admin y moderador usan este mismo).
 * `c` es la fila del conductor tal como la manda el servidor; los campos que no vengan se omiten.
 */
export default function DetalleVerificacion({ c }) {
  const { documentos } = useDocumentosConductor();
  const u = c.usuario || {};
  const faltan = faltantesDe(c);
  const bloqueo = textoFaltantes(faltan);
  const tipoNuevo = TIPOS[norm(c.tipoVehiculo)];
  const contacto = [u.contactoEmergenciaNombre, u.contactoEmergenciaTelefono].filter(Boolean).join(' · ');

  return (
    <div className="stack">
      <div className="dv-cabecera">
        <Avatar src={u.avatar || c.fotoConductor} name={fullName(u)} size={72} />
        <div className="dv-cabecera__texto">
          <strong className="dv-cabecera__nombre">{fullName(u)}</strong>
          <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
            <StatusBadge status={c.estadoVerificacion || 'pendiente'} />
            {c.ciudad && <Badge variant="info" size="sm">{c.ciudad}</Badge>}
            {c.referidoPor && <Badge variant="violet" size="sm">Referido por {c.referidoPor}</Badge>}
          </div>
          {bloqueo && <span className="text-warning text-sm">{bloqueo}</span>}
        </div>
      </div>

      <div className="detail-list">
        <Dato label="Correo">{u.email}</Dato>
        <Dato label="Teléfono">{u.telefono}</Dato>
        <Dato label="Edad">{u.edad ? `${u.edad} años` : null}</Dato>
        <Dato label="Contacto de emergencia">{contacto}</Dato>
        <Dato label="Modelo">{c.modeloVehiculo}</Dato>
        <Dato label="Placa">{c.placa && <span className="text-mono">{c.placa}</span>}</Dato>
        <Dato label="Tipo de vehículo">
          {c.tipoVehiculo && (
            <>
              {tipoNuevo || c.tipoVehiculo}
              {!tipoNuevo && <> <Badge variant="neutral" size="sm">tipo antiguo</Badge></>}
            </>
          )}
        </Dato>
        <Dato label="Capacidad">{c.capacidad}</Dato>
        <Dato label="Solicitud">{c.createdAt && formatDate(c.createdAt)}</Dato>
        {c.notaRechazo && <Dato label="Nota de rechazo">{c.notaRechazo}</Dato>}
      </div>

      <hr className="divider" />
      <h3 className="section-title">Documentos</h3>
      <div className="dv-docs">
        {documentos.map(({ clave, etiqueta }) => {
          if (clave === 'numero_cedula') {
            return (
              <div key={clave} className="stack dv-doc">
                <span className="detail-list__label">{etiqueta}</span>
                {c.cedula && !faltan.includes(clave)
                  ? <span className="detail-list__value text-mono">{c.cedula}</span>
                  : <Badge variant="danger" size="sm">Falta</Badge>}
              </div>
            );
          }
          const [foto, vence] = CAMPOS[clave] || [];
          return (
            <Documento
              key={clave}
              etiqueta={etiqueta}
              path={foto ? c[foto] : null}
              vence={vence ? (c[vence] ?? null) : undefined}
              falta={faltan.includes(clave)}
            />
          );
        })}
      </div>
    </div>
  );
}
