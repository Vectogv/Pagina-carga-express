import { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, Truck, ShieldCheck, Route, Siren } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Button, Input } from '../../components/ui';
import { errorMessage } from '../../utils/format';
import './LoginPage.css';

const homeFor = (u) => (u?.rol === 'admin' ? '/admin' : u?.esModerador ? '/moderator' : null);

/**
 * Cuentas de prueba, visibles a propósito para poder probar la plataforma.
 * Solo el admin y el moderador entran a este panel; el cliente y el conductor
 * son para la app móvil (aquí el panel los rechaza, por eso se marcan).
 */
const CUENTAS_PRUEBA = [
  { rol: 'Admin', email: 'admin.demo@cargaexpress.co', zona: 'Nacional', panel: true },
  { rol: 'Moderador', email: 'moderador.demo@cargaexpress.co', zona: 'Popayán', panel: true },
  { rol: 'Conductor', email: 'conductor.demo@cargaexpress.co', zona: 'Popayán', panel: false },
  { rol: 'Cliente', email: 'cliente.demo@cargaexpress.co', zona: 'Popayán', panel: false },
];
const CLAVE_PRUEBA = 'Demo1234';

export default function LoginPage() {
  const { login, logout, user, loading: authLoading } = useAuth();
  const { pathname } = useLocation();
  const isModeratorLogin = pathname.startsWith('/moderator');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  // Aviso de las cuentas de prueba: va aparte del error porque rellenar el
  // formulario cambia email/password y el efecto de abajo limpia `error`.
  const [nota, setNota] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { setError(''); }, [email, password]);

  if (!authLoading && user && homeFor(user)) return <Navigate to={homeFor(user)} replace />;

  const entrar = async (correo, clave) => {
    if (!correo.trim() || !clave) {
      setError('Ingresa tu correo y contraseña.');
      return;
    }
    setSubmitting(true);
    try {
      const u = await login(correo.trim(), clave);
      if (!homeFor(u)) {
        await logout();
        setError('Tu cuenta no tiene acceso al panel. Usa la app móvil.');
      }
    } catch (err) {
      const status = err?.response?.status;
      if (status === 400 || status === 401) setError('Correo o contraseña incorrectos.');
      else if (!err?.response) setError('No hay conexión con el servidor. Intenta de nuevo.');
      else setError(errorMessage(err, 'No se pudo iniciar sesión.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    entrar(email, password);
  };

  /** Cuenta de prueba: entra directo si es del panel; si es de la app, solo rellena. */
  const usarCuenta = (c) => {
    setEmail(c.email);
    setPassword(CLAVE_PRUEBA);
    if (c.panel) {
      setNota('');
      entrar(c.email, CLAVE_PRUEBA);
    } else {
      setNota(`${c.rol}: esta cuenta es para la app móvil. El panel solo admite admin y moderador; te dejo los datos copiados en el formulario.`);
    }
  };

  return (
    <div className="login">
      <aside className="login__aside">
        <div className="login__brand">
          <div className="login__logo"><Truck size={20} /></div>
          <span>Carga Express</span>
        </div>
        <div className="login__pitch">
          <h1>Operación de carga, en tiempo real.</h1>
          <p>Supervisa viajes, conductores y emergencias desde un solo panel.</p>
          <ul className="login__features">
            <li><Route size={16} /> Seguimiento de viajes en vivo</li>
            <li><Siren size={16} /> Alertas SOS y atención inmediata</li>
            <li><ShieldCheck size={16} /> Verificación de conductores</li>
          </ul>
        </div>
        <span className="login__legal">© {new Date().getFullYear()} Carga Express</span>
      </aside>

      <main className="login__main">
        <form className="login__card" onSubmit={handleSubmit} noValidate>
          <div className="login__header">
            <h2>{isModeratorLogin ? 'Acceso de moderación' : 'Iniciar sesión'}</h2>
            <p>Ingresa con tu cuenta de administrador o moderador.</p>
          </div>

          {error && <div className="page-error" role="alert">{error}</div>}

          <Input
            label="Correo electrónico"
            type="email"
            autoComplete="username"
            placeholder="nombre@empresa.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoFocus
          />

          <div className="login__password">
            <Input
              label="Contraseña"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              className="login__toggle"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          <Button type="submit" size="lg" fullWidth loading={submitting}>
            Entrar
          </Button>

          <p className="login__hint">¿Olvidaste tu contraseña? Pide a un administrador que la restablezca.</p>

          <div className="login__demo">
            <div className="login__demo-head">
              <span className="login__demo-title">Cuentas de prueba</span>
              <span className="login__demo-pass">
                Contraseña: <span className="text-mono">{CLAVE_PRUEBA}</span>
              </span>
            </div>
            <ul className="login__demo-list">
              {CUENTAS_PRUEBA.map((c) => (
                <li key={c.email} className="login__demo-item">
                  <span className="login__demo-rol">{c.rol}</span>
                  <span className="login__demo-zona">{c.zona}</span>
                  <span className="login__demo-email text-mono truncate" title={c.email}>{c.email}</span>
                  <button
                    type="button"
                    className="login__demo-btn"
                    onClick={() => usarCuenta(c)}
                    disabled={submitting}
                  >
                    {c.panel ? 'Entrar' : 'Usar'}
                  </button>
                </li>
              ))}
            </ul>
            {nota && <p className="login__demo-aviso" role="status">{nota}</p>}
            <p className="login__demo-note">
              Conductor y cliente son para la app móvil; este panel solo admite admin y moderador.
            </p>
          </div>
        </form>
      </main>
    </div>
  );
}
