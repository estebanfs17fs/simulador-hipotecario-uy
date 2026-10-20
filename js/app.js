// ─── Estado ───────────────────────────────────────────────────────────────────

let exchangeRate = null;

const MAX_YEARS_LIMIT = 40;
const MAX_RATE_LIMIT = 30;

const SCENARIOS = {
  s1: {
    title: 'Cuota mínima',
    short: 'Mínima',
    desc: 'El plazo más largo cuya cuota no supera tu cuota mínima.',
  },
  s2: {
    title: 'Cuota máxima',
    short: 'Máxima',
    desc: 'El plazo más corto cuya cuota no supera tu cuota máxima. Es el que menos intereses paga.',
  },
  s3: {
    title: 'Óptimo: equilibrio',
    short: 'Óptimo',
    desc: 'El plazo más corto con una cuota hasta la mitad de tu rango: menos intereses sin llegar al tope.',
  },
};

// ─── Inicialización ───────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  initCurrencyToggle();
  initBankSelect();
  const saved = restoreState();
  applyUrlParams(Boolean(saved));
  initValidation();
  const form = document.getElementById('calcForm');
  form.addEventListener('submit', onCalculate);
  form.addEventListener('input', () => saveState());
  form.addEventListener('change', () => saveState());
  await loadQuotes();
  // Al volver de otra página se rehace la simulación que estaba calculada.
  if (saved?.calculated && validateAll()) onCalculate(null, { scroll: false });
});

async function loadQuotes() {
  const rateInput = document.getElementById('exchangeRate');
  const uiInput = document.getElementById('uiValue');
  const rateStatus = document.getElementById('rateStatus');
  const uiStatus = document.getElementById('uiStatus');

  rateInput.addEventListener('input', () => {
    exchangeRate = parseFloat(rateInput.value) || null;
  });

  // Lo que ya estaba cargado (simulación guardada) se respeta y no se pide de nuevo.
  const pending = [];
  if (rateInput.value !== '') {
    exchangeRate = parseFloat(rateInput.value) || null;
    rateStatus.innerHTML = '<span class="text-muted">Cotización que tenías cargada; podés editarla.</span>';
  } else {
    pending.push([rateInput, rateStatus]);
  }
  if (uiInput.value !== '') {
    uiStatus.innerHTML = '<span class="text-muted">Valor que tenías cargado; podés editarlo.</span>';
  } else {
    pending.push([uiInput, uiStatus]);
  }
  if (!pending.length) return;

  for (const [input, status] of pending) {
    status.innerHTML = '<span class="text-muted"><span class="spinner-border spinner-border-sm me-1"></span>Obteniendo cotización…</span>';
    input.disabled = true;
  }

  const { usd, ui } = await fetchQuotes();

  if (pending.some(([input]) => input === rateInput)) {
    if (usd) {
      exchangeRate = usd.valor;
      rateInput.value = usd.valor.toFixed(2);
      rateStatus.innerHTML = usd.fuente === 'BCU'
        ? `<span class="text-success">✓ Dólar billete del BCU al ${formatDate(usd.fecha)}; podés editarla.</span>`
        : '<span class="text-success">✓ Cotización de referencia del mercado (open.er-api.com). No es la oficial del BCU; podés editarla.</span>';
    } else {
      rateStatus.innerHTML = '<span class="text-warning">⚠ No se pudo obtener la cotización — ingresala manualmente.</span>';
    }
    rateInput.disabled = false;
  }
  if (pending.some(([input]) => input === uiInput)) {
    if (ui) {
      uiInput.value = ui.valor.toFixed(4);
      uiStatus.innerHTML = `<span class="text-success">✓ Valor del BCU al ${formatDate(ui.fecha)}; podés editarlo.</span>`;
    } else {
      uiStatus.innerHTML = '<span class="text-warning">⚠ No se pudo obtener el valor de la UI — ingresalo manualmente.</span>';
    }
    uiInput.disabled = false;
  }
  if (!usd && !rateInput.value) rateInput.focus();
  validateAll();
  saveState();
}

function getLoanCurrency() {
  return document.querySelector('input[name="loanCurrency"]:checked').value;
}

const CURRENCY_INPUTS = { USD: 'currencyUSD', UI: 'currencyUI', UYU: 'currencyUYU' };

function setLoanCurrency(currency) {
  document.getElementById(CURRENCY_INPUTS[currency]).checked = true;
  document.getElementById('uiValueGroup').classList.toggle('d-none', currency !== 'UI');
}

function initCurrencyToggle() {
  document.querySelectorAll('input[name="loanCurrency"]').forEach(el =>
    el.addEventListener('change', () => {
      track(`moneda/${getLoanCurrency()}`);
      document.getElementById('uiValueGroup').classList.toggle('d-none', getLoanCurrency() !== 'UI');
      validateAll();
    })
  );
}

