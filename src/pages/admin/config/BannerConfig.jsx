import { useState, useEffect, useCallback } from 'react';
import { ExternalLink, ImageOff, ImageUp, Upload } from 'lucide-react';
import api from '../../../api/axios';
import { updateBanner } from '../../../api/admin';
import { resolveStorageUrl } from '../../../utils/storage';
import { errorMessage } from '../../../utils/format';
import { Card, Input, Button, Badge } from '../../../components/ui';
import BannerPhonePreview from './BannerPhonePreview';

/** Doc §18: PUT multipart {banner_imagen, bannerActivo, bannerLink, bannerTexto} */

// Mismas reglas que el backend (admin_controller.updateBanner): máx. 2 MB y estas extensiones.
const MAX_BYTES = 2 * 1024 * 1024;
const EXTENSIONES = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
const ACCEPT = EXTENSIONES.map((e) => `.${e}`).join(',');
export default function BannerConfig({ notify }) {
  // Banner publicado actualmente: GET /api/config/banner → { activo, imagenUrl, link, texto }
  const [current, setCurrent] = useState(null);
  const [currentLoading, setCurrentLoading] = useState(true);
  const [currentError, setCurrentError] = useState(null);
  const [imageFailed, setImageFailed] = useState(false);

  const [preview, setPreview] = useState(null);
  const [file, setFile] = useState(null);
  const [bannerActivo, setBannerActivo] = useState(true);
  const [bannerLink, setBannerLink] = useState('');
  const [bannerTexto, setBannerTexto] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchCurrent = useCallback(async ({ prefill = false } = {}) => {
    setCurrentLoading(true);
    setCurrentError(null);
    try {
      const res = await api.get('/api/config/banner');
      const data = res.data || {};
      setCurrent(data);
      setImageFailed(false);
      if (prefill) {
        setBannerActivo(data.activo ?? true);
        setBannerLink(data.link || '');
        setBannerTexto(data.texto || '');
      }
    } catch (err) {
      setCurrentError(errorMessage(err, 'No se pudo cargar el banner actual'));
    } finally {
      setCurrentLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCurrent({ prefill: true });
  }, [fetchCurrent]);

  // Libera la URL temporal de la vista previa local.
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    e.target.value = '';
    if (!selected) return;
    const ext = selected.name.split('.').pop()?.toLowerCase() || '';
    if (!EXTENSIONES.includes(ext)) {
      notify('Formato no permitido. Usa JPG, PNG, GIF o WebP.', 'danger');
      return;
    }
    if (selected.size > MAX_BYTES) {
      notify(`La imagen pesa ${(selected.size / 1024 / 1024).toFixed(1)} MB; el máximo es 2 MB.`, 'danger');
      return;
    }
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData();
      if (file) fd.append('banner_imagen', file);
      fd.append('bannerActivo', String(bannerActivo));
      // Se envían siempre (aunque estén vacíos) para poder borrar el enlace o el texto.
      fd.append('bannerLink', bannerLink.trim());
      fd.append('bannerTexto', bannerTexto.trim());
      await updateBanner(fd);
      notify('Banner actualizado correctamente');
      setFile(null);
      setPreview(null);
      fetchCurrent();
    } catch (err) {
      notify(errorMessage(err, 'Error al subir el banner'), 'danger');
    } finally {
      setSaving(false);
    }
  };

  const currentUrl = current?.imagenUrl ? resolveStorageUrl(current.imagenUrl) : '';
  const status = !current
    ? null
    : !current.imagenUrl
      ? { variant: 'neutral', label: 'Sin configurar' }
      : current.activo
        ? { variant: 'success', label: 'Visible' }
        : { variant: 'warning', label: 'Oculto' };

  return (
    <div className="config__section">
      <div className="config__intro">
        <h2 className="config__intro-title">Banner</h2>
        <p className="config__intro-text">
          Imagen promocional que aparece en la pantalla principal de la app. Puedes cambiarla, añadir un texto y un enlace, u ocultarla.
        </p>
      </div>

      <Card
        title="Configuración actual"
        description="Así se muestra hoy el banner a los usuarios de la app."
        actions={!currentLoading && status && (
          <Badge variant={status.variant}>
            <span className="badge__dot" aria-hidden="true" />
            {status.label}
          </Badge>
        )}
      >
        {currentLoading && <div className="config__banner config__banner--empty">Cargando banner...</div>}
        {!currentLoading && currentError && (
          <div className="page-error" role="alert">
            <span>{currentError}</span>
            <Button size="sm" variant="ghost" onClick={() => fetchCurrent()}>Reintentar</Button>
          </div>
        )}
        {!currentLoading && !currentError && (
          <>
            {currentUrl && !imageFailed ? (
              <img src={currentUrl} alt="Banner actual" className="config__banner" onError={() => setImageFailed(true)} />
            ) : (
              <div className="config__banner config__banner--empty">
                <ImageOff size={20} aria-hidden="true" />
                <span>{currentUrl ? 'No se pudo cargar la imagen del banner' : 'No hay banner configurado'}</span>
              </div>
            )}
            <div className="config__values">
              <div className="config__value-box">
                <span className="config__value-label">Estado en la app</span>
                <span className="config__value">{current?.activo ? 'Visible' : 'Oculto'}</span>
              </div>
              <div className="config__value-box">
                <span className="config__value-label">Texto</span>
                {current?.texto
                  ? <span className="config__value">{current.texto}</span>
                  : <span className="config__value config__value--empty">Sin texto</span>}
              </div>
              <div className="config__value-box">
                <span className="config__value-label">Enlace</span>
                {current?.link ? (
                  <a href={current.link} target="_blank" rel="noreferrer" className="config__link config__value-hint">
                    {current.link} <ExternalLink size={12} aria-hidden="true" />
                  </a>
                ) : (
                  <span className="config__value config__value--empty">Sin enlace</span>
                )}
              </div>
            </div>
          </>
        )}
      </Card>

      <form onSubmit={handleSubmit} className="banner-edit">
        <Card
          title="Editar banner"
          description="Usa una imagen horizontal, nítida y con poco texto. Si no eliges una imagen nueva se conserva la actual."
        >
          <label className="config__upload">
            {preview ? (
              <img src={preview} alt="Vista previa del nuevo banner" className="config__upload-preview" />
            ) : (
              <span className="config__upload-placeholder">
                <ImageUp size={24} aria-hidden="true" />
                <span className="text-strong">Selecciona una imagen</span>
                <span className="text-sm text-muted">Arrástrala aquí o haz clic · Máximo 2 MB en JPG, PNG, GIF o WebP</span>
              </span>
            )}
            <input type="file" accept={ACCEPT} onChange={handleFileChange} className="config__file-input" aria-label="Imagen del banner" />
          </label>
          {file && <p className="text-sm text-secondary">Imagen nueva: <span className="text-strong">{file.name}</span></p>}

          <div className="form-grid">
            <Input
              label="Texto (opcional)"
              name="bannerTexto"
              value={bannerTexto}
              onChange={(e) => setBannerTexto(e.target.value)}
              placeholder="Ej: ¡Descuento esta semana!"
              helperText="Déjalo vacío para quitar el texto"
            />
            <Input
              label="Enlace (opcional)"
              name="bannerLink"
              inputMode="url"
              value={bannerLink}
              onChange={(e) => setBannerLink(e.target.value)}
              placeholder="Ej: https://tupromo.com"
              helperText="Se abre al tocar el banner; vacío para quitarlo"
            />
            <label className="config__check form-grid__full">
              <input type="checkbox" checked={bannerActivo} onChange={(e) => setBannerActivo(e.target.checked)} />
              <span>Mostrar banner en la app</span>
            </label>
          </div>

          <div className="config__footer">
            <Button type="submit" icon={<Upload size={15} />} loading={saving}>
              {saving ? 'Guardando...' : 'Guardar banner'}
            </Button>
          </div>
        </Card>
        <Card title="Vista previa" description="Se actualiza mientras editas; los clientes solo lo ven al guardar.">
          <BannerPhonePreview
            imageUrl={preview || (imageFailed ? '' : currentUrl)}
            texto={bannerTexto}
            link={bannerLink}
            activo={bannerActivo}
          />
        </Card>
      </form>
    </div>
  );
}
