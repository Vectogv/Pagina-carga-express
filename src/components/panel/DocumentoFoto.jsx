import { useState } from 'react';
import { Avatar, Badge, Modal } from '../ui';
import { resolveStorageUrl } from '../../utils/storage';

/** Visor simple: la imagen en grande dentro de un Modal. */
function Visor({ url, titulo, onClose }) {
  return (
    <Modal isOpen onClose={onClose} title={titulo} size="lg">
      <a href={url} target="_blank" rel="noopener noreferrer" className="visor-foto__link">
        <img src={url} alt={titulo} className="visor-foto__img" />
      </a>
    </Modal>
  );
}

/**
 * Documento o foto con miniatura que se abre en grande. Sin archivo muestra el chip rojo "Falta";
 * si la imagen no carga, un aviso. PDF: enlace.
 * props: { label, path, extra?, obligatorio? (true): muestra "Falta" si no hay archivo }
 */
export function DocumentoFoto({ label, path, extra, obligatorio = true }) {
  const [abierto, setAbierto] = useState(false);
  const [roto, setRoto] = useState(false);
  const url = resolveStorageUrl(path);
  const esPdf = /\.pdf($|\?)/i.test(path || '');
  let cuerpo;
  if (!url) {
    cuerpo = obligatorio ? <Badge variant="danger">Falta</Badge> : <span className="perfil-doc__vacio">Sin cargar</span>;
  } else if (esPdf) {
    cuerpo = <a href={url} target="_blank" rel="noopener noreferrer">Ver PDF</a>;
  } else if (roto) {
    cuerpo = <span className="perfil-doc__vacio">No se pudo cargar</span>;
  } else {
    cuerpo = (
      <button type="button" className="perfil-doc__btn" onClick={() => setAbierto(true)} aria-label={`Ampliar ${label}`}>
        <img src={url} alt={label} className="perfil-doc__img" loading="lazy" onError={() => setRoto(true)} />
      </button>
    );
  }
  return (
    <div className="perfil-doc">
      <span className="detail-list__label">{label}</span>
      {cuerpo}
      {extra}
      {abierto && <Visor url={url} titulo={label} onClose={() => setAbierto(false)} />}
    </div>
  );
}

/** Foto de perfil grande que se amplía al tocarla (iniciales si no hay foto). */
export function AvatarAmpliable({ src, name, size = 112, className = '' }) {
  const [abierto, setAbierto] = useState(false);
  const url = resolveStorageUrl(src);
  if (!url) return <Avatar src={src} name={name} size={size} className={className} />;
  return (
    <>
      <button type="button" className="perfil-doc__btn perfil-cab__btn" onClick={() => setAbierto(true)} aria-label={`Ampliar la foto de ${name}`}>
        <Avatar src={src} name={name} size={size} className={className} />
      </button>
      {abierto && <Visor url={url} titulo={name} onClose={() => setAbierto(false)} />}
    </>
  );
}
