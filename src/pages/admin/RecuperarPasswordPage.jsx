import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { Button, Input } from '../../components/ui';
import { errorMessage } from '../../utils/format';
import './LoginPage.css';

/** Pública: correo → código de 6 dígitos (vence en 10 min) → nueva contraseña. */
export default function RecuperarPasswordPage() {
  const [paso, setPaso] = useState(1);
  const [email, setEmail] = useState('');
  const [codigo, setCodigo] = useState('');
  const [password, setPassword] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  const enviarCodigo = async (e) => {
    e.preventDefault();
    if (!email.trim()) return setError('Ingresa tu correo.');
    setEnviando(true); setError('');
    try {
      await api.post('/api/auth/forgot-password', { email: email.trim() });
      setPaso(2);
    } catch (err) {
      setError(errorMessage(err, 'No se pudo enviar el código.'));
    } finally { setEnviando(false); }
  };

  const cambiar = async (e) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(codigo.trim())) return setError('El código tiene 6 dígitos.');
    if (password.length < 8) return setError('La contraseña debe tener mínimo 8 caracteres.');
    if (password !== confirmar) return setError('Las contraseñas no coinciden.');
    setEnviando(true); setError('');
    try {
      await api.post('/api/auth/reset-password', { email: email.trim(), codigo: codigo.trim(), password });
      setPaso(3);
    } catch (err) {
      setError(errorMessage(err, 'No se pudo cambiar la contraseña.'));
    } finally { setEnviando(false); }
  };

  return (
    <div className="login">
      <aside className="login__aside">
        <div className="login__brand">
          <img src="/logo.png" alt="" width="44" height="44" className="login__logo" />
          <span>Carga Express</span>
        </div>
        <div className="login__pitch">
          <h1>Recupera tu acceso.</h1>
          <p>Te enviamos un código por correo para que elijas una contraseña nueva.</p>
        </div>
        <span className="login__legal">© {new Date().getFullYear()} Carga Express</span>
      </aside>

      <main className="login__main">
        {paso === 1 && (
          <form className="login__card" onSubmit={enviarCodigo} noValidate>
            <div className="login__header">
              <h2>¿Olvidaste tu contraseña?</h2>
              <p>Escribe tu correo y te enviamos un código de 6 dígitos.</p>
            </div>
            {error && <div className="page-error" role="alert">{error}</div>}
            <Input label="Correo electrónico" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
            <Button type="submit" size="lg" fullWidth loading={enviando}>Enviar código</Button>
            <p className="login__hint"><Link to="/ingresar">Volver a ingresar</Link></p>
          </form>
        )}
        {paso === 2 && (
          <form className="login__card" onSubmit={cambiar} noValidate>
            <div className="login__header">
              <h2>Nueva contraseña</h2>
              <p>Si el correo existe, te enviamos un código a {email}. Vence en 10 minutos.</p>
            </div>
            {error && <div className="page-error" role="alert">{error}</div>}
            <Input label="Código de 6 dígitos" inputMode="numeric" maxLength={6} autoComplete="one-time-code" value={codigo} onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ''))} autoFocus />
            <Input label="Nueva contraseña" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <Input label="Confirmar contraseña" type="password" autoComplete="new-password" value={confirmar} onChange={(e) => setConfirmar(e.target.value)} />
            <Button type="submit" size="lg" fullWidth loading={enviando}>Cambiar contraseña</Button>
            <p className="login__hint"><button type="button" className="btn btn--ghost btn--sm" onClick={() => { setPaso(1); setError(''); }}>Pedir otro código</button></p>
          </form>
        )}
        {paso === 3 && (
          <div className="login__card">
            <div className="login__header">
              <h2>Contraseña cambiada</h2>
              <p>Ya puedes entrar con tu contraseña nueva.</p>
            </div>
            <Link className="btn btn--primary btn--lg btn--full" to="/ingresar">Ingresar</Link>
          </div>
        )}
      </main>
    </div>
  );
}
