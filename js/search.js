// ─── Búsqueda de propiedades ──────────────────────────────────────────────────
// Habla con el backend de server/. En desarrollo corre en localhost:3000; para
// otro lugar, definí window.SEARCH_API_URL antes de cargar este script.

const SEARCH_API_URL = window.SEARCH_API_URL || 'http://localhost:3000';
const SEARCH_TIMEOUT_MS = 60000;

const SOURCE_STATUS = {
  ok: { cls: 'success', text: f => `${f.cantidad} resultado${f.cantidad === 1 ? '' : 's'}` },
  enlace: { cls: 'secondary', text: () => 'Ver en el sitio' },
  'no-configurada': { cls: 'warning', text: () => 'No configurada' },
  error: { cls: 'danger', text: () => 'Error' },
};

document.addEventListener('DOMContentLoaded', () => {
  initDepartamentos();
  document.getElementById('searchForm').addEventListener('submit', onSearch);
  document.getElementById('btnToggleSearch').addEventListener('click', toggleSearchPanel);
  ['searchMaxPrice', 'searchTolerance'].forEach(id =>
    document.getElementById(id).addEventListener('input', updatePriceRange)
  );
});

/** La llama app.js después de simular: ofrece la búsqueda con el tope sugerido. */
function showPropertySearch(maxPriceUSD) {
  const price = Math.max(0, Math.floor(maxPriceUSD / 1000) * 1000);
  document.getElementById('searchSuggested').textContent = formatUSD(price).replace(/,00$/, '');
  document.getElementById('searchMaxPrice').value = price;
  document.getElementById('searchSection').classList.remove('d-none');
  updatePriceRange();
}

function toggleSearchPanel() {
  const panel = document.getElementById('searchPanel');
  const btn = document.getElementById('btnToggleSearch');
  const open = panel.classList.toggle('d-none') === false;
  btn.setAttribute('aria-expanded', String(open));
  btn.textContent = open ? 'Ocultar búsqueda' : 'Buscar casas';
  if (open) document.getElementById('searchMaxPrice').focus();
}

function initDepartamentos() {
  const select = document.getElementById('searchDepartamento');
  Object.keys(DEPARTAMENTOS).forEach(d => select.add(new Option(d, d, false, d === 'Montevideo')));
  select.addEventListener('change', renderLocalidades);
  renderLocalidades();
}

function renderLocalidades() {
  const depto = document.getElementById('searchDepartamento').value;
  const box = document.getElementById('searchLocalidades');
  document.getElementById('localidadesLabel').textContent = depto === 'Montevideo' ? 'Barrios' : 'Localidades';
  box.replaceChildren(...DEPARTAMENTOS[depto].map((loc, i) => {
    const wrap = document.createElement('div');
    wrap.className = 'form-check';
    const input = document.createElement('input');
    Object.assign(input, { type: 'checkbox', className: 'form-check-input', id: `loc${i}`, value: loc });
    const label = document.createElement('label');
    Object.assign(label, { className: 'form-check-label', htmlFor: `loc${i}`, textContent: loc });
    wrap.append(input, label);
    return wrap;
  }));
}

function getSearchCriteria() {
  return {
    precioMax: readNumber('searchMaxPrice'),
    tolerancia: readNumber('searchTolerance'),
    dormitorios: readNumber('searchBedrooms'),
    tipo: document.getElementById('searchTipo').value,
    departamento: document.getElementById('searchDepartamento').value,
    localidades: [...document.querySelectorAll('#searchLocalidades input:checked')].map(el => el.value),
  };
}

function validateSearch(c) {
  const checks = [
    ['searchMaxPrice', !(c.precioMax > 0), 'Debe ser mayor a 0.'],
    ['searchTolerance', !(c.tolerancia >= 0 && c.tolerancia <= 50), 'Debe estar entre 0 y 50 %.'],
    ['searchBedrooms', !(Number.isInteger(c.dormitorios) && c.dormitorios >= 0), 'Debe ser un número entero (0 = cualquiera).'],
  ];
  checks.forEach(([id, failed, msg]) => setFieldError(id, failed ? msg : ''));
  return checks.every(([, failed]) => !failed);
}

