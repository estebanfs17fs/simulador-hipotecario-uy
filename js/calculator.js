/**
 * Módulo de cálculo hipotecario — funciones puras y testeables.
 * Sistema de amortización francés (cuota fija).
 * Ver SPEC.md sección 2 para criterios de aceptación.
 */

function convertUSDtoUYU(amountUSD, exchangeRate) {
  return amountUSD * exchangeRate;
}

function convertUYUtoUSD(amountUYU, exchangeRate) {
  return amountUYU / exchangeRate;
}

/**
 * Cuota mensual fija (sistema francés).
 * M = P * [r(1+r)^n] / [(1+r)^n - 1]
 */
function calculateMonthlyPayment(principal, annualRate, years) {
  if (principal === 0 || years === 0) return 0;
  const n = years * 12;
  if (annualRate === 0) return principal / n;
  const r = annualRate / 100 / 12;
  const factor = Math.pow(1 + r, n);
  return principal * (r * factor) / (factor - 1);
}

function calculateTotalInterest(principal, monthlyPayment, years) {
  return Math.max(0, monthlyPayment * years * 12 - principal);
}

/**
 * Arma un ScenarioResult. Los montos sin sufijo están en la moneda del préstamo
 * (USD o UI); `exchangeRate` son los pesos que vale una unidad de esa moneda.
 */
function _buildResult(principal, annualRate, years, exchangeRate) {
  const monthlyPayment = calculateMonthlyPayment(principal, annualRate, years);
  const totalInterest = calculateTotalInterest(principal, monthlyPayment, years);
  return {
    years,
    monthlyPayment,
    monthlyPaymentUYU: convertUSDtoUYU(monthlyPayment, exchangeRate),
    totalInterest,
    totalInterestUYU: convertUSDtoUYU(totalInterest, exchangeRate),
    totalPayment: principal + totalInterest,
    totalPaymentUYU: convertUSDtoUYU(principal + totalInterest, exchangeRate),
  };
}

/**
 * Escenario 1: usa la cuota mínima del usuario, busca el plazo más largo posible
 * dentro del rango donde la cuota calculada no supere dicho mínimo.
 */
function findScenarioMinQuota(principal, annualRate, minPaymentUYU, exchangeRate, minYears, maxYears) {
  const maxAffordable = convertUYUtoUSD(minPaymentUYU, exchangeRate);
  for (let year = maxYears; year >= minYears; year--) {
    const cuota = calculateMonthlyPayment(principal, annualRate, year);
    if (cuota <= maxAffordable) {
      return _buildResult(principal, annualRate, year, exchangeRate);
    }
  }
  return null;
}

/**
 * Escenario 2: usa la cuota máxima del usuario, busca el plazo más corto posible
 * dentro del rango donde la cuota calculada no supere dicho máximo.
 */
function findScenarioMaxQuota(principal, annualRate, maxPaymentUYU, exchangeRate, minYears, maxYears) {
  const maxAffordable = convertUYUtoUSD(maxPaymentUYU, exchangeRate);
  for (let year = minYears; year <= maxYears; year++) {
    const cuota = calculateMonthlyPayment(principal, annualRate, year);
    if (cuota <= maxAffordable) {
      return _buildResult(principal, annualRate, year, exchangeRate);
    }
  }
  return null;
}

/**
 * Escenario 3: equilibrio entre el presupuesto mínimo y máximo.
 * Toma como tope la cuota del punto medio del rango [mínima, máxima] y busca el
 * plazo más corto cuya cuota no lo supere. Al ser el plazo más corto posible con
 * ese tope, es el que minimiza los intereses dejando margen en el presupuesto.
 * Si la cuota del plazo mínimo ya queda por debajo del tope, usa el plazo mínimo.
 */
