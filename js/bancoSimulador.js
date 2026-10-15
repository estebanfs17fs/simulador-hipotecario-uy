// Banco elegido en el simulador: carga su tasa y sus plazos, valida que acepte
// el préstamo y compara los bancos para el préstamo calculado.
// Usa los datos y cálculos de js/bancos.js.

function getSelectedBank() {
  const id = document.getElementById('bankSelect').value;
  return id ? findBank(id) : null;
}

/** Plazo más largo con tasa publicada (puede ser menor al plazo máximo del banco). */
function maxPublishedYears(oferta) {
  return Math.min(oferta.plazoMax, Math.max(...oferta.tramos.map(t => t.hastaAnios)));
}

function formatTea(tea) {
  return tea.toLocaleString('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';
}

function initBankSelect() {
  const select = document.getElementById('bankSelect');
  BANCOS.forEach(b => {
    const rates = Object.keys(b.monedas)
      .filter(m => m !== 'UYU')
      .map(m => `${m} ${formatTea(lowestRate(b, m))}`);
    select.add(new Option(`${b.nombre} (desde ${rates.join(' · ')})`, b.id));
  });
  select.addEventListener('change', () => {
    applyBankLimits('load');
    validateAll();
  });
  document.querySelectorAll('input[name="loanCurrency"]').forEach(el =>
    el.addEventListener('change', () => {
      applyBankLimits('clamp');
      validateAll();
    })
  );
  document.querySelectorAll('.js-consultado').forEach(el => { el.textContent = CONSULTADO; });
  renderRatesTeaser();
}

/** Selecciona un banco por id (desde la URL o desde la comparación). */
function selectBank(id, mode = 'load') {
  if (!findBank(id)) return false;
  document.getElementById('bankSelect').value = id;
  applyBankLimits(mode);
  return true;
}

/**
 * Ajusta tasa y plazos al banco elegido. 'load' carga el rango de plazos del
 * banco; 'clamp' mantiene los plazos escritos y solo los lleva dentro del rango.
 */
function applyBankLimits(mode) {
  const banco = getSelectedBank();
  const rateInput = document.getElementById('interestRate');
  const minInput = document.getElementById('minYears');
  const maxInput = document.getElementById('maxYears');
  rateInput.readOnly = Boolean(banco);
  if (!banco) {
    minInput.min = 1;
    maxInput.max = MAX_YEARS_LIMIT;
    return;
  }
  const oferta = banco.monedas[getLoanCurrency()];
  if (!oferta) return;
  const plazoMin = oferta.plazoMin ?? 1;
  minInput.min = plazoMin;
  maxInput.max = oferta.plazoMax;
  if (mode === 'load') {
    minInput.value = plazoMin;
    maxInput.value = maxPublishedYears(oferta);
    return;
  }
  const clamp = (input, lo, hi) => {
    if (input.value === '') return;
    input.value = Math.min(Math.max(Number(input.value), lo), hi);
  };
  clamp(minInput, plazoMin, oferta.plazoMax - 1);
  clamp(maxInput, plazoMin + 1, oferta.plazoMax);
}

/**
 * Carga la tasa del banco elegido según moneda, plazo máximo y monto, y devuelve
 * los problemas que el banco tiene con el préstamo ({ campo: mensaje }).
 */
function syncBank(v) {
  const bankInfo = document.getElementById('bankInfo');
  const rateInfo = document.getElementById('rateInfo');
  const banco = getSelectedBank();
  if (!banco) {
    bankInfo.textContent = '';
    rateInfo.textContent = '';
    return {};
  }

  const errors = validateBankLoan(banco, v);
  const oferta = banco.monedas[v.currency];
  if (!oferta) {
    bankInfo.textContent = '';
    rateInfo.textContent = '';
    return errors;
  }

  const loan = v.price - v.downPayment;
  const pct = maxFinancingPct(oferta, v.price, loan);
  const published = maxPublishedYears(oferta);
  bankInfo.innerHTML = `${escapeText(banco.nombre)} acepta plazos de ${oferta.plazoMin ?? 1} a ${oferta.plazoMax} años` +
    (published < oferta.plazoMax ? ` (publica tasa hasta ${published})` : '') +
    ` y financia hasta el ${pct}% del precio. ` +
    `<a href="financiamiento.html#bancos">Ver condiciones</a>`;

  const years = v.maxYears >= 1 ? Math.min(v.maxYears, oferta.plazoMax) : published;
  const amount = loan > 0 ? loan : (oferta.montoMinUSD ?? 0);
  const tramo = findTier(oferta, years, amount);
  if (!tramo) {
    rateInfo.textContent = `${banco.nombre} no publica tasa para ese plazo y monto.`;
    return errors;
  }
  const tna = teaToTna(tramo.tea);
  document.getElementById('interestRate').value = tna.toFixed(2);
  const shortTier = v.minYears >= 1 ? findTier(oferta, v.minYears, amount) : null;
  rateInfo.textContent =
    `TEA ${formatTea(tramo.tea)}${tramo.masIva ? ' + IVA' : ''} de ${banco.nombre} a ${years} años` +
    `${tramo.condicion ? ` (${tramo.condicion})` : ''}, equivale a ${formatTea(tna)} TNA.` +
    (shortTier && shortTier.tea < tramo.tea ? ` A ${v.minYears} años la tasa baja a ${formatTea(shortTier.tea)} TEA.` : '') +
    ' Para escribir otra tasa elegí "Ninguno".';
  return errors;
}

function escapeText(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ─── Tasas antes de calcular ─────────────────────────────────────────────────

function renderRatesTeaser() {
  const list = document.getElementById('ratesTeaserList');
  if (!list) return;
  list.innerHTML = BANCOS.map(b =>
    `<span class="rate-chip"><strong>${escapeText(b.nombre)}</strong> UI ${formatTea(lowestRate(b, 'UI'))}</span>`
  ).join('');
}

// ─── Comparación de bancos para el préstamo calculado ────────────────────────

function renderBankCompare(principalUSD, years, currency, xRate) {
  const selected = getSelectedBank();
  const rows = compareLoans(principalUSD, years, currency);
  document.getElementById('bankCompareIntro').textContent =
    `Préstamo de ${formatUSD(principalUSD)} a ${formatYears(years)} en ${MONEDAS[currency].toLowerCase()}, ` +
    'con la tasa publicada de cada banco, de menor a mayor cuota.' +
    (currency === 'UI' ? ' En UI la cuota está en valores de hoy y sube con la inflación.' : '');

  document.getElementById('bankCompareBody').innerHTML = rows.map(r => {
    const isSelected = selected && selected.id === r.banco.id;
    const name = `<strong>${escapeText(r.banco.nombre)}</strong>${isSelected ? ' <span class="badge text-bg-primary">Elegido</span>' : ''}`;
    if (!r.disponible) {
      return `<tr class="text-muted"><td>${name}</td><td colspan="4" class="small">${escapeText(r.motivo)}</td></tr>`;
    }
    const cond = r.tramo.condicion ? `<div class="small text-muted">${escapeText(r.tramo.condicion)}</div>` : '';
    const action = isSelected
      ? ''
      : `<button type="button" class="btn btn-outline-primary btn-sm" data-bank="${r.banco.id}">Usar</button>`;
    return `<tr${isSelected ? ' class="table-primary"' : ''}>
      <td>${name}${cond}</td>
      <td class="text-nowrap">${formatTea(r.tramo.tea)}${r.tramo.masIva ? ' + IVA' : ''}</td>
      <td class="fw-semibold text-nowrap">${formatUSD(r.cuota)}<div class="small text-muted fw-normal">${formatUYU(r.cuota * xRate)}</div></td>
      <td class="text-nowrap">${formatUSD(r.totalIntereses)}</td>
      <td class="text-end">${action}</td>
    </tr>`;
  }).join('');

  document.querySelectorAll('#bankCompareBody [data-bank]').forEach(btn =>
    btn.addEventListener('click', () => {
      selectBank(btn.dataset.bank, 'clamp');
      if (validateAll()) {
        document.getElementById('calcForm').requestSubmit();
      } else {
        document.getElementById('calcForm').scrollIntoView({ behavior: 'smooth' });
      }
    })
  );
}
