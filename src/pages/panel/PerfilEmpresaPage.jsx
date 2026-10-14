import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { getAdminEmpresa } from '../../api/admin';
import { errorMessage, formatCurrency, formatDate } from '../../utils/format';
import { AvatarAmpliable, DocumentoFoto, TarjetaPersona } from '../../components/panel';
import { PageHeader, Card, DataTable, Badge, StatusBadge, LoadingState } from '../../components/ui';

const ESTADO = { aprobada: ['success', 'Verificada'], aprobado: ['success', 'Verificada'], pendiente: ['warning', 'Pendiente'], rechazada: ['danger', 'Rechazada'], rechazado: ['danger', 'Rechazada'] };

function Detail({ label, children }) {
  return (
    <div className="detail-list__item">
      <span className="detail-list__label">{label}</span>
      <span className="detail-list__value">{children || '—'}</span>
    </div>
  );
}

/** Perfil de la empresa (solo admin). */
export default function PerfilEmpresaPage() {
  const { id } = useParams();
  const [e, setE] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    getAdminEmpresa(id)
      .then((r) => setE(r.data))
      .catch((x) => setError(errorMessage(x, 'Error al cargar la empresa')));
  }, [id]);

  const volver = <Link className="btn btn--secondary btn--sm" to="/admin/empresas"><ArrowLeft size={14} /> Volver</Link>;
  if (error) return <div className="page"><PageHeader title="Perfil de la empresa" actions={volver} /><div className="page-error" role="alert">{error}</div></div>;
  if (!e) return <div className="page"><LoadingState /></div>;

  const [variante, etiqueta] = ESTADO[e.estado] || ['neutral', e.estado || '—'];
  const miembroCols = [
    { key: 'nombre', label: 'Miembro', render: (_, r) => <TarjetaPersona persona={r} tipo="cliente" area="admin" size={28} /> },
    { key: 'email', label: 'Correo', render: (x) => x || '—' },
    { key: 'estado', label: 'Estado', render: (x) => <Badge variant={x === 'dueno' ? 'info' : x === 'aprobado' ? 'success' : 'warning'}>{x === 'dueno' ? 'Dueño' : x || '—'}</Badge> },
    { key: 'id', label: 'Perfil', render: (x) => <Link className="btn btn--soft-primary btn--sm" to={`/admin/clients/${x}`}>Ver perfil</Link> },
  ];
  const viajeCols = [
    { key: 'id', label: 'Viaje', render: (x) => <Link className="text-mono text-strong" to={`/admin/trips?viaje=${x}`}>#{x}</Link> },
    { key: 'estado', label: 'Estado', render: (x) => <StatusBadge status={x} /> },
    { key: 'origen', label: 'Origen', render: (x) => x || '—' },
    { key: 'destino', label: 'Destino', render: (x) => x || '—' },
    { key: 'precioFinal', label: 'Precio', render: (x) => (x != null ? formatCurrency(x) : '—') },
    { key: 'createdAt', label: 'Fecha', render: (x) => <span className="nowrap text-muted">{formatDate(x)}</span> },
  ];
  return (
    <div className="page">
      <PageHeader title="Perfil de la empresa" actions={volver} />
      <Card>
        <div className="perfil-cab">
          <AvatarAmpliable name={e.nombre} size={112} className="perfil-cab__foto" />
          <div className="perfil-cab__info">
            <h2 className="perfil-cab__nombre">{e.nombre}</h2>
            <span className="text-muted">NIT {e.nit || 'N/A'}{!e.nit && ' · Emprendimiento'}</span>
            <div className="perfil-cab__badges">
              <Badge variant={variante}>{etiqueta}</Badge>
              <Badge variant="neutral">Código {e.codigo || '—'}</Badge>
            </div>
            <span className="text-sm text-muted">Registrada {formatDate(e.createdAt)}</span>
          </div>
        </div>
      </Card>
      <div className="two-col">
        <Card title="Datos">
          <div className="detail-list">
            <Detail label="Razón social">{e.nombre}</Detail>
            <Detail label="NIT">{e.nit || 'N/A (emprendimiento)'}</Detail>
            <Detail label="Dirección">{e.direccion}</Detail>
            <Detail label="Teléfono">{e.telefono}</Detail>
            <Detail label="Viajes totales">{e.totalViajes}</Detail>
            {e.notaRechazo && <Detail label="Nota de rechazo">{e.notaRechazo}</Detail>}
          </div>
        </Card>
        <Card title="Dueño">
          {e.dueno ? (
            <>
              <TarjetaPersona persona={e.dueno} tipo="cliente" area="admin" size={40} />
              <div className="detail-list">
                <Detail label="Correo">{e.dueno.email}</Detail>
                <Detail label="Teléfono">{e.dueno.telefono}</Detail>
              </div>
              <Link className="btn btn--soft-primary btn--sm" to={`/admin/clients/${e.dueno.id}`}>Ver perfil</Link>
            </>
          ) : <span className="text-muted">Sin dueño</span>}
        </Card>
      </div>
      <Card title="Documentos">
        <div className="perfil-docs">
          <DocumentoFoto label="RUT" path={e.rut} />
          <DocumentoFoto label="Cámara de comercio" path={e.camara} />
        </div>
      </Card>
      <Card title="Miembros">
        <DataTable columns={miembroCols} data={e.miembros || []} emptyMessage="Sin miembros" rowKey="id" />
      </Card>
      <Card title="Viajes recientes">
        <DataTable columns={viajeCols} data={e.viajes || []} emptyMessage="Sin viajes" rowKey="id" />
      </Card>
    </div>
  );
}
