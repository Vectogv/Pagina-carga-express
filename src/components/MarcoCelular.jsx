import './MarcoCelular.css';

/** Marco de celular compartido por las vistas previas del panel (anuncio, avisos, correo). */
export default function MarcoCelular({ children, label = 'Vista previa en el celular', caption }) {
  return (
    <div className="bpp" aria-label={label}>
      <div className="bpp__phone">
        <div className="bpp__notch" aria-hidden="true" />
        {children}
      </div>
      {caption && <p className="bpp__caption">{caption}</p>}
    </div>
  );
}