/**
 * Precarga moneda, banco o tasa cuando se llega desde la página de financiamiento
 * (?banco=bbva&moneda=UI&tasa=3.69). Si había una simulación guardada, sus plazos
 * se mantienen y solo se ajustan al rango del banco.
 */
function applyUrlParams(hasSavedState) {
  const params = new URLSearchParams(window.location.search);
  const tasa = Number(params.get('tasa'));
  if (params.has('tasa') && tasa >= 0 && tasa <= MAX_RATE_LIMIT) {
    document.getElementById('interestRate').value = tasa.toFixed(2);
  }
  const moneda = params.get('moneda');
  if (CURRENCY_INPUTS[moneda]) setLoanCurrency(moneda);
  const banco = params.get('banco');
  if (banco) selectBank(banco, hasSavedState ? 'clamp' : 'load');
  if (params.toString()) history.replaceState(null, '', window.location.pathname);
}

// ─── Simulación guardada ──────────────────────────────────────────────────────
// Se guarda en sessionStorage (solo esta pestaña) para no perder el formulario ni
// los resultados al ir a la página de financiamiento y volver.

const STATE_KEY = 'simuladorHipotecario';
const STATE_FIELDS = ['propertyPrice', 'downPayment', 'exchangeRate', 'uiValue', 'interestRate', 'minYears', 'maxYears', 'minPayment', 'maxPayment'];
let simulationCalculated = false;

function saveState() {
  const state = {
    currency: getLoanCurrency(),
    bank: document.getElementById('bankSelect').value,
    calculated: simulationCalculated,
  };
  STATE_FIELDS.forEach(id => { state[id] = document.getElementById(id).value; });
  try {
    sessionStorage.setItem(STATE_KEY, JSON.stringify(state));
  } catch {
    // Sin almacenamiento disponible: la simulación no se recuerda.
  }
}

/** Carga la simulación guardada en el formulario. Devuelve el estado o null. */
function restoreState() {
  let state = null;
  try {
    state = JSON.parse(sessionStorage.getItem(STATE_KEY));
  } catch {
    return null;
  }
  if (!state) return null;
  STATE_FIELDS.forEach(id => {
    if (typeof state[id] === 'string') document.getElementById(id).value = state[id];
  });
  if (CURRENCY_INPUTS[state.currency]) setLoanCurrency(state.currency);
  if (state.bank) selectBank(state.bank, 'clamp');
  simulationCalculated = Boolean(state.calculated);
  return state;
}

// ─── Cálculo principal ────────────────────────────────────────────────────────

function onCalculate(e, { scroll = true } = {}) {
  if (e) e.preventDefault();
  if (!validateAll()) {
    if (e) {
      track('calcular/incompleto');
      revealFormErrors();
    }
    return;
  }
  // Solo cuenta los cálculos que pide el usuario, no el que se rehace al volver.
  if (e) track(`calcular/${getLoanCurrency()}/${document.getElementById('bankSelect').value || 'sin-banco'}`);

  const { price, rate, downPayment, minYears, maxYears, minPayment, maxPayment, xRate, currency, uiValue } = getInputs();
  const principalUSD = price - downPayment;
  const { principal, unitValueUYU } = toLoanCurrency(principalUSD, currency, xRate, uiValue);

  const s1 = findScenarioMinQuota(principal, rate, minPayment, unitValueUYU, minYears, maxYears);
  const s2 = findScenarioMaxQuota(principal, rate, maxPayment, unitValueUYU, minYears, maxYears);
  const s3 = findOptimalScenario(principal, rate, minPayment, maxPayment, unitValueUYU, minYears, maxYears);

  const infeasible = {
    s1: explainInfeasible(principal, rate, minPayment, unitValueUYU, maxYears),
    s2: explainInfeasible(principal, rate, maxPayment, unitValueUYU, maxYears),
    s3: explainInfeasible(principal, rate, (minPayment + maxPayment) / 2, unitValueUYU, maxYears),
  };

  renderSummary(price, downPayment, principalUSD, xRate, currency, principal);
  renderScenario('s1', s1, infeasible.s1, 'tu cuota mínima', currency);
  renderScenario('s2', s2, infeasible.s2, 'tu cuota máxima', currency);
  renderScenario('s3', s3, infeasible.s3, 'la cuota de equilibrio (mitad de tu rango)', currency);

  const rates = [rate * 0.8, rate, rate * 1.2].map(r => +r.toFixed(2));
  document.getElementById('scenariosNote').textContent = `Con tu tasa de ${formatPercent(rate)} y plazos de ${minYears} a ${maxYears} años`;
  renderChart(generateChartData(principal, rates, minYears, maxYears, unitValueUYU), {
    mainIndex: 1,
    band: { min: minPayment, max: maxPayment },
    points: Object.entries({ s1, s2, s3 })
      .filter(([, r]) => r)
      .map(([id, r]) => ({ years: r.years, payment: r.monthlyPaymentUYU, label: SCENARIOS[id].short })),
  });

  renderBankCompare(principalUSD, maxYears, currency, xRate);

  showPropertySearch(calculateMaxPropertyPrice(downPayment, maxPayment, rate, maxYears, unitValueUYU, xRate));

  document.getElementById('results').classList.remove('d-none');
  document.getElementById('placeholder').classList.add('d-none');
  document.getElementById('ratesTeaser').classList.add('d-none');
  simulationCalculated = true;
  saveState();
  if (scroll) document.getElementById('results').scrollIntoView({ behavior: 'smooth' });
}

