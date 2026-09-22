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

const initialsOf = (name = '') =>
  name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase() || '?';

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
      {url ? <img className="avatar__img" src={url} alt={name} onError={() => setFailed(true)} /> : initialsOf(name)}
    </span>
  );
}
