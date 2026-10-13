// Ejemplo (solo lectura): el moderador entra al Inicio y el título carga.
export default async function ({ browser, lib }) {
  const tokens = await lib.apiLogin('moderador');
  const { page, errores } = await lib.abrir(browser, '/moderator', 1366, { tokens });
  const titulo = await page.$eval('h1, h2, .page-title', (e) => e.innerText).catch(() => null);
  if (!titulo) throw new Error('el Inicio del moderador no muestra título');
  if (errores.length) throw new Error(errores.join(' | '));
  await page.close();
}
