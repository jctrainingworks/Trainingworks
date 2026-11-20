// Periodización: HTML de la pestaña y del modal de macrociclo. Solo pinta; la lógica está en calculos.js e index.js.
import { esc } from '../core/ui.js';
import { mesociclosVisibles } from '../etapas/calculos.js';
import { BLOQUE_TIPOS, BLOQUE_DURACION_SEMANAS, CSD_TIPOS, CSD_ORDEN, ATR_TIPOS, ATR_ORDEN, ATR_DURACION_SEMANAS, avisoDuracionMesociclo } from '../core/atr.js';
import {
  fechaLocalISO, dia, modeloEsCSD, nombreModelo, MODELO_PROPIO_NOMBRE, CSD_RANGOS_INFORMATIVOS, MUSCULOS_PROPIOS, MUSCULOS_SOBRECARGA_CSD,
  rangoPropioSeries, mesocicloVigente, esMacroAnual, EVENTOS_TIPOS, sugerenciasPeriodizacion,
  mesPermiteMantenimiento, rangoSemanasBloqueMacro, agruparCiclosMacrociclo, avisosSecuenciaMacrociclo, MACRO_SEMANAS_DEF
} from './calculos.js';

const DIA = 86400000;
const fp = v => new Date(dia(v) + 'T00:00:00');
const fmtCorto = d => d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }).replace(/\./g, '');
const fmtLargo = v => fp(v).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }).replace(/\./g, '');
const durTxt = d => (d.max <= 1 ? 'menos de 1 semana' : `${d.min}-${d.max} semanas`);

