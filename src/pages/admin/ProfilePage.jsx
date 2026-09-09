import { useState, useEffect, useRef } from 'react';
import { getProfile, updateProfile, uploadAvatar } from '../../api/admin';

const theme = {
  bg: '#020208',
  cards: '#0f1220',
  accent: '#6366f1',
  text: '#e2e8f0',
  muted: '#64748b',
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
  border: '#1e2238',
};

function ProfilePage() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({ nombre: '', apellido: '', email: '', telefono: '' });
  const [toasts, setToasts] = useState([]);
  const fileInputRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await getProfile();
        if (cancelled) return;
        const data = res.data?.data || res.data;
        setProfile(data);
        setForm({
          nombre: data.nombre || data.name || '',
          apellido: data.apellido || '',
          email: data.email || '',
          telefono: data.telefono || data.phone || '',
        });
      } catch (err) {
        if (!cancelled) setError(err?.response?.data?.message || 'Error al cargar el perfil');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const showToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  };

  const handleFormChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    // Doc: PUT /api/admin/profile {nombre,apellido,email,telefono}
    const payload = {};
    if (form.nombre.trim()) payload.nombre = form.nombre.trim();
    if (form.apellido.trim()) payload.apellido = form.apellido.trim();
    if (form.email.trim()) payload.email = form.email.trim();
    if (form.telefono.trim()) payload.telefono = form.telefono.trim();
    setSaving(true);
    try {
      await updateProfile(payload);
      showToast('Perfil actualizado correctamente');
    } catch (err) {
      showToast(err.response?.data?.message || 'Error al actualizar el perfil', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await uploadAvatar(fd);
      const newUrl = res.data?.url || res.data?.avatar || URL.createObjectURL(file);
      setProfile((prev) => ({ ...prev, avatar: newUrl }));
      showToast('Foto de perfil actualizada');
    } catch {
      showToast('Error al subir la foto', 'error');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (loading) return <LoadingSkeleton />;
  if (error) return <ErrorState message={error} />;

  return (
    <div style={styles.page}>
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>

      <h1 style={styles.title}>Mi Perfil</h1>
      <p style={styles.subtitle}>Administra tu información personal</p>

      <div style={styles.card}>
        <div style={styles.avatarSection}>
          <div style={styles.avatarWrapper} onClick={handleAvatarClick}>
            {profile?.avatar ? (
              <img
                src={profile.avatar}
                alt="Avatar"
                style={styles.avatar}
              />
            ) : (
              <div style={styles.avatarFallback}>
                {(form.nombre || 'A').charAt(0).toUpperCase()}
              </div>
            )}
            <div style={styles.avatarOverlay}>
              {uploading ? (
                <span style={{ color: '#fff', fontSize: 12 }}>Subiendo...</span>
              ) : (
                <span style={{ color: '#fff', fontSize: 20 }}>📷</span>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              style={{ display: 'none' }}
            />
          </div>
          <div style={styles.avatarInfo}>
            <h2 style={styles.profileName}>{form.nombre || 'Admin'}</h2>
            <span style={styles.profileEmail}>{form.email || 'admin@plataforma.com'}</span>
            <span style={styles.roleBadge}>
              {profile?.role || profile?.rol || 'Administrador'}
            </span>
          </div>
        </div>
      </div>

      <form style={styles.card} onSubmit={handleSaveProfile}>
        <h2 style={styles.cardTitle}>✏️ Información Personal</h2>

        <div style={styles.formGrid}>
          <div style={styles.field}>
            <label style={styles.label}>Nombre</label>
            <input type="text" name="nombre" value={form.nombre} onChange={handleFormChange} placeholder="Nombre" style={styles.input} />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Apellido</label>
            <input type="text" name="apellido" value={form.apellido} onChange={handleFormChange} placeholder="Apellido" style={styles.input} />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Correo Electrónico</label>
            <input type="email" name="email" value={form.email} onChange={handleFormChange} placeholder="admin@plataforma.com" style={styles.input} />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Teléfono</label>
            <input type="tel" name="telefono" value={form.telefono} onChange={handleFormChange} placeholder="+57 300 123 4567" style={styles.input} />
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          style={{
            ...styles.btn,
            ...styles.btnPrimary,
            opacity: saving ? 0.6 : 1,
          }}
        >
          {saving ? 'Guardando...' : 'Guardar Cambios'}
        </button>
      </form>

      <div style={styles.toastContainer}>
        {toasts.map((toast) => (
          <div
            key={toast.id}
            style={{
              ...styles.toast,
              borderLeftColor: toast.type === 'success' ? theme.success : theme.danger,
            }}
          >
            <span>{toast.type === 'success' ? '✅' : '❌'}</span>
            <span style={{ flex: 1, fontSize: 13, color: theme.text }}>{toast.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div style={styles.page}>
      <div style={styles.skeletonCard}>
        <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
          <div style={styles.skeletonCircle} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ ...styles.skeletonLine, width: '40%' }} />
            <div style={{ ...styles.skeletonLine, width: '55%', height: 12 }} />
            <div style={{ ...styles.skeletonLine, width: '25%', height: 20 }} />
          </div>
        </div>
      </div>
      <div style={{ ...styles.skeletonCard, marginTop: 20 }}>
        <div style={{ ...styles.skeletonLine, width: '30%', height: 24 }} />
        <div style={styles.formGrid}>
          {[1, 2, 3].map((i) => (
            <div key={i} style={styles.field}>
              <div style={{ ...styles.skeletonLine, width: '50%', height: 14 }} />
              <div style={{ ...styles.skeletonLine, width: '100%', height: 44 }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ErrorState({ message }) {
  return (
    <div style={styles.errorWrapper}>
      <span style={{ fontSize: 48 }}>⚠️</span>
      <h2 style={styles.errorTitle}>Error</h2>
      <p style={styles.errorMessage}>{message}</p>
    </div>
  );
}

const styles = {
  page: { padding: 20 },
  title: { fontSize: 18, fontWeight: 700, color: theme.text, margin: 0 },
  subtitle: { fontSize: 13, color: theme.muted, margin: '4px 0 24px' },
  card: {
    backgroundColor: theme.cards,
    borderRadius: 14,
    border: `1px solid ${theme.border}`,
    padding: 20,
    display: 'flex',
    flexDirection: 'column',
    gap: 24,
    maxWidth: 700,
  },
  avatarSection: { display: 'flex', alignItems: 'center', gap: 24 },
  avatarWrapper: {
    position: 'relative',
    width: 96,
    height: 96,
    borderRadius: '50%',
    overflow: 'hidden',
    cursor: 'pointer',
    flexShrink: 0,
    border: `3px solid ${theme.accent}`,
  },
  avatar: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  avatarFallback: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.accent,
    color: '#fff',
    fontSize: 36,
    fontWeight: 700,
  },
  avatarOverlay: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0,
    transition: 'opacity 0.2s ease',
  },
  avatarInfo: { display: 'flex', flexDirection: 'column', gap: 4 },
  profileName: { fontSize: 20, fontWeight: 700, color: theme.text, margin: 0 },
  profileEmail: { fontSize: 13, color: theme.muted, margin: 0 },
  roleBadge: {
    display: 'inline-flex',
    alignSelf: 'flex-start',
    padding: '4px 12px',
    borderRadius: 20,
    backgroundColor: `${theme.accent}22`,
    color: theme.accent,
    fontSize: 12,
    fontWeight: 600,
    marginTop: 4,
  },
  cardTitle: { fontSize: 18, fontWeight: 700, color: theme.text, margin: 0 },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
    gap: 12,
  },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 13, fontWeight: 600, color: theme.muted },
  input: {
    padding: '10px 14px',
    borderRadius: 8,
    border: `1px solid ${theme.border}`,
    backgroundColor: theme.bg,
    color: theme.text,
    fontSize: 13,
    outline: 'none',
  },
  btn: {
    padding: '12px 24px',
    borderRadius: 10,
    border: 'none',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    alignSelf: 'flex-start',
  },
  btnPrimary: { backgroundColor: theme.accent, color: '#ffffff' },
  toastContainer: {
    position: 'fixed',
    top: 24,
    right: 24,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    zIndex: 9999,
  },
  toast: {
    backgroundColor: theme.cards,
    border: `1px solid ${theme.border}`,
    borderLeftWidth: 4,
    borderRadius: 10,
    padding: '12px 16px',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
    animation: 'slideIn 0.3s ease forwards',
    minWidth: 280,
  },
  skeletonCard: {
    backgroundColor: theme.cards,
    borderRadius: 14,
    border: `1px solid ${theme.border}`,
    padding: 20,
  },
  skeletonCircle: { width: 96, height: 96, borderRadius: '50%', backgroundColor: theme.border },
  skeletonLine: { height: 16, borderRadius: 4, backgroundColor: theme.border },
  errorWrapper: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 64,
    textAlign: 'center',
  },
  errorTitle: { fontSize: 18, fontWeight: 700, color: theme.text, margin: 0 },
  errorMessage: { fontSize: 13, color: theme.muted, margin: 0, maxWidth: 400 },
};

export default ProfilePage;
