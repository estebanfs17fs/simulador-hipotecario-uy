/**
 * Mercado Libre Uruguay, por su API oficial (api.mercadolibre.com). No se
 * scrapea el sitio: su robots.txt no permite bots genéricos. La búsqueda de la
 * API pide un access token de una app registrada en developers.mercadolibre.com.uy,
 * que se pasa en la variable de entorno MELI_ACCESS_TOKEN.
 */
const { fetchJSON, SourceUnavailable } = require('../http');
const { slugify } = require('../../js/localidades');

const API = 'https://api.mercadolibre.com';
const SITE = 'MLU';
const INMUEBLES = 'MLU1459';
const PAGE_SIZE = 50;
const MAX_PAGES = 4;

const TIPOS = { casas: ['casas'], apartamentos: ['apartamentos'], ambos: ['casas', 'apartamentos'] };

/** Busca, dentro de Inmuebles, la categoría "<Tipo> › Venta" por nombre. */
async function findCategory(tipo, opts) {
  const inmuebles = await fetchJSON(`${API}/categories/${INMUEBLES}`, opts);
  const cat = inmuebles.children_categories.find(c => slugify(c.name) === tipo);
  if (!cat) throw new Error(`Mercado Libre no tiene la categoría ${tipo}.`);
  const detalle = await fetchJSON(`${API}/categories/${cat.id}`, opts);
  const venta = (detalle.children_categories || []).find(c => slugify(c.name) === 'venta');
  return (venta || cat).id;
}

async function findState(departamento, opts) {
  const pais = await fetchJSON(`${API}/classified_locations/countries/UY`, opts);
  const state = pais.states.find(s => slugify(s.name) === slugify(departamento));
  if (!state) throw new Error(`Mercado Libre no reconoce el departamento ${departamento}.`);
  return state.id;
}

function attribute(item, id) {
  const attr = (item.attributes || []).find(a => a.id === id);
  return attr ? attr.value_name : null;
}

function toListing(item, departamento) {
  const loc = item.location || {};
  const lugar = [loc.neighborhood && loc.neighborhood.name, loc.city && loc.city.name].filter(Boolean).join(', ');
  const dorm = parseInt(attribute(item, 'BEDROOMS'), 10);
  return {
    fuente: 'Mercado Libre',
    titulo: item.title,
    precio: item.price,
    moneda: item.currency_id,
    dormitorios: Number.isNaN(dorm) ? null : dorm,
    departamento,
    localidad: lugar || (loc.address_line || ''),
    url: item.permalink,
    imagen: item.thumbnail || null,
  };
}

async function search(criteria, { fetchImpl, token = process.env.MELI_ACCESS_TOKEN } = {}) {
  if (!token) throw new SourceUnavailable('Falta configurar MELI_ACCESS_TOKEN en el backend.');
  const opts = { fetchImpl, headers: { Authorization: `Bearer ${token}` } };

  const state = await findState(criteria.departamento, opts);
  const avisos = [];
  for (const tipo of TIPOS[criteria.tipo]) {
    const category = await findCategory(tipo, opts);
    for (let page = 0; page < MAX_PAGES; page++) {
      const params = new URLSearchParams({
        category,
        state,
        price: `${criteria.precioMin}-${criteria.precioMax}`,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      });
      const data = await fetchJSON(`${API}/sites/${SITE}/search?${params}`, opts);
      avisos.push(...data.results.map(item => toListing(item, criteria.departamento)));
      if ((page + 1) * PAGE_SIZE >= data.paging.total) break;
    }
  }
  // Precio, dormitorios y localidad se vuelven a filtrar en search.js.
  return { avisos };
}

module.exports = { nombre: 'Mercado Libre', sitio: 'https://www.mercadolibre.com.uy', search, toListing };
