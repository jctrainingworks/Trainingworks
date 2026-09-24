// Gráficas con Chart.js (se carga bajo demanda desde cdnjs, como en el panel actual: si no carga,
// solo fallan las gráficas, no la app). Cada pestaña crea su propio juego con crearGraficas() y lo
// destruye al desmontarse.
import { cargarScript } from './ui.js';

const CHART_JS = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js';
const DATALABELS = 'https://cdnjs.cloudflare.com/ajax/libs/chartjs-plugin-datalabels/2.2.0/chartjs-plugin-datalabels.min.js';

export async function cargarChartJs() {
  if (!window.Chart) await cargarScript(CHART_JS);
  if (!window.ChartDataLabels) await cargarScript(DATALABELS).catch(() => {});
  try {
    if (window.ChartDataLabels && !window.Chart.registry.plugins.get('datalabels')) window.Chart.register(window.ChartDataLabels);
  } catch { /* sin etiquetas de datos, la gráfica sigue funcionando */ }
  return window.Chart;
}

export function crearGraficas() {
  const instancias = new Map();
  const nueva = (canvas, config) => {
    if (instancias.has(canvas)) instancias.get(canvas).destroy();
    instancias.set(canvas, new window.Chart(canvas, config));
  };

  return {
    // Una serie en el tiempo. flags[i] = true pinta el punto en ámbar (semana de descarga);
    // marcasBloque[i] = nombre pinta una línea vertical con el nombre del bloque en ese índice.
    async metrica(canvas, labels, valores, color, unidad = '', flags = [], marcasBloque = []) {
      if (!canvas) return;
      await cargarChartJs();
      const puntoColores = valores.map((_, i) => (flags[i] ? '#ffb400' : color));
      const hayMarcas = marcasBloque.some(Boolean);
      const pluginMarcasBloque = {
        id: 'marcasBloque',
        afterDraw(chart) {
          if (!hayMarcas) return;
          const { ctx, chartArea, scales } = chart;
          if (!chartArea || !scales.x) return;
          ctx.save();
          marcasBloque.forEach((nombreBloque, i) => {
            if (!nombreBloque) return;
            const x = scales.x.getPixelForValue(i);
            ctx.strokeStyle = 'rgba(255,255,255,0.28)';
            ctx.setLineDash([4, 3]);
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(x, chartArea.top); ctx.lineTo(x, chartArea.bottom); ctx.stroke();
            ctx.setLineDash([]);
            ctx.fillStyle = '#999';
            ctx.font = '9px sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(nombreBloque, Math.min(x + 3, chartArea.right - 4), chartArea.top + 9);
          });
          ctx.restore();
        }
      };
      nueva(canvas, {
        type: 'line',
        data: {
          labels,
          datasets: [{
            data: valores, borderColor: color, backgroundColor: color + '1A', fill: true, tension: 0.4,
            pointRadius: 4, pointBackgroundColor: puntoColores, pointBorderColor: puntoColores
          }]
        },
        plugins: [pluginMarcasBloque],
        options: {
          responsive: true, maintainAspectRatio: false, layout: { padding: { top: 30 } },
          plugins: {
            legend: { display: false },
            datalabels: {
              display: true, align: 'top', anchor: 'end', offset: 6,
              color: ctx => puntoColores[ctx.dataIndex] || color,
              font: { size: 10, weight: '700' }, formatter: v => `${v}${unidad}`
            }
          },
          scales: { y: { grid: { color: '#222' }, ticks: { color: '#666' } }, x: { grid: { display: false }, ticks: { color: '#666' } } }
        }
      });
    },

    // Dos series con ejes distintos: VO2máx (izq.) y FC (der., solo si hay datos).
    async dobleEje(canvas, labels, valores1, valores2, { color1 = '#3b82f6', color2 = '#ef4444' } = {}) {
      if (!canvas) return;
      await cargarChartJs();
      const hayDos = (valores2 || []).some(v => v != null);
      const datasets = [{ label: 'VO2máx', data: valores1, borderColor: color1, backgroundColor: color1 + '1A', fill: false, tension: 0.4, pointRadius: 4, yAxisID: 'y' }];
      if (hayDos) datasets.push({ label: 'FC', data: valores2, borderColor: color2, backgroundColor: color2 + '1A', fill: false, tension: 0.4, pointRadius: 4, yAxisID: 'y1' });
      nueva(canvas, {
        type: 'line',
        data: { labels, datasets },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false }, datalabels: { display: false } },
          scales: {
            y: { position: 'left', grid: { color: '#222' }, ticks: { color: color1 } },
            y1: hayDos ? { position: 'right', grid: { display: false }, ticks: { color: color2 } } : { display: false },
            x: { grid: { display: false }, ticks: { color: '#666' } }
          }
        }
      });
    },

    destruirTodas() { instancias.forEach(g => g.destroy()); instancias.clear(); }
  };
}
