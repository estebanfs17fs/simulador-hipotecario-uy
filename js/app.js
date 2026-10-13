// ─── Estado ───────────────────────────────────────────────────────────────────

let exchangeRate = null;

// ─── Inicialización ───────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  initValidation();
  await loadExchangeRate();
  document.getElementById('calcForm').addEventListener('submit', onCalculate);
});

async function loadExchangeRate() {
  const rateInput = document.getElementById('exchangeRate');
  const rateStatus = document.getElementById('rateStatus');

  rateStatus.innerHTML = '<span class="text-muted"><span class="spinner-border spinner-border-sm me-1"></span>Obteniendo cotización…</span>';
  rateInput.disabled = true;

  const rate = await fetchExchangeRate();

  if (rate !== null) {
    exchangeRate = rate;
    rateInput.value = rate.toFixed(2);
    rateStatus.innerHTML = `<span class="text-success">✓ Cotización actualizada (BCU/Open ER)</span>`;
    rateInput.disabled = false;
  } else {
    rateStatus.innerHTML = `<span class="text-warning">⚠ API no disponible — ingresá la cotización manualmente</span>`;
    rateInput.disabled = false;
    rateInput.focus();
  }

  rateInput.addEventListener('input', () => {
    exchangeRate = parseFloat(rateInput.value) || null;
  });
}

// ─── Cálculo principal ────────────────────────────────────────────────────────

function onCalculate(e) {
  e.preventDefault();

  const inputs = getInputs();
  if (!inputs) return;

  const { price, rate, downPayment, minYears, maxYears, minPayment, maxPayment, xRate } = inputs;
  const principal = price - downPayment;

  if (principal <= 0) {
    showGlobalError('El aporte inicial debe ser menor al precio de la propiedad.');
    return;
  }

  const s1 = findScenarioMinQuota(principal, rate, minPayment, xRate, minYears, maxYears);
  const s2 = findScenarioMaxQuota(principal, rate, maxPayment, xRate, minYears, maxYears);
  const s3 = findOptimalScenario(principal, rate, minPayment, maxPayment, xRate, minYears, maxYears);

  renderSummary(price, downPayment, principal, xRate);
  renderScenario('s1', s1, 'Cuota Mínima — Plazo Extendido', 'primary');
  renderScenario('s2', s2, 'Cuota Máxima — Plazo Mínimo', 'success');
  renderScenario('s3', s3, 'Escenario Óptimo', 'warning');

  const chartData = generateChartData(principal, [rate * 0.8, rate, rate * 1.2].map(r => +r.toFixed(2)), minYears, maxYears, xRate);
  renderChart(chartData);

  document.getElementById('results').classList.remove('d-none');
  document.getElementById('placeholder').classList.add('d-none');
  document.getElementById('results').scrollIntoView({ behavior: 'smooth' });
}

function getInputs() {
  const xRate = parseFloat(document.getElementById('exchangeRate').value);
  const price = parseFloat(document.getElementById('propertyPrice').value);
  const downPayment = parseFloat(document.getElementById('downPayment').value);
  const rate = parseFloat(document.getElementById('interestRate').value);
  const minYears = parseInt(document.getElementById('minYears').value);
  const maxYears = parseInt(document.getElementById('maxYears').value);
  const minPayment = parseFloat(document.getElementById('minPayment').value);
  const maxPayment = parseFloat(document.getElementById('maxPayment').value);

  if ([xRate, price, downPayment, rate, minYears, maxYears, minPayment, maxPayment].some(v => isNaN(v) || v < 0)) {
    showGlobalError('Completá todos los campos con valores válidos.');
    return null;
  }
  return { price, rate, downPayment, minYears, maxYears, minPayment, maxPayment, xRate };
}

// ─── Renderizado ─────────────────────────────────────────────────────────────

function renderSummary(price, downPayment, principal, xRate) {
  document.getElementById('summaryPrice').textContent = formatUSD(price) + ' / ' + formatUYU(convertUSDtoUYU(price, xRate));
  document.getElementById('summaryDown').textContent = formatUSD(downPayment) + ' / ' + formatUYU(convertUSDtoUYU(downPayment, xRate));
  document.getElementById('summaryLoan').textContent = formatUSD(principal) + ' / ' + formatUYU(convertUSDtoUYU(principal, xRate));
}

function renderScenario(id, result, title, color) {
  const card = document.getElementById(id);
  card.querySelector('.card-title').textContent = title;
  card.className = `card h-100 border-${color}`;
  card.querySelector('.card-header').className = `card-header bg-${color} ${color === 'warning' ? 'text-dark' : 'text-white'}`;

  if (!result) {
    card.querySelector('.scenario-body').innerHTML =
      `<div class="alert alert-danger mb-0">No es posible financiar el préstamo con estos parámetros.</div>`;
    return;
  }

  card.querySelector('.scenario-body').innerHTML = `
    <table class="table table-sm mb-0">
      <tbody>
        <tr><th>Plazo</th><td>${formatYears(result.years)}</td></tr>
        <tr><th>Cuota mensual</th><td>${formatUSD(result.monthlyPaymentUSD)}<br><small class="text-muted">${formatUYU(result.monthlyPaymentUYU)}</small></td></tr>
        <tr><th>Total intereses</th><td>${formatUSD(result.totalInterestUSD)}<br><small class="text-muted">${formatUYU(result.totalInterestUYU)}</small></td></tr>
        <tr class="table-${color === 'warning' ? 'warning' : color === 'success' ? 'success' : 'primary'}">
          <th>Total a pagar</th><td>${formatUSD(result.totalPaymentUSD)}<br><small>${formatUYU(result.totalPaymentUYU)}</small></td>
        </tr>
      </tbody>
    </table>`;
}

function showGlobalError(msg) {
  const el = document.getElementById('globalError');
  el.textContent = msg;
  el.classList.remove('d-none');
  setTimeout(() => el.classList.add('d-none'), 5000);
}

// ─── Validación en tiempo real ────────────────────────────────────────────────

function initValidation() {
  const fields = ['propertyPrice', 'downPayment', 'exchangeRate', 'interestRate', 'minYears', 'maxYears', 'minPayment', 'maxPayment'];
  fields.forEach(id => document.getElementById(id).addEventListener('input', validateAll));
}

function validateAll() {
  const price = parseFloat(document.getElementById('propertyPrice').value) || 0;
  const down = parseFloat(document.getElementById('downPayment').value) || 0;
  const minY = parseInt(document.getElementById('minYears').value) || 0;
  const maxY = parseInt(document.getElementById('maxYears').value) || 0;
  const minP = parseFloat(document.getElementById('minPayment').value) || 0;
  const maxP = parseFloat(document.getElementById('maxPayment').value) || 0;

  setFieldError('downPayment', down >= price && price > 0, 'Debe ser menor al precio de la propiedad.');
  setFieldError('maxYears', maxY <= minY && minY > 0, 'Debe ser mayor al plazo mínimo.');
  setFieldError('maxPayment', maxP <= minP && minP > 0, 'Debe ser mayor a la cuota mínima.');

  const hasError = document.querySelectorAll('.is-invalid').length > 0;
  document.getElementById('btnCalcular').disabled = hasError;
}

function setFieldError(id, condition, msg) {
  const el = document.getElementById(id);
  const fb = el.nextElementSibling;
  if (condition) {
    el.classList.add('is-invalid');
    if (fb && fb.classList.contains('invalid-feedback')) fb.textContent = msg;
  } else {
    el.classList.remove('is-invalid');
  }
}
