const EXCHANGE_API_URL = 'https://open.er-api.com/v6/latest/USD';
// Lo genera scripts/cotizaciones.js con datos del BCU cada vez que se publica el sitio.
const QUOTES_URL = 'data/cotizaciones.json';
const TIMEOUT_MS = 5000;

async function fetchJSONWithTimeout(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS), cache: 'no-cache' });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Dólar y Unidad Indexada. Primero se usan los del BCU publicados con el sitio;
 * si no están (por ejemplo en desarrollo), el dólar sale de open.er-api.com y la
 * UI queda en null para que la persona la cargue.
 * → { usd: { valor, fecha, fuente } | null, ui: { valor, fecha, fuente } | null }
 */
async function fetchQuotes() {
  const bcu = await fetchJSONWithTimeout(QUOTES_URL);
  const fromBcu = q => (q?.valor > 0 ? { valor: q.valor, fecha: q.fecha, fuente: 'BCU' } : null);
  const quotes = { usd: fromBcu(bcu?.usd), ui: fromBcu(bcu?.ui) };
  if (!quotes.usd) {
    const rate = (await fetchJSONWithTimeout(EXCHANGE_API_URL))?.rates?.UYU;
    if (rate > 0) quotes.usd = { valor: rate, fecha: null, fuente: 'open.er-api.com' };
  }
  return quotes;
}

/** "2026-10-19" → "19/10/2026" */
function formatDate(iso) {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function formatUYU(amount) {
  return '$ ' + amount.toLocaleString('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatUSD(amount) {
  return 'US$ ' + amount.toLocaleString('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatUI(amount) {
  return 'UI ' + amount.toLocaleString('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatLoanCurrency(amount, currency) {
  if (currency === 'UI') return formatUI(amount);
  if (currency === 'UYU') return formatUYU(amount);
  return formatUSD(amount);
}

function formatYears(years) {
  return years === 1 ? '1 año' : `${years} años`;
}
