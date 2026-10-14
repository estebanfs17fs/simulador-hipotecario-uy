const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { clearCache } = require('../http');
const gallito = require('../sources/gallito');
const mercadolibre = require('../sources/mercadolibre');
const infocasas = require('../sources/infocasas');
const remax = require('../sources/remax');
const { parseCriteria } = require('../search');

const html = fs.readFileSync(path.join(__dirname, 'fixtures/gallito-listado.html'), 'utf8');
const response = (body, status = 200) => ({ ok: status < 400, status, text: async () => body });

test.beforeEach(() => clearCache());

test('gallito: lee precio, moneda, dormitorios, localidad e imagen de cada tarjeta', () => {
  const avisos = gallito.parseListings(html, 'Montevideo');
  assert.equal(avisos.length, 3); // el aviso sin precio se descarta
  assert.deepEqual(avisos[0], {
    fuente: 'Gallito',
    titulo: 'Casa en venta de 4 dormitorios en Pocitos',
    precio: 140000,
    moneda: 'USD',
    dormitorios: 4,
    departamento: 'Montevideo',
    localidad: 'Pocitos',
    url: 'https://www.gallito.com.uy/venta-casa-pocitos-montevideo-4-dormitorios-inmuebles-28985972',
    imagen: 'https://img.example/1.jpg',
  });
  assert.equal(avisos[1].url, 'https://www.gallito.com.uy/venta-casa-belvedere-montevideo-3-dormitorios-inmuebles-29541464');
  assert.deepEqual([avisos[2].precio, avisos[2].moneda, avisos[2].dormitorios], [6500000, 'UYU', 5]);
});

test('gallito: arma una URL por tipo y localidad', () => {
  const c = parseCriteria({ precioMax: 1, departamento: 'Treinta y Tres', localidades: 'Vergara', tipo: 'ambos' });
  assert.deepEqual(gallito.searchUrls(c), [
    'https://www.gallito.com.uy/inmuebles/casas/venta/treinta-y-tres/vergara',
    'https://www.gallito.com.uy/inmuebles/apartamentos/venta/treinta-y-tres/vergara',
  ]);
});

test('gallito: pagina hasta que no hay avisos y sigue si una localidad falla', async () => {
  const pedidos = [];
  const fetchImpl = async url => {
    pedidos.push(url);
    if (url.includes('/prado')) return response('', 404);
    return response(url.includes('pag=2') ? '<html></html>' : html);
  };
  const c = parseCriteria({ precioMax: 100000, departamento: 'Montevideo', localidades: 'Prado,Pocitos' });
  const { avisos } = await gallito.search(c, { fetchImpl, pauseMs: 0 });
  assert.equal(avisos.length, 3);
  assert.deepEqual(pedidos.map(u => u.replace('https://www.gallito.com.uy/inmuebles/casas/venta/montevideo', '')), [
    '/prado', '/pocitos', '/pocitos?pag=2',
  ]);
});

test('mercadolibre: sin token la fuente queda como no configurada', async () => {
  const c = parseCriteria({ precioMax: 100000, departamento: 'Montevideo' });
  await assert.rejects(mercadolibre.search(c, { token: '' }), /MELI_ACCESS_TOKEN/);
});

test('mercadolibre: usa la API con token, categoría y departamento', async () => {
  const pedidos = [];
  const fetchImpl = async (url, opts) => {
    pedidos.push(url);
    assert.equal(opts.headers.Authorization, 'Bearer tkn');
    const u = new URL(url);
    if (u.pathname === '/classified_locations/countries/UY') return response(JSON.stringify({ states: [{ id: 'ST-MVD', name: 'Montevideo' }] }));
    if (u.pathname === '/categories/MLU1459') return response(JSON.stringify({ children_categories: [{ id: 'CAT-CASAS', name: 'Casas' }] }));
    if (u.pathname === '/categories/CAT-CASAS') return response(JSON.stringify({ children_categories: [{ id: 'CAT-CASAS-VENTA', name: 'Venta' }] }));
    if (u.pathname === '/sites/MLU/search') {
      return response(JSON.stringify({
        paging: { total: 1 },
        results: [{
          title: 'Casa en Pocitos', price: 98000, currency_id: 'USD', permalink: 'https://casa.mercadolibre.com.uy/MLU-1',
          thumbnail: 'https://img/1.jpg',
          attributes: [{ id: 'BEDROOMS', value_name: '3' }],
          location: { neighborhood: { name: 'Pocitos' }, city: { name: 'Montevideo' } },
        }],
      }));
    }
    return response('', 404);
  };
  const c = parseCriteria({ precioMax: 100000, departamento: 'Montevideo' });
  const { avisos } = await mercadolibre.search(c, { fetchImpl, token: 'tkn' });
  assert.deepEqual(avisos, [{
    fuente: 'Mercado Libre', titulo: 'Casa en Pocitos', precio: 98000, moneda: 'USD', dormitorios: 3,
    departamento: 'Montevideo', localidad: 'Pocitos, Montevideo', url: 'https://casa.mercadolibre.com.uy/MLU-1', imagen: 'https://img/1.jpg',
  }]);
  const search = new URL(pedidos.find(u => u.includes('/search')));
  assert.equal(search.searchParams.get('category'), 'CAT-CASAS-VENTA');
  assert.equal(search.searchParams.get('state'), 'ST-MVD');
  assert.equal(search.searchParams.get('price'), '90000-110000');
});

test('infocasas: no lee el sitio, solo devuelve el enlace al buscador', async () => {
  const c = parseCriteria({ precioMax: 100000, departamento: 'Maldonado', localidades: 'Punta del Este' });
  assert.deepEqual(await infocasas.search(c), { avisos: [], enlace: 'https://www.infocasas.com.uy/venta/casas/maldonado/punta-del-este' });
});

test('remax: enlace por tipo y ciudad (la localidad si hay una sola, si no el departamento)', async () => {
  const una = parseCriteria({ precioMax: 100000, departamento: 'Maldonado', localidades: 'Punta del Este', tipo: 'apartamentos' });
  assert.deepEqual(await remax.search(una), { avisos: [], enlace: 'https://www.remax.com.uy/apartamentos-en-venta-en-punta-del-este' });
  const varias = parseCriteria({ precioMax: 100000, departamento: 'Montevideo', localidades: 'Pocitos,Prado' });
  assert.equal(remax.buildLink(varias), 'https://www.remax.com.uy/casas-en-venta-en-montevideo');
});
