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

function _buildResult(principal, annualRate, years, exchangeRate) {
  const monthlyPaymentUSD = calculateMonthlyPayment(principal, annualRate, years);
  const monthlyPaymentUYU = convertUSDtoUYU(monthlyPaymentUSD, exchangeRate);
  const totalInterestUSD = calculateTotalInterest(principal, monthlyPaymentUSD, years);
  const totalInterestUYU = convertUSDtoUYU(totalInterestUSD, exchangeRate);
  return {
    years,
    monthlyPaymentUSD,
    monthlyPaymentUYU,
    totalInterestUSD,
    totalInterestUYU,
    totalPaymentUSD: principal + totalInterestUSD,
    totalPaymentUYU: convertUSDtoUYU(principal + totalInterestUSD, exchangeRate),
  };
}

/**
 * Escenario 1: usa la cuota mínima del usuario, busca el plazo más largo posible
 * dentro del rango donde la cuota calculada no supere dicho mínimo.
 */
function findScenarioMinQuota(principal, annualRate, minPaymentUYU, exchangeRate, minYears, maxYears) {
  const maxAffordableUSD = convertUYUtoUSD(minPaymentUYU, exchangeRate);
  for (let year = maxYears; year >= minYears; year--) {
    const cuota = calculateMonthlyPayment(principal, annualRate, year);
    if (cuota <= maxAffordableUSD) {
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
  const maxAffordableUSD = convertUYUtoUSD(maxPaymentUYU, exchangeRate);
  for (let year = minYears; year <= maxYears; year++) {
    const cuota = calculateMonthlyPayment(principal, annualRate, year);
    if (cuota <= maxAffordableUSD) {
      return _buildResult(principal, annualRate, year, exchangeRate);
    }
  }
  return null;
}

/**
 * Escenario 3: punto óptimo que minimiza intereses respetando el presupuesto.
 * Plazo objetivo = minYears + floor((maxYears - minYears) / 3).
 * Si la cuota requerida para ese plazo no cabe en el presupuesto, escala al escenario 2.
 */
function findOptimalScenario(principal, annualRate, minPaymentUYU, maxPaymentUYU, exchangeRate, minYears, maxYears) {
  const targetYears = minYears + Math.floor((maxYears - minYears) / 3);
  const requiredUSD = calculateMonthlyPayment(principal, annualRate, targetYears);
  const requiredUYU = convertUSDtoUYU(requiredUSD, exchangeRate);

  if (requiredUYU >= minPaymentUYU && requiredUYU <= maxPaymentUYU) {
    return _buildResult(principal, annualRate, targetYears, exchangeRate);
  }

  if (requiredUYU < minPaymentUYU) {
    // El plazo objetivo paga demasiado rápido → buscar un plazo mayor donde la cuota sea ≥ minPaymentUYU
    for (let year = targetYears + 1; year <= maxYears; year++) {
      const cuota = calculateMonthlyPayment(principal, annualRate, year);
      const cuotaUYU = convertUSDtoUYU(cuota, exchangeRate);
      if (cuotaUYU >= minPaymentUYU && cuotaUYU <= maxPaymentUYU) {
        return _buildResult(principal, annualRate, year, exchangeRate);
      }
    }
    // Si ningún año dentro del rango cabe entre [min, max], usar el plazo objetivo igual
    return _buildResult(principal, annualRate, targetYears, exchangeRate);
  }

  // requiredUYU > maxPaymentUYU → el plan óptimo no alcanza; degradar a escenario 2
  return findScenarioMaxQuota(principal, annualRate, maxPaymentUYU, exchangeRate, minYears, maxYears);
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
    generateChartData,
  };
}
