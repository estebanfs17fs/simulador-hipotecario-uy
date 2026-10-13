const {
  convertUSDtoUYU,
  convertUYUtoUSD,
  calculateMonthlyPayment,
  calculateTotalInterest,
  findScenarioMinQuota,
  findScenarioMaxQuota,
  findOptimalScenario,
  generateChartData,
} = require('../js/calculator');

const EXCHANGE_RATE = 42; // UYU por USD (valor de referencia para tests)

// ─── Conversiones ────────────────────────────────────────────────────────────

describe('convertUSDtoUYU', () => {
  test('convierte correctamente', () => {
    expect(convertUSDtoUYU(1000, 42)).toBeCloseTo(42000, 0);
  });
  test('retorna 0 cuando el monto es 0', () => {
    expect(convertUSDtoUYU(0, 42)).toBe(0);
  });
});

describe('convertUYUtoUSD', () => {
  test('convierte correctamente', () => {
    expect(convertUYUtoUSD(42000, 42)).toBeCloseTo(1000, 0);
  });
  test('retorna 0 cuando el monto es 0', () => {
    expect(convertUYUtoUSD(0, 42)).toBe(0);
  });
});

// ─── Cuota mensual ────────────────────────────────────────────────────────────

describe('calculateMonthlyPayment', () => {
  test('CA-01: $100.000 USD, 3.75% TNA, 20 años → ≈ $592.89', () => {
    expect(calculateMonthlyPayment(100000, 3.75, 20)).toBeCloseTo(592.89, 1);
  });

  test('$100.000 USD, 3.75% TNA, 30 años → ≈ $463.12', () => {
    expect(calculateMonthlyPayment(100000, 3.75, 30)).toBeCloseTo(463.12, 1);
  });

  test('tasa 0%: cuota = principal / meses', () => {
    expect(calculateMonthlyPayment(50000, 0, 10)).toBeCloseTo(416.67, 1);
  });

  test('principal 0: retorna 0', () => {
    expect(calculateMonthlyPayment(0, 3.75, 20)).toBe(0);
  });

  test('años 0: retorna 0', () => {
    expect(calculateMonthlyPayment(100000, 3.75, 0)).toBe(0);
  });

  test('cuota mayor con menor plazo', () => {
    const cuota10 = calculateMonthlyPayment(100000, 3.75, 10);
    const cuota20 = calculateMonthlyPayment(100000, 3.75, 20);
    expect(cuota10).toBeGreaterThan(cuota20);
  });
});

// ─── Intereses totales ────────────────────────────────────────────────────────

describe('calculateTotalInterest', () => {
  test('$100.000, cuota $592.89, 20 años → ≈ $42.293', () => {
    expect(calculateTotalInterest(100000, 592.89, 20)).toBeCloseTo(42293.6, 0);
  });

  test('siempre es mayor o igual a 0', () => {
    expect(calculateTotalInterest(100000, 420, 20)).toBeGreaterThanOrEqual(0);
  });

  test('tasa 0 → intereses = 0', () => {
    const cuota = calculateMonthlyPayment(100000, 0, 20);
    expect(calculateTotalInterest(100000, cuota, 20)).toBeCloseTo(0, 0);
  });
});

// ─── Escenario 1: cuota mínima ────────────────────────────────────────────────

describe('findScenarioMinQuota', () => {
  test('retorna un resultado válido para parámetros razonables', () => {
    // minPayment = 30.000 UYU → ≈ 714 USD → puede pagar préstamo de $100k
    const result = findScenarioMinQuota(100000, 3.75, 30000, EXCHANGE_RATE, 5, 30);
    expect(result).not.toBeNull();
    expect(result.years).toBeGreaterThanOrEqual(5);
    expect(result.years).toBeLessThanOrEqual(30);
  });

  test('la cuota en UYU no supera el límite ingresado', () => {
    const result = findScenarioMinQuota(100000, 3.75, 30000, EXCHANGE_RATE, 5, 30);
    expect(result).not.toBeNull();
    expect(result.monthlyPaymentUYU).toBeLessThanOrEqual(30000 + 1); // tolerancia $1
  });

  test('retorna null si el préstamo no puede pagarse dentro del rango', () => {
    // cuota mínima muy baja: 1000 UYU ≈ $24 USD — imposible para $100k
    const result = findScenarioMinQuota(100000, 3.75, 1000, EXCHANGE_RATE, 5, 30);
    expect(result).toBeNull();
  });

  test('el escenario 1 tiene plazo mayor o igual que el escenario 2', () => {
    const s1 = findScenarioMinQuota(100000, 3.75, 25000, EXCHANGE_RATE, 5, 30);
    const s2 = findScenarioMaxQuota(100000, 3.75, 50000, EXCHANGE_RATE, 5, 30);
    if (s1 && s2) {
      expect(s1.years).toBeGreaterThanOrEqual(s2.years);
    }
  });
});

