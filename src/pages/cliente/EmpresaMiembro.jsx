import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Clock, LogOut } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { clienteApi } from '../../api/cliente';
import { Input } from '../../components/ui';
import { errorMessage } from '../../utils/format';

/** Cliente sin empresa: unirse con el código (POST /api/empresas/unirse) o registrar una. */
export function SinEmpresa() {
  const { refreshProfile } = useAuth();
  const [codigo, setCodigo] = useState('');
  const [cedula, setCedula] = useState('');
  const [errores, setErrores] = useState({});
  const [enviando, setEnviando] = useState(false);

  const unirse = async (e) => {
    e.preventDefault();
    setEnviando(true);
    setErrores({});
    try {
      await clienteApi.empresaUnirse({ codigo: codigo.trim(), cedula: cedula.trim() });
      await refreshProfile();
    } catch (err) {
      const campo = err?.response?.data?.field;
      const msg = errorMessage(err, 'No se pudo enviar la solicitud');
      setErrores(campo === 'cedula' ? { cedula: msg } : { codigo: msg });
    }
    setEnviando(false);
  };

  return (
    <section className="cli-emp">
      <div className="cli-card">
        <h2 className="cli-emp__h2">¿Tu empresa ya usa CargaExpress?</h2>
        <p className="cli-suave">Únete con el código que te dio el dueño. Él tendrá que aprobar tu solicitud.</p>
        <form onSubmit={unirse} noValidate>
          <Input label="Código de la empresa" value={codigo} onChange={(e) => setCodigo(e.target.value)} error={errores.codigo} maxLength={20} autoCapitalize="characters" />
          <Input label="Cédula" inputMode="numeric" value={cedula} onChange={(e) => setCedula(e.target.value)} error={errores.cedula} maxLength={10} />
          <button type="submit" className="cli-btn" disabled={enviando || !codigo.trim()}>
            <Building2 size={16} />{enviando ? 'Enviando…' : 'Unirme a la empresa'}
          </button>
        </form>
      </div>
      <div className="cli-card">
        <h2 className="cli-emp__h2">¿Aún no tienes cuenta de empresa?</h2>
        <Link to="/empresas/registro" className="cli-btn cli-btn--borde">Registrar mi empresa</Link>
      </div>
    </section>
  );
}

/** Empleado (no dueño): estado de su solicitud y botón para salir (POST /api/empresas/salir). */
export function Miembro({ empresa }) {
  const { refreshProfile } = useAuth();
  const [estado, setEstado] = useState(null);
  const [error, setError] = useState(null);
  const [saliendo, setSaliendo] = useState(false);

  useEffect(() => {
    clienteApi.empresa()
      .then((r) => setEstado((r.data?.data || r.data)?.empresa?.estadoMiembro))
      .catch(() => {});
  }, []);

  const salir = async () => {
    if (!window.confirm(`¿Salir de ${empresa.nombre}? Tus viajes dejarán de cargarse a la empresa.`)) return;
    setSaliendo(true);
    setError(null);
    try {
      await clienteApi.empresaSalir();
      await refreshProfile();
    } catch (e) {
      setError(errorMessage(e, 'No se pudo salir de la empresa'));
      setSaliendo(false);
    }
  };

  const pendiente = estado === 'pendiente';
  return (
    <section className="cli-emp">
      <div className="cli-card">
        <h2 className="cli-emp__h2">{empresa.nombre}</h2>
        {pendiente ? (
          <p role="status"><Clock size={16} /> Pendiente de aprobación del dueño. Te avisaremos cuando te acepte.</p>
        ) : (
          <p className="cli-suave">Eres parte de esta empresa. Tus envíos se cargan a su cuenta.</p>
        )}
        {error && <p className="cli-error" role="alert">{error}</p>}
        <button type="button" className="cli-btn cli-btn--borde" onClick={salir} disabled={saliendo}>
          <LogOut size={16} />{saliendo ? 'Saliendo…' : 'Salir de la empresa'}
        </button>
      </div>
    </section>
  );
}
