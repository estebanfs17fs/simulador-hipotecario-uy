/**
 * Cliente HTTP compartido por las fuentes: identifica al bot, corta por tiempo
 * y guarda las respuestas en memoria un rato para no repetir pedidos.
 */
const USER_AGENT = 'SimuladorHipotecarioUY/1.0 (+https://github.com/estebanfs17fs/simulador-hipotecario-uy)';
const TIMEOUT_MS = 10000;
const CACHE_TTL_MS = 15 * 60 * 1000;

const cache = new Map();

class SourceUnavailable extends Error {}

async function fetchText(url, { headers = {}, fetchImpl = fetch } = {}) {
  const hit = cache.get(url);
  if (hit && hit.expires > Date.now()) return hit.body;

  const res = await fetchImpl(url, {
    headers: { 'User-Agent': USER_AGENT, ...headers },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} en ${new URL(url).host}`);
  const body = await res.text();
  cache.set(url, { body, expires: Date.now() + CACHE_TTL_MS });
  return body;
}

async function fetchJSON(url, options) {
  return JSON.parse(await fetchText(url, options));
}

function clearCache() {
  cache.clear();
}

module.exports = { fetchText, fetchJSON, clearCache, SourceUnavailable, USER_AGENT };
