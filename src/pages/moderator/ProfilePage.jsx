import { useState, useEffect, useRef, useCallback } from 'react';
import { Camera, MapPin, Save } from 'lucide-react';
import { getModeratorProfile } from '../../api/moderator';
import api from '../../api/axios';
import { errorMessage } from '../../utils/format';
import {
  PageHeader, Card, Avatar, Badge, Button, Input, LoadingState, Toast, ToastContainer,
} from '../../components/ui';
import './ProfilePage.css';

export default function ModeratorProfilePage() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({ nombre: '', apellido: '', email: '', telefono: '' });
  const [toast, setToast] = useState(null);
  const fileRef = useRef(null);
  const closeToast = useCallback(() => setToast(null), []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await getModeratorProfile();
        if (cancelled) return;
        const d = res.data?.data || res.data;
        setProfile(d);
        setForm({ nombre: d.nombre || '', apellido: d.apellido || '', email: d.email || '', telefono: d.telefono || '' });
      } catch (err) {
        if (!cancelled) setError(errorMessage(err, 'Error al cargar perfil'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const showToast = (message, ok = true) => setToast({ message, variant: ok ? 'success' : 'danger' });
  const setField = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const handleSave = async (e) => {
    e.preventDefault();
    const payload = {};
    if (form.nombre.trim()) payload.nombre = form.nombre.trim();
    if (form.apellido.trim()) payload.apellido = form.apellido.trim();
    if (form.email.trim()) payload.email = form.email.trim();
    if (form.telefono.trim()) payload.telefono = form.telefono.trim();
    setSaving(true);
    try {
      await api.put('/api/users/profile', payload);
      showToast('Perfil actualizado');
    } catch (err) {
      showToast(errorMessage(err, 'Error al guardar'), false);
    } finally {
      setSaving(false);
    }
  };

  const handleAvatar = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', f);
      const res = await api.post('/api/users/avatar', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setProfile((p) => ({ ...p, avatar: res.data?.url || res.data?.avatar || URL.createObjectURL(f) }));
      showToast('Avatar actualizado');
    } catch (err) {
      showToast(errorMessage(err, 'Error al subir avatar'), false);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  if (loading) return <div className="page"><LoadingState message="Cargando perfil…" /></div>;
  if (error) return <div className="page"><div className="page-error" role="alert">{error}</div></div>;

  const displayName = `${form.nombre} ${form.apellido}`.trim() || 'Moderador';
  const zona = profile?.zonaModerador || profile?.zona_moderador;

  return (
    <div className="page profile-page">
      <PageHeader title="Mi perfil" description="Tus datos de contacto como moderador." />

      <Card>
        <div className="profile-hero">
          <button
            type="button"
            className="profile-hero__avatar"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            aria-label="Cambiar foto de perfil"
          >
            <Avatar key={profile?.avatar || 'none'} src={profile?.avatar} name={displayName} size={72} />
            <span className="profile-hero__overlay" aria-hidden="true">
              {uploading ? <span className="btn__spinner" /> : <Camera size={18} />}
            </span>
          </button>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleAvatar} hidden />
          <div className="profile-hero__text">
            <h3 className="profile-hero__name">{displayName}</h3>
            <p className="text-muted text-sm">{form.email || '—'}</p>
            <div className="row">
              <Badge variant="warning">Moderador</Badge>
              <Badge variant={zona ? 'neutral' : 'danger'}><MapPin size={12} /> {zona || 'Sin zona'}</Badge>
            </div>
          </div>
        </div>
      </Card>

      <Card title="Información personal">
        <form onSubmit={handleSave} className="stack">
          <div className="form-grid">
            <Input label="Nombre" value={form.nombre} onChange={setField('nombre')} autoComplete="given-name" />
            <Input label="Apellido" value={form.apellido} onChange={setField('apellido')} autoComplete="family-name" />
            <Input label="Correo" type="email" value={form.email} onChange={setField('email')} autoComplete="email" />
            <Input label="Teléfono" value={form.telefono} onChange={setField('telefono')} autoComplete="tel" />
          </div>
          <div className="row row--end">
            <Button type="submit" icon={<Save size={15} />} loading={saving}>Guardar cambios</Button>
          </div>
        </form>
      </Card>

      {toast && (
        <ToastContainer>
          <Toast message={toast.message} variant={toast.variant} onClose={closeToast} />
        </ToastContainer>
      )}
    </div>
  );
}
