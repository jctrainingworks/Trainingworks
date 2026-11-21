// Lista de clientes agrupada en ONLINE / PRESENCIAL / DEMO (clonado de renderClients/renderClientCard).
import { esc } from '../core/ui.js';
import { ICONO_ONLINE, ICONO_PRESENCIAL } from './iconos.js';
import { esPresencial, etiquetasHtml } from './etiquetas.js';
import { fechaRenovacionCliente } from '../core/renovacion.js';

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
  const presencial = esPresencial(c);
  const r = fechaRenovacionCliente(c);
  return `
    <div class="client-card ${c.es_demo ? 'es-demo' : ''}" data-cliente="${esc(c.codigo)}" data-modalidad="${c.es_demo ? 'demo' : (presencial ? 'presencial' : 'online')}" data-busca="${esc(((c.nombre || '') + ' ' + (c.codigo || '')).toLowerCase())}">
      <div class="client-top">
        <div class="client-id"><div class="client-name" style="margin-bottom:0;">${esc(c.nombre)}</div><div class="client-code">${esc(c.codigo)}</div></div>
        <div style="display:flex;align-items:center;gap:8px;">
          ${presencial ? ICONO_PRESENCIAL : ICONO_ONLINE}
          <button class="card-more" data-mas title="Más opciones">⋯</button>
          <button class="btn btn-danger btn-xs card-del" data-eliminar="${esc(c.codigo)}" data-nombre="${esc(c.nombre)}" title="Eliminar cliente">Eliminar</button>
        </div>
      </div>
      <div class="client-meta"><div class="client-tags">${etiquetasHtml(c)}</div>
      ${r && !presencial ? `<div class="client-renov">Renov. <b>${esc(r.texto)}</b></div>` : ''}</div>
      ${sesionesRestantesHtml(c, sesiones)}
    </div>`;
}

export function pintarLista(clientes, sesiones) {
  const reales = clientes.filter(c => !c.es_demo);
  const online = reales.filter(c => !esPresencial(c));
  const presenciales = reales.filter(esPresencial);
  const demos = clientes.filter(c => c.es_demo);
  return `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:28px;" class="clients-header">
      <div><div class="page-title" style="margin-bottom:0">Clientes</div></div>
      <div style="display:flex;gap:8px;">
        <button class="btn btn-primary" data-nuevo-cliente>+ Nuevo Cliente</button>
        <button class="btn" data-cliente-demo style="background:#2a1a4a;border:1px solid #7c3aed;color:#c4b5fd;">🧪 Cliente demo</button>
      </div>
    </div>
    <div class="cf-bar">
      <div class="cf-seg">
        <button class="cf-chip on" data-modo="todos">Todos ${clientes.length}</button>
        <button class="cf-chip" data-modo="online">Online ${online.length}</button>
        <button class="cf-chip" data-modo="presencial">Presencial ${presenciales.length}</button>
        ${demos.length ? `<button class="cf-chip" data-modo="demo">Demo ${demos.length}</button>` : ''}
      </div>
      <input class="cf-search" type="search" placeholder="Buscar por nombre o código..." data-buscar>
    </div>
    ${clientes.length === 0
      ? '<div class="empty">No hay clientes aún. ¡Añade el primero!</div>'
      : `<div class="client-grid client-grid-compact">${[...online, ...presenciales, ...demos].map(c => tarjeta(c, sesiones)).join('')}</div>`}`;
}

// Filtra las tarjetas ya pintadas por modalidad y texto (nombre o código), sin repintar.
export function filtrarTarjetas(contenedor, { modo = 'todos', q = '' }) {
  contenedor.querySelectorAll('.cf-chip').forEach(b => b.classList.toggle('on', b.dataset.modo === modo));
  const texto = q.toLowerCase().trim();
  contenedor.querySelectorAll('.client-card').forEach(card => {
    const okModo = modo === 'todos' || card.dataset.modalidad === modo;
    const okQ = !texto || (card.dataset.busca || '').includes(texto);
    card.style.display = okModo && okQ ? '' : 'none';
  });
}
