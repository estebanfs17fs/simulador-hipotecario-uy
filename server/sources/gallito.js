/**
 * Gallito (gallito.com.uy). Su robots.txt permite todo (`Allow: /`) y el sitio no
 * publica términos que prohíban el acceso automatizado, así que leemos el
 * listado HTML. Somos prolijos: pocas páginas por búsqueda, una a la vez, con
 * pausa entre pedidos y caché de 15 minutos (ver http.js).
 */
const cheerio = require('cheerio');
const { fetchText } = require('../http');
const { slugify } = require('../../js/localidades');

const BASE_URL = 'https://www.gallito.com.uy';
const MAX_PAGES = 3;
const MAX_REQUESTS = 12;
const PAUSE_MS = 500;
const LISTING_HREF = /venta-(casa|apartamento)-(.+)-inmuebles-(\d+)/;

const TIPOS = { casas: ['casas'], apartamentos: ['apartamentos'], ambos: ['casas', 'apartamentos'] };

function searchUrls(criteria) {
  const depto = slugify(criteria.departamento);
  const lugares = criteria.localidades.length ? criteria.localidades.map(slugify) : [null];
  const urls = [];
  for (const tipo of TIPOS[criteria.tipo]) {
    for (const lugar of lugares) {
      urls.push(`${BASE_URL}/inmuebles/${tipo}/venta/${depto}${lugar ? '/' + lugar : ''}`);
    }
  }
  return urls;
}

/** "U$S 390.000" → { precio: 390000, moneda: 'USD' }; "$ 9.500.000" → UYU. */
function parsePrice(text) {
  const usd = text.match(/U\$S\s*([\d.]+)/i) || text.match(/US\$\s*([\d.]+)/i);
  if (usd) return { precio: Number(usd[1].replace(/\./g, '')), moneda: 'USD' };
  const uyu = text.match(/\$\s*([\d.]+)/);
  if (uyu) return { precio: Number(uyu[1].replace(/\./g, '')), moneda: 'UYU' };
  return { precio: null, moneda: null };
}

function parseBedrooms(slug, text) {
  const fromSlug = slug.match(/(\d+)-dormitorios?/);
  if (fromSlug) return Number(fromSlug[1]);
  const masDe = text.match(/m[aá]s de (\d+) dorm/i);
  if (masDe) return Number(masDe[1]) + 1;
  const dorm = text.match(/(\d+)\s*dorm/i);
  if (dorm) return Number(dorm[1]);
  if (/monoambiente/i.test(text)) return 0;
  return null;
}

/** Lee los avisos de una página de resultados. */
function parseListings(html, departamento) {
  const $ = cheerio.load(html);
  const deptoSlug = slugify(departamento);
  const avisos = new Map();

  $('a[href]').each((_, a) => {
    const href = $(a).attr('href');
    const m = href.match(LISTING_HREF);
    if (!m) return;
    const url = new URL(href, BASE_URL).href.split(/[?#]/)[0];
    if (avisos.has(url)) return;

    // Subimos hasta la tarjeta: el contenedor más grande con un solo aviso adentro.
    let card = $(a);
    for (let parent = card.parent(); parent.length && parent[0].type !== 'root'; parent = parent.parent()) {
      const ids = new Set(parent.find('a[href]').map((_, x) => ($(x).attr('href').match(LISTING_HREF) || [])[3]).get().filter(Boolean));
      if (ids.size > 1) break;
      card = parent;
    }

    const text = card.text().replace(/\s+/g, ' ').trim();
    const { precio, moneda } = parsePrice(text);
    if (precio === null) return;

    const slug = m[2];
    const enSlug = slug.split(`-${deptoSlug}`)[0];
    const titulo = card.find('h2, h3').first().text().trim() || $(a).attr('title') || $(a).text().trim();
    const enTitulo = titulo.match(/.* en (.+)$/);
    const img = card.find('img').first();

    avisos.set(url, {
      fuente: 'Gallito',
      titulo: titulo || `${m[1] === 'casa' ? 'Casa' : 'Apartamento'} en ${enSlug.replace(/-/g, ' ')}`,
      precio,
      moneda,
      dormitorios: parseBedrooms(slug, text),
      departamento,
      localidad: enTitulo ? enTitulo[1].trim() : enSlug.replace(/-/g, ' '),
      url,
      imagen: img.attr('data-src') || img.attr('src') || null,
    });
  });

  return [...avisos.values()];
}

const pause = ms => new Promise(r => setTimeout(r, ms));

async function search(criteria, { fetchImpl, pauseMs = PAUSE_MS } = {}) {
  const avisos = [];
  const errores = [];
  let requests = 0;
  for (const base of searchUrls(criteria)) {
    for (let pag = 1; pag <= MAX_PAGES && requests < MAX_REQUESTS; pag++) {
      if (requests > 0) await pause(pauseMs);
      requests++;
      try {
        const html = await fetchText(pag === 1 ? base : `${base}?pag=${pag}`, { fetchImpl });
        const page = parseListings(html, criteria.departamento);
        if (!page.length) break;
        avisos.push(...page);
      } catch (err) {
        // Una localidad que el sitio no reconoce no debe tumbar las demás.
        errores.push(err);
        break;
      }
    }
  }
  if (!avisos.length && errores.length) throw errores[0];
  return { avisos };
}

module.exports = { nombre: 'Gallito', sitio: BASE_URL, search, searchUrls, parseListings, parsePrice };
