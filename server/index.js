/**
 * Backend de búsqueda de propiedades.
 * GET /api/buscar?precioMax=150000&tolerancia=10&dormitorios=2&departamento=Montevideo&localidades=Pocitos,Prado&tipo=casas
 */
const express = require('express');
const { parseCriteria, runSearch } = require('./search');
const SOURCES = [
  require('./sources/mercadolibre'),
  require('./sources/gallito'),
  require('./sources/infocasas'),
];

function createApp({ sources = SOURCES, allowedOrigin = process.env.ALLOWED_ORIGIN || '*' } = {}) {
  const app = express();

  app.use((req, res, next) => {
    res.set('Access-Control-Allow-Origin', allowedOrigin);
    next();
  });

  app.get('/api/salud', (req, res) => res.json({ ok: true }));

  app.get('/api/fuentes', (req, res) => res.json(sources.map(({ nombre, sitio }) => ({ nombre, sitio }))));

  app.get('/api/buscar', async (req, res, next) => {
    try {
      res.json(await runSearch(parseCriteria(req.query), sources));
    } catch (err) {
      next(err);
    }
  });

  app.use((err, req, res, next) => {
    const status = err.status || 500;
    if (status === 500) console.error(err);
    res.status(status).json({ error: status === 500 ? 'Error interno.' : err.message });
  });

  return app;
}

if (require.main === module) {
  const port = Number(process.env.PORT) || 3000;
  createApp().listen(port, () => console.log(`Backend escuchando en http://localhost:${port}`));
}

module.exports = { createApp };
