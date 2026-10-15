/**
 * Ofertas hipotecarias de bancos en Uruguay y comparador de préstamos.
 * Los datos se consultaron en las fuentes citadas en cada banco; las tasas
 * son TEA (tasa efectiva anual) "desde", sujetas a aprobación del banco.
 * Para actualizarlos, cambiá CONSULTADO y los valores de BANCOS.
 */

const CONSULTADO = '15/10/2026';

/**
 * Cada moneda tiene tramos de tasa. Un tramo aplica si el plazo es <= hastaAnios
 * y el monto (equivalente en US$) está entre montoMinUSD y montoMaxUSD.
 * `masIva`: la tasa publicada no incluye el IVA sobre intereses.
 */
const BANCOS = [
  {
    id: 'bhu',
    nombre: 'BHU',
    nombreLargo: 'Banco Hipotecario del Uruguay',
    tipo: 'Público',
    url: 'https://www.bhu.com.uy',
    monedas: {
      UI: {
        plazoMax: 25,
        financiacion: 'Hasta 90% (más si sos ahorrista; 100% con Préstamo Soñado)',
        cuotaIngreso: '25% del ingreso disponible (30% con retención de sueldo)',
        tramos: [{ hastaAnios: 25, tea: 3.75 }],
      },
    },
    ingresoMinimo: 'No publica un mínimo; depende de la relación cuota/ingreso',
    fuertes: [
      'Tasas entre las más bajas del mercado y sin costo de solicitud para compra en UI.',
      'Préstamo Soñado: financia hasta el 100% (desde 4,50% TEA, con garantía de otro inmueble los primeros años).',
      'Si ahorrás antes en el BHU (Yo Ahorro) accedés a mayor financiación y tasas preferenciales.',
      'Tener otra propiedad no impide pedir el préstamo.',
    ],
    atencion: [
      'La cuota se retiene del sueldo y no puede superar el 25–30% del ingreso disponible.',
      'Edad + plazo no puede superar 70 años (80 con dos titulares).',
      'Preaprobación y pretasación cuestan 2.500 UI cada una (se descuentan si pedís el préstamo dentro de 90 días).',
    ],
    fuentes: [
      { titulo: 'BHU: requisitos y condiciones del préstamo', url: 'https://www.bhu.com.uy/preguntas-frecuentes/prestamos/quiero-solicitar-un-prestamo' },
      { titulo: 'BHU: Préstamo Soñado', url: 'https://www.bhu.com.uy/credito/prestamo-sonado' },
      { titulo: 'CalcuLatam: comparador hipotecario (tasa Podés Comprar, verificado set. 2026)', url: 'https://calculatam.com/uy/hipotecarios' },
    ],
  },
  {
    id: 'bbva',
    nombre: 'BBVA',
    nombreLargo: 'BBVA Uruguay',
    tipo: 'Privado',
    url: 'https://www.bbva.com.uy/personas/productos/prestamos/hipotecario/hipotecario.html',
    monedas: {
      UI: {
        plazoMax: 25,
        financiacion: '80% (90% si la propiedad supera US$ 150.000)',
        cuotaIngreso: '30% del ingreso líquido',
        tramos: [
          { hastaAnios: 25, tea: 3.75, montoMinUSD: 100000, condicion: 'préstamo mayor a US$ 100.000, cobrando el sueldo en BBVA' },
          { hastaAnios: 10, tea: 4.00, condicion: 'cobrando el sueldo en BBVA' },
          { hastaAnios: 20, tea: 4.10, condicion: 'cobrando el sueldo en BBVA' },
          { hastaAnios: 25, tea: 4.50, condicion: 'cobrando el sueldo en BBVA' },
        ],
      },
      USD: {
        plazoMax: 25,
        financiacion: '80% (90% si la propiedad supera US$ 150.000)',
        cuotaIngreso: '15% del ingreso líquido',
        tramos: [
          { hastaAnios: 20, tea: 6.75, condicion: 'cobrando el sueldo en BBVA' },
          { hastaAnios: 25, tea: 7.00, condicion: 'cobrando el sueldo en BBVA' },
        ],
      },
      UYU: {
        plazoMax: 10,
        financiacion: 'No publicada',
        cuotaIngreso: 'No publicada',
        tramos: [
          { hastaAnios: 10, tea: 9.00, montoMinUSD: 100000, condicion: 'préstamo mayor al equivalente de US$ 100.000' },
          { hastaAnios: 10, tea: 9.90 },
        ],
      },
    },
    ingresoMinimo: '$ 30.000 del titular ($ 140.000 para financiar 90%)',
    fuertes: [
      '3,75% en UI hasta 25 años para préstamos de más de US$ 100.000 cobrando el sueldo en el banco.',
      'Única opción en pesos a tasa fija (9% TEA): la cuota no cambia con la inflación ni el dólar, hasta 10 años.',
      'Pide solo 1 año de antigüedad laboral a dependientes y profesionales.',
      'Reintegra la tasación (hasta $ 11.000) a quienes cobran el sueldo en BBVA.',
    ],
    atencion: [
      'Las tasas publicadas son para quien cobra el sueldo en BBVA (promoción hasta el 31/12/2026).',
      'La cuota no puede superar el 30% del ingreso en UI ni el 15% en dólares.',
    ],
    fuentes: [
      { titulo: 'BBVA: préstamo hipotecario (tasas y requisitos)', url: 'https://www.bbva.com.uy/personas/productos/prestamos/hipotecario/hipotecario.html' },
      { titulo: 'BBVA: hipoteca en pesos a tasa fija (14/09/2026)', url: 'https://www.bbva.com/es/uy/economia-y-finanzas/bbva-suma-una-hipoteca-en-pesos-a-tasa-fija-y-pone-el-foco-en-la-previsibilidad-de-la-cuota/' },
    ],
  },
  {
    id: 'santander',
    nombre: 'Santander',
    nombreLargo: 'Banco Santander Uruguay',
    tipo: 'Privado',
    url: 'https://www.santander.com.uy/prestamo-hipotecario',
    monedas: {
      UI: {
        plazoMax: 30,
        financiacion: '85% en general (hasta 95% para colectivos especiales)',
        cuotaIngreso: '35% del ingreso',
        tramos: [
          { hastaAnios: 10, tea: 4.00 },
          { hastaAnios: 30, tea: 4.75, condicion: 'más de 20 años solo para nómina, Select, profesionales y funcionarios públicos' },
        ],
      },
      USD: {
        plazoMax: 20,
        financiacion: '85%',
        cuotaIngreso: '20% del ingreso',
        tramos: [{ hastaAnios: 10, tea: 6.75 }],
      },
    },
    ingresoMinimo: 'UI 10.000 del hogar',
    fuertes: [
      'Plazo de hasta 30 años en UI, el más largo del mercado junto con Itaú.',
      'Publicita tasas desde 3,75% en UI y hasta 95% de financiación según el perfil.',
      'Padres + Hijos: menores de 30 años pueden sumar el ingreso de un padre.',
      'Primera cuota a los 90 días y préstamo sin IVA en UI para vivienda principal.',
    ],
    atencion: [
      'La cartilla de marzo 2026 publica 4,00% hasta 10 años y 4,75% de 11 a 30 años en UI.',
      'En dólares a más de 10 años la tasa es variable (SOFR + margen).',
      'Cancelar antes de los 12 meses tiene una multa de tres meses de intereses.',
    ],
    fuentes: [
      { titulo: 'Santander: préstamo hipotecario', url: 'https://www.santander.com.uy/prestamo-hipotecario' },
      { titulo: 'Santander: cartilla crédito hipotecario (marzo 2026)', url: 'https://www.santander.com.uy/sites/default/files/2026-03/Cr%C3%A9dito-Hipotecario%20Santander_032026.pdf' },
    ],
  },
  {
    id: 'itau',
    nombre: 'Itaú',
    nombreLargo: 'Banco Itaú Uruguay',
    tipo: 'Privado',
    url: 'https://www.itau.com.uy/inst/prestamos-hipotecarios.html',
    monedas: {
      UI: {
        plazoMax: 30,
        financiacion: 'Hasta 80% según la zona (tope UI 4.500.000)',
        cuotaIngreso: '35% del ingreso',
        tramos: [
          { hastaAnios: 30, tea: 3.75, condicion: 'con Paquete Personal Bank o Full' },
        ],
      },
      USD: {
        plazoMax: 10,
        financiacion: '70%',
        cuotaIngreso: '20% del ingreso',
        tramos: [{ hastaAnios: 10, tea: 7.50, masIva: true }],
      },
    },
    ingresoMinimo: 'UI 10.000 del hogar',
    fuertes: [
      '3,75% en UI hasta 30 años con paquete Personal Bank o Full (4,00% sin paquete).',
      'Tasación gratis y cancelación anticipada permitida.',
    ],
    atencion: [
      'Gastos administrativos de 1,5% del préstamo (mín. US$ 150, máx. US$ 500) y estudio de títulos de 0,45% (mín. US$ 500).',
      'En dólares el plazo máximo es 10 años.',
    ],
    fuentes: [
      { titulo: 'Itaú: préstamo hipotecario', url: 'https://www.itau.com.uy/inst/prestamos-hipotecarios.html' },
      { titulo: 'CalcuLatam: comparador hipotecario (verificado set. 2026)', url: 'https://calculatam.com/uy/hipotecarios' },
    ],
  },
  {
    id: 'scotiabank',
    nombre: 'Scotiabank',
    nombreLargo: 'Scotiabank Uruguay',
    tipo: 'Privado',
    url: 'https://www.scotiabank.com.uy/Personas/Prestamos/Productos/prestamoinmobiliario/prestamoinmobiliario',
    monedas: {
      UI: {
        plazoMax: 25,
        financiacion: '90% primera vivienda (75% segunda)',
        cuotaIngreso: 'No publicada',
        tramos: [
          { hastaAnios: 25, tea: 3.80, condicion: 'más de 20 años solo cobrando el sueldo en Scotiabank' },
        ],
      },
      USD: {
        plazoMax: 15,
        financiacion: '80% primera vivienda',
        cuotaIngreso: 'No publicada',
        tramos: [{ hastaAnios: 15, tea: 7.50, masIva: true }],
      },
    },
    ingresoMinimo: '$ 50.000 líquidos en UI; $ 100.000 en dólares',
    fuertes: [
      'Financia hasta 90% en UI sin ser cliente previo.',
      'Tasación gratis (se reintegra si se otorga el préstamo).',
      'El crédito aprobado dura 6 meses para encontrar la vivienda.',
    ],
    atencion: [
      'Pide un ingreso mínimo más alto que otros bancos.',
      'Sin cobrar el sueldo en el banco el plazo en UI llega a 20 años.',
    ],
    fuentes: [
      { titulo: 'Scotiabank: Préstamo Hogar e Hipotecario UI y USD', url: 'https://www.scotiabank.com.uy/Personas/Prestamos/Productos/prestamoinmobiliario/prestamoinmobiliario' },
      { titulo: 'CalcuLatam: comparador hipotecario (verificado set. 2026)', url: 'https://calculatam.com/uy/hipotecarios' },
    ],
  },
  {
    id: 'btg',
    nombre: 'BTG Pactual',
    nombreLargo: 'BTG Pactual Uruguay (ex HSBC)',
    tipo: 'Privado',
    url: null,
    monedas: {
      UI: {
        plazoMax: 25,
        financiacion: '90% (80% para montos mayores a US$ 150.000)',
        cuotaIngreso: '35% del ingreso',
        tramos: [
          { hastaAnios: 25, tea: 3.75, montoMinUSD: 99999, montoMaxUSD: 500000 },
          { hastaAnios: 25, tea: 4.75, montoMinUSD: 30000 },
        ],
      },
    },
    ingresoMinimo: '$ 60.000 por mes',
    fuertes: [
      '3,75% en UI para préstamos entre US$ 100.000 y 500.000.',
      'Producto para no residentes (hasta 60% de financiación).',
    ],
    atencion: [
      'Compró la operación de HSBC; sus condiciones están en transición, confirmalas en la sucursal.',
      'No financia menos de US$ 30.000.',
    ],
    fuentes: [
      { titulo: 'CalcuLatam: comparador hipotecario (verificado set. 2026)', url: 'https://calculatam.com/uy/hipotecarios' },
      { titulo: 'INGAR: comparativa de bancos 2026', url: 'https://ingar.com.uy/blog/comparativa-bancos-hipotecarios-uruguay' },
    ],
  },
];

