// Ficha de cliente: cabecera + barra de pestañas + la pestaña activa.
// Ruta: #/clientes/CODIGO/PESTAÑA. Cada pestaña vive en su propia carpeta y se registra en core/app.js.
import { esc } from '../core/ui.js';
import { PESTANA_INICIAL } from '../core/config.js';
import { etiquetasHtml } from './etiquetas.js';

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

  contenedor.innerHTML = `${cabeceraHtml(cliente)}${barraHtml(visibles, activa && activa.id)}<div data-pestana-cuerpo></div>`;

  contenedor.addEventListener('click', e => {
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
    actualizarCliente: parcial => Object.assign(cliente, parcial)
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