export function lineaHtml(lista, eventos) {
  const hoyD = fp(fechaLocalISO());
  if (!lista.length) return '<div class="empty">Todavía no hay bloques con fecha para dibujar la línea de tiempo 🗓️</div>';
  const ini = fp(lista[0].fecha_inicio);
  const fin = lista.reduce((mx, m) => { const f = m.fecha_fin ? fp(m.fecha_fin) : (hoyD > fp(m.fecha_inicio) ? hoyD : fp(m.fecha_inicio)); return f > mx ? f : mx; }, ini);
  const total = Math.max(7, (fin - ini) / DIA + 1);
  const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const ticks = [];
  for (let m = new Date(ini.getFullYear(), ini.getMonth() + 1, 1); m <= fin; m = new Date(m.getFullYear(), m.getMonth() + 1, 1)) {
    ticks.push(`<div style="position:absolute;left:${(m - ini) / DIA / total * 100}%;top:0;bottom:0;border-left:1px dashed #34405A;padding-left:3px;font-size:10px;color:#8b98ad;white-space:nowrap;">${MES[m.getMonth()]}${m.getMonth() === 0 ? ' ' + String(m.getFullYear()).slice(2) : ''}</div>`);
  }
  const vig = mesocicloVigente(lista);
  const bandas = lista.map(m => {
    const a = fp(m.fecha_inicio), b = m.fecha_fin ? fp(m.fecha_fin) : (hoyD > a ? hoyD : a);
    const dias = (b - a) / DIA + 1;
    const t = m.tipo_atr ? BLOQUE_TIPOS[m.tipo_atr] : null;
    const sem = Math.max(1, Math.round(dias / 7));
    const ancho = dias / total * 100;
    const txt = ancho > 13 ? `${t ? t.label : 'Sin tipo'} · ${sem} sem` : (ancho > 6 ? (t ? t.label.slice(0, 3) : '·') : '');
    return `<div title="${esc((t ? t.label : 'Sin tipo') + ' · ' + fmtCorto(a) + ' → ' + fmtCorto(b) + ' · ' + sem + ' sem')}" style="position:absolute;left:${(a - ini) / DIA / total * 100}%;width:${ancho}%;top:0;bottom:0;background:${t ? t.color : '#3a3a3a'};border-radius:4px;overflow:hidden;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#fff;white-space:nowrap;${vig && vig.id === m.id ? 'box-shadow:0 0 0 2px #fff inset;' : ''}">${txt}</div>`;
  }).join('');
  const evBars = (eventos || []).filter(e => e.desde && fp(e.hasta || e.desde) >= ini && fp(e.desde) <= fin).map(e => {
    const a = fp(e.desde) < ini ? ini : fp(e.desde), b = fp(e.hasta || e.desde) > fin ? fin : fp(e.hasta || e.desde);
    const t = EVENTOS_TIPOS[e.tipo] || EVENTOS_TIPOS.otro;
    return `<div title="${esc(t.label + (e.titulo ? ': ' + e.titulo : '') + ' · ' + fmtCorto(a) + (b > a ? ' → ' + fmtCorto(b) : ''))}" style="position:absolute;left:${(a - ini) / DIA / total * 100}%;width:${Math.max(1.2, ((b - a) / DIA + 1) / total * 100)}%;top:0;bottom:0;background:${t.color};border-radius:3px;"></div>`;
  }).join('');
  const evRow = evBars ? `<div style="position:relative;height:8px;margin-top:5px;">${evBars}</div><div style="font-size:10px;color:#6b7280;margin-top:3px;">▮ eventos (viajes, puentes...): pasa el cursor para ver cuál</div>` : '';
  const hoyPct = (hoyD >= ini && hoyD <= fin) ? (hoyD - ini) / DIA / total * 100 : null;
  const marca = hoyPct === null ? '' : `<div style="position:absolute;left:${hoyPct}%;top:-4px;bottom:-4px;border-left:2px solid #e8ff00;"></div><div style="position:absolute;left:${hoyPct}%;top:-16px;transform:translateX(-50%);font-size:10px;font-weight:700;color:#e8ff00;">hoy</div>`;
  const filas = lista.map(m => {
    const a = fp(m.fecha_inicio), b = m.fecha_fin ? fp(m.fecha_fin) : null;
    const t = m.tipo_atr ? BLOQUE_TIPOS[m.tipo_atr] : null;
    const sem = b ? Math.max(1, Math.round(((b - a) / DIA + 1) / 7)) : null;
    const aqui = vig && vig.id === m.id;
    return `<div style="display:flex;align-items:center;gap:8px;font-size:12px;padding:3px 0;color:${aqui ? '#fff' : '#9aa8bf'};${aqui ? 'font-weight:700;' : ''}"><span style="width:9px;height:9px;border-radius:50%;background:${t ? t.color : '#3a3a3a'};flex-shrink:0;"></span><span style="min-width:104px;">${esc(t ? t.label : 'Sin tipo')}</span><span>${fmtCorto(a)} → ${b ? fmtCorto(b) : 'abierto'}</span>${sem ? `<span style="color:#6b7280;">· ${sem} sem</span>` : ''}${aqui ? '<span style="color:#e8ff00;">← aquí</span>' : ''}</div>`;
  }).join('');
  return `
    <div style="position:relative;height:16px;margin-top:18px;">${ticks.join('')}</div>
    <div style="position:relative;height:30px;background:#212A39;border:1px solid #2E384A;border-radius:6px;">${bandas}${marca}</div>
    ${evRow}
    <div style="margin-top:12px;">${filas}</div>`;
}

function sugerenciasHtml(lista) {
  const col = { aviso: '#f59e0b', info: '#38bdf8', ok: '#22c55e' }, ico = { aviso: '⚠️', info: 'ℹ️', ok: '✓' };
  return `
    <div class="pz-card">
      <div class="pz-title">💡 Sugerencias</div>
      ${lista.length ? lista.map(s => `<div style="background:#161C27;border:1px solid #34405A;border-left:3px solid ${col[s.k]};border-radius:6px;padding:8px 12px;margin-bottom:8px;font-size:13px;color:#e6edf7;line-height:1.5;">${ico[s.k]} ${s.txt}</div>`).join('') : '<div style="font-size:13px;color:#8b98ad;">Nada que señalar ahora mismo ✓</div>'}
      <div style="font-size:11px;color:#6b7280;margin-top:4px;">Solo orientativo (regla del libro de Roberto): decides tú. El panel no cambia nada solo.</div>
    </div>`;
}

