/**
 * Prueba de punta a punta del simulador en un navegador real (Chromium), con las
 * mismas librerías de CDN que carga el sitio. La corre el workflow antes de
 * publicar (sobre la carpeta armada) y después de publicar (sobre el sitio real).
 *
 *   node scripts/e2e.js _site                       → sirve la carpeta y la prueba
 *   node scripts/e2e.js https://compracasasuy.com   → prueba el sitio publicado
 *
 * Opciones: --bcu exige que el dólar y la UI vengan del BCU. Con la variable
 * E2E_VERSION=<commit> exige que la página publicada sea la de ese commit.
 * Si falla guarda capturas en e2e-capturas/ para ver qué pasó.
 */
const fs = require('fs');
const http = require('http');
const path = require('path');
const playwright = require('playwright');

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json', '.xml': 'application/xml', '.txt': 'text/plain',
};
const SHOTS = 'e2e-capturas';

function serve(dir) {
  const server = http.createServer((req, res) => {
    const url = decodeURIComponent(req.url.split('?')[0]);
    let file = path.join(dir, url.endsWith('/') ? url + 'index.html' : url);
    if (!file.startsWith(path.resolve(dir)) || !fs.existsSync(file)) {
      res.writeHead(404).end('no existe');
      return;
    }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server)));
}

function check(ok, msg) {
  if (!ok) throw new Error(msg);
  console.log(`  ✓ ${msg}`);
}

async function scenario(browser, baseUrl, name, device, steps) {
  console.log(`▶ ${name}`);
  const context = await browser.newContext({ ...device, locale: 'es-UY' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(`error de JavaScript: ${e.message}`));
  page.on('console', m => { if (m.type() === 'error') console.log(`    consola: ${m.text()}`); });
  page.on('requestfailed', r => console.log(`    no cargó: ${r.url()} (${r.failure()?.errorText})`));
  try {
    // Cada escenario arranca de cero, sin caché ni simulación guardada.
    await page.goto(`${baseUrl}/?e2e=${Date.now()}`, { waitUntil: 'load' });
    await page.waitForFunction(() => !document.querySelector('#rateStatus .spinner-border'), null, { timeout: 15000 });
    await steps(page);
    check(errors.length === 0, `sin errores de JavaScript${errors.length ? ': ' + errors.join(' | ') : ''}`);
  } catch (err) {
    fs.mkdirSync(SHOTS, { recursive: true });
    await page.screenshot({ path: path.join(SHOTS, `${name.replace(/\W+/g, '-')}.png`), fullPage: true }).catch(() => {});
    if (errors.length) err.message += `\n    ${errors.join('\n    ')}`;
    throw err;
  } finally {
    await context.close();
  }
}

async function calculate(page) {
  await page.click('#btnCalcular');
  await page.waitForSelector('#results:not(.d-none)', { timeout: 5000 }).catch(() => {});
  const visible = await page.isVisible('#results');
  const hint = (await page.textContent('#formHint')).trim();
  check(visible, `aparecen los resultados${visible ? '' : ` (el formulario dice: "${hint || 'nada'}")`}`);
  for (const id of ['s1', 's2', 's3']) {
    const text = (await page.textContent(`#${id} .scenario-body`)).trim();
    check(text.length > 0, `el escenario ${id} tiene contenido`);
  }
  const figure = await page.textContent('#s3 .scenario-figure').catch(() => '');
  return figure.trim();
}

async function runScenarios(browser, engine, baseUrl, expectBcu) {
  const desktop = { viewport: { width: 1280, height: 900 } };
  // Firefox no emula celulares; ahí se prueba solo el ancho de pantalla.
  const mobile = engine === 'firefox'
    ? { viewport: { width: 390, height: 844 } }
    : { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true };
  const name = text => `${engine}: ${text}`;

  await scenario(browser, baseUrl, name('valores por defecto en computadora'), desktop, async page => {
    const version = process.env.E2E_VERSION;
    if (version) check((await page.content()).includes(`?v=${version}`), `el sitio sirve la versión ${version.slice(0, 7)}`);
    check(await page.inputValue('#propertyPrice') !== '', 'el precio viene cargado');
    check(await page.isEnabled('#btnCalcular'), 'el botón Calcular está habilitado');
    check(await page.evaluate(() => typeof window.Chart === 'function'), 'cargó Chart.js');
    const figure = await calculate(page);
    check(/US\$/.test(figure), `la cuota óptima está en dólares (${figure})`);
  });

  await scenario(browser, baseUrl, name('valores por defecto en celular'), mobile, async page => {
    await calculate(page);
  });

  await scenario(browser, baseUrl, name('monto escrito con punto de miles'), desktop, async page => {
    await page.fill('#propertyPrice', '200.000');
    await page.fill('#downPayment', '40.000');
    await calculate(page);
    const loan = (await page.textContent('#summaryLoan')).trim();
    check(loan.startsWith('US$ 160.000'), `el préstamo es de US$ 160.000 (${loan})`);
  });

  await scenario(browser, baseUrl, name('préstamo en UI con banco'), desktop, async page => {
    await page.click('label[for="currencyUI"]');
    const status = (await page.textContent('#uiStatus')).trim();
    check(!expectBcu || status.includes('BCU al'), `la UI viene del BCU (${status})`);
    check(!expectBcu || (await page.textContent('#rateStatus')).includes('BCU al'), 'el dólar viene del BCU');
    await page.selectOption('#bankSelect', 'bhu');
    const figure = await calculate(page);
    check(/^UI /.test(figure), `la cuota óptima está en UI (${figure})`);
  });

  await scenario(browser, baseUrl, name('falta un dato'), desktop, async page => {
    await page.fill('#propertyPrice', '');
    await page.click('#btnCalcular');
    const hint = (await page.textContent('#formHint')).trim();
    check(hint.includes('Precio de la propiedad'), `avisa qué dato falta ("${hint}")`);
  });
}

async function main() {
  const args = process.argv.slice(2);
  const target = args.find(a => !a.startsWith('--')) || '.';
  const expectBcu = args.includes('--bcu');
  // Chromium es Chrome y Edge, WebKit es Safari (iPhone y Mac), Firefox es Firefox.
  const engines = (process.env.E2E_BROWSERS || 'chromium,webkit,firefox').split(',');
  let server = null;
  let baseUrl = target.replace(/\/$/, '');
  if (!/^https?:\/\//.test(target)) {
    server = await serve(path.resolve(target));
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  }
  console.log(`Probando ${baseUrl} en ${engines.join(', ')}`);

  const failures = [];
  try {
    for (const engine of engines) {
      const options = engine === 'chromium' && process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {};
      const browser = await playwright[engine].launch(options);
      try {
        await runScenarios(browser, engine, baseUrl, expectBcu);
      } catch (err) {
        console.error(`\n✗ ${engine}: ${err.message}\n`);
        failures.push(engine);
      } finally {
        await browser.close();
      }
    }
  } finally {
    if (server) server.close();
  }
  if (failures.length) throw new Error(`falló en ${failures.join(', ')}`);
  console.log('Todo bien.');
}

main().catch(err => {
  console.error(`\n✗ ${err.message}`);
  process.exit(1);
});
