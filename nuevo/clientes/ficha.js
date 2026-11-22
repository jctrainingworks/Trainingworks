// Ficha de cliente: cabecera + barra de pestañas + la pestaña activa.
// Ruta: #/clientes/CODIGO/PESTAÑA. Cada pestaña vive en su propia carpeta y se registra en core/app.js.
import { esc } from '../core/ui.js';
import { PESTANA_INICIAL } from '../core/config.js';
import { etiquetasHtml } from './etiquetas.js';
import { calcularEstadoDescarga, DESCARGA_LABELS } from '../core/descarga.js';
import { ICONOS_PESTANA } from './iconos.js';
import { fechaRenovacionCliente } from '../core/renovacion.js';
import { BLOQUE_TIPOS } from '../core/atr.js';
import { fechaLocalISO, mesocicloVigente } from '../periodizacion/calculos.js';
import { cargarEtapasCliente } from '../etapas/datos.js';
import { franjaEtapaHtml } from '../etapas/vista.js';
import { abrirFormularioCliente } from './formulario.js';
import { abrirMensajeCliente } from './mensaje.js';
import { abrirResumenCliente } from './resumen.js';
import { mesociclosVisibles, setVistaEtapa } from '../etapas/calculos.js';

function cabeceraHtml(c) {
  return `
    <button class="back-btn" data-volver style="margin-bottom:12px;">← Volver a clientes</button>
    <div class="detail-header dh-compact">
      <div class="dh-left">
        <div class="detail-name">${esc(c.nombre)}</div>
        <div class="detail-meta">
          <span class="client-code" style="margin-bottom:0;">${esc(c.codigo)}</span>
          ${etiquetasHtml(c)}
          ${c.nivel_atleta ? `<span class="tag tag-nivel">🏋️ ${esc(c.nivel_atleta)}</span>` : ''}
        </div>
      </div>
      <div class="dh-actions">
        <button class="btn btn-primary btn-sm" data-accion-cabecera="editar">✏️ Editar cliente</button>
        <button class="btn btn-ghost btn-sm" data-accion-cabecera="resumen">📄 Resumen PDF</button>
        <button class="btn btn-ghost btn-sm" data-accion-cabecera="mensaje">🔔 Mensaje</button>
      </div>
    </div>`;
}

// «Mesociclo activo» (de la etapa actual) y «Renovación» (días restantes en rojo/ámbar/verde).
export function lineaFichaHtml(c, mesociclos, etapas) {
  const r = fechaRenovacionCliente(c);
  const act = mesocicloVigente(mesociclosVisibles(mesociclos, etapas));
  const bt = act && act.tipo_atr && BLOQUE_TIPOS[act.tipo_atr] ? BLOQUE_TIPOS[act.tipo_atr].label : null;
  const prox = act && act.fecha_inicio && String(act.fecha_inicio).slice(0, 10) > fechaLocalISO();
  const blq = act ? ((bt || ((act.nombre || 'Bloque') + (act.numero != null ? ' ' + act.numero : ''))) + (prox ? ' (próximo)' : '')) : '—';
  const rc = r ? (r.dias <= 7 ? 'var(--danger)' : r.dias <= 21 ? 'var(--warning)' : 'var(--success)') : 'var(--muted)';
  return `<div class="detail-line">
    <span><span class="dl-lbl">Mesociclo activo</span> <b>${esc(blq)}</b></span>
    <span class="dl-sep"></span>
    <span><span class="dl-lbl">Renovación</span> <b>${r ? esc(r.texto) : '—'}</b>${r ? ` <span class="stat-chip" style="color:${rc};">${r.dias} d</span>` : ''}</span>
  </div>`;
}

// Banner de descarga (igual que renderBannerDescarga de prueba/index.html): se ve en todas las pestañas.
function bannerDescargaHtml(c) {
  const tipo = calcularEstadoDescarga(c);
  if (!tipo) return '';
  const finFmt = c.descarga_fin ? new Date(c.descarga_fin + 'T00:00:00').toLocaleDateString('es-ES') : '';
  return `
    <div style="margin:14px 0;padding:12px 14px;border-radius:10px;background:rgba(255,180,0,0.08);border:1px solid rgba(255,180,0,0.35);display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
      <div style="color:#ffb400;font-size:13px;font-weight:700;">${tipo === 'completa' ? '😴' : '🔻'} ${tipo === 'completa' ? 'EN' : 'EN DESCARGA —'} ${tipo === 'completa' ? 'DESCANSO TOTAL' : esc(DESCARGA_LABELS[tipo] || tipo)}${finFmt ? ` · hasta ${esc(finFmt)}` : ''}</div>
      <button class="btn btn-ghost btn-xs" style="color:var(--danger);border-color:var(--danger);" data-terminar-descarga>Terminar ahora</button>
    </div>`;
}

const barraHtml = (pestanas, activa) => `
  <div class="tabs tabs-ico tabs-sticky ficha-tabs">
    ${pestanas.map(p => `<button class="tab ${p.id === activa ? 'active' : ''}" data-pestana="${esc(p.id)}"><span class="tab-ico">${ICONOS_PESTANA[p.id] || esc(p.icono)}</span><span class="tab-lbl">${esc(p.etiqueta)}</span></button>`).join('')}
  </div>`;

