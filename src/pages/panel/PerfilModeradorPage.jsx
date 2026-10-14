import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { getAdminModerator } from '../../api/admin';
import { errorMessage, formatDate, fullName } from '../../utils/format';
import { AvatarAmpliable } from '../../components/panel';
import { PageHeader, Card, Badge, LoadingState } from '../../components/ui';

const CONTRATO = {
  activo: ['success', 'Contrato activo'],
  contrato_enviado: ['info', 'Contrato por firmar'],
  solicitado: ['warning', 'Solicitud en revisión'],
  rechazado: ['danger', 'Rechazado'],
  suspendido: ['danger', 'Suspendido'],
  vencido: ['neutral', 'Vencido'],
  sin_enviar: ['neutral', 'Sin verificar'],
};

function Detail({ label, children }) {
  return (
    <div className="detail-list__item">
      <span className="detail-list__label">{label}</span>
      <span className="detail-list__value">{children || '—'}</span>
    </div>
  );
}

/** Perfil del moderador (solo admin). */
export default function PerfilModeradorPage() {
  const { id } = useParams();
  const [m, setM] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    getAdminModerator(id)
      .then((r) => setM(r.data))
      .catch((e) => setError(errorMessage(e, 'Error al cargar el moderador')));
  }, [id]);

  const volver = <Link className="btn btn--secondary btn--sm" to="/admin/moderators"><ArrowLeft size={14} /> Volver</Link>;
  if (error) return <div className="page"><PageHeader title="Perfil del moderador" actions={volver} /><div className="page-error" role="alert">{error}</div></div>;
  if (!m) return <div className="page"><LoadingState /></div>;

  const nombre = fullName(m);
  const [variante, etiqueta] = CONTRATO[m.contrato?.estado] || CONTRATO.sin_enviar;
  return (
    <div className="page">
      <PageHeader title="Perfil del moderador" actions={volver} />
      <Card>
        <div className="perfil-cab">
          <AvatarAmpliable src={m.avatar} name={nombre} size={112} className="perfil-cab__foto" />
          <div className="perfil-cab__info">
            <h2 className="perfil-cab__nombre">{nombre}</h2>
            <span className="text-muted">{[m.email, m.telefono].filter(Boolean).join(' · ')}</span>
            <div className="perfil-cab__badges">
              <Badge variant={variante}>{etiqueta}</Badge>
              {m.contrato?.numero && <Badge variant="info">{m.contrato.numero}</Badge>}
              {m.suspendido && <Badge variant="danger">Cuenta suspendida</Badge>}
              {m.zona && <Badge variant="neutral">Zona {m.zona}</Badge>}
            </div>
            <span className="text-sm text-muted">Registrado {formatDate(m.createdAt)}</span>
          </div>
          <div className="perfil-cab__acciones">
            <Link className="btn btn--soft-primary btn--sm" to="/admin/moderadores-verificaciones">Ver verificación y contrato</Link>
          </div>
        </div>
      </Card>
      <div className="two-col">
        <Card title="Datos personales">
          <div className="detail-list">
            <Detail label="Correo">{m.email}</Detail>
            <Detail label="Teléfono">{m.telefono}</Detail>
            <Detail label="Cédula">{m.cedula}</Detail>
            <Detail label="Edad">{m.edad}</Detail>
            <Detail label="Contacto de emergencia">
              {m.contactoEmergenciaNombre ? `${m.contactoEmergenciaNombre}${m.contactoEmergenciaTelefono ? ` · ${m.contactoEmergenciaTelefono}` : ''}` : null}
            </Detail>
            <Detail label="Términos aceptados">{m.terminosAceptadosAt ? formatDate(m.terminosAceptadosAt) : null}</Detail>
          </div>
        </Card>
        <Card title="Contrato">
          <div className="detail-list">
            <Detail label="Estado">{etiqueta}</Detail>
            <Detail label="Número">{m.contrato?.numero}</Detail>
            <Detail label="Zona del contrato">{m.contrato?.zona}</Detail>
            <Detail label="Desde">{m.contrato?.desde ? formatDate(m.contrato.desde) : null}</Detail>
            <Detail label="Hasta">{m.contrato?.hasta ? formatDate(m.contrato.hasta) : null}</Detail>
            {m.contrato?.notaRechazo && <Detail label="Nota de rechazo">{m.contrato.notaRechazo}</Detail>}
          </div>
        </Card>
      </div>
    </div>
  );
}
