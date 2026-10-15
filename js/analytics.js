// ─── Estadísticas de uso ──────────────────────────────────────────────────────
// Cuenta visitas y acciones con GoatCounter (gratis, sin cookies ni datos
// personales). Si ANALYTICS_CODE está vacío no se carga nada.
// Para activarlo: creá una cuenta en https://www.goatcounter.com, elegí un código
// (por ejemplo "simulador-uy") y ponelo acá. Las estadísticas se ven en
// https://<código>.goatcounter.com.

const ANALYTICS_CODE = window.ANALYTICS_CODE ?? 'maomao';

const analyticsQueue = [];

(function loadAnalytics() {
  if (!ANALYTICS_CODE) return;
  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://gc.zgo.at/count.js';
  script.dataset.goatcounter = `https://${ANALYTICS_CODE}.goatcounter.com/count`;
  script.addEventListener('load', () => {
    analyticsQueue.splice(0).forEach(sendEvent);
  });
  document.head.appendChild(script);
})();

function sendEvent(name) {
  window.goatcounter.count({ path: name, title: name, event: true });
}

/**
 * Registra una acción. Los nombres van como rutas para agruparlos en el panel,
 * por ejemplo "calcular/UI/bbva" o "banco/santander".
 */
function track(name) {
  if (!ANALYTICS_CODE) return;
  if (window.goatcounter?.count) sendEvent(name);
  else analyticsQueue.push(name);
}

// Los enlaces y botones con data-track="nombre" se registran al hacer clic.
document.addEventListener('click', e => {
  const el = e.target.closest('[data-track]');
  if (el) track(el.dataset.track);
});
