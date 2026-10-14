const test = require('node:test');
const assert = require('node:assert/strict');
const { parseCriteria, matches, runSearch } = require('../search');
const { SourceUnavailable } = require('../http');

const base = { precioMax: '100000', departamento: 'montevideo' };

test('parseCriteria arma el rango con la tolerancia (10 % por defecto)', () => {
  const c = parseCriteria(base);
  assert.equal(c.precioMin, 90000);
  assert.equal(c.precioMax, 110000);
  assert.equal(c.departamento, 'Montevideo');
  assert.equal(c.tipo, 'casas');
  assert.deepEqual(c.localidades, []);
});

test('parseCriteria respeta la tolerancia elegida y normaliza localidades', () => {
  const c = parseCriteria({ ...base, tolerancia: '5', dormitorios: '2', localidades: 'pocitos, Punta Carretas', tipo: 'ambos' });
  assert.equal(c.precioMin, 95000);
  assert.equal(c.precioMax, 105000);
  assert.equal(c.dormitorios, 2);
  assert.deepEqual(c.localidades, ['Pocitos', 'Punta Carretas']);
});

test('parseCriteria rechaza datos inválidos con status 400', () => {
  for (const q of [
    { departamento: 'montevideo' },
    { ...base, tolerancia: '80' },
    { ...base, dormitorios: '1.5' },
    { ...base, departamento: 'Buenos Aires' },
    { ...base, localidades: 'Punta del Este' },
    { ...base, tipo: 'terrenos' },
  ]) {
    assert.throws(() => parseCriteria(q), err => err.status === 400, JSON.stringify(q));
  }
});

test('matches filtra por moneda, precio, dormitorios y localidad', () => {
  const c = parseCriteria({ ...base, dormitorios: '3', localidades: 'Carrasco' });
  const aviso = { moneda: 'USD', precio: 100000, dormitorios: 3, localidad: 'Carrasco Norte' };
  assert.equal(matches(aviso, c), true);
  assert.equal(matches({ ...aviso, moneda: 'UYU' }, c), false);
  assert.equal(matches({ ...aviso, precio: 120000 }, c), false);
  assert.equal(matches({ ...aviso, dormitorios: 2 }, c), false);
  assert.equal(matches({ ...aviso, dormitorios: null }, c), false);
  assert.equal(matches({ ...aviso, localidad: 'Pocitos' }, c), false);
});

test('runSearch junta fuentes, quita duplicados, ordena y reporta errores', async () => {
  const aviso = (url, precio) => ({ url, precio, moneda: 'USD', dormitorios: 3, localidad: 'Pocitos' });
  const sources = [
    { nombre: 'A', sitio: 'a', search: async () => ({ avisos: [aviso('u1', 105000), aviso('u2', 95000), aviso('u3', 500000)] }) },
    { nombre: 'B', sitio: 'b', search: async () => ({ avisos: [aviso('u1', 105000)] }) },
    { nombre: 'C', sitio: 'c', search: async () => { throw new Error('caído'); } },
    { nombre: 'D', sitio: 'd', search: async () => { throw new SourceUnavailable('sin token'); } },
    { nombre: 'E', sitio: 'e', search: async () => ({ avisos: [], enlace: 'https://e' }) },
  ];
  const r = await runSearch(parseCriteria(base), sources);
  assert.deepEqual(r.resultados.map(a => a.url), ['u2', 'u1']);
  assert.deepEqual(r.fuentes.map(f => [f.nombre, f.estado, f.cantidad]), [
    ['A', 'ok', 2], ['B', 'ok', 0], ['C', 'error', undefined], ['D', 'no-configurada', undefined], ['E', 'enlace', 0],
  ]);
});
