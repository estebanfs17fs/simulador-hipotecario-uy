const {
  BANCOS,
  teaToMonthlyRate,
  teaToTna,
  monthlyPaymentFromTea,
  findTier,
  compareLoans,
  lowestRate,
  findBank,
  maxFinancingPct,
  validateBankLoan,
} = require('../js/bancos');

describe('conversión de TEA', () => {
  test('la tasa mensual compuesta 12 veces devuelve la TEA', () => {
    expect(Math.pow(1 + teaToMonthlyRate(3.75), 12) - 1).toBeCloseTo(0.0375, 10);
  });
  test('3,75% TEA equivale a ~3,69% TNA', () => {
    expect(teaToTna(3.75)).toBeCloseTo(3.69, 2);
  });
  test('TEA 0 da tasa 0', () => {
    expect(teaToTna(0)).toBe(0);
  });
});

describe('monthlyPaymentFromTea', () => {
  test('US$ 100.000 a 20 años al 3,75% TEA', () => {
    // r = 1.0375^(1/12) - 1 ≈ 0.0030736; n = 240
    expect(monthlyPaymentFromTea(100000, 3.75, 20)).toBeCloseTo(589.12, 0);
  });
  test('tasa 0 reparte el capital en partes iguales', () => {
    expect(monthlyPaymentFromTea(120000, 0, 10)).toBe(1000);
  });
});

describe('findTier', () => {
  const oferta = {
    plazoMax: 25,
    tramos: [
      { hastaAnios: 25, tea: 3.75, montoMinUSD: 100000 },
      { hastaAnios: 10, tea: 4.0 },
      { hastaAnios: 25, tea: 4.5 },
    ],
  };
  test('elige el tramo por monto', () => {
    expect(findTier(oferta, 20, 150000).tea).toBe(3.75);
  });
  test('elige el tramo por plazo cuando el monto es menor', () => {
    expect(findTier(oferta, 10, 50000).tea).toBe(4.0);
    expect(findTier(oferta, 15, 50000).tea).toBe(4.5);
  });
  test('null si supera el plazo máximo', () => {
    expect(findTier(oferta, 26, 150000)).toBeNull();
  });
  test('null si no hay oferta', () => {
    expect(findTier(undefined, 10, 50000)).toBeNull();
  });
});

describe('compareLoans', () => {
  test('ordena los disponibles por cuota y deja al final los no disponibles', () => {
    const rows = compareLoans(120000, 25, 'UI');
    const disponibles = rows.filter(r => r.disponible);
    const firstUnavailable = rows.findIndex(r => !r.disponible);
    expect(disponibles.length).toBeGreaterThan(0);
    for (let i = 1; i < disponibles.length; i++) {
      expect(disponibles[i].cuota).toBeGreaterThanOrEqual(disponibles[i - 1].cuota);
    }
    if (firstUnavailable !== -1) {
      expect(rows.slice(firstUnavailable).every(r => !r.disponible)).toBe(true);
    }
  });

  test('marca los bancos que no llegan al plazo pedido', () => {
    const rows = compareLoans(120000, 30, 'UI');
    const bbva = rows.find(r => r.banco.id === 'bbva');
    expect(bbva.disponible).toBe(false);
    expect(bbva.motivo).toMatch(/25 años/);
    expect(rows.find(r => r.banco.id === 'itau').disponible).toBe(true);
  });

  test('marca los bancos sin esa moneda', () => {
    const rows = compareLoans(120000, 10, 'UYU');
    expect(rows.filter(r => r.disponible).map(r => r.banco.id)).toEqual(['bbva']);
    expect(rows.find(r => r.banco.id === 'bhu').motivo).toMatch(/No ofrece/);
  });

  test('intereses totales = cuotas - capital', () => {
    const row = compareLoans(100000, 20, 'USD').find(r => r.disponible);
    expect(row.totalIntereses).toBeCloseTo(row.cuota * 240 - 100000, 6);
  });
});

