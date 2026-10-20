const { findMissingFields, joinLabels, formHintText, parseNumberUY } = require('../js/validacion');

const completo = {
  price: 150000, downPayment: 30000, xRate: 40, rate: 3.75,
  minYears: 5, maxYears: 30, minPayment: 25000, maxPayment: 55000,
  currency: 'USD', uiValue: NaN,
};

describe('campos faltantes', () => {
  test('con todo completo no falta nada', () => {
    expect(findMissingFields(completo)).toEqual([]);
  });

  test('devuelve los vacíos en el orden del formulario', () => {
    expect(findMissingFields({ ...completo, maxPayment: NaN, price: NaN })).toEqual(['propertyPrice', 'maxPayment']);
  });

  test('el valor de la UI solo se pide para préstamos en UI', () => {
    expect(findMissingFields(completo)).not.toContain('uiValue');
    expect(findMissingFields({ ...completo, currency: 'UI' })).toEqual(['uiValue']);
    expect(findMissingFields({ ...completo, currency: 'UI', uiValue: 6.4 })).toEqual([]);
  });

  test('cero es un dato completo', () => {
    expect(findMissingFields({ ...completo, downPayment: 0, rate: 0 })).toEqual([]);
  });
});

describe('mensaje bajo el botón', () => {
  test('une los nombres de los campos en castellano', () => {
    expect(joinLabels(['minYears'])).toBe('Plazo mínimo');
    expect(joinLabels(['minYears', 'maxYears'])).toBe('Plazo mínimo y Plazo máximo');
    expect(joinLabels(['propertyPrice', 'minYears', 'maxPayment'])).toBe('Precio de la propiedad, Plazo mínimo y Cuota máxima');
  });

  test('dice qué falta y qué corregir', () => {
    expect(formHintText([], [])).toBe('');
    expect(formHintText(['exchangeRate'], [])).toBe('Para calcular falta completar: Cotización del dólar.');
    expect(formHintText([], ['maxYears'])).toBe('Para calcular revisá: Plazo máximo.');
    expect(formHintText(['uiValue'], ['bankSelect'])).toBe('Para calcular falta completar: Valor de la UI. Además revisá: Banco.');
  });
});

describe('parseNumberUY', () => {
  const miles = { thousands: true };

  test('montos con punto de miles, como se escriben en Uruguay', () => {
    expect(parseNumberUY('150.000', miles)).toBe(150000);
    expect(parseNumberUY('1.500.000', miles)).toBe(1500000);
    expect(parseNumberUY('1.500', miles)).toBe(1500);
    expect(parseNumberUY('US$ 30.000', miles)).toBe(30000);
    expect(parseNumberUY('$ 25 000', miles)).toBe(25000);
  });

  test('montos sin separador o con coma decimal', () => {
    expect(parseNumberUY('150000', miles)).toBe(150000);
    expect(parseNumberUY('1.500,50', miles)).toBe(1500.5);
    expect(parseNumberUY('25000,5', miles)).toBe(25000.5);
  });

  test('tasas y cotizaciones con coma o punto decimal', () => {
    expect(parseNumberUY('40,13')).toBe(40.13);
    expect(parseNumberUY('40.13')).toBe(40.13);
    expect(parseNumberUY('40.125')).toBe(40.125);
    expect(parseNumberUY('6,6699')).toBe(6.6699);
    expect(parseNumberUY('3,75 %')).toBe(3.75);
  });

  test('vacío o texto que no es un número da NaN', () => {
    expect(parseNumberUY('')).toBeNaN();
    expect(parseNumberUY('  ')).toBeNaN();
    expect(parseNumberUY('abc', miles)).toBeNaN();
    expect(parseNumberUY('1,2,3', miles)).toBeNaN();
    expect(parseNumberUY('1.2.3')).toBeNaN();
  });

  test('negativos se leen para que la validación los marque', () => {
    expect(parseNumberUY('-5', miles)).toBe(-5);
  });
});