function eventosHtml(eventos) {
  const hoy = fechaLocalISO();
  const ord = eventos.slice().sort((x, y) => dia(x.desde).localeCompare(dia(y.desde)));
  const fila = e => {
    const t = EVENTOS_TIPOS[e.tipo] || EVENTOS_TIPOS.otro;
    const pasado = dia(e.hasta || e.desde) < hoy;
    return `<div style="display:flex;align-items:center;gap:8px;font-size:13px;padding:4px 0;${pasado ? 'opacity:.5;' : ''}">
      <span style="width:9px;height:9px;border-radius:50%;background:${t.color};flex-shrink:0;"></span>
      <span style="min-width:130px;color:#cbd5e1;">${esc(t.label)}</span>
      <span style="flex:1;color:#e6edf7;">${esc(e.titulo || '')}</span>
      <span style="color:#8b98ad;white-space:nowrap;">${fmtCorto(fp(e.desde))}${dia(e.hasta) && dia(e.hasta) !== dia(e.desde) ? ' → ' + fmtCorto(fp(e.hasta)) : ''}</span>
      <button class="btn btn-ghost btn-xs" title="Quitar evento" data-accion="borrar-evento" data-id="${esc(e.id)}">✕</button>
    </div>`;
  };
  const lbl = 'display:block;font-size:11px;color:#8b98ad;';
  return `
    <div class="pz-card">
      <div class="pz-title">🧳 Eventos de vida real</div>
      <div style="font-size:11px;color:var(--muted);margin-bottom:8px;">Viajes, vacaciones, puentes, exámenes... salen en la línea de tiempo y generan avisos.</div>
      ${ord.length ? ord.map(fila).join('') : '<div style="font-size:13px;color:#8b98ad;margin-bottom:6px;">Todavía no hay eventos.</div>'}
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px;">
        <select id="evTipo" class="pz-input" style="width:100%;">${Object.entries(EVENTOS_TIPOS).map(([k, t]) => `<option value="${k}">${esc(t.label)}</option>`).join('')}</select>
        <input id="evTitulo" class="pz-input" style="width:100%;" placeholder="Ej. Semana Santa en Cádiz" />
        <label style="${lbl}">Desde<input id="evDesde" class="pz-input" style="width:100%;" type="date" /></label>
        <label style="${lbl}">Hasta<input id="evHasta" class="pz-input" style="width:100%;" type="date" /></label>
      </div>
      <button class="btn btn-primary btn-sm" style="margin-top:8px;width:100%;" data-accion="anadir-evento">Añadir evento</button>
      <div id="evMsg" style="font-size:12px;color:#fbbf24;margin-top:6px;min-height:14px;"></div>
    </div>`;
}

