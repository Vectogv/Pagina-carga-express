import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Building2, ShieldCheck, Users, FileText } from 'lucide-react';
import api, { tokenStore } from '../../api/axios';
import { useAuth } from '../../contexts/AuthContext';
import { Button, Input } from '../../components/ui';
import { errorMessage } from '../../utils/format';
import '../admin/LoginPage.css';
import './RegistroEmpresa.css';

const TEL = /^\+?\d{7,15}$/;
const MAX_ARCHIVO = 5 * 1024 * 1024;
const VACIO = {
  nombre: '', apellido: '', email: '', telefono: '', edad: '', cedula: '', password: '', password2: '', acepta: false,
  empresa: '', nit: '', direccion: '', telEmpresa: '',
};

function validarResponsable(f) {
  const e = {};
  if (!f.nombre.trim()) e.nombre = 'Escribe tu nombre.';
  if (!f.apellido.trim()) e.apellido = 'Escribe tu apellido.';
  if (!/^\S+@\S+\.\S+$/.test(f.email.trim())) e.email = 'Escribe un correo válido.';
  if (!TEL.test(f.telefono.trim())) e.telefono = 'Teléfono de 7 a 15 dígitos, con "+" opcional.';
  const edad = Number(f.edad);
  if (!Number.isInteger(edad) || edad < 18 || edad > 120) e.edad = 'Debes ser mayor de 18 años.';
  if (!/^\d{5,20}$/.test(f.cedula.trim())) e.cedula = 'La cédula son de 5 a 20 dígitos, sin puntos.';
  if (f.password.length < 6 || f.password.length > 32) e.password = 'La contraseña debe tener de 6 a 32 caracteres.';
  if (f.password2 !== f.password) e.password2 = 'Las contraseñas no coinciden.';
  if (!f.acepta) e.acepta = 'Debes aceptar los términos y la política de privacidad.';
  return e;
}

