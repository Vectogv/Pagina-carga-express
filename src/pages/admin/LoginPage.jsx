import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const theme = {
  bg: '#020208',
  sidebar: '#070a12',
  cards: '#0f1220',
  accent: '#6366f1',
  text: '#e2e8f0',
  muted: '#64748b',
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
  border: '#1e2238',
};

function LoginPage() {
  const { login, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('admin@cargaexpress.com');
  const [password, setPassword] = useState('Admin123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const fillAdmin = () => { setEmail('admin@cargaexpress.com'); setPassword('Admin123'); };
  const fillCali = () => { setEmail('admin.cali@cargaexpress.com'); setPassword('AdminCali123'); };
  const fillPopayan = () => { setEmail('admin.popayan@cargaexpress.com'); setPassword('Admin123'); };

  const getRedirect = (u) => {
    if (!u) return '/admin';
    if (u.rol === 'admin' || u.role === 'admin') return '/admin';
    if (u.esModerador || u.es_moderador) return '/moderator';
    return '/admin';
  };

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      const raw = localStorage.getItem('user');
      const u = raw ? JSON.parse(raw) : null;
      if (!u) return;
      // Si es admin o moderador ya resuelto, redirige; si aún no tiene rol, espera un poco más
      if (!u.rol && !u.role && !u.esModerador && !u.es_moderador) return;
      navigate(getRedirect(u), { replace: true });
    }
  }, [isAuthenticated, authLoading, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Ingresa email y contraseña');
      return;
    }

    setLoading(true);
    try {
      const result = await login(email.trim(), password);
      console.log('Login OK:', result);
      // Verifica si realmente es admin (fetchProfile ya se intento)
      // Si no hay token, algo fallo
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setError('Login ok pero sin token. Revisa consola F12.');
        return;
      }
      const authHeaders = { Authorization: `Bearer ${token}` };
      const r = result?.user || result?.data?.user || result;
      const isAdminAcc = r?.rol === 'admin' || r?.role === 'admin' || email.trim().toLowerCase() === 'admin@cargaexpress.com';

      let dest = '/admin';
      if (!isAdminAcc) {
        // Moderador (su ciudad se mantiene en backend): detectar y marcar esModerador
        let isModAcc = false;
        let zona = null;
        try {
          const probe = await fetch('/api/moderator/drivers?page=1&limit=1', { headers: authHeaders });
          isModAcc = probe.ok;
        } catch { /* silencioso */ }
        if (isModAcc) {
          try {
            const dash = await fetch('/api/moderator/dashboard', { headers: authHeaders });
            if (dash.ok) {
              const dj = await dash.json();
              zona = dj.ciudad || dj.data?.ciudad;
            }
          } catch { /* silencioso */ }
          const raw2 = localStorage.getItem('user');
          const cur2 = raw2 ? JSON.parse(raw2) : {};
          localStorage.setItem('user', JSON.stringify({ ...cur2, esModerador: true, zonaModerador: cur2.zonaModerador || zona || 'cali', email: cur2.email || email.trim(), rol: cur2.rol || 'cliente' }));
          dest = '/moderator';
        }
      }
      navigate(dest, { replace: true });
    } catch (err) {
      console.error('Login error completo:', err);
      console.error('Response:', err?.response?.data);
      console.error('Status:', err?.response?.status);
      const status = err?.response?.status;
      const data = err?.response?.data;
      let msg = data?.message || data?.error || data?.msg || err.message || '';
      // Si viene array de errors (Adonis)
      if (data?.errors?.[0]?.message) msg = data.errors[0].message;
      if (!msg) {
        if (status === 400 || status === 401) msg = 'Credenciales inválidas, verifica email y contraseña';
        else if (status === 403) msg = 'Cuenta suspendida o sin acceso (403)';
        else if (status === 404) msg = 'Ruta no encontrada (404)';
        else if (status === 422) msg = 'Datos de acceso inválidos (422)';
        else if (status === 500) msg = 'Error interno del servidor (500)';
        else if (!status) msg = 'Sin respuesta del servidor - revisa red/CORS (F12 > Network)';
        else msg = `Error ${status}: ${JSON.stringify(data)}`;
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div style={styles.wrapper}>
        <div style={styles.spinner} />
      </div>
    );
  }

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        <div style={styles.logoSection}>
          <span style={styles.logoIcon}>🚛</span>
          <h1 style={styles.title}>Carga Express Admin</h1>
          <p style={styles.subtitle}>Panel de administración</p>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
          <button type="button" onClick={fillAdmin} style={{ flex: 1, padding: '7px 10px', borderRadius: 8, border: email === 'admin@cargaexpress.com' ? `1px solid ${theme.accent}` : `1px solid ${theme.border}`, background: email === 'admin@cargaexpress.com' ? `${theme.accent}20` : theme.bg, color: email === 'admin@cargaexpress.com' ? theme.accent : theme.muted, fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>👑 Admin</button>
          <button type="button" onClick={fillCali} style={{ flex: 1, padding: '7px 10px', borderRadius: 8, border: email === 'admin.cali@cargaexpress.com' ? `1px solid #f59e0b` : `1px solid ${theme.border}`, background: email === 'admin.cali@cargaexpress.com' ? 'rgba(245,158,11,0.15)' : theme.bg, color: email === 'admin.cali@cargaexpress.com' ? '#f59e0b' : theme.muted, fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>🛡️ Cali</button>
          <button type="button" onClick={fillPopayan} style={{ flex: 1, padding: '7px 10px', borderRadius: 8, border: email === 'admin.popayan@cargaexpress.com' ? `1px solid #22c55e` : `1px solid ${theme.border}`, background: email === 'admin.popayan@cargaexpress.com' ? 'rgba(34,197,94,0.15)' : theme.bg, color: email === 'admin.popayan@cargaexpress.com' ? '#22c55e' : theme.muted, fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>🛡️ Popayán</button>
        </div>
        <p style={{ fontSize: 11, color: theme.muted, textAlign: 'center', margin: 0 }}>Admin ve todas las ciudades · Moderadores solo su ciudad</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          {error && <div style={styles.error}>{error}</div>}

          <div style={styles.field}>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@cargaexpress.com"
              style={styles.input}
              autoFocus
              onFocus={(e) => {
                e.target.style.borderColor = theme.accent;
              }}
              onBlur={(e) => {
                e.target.style.borderColor = theme.border;
              }}
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={styles.input}
              onFocus={(e) => {
                e.target.style.borderColor = theme.accent;
              }}
              onBlur={(e) => {
                e.target.style.borderColor = theme.border;
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              ...styles.button,
              opacity: loading ? 0.7 : 1,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
            onMouseEnter={(e) => {
              if (!loading) e.currentTarget.style.backgroundColor = '#5558e6';
            }}
            onMouseLeave={(e) => {
              if (!loading) e.currentTarget.style.backgroundColor = theme.accent;
            }}
          >
            {loading ? (
              <span style={styles.buttonContent}>
                <span style={styles.spinnerSmall} />
                Iniciando sesión...
              </span>
            ) : (
              'Iniciar Sesión'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.bg,
    padding: 16,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: theme.cards,
    borderRadius: 16,
    border: `1px solid ${theme.border}`,
    padding: '40px 32px',
  },
  logoSection: {
    textAlign: 'center',
    marginBottom: 32,
  },
  logoIcon: {
    fontSize: 48,
    display: 'block',
    marginBottom: 16,
  },
  title: {
    fontSize: 14,
    fontWeight: 800,
    color: theme.text,
    margin: '0 0 4px',
  },
  subtitle: {
    fontSize: 13,
    color: theme.muted,
    margin: 0,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  error: {
    padding: '10px 14px',
    borderRadius: 8,
    backgroundColor: `${theme.danger}15`,
    border: `1px solid ${theme.danger}40`,
    color: theme.danger,
    fontSize: 13,
    fontWeight: 500,
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: 600,
    color: theme.muted,
  },
  input: {
    padding: '10px 14px',
    borderRadius: 8,
    border: `1px solid ${theme.border}`,
    backgroundColor: theme.bg,
    color: theme.text,
    fontSize: 13,
    outline: 'none',
    transition: 'border-color 0.15s ease',
  },
  button: {
    marginTop: 4,
    padding: '12px 0',
    borderRadius: 8,
    border: 'none',
    backgroundColor: theme.accent,
    color: '#fff',
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'background-color 0.15s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonContent: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  spinnerSmall: {
    width: 16,
    height: 16,
    border: '2px solid rgba(255,255,255,0.3)',
    borderTopColor: '#fff',
    borderRadius: '50%',
    animation: 'spin 0.6s linear infinite',
    display: 'inline-block',
  },
  spinner: {
    width: 32,
    height: 32,
    border: `3px solid ${theme.border}`,
    borderTopColor: theme.accent,
    borderRadius: '50%',
    animation: 'spin 0.6s linear infinite',
  },
};

export default LoginPage;
