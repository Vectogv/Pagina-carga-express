// Utilidades e2e: Chrome headless, login por rol, detectores de fallos.
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const AQUI = path.dirname(fileURLToPath(import.meta.url));
export const CHROME = process.env.E2E_CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

// Lee e2e/.env.e2e (sin pisar variables ya definidas).
try {
  for (const l of fs.readFileSync(path.join(AQUI, '.env.e2e'), 'utf8').split(/\r?\n/)) {
    const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2];
  }
} catch { /* sin archivo: se exigen variables de entorno */ }

export const BASE = process.env.E2E_WEB_URL || 'http://localhost:5173';
export const API = process.env.E2E_API_URL || 'https://bakend-cargaexpress-production-5dd5.up.railway.app';
export const ANCHOS = [360, 768, 1366, 1920];
const ALTO = { 360: 740, 768: 1024, 1366: 768, 1920: 1080 };
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function credenciales(rol) {
  // Cuentas solo por variables de entorno (o e2e/.env.e2e, ignorado por git): nunca en el código.
  const clave = { admin: 'ADMIN', moderador: 'MOD', cliente: 'CLIENTE' }[rol];
  const email = process.env[`E2E_${clave}`];
  const password = process.env[`E2E_${clave}_PASS`];
  if (!email || !password) throw new Error(`Faltan E2E_${clave} y E2E_${clave}_PASS (correo y clave) en el entorno o en e2e/.env.e2e`);
  return [email, password];
}

export async function apiLogin(rol) {
  const [email, password] = credenciales(rol);
  const r = await fetch(`${API}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
  if (!r.ok) throw new Error(`login ${rol} ${r.status}: ${await r.text()}`);
  // El login trae el usuario en la raíz, junto con token y refreshToken.
  const { token, refreshToken, ...user } = await r.json();
  return { access: token, refresh: refreshToken, user };
}

// GET autenticado a la API; devuelve JSON o null.
export async function api(tokens, ruta) {
  const r = await fetch(`${API}${ruta}`, { headers: { Authorization: `Bearer ${tokens.access}` } });
  return r.ok ? r.json() : null;
}

export const lanzar = () => puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-gpu', '--lang=es-CO'] });

// Rutas de un rol, sacadas de las tablas de src/App.jsx (const admin/moderator/cliente = { clave: lazy(...) }).
export function rutasDe(rol) {
  const src = fs.readFileSync(path.join(AQUI, '..', 'src', 'App.jsx'), 'utf8');
  const nombre = { admin: 'admin', moderador: 'moderator', cliente: 'cliente' }[rol];
  const bloque = src.match(new RegExp(`const ${nombre} = \\{([\\s\\S]*?)\\n\\};`))?.[1] || '';
  const base = '/' + nombre;
  const claves = [...bloque.matchAll(/^\s{2}(?:'([^']+)'|(\w+)):\s*lazy/gm)].map((m) => m[1] || m[2]);
  return claves.map((k) => (k === 'index' ? base : `${base}/${k}`));
}

// Resuelve :id con un id real; devuelve la ruta o null (se salta).
export async function resolverId(ruta, tokens, rol) {
  if (!ruta.includes(':id')) return ruta;
  const pick = (d) => { const a = Array.isArray(d) ? d : d?.data || d?.drivers || d?.items || []; return a[0]?.id ?? a[0]?._id; };
  let id = null;
  if (ruta.includes('/drivers/')) {
    for (const p of [`/api/${rol === 'admin' ? 'admin' : 'moderator'}/drivers`, '/api/admin/drivers']) { id = pick(await api(tokens, p)); if (id) break; }
  } else if (ruta.includes('/clients/')) {
    id = pick(await api(tokens, '/api/admin/clients')) ?? pick(await api(tokens, '/api/moderator/clients')) ?? 88;
  }
  return id ? ruta.replace(':id', id) : null;
}

// Abre una ruta con sesión y recolecta señales de fallo. esperados: regex de URLs de API cuyo 4xx/5xx se ignora.
export async function abrir(browser, ruta, ancho, { tokens, esperados = [], espera = 1200 } = {}) {
  const page = await browser.newPage();
  await page.setViewport({ width: ancho, height: ALTO[ancho] || 900, deviceScaleFactor: 1 });
  if (tokens) await page.evaluateOnNewDocument((t) => { try { localStorage.setItem('accessToken', t.access); localStorage.setItem('refreshToken', t.refresh); localStorage.setItem('user', JSON.stringify(t.user)); } catch { /* iframe con sandbox: sin storage */ } }, tokens);
  const errores = [];
  // En dev y en Vercel la API va por el proxy `/api` de la propia web; en el servidor, por su URL absoluta.
  const esApi = (u) => u.startsWith(API) || u.startsWith(BASE + '/api');
  page.on('console', (m) => {
    // El 4xx/5xx de la API lo juzga el listener de respuestas (respeta `esperados`); aquí no se duplica.
    if (m.type() === 'error' && !(/Failed to load resource/.test(m.text()) && esApi(m.location()?.url || ''))) errores.push(`consola: ${m.text().slice(0, 160)}`);
  });
  page.on('pageerror', (e) => errores.push(`excepción: ${String(e.message).slice(0, 160)}`));
  page.on('response', (r) => {
    const u = r.url();
    if (!esApi(u) || r.status() < 400) return;
    const ruta = new URL(u).pathname;
    // Un 4xx esperado por contrato (p. ej. 404 = sin viaje activo) se ignora; un 5xx nunca.
    if (r.status() < 500 && esperados.some((x) => x.test(ruta))) return;
    errores.push(`API ${r.status()} ${ruta}`);
  });
  await page.goto(BASE + ruta, { waitUntil: 'networkidle2', timeout: 60000 }).catch((e) => errores.push(`goto: ${e.message.slice(0, 100)}`));
  await page.waitForFunction(() => !document.querySelector('.skeleton, .loading-state'), { timeout: 25000 }).catch(() => errores.push('sigue cargando (25 s)'));
  await sleep(espera);
  return { page, errores };
}

export const algoSalioMal = (page) => page.evaluate(() => /Algo salió mal/i.test(document.body.innerText));

// Desborde horizontal real: se ignoran los scrolls internos legítimos (mapa, tablas anchas con su propio scroll).
export const desborde = (page) => page.evaluate(() => {
  const vw = window.innerWidth;
  const doc = document.documentElement;
  const cerrado = document.querySelector('.sidebar:not(.sidebar--open)');
  const out = [];
  for (const el of document.querySelectorAll('body *')) {
    if ((cerrado && cerrado.contains(el)) || el.closest('.leaflet-container, .sidebar__backdrop, .dtable__scroll, .cli-emp__scroll')) continue;
    const s = getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden' || s.opacity === '0') continue;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    if (r.right > vw + 1 || r.left < -1) out.push(el.tagName.toLowerCase() + (typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\s+/)[0] : ''));
  }
  return { documento: doc.scrollWidth > vw, elementos: [...new Set(out)].slice(0, 4) };
});

export async function captura(page, archivo) {
  fs.mkdirSync(path.dirname(archivo), { recursive: true });
  await page.screenshot({ path: archivo });
}
