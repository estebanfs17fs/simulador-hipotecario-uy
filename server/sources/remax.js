/**
 * RE/MAX Uruguay (remax.com.uy). Su robots.txt solo bloquea `*?associate` y sus
 * términos no mencionan el acceso automatizado. Pero el listado se carga con
 * JavaScript desde una API interna que no está documentada, así que por ahora
 * solo armamos el enlace a su buscador por tipo y ciudad.
 */
const { slugify } = require('../../js/localidades');

const BASE_URL = 'https://www.remax.com.uy';
// RE/MAX no tiene una página para casas y apartamentos juntos: "ambos" abre casas.
const TIPOS = { casas: 'casas', apartamentos: 'apartamentos', ambos: 'casas' };

function buildLink(criteria) {
  const lugar = criteria.localidades.length === 1 ? criteria.localidades[0] : criteria.departamento;
  return `${BASE_URL}/${TIPOS[criteria.tipo]}-en-venta-en-${slugify(lugar)}`;
}

async function search(criteria) {
  return { avisos: [], enlace: buildLink(criteria) };
}

module.exports = { nombre: 'RE/MAX', sitio: BASE_URL, search, buildLink };