const MONEDAS = {
  UI: 'Unidades Indexadas',
  USD: 'Dólares',
  UYU: 'Pesos (tasa fija)',
};

/** Tasa mensual efectiva equivalente a una TEA (en %). */
function teaToMonthlyRate(tea) {
  return Math.pow(1 + tea / 100, 1 / 12) - 1;
}

/** TNA (tasa mensual × 12, en %) equivalente a una TEA: es la que usa el simulador. */
function teaToTna(tea) {
  return teaToMonthlyRate(tea) * 12 * 100;
}

/** Cuota mensual con sistema francés a partir de una TEA. */
function monthlyPaymentFromTea(principal, tea, years) {
  const n = years * 12;
  const r = teaToMonthlyRate(tea);
  if (r === 0) return principal / n;
  const factor = Math.pow(1 + r, n);
  return principal * (r * factor) / (factor - 1);
}

/** Primer tramo de la moneda que admite ese plazo y ese monto, o null. */
function findTier(oferta, years, amountUSD) {
  if (!oferta || years > oferta.plazoMax) return null;
  return oferta.tramos.find(t =>
    years <= t.hastaAnios &&
    amountUSD >= (t.montoMinUSD ?? 0) &&
    amountUSD <= (t.montoMaxUSD ?? Infinity)
  ) ?? null;
}