function readNumber(id) {
  const raw = document.getElementById(id).value;
  return raw === '' ? NaN : Number(raw);
}

function getInputs() {
  return {
    xRate: readNumber('exchangeRate'),
    price: readNumber('propertyPrice'),
    downPayment: readNumber('downPayment'),
    rate: readNumber('interestRate'),
    minYears: readNumber('minYears'),
    maxYears: readNumber('maxYears'),
    minPayment: readNumber('minPayment'),
    maxPayment: readNumber('maxPayment'),
    currency: getLoanCurrency(),
    uiValue: readNumber('uiValue'),
  };
}

// ─── Renderizado ─────────────────────────────────────────────────────────────

function renderSummary(price, downPayment, principalUSD, xRate, currency, principal) {
  const figure = (id, main, sub) => {
    const el = document.getElementById(id);
    el.replaceChildren();
    const value = document.createElement('span');
    value.className = 'kpi-value';
    value.textContent = main;
    const note = document.createElement('span');
    note.className = 'kpi-sub';
    note.textContent = sub;
    el.append(value, note);
  };
  figure('summaryPrice', formatUSD(price), formatUYU(convertUSDtoUYU(price, xRate)));
  figure('summaryDown', formatUSD(downPayment), formatUYU(convertUSDtoUYU(downPayment, xRate)));
  const loanUYU = formatUYU(convertUSDtoUYU(principalUSD, xRate));
  figure('summaryLoan', formatUSD(principalUSD), currency === 'UI' ? `${formatUI(principal)} · ${loanUYU}` : loanUYU);
}

function renderScenario(id, result, infeasible, budgetLabel, currency) {
  const { title, desc } = SCENARIOS[id];
  const card = document.getElementById(id);
  card.querySelector('.scenario-title').textContent = title;
  card.querySelector('.scenario-desc').textContent = desc;
  card.dataset.feasible = String(Boolean(result));

  if (!result) {
    const msg = infeasible
      ? `Con el plazo máximo de ${formatYears(infeasible.maxYears)} la cuota sería ${formatUYU(infeasible.neededUYU)}, ` +
        `${formatUYU(infeasible.shortfallUYU)} más que ${budgetLabel} (${formatUYU(infeasible.budgetUYU)}). ` +
        'Probá con un plazo máximo mayor, más aporte inicial o una cuota más alta.'
      : 'No es posible financiar el préstamo con estos parámetros.';
    card.querySelector('.scenario-body').innerHTML = '<p class="scenario-none"><strong>No alcanza</strong><span></span></p>';
    card.querySelector('.scenario-none span').textContent = msg;
    return;
  }

  const fmt = amount => formatLoanCurrency(amount, currency);
  const uyuNote = currency === 'UI' ? ' (valor de hoy)' : '';
  // En pesos el monto ya está en UYU; en las otras monedas se agrega su valor en pesos.
  const inUYU = amountUYU => currency === 'UYU' ? '' : `<small>${formatUYU(amountUYU)}${uyuNote}</small>`;
  card.querySelector('.scenario-body').innerHTML = `
    <div class="scenario-term">Plazo <strong>${formatYears(result.years)}</strong></div>
    <div class="scenario-figure">${fmt(result.monthlyPayment)}</div>
    <div class="scenario-sub">por mes${currency === 'UYU' ? '' : ' · ' + formatUYU(result.monthlyPaymentUYU) + uyuNote}</div>
    <dl class="scenario-rows">
      <div><dt>Total intereses</dt><dd>${fmt(result.totalInterest)}${inUYU(result.totalInterestUYU)}</dd></div>
      <div class="is-total"><dt>Total a pagar</dt><dd>${fmt(result.totalPayment)}${inUYU(result.totalPaymentUYU)}</dd></div>
    </dl>`;
}

function formatPercent(rate) {
  return rate.toLocaleString('es-UY', { maximumFractionDigits: 2 }) + ' %';
}

