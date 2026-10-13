// Uso: node e2e/flujo.mjs <nombre>  -> ejecuta e2e/flujos/<nombre>.mjs (export default async (ctx))
import * as lib from './lib.mjs';

const nombre = process.argv[2];
if (!nombre) { console.error('Uso: node e2e/flujo.mjs <nombre>'); process.exit(2); }
const { default: flujo } = await import(`./flujos/${nombre}.mjs`);
const browser = await lib.lanzar();
try {
  await flujo({ browser, lib, api: lib.api });
  console.log(`OK flujo ${nombre}`);
} catch (e) {
  console.log(`FALLA flujo ${nombre}: ${e.message}`);
  process.exitCode = 1;
} finally {
  await browser.close();
}