/**
 * Compara una misma solicitud en todos los bancos.
 * Devuelve primero los disponibles, de menor a mayor cuota, y al final los que
 * no ofrecen esa moneda, ese plazo o ese monto (con el motivo).
 */
function compareLoans(amountUSD, years, moneda, bancos = BANCOS) {
  const rows = bancos.map(banco => {
    const oferta = banco.monedas[moneda];
    if (!oferta) return { banco, disponible: false, motivo: `No ofrece préstamos en ${MONEDAS[moneda].toLowerCase()}` };
    if (years > oferta.plazoMax) return { banco, disponible: false, motivo: `Plazo máximo ${oferta.plazoMax} años` };
    const tramo = findTier(oferta, years, amountUSD);
    if (!tramo) return { banco, disponible: false, motivo: 'No publica tasa para ese monto o plazo' };
    const cuota = monthlyPaymentFromTea(amountUSD, tramo.tea, years);
    const totalIntereses = cuota * years * 12 - amountUSD;
    return { banco, disponible: true, tramo, cuota, totalIntereses };
  });
  const disponibles = rows.filter(r => r.disponible).sort((a, b) => a.cuota - b.cuota);
  return disponibles.concat(rows.filter(r => !r.disponible));
}

/** Tasa más baja publicada por un banco en una moneda, o null. */
function lowestRate(banco, moneda) {
  const oferta = banco.monedas[moneda];
  return oferta ? Math.min(...oferta.tramos.map(t => t.tea)) : null;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    CONSULTADO,
    BANCOS,
    MONEDAS,
    teaToMonthlyRate,
    teaToTna,
    monthlyPaymentFromTea,
    findTier,
    compareLoans,
    lowestRate,
  };
}
