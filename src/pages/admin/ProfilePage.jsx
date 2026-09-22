import { useState, useEffect, useRef, useCallback } from 'react';
import { Camera, Save } from 'lucide-react';
import { getProfile, updateProfile, uploadAvatar } from '../../api/admin';
import { errorMessage, fullName } from '../../utils/format';
import {
  PageHeader, Card, Input, Button, Badge, Avatar, LoadingState, Toast, ToastContainer,
} from '../../components/ui';
import './ProfilePage.css';

export default function ProfilePage() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({ nombre: '', apellido: '', email: '', telefono: '' });
  const [toast, setToast] = useState(null);
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
        if (!cancelled) setError(errorMessage(err, 'Error al cargar el perfil'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const notify = (message, variant = 'success') => setToast({ id: Date.now(), message, variant });
  const closeToast = useCallback(() => setToast(null), []);

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
      notify('Perfil actualizado correctamente');
    } catch (err) {
      notify(errorMessage(err, 'Error al actualizar el perfil'), 'danger');
    } finally {
      setSaving(false);
    }
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
      notify('Foto de perfil actualizada');
    } catch (err) {
      notify(errorMessage(err, 'Error al subir la foto'), 'danger');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const displayName = fullName({ ...profile, nombre: form.nombre, apellido: form.apellido }) || 'Admin';

  return (
    <div className="page">
      <PageHeader title="Mi perfil" description="Administra tu información personal y tu foto de perfil." />

      {loading && <LoadingState message="Cargando perfil..." />}
      {!loading && error && <div className="page-error" role="alert">{error}</div>}

      {!loading && !error && (
        <div className="profile">
          <Card>
            <div className="profile__identity">
              <div className="profile__avatar">
                <Avatar key={profile?.avatar || 'none'} src={profile?.avatar} name={displayName} size={88} />
                <button
                  type="button"
                  className="profile__avatar-btn"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  aria-label="Cambiar foto de perfil"
                >
                  {uploading ? <span className="profile__spinner" aria-hidden="true" /> : <Camera size={15} />}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="sr-only"
                  tabIndex={-1}
                  aria-hidden="true"
                />
              </div>
              <div className="profile__info">
                <h3 className="profile__name">{displayName}</h3>
                <span className="text-muted truncate">{form.email || '—'}</span>
                <Badge variant="primary">{profile?.role || profile?.rol || 'Administrador'}</Badge>
              </div>
            </div>
          </Card>

          <form onSubmit={handleSaveProfile}>
            <Card title="Información personal" description="Estos datos se usan para identificarte dentro del panel.">
              <div className="form-grid">
                <Input label="Nombre" name="nombre" value={form.nombre} onChange={handleFormChange} placeholder="Nombre" autoComplete="given-name" />
                <Input label="Apellido" name="apellido" value={form.apellido} onChange={handleFormChange} placeholder="Apellido" autoComplete="family-name" />
                <Input label="Correo electrónico" type="email" name="email" value={form.email} onChange={handleFormChange} placeholder="admin@plataforma.com" autoComplete="email" />
                <Input label="Teléfono" type="tel" name="telefono" value={form.telefono} onChange={handleFormChange} placeholder="+57 300 123 4567" autoComplete="tel" />
              </div>
              <div className="row row--end">
                <Button type="submit" icon={<Save size={15} />} loading={saving}>
                  {saving ? 'Guardando...' : 'Guardar cambios'}
                </Button>
              </div>
            </Card>
          </form>
        </div>
      )}

      {toast && (
        <ToastContainer>
          <Toast key={toast.id} message={toast.message} variant={toast.variant} onClose={closeToast} />
        </ToastContainer>
      )}
    </div>
  );
}