// est = { cliente, mesociclos, modeloPend, progreso }
export function periodizacionHtml(est) {
  const c = est.cliente;
  const guardado = c.modelo_periodizacion || 'ATR';
  const sel = est.modeloPend ?? guardado;
  const csd = modeloEsCSD(guardado), propio = guardado === 'PROPIO';
  const DESC = {
    ATR: 'ATR (Acumulación-Transformación-Realización): para deportistas/opositores con objetivo de rendimiento o competición con fecha fija.',
    CSD: 'CSD (Carga-Sobrecarga-Descarga-Mantenimiento), el método de Roberto Castellano, con sus rangos de series para grupos grandes y pequeños. Para el resto de clientes.',
    PROPIO: `${MODELO_PROPIO_NOMBRE}: la misma estructura y pantallas que CSD, pero los rangos de series por grupo muscular y fase los decides tú.`
  };
  const hoy = fechaLocalISO();
  const visibles = mesociclosVisibles(est.mesociclos, est.etapas).filter(m => m.fecha_inicio).slice().sort((x, y) => dia(x.fecha_inicio).localeCompare(dia(y.fecha_inicio)));
  const vig = mesocicloVigente(visibles);
  const tipoInfo = vig && vig.tipo_atr ? BLOQUE_TIPOS[vig.tipo_atr] : null;
  const selSob = new Set(vig && Array.isArray(vig.musculos_sobrecarga) ? vig.musculos_sobrecarga : []);
  const eventos = Array.isArray(c.eventos_periodizacion) ? c.eventos_periodizacion : [];

  let ahora = '';
  if (vig) {
    const ini = fp(vig.fecha_inicio);
    const total = vig.fecha_fin ? Math.max(1, Math.round(((fp(vig.fecha_fin) - ini) / DIA + 1) / 7)) : null;
    const semTxt = dia(vig.fecha_inicio) > hoy ? `empieza el ${fmtLargo(vig.fecha_inicio)}` : `semana ${Math.floor((fp(hoy) - ini) / DIA / 7) + 1}${total ? ' de ' + total : ''}`;
    const sig = visibles.find(m => dia(m.fecha_inicio) > dia(vig.fecha_inicio));
    const sigT = sig && sig.tipo_atr ? BLOQUE_TIPOS[sig.tipo_atr] : null;
    const dur = vig.tipo_atr ? BLOQUE_DURACION_SEMANAS[vig.tipo_atr] : null;
    const aviso = avisoDuracionMesociclo(vig);
    let rangosHtml = '';
    if (csd && vig.tipo_atr && CSD_RANGOS_INFORMATIVOS[vig.tipo_atr]) {
      if (propio) {
        const chips = MUSCULOS_PROPIOS.map(([k, n]) => { const r = rangoPropioSeries(c, vig.tipo_atr, k, selSob); return r ? `<span style="display:inline-block;margin:0 6px 6px 0;padding:3px 9px;border-radius:999px;border:1px solid #34405A;font-size:12px;color:#e6edf7;">${esc(n)} <b>${r[0]}-${r[1]}</b></span>` : ''; }).join('');
        rangosHtml = `<div style="font-size:11px;color:#8fa3b8;text-transform:uppercase;font-weight:700;margin:10px 0 6px;">Tus series efectivas por semana en ${esc(tipoInfo.label)}</div>${chips || '<div style="font-size:12px;color:#fbbf24;">Aún no has definido rangos para esta fase: rellénalos más abajo.</div>'}`;
      } else {
        const r = CSD_RANGOS_INFORMATIVOS[vig.tipo_atr];
        rangosHtml = `<div style="font-size:12px;color:#cbd5e1;margin-top:10px;">Series efectivas por semana (Roberto, orientativo): grupos grandes <b>${r.grande}</b> · grupos pequeños <b>${r.pequeno}</b></div>`;
      }
    }
    ahora = `
    <div>
      <div class="pz-title">📍 Dónde estás ahora</div>
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
        <span style="padding:5px 12px;border-radius:999px;font-size:14px;font-weight:800;color:#fff;background:${tipoInfo ? tipoInfo.color : '#3a3a3a'};">${esc(tipoInfo ? tipoInfo.label : 'Sin tipo')}</span>
        <span style="font-size:14px;color:#fff;">${semTxt}</span>
        ${dur ? `<span style="font-size:12px;color:#8b98ad;">duración habitual ${durTxt(dur)}</span>` : ''}
      </div>
      ${aviso ? `<div style="font-size:12px;color:#fbbf24;margin-top:8px;">⏱️ ${esc(aviso)}</div>` : ''}
      ${sig ? `<div style="font-size:12px;color:#9aa8bf;margin-top:8px;">Siguiente: <b style="color:${sigT ? sigT.color : '#cbd5e1'};">${esc(sigT ? sigT.label : 'Sin tipo')}</b> · ${fmtLargo(sig.fecha_inicio)}</div>` : ''}
      ${rangosHtml}
    </div>`;
  }

  let macroHtml = '';
  if (csd) {
    const macro = est.mesociclos.filter(esMacroAnual).sort((x, y) => dia(x.fecha_inicio).localeCompare(dia(y.fecha_inicio)));
    macroHtml = `
    <div class="pz-card pz-full">
      <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
        <div class="pz-title" style="margin:0;">📅 Macrociclo anual</div>
        ${!macro.length ? `
        <label style="font-size:12px;color:#8b98ad;display:flex;align-items:center;gap:6px;">Inicio (cliente nuevo)
          <input id="fechaInicioMacrocicloInput" class="pz-input" type="date" value="${esc(dia(c.fecha_inicio_macrociclo))}" /></label>
        <div style="margin-left:auto;display:flex;gap:8px;flex-wrap:wrap;">
          <button class="btn btn-secondary btn-sm" data-accion="guardar-fecha-macrociclo">Guardar fecha</button>
          <button class="btn btn-primary btn-sm" data-accion="crear-macrociclo" ${c.fecha_inicio_macrociclo ? '' : 'disabled title="Guarda antes la fecha de inicio"'}>🚀 Crear macrociclo</button>
        </div>` : `
        <div style="font-size:13px;color:#fff;"><b>${macro.length} bloques</b> · ${fmtLargo(macro[0].fecha_inicio)} → ${fmtLargo(macro[macro.length - 1].fecha_fin)}</div>
        <div style="margin-left:auto;display:flex;gap:8px;flex-wrap:wrap;">
          <button class="btn btn-primary btn-sm" data-accion="editar-macrociclo">✏️ Editar / regenerar</button>
          <button class="btn btn-danger btn-sm" data-accion="quitar-macrociclo" title="Borra los bloques del macrociclo anual y reabre el mesociclo que se cerró al generarlo">🗑️ Quitar</button>
        </div>`}
      </div>
    </div>`;
  }

  let sobHtml = '';
  if (csd && vig && vig.tipo_atr === 'sobrecarga') {
    const lista = propio ? MUSCULOS_PROPIOS : MUSCULOS_SOBRECARGA_CSD;
    sobHtml = `
    <div class="pz-card pz-full">
      <div class="pz-title">🎯 Músculos en sobrecarga</div>
      <div style="font-size:12px;color:var(--muted);margin-bottom:10px;">Roberto: solo 1-2 grupos a la vez. Los marcados se miden con el rango de Sobrecarga; el resto, con el de Carga.</div>
      <div style="display:flex;flex-wrap:wrap;gap:6px;">
        ${lista.map(([k, l]) => `<button class="pz-chip ${selSob.has(k) ? 'on' : ''}" data-accion="toggle-sobrecarga" data-meso="${esc(vig.id)}" data-musculo="${k}">${selSob.has(k) ? '🎯 ' : ''}${esc(l)}</button>`).join('')}
      </div>
      ${selSob.size === 0 ? '<div style="font-size:11px;color:#fbbf24;margin-top:8px;">⚠️ Sin músculos marcados: se acepta el rango de Carga o el de Sobrecarga en todos.</div>' : ''}
      ${selSob.size > 2 ? `<div style="font-size:11px;color:#fbbf24;margin-top:8px;">⚠️ Tienes ${selSob.size} marcados; Roberto recomienda 1-2 a la vez.</div>` : ''}
    </div>`;
  }

  let propioHtml = '';
  if (propio) {
    const rp = c.rangos_propios || {};
    const inp = 'width:46px;background:#0f141d;border:1px solid #34405A;border-radius:6px;color:#e6edf7;padding:3px 4px;font-size:12px;text-align:center;';
    const filas = MUSCULOS_PROPIOS.map(([k, n]) => `
      <div style="display:grid;grid-template-columns:130px repeat(4,1fr);gap:6px;align-items:center;padding:4px 0;border-bottom:1px solid #1f2937;">
        <div style="font-size:13px;color:#cbd5e1;">${esc(n)}</div>
        ${CSD_ORDEN.map(fase => { const v = rp[k] && rp[k][fase]; return `<div style="display:flex;gap:3px;align-items:center;justify-content:center;"><input id="rp_${k}_${fase}_a" type="number" min="0" step="1" value="${v ? v[0] : ''}" placeholder="mín" style="${inp}" /><span style="color:#6b7280;">-</span><input id="rp_${k}_${fase}_b" type="number" min="0" step="1" value="${v ? v[1] : ''}" placeholder="máx" style="${inp}" /></div>`; }).join('')}
      </div>`).join('');
    propioHtml = `
    <div class="pz-card">
      <div class="pz-title">✍️ Tus rangos de series por semana</div>
      <div style="font-size:12px;color:var(--muted);margin-bottom:10px;">Series efectivas por grupo muscular y fase. Las celdas vacías usan el rango de Roberto (si el músculo está en su libro) o no se evalúan. Se aplican en el Repaso de rutinas.</div>
      <div style="overflow-x:auto;"><div style="min-width:560px;">
        <div style="display:grid;grid-template-columns:130px repeat(4,1fr);gap:6px;font-size:11px;font-weight:700;text-transform:uppercase;padding-bottom:4px;">
          <div></div>${CSD_ORDEN.map(fase => `<div style="text-align:center;color:${CSD_TIPOS[fase].color};">${CSD_TIPOS[fase].label}</div>`).join('')}
        </div>
        ${filas}
      </div></div>
      <div id="rpMsg" style="font-size:12px;color:#fbbf24;margin-top:8px;min-height:16px;"></div>
      <div style="margin-top:6px;display:flex;gap:8px;flex-wrap:wrap;">
        <button class="btn btn-primary btn-sm" data-accion="guardar-rangos">Guardar rangos</button>
        <button class="btn btn-ghost btn-sm" data-accion="rangos-roberto" title="Rellena los grupos que clasifica el libro; luego pulsa Guardar">Partir de los de Roberto</button>
        <button class="btn btn-ghost btn-sm" data-accion="rangos-vaciar">Vaciar</button>
      </div>
    </div>`;
  }

  let atrHtml = '';
  if (!csd) {
    const dias = c.fecha_competicion ? Math.round((fp(c.fecha_competicion) - fp(hoy)) / DIA) : null;
    atrHtml = `
    <div class="pz-card">
      <div class="pz-title">🏁 Fecha de competición</div>
      <div style="font-size:12px;color:var(--muted);margin-bottom:10px;">Objetivo con fecha fija (competición, oposición). Sirve para contar hacia atrás las fases.</div>
      <input id="fechaCompeticionInput" class="pz-input" style="max-width:220px;margin-bottom:10px;display:block;" type="date" value="${c.fecha_competicion ? esc(dia(c.fecha_competicion)) : ''}" />
      <button class="btn btn-secondary btn-sm" data-accion="guardar-fecha-competicion">Guardar fecha</button>
      ${dias !== null ? `<div style="font-size:13px;color:#fff;margin-top:10px;">${dias > 0 ? `Faltan <b>${dias} días</b> (≈ ${Math.round(dias / 7)} semanas)` : dias === 0 ? '<b>Es hoy</b>' : `Pasó hace ${-dias} días`}</div>` : ''}
    </div>
    <div class="pz-card">
      <div class="pz-title">📋 Fases ATR y duración habitual</div>
      ${ATR_ORDEN.map(k => { const t = ATR_TIPOS[k], d = ATR_DURACION_SEMANAS[k]; return `<div style="display:flex;align-items:center;gap:8px;font-size:13px;padding:3px 0;color:#cbd5e1;"><span style="width:9px;height:9px;border-radius:50%;background:${t.color};"></span><span style="min-width:200px;">${esc(t.label)}</span><span style="color:#8b98ad;">${durTxt(d)}</span></div>`; }).join('')}
      <div style="font-size:11px;color:#8b98ad;margin-top:8px;">Transformación y Realización se reservan a clientes con objetivo de rendimiento o competición con fecha fija.</div>
    </div>`;
  }

  const modeloCard = `
    <div>
      <div class="pz-title">🧭 Modelo</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <select id="modeloPeriodizacionSel" data-modelo-sel title="${esc(DESC[sel] || '')}" class="pz-input" style="flex:1 1 150px;min-width:0;font-size:14px;font-weight:700;">
          <option value="ATR" ${sel === 'ATR' ? 'selected' : ''}>ATR</option>
          <option value="CSD" ${sel === 'CSD' ? 'selected' : ''}>CSD · Roberto Castellano</option>
          <option value="PROPIO" ${sel === 'PROPIO' ? 'selected' : ''}>${esc(MODELO_PROPIO_NOMBRE)} · CSD propio</option>
        </select>
        <button class="btn btn-primary btn-sm" data-accion="guardar-modelo">Guardar</button>
      </div>
      ${sel !== guardado ? '<div style="font-size:11px;color:#f59e0b;margin-top:6px;">Sin guardar: pulsa "Guardar".</div>' : ''}
    </div>`;
  const sug = (vig || eventos.length) ? sugerenciasHtml(sugerenciasPeriodizacion({ vig, visibles, eventos, prog: est.progreso }, esc)) : '';
  return `
    <div class="pz-card" style="padding:14px 16px;">
      <div style="display:flex;gap:24px;flex-wrap:wrap;align-items:flex-start;">
        <div style="flex:1 1 380px;min-width:0;">${ahora}</div>
        <div style="flex:0 1 330px;min-width:260px;">${modeloCard}</div>
      </div>
    </div>
    <div class="pz-card">
      <div class="pz-title" style="margin-bottom:6px;">🗓️ Línea de tiempo</div>
      ${lineaHtml(visibles, eventos)}
    </div>
    <div class="pz-grid">
      ${sug}
      ${eventosHtml(eventos)}
      ${sobHtml}
      ${macroHtml}
      ${atrHtml}
    </div>
    ${propioHtml}`;
}