// ─── Escenario 2: cuota máxima ────────────────────────────────────────────────

describe('findScenarioMaxQuota', () => {
  test('retorna un resultado válido para parámetros razonables', () => {
    const result = findScenarioMaxQuota(100000, 3.75, 50000, EXCHANGE_RATE, 5, 30);
    expect(result).not.toBeNull();
    expect(result.years).toBeGreaterThanOrEqual(5);
    expect(result.years).toBeLessThanOrEqual(30);
  });

  test('la cuota en UYU no supera el máximo ingresado', () => {
    const result = findScenarioMaxQuota(100000, 3.75, 50000, EXCHANGE_RATE, 5, 30);
    expect(result).not.toBeNull();
    expect(result.monthlyPaymentUYU).toBeLessThanOrEqual(50000 + 1);
  });

  test('retorna null si incluso con el máximo de años la cuota supera el máximo', () => {
    // máximo muy bajo: 500 UYU ≈ $12 USD — imposible para $100k
    const result = findScenarioMaxQuota(100000, 3.75, 500, EXCHANGE_RATE, 5, 30);
    expect(result).toBeNull();
  });
});

// ─── Escenario 3: óptimo ─────────────────────────────────────────────────────

describe('findOptimalScenario', () => {
  test('retorna un resultado válido', () => {
    const result = findOptimalScenario(100000, 3.75, 25000, 50000, EXCHANGE_RATE, 5, 30);
    expect(result).not.toBeNull();
  });

  test('CA-02: el plazo óptimo está entre el mínimo y máximo escenario', () => {
    const s1 = findScenarioMinQuota(100000, 3.75, 25000, EXCHANGE_RATE, 5, 30);
    const s2 = findScenarioMaxQuota(100000, 3.75, 50000, EXCHANGE_RATE, 5, 30);
    const s3 = findOptimalScenario(100000, 3.75, 25000, 50000, EXCHANGE_RATE, 5, 30);
    if (s1 && s2 && s3) {
      expect(s3.years).toBeLessThanOrEqual(s1.years);
      expect(s3.years).toBeGreaterThanOrEqual(s2.years);
    }
  });

  test('CA-03: intereses escenario 1 >= escenario 3 >= escenario 2', () => {
    const s1 = findScenarioMinQuota(100000, 3.75, 25000, EXCHANGE_RATE, 5, 30);
    const s2 = findScenarioMaxQuota(100000, 3.75, 50000, EXCHANGE_RATE, 5, 30);
    const s3 = findOptimalScenario(100000, 3.75, 25000, 50000, EXCHANGE_RATE, 5, 30);
    if (s1 && s2 && s3) {
      expect(s1.totalInterestUSD).toBeGreaterThanOrEqual(s3.totalInterestUSD - 1);
      expect(s3.totalInterestUSD).toBeGreaterThanOrEqual(s2.totalInterestUSD - 1);
    }
  });

  test('la cuota óptima está dentro del rango [min, max]', () => {
    const result = findOptimalScenario(100000, 3.75, 25000, 50000, EXCHANGE_RATE, 5, 30);
    if (result) {
      expect(result.monthlyPaymentUYU).toBeGreaterThanOrEqual(24999);
      expect(result.monthlyPaymentUYU).toBeLessThanOrEqual(50001);
    }
  });
});

// ─── Datos de gráfica ─────────────────────────────────────────────────────────

describe('generateChartData', () => {
  test('retorna la cantidad correcta de etiquetas y datasets', () => {
    const data = generateChartData(100000, [3.0, 3.75, 5.0], 10, 30, EXCHANGE_RATE);
    expect(data.labels.length).toBe(21); // años 10..30 inclusive
    expect(data.datasets.length).toBe(3); // una línea por tasa
  });

  test('los valores de cuota decrecen al aumentar el plazo', () => {
    const data = generateChartData(100000, [3.75], 10, 30, EXCHANGE_RATE);
    const values = data.datasets[0].data;
    expect(values[0]).toBeGreaterThan(values[values.length - 1]);
  });
});
