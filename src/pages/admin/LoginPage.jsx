import { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, Truck, ShieldCheck, Route, Siren } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Button, Input } from '../../components/ui';
import { errorMessage } from '../../utils/format';
import './LoginPage.css';

const homeFor = (u) => (u?.rol === 'admin' ? '/admin' : u?.esModerador ? '/moderator' : null);

export default function LoginPage() {
  const { login, logout, user, loading: authLoading } = useAuth();
  const { pathname } = useLocation();
  const isModeratorLogin = pathname.startsWith('/moderator');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { setError(''); }, [email, password]);

  if (!authLoading && user && homeFor(user)) return <Navigate to={homeFor(user)} replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Ingresa tu correo y contraseña.');
      return;
    }
    setSubmitting(true);
    try {
      const u = await login(email.trim(), password);
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
        </form>
      </main>
    </div>
  );
}
