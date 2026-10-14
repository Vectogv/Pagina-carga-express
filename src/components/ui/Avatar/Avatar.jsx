import { useState } from 'react';
import { resolveStorageUrl } from '../../../utils/storage';
import './Avatar.css';

const PALETTE = [
  ['#1E3A8A', '#BFDBFE'],
  ['#14532D', '#BBF7D0'],
  ['#78350F', '#FDE68A'],
  ['#581C87', '#E9D5FF'],
  ['#134E4A', '#99F6E4'],
  ['#7F1D1D', '#FECACA'],
  ['#312E81', '#C7D2FE'],
];

// Solo letras/números: "—", "?" o vacío caen al ícono de persona.
const initialsOf = (name = '') =>
  name.trim().split(/\s+/).map((p) => p.match(/[\p{L}\p{N}]/u)?.[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();

const colorFor = (seed = '') => {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
};

/** Avatar con foto (si existe) o iniciales. No envía datos a servicios externos. */
export default function Avatar({ src, name = '', size = 32, className = '' }) {
  const [failed, setFailed] = useState(false);
  const url = src && !failed ? resolveStorageUrl(src) : '';
  const [bg, fg] = colorFor(name);

  return (
    <span
      className={`avatar ${className}`}
      style={{ '--avatar-size': `${size}px`, '--avatar-bg': bg, '--avatar-fg': fg }}
      title={name || undefined}
    >
      {url ? <img className="avatar__img" src={url} alt={name} onError={() => setFailed(true)} onLoad={(e) => e.currentTarget.naturalWidth <= 1 && setFailed(true)} /> : (initialsOf(name) || (
        <svg width="55%" height="55%" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7z" /></svg>
      ))}
    </span>
  );
}