// ── Modal de macrociclo ──
// m = { bloques, inicio, defs, modo: 'crear'|'regenerar' }
export function modalMacrocicloHtml(cliente, m) {
  const regen = m.modo === 'regenerar';
  const bloques = m.bloques, defs = m.defs || MACRO_SEMANAS_DEF;
  const fmt = (iso, conAnio) => fp(iso).toLocaleDateString('es-ES', conAnio ? { day: 'numeric', month: 'short', year: 'numeric' } : { day: 'numeric', month: 'short' }).replace(/\./g, '');
  const fila = (b, idx) => {
    const color = CSD_TIPOS[b.tipo]?.color || '#666';
    const rango = rangoSemanasBloqueMacro(b.tipo, b.fecha_inicio);
    const mantPermitido = mesPermiteMantenimiento(b.fecha_inicio);
    const mantFuera = b.tipo === 'mantenimiento' && !mantPermitido;
    const fueraRango = rango && (b.semanas < rango.min || b.semanas > rango.max);
    const tip = mantFuera ? 'Mantenimiento solo puede empezar en julio, agosto o diciembre — cambia el tipo o las fechas' : (fueraRango ? `Fuera del rango recomendado (${rango.min}-${rango.max} sem)` : '');
    return `
      <div class="mc-row" style="--dc:${color};">
        <div class="mc-tipo">
          <select class="form-select" data-mc-tipo="${idx}">
            <option value="" ${!b.tipo ? 'selected' : ''}>— elegir tipo —</option>
            ${CSD_ORDEN.map(k => `<option value="${k}" ${b.tipo === k ? 'selected' : ''} ${(k === 'mantenimiento' && !mantPermitido && b.tipo !== k) ? 'disabled' : ''}>${esc(CSD_TIPOS[k].label)}${(k === 'mantenimiento' && !mantPermitido) ? ' (solo jul, ago, dic)' : ''}</option>`).join('')}
          </select>
          ${rango ? `<span class="mc-rec">recomendado ${rango.min}-${rango.max} sem</span>` : ''}
        </div>
        <div class="mc-fechas">${fmt(b.fecha_inicio)} → ${fmt(b.fecha_fin)}<small>${b.semanas} ${b.semanas === 1 ? 'semana' : 'semanas'}</small></div>
        <div class="mc-stepper">
          <button class="mc-sb" data-mc-sem="${idx}:-1">−</button>
          <span class="mc-sem ${(fueraRango || mantFuera) ? 'warn' : ''}" title="${esc(tip)}">${b.semanas} sem</span>
          <button class="mc-sb" data-mc-sem="${idx}:1">+</button>
        </div>
        <button class="pi-del" title="Quitar bloque" data-mc-quitar="${idx}">✕</button>
      </div>`;
  };
  const totalSem = bloques.reduce((t, b) => t + b.semanas, 0);
  const ciclos = agruparCiclosMacrociclo(bloques).map(g => `<div class="mc-ciclo">
      <div class="mc-ciclo-h"><span>${esc(g.titulo)}</span><small>${g.semanas} sem${g.mant ? '' : ' · ciclo completo 10-14 sem'}</small></div>
      ${g.bloques.map(x => fila(x.b, x.idx)).join('')}
    </div>`).join('');
  const barra = bloques.length ? `<div class="mc-bar">${bloques.map(b => `<span style="flex:${b.semanas};--dc:${CSD_TIPOS[b.tipo]?.color || '#475569'};" title="${esc((CSD_TIPOS[b.tipo]?.label || 'Sin tipo') + ' · ' + b.semanas + ' sem')}"></span>`).join('')}</div>
    <div class="mc-leyenda">${CSD_ORDEN.map(k => `<span><i style="--dc:${CSD_TIPOS[k].color};"></i>${esc(CSD_TIPOS[k].label)}</span>`).join('')}</div>` : '';
  const resumen = bloques.length ? `<div class="mc-resumen"><span class="mc-chip">${totalSem} sem</span><span class="mc-chip">${bloques.length} bloques</span><span class="mc-chip">Termina ${fmt(bloques[bloques.length - 1].fecha_fin, true)}</span></div>` : '';
  const avisos = bloques.length ? avisosSecuenciaMacrociclo(bloques) : [];
  const avisosHtml = !bloques.length ? '' : (avisos.length ? `<div class="mc-avisos">${avisos.map(a => `<div>⚠️ ${esc(a)}</div>`).join('')}</div>` : '<div class="mc-ok">✓ La secuencia cuadra con el libro de Roberto.</div>');
  const stepDef = k => `<div class="mc-def" style="--dc:${CSD_TIPOS[k].color};"><span class="mc-def-l">${esc(CSD_TIPOS[k].label)}</span>
    <div class="mc-stepper"><button class="mc-sb" data-mc-def="${k}:-1">−</button><span class="mc-sem">${defs[k]} sem</span><button class="mc-sb" data-mc-def="${k}:1">+</button></div></div>`;
  return `
<div class="modal mx-modal mx-xs" role="dialog" aria-modal="true">
<div class="mx-head">
<div class="modal-title">${regen ? '✏️ Editar macrociclo' : '🚀 Crear macrociclo'}</div>
<div class="modal-sub">${esc(cliente.nombre)} — ${esc(cliente.codigo)} · ${regen ? 'ajusta los bloques; al aplicar se actualizan los existentes' : 'ajústala; al confirmar se crea todo de una vez'}</div>
</div>
<div class="mx-body">
<div class="mc-top">
  <div class="form-group"><label class="form-label">Inicio</label>
    <input class="form-input" type="date" data-mc-inicio value="${esc(m.inicio || '')}" ${regen ? 'disabled title="Al editar no se cambia el inicio"' : ''} /></div>
  <details class="mc-menu"><summary title="Más acciones">⋯</summary>
    <div class="mc-menu-list">
      <button data-mc-regenerar>🔄 Regenerar propuesta</button>
      <button data-mc-quitar-tipos>🎯 Dejar solo semanas (sin tipo)</button>
      <button class="danger" data-mc-vaciar>🗑️ Vaciar todo</button>
    </div></details>
</div>
${resumen}${barra}${avisosHtml}
<details class="mx-det" ${m.defsAbierto ? 'open' : ''}><summary>Ajustar duraciones por defecto</summary>
  <div class="mx-det-body">
    <div class="mc-defs">${CSD_ORDEN.map(stepDef).join('')}</div>
    <p class="mc-defs-nota">Estas semanas solo se usan al generar la propuesta. Al aplicarlas se reconstruye la secuencia y se pierden las ediciones manuales.</p>
    <button class="btn btn-ghost btn-sm" style="margin-bottom:14px;" data-mc-regenerar>🔄 Aplicar y regenerar</button>
  </div>
</details>
<div class="al-seccion-titulo">Bloques</div>
${ciclos || '<div class="mc-vacio">Sin bloques — añade uno.</div>'}
<div class="mc-actions"><button class="btn btn-ghost btn-sm" data-mc-anadir>+ Añadir bloque</button></div>
</div>
<div data-error class="mx-alert"></div>
<div class="mx-foot"><div class="mx-foot-btns">
<button class="btn btn-ghost" data-mc-cancelar>Cancelar</button>
<button class="btn btn-primary" data-mc-confirmar ${bloques.length ? '' : 'disabled'}>${regen ? `✅ Aplicar cambios (${bloques.length} bloques)` : `✅ Crear ${bloques.length} mesociclos`}</button>
</div></div>
</div>`;
}
