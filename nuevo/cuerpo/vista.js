// Cuerpo · HTML de la pestaña. Copiado de prueba/index.html (renderSeguimientoCorporal,
// renderListaRegistrosSeguimiento, renderVeredicto, renderGraficasSeguimiento) con el mismo aspecto;
// cambia solo que los clics van por data-accion (delegación en index.js) en vez de onclick inline.
// Todo lo que viene de datos pasa por esc().
import { esc } from '../core/ui.js';
import {
  CAMPOS_SEGUIMIENTO, CATEGORIAS_SEGUIMIENTO, NIVEL_COLOR_MAP, VEREDICTO_CAT_LBL,
  generarInsightsSeguimiento, generarInsightsCheckin, calcularVeredicto
} from './calculos.js';

export const formatDate = iso => {
  if (!iso) return '';
  try { return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' }); } catch { return String(iso); }
};
export const formatDateShort = iso => {
  if (!iso) return '';
  try { return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }); } catch { return String(iso); }
};

export const vacioHtml = () => `
  <div class="empty">Todavía no hay registros de seguimiento corporal 📏<br>
    <span style="font-size:12px;color:#666;">Añade el primero con «＋ Añadir registro», o se rellenan solos cuando el cliente completa un check-in.</span></div>`;

// `est` = { graficasAbiertas, listaAbierta, categoriaAbierta: { [cat]: true } }
export function seguimientoHtml(datos, cliente, objetivo, est) {
  const abierto = !!est.graficasAbiertas;
  const listaAbierta = !!est.listaAbierta;
  return `
    <div style="border:1px solid #222;border-radius:12px;background:#0c0c0c;overflow:hidden;">
      <div data-accion="toggle-graficas" style="display:flex;justify-content:space-between;align-items:center;padding:16px 18px;cursor:pointer;flex-wrap:wrap;gap:8px;">
        <div style="color:#fff;font-weight:700;font-size:15px;">📏 Seguimiento corporal <span style="color:#888;font-weight:400;font-size:12px;">(${datos.length} registro${datos.length !== 1 ? 's' : ''})</span></div>
        <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;">
          <span data-accion="toggle-lista" style="color:#3b82f6;font-size:12px;font-weight:600;cursor:pointer;">${listaAbierta ? '▲ Ocultar registros' : '🗑️ Borrar registro suelto'}</span>
          <span data-accion="borrar-historial" style="color:#ff4444;font-size:12px;font-weight:600;cursor:pointer;">🗑️ Borrar historial</span>
          <span style="color:#3b82f6;font-size:13px;font-weight:700;">${abierto ? '▲ Ocultar' : '▼ Ver evolución'}</span>
        </div>
      </div>
      ${listaAbierta ? `<div style="padding:0 18px 14px;">${listaRegistrosHtml(datos)}</div>` : ''}
      ${abierto ? `<div style="padding:0 18px 18px;">${veredictoHtml(datos, objetivo, cliente.nivel_atleta)}${graficasHtml(datos, objetivo, cliente.nivel_atleta, est)}</div>` : ''}
    </div>`;
}

// Lista compacta de cada registro (fecha + origen) con botón de borrado por fila.
export function listaRegistrosHtml(datos) {
  const ordenados = datos.slice().sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  const filas = ordenados.map(d => {
    const fechaTxt = d.fecha ? formatDate(d.fecha) : 'Sin fecha';
    const origenTxt = d.origen === 'checkin' ? '✅ Check-in' : '📏 Manual / Nutrición';
    return `<div style="display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid #1a1a1a;">
      <span style="color:#ccc;font-size:12px;">${esc(fechaTxt)} <span style="color:#666;">— ${origenTxt}</span></span>
      <span data-accion="borrar-registro" data-id="${esc(d.id)}" title="Borrar este registro" style="cursor:pointer;color:#ff4444;font-size:13px;">🗑️</span>
    </div>`;
  }).join('');
  return `<div style="background:#0a0a0a;border:1px solid #1a1a1a;border-radius:8px;padding:4px 10px;">${filas}</div>`;
}