describe('datos de bancos', () => {
  test('cada banco tiene fuentes y al menos una moneda con tramos dentro del plazo máximo', () => {
    BANCOS.forEach(b => {
      expect(b.fuentes.length).toBeGreaterThan(0);
      Object.values(b.monedas).forEach(o => {
        expect(o.tramos.length).toBeGreaterThan(0);
        o.tramos.forEach(t => expect(t.hastaAnios).toBeLessThanOrEqual(o.plazoMax));
      });
    });
  });
  test('lowestRate', () => {
    expect(lowestRate(BANCOS.find(b => b.id === 'bbva'), 'UI')).toBe(3.75);
    expect(lowestRate(BANCOS.find(b => b.id === 'bhu'), 'USD')).toBeNull();
  });
});

describe('maxFinancingPct', () => {
  test('BBVA financia 90% si la propiedad supera US$ 150.000', () => {
    const ui = findBank('bbva').monedas.UI;
    expect(maxFinancingPct(ui, 150000, 100000)).toBe(80);
    expect(maxFinancingPct(ui, 200000, 100000)).toBe(90);
  });
  test('BTG financia 80% si el préstamo supera US$ 150.000', () => {
    const ui = findBank('btg').monedas.UI;
    expect(maxFinancingPct(ui, 150000, 120000)).toBe(90);
    expect(maxFinancingPct(ui, 300000, 200000)).toBe(80);
  });
});

describe('validateBankLoan', () => {
  const ok = { currency: 'UI', price: 150000, downPayment: 30000, minYears: 5, maxYears: 25 };

  test('sin problemas cuando el banco acepta el préstamo', () => {
    expect(validateBankLoan(findBank('bbva'), ok)).toEqual({});
  });

  test('moneda que el banco no ofrece', () => {
    expect(validateBankLoan(findBank('bhu'), { ...ok, currency: 'USD' }).bank).toMatch(/no presta en dólares/);
  });

  test('aporte menor al que exige la financiación máxima', () => {
    const e = validateBankLoan(findBank('bbva'), { ...ok, downPayment: 20000 });
    expect(e.downPayment).toMatch(/80%/);
    expect(e.downPayment).toMatch(/30\.000/);
  });

  test('plazo fuera del rango del banco', () => {
    const e = validateBankLoan(findBank('santander'), { ...ok, minYears: 2, maxYears: 31 });
    expect(e.minYears).toMatch(/3 años o más/);
    expect(e.maxYears).toMatch(/hasta 30 años/);
  });

  test('plazo sin tasa publicada (Santander en dólares a más de 10 años)', () => {
    const e = validateBankLoan(findBank('santander'), { ...ok, currency: 'USD', maxYears: 15 });
    expect(e.maxYears).toMatch(/no publica tasa para 15 años/);
  });

  test('monto fuera del rango del banco', () => {
    expect(validateBankLoan(findBank('btg'), { ...ok, price: 30000, downPayment: 10000 }).bank).toMatch(/desde US\$ 30\.000/);
    expect(validateBankLoan(findBank('santander'), { ...ok, price: 1000000, downPayment: 150000 }).bank).toMatch(/hasta US\$ 750\.000/);
  });

  test('ignora los campos vacíos', () => {
    expect(validateBankLoan(findBank('bbva'), { currency: 'UI', price: NaN, downPayment: NaN, minYears: NaN, maxYears: NaN })).toEqual({});
  });
});

describe('compareLoans con límites del banco', () => {
  test('excluye bancos por plazo mínimo y monto', () => {
    const rows = compareLoans(25000, 2, 'UI');
    expect(rows.find(r => r.banco.id === 'santander').motivo).toMatch(/Plazo mínimo 3/);
    expect(rows.find(r => r.banco.id === 'btg').motivo).toMatch(/desde US\$ 30\.000/);
  });
});
