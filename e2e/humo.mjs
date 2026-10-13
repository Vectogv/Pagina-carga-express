// Humo: recorre todas las rutas de cada rol a 4 anchos. Falla (exit 1) si hay error de consola, "Algo salió mal", desborde o API 4xx/5xx.
// Uso: node e2e/humo.mjs [admin|moderador|cliente ...]
import path from 'node:path';
import { AQUI, ANCHOS, apiLogin, lanzar, rutasDe, resolverId, abrir, algoSalioMal, desborde, captura } from './lib.mjs';

const roles = process.argv.slice(2).length ? process.argv.slice(2) : ['admin', 'moderador', 'cliente'];
const browser = await lanzar();
// 4xx que el servidor devuelve por contrato y la web maneja (no son fallos).
const ESPERADOS = { cliente: [/^\/api\/trips\/active$/] }; // 404 = el cliente no tiene viaje en curso
let rutas = 0, fallos = 0;
try {
  for (const rol of roles) {
    const tokens = await apiLogin(rol);
    for (const plantilla of rutasDe(rol)) {
      const ruta = await resolverId(plantilla, tokens, rol);
      if (!ruta) { console.log(`SALTADA ${rol} ${plantilla} (sin id real)`); continue; }
      rutas++;
      for (const w of ANCHOS) {
        const { page, errores } = await abrir(browser, ruta, w, { tokens, esperados: ESPERADOS[rol] || [] });
        if (await algoSalioMal(page)) errores.push('"Algo salió mal"');
        const d = await desborde(page);
        if (d.documento || d.elementos.length) errores.push(`desborde horizontal ${d.elementos.join(', ')}`);
        await captura(page, path.join(AQUI, 'out', rol, `${ruta.replace(/^\//, '').replace(/\//g, '_')}_${w}.png`));
        await page.close();
        const unicos = [...new Set(errores)];
        if (unicos.length) { fallos += unicos.length; console.log(`FALLA ${rol} ${ruta} @${w}: ${unicos.join(' | ')}`); }
      }
    }
  }
} finally {
  await browser.close();
}
console.log(`${rutas} rutas, ${fallos} fallos`);
process.exit(fallos ? 1 : 0);
