/**
 * Criterios de búsqueda, filtros comunes y orquestación de las fuentes.
 */
const { DEPARTAMENTOS, slugify } = require('../js/localidades');
const { SourceUnavailable } = require('./http');

const TIPOS = ['casas', 'apartamentos', 'ambos'];
const MAX_TOLERANCIA = 50;

/**
 * Valida la query string y arma los criterios.
 * Lanza un Error con `status = 400` si algo no es válido.
 */
function parseCriteria(query) {
  const fail = msg => {
    throw Object.assign(new Error(msg), { status: 400 });
  };

  const precioMax = Number(query.precioMax);
  if (!(precioMax > 0)) fail('precioMax debe ser un número mayor a 0.');

  const tolerancia = query.tolerancia === undefined || query.tolerancia === '' ? 10 : Number(query.tolerancia);
  if (!(tolerancia >= 0 && tolerancia <= MAX_TOLERANCIA)) fail(`tolerancia debe estar entre 0 y ${MAX_TOLERANCIA}.`);

  const dormitorios = query.dormitorios === undefined || query.dormitorios === '' ? 0 : Number(query.dormitorios);
  if (!(Number.isInteger(dormitorios) && dormitorios >= 0)) fail('dormitorios debe ser un entero mayor o igual a 0.');

  const departamento = Object.keys(DEPARTAMENTOS).find(d => slugify(d) === slugify(String(query.departamento || '')));
  if (!departamento) fail('departamento no reconocido.');

  const pedidas = String(query.localidades || '').split(',').map(s => s.trim()).filter(Boolean);
  const localidades = pedidas.map(p => DEPARTAMENTOS[departamento].find(l => slugify(l) === slugify(p)));
  if (localidades.includes(undefined)) fail(`localidades no reconocidas para ${departamento}.`);

  const tipo = query.tipo || 'casas';
  if (!TIPOS.includes(tipo)) fail(`tipo debe ser uno de: ${TIPOS.join(', ')}.`);

  return {
    precioMin: Math.round(precioMax * (1 - tolerancia / 100)),
    precioMax: Math.round(precioMax * (1 + tolerancia / 100)),
    dormitorios,
    departamento,
    localidades,
    tipo,
  };
}

/** ¿El aviso cumple precio (USD), dormitorios y localidad? */
function matches(listing, criteria) {
  if (listing.moneda !== 'USD') return false;
  if (!(listing.precio >= criteria.precioMin && listing.precio <= criteria.precioMax)) return false;
  if (criteria.dormitorios > 0 && !(listing.dormitorios >= criteria.dormitorios)) return false;
  if (criteria.localidades.length > 0) {
    const lugar = slugify(listing.localidad || '');
    if (!criteria.localidades.some(l => lugar.includes(slugify(l)))) return false;
  }
  return true;
}

/**
 * Corre todas las fuentes en paralelo. Una fuente que falla no tumba la búsqueda:
 * queda reportada en `fuentes` con su error.
 */
async function runSearch(criteria, sources) {
  const settled = await Promise.allSettled(sources.map(s => s.search(criteria)));

  const fuentes = [];
  const vistos = new Set();
  const resultados = [];

  settled.forEach((r, i) => {
    const { nombre, sitio } = sources[i];
    if (r.status === 'rejected') {
      const estado = r.reason instanceof SourceUnavailable ? 'no-configurada' : 'error';
      fuentes.push({ nombre, sitio, estado, mensaje: r.reason.message });
      return;
    }
    const { avisos = [], enlace } = r.value;
    const validos = avisos.filter(a => matches(a, criteria) && !vistos.has(a.url));
    validos.forEach(a => vistos.add(a.url));
    resultados.push(...validos);
    fuentes.push({ nombre, sitio, estado: enlace && !avisos.length ? 'enlace' : 'ok', cantidad: validos.length, enlace });
  });

  resultados.sort((a, b) => a.precio - b.precio);
  return { criterios: criteria, resultados, fuentes };
}

module.exports = { parseCriteria, matches, runSearch };