export default function RegistroEmpresa() {
  const navigate = useNavigate();
  const { refreshProfile } = useAuth();
  const [paso, setPaso] = useState(1);
  const [f, setF] = useState(VACIO);
  const [rut, setRut] = useState(null);
  const [camara, setCamara] = useState(null);
  const [errores, setErrores] = useState({});
  const [error, setError] = useState('');
  const [correoRepetido, setCorreoRepetido] = useState(false);
  const [enviando, setEnviando] = useState(false);
  // Lo que ya quedó hecho en el servidor: un reintento no vuelve a crear la cuenta ni el perfil.
  const [hecho, setHecho] = useState({ cuenta: false, perfil: false });
  const [empresa, setEmpresa] = useState(null);

  const set = (k) => (ev) => {
    const v = ev.target.type === 'checkbox' ? ev.target.checked : ev.target.value;
    setF((p) => ({ ...p, [k]: v }));
    setErrores((p) => ({ ...p, [k]: undefined }));
    setError('');
    setCorreoRepetido(false);
  };

  const siguiente = (ev) => {
    ev.preventDefault();
    const e = validarResponsable(f);
    setErrores(e);
    if (Object.keys(e).length === 0) setPaso(2);
  };

  const crear = async (ev) => {
    ev.preventDefault();
    const e = {};
    if (!f.empresa.trim()) e.empresa = 'Escribe el nombre o razón social.';
    if (f.nit.replace(/\D/g, '').length < 5) e.nit = 'Escribe el NIT con su dígito de verificación.';
    if (f.telEmpresa.trim() && !TEL.test(f.telEmpresa.trim())) e.telEmpresa = 'Teléfono de 7 a 15 dígitos.';
    if (!rut) e.rut = 'Sube el RUT (PDF o imagen, máx. 5 MB).';
    if (!camara) e.camara = 'Sube la Cámara de Comercio (PDF o imagen, máx. 5 MB).';
    setErrores(e);
    if (Object.keys(e).length) return;

    setEnviando(true);
    setError('');
    let fase = hecho.cuenta ? (hecho.perfil ? 'empresa' : 'perfil') : 'cuenta';
    try {
      if (!hecho.cuenta) {
        const { data } = await api.post('/api/auth/register', {
          nombre: f.nombre.trim(),
          apellido: f.apellido.trim(),
          email: f.email.trim().toLowerCase(),
          password: f.password,
          rol: 'cliente',
          telefono: f.telefono.trim(),
          edad: Number(f.edad),
          aceptaTerminos: true,
        });
        tokenStore.set(data.token || data.accessToken, data.refreshToken);
        setHecho((h) => ({ ...h, cuenta: true }));
        fase = 'perfil';
      }
      if (!hecho.perfil) {
        await api.put('/api/users/profile', {
          telefono: f.telefono.trim(), edad: Number(f.edad), cedula: f.cedula.trim(), aceptaTerminos: true,
        });
        setHecho((h) => ({ ...h, perfil: true }));
        fase = 'empresa';
      }
      const fd = new FormData();
      fd.append('nombre', f.empresa.trim());
      fd.append('nit', f.nit.trim());
      if (f.direccion.trim()) fd.append('direccion', f.direccion.trim());
      if (f.telEmpresa.trim()) fd.append('telefono', f.telEmpresa.trim());
      fd.append('rut', rut);
      fd.append('camara', camara);
      const { data } = await api.post('/api/empresas', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setEmpresa(data?.data || data);
      await refreshProfile().catch(() => {});
      setPaso(3);
    } catch (err) {
      const status = err?.response?.status;
      const msg = !err?.response
        ? 'No hay conexión con el servidor. Intenta de nuevo.'
        : errorMessage(err, 'No se pudo completar el registro.');
      if (fase === 'cuenta' && status === 409) {
        setCorreoRepetido(true);
        setError('Ese correo ya está registrado.');
        setPaso(1);
      } else if (fase === 'empresa' && (err?.response?.data?.field === 'nit' || /NIT/i.test(msg))) {
        setErrores({ nit: msg });
      } else {
        setError(fase === 'cuenta' ? msg : `${msg} Tu cuenta ya está creada: pulsa el botón para reintentar.`);
      }
    } finally {
      setEnviando(false);
    }
  };

  const elegirArchivo = (setter, campo) => (x) => {
    setter(x);
    setErrores((p) => ({ ...p, [campo]: x ? undefined : p[campo] }));
  };

  return (
    <div className="login">
      <aside className="login__aside">
        <div className="login__brand">
          <img src="/logo.png" alt="" width="44" height="44" className="login__logo" />
          <span>Carga Express</span>
        </div>
        <div className="login__pitch">
          <h1>Mueve la carga de tu empresa, con control.</h1>
          <p>Crea la cuenta de tu empresa y administra a tu equipo desde un solo lugar.</p>
          <ul className="login__features">
            <li><Users size={16} /> Tu equipo pide viajes con el código de la empresa</li>
            <li><Building2 size={16} /> Reporte mensual de gastos en PDF</li>
            <li><ShieldCheck size={16} /> Empresa verificada por Carga Express</li>
          </ul>
        </div>
        <span className="login__legal">© {new Date().getFullYear()} Carga Express</span>
      </aside>

      <main className="login__main">
        {paso === 3 ? (
          <div className="login__card regemp__fin">
            <div className="login__header">
              <h2>Tu empresa quedó registrada</h2>
              <p>
                {empresa?.estado === 'aprobado'
                  ? `${empresa?.nombre} ya está verificada.`
                  : `${empresa?.nombre || 'Tu empresa'} quedó pendiente de aprobación. Revisaremos el RUT y la Cámara de Comercio y te avisaremos; mientras tanto puedes entrar a tu portal.`}
              </p>
            </div>
            <Button size="lg" fullWidth onClick={() => navigate('/cliente/empresa')}>Ir a mi empresa</Button>
          </div>
        ) : (
          <form className="login__card" onSubmit={paso === 1 ? siguiente : crear} noValidate>
            <div className="login__header">
              <small className="regemp__paso">Paso {paso} de 2</small>
              <h2>{paso === 1 ? 'Datos del responsable' : 'Datos de la empresa'}</h2>
              <p>{paso === 1 ? 'La persona que administrará la cuenta.' : 'Con estos datos verificamos a tu empresa.'}</p>
            </div>

            {error && (
              <div className="page-error" role="alert">
                {error} {correoRepetido && <Link to="/ingresar">Ingresar</Link>}
              </div>
            )}

            {paso === 1 ? (
              <>
                <div className="regemp__fila">
                  <Input label="Nombre" value={f.nombre} onChange={set('nombre')} error={errores.nombre} autoComplete="given-name" maxLength={100} />
                  <Input label="Apellido" value={f.apellido} onChange={set('apellido')} error={errores.apellido} autoComplete="family-name" maxLength={100} />
                </div>
                <Input label="Correo electrónico" type="email" value={f.email} onChange={set('email')} error={errores.email} autoComplete="email" maxLength={254} />
                <div className="regemp__fila">
                  <Input label="Teléfono" type="tel" value={f.telefono} onChange={set('telefono')} error={errores.telefono} autoComplete="tel" />
                  <Input label="Edad" type="number" inputMode="numeric" value={f.edad} onChange={set('edad')} error={errores.edad} />
                </div>
                <Input label="Cédula" inputMode="numeric" value={f.cedula} onChange={set('cedula')} error={errores.cedula} maxLength={20} />
                <Input label="Contraseña" type="password" value={f.password} onChange={set('password')} error={errores.password} autoComplete="new-password" />
                <Input label="Confirmar contraseña" type="password" value={f.password2} onChange={set('password2')} error={errores.password2} autoComplete="new-password" />
                <label className="regemp__check">
                  <input type="checkbox" checked={f.acepta} onChange={set('acepta')} />
                  <span>Acepto los <Link to="/terminos" target="_blank">términos</Link> y la <Link to="/privacidad" target="_blank">política de privacidad</Link>.</span>
                </label>
                {errores.acepta && <span className="input__error">{errores.acepta}</span>}
                <Button type="submit" size="lg" fullWidth>Siguiente</Button>
              </>
            ) : (
              <>
                <Input label="Nombre o razón social" value={f.empresa} onChange={set('empresa')} error={errores.empresa} maxLength={150} />
                <Input label="NIT (con dígito de verificación)" placeholder="900123456-7" value={f.nit} onChange={set('nit')} error={errores.nit} maxLength={20} />
                <Input label="Dirección (opcional)" value={f.direccion} onChange={set('direccion')} maxLength={200} />
                <Input label="Teléfono de la empresa (opcional)" type="tel" value={f.telEmpresa} onChange={set('telEmpresa')} error={errores.telEmpresa} />
                <Archivo label="RUT" archivo={rut} error={errores.rut} onChange={elegirArchivo(setRut, 'rut')} />
                <Archivo label="Cámara de Comercio" archivo={camara} error={errores.camara} onChange={elegirArchivo(setCamara, 'camara')} />
                <Button type="submit" size="lg" fullWidth loading={enviando}>
                  {hecho.cuenta ? 'Reintentar' : 'Crear cuenta de empresa'}
                </Button>
                <Button type="button" variant="ghost" fullWidth onClick={() => setPaso(1)} disabled={enviando || hecho.cuenta}>Volver</Button>
              </>
            )}

            <p className="login__hint">¿Ya tienes cuenta? <Link to="/ingresar">Ingresar</Link> · <Link to="/">Inicio</Link></p>
          </form>
        )}
      </main>
    </div>
  );
}

function Archivo({ label, archivo, error, onChange }) {
  return (
    <div className="input-group">
      <span className="input__label"><FileText size={14} /> {label} <span className="input__required">*</span></span>
      <input
        type="file"
        className="input__field regemp__file"
        accept=".pdf,.jpg,.jpeg,.png,.webp,.gif,application/pdf,image/*"
        aria-label={label}
        onChange={(ev) => {
          const x = ev.target.files?.[0] || null;
          if (x && x.size > MAX_ARCHIVO) {
            ev.target.value = '';
            onChange(null);
            return;
          }
          onChange(x);
        }}
      />
      {archivo && !error && <span className="input__helper">{archivo.name}</span>}
      {error && <span className="input__error">{error}</span>}
    </div>
  );
}
