import { useState } from 'react';
import { updateConfig, updateCoverage, updateBanner } from '../../api/admin';

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

const tabs = [
  { id: 'general', label: 'Configuración General', icon: '⚙️' },
  { id: 'coverage', label: 'Cobertura', icon: '📍' },
  { id: 'banner', label: 'Banner', icon: '🖼️' },
];

function ConfigPage() {
  const [activeTab, setActiveTab] = useState('general');
  const [saving, setSaving] = useState({});
  const [toasts, setToasts] = useState([]);

  const showToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  };

  return (
    <div style={styles.page}>
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
          from { transform: translateX(0); opacity: 1; }
          to { transform: translateX(100%); opacity: 0; }
        }
      `}</style>

      <h1 style={styles.title}>Configuración de la Plataforma</h1>
      <p style={styles.subtitle}>Administra los ajustes generales, cobertura y banners</p>

      <div style={styles.tabs}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            style={{
              ...styles.tab,
              ...(activeTab === tab.id ? styles.tabActive : {}),
            }}
            onClick={() => setActiveTab(tab.id)}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <div style={styles.content}>
        {activeTab === 'general' && (
          <GeneralConfig saving={saving} setSaving={setSaving} showToast={showToast} />
        )}
        {activeTab === 'coverage' && (
          <CoverageConfig saving={saving} setSaving={setSaving} showToast={showToast} />
        )}
        {activeTab === 'banner' && (
          <BannerConfig saving={saving} setSaving={setSaving} showToast={showToast} />
        )}
      </div>

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

function GeneralConfig({ saving, setSaving, showToast }) {
  // Doc §18: PUT /api/admin/config {nequiNumero?, nequiNombre?}
  const [form, setForm] = useState({ nequiNumero: '', nequiNombre: '' });
  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {};
    if (form.nequiNumero.trim()) payload.nequiNumero = form.nequiNumero.trim();
    if (form.nequiNombre.trim()) payload.nequiNombre = form.nequiNombre.trim();
    if (!Object.keys(payload).length) return showToast('Ingresa al menos un campo', 'error');
    setSaving((prev) => ({ ...prev, general: true }));
    try {
      await updateConfig(payload);
      showToast('Configuración Nequi actualizada correctamente');
    } catch (err) {
      showToast(err.response?.data?.message || 'Error al guardar la configuración', 'error');
    } finally {
      setSaving((prev) => ({ ...prev, general: false }));
    }
  };
  return (
    <form style={styles.card} onSubmit={handleSubmit}>
      <h2 style={styles.cardTitle}>⚙️ Información de Pagos</h2>
      <p style={styles.cardDesc}>Cuenta donde recibirás los pagos y comisiones de la plataforma</p>
      <div style={{ backgroundColor: `${"#020208"}`, border: `1px solid ${theme.border}`, borderRadius: 10, padding: 16, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <span style={{ fontSize: 20 }}>💳</span>
        <div>
          <p style={{ color: theme.text, fontSize: 13, fontWeight: 600, margin: '0 0 4px' }}>¿Para qué es esto?</p>
          <p style={{ color: theme.muted, fontSize: 12, margin: 0, lineHeight: 1.6 }}>Los conductores usarán estos datos para pagarte las comisiones. Asegúrate de que el número y el nombre coincidan con tu cuenta Nequi.</p>
        </div>
      </div>
      <div style={styles.formGrid}>
        <Field label="Número Nequi" name="nequiNumero" value={form.nequiNumero} onChange={handleChange} placeholder="Ej: 3001234567" />
        <Field label="Titular de la cuenta" name="nequiNombre" value={form.nequiNombre} onChange={handleChange} placeholder="Ej: CargaExpress SAS" />
      </div>

      <button
        type="submit"
        disabled={saving.general}
        style={{
          ...styles.btn,
          ...styles.btnPrimary,
          opacity: saving.general ? 0.6 : 1,
        }}
      >
        {saving.general ? 'Guardando...' : 'Guardar Configuración'}
      </button>
    </form>
  );
}

function CoverageConfig({ saving, setSaving, showToast }) {
  // Doc §18: PUT /api/admin/config/coverage {zonasCobertura:[{nombre, centro:{lat,lng}, radio}]}
  const [form, setForm] = useState({ nombre: '', lat: '', lng: '', radio: '' });
  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nombre.trim() || !form.lat || !form.lng || !form.radio) return showToast('Completa todos los campos', 'error');
    const payload = { zonasCobertura: [{ nombre: form.nombre.trim(), centro: { lat: Number(form.lat), lng: Number(form.lng) }, radio: Number(form.radio) }] };
    setSaving((prev) => ({ ...prev, coverage: true }));
    try {
      await updateCoverage(payload);
      showToast('Zona de cobertura actualizada correctamente');
    } catch (err) {
      showToast(err.response?.data?.message || 'Error al guardar la cobertura', 'error');
    } finally {
      setSaving((prev) => ({ ...prev, coverage: false }));
    }
  };

  return (
    <form style={styles.card} onSubmit={handleSubmit}>
      <h2 style={styles.cardTitle}>📍 Cobertura de Servicio</h2>
      <p style={styles.cardDesc}>Define las ciudades y el alcance donde tu plataforma estará operativa</p>

      <div style={{ ...styles.mapPlaceholder, flexDirection: 'column', alignItems: 'flex-start', gap: 14, padding: 20, textAlign: 'left' }}>
        <p style={{ color: theme.text, fontSize: 13, fontWeight: 600, margin: 0 }}>¿Cómo funciona la cobertura?</p>
        <p style={{ color: theme.muted, fontSize: 13, margin: 0, lineHeight: 1.7 }}>
          Cada zona es un <b style={{ color: theme.text }}>círculo</b> en el mapa. El <b style={{ color: theme.text }}>centro</b> marca el corazón de la ciudad y el <b style={{ color: theme.text }}>radio</b> indica hasta dónde llega el servicio. Solo los conductores dentro del círculo reciben solicitudes y solo los clientes dentro pueden pedir viajes.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 10, width: '100%' }}>
          <div style={{ backgroundColor: theme.cards, border: `1px solid ${theme.border}`, borderRadius: 8, padding: 12 }}>
            <p style={{ color: theme.text, fontSize: 12, fontWeight: 700, margin: '0 0 6px' }}>Radio pequeño — Ej: 5 km</p>
            <p style={{ color: theme.muted, fontSize: 12, margin: 0, lineHeight: 1.5 }}>Solo el centro de la ciudad. Ideal para pruebas en una zona muy limitada.</p>
          </div>
          <div style={{ backgroundColor: `${theme.accent}10`, border: `1px solid ${theme.accent}30`, borderRadius: 8, padding: 12 }}>
            <p style={{ color: theme.accent, fontSize: 12, fontWeight: 700, margin: '0 0 6px' }}>✓ Recomendado — Ej: 15 km</p>
            <p style={{ color: theme.muted, fontSize: 12, margin: 0, lineHeight: 1.5 }}>Cubre toda la ciudad y veredas cercanas. Perfecto para empezar en Popayán o Pasto.</p>
          </div>
          <div style={{ backgroundColor: theme.cards, border: `1px solid ${theme.border}`, borderRadius: 8, padding: 12 }}>
            <p style={{ color: theme.text, fontSize: 12, fontWeight: 700, margin: '0 0 6px' }}>Radio amplio — Ej: 20-30 km</p>
            <p style={{ color: theme.muted, fontSize: 12, margin: 0, lineHeight: 1.5 }}>Incluye municipios vecinos como Timbío o Cajibío. Para cobertura metropolitana.</p>
          </div>
        </div>
        <div style={{ backgroundColor: `${"#020208"}`, border: `1px solid ${theme.border}`, borderRadius: 8, padding: 12, width: '100%', boxSizing: 'border-box' }}>
          <p style={{ color: theme.muted, fontSize: 12, margin: '0 0 4px', fontWeight: 600 }}>Ejemplo práctico</p>
          <p style={{ color: theme.text, fontSize: 13, margin: 0, lineHeight: 1.6 }}>
            Si operas en <b>Popayán</b>, crea una zona llamada <b>Popayán</b> con centro en la ciudad y radio de <b>15 km</b>. Así todos los viajes y conductores dentro de ese círculo estarán conectados.
          </p>
        </div>
        <p style={{ color: theme.muted, fontSize: 11, margin: 0, lineHeight: 1.5 }}>💡 Consejo: abre Google Maps, haz clic derecho sobre tu ciudad y copia las coordenadas. Empieza con 15 km y ajusta según la demanda.</p>
      </div>

      <div style={styles.formGrid}>
        <Field label="Nombre de la zona" name="nombre" value={form.nombre} onChange={handleChange} placeholder="Ej: Popayán" />
        <Field label="Latitud" name="lat" type="number" step="any" value={form.lat} onChange={handleChange} placeholder="Ej: 2.4448" />
        <Field label="Longitud" name="lng" type="number" step="any" value={form.lng} onChange={handleChange} placeholder="Ej: -76.6147" />
        <Field label="Radio de cobertura (km)" name="radio" type="number" value={form.radio} onChange={handleChange} placeholder="Ej: 15" />
      </div>

      <button
        type="submit"
        disabled={saving.coverage}
        style={{
          ...styles.btn,
          ...styles.btnPrimary,
          opacity: saving.coverage ? 0.6 : 1,
        }}
      >
        {saving.coverage ? 'Guardando...' : 'Guardar Cobertura'}
      </button>
    </form>
  );
}

function BannerConfig({ saving, setSaving, showToast }) {
  // Doc §18: PUT multipart {banner_imagen, bannerActivo, bannerLink, bannerTexto}
  const [preview, setPreview] = useState(null);
  const [file, setFile] = useState(null);
  const [bannerActivo, setBannerActivo] = useState(true);
  const [bannerLink, setBannerLink] = useState('');
  const [bannerTexto, setBannerTexto] = useState('');
  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving((prev) => ({ ...prev, banner: true }));
    try {
      const fd = new FormData();
      if (file) fd.append('banner_imagen', file);
      fd.append('bannerActivo', String(bannerActivo));
      if (bannerLink.trim()) fd.append('bannerLink', bannerLink.trim());
      if (bannerTexto.trim()) fd.append('bannerTexto', bannerTexto.trim());
      await updateBanner(fd);
      showToast('Banner actualizado correctamente');
    } catch (err) {
      showToast(err.response?.data?.message || 'Error al subir el banner', 'error');
    } finally {
      setSaving((prev) => ({ ...prev, banner: false }));
    }
  };

  return (
    <form style={styles.card} onSubmit={handleSubmit}>
      <h2 style={styles.cardTitle}>🖼️ Banner Promocional</h2>
      <p style={styles.cardDesc}>Imagen destacada que verán los usuarios al abrir la app</p>
      <div style={{ backgroundColor: `${"#020208"}`, border: `1px solid ${theme.border}`, borderRadius: 10, padding: 16, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <span style={{ fontSize: 20 }}>💡</span>
        <div>
          <p style={{ color: theme.text, fontSize: 13, fontWeight: 600, margin: '0 0 4px' }}>Recomendaciones</p>
          <p style={{ color: theme.muted, fontSize: 12, margin: 0, lineHeight: 1.6 }}>Usa una imagen horizontal, nítida y con poco texto. Máximo 2 MB en formato JPG o PNG. Puedes agregar un enlace y un mensaje corto si lo deseas.</p>
        </div>
      </div>
      <div style={styles.uploadArea}>
        {preview ? <img src={preview} alt="Banner Preview" style={styles.bannerPreview} /> : (
          <div style={styles.uploadPlaceholder}>
            <span style={{ fontSize: 40 }}>📷</span>
            <p style={{ color: theme.muted, fontSize: 13, margin: 0 }}>Arrastra tu imagen aquí o haz clic para seleccionar</p>
            <p style={{ color: theme.muted, fontSize: 12, margin: 0 }}>Formatos recomendados: JPG, PNG o WebP</p>
          </div>
        )}
        <input type="file" accept="image/*" onChange={handleFileChange} style={styles.fileInput} />
      </div>
      <div style={styles.formGrid}>
        <Field label="Enlace del banner (opcional)" name="bannerLink" value={bannerLink} onChange={(e) => setBannerLink(e.target.value)} placeholder="Ej: https://tupromo.com" />
        <Field label="Texto del banner (opcional)" name="bannerTexto" value={bannerTexto} onChange={(e) => setBannerTexto(e.target.value)} placeholder="Ej: ¡Descuento esta semana!" />
        <div style={{ ...styles.field, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <input type="checkbox" checked={bannerActivo} onChange={(e) => setBannerActivo(e.target.checked)} id="bannerActivo" />
          <label htmlFor="bannerActivo" style={styles.label}>Mostrar banner en la app</label>
        </div>
      </div>

      <button
        type="submit"
        disabled={saving.banner}
        style={{
          ...styles.btn,
          ...styles.btnPrimary,
          opacity: saving.banner ? 0.6 : 1,
        }}
      >
        {saving.banner ? 'Subiendo...' : 'Subir Banner'}
      </button>
    </form>
  );
}

function Field({ label, name, type = 'text', value, onChange, placeholder, step }) {
  return (
    <div style={styles.field}>
      <label style={styles.label}>{label}</label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        step={step}
        style={styles.input}
      />
    </div>
  );
}

const styles = {
  page: {
    padding: 20,
    position: 'relative',
  },
  title: {
    fontSize: 18,
    fontWeight: 700,
    color: theme.text,
    margin: 0,
  },
  subtitle: {
    fontSize: 13,
    color: theme.muted,
    margin: '4px 0 24px',
  },
  tabs: {
    display: 'flex',
    gap: 8,
    marginBottom: 24,
    flexWrap: 'wrap',
  },
  tab: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 20px',
    borderRadius: 10,
    border: `1px solid ${theme.border}`,
    backgroundColor: theme.cards,
    color: theme.muted,
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  tabActive: {
    backgroundColor: `${theme.accent}22`,
    borderColor: theme.accent,
    color: theme.accent,
  },
  content: {
    maxWidth: 800,
  },
  card: {
    backgroundColor: theme.cards,
    borderRadius: 14,
    border: `1px solid ${theme.border}`,
    padding: 20,
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: theme.text,
    margin: 0,
  },
  cardDesc: {
    fontSize: 13,
    color: theme.muted,
    margin: '-12px 0 0',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: 12,
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
    transition: 'border-color 0.2s ease',
  },
  mapPlaceholder: {
    backgroundColor: theme.bg,
    borderRadius: 10,
    border: `1px solid ${theme.border}`,
    padding: 48,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  uploadArea: {
    position: 'relative',
    backgroundColor: theme.bg,
    borderRadius: 10,
    border: `2px dashed ${theme.border}`,
    padding: 16,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 180,
    overflow: 'hidden',
  },
  uploadPlaceholder: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
  },
  bannerPreview: {
    width: '100%',
    maxHeight: 200,
    objectFit: 'cover',
    borderRadius: 8,
  },
  fileInput: {
    position: 'absolute',
    inset: 0,
    opacity: 0,
    cursor: 'pointer',
  },
  btn: {
    padding: '12px 24px',
    borderRadius: 10,
    border: 'none',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    alignSelf: 'flex-start',
    transition: 'all 0.2s ease',
  },
  btnPrimary: {
    backgroundColor: theme.accent,
    color: '#ffffff',
  },
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
};

export default ConfigPage;
