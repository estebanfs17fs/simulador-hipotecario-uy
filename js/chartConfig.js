let hipotecaChart = null;

// Colores de la gráfica: tu tasa en el color de la marca; las tasas de comparación en gris.
const CHART_STYLE = {
  main: '#1f7a72',
  band: 'rgba(31, 122, 114, 0.09)',
  bandEdge: 'rgba(31, 122, 114, 0.35)',
  other: '#9aa1ab',
  ink: '#14213d',
  muted: '#566070',
  grid: '#e8ebef',
  font: "'IBM Plex Sans', system-ui, sans-serif",
};

/** Sombrea tu rango de cuota (mínima a máxima) detrás de las curvas. */
const paymentBandPlugin = {
  id: 'paymentBand',
  beforeDatasetsDraw(chart, _args, opts) {
    if (!opts?.min || !opts?.max) return;
    const { ctx, chartArea: area, scales: { y } } = chart;
    const top = Math.max(y.getPixelForValue(opts.max), area.top);
    const bottom = Math.min(y.getPixelForValue(opts.min), area.bottom);
    if (bottom <= top) return;
    ctx.save();
    ctx.fillStyle = CHART_STYLE.band;
    ctx.fillRect(area.left, top, area.right - area.left, bottom - top);
    ctx.strokeStyle = CHART_STYLE.bandEdge;
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    [top, bottom].forEach(py => {
      ctx.beginPath();
      ctx.moveTo(area.left, py + 0.5);
      ctx.lineTo(area.right, py + 0.5);
      ctx.stroke();
    });
    ctx.restore();
  },
};

/** Marca los escenarios sobre la curva de tu tasa, con su nombre arriba. */
const scenarioPointsPlugin = {
  id: 'scenarioPoints',
  afterDatasetsDraw(chart, _args, opts) {
    const points = opts?.points || [];
    if (!points.length) return;
    const { ctx, chartArea: area, scales: { x, y } } = chart;
    // Escenarios en el mismo plazo comparten punto y etiqueta.
    const byYear = new Map();
    points.forEach(p => {
      const key = p.years;
      if (!byYear.has(key)) byYear.set(key, { ...p, labels: [] });
      byYear.get(key).labels.push(p.label);
    });
    ctx.save();
    ctx.font = `500 12px ${CHART_STYLE.font}`;
    ctx.textAlign = 'center';
    byYear.forEach(p => {
      const px = x.getPixelForValue(chart.data.labels.indexOf(p.years));
      const py = y.getPixelForValue(p.payment);
      ctx.beginPath();
      ctx.arc(px, py, 5, 0, Math.PI * 2);
      ctx.fillStyle = CHART_STYLE.main;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#fff';
      ctx.stroke();
      // La etiqueta no se sale del área de la gráfica en los extremos.
      const text = p.labels.join(' · ');
      const half = ctx.measureText(text).width / 2;
      const tx = Math.min(Math.max(px, area.left + half), area.right - half);
      ctx.fillStyle = CHART_STYLE.ink;
      ctx.fillText(text, tx, py - 12);
    });
    ctx.restore();
  },
};

function renderChartLegend(chartData, mainIndex, hasBand) {
  const legend = document.getElementById('chartLegend');
  if (!legend) return;
  const item = (cls, text) => {
    const li = document.createElement('li');
    const swatch = document.createElement('span');
    swatch.className = `swatch ${cls}`;
    li.append(swatch, text);
    return li;
  };
  const items = chartData.datasets.map((ds, i) =>
    item(i === mainIndex ? 'swatch-main' : '', i === mainIndex ? `Tu tasa (${ds.label.replace('Tasa ', '')})` : ds.label)
  );
  if (hasBand) items.push(item('swatch-band', 'Tu rango de cuota'));
  legend.replaceChildren(...items);
}

function renderChart(chartData, { mainIndex = 1, band = null, points = [] } = {}, canvasId = 'hipotecaChart') {
  // Si Chart.js no cargó (sin conexión al CDN) se muestran igual los escenarios.
  if (typeof Chart === 'undefined') {
    document.getElementById('chartContainer').textContent = 'No se pudo cargar la gráfica (sin conexión a Chart.js).';
    return;
  }
  const ctx = document.getElementById(canvasId).getContext('2d');
  if (hipotecaChart) hipotecaChart.destroy();

  chartData.datasets.forEach((ds, i) => {
    const isMain = i === mainIndex;
    Object.assign(ds, {
      borderColor: isMain ? CHART_STYLE.main : CHART_STYLE.other,
      backgroundColor: isMain ? CHART_STYLE.main : CHART_STYLE.other,
      borderWidth: isMain ? 2.5 : 1.5,
      tension: 0,
      pointRadius: 0,
      pointHoverRadius: 4,
      order: isMain ? 0 : 1,
    });
  });
  renderChartLegend(chartData, mainIndex, Boolean(band));

  Chart.defaults.font.family = CHART_STYLE.font;
  Chart.defaults.color = CHART_STYLE.muted;

  hipotecaChart = new Chart(ctx, {
    type: 'line',
    data: chartData,
    plugins: [paymentBandPlugin, scenarioPointsPlugin],
    options: {
      responsive: true,
      maintainAspectRatio: false,
      layout: { padding: { top: 24, right: 8 } },
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        paymentBand: band,
        scenarioPoints: { points },
        tooltip: {
          backgroundColor: '#fff',
          titleColor: CHART_STYLE.ink,
          bodyColor: CHART_STYLE.ink,
          borderColor: '#e3e6eb',
          borderWidth: 1,
          padding: 10,
          boxPadding: 4,
          usePointStyle: true,
          callbacks: {
            label: ctx => `${ctx.dataset.label}: ${formatUYU(ctx.parsed.y)}`,
            title: ctx => `Plazo: ${ctx[0].label} años`,
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          border: { color: '#cfd4db' },
          ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 8, font: { size: 12 } },
          title: { display: true, text: 'Años de préstamo', font: { size: 12 } },
        },
        y: {
          grace: '8%',
          grid: { color: CHART_STYLE.grid },
          border: { display: false },
          ticks: {
            maxTicksLimit: 6,
            font: { size: 12 },
            callback: v => '$ ' + Number(v).toLocaleString('es-UY', { maximumFractionDigits: 0 }),
          },
        },
      },
    },
  });
}
