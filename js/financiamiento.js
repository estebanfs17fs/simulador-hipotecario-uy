// Página de financiamiento: comparador, tabla de tasas, bancos y fuentes.
// Los datos y cálculos están en js/bancos.js.

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.js-consultado').forEach(el => { el.textContent = CONSULTADO; });
  renderRatesTable();
  renderBankCards();
  renderSources();
  const saved = loadSavedSimulation();
  if (saved) showSavedSimulation(saved);

  const form = document.getElementById('compareForm');
  form.addEventListener('input', renderComparison);
  form.addEventListener('change', () => {
    if (!comparatorTracked) track('comparador-bancos');
    comparatorTracked = true;
  });
  form.addEventListener('submit', e => e.preventDefault());
  renderComparison();
});

// ─── Simulación guardada en el simulador ─────────────────────────────────────
// El simulador guarda el formulario en sessionStorage; acá se ofrece volver a él
// y se usa para precargar el comparador.

let comparatorTracked = false;

function loadSavedSimulation() {
  try {
    return JSON.parse(sessionStorage.getItem('simuladorHipotecario'));
  } catch {
    return null;
  }
}

function showSavedSimulation(saved) {
  document.getElementById('backToSimulation').classList.replace('d-none', 'd-flex');
  const loan = Number(saved.propertyPrice) - Number(saved.downPayment);
  if (loan > 0) document.getElementById('cmpAmount').value = loan;
  if (Number(saved.maxYears) >= 1) document.getElementById('cmpYears').value = saved.maxYears;
  const radio = document.querySelector(`input[name="cmpCurrency"][value="${saved.currency}"]`);
  if (radio) radio.checked = true;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatRate(tea, masIva) {
  return tea.toLocaleString('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%' + (masIva ? ' + IVA' : '');
}

// ─── Comparador ──────────────────────────────────────────────────────────────

function renderComparison() {
  const amount = Number(document.getElementById('cmpAmount').value);
  const years = Number(document.getElementById('cmpYears').value);
  const moneda = document.querySelector('input[name="cmpCurrency"]:checked').value;
  const tbody = document.querySelector('#compareTable tbody');
  const error = document.getElementById('compareError');

  if (!(amount > 0) || !Number.isInteger(years) || years < 1 || years > 40) {
    error.textContent = 'Ingresá un monto mayor a 0 y un plazo entero entre 1 y 40 años.';
    tbody.innerHTML = '';
    return;
  }
  error.textContent = '';

  const rows = compareLoans(amount, years, moneda);
  const minCuota = rows[0]?.disponible ? rows[0].cuota : null;
  const isBest = r => r.disponible && r.cuota - minCuota < 0.005;
  tbody.innerHTML = rows.map(r => {
    const name = `<span class="bank-name">${bankLogo(r.banco)}<strong>${escapeHtml(r.banco.nombre)}</strong></span>`;
    if (!r.disponible) {
      return `<tr class="text-muted"><td>${name}</td><td colspan="4" class="small">${escapeHtml(r.motivo)}</td></tr>`;
    }
    const cond = r.tramo.condicion ? `<div class="small text-muted">${escapeHtml(r.tramo.condicion)}</div>` : '';
    const badge = isBest(r) ? ' <span class="badge text-bg-success">Menor cuota</span>' : '';
    const link = moneda === 'UYU'
      ? ''
      : `<a class="btn btn-outline-primary btn-sm" href="index.html?banco=${r.banco.id}&moneda=${moneda}" data-track="simular-desde-bancos/${r.banco.id}">Simular</a>`;
    return `<tr${isBest(r) ? ' class="table-success"' : ''}>
      <td>${name}${badge}${cond}</td>
      <td>${formatRate(r.tramo.tea, r.tramo.masIva)}</td>
      <td class="fw-semibold">${formatUSD(r.cuota)}</td>
      <td>${formatUSD(r.totalIntereses)}</td>
      <td class="text-end">${link}</td>
    </tr>`;
  }).join('');

  const notes = {
    UI: 'En UI, la cuota y los intereses están en dólares de hoy: la cuota real en pesos sube con la inflación porque la UI se ajusta a diario.',
    USD: 'En dólares la cuota es fija en US$, pero en pesos cambia con el tipo de cambio. Las tasas "+ IVA" pagan además 22% de IVA sobre los intereses (no incluido en el cálculo).',
    UYU: 'En pesos a tasa fija la cuota no cambia en todo el plazo. El monto se toma en su equivalente en dólares de hoy.',
  };
  document.getElementById('compareNote').textContent =
    notes[moneda] + ' "Simular" abre el simulador con ese banco elegido: carga su tasa y sus plazos.';
}

// ─── Tabla de tasas ──────────────────────────────────────────────────────────

function renderRatesTable() {
  const rows = [];
  BANCOS.forEach(banco => {
    const monedas = Object.keys(banco.monedas);
    monedas.forEach((moneda, i) => {
      const oferta = banco.monedas[moneda];
      const masIva = oferta.tramos.some(t => t.masIva);
      const bankCell = i === 0
        ? `<th rowspan="${monedas.length}" scope="rowgroup"><span class="bank-name">${bankLogo(banco)}${escapeHtml(banco.nombre)}</span><div class="small fw-normal text-muted">${escapeHtml(banco.tipo)}</div></th>`
        : '';
      rows.push(`<tr>
        ${bankCell}
        <td>${escapeHtml(MONEDAS[moneda])}</td>
        <td class="fw-semibold">${formatRate(lowestRate(banco, moneda), masIva)}</td>
        <td>${oferta.plazoMax} años</td>
        <td class="small">${escapeHtml(oferta.financiacion)}</td>
        <td class="small">${escapeHtml(oferta.cuotaIngreso)}</td>
      </tr>`);
    });
  });
  document.getElementById('ratesBody').innerHTML = rows.join('');
}

// ─── Tarjetas por banco ──────────────────────────────────────────────────────

function renderBankCards() {
  const list = items => items.map(t => `<li>${escapeHtml(t)}</li>`).join('');
  document.getElementById('bankCards').innerHTML = BANCOS.map(banco => {
    const tasas = Object.keys(banco.monedas)
      .map(m => `<span class="badge rounded-pill text-bg-light border me-1">${m === 'UYU' ? 'Pesos' : m} ${formatRate(lowestRate(banco, m), banco.monedas[m].tramos.some(t => t.masIva))}</span>`)
      .join('');
    const site = banco.url
      ? `<a href="${banco.url}" target="_blank" rel="noopener" class="small" data-track="sitio-del-banco/${banco.id}">Ver en el sitio del banco</a>`
      : '';
    return `<div class="col-md-6 col-xl-4" id="banco-${banco.id}">
      <div class="card h-100 bank-card" style="border-top-color:${banco.marca.color}">
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-start mb-2">
            <h3 class="h6 fw-bold mb-0 bank-name">${bankLogo(banco, 'lg')}${escapeHtml(banco.nombreLargo)}</h3>
            <span class="badge ${banco.tipo === 'Público' ? 'text-bg-primary' : 'text-bg-secondary'}">${escapeHtml(banco.tipo)}</span>
          </div>
          <div class="mb-3">${tasas}</div>
          <p class="small fw-semibold text-success mb-1">Puntos fuertes</p>
          <ul class="small ps-3 mb-3">${list(banco.fuertes)}</ul>
          <p class="small fw-semibold text-warning-emphasis mb-1">A tener en cuenta</p>
          <ul class="small ps-3 mb-2">${list(banco.atencion)}</ul>
          <p class="small text-muted mb-2">Ingreso mínimo: ${escapeHtml(banco.ingresoMinimo)}</p>
          ${site}
        </div>
      </div>
    </div>`;
  }).join('');
}

// ─── Fuentes ─────────────────────────────────────────────────────────────────

function renderSources() {
  const seen = new Set();
  const extra = [
    { titulo: 'BROU: beneficios exclusivos BHU', url: 'https://www.brou.com.uy/personas/cuentas/beneficios-exclusivos-bhu' },
    { titulo: 'gub.uy: Solicitud Fondo de Garantía de Créditos Hipotecarios (actualizado 05/06/2026)', url: 'https://www.gub.uy/tramites/solicitud-fondo-garantia-creditos-hipotecarios' },
    { titulo: 'gub.uy: guía de opciones para comprar vivienda', url: 'https://www.gub.uy/comprar' },
    { titulo: 'INGAR: comparativa de bancos 2026', url: 'https://ingar.com.uy/blog/comparativa-bancos-hipotecarios-uruguay' },
  ];
  const all = BANCOS.flatMap(b => b.fuentes).concat(extra).filter(f => {
    if (seen.has(f.url)) return false;
    seen.add(f.url);
    return true;
  });
  document.getElementById('sourcesList').innerHTML = all
    .map(f => `<li><a href="${f.url}" target="_blank" rel="noopener">${escapeHtml(f.titulo)}</a></li>`)
    .join('');
}