function findOptimalScenario(principal, annualRate, minPaymentUYU, maxPaymentUYU, exchangeRate, minYears, maxYears) {
  const midPaymentUYU = (minPaymentUYU + maxPaymentUYU) / 2;
  return findScenarioMaxQuota(principal, annualRate, midPaymentUYU, exchangeRate, minYears, maxYears);
}

/**
 * Explica por qué un escenario no es viable (CA-04).
 * Retorna null si el presupuesto alcanza dentro del rango de plazos.
 */
function explainInfeasible(principal, annualRate, budgetUYU, exchangeRate, maxYears) {
  const neededUYU = convertUSDtoUYU(calculateMonthlyPayment(principal, annualRate, maxYears), exchangeRate);
  if (neededUYU <= budgetUYU) return null;
  return { maxYears, neededUYU, budgetUYU, shortfallUYU: neededUYU - budgetUYU };
}

/**
 * Pasa el préstamo de USD a la moneda en que se otorga.
 * USD: queda igual. UI: USD → UYU con la cotización y UYU → UI con el valor de la UI.
 * Retorna también `unitValueUYU`, los pesos que vale una unidad de esa moneda hoy.
 */
function toLoanCurrency(principalUSD, currency, exchangeRate, uiValue) {
  if (currency === 'UI') {
    return { principal: principalUSD * exchangeRate / uiValue, unitValueUYU: uiValue };
  }
  return { principal: principalUSD, unitValueUYU: exchangeRate };
}

/**
 * Inversa de la cuota (sistema francés): el capital máximo que se paga con una
 * cuota mensual dada. P = M * [(1+r)^n - 1] / [r(1+r)^n]
 */
function calculateMaxPrincipal(monthlyPayment, annualRate, years) {
  if (monthlyPayment <= 0 || years <= 0) return 0;
  const n = years * 12;
  if (annualRate === 0) return monthlyPayment * n;
  const r = annualRate / 100 / 12;
  const factor = Math.pow(1 + r, n);
  return monthlyPayment * (factor - 1) / (r * factor);
}

/**
 * Precio máximo de propiedad (USD) que se puede comprar con el aporte inicial y
 * la cuota máxima en pesos, al plazo máximo. Es el tope sugerido para buscar casas.
 * `unitValueUYU` son los pesos que vale una unidad de la moneda del préstamo y
 * `exchangeRate` los pesos por dólar.
 */
function calculateMaxPropertyPrice(downPaymentUSD, maxPaymentUYU, annualRate, maxYears, unitValueUYU, exchangeRate) {
  const principal = calculateMaxPrincipal(maxPaymentUYU / unitValueUYU, annualRate, maxYears);
  return downPaymentUSD + principal * unitValueUYU / exchangeRate;
}

/**
 * Genera los datos para la gráfica Chart.js:
 * una línea por cada tasa, cuota mensual en UYU vs años.
 */
function generateChartData(principal, annualRates, minYears, maxYears, exchangeRate) {
  const labels = [];
  for (let y = minYears; y <= maxYears; y++) labels.push(y);

  const COLORS = ['#0d6efd', '#198754', '#fd7e14', '#dc3545', '#6f42c1'];

  const datasets = annualRates.map((rate, i) => ({
    label: `Tasa ${rate}%`,
    data: labels.map(y => convertUSDtoUYU(calculateMonthlyPayment(principal, rate, y), exchangeRate)),
    borderColor: COLORS[i % COLORS.length],
    backgroundColor: COLORS[i % COLORS.length] + '22',
    tension: 0.3,
    fill: false,
  }));

  return { labels, datasets };
}

// Compatible con Node.js (Jest) y browser (script tag)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    convertUSDtoUYU,
    convertUYUtoUSD,
    calculateMonthlyPayment,
    calculateTotalInterest,
    findScenarioMinQuota,
    findScenarioMaxQuota,
    findOptimalScenario,
    explainInfeasible,
    toLoanCurrency,
    calculateMaxPrincipal,
    calculateMaxPropertyPrice,
    generateChartData,
  };
}
