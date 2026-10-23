import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getInvitacionPublica, enviarSolicitudInvitacion } from '../../api/invitacion';
import { Button, Input } from '../../components/ui';
import { errorMessage } from '../../utils/format';
import './LoginPage.css';

const VACIO = { nombre: '', apellido: '', email: '', telefono: '', cedula: '', password: '', confirmar: '', acepta: false };
const FOTOS = [
  ['cedulaFrente', 'Foto de la cédula (frente)'],
  ['cedulaReverso', 'Foto de la cédula (reverso)'],
  ['rostro', 'Foto de tu rostro'],
];
const MAX_MB = 5;

/** Pública (sin sesión): el enlace de invitación es el permiso. Crea el moderador con verificación 'solicitado'. */
export default function InvitacionModeradorPage() {
  const { token } = useParams();
  const [inv, setInv] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [invalida, setInvalida] = useState('');
  const [f, setF] = useState(VACIO);
  const [fotos, setFotos] = useState({});
  const [errores, setErrores] = useState({});
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [hecho, setHecho] = useState(false);

  useEffect(() => {
    let vivo = true;
    getInvitacionPublica(token)
      .then((r) => {
        if (!vivo) return;
        setInv(r.data);
        if (r.data.email) setF((p) => ({ ...p, email: r.data.email }));
      })
      .catch((err) => vivo && setInvalida(errorMessage(err, 'No se pudo abrir la invitación.')))
      .finally(() => vivo && setCargando(false));
    return () => { vivo = false; };
  }, [token]);

  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));

  const validar = () => {
    const er = {};
    if (!f.nombre.trim()) er.nombre = 'Escribe tu nombre.';
    if (!f.apellido.trim()) er.apellido = 'Escribe tu apellido.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.email.trim())) er.email = 'El correo no es válido.';
    if (!/^\+?\d{7,15}$/.test(f.telefono.replace(/[\s-]/g, ''))) er.telefono = 'El teléfono debe tener de 7 a 15 dígitos.';
    if (!/^\d{6,10}$/.test(f.cedula.trim())) er.cedula = 'Solo números, de 6 a 10 dígitos.';
    if (!f.password) er.password = 'Escribe tu contraseña.';
    else if (f.password.length > 32) er.password = 'Máximo 32 caracteres.';
    else if (f.confirmar && f.password !== f.confirmar) er.confirmar = 'Las contraseñas no coinciden.';
    FOTOS.forEach(([k]) => { if (!fotos[k]) er[k] = 'Falta esta foto.'; });
    if (!f.acepta) er.aceptaTratamiento = 'Debes aceptar el tratamiento de tus datos.';
    return er;
  };

  const elegirFoto = (k) => (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    let msg = '';
    if (!/^image\/(jpeg|png)$/.test(file.type)) msg = 'Debe ser JPG o PNG.';
    else if (file.size > MAX_MB * 1024 * 1024) msg = `Pesa más de ${MAX_MB} MB.`;
    setErrores((p) => ({ ...p, [k]: msg }));
    setFotos((p) => ({ ...p, [k]: msg ? null : file }));
  };

  const enviar = async (e) => {
    e.preventDefault();
    const er = validar();
    setErrores(er);
    setError('');
    if (Object.keys(er).some((k) => er[k])) return setError('Revisa los campos marcados.');
    const form = new FormData();
    form.append('nombre', f.nombre.trim());
    form.append('apellido', f.apellido.trim());
    form.append('email', f.email.trim());
    form.append('telefono', f.telefono.trim());
    form.append('cedula', f.cedula.trim());
    form.append('password', f.password);
    form.append('aceptaTratamiento', 'true');
    FOTOS.forEach(([k]) => form.append(k, fotos[k]));
    setEnviando(true);
    try {
      await enviarSolicitudInvitacion(token, form);
      setHecho(true);
    } catch (err) {
      const d = err.response?.data;
      if (d?.field) setErrores((p) => ({ ...p, [d.field]: d.error || d.errors?.[0]?.message }));
      setError(errorMessage(err, 'No se pudo enviar la solicitud.'));
    } finally { setEnviando(false); }
  };

  const foto = (k, label) => (
    <div className="input-group" key={k}>
      <label className="input__label" htmlFor={`foto-${k}`}>{label} <span className="input__required">*</span></label>
      <input id={`foto-${k}`} type="file" accept="image/jpeg,image/png" className="input__field" onChange={elegirFoto(k)} aria-invalid={errores[k] ? true : undefined} />
      {fotos[k] && <span className="input__helper">{fotos[k].name}</span>}
      {errores[k] && <span className="input__error">{errores[k]}</span>}
    </div>
  );

  return (
    <div className="login">
      <aside className="login__aside">
        <div className="login__brand">
          <img src="/logo.png" alt="" width="44" height="44" className="login__logo" />
          <span>Carga Express</span>
        </div>
        <div className="login__pitch">
          <h1>Sé moderador{inv ? ` de ${inv.zonaNombre}` : ''}.</h1>
          <p>Completa tu solicitud. Gerencia revisa tus datos, te envía el contrato y, cuando lo firmes, tu cuenta queda activa.</p>
        </div>
        <span className="login__legal">© {new Date().getFullYear()} Carga Express</span>
      </aside>

      <main className="login__main">
        {cargando && <p>Abriendo invitación…</p>}
        {!cargando && invalida && (
          <div className="login__card">
            <div className="login__header"><h2>Invitación no disponible</h2><p>{invalida}</p></div>
            <Link className="btn btn--secondary btn--lg btn--full" to="/">Ir al inicio</Link>
          </div>
        )}
        {!cargando && inv && hecho && (
          <div className="login__card">
            <div className="login__header">
              <h2>Solicitud enviada</h2>
              <p>Gerencia revisará tus datos. Cuando todo esté bien recibirás el contrato para firmar. Mientras tanto puedes entrar con tu correo y contraseña.</p>
            </div>
            <Link className="btn btn--primary btn--lg btn--full" to="/moderator/login">Ingresar</Link>
          </div>
        )}
        {!cargando && inv && !hecho && (
          <form className="login__card" onSubmit={enviar} noValidate style={{ maxWidth: 460 }}>
            <div className="login__header">
              <h2>Solicitud de moderador</h2>
              <p>Zona: {inv.zonaNombre}. La invitación vence el {new Date(inv.venceAt).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}.</p>
            </div>
            {error && <div className="page-error" role="alert">{error}</div>}
            <Input label="Nombre" required value={f.nombre} onChange={set('nombre')} error={errores.nombre} maxLength={100} autoComplete="given-name" />
            <Input label="Apellido" required value={f.apellido} onChange={set('apellido')} error={errores.apellido} maxLength={100} autoComplete="family-name" />
            <Input label="Correo electrónico" required type="email" value={f.email} onChange={set('email')} error={errores.email} readOnly={!!inv.email} autoComplete="email" />
            <Input label="Teléfono" required type="tel" inputMode="tel" value={f.telefono} onChange={set('telefono')} error={errores.telefono} autoComplete="tel" />
            <Input label="Número de cédula" required inputMode="numeric" maxLength={10} value={f.cedula} onChange={(e) => setF((p) => ({ ...p, cedula: e.target.value.replace(/\D/g, '') }))} error={errores.cedula} />
            <Input label="Contraseña" required type="password" autoComplete="new-password" value={f.password} onChange={set('password')} error={errores.password}
              helperText="Mínimo 8 caracteres. Si ya tienes cuenta con ese correo, escribe tu contraseña actual." />
            <Input label="Confirmar contraseña (cuenta nueva)" type="password" autoComplete="new-password" value={f.confirmar} onChange={set('confirmar')} error={errores.confirmar} />
            {FOTOS.map(([k, label]) => foto(k, label))}
            <div className="input-group">
              <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <input type="checkbox" checked={f.acepta} onChange={(e) => setF((p) => ({ ...p, acepta: e.target.checked }))} style={{ marginTop: 4 }} />
                <span>Acepto el tratamiento de mis datos personales según la <Link to="/privacidad" target="_blank">política de privacidad</Link>.</span>
              </label>
              {errores.aceptaTratamiento && <span className="input__error">{errores.aceptaTratamiento}</span>}
            </div>
            <Button type="submit" size="lg" fullWidth loading={enviando}>Enviar solicitud</Button>
          </form>
        )}
      </main>
    </div>
  );
}