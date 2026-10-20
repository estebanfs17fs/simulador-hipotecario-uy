// Datos que necesita la simulación: cuáles faltan y cómo avisarle al usuario.
// Funciones puras, sin DOM, para poder probarlas con Jest.

/** Campos del formulario en el orden en que aparecen. */
const FORM_FIELDS = [
  { id: 'propertyPrice', key: 'price', label: 'Precio de la propiedad' },
  { id: 'downPayment', key: 'downPayment', label: 'Aporte inicial' },
  { id: 'exchangeRate', key: 'xRate', label: 'Cotización del dólar' },
  { id: 'bankSelect', label: 'Banco' },
  { id: 'uiValue', key: 'uiValue', label: 'Valor de la UI', onlyFor: 'UI' },
  { id: 'interestRate', key: 'rate', label: 'Tasa de interés' },
  { id: 'minYears', key: 'minYears', label: 'Plazo mínimo' },
  { id: 'maxYears', key: 'maxYears', label: 'Plazo máximo' },
  { id: 'minPayment', key: 'minPayment', label: 'Cuota mínima' },
  { id: 'maxPayment', key: 'maxPayment', label: 'Cuota máxima' },
];

const MISSING_MSG = 'Falta completar este dato.';

/** Ids de los campos obligatorios vacíos (NaN) para la moneda elegida, en orden. */
function findMissingFields(v) {
  return FORM_FIELDS
    .filter(f => f.key && (!f.onlyFor || f.onlyFor === v.currency))
    .filter(f => typeof v[f.key] !== 'number' || isNaN(v[f.key]))
    .map(f => f.id);
}

function fieldLabel(id) {
  const field = FORM_FIELDS.find(f => f.id === id);
  return field ? field.label : id;
}

/** "A", "A y B", "A, B y C". */
function joinLabels(ids) {
  const labels = ids.map(fieldLabel);
  if (labels.length <= 1) return labels.join('');
  return `${labels.slice(0, -1).join(', ')} y ${labels[labels.length - 1]}`;
}

/** Texto bajo el botón: qué falta completar y qué hay que corregir. */
function formHintText(missing, invalid) {
  const parts = [];
  if (missing.length) parts.push(`Para calcular falta completar: ${joinLabels(missing)}.`);
  if (invalid.length) parts.push(`${missing.length ? 'Además revisá' : 'Para calcular revisá'}: ${joinLabels(invalid)}.`);
  return parts.join(' ');
}

if (typeof module !== 'undefined') {
  module.exports = { FORM_FIELDS, MISSING_MSG, findMissingFields, fieldLabel, joinLabels, formHintText };
}
