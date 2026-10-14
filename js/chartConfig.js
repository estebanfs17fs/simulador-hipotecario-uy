let hipotecaChart = null;

function renderChart(chartData, canvasId = 'hipotecaChart') {
  // Si Chart.js no cargó (sin conexión al CDN) se muestran igual los escenarios.
  if (typeof Chart === 'undefined') {
    document.getElementById('chartContainer').textContent = 'No se pudo cargar la gráfica (sin conexión a Chart.js).';
    return;
  }
  const ctx = document.getElementById(canvasId).getContext('2d');
  if (hipotecaChart) hipotecaChart.destroy();

  hipotecaChart = new Chart(ctx, {
    type: 'line',
    data: chartData,
    options: {
      responsive: true,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { position: 'top' },
        title: {
          display: true,
          text: 'Cuota mensual (UYU) según plazo y tasa de interés',
          font: { size: 14 },
        },
        tooltip: {
          callbacks: {
            label: ctx => `${ctx.dataset.label}: ${formatUYU(ctx.parsed.y)}`,
            title: ctx => `Plazo: ${ctx[0].label} años`,
          },
        },
      },
      scales: {
        x: {
          title: { display: true, text: 'Años de préstamo' },
        },
        y: {
          title: { display: true, text: 'Cuota mensual (UYU)' },
          ticks: { callback: v => formatUYU(v) },
        },
      },
    },
  });
}
