// Lista de clientes agrupada en ONLINE / PRESENCIAL / DEMO (clonado de renderClients/renderClientCard).
import { esc } from '../core/ui.js';
import { ICONO_ONLINE, ICONO_PRESENCIAL } from './iconos.js';
import { esPresencial, etiquetasHtml } from './etiquetas.js';

const SESIONES_POR_PLAN = { SESION_SUELTA: 1, BONO_8: 8, BONO_12: 12 };

function sesionesRestantesHtml(c, sesiones) {
  if (!esPresencial(c)) return '';
  const total = SESIONES_POR_PLAN[(c.plan || '').toUpperCase()] || 0;
  if (!total) return '';
  const usadas = sesiones.filter(s => s.codigo_cliente === c.codigo).length;
  const restantes = Math.max(0, total - usadas);
  const pct = Math.round((restantes / total) * 100);
  const color = restantes <= 1 ? 'var(--danger)' : restantes <= 3 ? 'var(--warning)' : 'var(--success)';
  return `
    <div class="sesiones-restantes">
      <div class="fila"><span>SESIONES RESTANTES</span><span style="color:${color};font-weight:700;">${restantes}/${total}</span></div>
      <div class="barra"><div style="width:${pct}%;background:${color};"></div></div>
    </div>`;
}

function tarjeta(c, sesiones) {
  return `
    <div class="client-card ${c.es_demo ? 'es-demo' : ''}" data-cliente="${esc(c.codigo)}">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
        <div class="client-name" style="margin-bottom:0;">${esc(c.nombre)}</div>
        <div style="display:flex;align-items:center;gap:8px;">${esPresencial(c) ? ICONO_PRESENCIAL : ICONO_ONLINE}</div>
      </div>
      <div class="client-code">${esc(c.codigo)}</div>
      <div class="client-tags">${etiquetasHtml(c)}</div>
      ${sesionesRestantesHtml(c, sesiones)}
    </div>`;
}

function grupo(titulo, icono, lista, sesiones, estiloTitulo = '') {
  if (!lista.length) return '';
  return `
    <div class="clients-section-header" ${estiloTitulo ? `style="${estiloTitulo}"` : ''}>${icono} ${titulo} <span class="clients-section-count">${lista.length}</span></div>
    <div class="client-grid" style="margin-bottom:32px;">${lista.map(c => tarjeta(c, sesiones)).join('')}</div>`;
}

export function pintarLista(clientes, sesiones) {
  const reales = clientes.filter(c => !c.es_demo);
  const online = reales.filter(c => !esPresencial(c));
  const presenciales = reales.filter(esPresencial);
  const demos = clientes.filter(c => c.es_demo);
  return `
    <div class="clientes-cabecera">
      <div>
        <div class="page-title">Clientes</div>
        <div class="page-sub">${clientes.length} cliente${clientes.length !== 1 ? 's' : ''} registrados</div>
      </div>
    </div>
    ${clientes.length === 0
      ? '<div class="empty">No hay clientes aún.</div>'
      : grupo('ONLINE', ICONO_ONLINE, online, sesiones)
        + grupo('PRESENCIAL', ICONO_PRESENCIAL, presenciales, sesiones)
        + grupo('DEMO', '🧪', demos, sesiones, 'color:#c4b5fd;')}`;
}
