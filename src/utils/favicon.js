const DEFAULT_HREF = '/favicon.svg';

function makeSvgBadge(total) {
  const num = total > 99 ? '99+' : String(total);
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">'
    + '<rect width="32" height="32" rx="7" fill="#020617"/>'
    + '<text x="15" y="23" font-size="18" text-anchor="middle">🚚</text>'
    + '<circle cx="25" cy="7" r="9" fill="#EF4444"/>'
    + '<text x="25" y="8" font-size="10" fill="#ffffff" text-anchor="middle" dominant-baseline="central" font-weight="bold">' + num + '</text>'
    + '</svg>';
  return 'data:image/svg+xml,' + encodeURIComponent(svg);
}

// Muestra el total (emergencias + no-leídos de chat) como badge rojo en el favicon.
// Con total 0 restaura el favicon original.
export function updateFaviconBadge(total) {
  if (typeof document === 'undefined') return;
  let el = document.querySelector('link[rel="icon"]');
  if (!el) {
    el = document.createElement('link');
    el.rel = 'icon';
    el.type = 'image/svg+xml';
    document.head.appendChild(el);
  }
  if (!total || total <= 0) {
    el.href = DEFAULT_HREF;
    return;
  }
  el.href = makeSvgBadge(total);
}