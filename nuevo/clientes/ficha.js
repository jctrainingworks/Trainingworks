// Ficha de cliente: cabecera + barra de pestañas + la pestaña activa.
// Ruta: #/clientes/CODIGO/PESTAÑA. Cada pestaña vive en su propia carpeta y se registra en core/app.js.
import { esc } from '../core/ui.js';
import { PESTANA_INICIAL } from '../core/config.js';
import { etiquetasHtml } from './etiquetas.js';
import { calcularEstadoDescarga, DESCARGA_LABELS } from '../core/descarga.js';

function cabeceraHtml(c) {
  return `
    <button class="back-btn" data-volver>← Volver a clientes</button>
    <div class="detail-header">
      <div class="detail-name">${esc(c.nombre)}</div>
      <div class="detail-meta">
        <span class="client-code" style="margin-bottom:0;">${esc(c.codigo)}</span>
        ${etiquetasHtml(c)}
        ${c.nivel_atleta ? `<span class="tag tag-nivel">🏋️ ${esc(c.nivel_atleta)}</span>` : ''}
      </div>
    </div>`;
}

// Banner de descarga (igual que renderBannerDescarga de prueba/index.html): se ve en todas las pestañas.
function bannerDescargaHtml(c) {
  const tipo = calcularEstadoDescarga(c);
  if (!tipo) return '';
  const finFmt = c.descarga_fin ? new Date(c.descarga_fin + 'T00:00:00').toLocaleDateString('es-ES') : '';
  return `
    <div style="margin:14px 0;padding:12px 14px;border-radius:10px;background:rgba(255,180,0,0.08);border:1px solid rgba(255,180,0,0.35);display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
      <div style="color:#ffb400;font-size:13px;font-weight:700;">🔻 EN DESCARGA — ${esc(DESCARGA_LABELS[tipo] || tipo)}${finFmt ? ` · hasta ${esc(finFmt)}` : ''}</div>
      <button class="btn btn-ghost btn-xs" style="color:var(--danger);border-color:var(--danger);" data-terminar-descarga>Terminar descarga ahora</button>
    </div>`;
}

const barraHtml = (pestanas, activa) => `
  <div class="tabs ficha-tabs">
    ${pestanas.map(p => `<button class="tab ${p.id === activa ? 'active' : ''}" data-pestana="${esc(p.id)}">${p.icono} ${esc(p.etiqueta)}</button>`).join('')}
  </div>`;

// Pinta la ficha en `contenedor` y monta dentro la pestaña de la ruta. Devuelve { desmontar }.
export async function montarFicha(contenedor, ctx, cliente, idPestana) {
  const visibles = ctx.pestanas.lista().filter(p => !p.visible || p.visible(cliente));
  const activa = visibles.find(p => p.id === idPestana)
    || visibles.find(p => p.id === PESTANA_INICIAL)
    || visibles[0];

  contenedor.innerHTML = `${cabeceraHtml(cliente)}<div data-banner-descarga>${bannerDescargaHtml(cliente)}</div>${barraHtml(visibles, activa && activa.id)}<div data-pestana-cuerpo></div>`;

  const pintarBanner = () => {
    const caja = contenedor.querySelector('[data-banner-descarga]');
    if (caja) caja.innerHTML = bannerDescargaHtml(cliente);
  };

  async function terminarDescarga() {
    try {
      await ctx.api.tabla('clientes', { method: 'PATCH', filtro: `id=eq.${cliente.id}`, cuerpo: { modo_descarga: false } });
      cliente.modo_descarga = false;
      pintarBanner();
    } catch (e) {
      ctx.ui.alerta('No se pudo desactivar la descarga. ' + e.message, 'error');
    }
  }

  contenedor.addEventListener('click', e => {
    if (e.target.closest('[data-terminar-descarga]')) { terminarDescarga(); return; }
    const volver = e.target.closest('[data-volver]');
    if (volver) { ctx.navegar('clientes'); return; }
    const boton = e.target.closest('[data-pestana]');
    if (boton && boton.dataset.pestana !== (activa && activa.id)) {
      ctx.navegar(`clientes/${encodeURIComponent(cliente.codigo)}/${encodeURIComponent(boton.dataset.pestana)}`);
    }
  });

  if (!activa) return {};
  const cuerpo = contenedor.querySelector('[data-pestana-cuerpo]');
  cuerpo.innerHTML = ctx.ui.cargando();
  const ctxPestana = {
    ...ctx,
    cliente,
    // Los cambios se aplican al mismo objeto que usa la lista (caché de datos.clientes()).
    actualizarCliente: parcial => { Object.assign(cliente, parcial); pintarBanner(); }
  };
  try {
    cuerpo.innerHTML = '';
    const resultado = await activa.montar(cuerpo, ctxPestana);
    return resultado || {};
  } catch (e) {
    console.error(e);
    cuerpo.innerHTML = `<div class="alert alert-error">No se pudo cargar la pestaña "${esc(activa.etiqueta)}": ${esc(e.message)}</div>`;
    return {};
  }
}
