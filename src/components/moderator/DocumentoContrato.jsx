import { Fragment } from 'react';
import { partirMarcadores } from '../../api/contrato';
import { formatDate } from '../../utils/format';
import { zonaLabelFrom } from '../../hooks/useZonas';
import { resolveStorageUrl } from '../../utils/storage';
import './DocumentoContrato.css';

const ORDINAL = /^(PRIMERA|SEGUNDA|TERCERA|CUARTA|QUINTA|SEXTA|S[ÉE]PTIMA|OCTAVA|NOVENA|D[ÉE]CIMA|UND[ÉE]CIMA|DUOD[ÉE]CIMA|CL[ÁA]USULA)\b[^.:\n]{0,60}[.:]\s*/i;

/**
 * Markdown mínimo del acuerdo → bloques: # títulos, > nota, - y 1. listas, --- y párrafos.
 * Omite el primer # (va en el encabezado) y las líneas de firma/versión del final (van en el bloque de firmas).
 */
function bloquesAcuerdo(texto = '') {
  const bloques = [];
  let parrafo = [];
  let primerH1 = true;
  const cerrar = () => {
    if (parrafo.length) bloques.push({ t: 'p', txt: parrafo.join(' ') });
    parrafo = [];
  };
  const ultimo = () => bloques[bloques.length - 1];

  for (const cruda of texto.split(/\r?\n/)) {
    const l = cruda.trim();
    if (!l) { cerrar(); continue; }
    if (/^(firma del moderador|versi[óo]n del documento)\b/i.test(l.replace(/\*/g, ''))) { cerrar(); continue; }
    let m;
    if ((m = l.match(/^(#{1,3})\s+(.*)$/))) {
      cerrar();
      if (m[1].length === 1 && primerH1) { primerH1 = false; continue; }
      bloques.push({ t: `h${Math.min(m[1].length + 1, 4)}`, txt: m[2] });
    } else if (/^(-{3,}|\*{3,}|_{3,})$/.test(l)) {
      cerrar();
      bloques.push({ t: 'hr' });
    } else if (l.startsWith('>')) {
      cerrar();
      const txt = l.replace(/^>\s?/, '');
      if (ultimo()?.t === 'nota') ultimo().txt += ` ${txt}`;
      else bloques.push({ t: 'nota', txt });
    } else if ((m = l.match(/^([-*•]|\d+[.)])\s+(.*)$/))) {
      cerrar();
      const t = /\d/.test(m[1]) ? 'ol' : 'ul';
      if (ultimo()?.t === t) ultimo().items.push(m[2]);
      else bloques.push({ t, items: [m[2]] });
    } else if ((m = l.match(ORDINAL)) && !parrafo.length) {
      // Texto plano "PRIMERA. Objeto: ..." → título de cláusula + párrafo.
      bloques.push({ t: 'h3', txt: m[0].trim() });
      if (l.slice(m[0].length)) parrafo.push(l.slice(m[0].length));
    } else if ((ultimo()?.t === 'ul' || ultimo()?.t === 'ol') && !parrafo.length && /^\s{2,}/.test(cruda)) {
      const it = ultimo().items;
      it[it.length - 1] += ` ${l}`;
    } else {
      parrafo.push(l);
    }
  }
  cerrar();
  while (bloques.length && bloques[bloques.length - 1].t === 'hr') bloques.pop();
  return bloques;
}

/** **negrita** y [MARCADOR] (resaltado en amarillo). */
function Linea({ txt }) {
  return txt.split(/\*\*(.+?)\*\*/g).map((trozo, i) => {
    const partes = partirMarcadores(trozo).map((p, j) => (j % 2 ? <mark key={j} className="doccon__marca">{p}</mark> : p));
    return i % 2 ? <strong key={i}>{partes}</strong> : <Fragment key={i}>{partes}</Fragment>;
  });
}

function Bloque({ b }) {
  switch (b.t) {
    case 'hr': return <hr />;
    case 'nota': return <aside className="doccon__nota"><Linea txt={b.txt} /></aside>;
    case 'ul':
    case 'ol': {
      const Lista = b.t;
      return <Lista>{b.items.map((it, i) => <li key={i}><Linea txt={it} /></li>)}</Lista>;
    }
    case 'p': return <p><Linea txt={b.txt} /></p>;
    default: {
      const H = b.t;
      return <H><Linea txt={b.txt} /></H>;
    }
  }
}

/**
 * Contrato del moderador como hoja de papel (se parece al PDF del servidor).
 * Sin `nombre` (vista previa de gerencia) no muestra los datos del moderador.
 * `firmas` = firmasContrato del servidor: { contratante, moderador } con nombre, cédula y firmaUrl.
 */
export default function DocumentoContrato({ acuerdo, numero, nombre, cedula, zona, desde, hasta, firmas }) {
  if (!acuerdo) return null;
  const g = firmas?.contratante;
  const m = firmas?.moderador;
  const datos = nombre && [
    ['Moderador', nombre],
    ['Cédula', cedula],
    ['Zona', zona && zonaLabelFrom([], zona)],
    ['Inicio', desde && formatDate(desde)],
    ['Fin', hasta && formatDate(hasta)],
  ].filter(([, v]) => v);

  return (
    <article className="doccon">
      <header className="doccon__cab">
        <img src="/logo.png" alt="" className="doccon__logo" />
        <div className="doccon__cab-txt">
          <span className="doccon__empresa">CargaExpress</span>
          <h1 className="doccon__titulo">{acuerdo.titulo}</h1>
          <span className="doccon__meta">
            Versión {acuerdo.version}{numero ? ` · Contrato N.º ${numero}` : ''}
          </span>
        </div>
      </header>

      {datos?.length > 0 && (
        <dl className="doccon__datos">
          {datos.map(([k, v]) => (
            <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
          ))}
        </dl>
      )}

      <div className="doccon__cuerpo">
        {bloquesAcuerdo(acuerdo.texto).map((b, i) => <Bloque key={i} b={b} />)}
      </div>

      <footer className="doccon__firmas">
        <div className="doccon__firma">
          <div className="doccon__firma-espacio">{g?.firmaUrl && <img src={resolveStorageUrl(g.firmaUrl)} alt="Firma de gerencia" />}</div>
          <strong>EL CONTRATANTE</strong>
          <span><Linea txt={g?.nombre || '[NOMBRE DEL CONTRATANTE]'} /></span>
          {g?.cedula && <span>C.C. {g.cedula}</span>}
          <span>Titular de CargaExpress</span>
        </div>
        <div className="doccon__firma">
          <div className="doccon__firma-espacio">{m?.firmaUrl && <img src={resolveStorageUrl(m.firmaUrl)} alt="Firma del moderador" />}</div>
          <strong>EL MODERADOR</strong>
          <span>{m?.nombre || nombre || 'Nombre del moderador'}</span>
          <span>C.C. {m?.cedula || cedula || '__________'}</span>
          {m?.firmadoAt && <span>Firmado el {formatDate(m.firmadoAt)}</span>}
        </div>
      </footer>
    </article>
  );
}

/** Miniatura de un documento (cédula, rostro, firma) que se abre en grande. Estilos: .vermod__img. */
export function ImagenDocumento({ titulo, src, blanco }) {
  return (
    <figure className="vermod__img">
      <figcaption>{titulo}</figcaption>
      {src ? (
        <a href={resolveStorageUrl(src)} target="_blank" rel="noopener noreferrer" title="Abrir en grande">
          <img src={resolveStorageUrl(src)} alt={titulo} className={blanco ? 'is-papel' : ''} />
        </a>
      ) : <div className="vermod__vacio">Sin subir</div>}
    </figure>
  );
}
