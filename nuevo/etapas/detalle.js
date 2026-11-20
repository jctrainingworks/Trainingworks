// Detalle de una etapa guardada: cabecera, tarjetas de resumen y pestañas internas
// (Resumen · Ejercicios · Medidas · Rutinas · Sesiones). Solo pinta; lee el snapshot que se guardó al cerrar.
import { esc } from '../core/ui.js';
import { parseSeriesDetalle } from '../historial/calculos.js';
import { etD, etFechaTxt, etSemanas, etKcalTxt } from './calculos.js';
import { etapaProgresoEjercicios, ETAPA_MEDIDAS } from './progreso.js';

export const ETAPAS_MENU_NUTRICION_ACTIVO = false;
const N = (v, d = 1) => Number(v).toLocaleString('es-ES', { maximumFractionDigits: d });
const signo = d => (d > 0 ? '+' : d < 0 ? '−' : '');

// e = fila de etapas con snapshot; sec = pestaña interna; filtroEj = filtro de la lista de ejercicios
export function detalleEtapaHtml(e, sec, filtroEj) {
  const s = e.snapshot || {};
  const card = (titulo, cuerpo, extra) => `<div class="et-card"><div class="et-card-h"><div class="et-card-t">${titulo}</div>${extra || ''}</div>${cuerpo}</div>`;
  const kpi = (label, valor, nota) => `<div class="et-kpi"><span class="et-kpi-l">${label}</span><b>${valor}</b>${nota ? `<span class="et-kpi-n">${nota}</span>` : ''}</div>`;
  const med = (s.medidas || []).slice().sort((a, b) => etD(a.fecha).localeCompare(etD(b.fecha)));
  const prog = s.sesiones ? etapaProgresoEjercicios(s) : null;
  const disponibles = ['resumen'].concat(prog ? ['ejercicios'] : [], s.medidas ? ['medidas'] : [], s.rutinas ? ['rutinas'] : [], s.sesiones ? ['sesiones'] : []);
  if (!disponibles.includes(sec)) sec = 'resumen';

  let html = `
    <button class="btn btn-ghost btn-sm" style="margin-bottom:12px;" data-accion="volver-etapas">← Etapas</button>
    <div class="et-card" style="padding:18px 22px;">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;">
        <div class="et-card-t" style="font-size:30px;">${esc(e.titulo)}</div>
        ${e.tipo ? `<span class="tag tag-obj">${esc(e.tipo)}</span>` : ''}
      </div>
      <div style="color:var(--muted);font-size:13px;margin-top:6px;">${etFechaTxt(e.fecha_inicio)} → ${etFechaTxt(e.fecha_fin)}</div>
      ${e.nota ? `<div style="color:#C3CCD9;font-size:13px;margin-top:10px;white-space:pre-wrap;">${esc(e.nota)}</div>` : ''}
    </div>`;

  const ks = [];
  const sem = etSemanas(e.fecha_inicio, e.fecha_fin);
  ks.push(kpi('Duración', `${sem} semana${sem === 1 ? '' : 's'}`, ''));
  if (s.sesiones) {
    const dias = new Set(s.sesiones.map(x => etD(x.fecha))).size;
    let ton = 0;
    s.sesiones.forEach(x => parseSeriesDetalle(x.series || '').forEach(se => { if (se.peso > 0 && se.reps > 0) ton += se.peso * se.reps; }));
    ks.push(kpi('Entrenos', `${dias} días`, `${N(dias / sem, 1)} por semana${ton > 0 ? ' · ' + N(ton / 1000, 1) + ' t' : ''}`));
  }
  if (s.nutricion && (e.kcal_inicio != null || e.kcal_fin != null)) {
    const a = e.kcal_inicio, b = e.kcal_fin;
    ks.push(kpi('Calorías', `${a != null ? Math.round(a) : '?'} → ${b != null ? Math.round(b) : '?'}`, (a != null && b != null) ? `${signo(b - a)}${Math.abs(Math.round(b - a))} kcal` : 'kcal'));
  }
  const pesos = med.filter(r => r.peso != null && r.peso !== '');
  if (pesos.length >= 2) {
    const a = Number(pesos[0].peso), b = Number(pesos[pesos.length - 1].peso), dl = Math.round((b - a) * 10) / 10;
    ks.push(kpi('Peso corporal', `${N(a)} → ${N(b)} kg`, `${signo(dl)}${N(Math.abs(dl))} kg`));
  }
  html += `<div class="et-kpis">${ks.join('')}</div>`;

  const nombresSec = { resumen: 'Resumen', ejercicios: `Ejercicios · ${prog ? prog.filas.length : 0}`, medidas: 'Medidas', rutinas: 'Rutinas', sesiones: 'Sesiones' };
  html += `<div style="display:flex;gap:8px;flex-wrap:wrap;margin:0 0 14px;">${disponibles.map(k => `<button class="pz-chip ${sec === k ? 'on' : ''}" data-seccion="${k}">${nombresSec[k]}</button>`).join('')}</div>`;

  const ser = m => (m ? `${N(m.peso)}×${m.reps}` : '—');
  const celda = f => {
    const nom = `<span class="et-nom" title="${esc(f.nombre)}">${esc(f.nombre)}</span>`;
    if (f.estado === 'pocos') return `<div class="et-cel"><div class="et-cel-top">${nom}<span class="et-pct pocos">pocos datos</span></div><div class="et-sub">${f.n === 1 ? '1 sesión' : f.n + ' sesiones'} · sin carga o reps comparables</div></div>`;
    const flecha = f.estado === 'sube' ? '▲' : f.estado === 'baja' ? '▼' : f.estado === 'igual' ? '＝' : '≈';
    const sg = f.pct > 0 ? '+' : '';
    const val = f.modo === 'e1rm' ? `1RM est. ${N(f.ini, 0)} → ${N(f.fin, 0)} kg · mejor serie ${ser(f.mejorIni)} → ${ser(f.mejorFin)}` : `Reps máx. ${N(f.ini, 0)} → ${N(f.fin, 0)}`;
    const aviso = f.estado === 'orient' ? ' · orientativo (3 sesiones)' : '';
    return `<div class="et-cel"><div class="et-cel-top">${nom}<span class="et-pct ${f.estado}">${flecha} ${sg}${N(f.pct, 1)} %</span></div><div class="et-sub">${f.n} sesiones · ${val}${aviso}</div></div>`;
  };
  const ordenar = (lista, est) => lista.slice().sort((a, b) => (est === 'sube' ? b.pct - a.pct : est === 'baja' ? a.pct - b.pct : a.nombre.localeCompare(b.nombre)));

  if (sec === 'resumen') {
    if (prog) {
      const ch = (txt, color) => `<span class="tag tag-obj" style="color:${color};margin-left:6px;">${txt}</span>`;
      const cab = `<div style="display:flex;align-items:center;flex-wrap:wrap;">${ch('▲ ' + prog.cuenta.sube, '#22c55e')}${ch('＝ ' + prog.cuenta.igual, '#C3CCD9')}${ch('▼ ' + prog.cuenta.baja, '#f59e0b')}</div>`;
      const top = ordenar(prog.filas.filter(f => f.estado === 'sube'), 'sube').slice(0, 5);
      const bajos = ordenar(prog.filas.filter(f => f.estado === 'baja'), 'baja').slice(0, 5);
      const col = (tit, lista, vacio) => `<div><div class="et-grupo" style="margin-top:0;">${tit}</div>${lista.length ? lista.map(celda).join('') : `<div style="color:var(--muted);font-size:13px;padding:10px 0;">${vacio}</div>`}</div>`;
      const nota = e.tipo === 'Definición' ? 'En una definición, mantener la fuerza ya cuenta como buen resultado. ' : e.tipo === 'Volumen' ? 'En volumen se espera que suban. ' : '';
      const rel = prog.relMediana != null ? `<div style="margin:14px 0 4px;color:#fff;font-size:13px;">Fuerza relativa al peso corporal (1RM ÷ peso): <b style="color:${prog.relMediana >= 0 ? '#22c55e' : '#f59e0b'};">${prog.relMediana > 0 ? '+' : ''}${N(prog.relMediana, 1)} %</b> (mediana de los ejercicios comparables)</div>` : '';
      const extra = (prog.cuenta.orient + prog.cuenta.pocos) ? ` ${prog.cuenta.orient + prog.cuenta.pocos} ejercicios tienen 3 sesiones o menos y no cuentan en estos totales.` : '';
      html += card('PROGRESO EN UN VISTAZO',
        `<div class="et-dos">${col('Mayores mejoras', top, 'Ninguno por encima de +2,5 %')}${col('Bajaron más', bajos, 'Ninguno por debajo de −2,5 %')}</div>`
        + `<div style="margin-top:12px;"><button class="btn btn-ghost btn-sm" data-seccion="ejercicios">Ver los ${prog.filas.length} ejercicios →</button></div>`
        + rel + `<div style="margin-top:8px;color:var(--muted);font-size:11.5px;line-height:1.5;">${nota}Compara la media de las 2 primeras sesiones con la de las 2 últimas (1RM estimado de la mejor serie, sin descargas). Menos de ±2,5 % = se mantuvo.${extra}</div>`, cab);
    }
    const n = s.nutricion;
    if (n) {
      const pa = n.plan_actual; const m = pa && pa.macros;
      const cambios = (n.historial || []).map(h => `<div style="font-size:12px;color:var(--muted);">${etFechaTxt(h.fecha)} · ${Math.round(Number(h.kcal_objetivo))} kcal${h.objetivo_calorico ? ' · ' + esc(h.objetivo_calorico) : ''}</div>`).join('');
      const menuFila = n.menu
        ? '<div style="font-size:12px;color:#22c55e;margin-top:10px;">✅ Plan de menús guardado en esta etapa</div>'
        : (ETAPAS_MENU_NUTRICION_ACTIVO
          ? '<button class="btn btn-ghost btn-sm" style="margin-top:10px;" data-accion="anadir-menu">+ Añadir plan de menús actual</button>'
          : '<div style="font-size:12px;color:var(--muted);margin-top:10px;">🔒 Plan de menús: aún no se guarda (se activará cuando Nutrición esté terminada)</div>');
      html += card('NUTRICIÓN',
        `<div style="font-size:24px;font-weight:800;color:#fff;">${esc(etKcalTxt(n.kcal_inicio, n.kcal_fin))}</div>`
        + (m && (m.proteina || m.carbo || m.grasa) ? `<div style="font-size:12px;color:var(--muted);margin-top:4px;">Macros del plan al cerrar: P ${esc(m.proteina)} · C ${esc(m.carbo)} · G ${esc(m.grasa)} g</div>` : '')
        + (cambios ? `<div style="margin-top:10px;"><div style="font-size:11px;color:#7C8797;margin-bottom:2px;">CAMBIOS DE OBJETIVO GUARDADOS</div>${cambios}</div>` : '')
        + menuFila);
    }
    html += `<div style="text-align:right;margin-top:6px;"><button class="btn btn-ghost btn-sm" style="color:var(--danger);" data-accion="borrar-etapa" data-id="${esc(e.id)}">🗑 Borrar etapa</button></div>`;
  }

  if (sec === 'ejercicios' && prog) {
    const filtros = [['todos', 'Todos', prog.filas.length], ['sube', '▲ Mejoraron', prog.cuenta.sube], ['igual', '＝ Se mantuvieron', prog.cuenta.igual], ['baja', '▼ Bajaron', prog.cuenta.baja], ['orient', '≈ Orientativos', prog.cuenta.orient], ['pocos', 'Pocos datos', prog.cuenta.pocos]].filter(f => f[0] === 'todos' || f[2] > 0);
    let fsel = filtroEj || 'todos'; if (!filtros.some(f => f[0] === fsel)) fsel = 'todos';
    let lista = [];
    ['sube', 'igual', 'baja', 'orient', 'pocos'].forEach(k => { if (fsel === 'todos' || fsel === k) lista = lista.concat(ordenar(prog.filas.filter(f => f.estado === k), k)); });
    html += card('PROGRESO POR EJERCICIO',
      `<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:6px;">${filtros.map(f => `<button class="pz-chip ${fsel === f[0] ? 'on' : ''}" data-filtro-ej="${f[0]}">${f[1]} · ${f[2]}</button>`).join('')}</div>`
      + `<div class="et-grid">${lista.map(celda).join('')}</div>`
      + '<div style="margin-top:12px;color:var(--muted);font-size:11.5px;line-height:1.5;">Orientativo (≈) = 3 sesiones: se compara la primera con la última y puede ser ruido. Con menos de 3 no se compara.</div>');
  }

  if (sec === 'medidas' && s.medidas) {
    const filas = ETAPA_MEDIDAS.map(([k, l, u]) => {
      const con = med.filter(r => r[k] != null && r[k] !== '');
      if (!con.length) return '';
      const a = Number(con[0][k]), b = Number(con[con.length - 1][k]), dl = Math.round((b - a) * 10) / 10;
      return `<tr style="border-bottom:1px solid var(--border);"><td style="padding:8px 0;color:#C3CCD9;">${l}</td><td style="text-align:right;color:#fff;">${N(a)} ${u}</td><td style="text-align:right;color:#fff;">${N(b)} ${u}</td><td style="text-align:right;color:var(--blue);font-weight:800;">${signo(dl)}${N(Math.abs(dl))}</td></tr>`;
    }).join('');
    html += card('MEDIDAS', filas
      ? `<table style="width:100%;font-size:13px;border-collapse:collapse;"><tr style="color:#7C8797;font-size:11px;letter-spacing:1px;text-transform:uppercase;"><td></td><td style="text-align:right;">Inicio</td><td style="text-align:right;">Fin</td><td style="text-align:right;">Δ</td></tr>${filas}</table>`
      : '<div style="color:var(--muted);font-size:13px;">No había medidas en estas fechas.</div>',
      `<span style="font-size:12px;color:#8b98ad;">${med.length} registro${med.length === 1 ? '' : 's'}</span>`);
  }

  if (sec === 'rutinas' && s.rutinas) {
    const mesos = (s.mesociclos || []).slice().sort((a, b) => etD(a.fecha_inicio).localeCompare(etD(b.fecha_inicio)));
    const ejs = s.ejercicios || [];
    const grupos = mesos.map(m => ({ t: `${m.nombre || 'Mesociclo'} ${m.numero ?? ''}`.trim(), sub: `${etFechaTxt(m.fecha_inicio)} → ${m.fecha_fin ? etFechaTxt(m.fecha_fin) : 'en curso'}`, r: s.rutinas.filter(r => String(r.mesociclo_id) === String(m.id)) }));
    const sueltas = s.rutinas.filter(r => !mesos.some(m => String(m.id) === String(r.mesociclo_id)));
    if (sueltas.length) grupos.push({ t: 'Rutinas sin bloque', sub: '', r: sueltas });
    const cuerpo = grupos.map(gr => `
      <div style="margin-bottom:12px;"><div style="font-weight:700;font-size:14px;color:#fff;">${esc(gr.t)} <span style="color:var(--muted);font-weight:400;font-size:11px;">${esc(gr.sub)}</span></div>
      ${gr.r.slice().sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0)).map(r => {
        const lista = ejs.filter(x => String(x.rutina_id) === String(r.id)).sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
        return `<details style="margin:6px 0 0 6px;"><summary style="cursor:pointer;font-size:13px;color:#C3CCD9;">${esc(r.nombre)} <span style="color:var(--muted);">(${lista.length} ejercicios)</span></summary>
          ${lista.map(x => `<div style="font-size:12px;color:var(--muted);margin:4px 0 0 16px;">${esc(x.nombre)} — ${esc(x.series ?? '?')} × ${esc(x.reps || '?')}${x.rir ? ' · RIR ' + esc(x.rir) : ''}</div>`).join('') || '<div style="font-size:12px;color:var(--muted);margin-left:16px;">Sin ejercicios</div>'}
        </details>`;
      }).join('') || '<div style="font-size:12px;color:var(--muted);margin-left:6px;">Sin rutinas</div>'}</div>`).join('');
    html += card('RUTINAS', cuerpo || '<div style="color:var(--muted);font-size:13px;">No había rutinas en estas fechas.</div>', `<span style="font-size:12px;color:#8b98ad;">${s.rutinas.length} en total</span>`);
  }

  if (sec === 'sesiones' && s.sesiones) {
    const ses = s.sesiones.slice().sort((a, b) => etD(b.fecha).localeCompare(etD(a.fecha)));
    const dias = new Set(ses.map(x => etD(x.fecha))).size;
    const tope = 150;
    html += card('REGISTRO DE SESIONES',
      ses.length ? `${ses.slice(0, tope).map(x => `<div style="margin-top:10px;"><div style="font-size:12px;color:#fff;"><b>${etFechaTxt(x.fecha)}</b> · ${esc(x.ejercicio)}${x.en_descarga ? ' · descarga' : ''}</div><div style="font-size:12px;color:var(--muted);white-space:pre-line;">${esc(x.series)}</div></div>`).join('')}
        ${ses.length > tope ? `<div style="font-size:11px;color:var(--muted);margin-top:10px;">Se muestran los ${tope} más recientes de ${ses.length}; todos quedan guardados.</div>` : ''}`
        : '<div style="color:var(--muted);font-size:13px;">No había sesiones en estas fechas.</div>',
      `<span style="font-size:12px;color:#8b98ad;">${dias} día${dias === 1 ? '' : 's'} · ${ses.length} registros</span>`);
  }
  return html;
}
