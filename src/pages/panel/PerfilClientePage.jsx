import { useState, useEffect, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, MessageSquare } from 'lucide-react';
import { getClientProfile } from '../../api/moderator';
import { errorMessage, formatCurrency, formatDate, fullName } from '../../utils/format';
import { resolveStorageUrl } from '../../utils/storage';
import { TarjetaPersona } from '../../components/panel';
import {
  PageHeader, Card, DataTable, Avatar, Badge, StatusBadge, LoadingState, StatCard,
} from '../../components/ui';

function Detail({ label, children }) {
  return (
    <div className="detail-list__item">
      <span className="detail-list__label">{label}</span>
      <span className="detail-list__value">{children || '—'}</span>
    </div>
  );
}

/** Perfil del cliente compartido. props: { area: 'admin'|'moderator' } */
export default function PerfilClientePage({ area = 'moderator' }) {
  const { id } = useParams();
  const [cliente, setCliente] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const volverA = `/${area}/clients`;

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getClientProfile(id);
      setCliente(res.data);
    } catch (err) {
      const st = err.response?.status;
      if (st === 404) setError(err.response?.data?.message || 'Cliente no encontrado');
      else setError(errorMessage(err, 'Error al cargar el perfil del cliente'));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { cargar(); }, [cargar]);

  if (loading) return <div className="page"><LoadingState /></div>;
  if (error || !cliente) {
    return (
      <div className="page">
        <PageHeader title="Perfil del cliente" actions={<Link className="btn btn--secondary btn--sm" to={volverA}><ArrowLeft size={14} /> Volver</Link>} />
        <div className="page-error" role="alert">{error || 'Cliente no encontrado'}</div>
      </div>
    );
  }

  const c = cliente;
  const nombre = fullName(c);
  const foto = resolveStorageUrl(c.avatar);
  const cab = (
    <PageHeader title="Perfil del cliente" actions={<Link className="btn btn--secondary btn--sm" to={volverA}><ArrowLeft size={14} /> Volver</Link>} />
  );

  if (c.completo === false) {
    return (
      <div className="page">
        {cab}
        <Card>
          <div className="perfil-cab">
            {foto ? <img src={foto} alt={nombre} className="perfil-cab__foto" /> : <Avatar name={nombre} size={112} />}
            <div className="perfil-cab__info">
              <h2 className="perfil-cab__nombre">{nombre}</h2>
              <p className="perfil-aviso">Datos completos solo con un caso abierto (ticket, SOS o disputa) en tu zona.</p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  const v = c.viajesPorEstado || {};
  const viajes = c.viajes || [];
  const disputas = c.disputas || [];
  const tickets = c.tickets || [];
  const suspendida = c.estadoCuenta === 'suspendida' || c.suspendido;

  const viajeCols = [
    { key: 'id', label: 'Viaje', render: (x) => <Link className="text-mono text-strong" to={`/${area}/trips?viaje=${x}`}>#{x}</Link> },
    { key: 'estado', label: 'Estado', render: (x, r) => (r.estadoLabel ? <Badge variant="neutral">{r.estadoLabel}</Badge> : <StatusBadge status={x} />) },
    { key: 'conductor', label: 'Conductor', render: (x) => (x ? <TarjetaPersona persona={x} tipo="conductor" area={area} size={24} /> : '—') },
    { key: 'origen', label: 'Origen', render: (x) => <span title={x}>{x || '—'}</span> },
    { key: 'destino', label: 'Destino', render: (x) => <span title={x}>{x || '—'}</span> },
    { key: 'precioFinal', label: 'Precio', render: (x) => (x != null ? formatCurrency(x) : '—') },
    { key: 'createdAt', label: 'Fecha', render: (x) => <span className="nowrap text-muted">{formatDate(x)}</span> },
  ];
  const disputaCols = [
    { key: 'id', label: 'Disputa', render: (x, r) => <Link className="text-mono text-strong" to={`/${area}/disputes?viaje=${r.viajeId}`}>#{x}</Link> },
    { key: 'viajeId', label: 'Viaje', render: (x) => (x ? <Link className="text-mono" to={`/${area}/trips?viaje=${x}`}>#{x}</Link> : '—') },
    { key: 'estado', label: 'Estado', render: (x) => <StatusBadge status={x} /> },
    { key: 'resultado', label: 'Resultado', render: (x) => (x === 'favor_conductor' ? 'A favor del conductor' : x === 'favor_cliente' ? 'A favor del cliente' : '—') },
    { key: 'createdAt', label: 'Fecha', render: (x) => <span className="nowrap text-muted">{formatDate(x)}</span> },
  ];
  const ticketCols = [
    { key: 'id', label: 'Ticket', render: (x) => <Link className="text-mono text-strong" to={`/${area}/tickets?ticket=${x}`}>#{x}</Link> },
    { key: 'asunto', label: 'Asunto', render: (x) => x || '—' },
    { key: 'estado', label: 'Estado', render: (x) => <StatusBadge status={x} /> },
    { key: 'zona', label: 'Zona', render: (x) => x || '—' },
    { key: 'createdAt', label: 'Fecha', render: (x) => <span className="nowrap text-muted">{formatDate(x)}</span> },
  ];

  return (
    <div className="page">
      {cab}

      <Card>
        <div className="perfil-cab">
          {foto ? <img src={foto} alt={nombre} className="perfil-cab__foto" /> : <Avatar name={nombre} size={112} />}
          <div className="perfil-cab__info">
            <h2 className="perfil-cab__nombre">{nombre}</h2>
            <span className="text-muted">{[c.email, c.telefono].filter(Boolean).join(' · ')}</span>
            <div className="perfil-cab__badges">
              {suspendida ? <Badge variant="danger">Cuenta suspendida</Badge> : <Badge variant="success">{c.estadoCuenta || 'activa'}</Badge>}
              {c.tieneDeudaActiva && <Badge variant="warning">Deuda {formatCurrency(c.montoDeuda || 0)}</Badge>}
              {c.empresaId && <Badge variant="info">Empresa #{c.empresaId}</Badge>}
            </div>
            <span className="text-sm text-muted">Registrado {formatDate(c.createdAt)}</span>
          </div>
          {c.id && (
            <div className="perfil-cab__acciones">
              <Link className="btn btn--soft-primary btn--sm" to={`/${area}/conversations?usuario=${c.id}`}>
                <MessageSquare size={14} /> Chat
              </Link>
            </div>
          )}
        </div>
      </Card>

      <div className="stats-grid">
        <StatCard title="Viajes" value={v.total ?? viajes.length} />
        <StatCard title="Finalizados" value={v.finalizados ?? 0} color="success" />
        <StatCard title="Cancelados" value={v.cancelados ?? 0} color="danger" />
        <StatCard title="En curso" value={v.enCurso ?? v.en_curso ?? 0} color="primary" />
      </div>

      <div className="two-col">
        <Card title="Datos personales">
          <div className="detail-list">
            <Detail label="Correo">{c.email}</Detail>
            <Detail label="Teléfono">{c.telefono}</Detail>
            <Detail label="Cédula">{c.cedula}</Detail>
            <Detail label="Edad">{c.edad}</Detail>
            <Detail label="Calificación">{c.calificacion != null ? `${Number(c.calificacion).toFixed(1)} ★` : null}</Detail>
            <Detail label="Contacto de emergencia">
              {c.contactoEmergenciaNombre ? `${c.contactoEmergenciaNombre}${c.contactoEmergenciaTelefono ? ` · ${c.contactoEmergenciaTelefono}` : ''}` : null}
            </Detail>
          </div>
        </Card>
        <Card title="Cuenta">
          <div className="detail-list">
            <Detail label="Estado de la cuenta">{c.estadoCuenta}</Detail>
            <Detail label="Deuda">{c.tieneDeudaActiva ? formatCurrency(c.montoDeuda || 0) : 'Al día'}</Detail>
            {c.tieneDeudaActiva && <Detail label="Plazo de pago">{c.deudaFechaLimite ? formatDate(c.deudaFechaLimite) : null}</Detail>}
            <Detail label="Empresa">{c.empresaId ? `#${c.empresaId}` : null}</Detail>
            <Detail label="Registrado">{formatDate(c.createdAt)}</Detail>
          </div>
        </Card>
      </div>

      <Card title="Viajes">
        <DataTable columns={viajeCols} data={viajes} emptyMessage="Sin viajes todavía" rowKey="id" />
      </Card>

      <div className="two-col">
        <Card title="Disputas">
          <DataTable columns={disputaCols} data={disputas} emptyMessage="Sin disputas" rowKey="id" />
        </Card>
        <Card title="Tickets">
          <DataTable columns={ticketCols} data={tickets} emptyMessage="Sin tickets" rowKey="id" />
        </Card>
      </div>
    </div>
  );
}
