const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../index');

async function withServer(app, fn) {
  const server = app.listen(0);
  await new Promise(r => server.once('listening', r));
  try {
    await fn(`http://127.0.0.1:${server.address().port}`);
  } finally {
    server.close();
  }
}

test('GET /api/buscar devuelve resultados y fuentes con CORS', async () => {
  const sources = [{ nombre: 'A', sitio: 'a', search: async () => ({ avisos: [{ url: 'u', precio: 100000, moneda: 'USD', dormitorios: 2, localidad: 'Pocitos' }] }) }];
  await withServer(createApp({ sources, allowedOrigin: 'https://ejemplo.uy' }), async url => {
    const res = await fetch(`${url}/api/buscar?precioMax=100000&departamento=Montevideo`);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('access-control-allow-origin'), 'https://ejemplo.uy');
    const body = await res.json();
    assert.equal(body.resultados.length, 1);
    assert.equal(body.fuentes[0].estado, 'ok');
  });
});

test('GET /api/buscar con datos inválidos responde 400 con el motivo', async () => {
  await withServer(createApp({ sources: [] }), async url => {
    const res = await fetch(`${url}/api/buscar?precioMax=0&departamento=Montevideo`);
    assert.equal(res.status, 400);
    assert.match((await res.json()).error, /precioMax/);
  });
});