export function veredictoHtml(datos, objetivo, nivelAtleta) {
  const v = calcularVeredicto(datos, objetivo, nivelAtleta);
  if (!v) return '';
  return `
    <div style="background:#111;border:1px solid ${v.color}44;border-left:4px solid ${v.color};border-radius:12px;padding:16px 18px;margin-bottom:16px;">
      <div style="color:${v.color};font-weight:800;font-size:16px;margin-bottom:12px;">${v.icon} ${v.titulo}</div>
      ${v.lineas.map(l => `
        <div style="display:flex;gap:8px;font-size:13px;margin-bottom:8px;line-height:1.4;">
          <span style="color:${l.color};font-weight:700;white-space:nowrap;">${VEREDICTO_CAT_LBL[l.cat]}:</span>
          <span style="color:#ccc;">${l.txt}</span>
        </div>`).join('')}
      ${v.accion ? `
        <div style="margin-top:8px;padding-top:12px;border-top:1px solid #222;">
          <div style="font-size:13px;color:#ddd;margin-bottom:${v.accion.boton ? '10px' : '0'};line-height:1.4;">🎯 <b style="color:#bbb;">Qué tocar:</b> ${v.accion.txt}</div>
          ${v.accion.boton ? `<span data-accion="ir" data-ir="${esc(v.accion.ir)}" style="display:inline-block;background:${v.color};color:#000;font-weight:700;font-size:12px;padding:8px 14px;border-radius:8px;cursor:pointer;">${v.accion.boton}</span>` : ''}
        </div>` : ''}
    </div>`;
}

// Serie de un campo: los registros que tienen ese dato.
export const serieDeCampo = (datos, campo) =>
  datos.filter(d => campo.get(d) !== null && campo.get(d) !== undefined && campo.get(d) !== '');

