const EXCHANGE_API_URL = 'https://open.er-api.com/v6/latest/USD';
const TIMEOUT_MS = 5000;

async function fetchExchangeRate() {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const res = await fetch(EXCHANGE_API_URL, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = await res.json();
    return data?.rates?.UYU ?? null;
  } catch {
    return null;
  }
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
  return currency === 'UI' ? formatUI(amount) : formatUSD(amount);
}

function formatYears(years) {
  return years === 1 ? '1 año' : `${years} años`;
}
