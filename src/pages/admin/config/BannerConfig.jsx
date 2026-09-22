import { useState, useEffect, useCallback } from 'react';
import { ExternalLink, ImageOff, ImageUp, Upload } from 'lucide-react';
import api from '../../../api/axios';
import { updateBanner } from '../../../api/admin';
import { resolveStorageUrl } from '../../../utils/storage';
import { errorMessage } from '../../../utils/format';
import { Card, Input, Button, Badge } from '../../../components/ui';

/** Doc §18: PUT multipart {banner_imagen, bannerActivo, bannerLink, bannerTexto} */
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
    if (!selected) return;
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
      if (bannerLink.trim()) fd.append('bannerLink', bannerLink.trim());
      if (bannerTexto.trim()) fd.append('bannerTexto', bannerTexto.trim());
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

  return (
    <form onSubmit={handleSubmit} className="stack">
      <Card
        title="Banner actual"
        description="Así se muestra hoy el banner a los usuarios de la app."
        actions={!currentLoading && current && (
          <Badge variant={current.activo ? 'success' : 'neutral'}>
            <span className="badge__dot" aria-hidden="true" />
            {current.activo ? 'Visible' : 'Oculto'}
          </Badge>
        )}
      >
        {currentLoading && <div className="config__banner config__banner--empty">Cargando banner...</div>}
        {!currentLoading && currentError && <div className="page-error" role="alert">{currentError}</div>}
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
            {(current?.texto || current?.link) && (
              <dl className="detail-list">
                {current.texto && (
                  <div className="detail-list__item">
                    <dt className="detail-list__label">Texto</dt>
                    <dd className="detail-list__value">{current.texto}</dd>
                  </div>
                )}
                {current.link && (
                  <div className="detail-list__item">
                    <dt className="detail-list__label">Enlace</dt>
                    <dd className="detail-list__value">
                      <a href={current.link} target="_blank" rel="noreferrer" className="config__link">
                        {current.link} <ExternalLink size={12} aria-hidden="true" />
                      </a>
                    </dd>
                  </div>
                )}
              </dl>
            )}
          </>
        )}
      </Card>

      <Card
        title="Actualizar banner"
        description="Usa una imagen horizontal, nítida y con poco texto. Máximo 2 MB en JPG, PNG o WebP."
      >
        <label className="config__upload">
          {preview ? (
            <img src={preview} alt="Vista previa del nuevo banner" className="config__upload-preview" />
          ) : (
            <span className="config__upload-placeholder">
              <ImageUp size={24} aria-hidden="true" />
              <span className="text-strong">Selecciona una imagen</span>
              <span className="text-sm text-muted">Arrastra tu imagen aquí o haz clic para elegirla</span>
            </span>
          )}
          <input type="file" accept="image/*" onChange={handleFileChange} className="config__file-input" aria-label="Imagen del banner" />
        </label>
        {file && <p className="text-sm text-muted">Archivo seleccionado: {file.name}</p>}

        <div className="form-grid">
          <Input
            label="Enlace (opcional)"
            name="bannerLink"
            inputMode="url"
            value={bannerLink}
            onChange={(e) => setBannerLink(e.target.value)}
            placeholder="Ej: https://tupromo.com"
          />
          <Input
            label="Texto (opcional)"
            name="bannerTexto"
            value={bannerTexto}
            onChange={(e) => setBannerTexto(e.target.value)}
            placeholder="Ej: ¡Descuento esta semana!"
          />
          <label className="config__check form-grid__full">
            <input type="checkbox" checked={bannerActivo} onChange={(e) => setBannerActivo(e.target.checked)} />
            <span>Mostrar banner en la app</span>
          </label>
        </div>

        <div className="row row--end">
          <Button type="submit" icon={<Upload size={15} />} loading={saving}>
            {saving ? 'Subiendo...' : 'Guardar banner'}
          </Button>
        </div>
      </Card>
    </form>
  );
}
