// Solo lectura: el dueño de empresa abre /cliente/empresa a 360 y 1366 y se guardan capturas.
import path from 'node:path';

const SALIDA = process.env.E2E_SALIDA || path.join(process.env.USERPROFILE || '.', 'Desktop', 'Rediseño-Empresa-Web');

export default async function ({ browser, lib }) {
  const tokens = await lib.apiLogin('cliente');
  const fallos = [];
  for (const ancho of [360, 1366]) {
    const { page, errores } = await lib.abrir(browser, '/cliente/empresa', ancho, { tokens, esperados: [/viajes-activos/], espera: 2500 });
    const d = await lib.desborde(page);
    if (d.documento || d.elementos.length) fallos.push(`${ancho}: desborde ${JSON.stringify(d)}`);
    if (await lib.algoSalioMal(page)) fallos.push(`${ancho}: Algo salió mal`);
    if (errores.length) fallos.push(`${ancho}: ${errores.join(' | ')}`);
    await lib.captura(page, path.join(SALIDA, `empresa-${ancho}.png`));
    await page.screenshot({ path: path.join(SALIDA, `empresa-${ancho}-completa.png`), fullPage: true });
    await page.close();
  }
  if (fallos.length) throw new Error(fallos.join('\n'));
}
