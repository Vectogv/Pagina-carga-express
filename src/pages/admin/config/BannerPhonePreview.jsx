import { Megaphone, ChevronRight, House, Package, LifeBuoy, User, X } from 'lucide-react';
import './BannerPhonePreview.css';

/**
 * Maqueta del inicio del cliente (cliente_inicio_view.dart) con el anuncio como
 * ventana emergente, para verlo antes de guardar. Mismas reglas que la app: sale
 * si está activo y tiene imagen o texto; el texto va debajo de la imagen.
 */
export default function BannerPhonePreview({ imageUrl, texto, link, activo }) {
  const visible = activo && (Boolean(texto?.trim()) || Boolean(imageUrl));
  return (
    <div className="bpp" aria-label="Vista previa del anuncio en la app">
      <div className="bpp__phone">
        <div className="bpp__notch" aria-hidden="true" />
        <div className="bpp__screen">
          <p className="bpp__hello">¡Hola, Carlos!</p>
          <p className="bpp__sub">¿Qué vas a enviar hoy?</p>
          <div className="bpp__card">
            <span className="bpp__card-title">Nuevo envío</span>
            <span className="bpp__card-text">Publica tu carga y recibe ofertas de conductores</span>
            <span className="bpp__btn">Pedir un envío</span>
          </div>
        </div>
        <div className="bpp__nav" aria-hidden="true">
          <span className="bpp__nav-item bpp__nav-item--on"><House size={16} />Inicio</span>
          <span className="bpp__nav-item"><Package size={16} />Mis envíos</span>
          <span className="bpp__nav-item"><LifeBuoy size={16} />Soporte</span>
          <span className="bpp__nav-item"><User size={16} />Perfil</span>
        </div>

        {visible && (
          <div className="bpp__overlay">
            <div className="bpp__popup">
              <span className="bpp__close" aria-hidden="true"><X size={14} /></span>
              {imageUrl && <img src={imageUrl} alt="" className="bpp__popup-img" />}
              {texto?.trim() && (
                <div className="bpp__banner-row">
                  <Megaphone size={16} aria-hidden="true" />
                  <span className="bpp__banner-text">{texto.trim()}</span>
                  {link?.trim() && <ChevronRight size={16} aria-hidden="true" />}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      <p className="bpp__caption">
        {visible ? 'Sale al abrir la app, una vez al día' : 'El anuncio no se mostrará'}
      </p>
    </div>
  );
}