function updatePriceRange() {
  const { precioMax, tolerancia } = getSearchCriteria();
  const out = document.getElementById('searchRange');
  if (!(precioMax > 0) || !(tolerancia >= 0 && tolerancia <= 50)) {
    out.textContent = '';
    return;
  }
  const min = precioMax * (1 - tolerancia / 100);
  const max = precioMax * (1 + tolerancia / 100);
  out.textContent = `Se buscan propiedades entre ${formatUSD(min)} y ${formatUSD(max)}.`;
}

async function onSearch(e) {
  e.preventDefault();
  const c = getSearchCriteria();
  if (!validateSearch(c)) return;

  const params = new URLSearchParams({
    precioMax: c.precioMax,
    tolerancia: c.tolerancia,
    dormitorios: c.dormitorios,
    tipo: c.tipo,
    departamento: c.departamento,
    localidades: c.localidades.join(','),
  });

  const btn = document.getElementById('btnBuscar');
  const status = document.getElementById('searchStatus');
  btn.disabled = true;
  status.className = 'small text-muted my-3';
  status.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Buscando en los portales…';
  document.getElementById('searchSources').replaceChildren();
  document.getElementById('searchResults').replaceChildren();

  try {
    const res = await fetch(`${SEARCH_API_URL}/api/buscar?${params}`, { signal: AbortSignal.timeout(SEARCH_TIMEOUT_MS) });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || `Error ${res.status}`);
    renderSources(body.fuentes);
    renderResults(body.resultados);
    status.textContent = body.resultados.length
      ? `${body.resultados.length} propiedad${body.resultados.length === 1 ? '' : 'es'} encontrada${body.resultados.length === 1 ? '' : 's'}, de menor a mayor precio.`
      : 'No se encontraron propiedades con esos filtros. Probá con más tolerancia, menos dormitorios u otras localidades.';
  } catch (err) {
    status.className = 'alert alert-warning small my-3';
    status.textContent = err instanceof TypeError || err.name === 'TimeoutError'
      ? `No se pudo conectar con el buscador (${SEARCH_API_URL}). ¿Está corriendo el backend?`
      : `No se pudo completar la búsqueda: ${err.message}`;
  } finally {
    btn.disabled = false;
  }
}

function renderSources(fuentes) {
  document.getElementById('searchSources').replaceChildren(...fuentes.map(f => {
    const { cls, text } = SOURCE_STATUS[f.estado] || SOURCE_STATUS.error;
    const el = document.createElement(f.enlace ? 'a' : 'span');
    el.className = `badge text-bg-${cls} me-2 mb-2 source-badge`;
    el.textContent = `${f.nombre}: ${text(f)}`;
    if (f.mensaje) el.title = f.mensaje;
    if (f.enlace) Object.assign(el, { href: f.enlace, target: '_blank', rel: 'noopener' });
    return el;
  }));
}

function renderResults(resultados) {
  document.getElementById('searchResults').replaceChildren(...resultados.map(r => {
    const col = document.createElement('div');
    col.className = 'col-sm-6 col-lg-4';
    const card = document.createElement('a');
    Object.assign(card, { className: 'card h-100 property-card text-decoration-none', href: r.url, target: '_blank', rel: 'noopener' });

    if (r.imagen) {
      const img = document.createElement('img');
      Object.assign(img, { className: 'card-img-top', src: r.imagen, alt: '', loading: 'lazy' });
      card.append(img);
    }
    const body = document.createElement('div');
    body.className = 'card-body p-3';
    const price = document.createElement('div');
    price.className = 'fw-bold fs-5 text-body';
    price.textContent = formatUSD(r.precio).replace(/,00$/, '');
    const title = document.createElement('div');
    title.className = 'small text-body mb-1';
    title.textContent = r.titulo;
    const meta = document.createElement('div');
    meta.className = 'small text-muted';
    meta.textContent = [r.localidad, r.dormitorios != null ? `${r.dormitorios} dorm.` : null, r.fuente].filter(Boolean).join(' · ');
    body.append(price, title, meta);
    card.append(body);
    col.append(card);
    return col;
  }));
}