// Pinta la ficha en `contenedor` y monta dentro la pestaña de la ruta. Devuelve { desmontar }.
export async function montarFicha(contenedor, ctx, cliente, idPestana) {
  const visibles = ctx.pestanas.lista().filter(p => !p.visible || p.visible(cliente));
  const activa = visibles.find(p => p.id === idPestana)
    || visibles.find(p => p.id === PESTANA_INICIAL)
    || visibles[0];

  // Mesociclos y etapas del cliente, solo para la línea «Mesociclo activo» y la franja de vista. Si fallan, la ficha sigue.
  const [mesociclos, etapas] = await Promise.all([
    ctx.api.tabla('mesociclos', { filtro: `cliente_id=eq.${cliente.id}&order=numero.asc` }).catch(() => []),
    cargarEtapasCliente(ctx.api, cliente.id)
  ]);
  contenedor.innerHTML = `<div data-cabecera>${cabeceraHtml(cliente)}</div><div data-banner-descarga>${bannerDescargaHtml(cliente)}</div><div data-linea-ficha>${lineaFichaHtml(cliente, mesociclos, etapas)}</div><div data-franja-etapa>${franjaEtapaHtml(etapas)}</div>${barraHtml(visibles, activa && activa.id)}<div data-pestana-cuerpo></div>`;

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
    const vista = e.target.closest('[data-vista-etapa]');
    if (vista) {
      // Cambia «Etapa actual / Todo el historial» para todo el panel y repinta la pestaña abierta.
      setVistaEtapa(vista.dataset.vistaEtapa);
      pintarLineaYFranja();
      montarActiva();
      return;
    }
    const accion = e.target.closest('[data-accion-cabecera]');
    if (accion) {
      if (accion.dataset.accionCabecera === 'editar') {
        abrirFormularioCliente({ ctx, cliente, alTerminar: async () => {
          // El cliente se actualizó en el mismo objeto de la caché: se repinta la cabecera y la pestaña abierta.
          contenedor.querySelector('[data-cabecera]').innerHTML = cabeceraHtml(cliente);
          pintarBanner(); pintarLineaYFranja(); await montarActiva();
        } });
      }
      if (accion.dataset.accionCabecera === 'mensaje') abrirMensajeCliente({ ctx, cliente });
      if (accion.dataset.accionCabecera === 'resumen') abrirResumenCliente({ ctx: ctxPestana });
      return;
    }
    if (e.target.closest('[data-terminar-descarga]')) { terminarDescarga(); return; }
    const volver = e.target.closest('[data-volver]');
    if (volver) { ctx.navegar('clientes'); return; }
    const boton = e.target.closest('[data-pestana]');
    if (boton && boton.dataset.pestana !== (activa && activa.id)) {
      ctx.navegar(`clientes/${encodeURIComponent(cliente.codigo)}/${encodeURIComponent(boton.dataset.pestana)}`);
    }
  });

  if (!activa) return {};
  let mesociclosFicha = mesociclos, etapasFicha = etapas;
  const pintarLineaYFranja = () => {
    const f = contenedor.querySelector('[data-franja-etapa]'), l = contenedor.querySelector('[data-linea-ficha]');
    if (f) f.innerHTML = franjaEtapaHtml(etapasFicha);
    if (l) l.innerHTML = lineaFichaHtml(cliente, mesociclosFicha, etapasFicha);
  };
  const ctxPestana = {
    ...ctx,
    cliente,
    // Los cambios se aplican al mismo objeto que usa la lista (caché de datos.clientes()).
    actualizarCliente: parcial => { Object.assign(cliente, parcial); pintarBanner(); pintarLineaYFranja(); },
    // Las pestañas que cambian bloques o etapas lo avisan para que la línea «Mesociclo activo» y la franja se actualicen.
    refrescarFicha: async () => {
      [mesociclosFicha, etapasFicha] = await Promise.all([
        ctx.api.tabla('mesociclos', { filtro: `cliente_id=eq.${cliente.id}&order=numero.asc` }).catch(() => mesociclosFicha),
        cargarEtapasCliente(ctx.api, cliente.id)
      ]);
      pintarLineaYFranja();
    }
  };
  let resultado = {};
  let version = 0;
  async function montarActiva() {
    const mia = ++version;
    const actual = contenedor.querySelector('[data-pestana-cuerpo]');
    const nuevo = actual.cloneNode(false); // caja nueva: suelta los listeners de la pestaña anterior
    actual.replaceWith(nuevo);
    nuevo.innerHTML = ctx.ui.cargando();
    try {
      nuevo.innerHTML = '';
      const r = await activa.montar(nuevo, ctxPestana);
      if (mia === version) resultado = r || {};
    } catch (e) {
      console.error(e);
      nuevo.innerHTML = `<div class="alert alert-error">No se pudo cargar la pestaña "${esc(activa.etiqueta)}": ${esc(e.message)}</div>`;
    }
  }
  await montarActiva();
  return resultado;
}
