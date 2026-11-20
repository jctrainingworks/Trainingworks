// Planificación: HTML. Solo pinta.
import { esc } from '../core/ui.js';
import { BLOQUE_TIPOS, CSD_TIPOS, CSD_ORDEN, ATR_TIPOS } from '../core/atr.js';
import { fechaLocalISO, dia, nombreModelo, EVENTOS_TIPOS } from '../periodizacion/calculos.js';
import { PLANIF_ANTES, PLANIF_DESPUES } from './calculos.js';

const DIA = 86400000;
const fp = v => new Date(dia(v) + 'T00:00:00');
const fmt = d => d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }).replace(/\./g, '');
const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
export const lab = m => (m && m.tipo_atr && BLOQUE_TIPOS[m.tipo_atr]) ? BLOQUE_TIPOS[m.tipo_atr].label : 'Sin tipo';
const col = m => (m && m.tipo_atr && BLOQUE_TIPOS[m.tipo_atr]) ? BLOQUE_TIPOS[m.tipo_atr].color : '#3a3a3a';

export function planificacionHtml({ activos, filas, proximos }) {
  const hoy = fechaLocalISO(), hoyD = fp(hoy);
  const ini = new Date(hoyD.getTime() - PLANIF_ANTES * DIA), fin = new Date(hoyD.getTime() + PLANIF_DESPUES * DIA);
  const total = (fin - ini) / DIA + 1;
  const pct = d => (d - ini) / DIA / total * 100;

  const resumen = `
    <div class="pz-card">
      <div class="pz-title">📌 Esta semana</div>
      ${proximos.length ? proximos.map(r => `<div style="font-size:13px;color:#e6edf7;padding:3px 0;"><b>${esc(r.c.nombre)}</b> <span style="color:#9aa8bf;">· ${esc(lab(r.vig))} → ${esc(r.textoCambio.replace(/^Cambia a /, ''))}</span></div>`).join('') : '<div style="font-size:13px;color:#8b98ad;">Nadie cambia de fase en los próximos 7 días.</div>'}
      ${filas.some(r => r.conflicto) ? `<div style="font-size:12px;color:#f59e0b;margin-top:8px;">⚠️ Evento (viaje, puente, vacaciones) en Carga o Sobrecarga: ${filas.filter(r => r.conflicto).map(r => esc(r.c.nombre)).join(', ')}</div>` : ''}
    </div>`;

  const ticks = [];
  for (let m = new Date(ini.getFullYear(), ini.getMonth() + 1, 1); m <= fin; m = new Date(m.getFullYear(), m.getMonth() + 1, 1)) {
    ticks.push(`<div style="position:absolute;left:${pct(m)}%;top:0;border-left:1px dashed #34405A;padding-left:3px;font-size:10px;color:#8b98ad;white-space:nowrap;">${MES[m.getMonth()]}${m.getMonth() === 0 ? ' ' + String(m.getFullYear()).slice(2) : ''}</div>`);
  }
  const cabecera = `<div style="padding:0 15px;margin-bottom:4px;"><div style="position:relative;height:16px;">${ticks.join('')}<div style="position:absolute;left:${pct(hoyD)}%;top:0;transform:translateX(-50%);font-size:10px;font-weight:700;color:#e8ff00;">hoy</div></div></div>`;

  const tarjeta = r => {
    const { c, bl, vig, evs } = r;
    const bandas = bl.map(m => {
      const a0 = fp(m.fecha_inicio), b0 = m.fecha_fin ? fp(m.fecha_fin) : (hoyD > a0 ? hoyD : a0);
      if (b0 < ini || a0 > fin) return '';
      const a = a0 < ini ? ini : a0, b = b0 > fin ? fin : b0;
      const ancho = ((b - a) / DIA + 1) / total * 100;
      return `<div title="${esc(lab(m) + ' · ' + fmt(a0) + ' → ' + fmt(b0))}" style="position:absolute;left:${pct(a)}%;width:${ancho}%;top:0;bottom:0;background:${col(m)};border-radius:4px;overflow:hidden;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#fff;white-space:nowrap;${vig && vig.id === m.id ? 'box-shadow:0 0 0 2px #fff inset;' : ''}">${ancho > 12 ? esc(lab(m)) : (ancho > 6 ? esc(lab(m).slice(0, 3)) : '')}</div>`;
    }).join('');
    const evBars = evs.filter(e => e.desde && fp(e.hasta || e.desde) >= ini && fp(e.desde) <= fin).map(e => {
      const a0 = fp(e.desde), b0 = fp(e.hasta || e.desde);
      const a = a0 < ini ? ini : a0, b = b0 > fin ? fin : b0;
      const t = EVENTOS_TIPOS[e.tipo] || EVENTOS_TIPOS.otro;
      return `<div title="${esc(t.label + (e.titulo ? ': ' + e.titulo : '') + ' · ' + fmt(a0) + (b0 > a0 ? ' → ' + fmt(b0) : ''))}" style="position:absolute;left:${pct(a)}%;width:${Math.max(1.2, ((b - a) / DIA + 1) / total * 100)}%;top:0;bottom:0;background:${t.color};border-radius:3px;"></div>`;
    }).join('');
    let sem = '';
    if (vig && dia(vig.fecha_inicio) <= hoy) {
      const n = Math.floor((hoyD - fp(vig.fecha_inicio)) / DIA / 7) + 1;
      const tot = vig.fecha_fin ? Math.max(1, Math.round(((fp(vig.fecha_fin) - fp(vig.fecha_inicio)) / DIA + 1) / 7)) : null;
      sem = ` · sem ${n}${tot ? '/' + tot : ''}`;
    }
    return `
    <div class="pz-card" style="padding:12px 14px;margin-bottom:10px;">
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:8px;">
        <button data-abrir="${esc(c.codigo)}" style="background:none;border:none;padding:0;color:#fff;font-size:15px;font-weight:700;cursor:pointer;text-align:left;" title="Abrir su pestaña Periodización">${esc(c.nombre)}</button>
        <span style="font-size:10px;font-weight:700;color:#8fa3b8;border:1px solid #34405A;border-radius:999px;padding:1px 7px;">${esc(nombreModelo(c.modelo_periodizacion || 'ATR'))}</span>
        ${vig ? `<span style="padding:2px 10px;border-radius:999px;font-size:12px;font-weight:800;color:#fff;background:${col(vig)};">${esc(lab(vig))}${sem}</span>` : ''}
        ${r.conflicto ? '<span title="Hay un viaje, puente o vacaciones en Carga o Sobrecarga" style="font-size:12px;">⚠️</span>' : ''}
        <span style="margin-left:auto;font-size:12px;color:#9aa8bf;">${esc(r.textoCambio)}</span>
      </div>
      <div style="position:relative;height:22px;background:#212A39;border:1px solid #2E384A;border-radius:6px;">${bandas}<div style="position:absolute;left:${pct(hoyD)}%;top:-3px;bottom:-3px;border-left:2px solid #e8ff00;"></div></div>
      ${evBars ? `<div style="position:relative;height:6px;margin-top:4px;">${evBars}</div>` : ''}
    </div>`;
  };

  const leyenda = [...CSD_ORDEN.map(k => CSD_TIPOS[k]), { label: 'Acumulación', color: ATR_TIPOS.acu_carga.color }, { label: 'Transformación', color: ATR_TIPOS.tra_aproximacion.color }, { label: 'Realización', color: ATR_TIPOS.rea_competicion.color }]
    .map(t => `<span style="display:inline-flex;align-items:center;gap:5px;font-size:11px;color:#888;margin-right:12px;"><span style="width:8px;height:8px;border-radius:50%;background:${t.color};display:inline-block;"></span>${esc(t.label)}</span>`).join('');

  return `
    <div class="page-title">Planificación</div>
    <div style="font-size:12px;color:var(--muted);margin:-6px 0 14px;">Fase de cada cliente activo, de más a menos próximo cambio. Pulsa el nombre para abrir su pestaña Periodización.</div>
    ${resumen}
    ${activos.length ? cabecera + filas.map(tarjeta).join('') : '<div class="empty">No hay clientes activos.</div>'}
    <div style="margin-top:6px;">${leyenda}</div>
    <div style="font-size:11px;color:#555;margin-top:8px;">Borde blanco = bloque de hoy · línea amarilla = hoy · barritas bajo la línea = eventos (viajes, puentes...). Ventana: 4 semanas atrás y 24 adelante.</div>`;
}