// Una gráfica por cada dato con al menos 2 registros, agrupadas en categorías plegables.
// `datos` ya viene ordenado por fecha ascendente.
export function graficasHtml(datos, objetivo, nivelAtleta, est) {
  const ultimoConComp = datos.slice().reverse().find(d => d.composicion?.ire || d.composicion?.ipo);
  let totalGeneral = 0;
  let html = '';

  const insightsPorCategoria = {};
  [...generarInsightsSeguimiento(datos, objetivo, nivelAtleta), ...generarInsightsCheckin(datos)].forEach(i => {
    if (!i.categoria) return;
    (insightsPorCategoria[i.categoria] = insightsPorCategoria[i.categoria] || []).push(i);
  });

  CATEGORIAS_SEGUIMIENTO.forEach(cat => {
    const camposCat = CAMPOS_SEGUIMIENTO.filter(campo => campo.categoria === cat.id);
    let contenidoCat = '<div class="charts-grid">';
    let countCat = 0;

    camposCat.forEach(campo => {
      const serie = serieDeCampo(datos, campo);
      if (serie.length === 0) return;
      // El check-in es especial: con 1 solo envío ya se muestra el dato (sin gráfica de tendencia).
      if (serie.length === 1 && campo.categoria !== 'checkin') return;
      countCat++;
      const valores = serie.map(d => Number(campo.get(d)));
      const last = valores[valores.length - 1];
      const lastD = serie[serie.length - 1];
      let statHtml;
      if (campo.esNivel) {
        const nivelActual = campo.getNivel(lastD);
        const colorActual = NIVEL_COLOR_MAP[nivelActual] || '#888';
        statHtml = `<div style="color:${colorActual};font-size:12px;margin-top:10px;font-weight:bold;">ACTUAL: ${esc(campo.getDesc(lastD) || nivelActual)}</div>`;
      } else {
        const first = valores[0];
        const delta = Math.round((last - first) * 100) / 100;
        const nota = campo.getNota ? campo.getNota(lastD) : null;
        statHtml = `<div style="color:${campo.color};font-size:12px;margin-top:10px;font-weight:bold;">
            ACTUAL: ${esc(last)}${esc(campo.unidad)}${serie.length > 1 ? ` | ${delta > 0 ? '+' : ''}${esc(delta)}${esc(campo.unidad)} desde el primer registro` : ' (primer check-in, todavía sin tendencia)'}
          </div>${nota ? `<div style="color:#999;font-size:12px;margin-top:4px;font-weight:normal;font-style:italic;">💬 "${esc(nota)}"</div>` : ''}`;
      }
      contenidoCat += serie.length === 1
        ? `<div class="chart-card" style="background:#111;padding:15px;border-radius:12px;border:1px solid #222;">
             <div style="color:#fff;font-weight:700;margin-bottom:10px;">${campo.lbl}</div>
             ${statHtml}
           </div>`
        : `<div class="chart-card" style="background:#111;padding:15px;border-radius:12px;border:1px solid #222;">
          <div style="color:#fff;font-weight:700;margin-bottom:10px;">${campo.lbl}</div>
          <div style="height:150px;"><canvas data-grafica="${esc(campo.id)}"></canvas></div>
          ${statHtml}
        </div>`;
    });

    // IRE/IPO (no numéricos) van dentro de la categoría "Rendimiento"
    if (cat.id === 'rendimiento' && ultimoConComp) {
      const cp = ultimoConComp.composicion;
      if (cp.ire) {
        countCat++;
        contenidoCat += `
          <div class="chart-card" style="background:#111;padding:15px;border-radius:12px;border:1px solid #222;">
            <div style="color:#fff;font-weight:700;margin-bottom:10px;">Tipo de respondedor (IRE)</div>
            <div style="font-size:18px;font-weight:800;color:${cp.ire.color};">${cp.ire.cat}</div>
            <div style="font-size:12px;color:#999;margin-top:4px;">${cp.ire.sub}</div>
          </div>`;
      }
      if (cp.ipo) {
        countCat++;
        contenidoCat += `
          <div class="chart-card" style="background:#111;padding:15px;border-radius:12px;border:1px solid #222;">
            <div style="color:#fff;font-weight:700;margin-bottom:10px;">Prioridad (IPO)</div>
            <div style="font-size:18px;font-weight:800;color:${cp.ipo.color};">${cp.ipo.prioridad}</div>
            <div style="font-size:12px;color:#999;margin-top:4px;">${cp.ipo.desc}</div>
          </div>`;
      }
    }
    contenidoCat += '</div>';

    if (countCat === 0) return; // esta categoría no tiene datos suficientes todavía, no la mostramos
    totalGeneral += countCat;

    const catAbierta = !!(est.categoriaAbierta || {})[cat.id];
    // Máximo 2 avisos por sección: un vistazo rápido, no un informe.
    const insightsCat = (insightsPorCategoria[cat.id] || []).slice(0, 2);
    const resumenCatHtml = (catAbierta && insightsCat.length > 0) ? `
      <div style="padding:0 14px;">
        ${insightsCat.map(i => `
          <div style="background:#111;border:1px solid #222;border-left:3px solid ${i.color};border-radius:10px;padding:10px 12px;margin-top:10px;">
            <div style="display:flex;gap:6px;align-items:flex-start;font-size:12px;color:#ddd;line-height:1.4;">
              <span>${i.icon}</span><div>${i.txt}</div>
            </div>
            ${i.rec ? `<div style="margin-left:20px;margin-top:4px;font-size:11px;color:#999;">🎯 ${i.rec}</div>` : ''}
          </div>`).join('')}
      </div>` : '';
    html += `
      <div style="border:1px solid #1a1a1a;border-radius:10px;margin-bottom:10px;overflow:hidden;">
        <div data-accion="toggle-categoria" data-cat="${esc(cat.id)}" style="display:flex;justify-content:space-between;align-items:center;padding:12px 14px;background:#0a0a0a;cursor:pointer;">
          <span style="color:#fff;font-weight:700;font-size:13px;">${cat.lbl} <span style="color:#666;font-weight:400;font-size:11px;">(${countCat})</span></span>
          <span style="color:#3b82f6;font-size:12px;">${catAbierta ? '▲' : '▼'}</span>
        </div>
        ${resumenCatHtml}
        ${catAbierta ? `<div style="padding:14px;">${contenidoCat}</div>` : ''}
      </div>`;
  });

  if (totalGeneral === 0) {
    return '<div class="empty">Necesitas al menos 2 registros con el mismo dato para ver su evolución 📏<br><span style="font-size:12px;color:#666;">Añade otro registro para ver la evolución.</span></div>';
  }
  return html;
}