// ─── Validación en tiempo real ────────────────────────────────────────────────
// Los nombres de los campos y los textos están en js/validacion.js.

// Un campo vacío se marca en rojo recién cuando el usuario lo dejó o intentó calcular.
const touchedFields = new Set();
let submitAttempted = false;

function initValidation() {
  FORM_FIELDS.forEach(({ id }) => {
    const el = document.getElementById(id);
    el.addEventListener('input', validateAll);
    el.addEventListener('blur', () => {
      touchedFields.add(id);
      validateAll();
    });
  });
  validateAll();
}

/**
 * Marca los campos inválidos o vacíos y dice cuáles faltan para calcular.
 * El botón "Calcular" queda siempre habilitado: si falta algo, al tocarlo se
 * marcan los campos y se lleva el foco al primero.
 */
function validateAll() {
  // Con un banco elegido, primero se carga su tasa para validar con ella.
  const bankErrors = syncBank(getInputs());
  const v = getInputs();
  const filled = n => !isNaN(n);
  const isInt = n => Number.isInteger(n);

  const checks = [
    ['propertyPrice', filled(v.price) && v.price <= 0, 'Debe ser mayor a 0.'],
    ['downPayment', filled(v.downPayment) && v.downPayment < 0, 'No puede ser negativo.'],
    ['downPayment', filled(v.downPayment) && filled(v.price) && v.price > 0 && v.downPayment >= v.price, 'Debe ser menor al precio de la propiedad.'],
    ['exchangeRate', filled(v.xRate) && v.xRate <= 0, 'Debe ser mayor a 0.'],
    ['uiValue', v.currency === 'UI' && filled(v.uiValue) && v.uiValue <= 0, 'Debe ser mayor a 0.'],
    ['interestRate', filled(v.rate) && (v.rate < 0 || v.rate > MAX_RATE_LIMIT), `Debe estar entre 0 y ${MAX_RATE_LIMIT} %.`],
    ['minYears', filled(v.minYears) && (!isInt(v.minYears) || v.minYears < 1), 'Debe ser un número entero de al menos 1 año.'],
    ['maxYears', filled(v.maxYears) && (!isInt(v.maxYears) || v.maxYears > MAX_YEARS_LIMIT), `Debe ser un número entero de hasta ${MAX_YEARS_LIMIT} años.`],
    ['maxYears', filled(v.maxYears) && filled(v.minYears) && v.minYears >= 1 && v.maxYears <= v.minYears, 'Debe ser mayor al plazo mínimo.'],
    ['minPayment', filled(v.minPayment) && v.minPayment <= 0, 'Debe ser mayor a 0.'],
    ['maxPayment', filled(v.maxPayment) && filled(v.minPayment) && v.minPayment > 0 && v.maxPayment <= v.minPayment, 'Debe ser mayor a la cuota mínima.'],
  ];

  const errors = {};
  checks.forEach(([id, failed, msg]) => {
    if (failed && !errors[id]) errors[id] = msg;
  });
  Object.entries(bankErrors).forEach(([field, msg]) => {
    const id = field === 'bank' ? 'bankSelect' : field;
    if (!errors[id]) errors[id] = msg;
  });

  const missing = findMissingFields(v);
  const invalid = FORM_FIELDS.map(f => f.id).filter(id => errors[id]);
  const shown = { ...errors };
  missing.forEach(id => {
    if (submitAttempted || touchedFields.has(id)) shown[id] = MISSING_MSG;
  });
  FORM_FIELDS.forEach(({ id }) => setFieldError(id, shown[id]));

  const valid = missing.length === 0 && invalid.length === 0;
  const hint = document.getElementById('formHint');
  hint.textContent = formHintText(missing, invalid);
  hint.classList.toggle('text-danger', submitAttempted && !valid);
  hint.classList.toggle('text-muted', !(submitAttempted && !valid));
  return valid;
}

/** Marca todo lo que falta o está mal y lleva el foco al primer campo con problema. */
function revealFormErrors() {
  submitAttempted = true;
  validateAll();
  const first = FORM_FIELDS.map(f => document.getElementById(f.id)).find(el => el.classList.contains('is-invalid'));
  if (!first) return;
  first.scrollIntoView({ behavior: 'smooth', block: 'center' });
  first.focus({ preventScroll: true });
}

function setFieldError(id, msg) {
  const el = document.getElementById(id);
  const fb = el.parentElement.querySelector('.invalid-feedback');
  el.classList.toggle('is-invalid', Boolean(msg));
  el.setAttribute('aria-invalid', msg ? 'true' : 'false');
  if (!fb) return;
  fb.id = `${id}Feedback`;
  fb.textContent = msg || '';
  if (msg) el.setAttribute('aria-describedby', fb.id);
  else el.removeAttribute('aria-describedby');
}
