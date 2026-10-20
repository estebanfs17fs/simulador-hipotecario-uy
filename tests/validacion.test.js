const { findMissingFields, joinLabels, formHintText } = require('../js/validacion');

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
