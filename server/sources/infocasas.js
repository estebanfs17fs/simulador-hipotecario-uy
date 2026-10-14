/**
 * InfoCasas (infocasas.com.uy). Sus términos (cláusula 16.2, "Prohibición de
 * Extracción Automatizada") prohíben robots, spiders y scrapers sin autorización
 * escrita, así que no leemos su sitio: solo armamos el enlace a su buscador para
 * que la persona lo abra. Si InfoCasas da acceso o una API, este es el lugar
 * para integrarla.
 */
const { slugify } = require('../../js/localidades');

const BASE_URL = 'https://www.infocasas.com.uy';
const TIPOS = { casas: 'casas', apartamentos: 'apartamentos', ambos: 'inmuebles' };

function buildLink(criteria) {
  const lugar = criteria.localidades.length === 1 ? '/' + slugify(criteria.localidades[0]) : '';
  return `${BASE_URL}/venta/${TIPOS[criteria.tipo]}/${slugify(criteria.departamento)}${lugar}`;
}

async function search(criteria) {
  return { avisos: [], enlace: buildLink(criteria) };
}

module.exports = { nombre: 'InfoCasas', sitio: BASE_URL, search, buildLink };
