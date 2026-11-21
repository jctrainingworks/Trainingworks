// Resumen PDF del cliente: HTML de una hoja A4 (entrenos y adherencia, series efectivas, récords de 1RM estimado, peso
// corporal y series por músculo). Réplica de generateResumen de prueba/index.html, convertida en función pura.
// c = { nombre, objetivo, historial, mesociclos, rutinas, seguimientoCorporal }  ·  etapas = filas de `etapas`  ·  musculoDe(nombre) → músculo
import { esc } from '../core/ui.js';
import { parseBloqueSerie, volumenBloqueSerie } from '../core/series.js';
import { normalizaNombreEj } from '../core/musculo.js';
import { parseSeriesDetalle } from '../historial/calculos.js';
import { fechaLocalISO } from '../periodizacion/calculos.js';
import { ultimaFin, filtrarSesiones } from '../etapas/calculos.js';
import { TABLA_VOLUMEN_MUSCULAR } from '../core/tablavolumen.js';
import { LOGO_JC_PDF } from '../core/logo.js';

export function construirResumenHtml(c, notaEntrenador, periodo, { etapas = [], musculoDe = () => 'Otro', ahora = new Date() } = {}) {
  const claveMusculoSeries = nombreEj => {
    const k = normalizaNombreEj(musculoDe(nombreEj)).replace(/\s+/g, '');
    return k === 'deltoidesposterior' ? 'hombros' : k;
  };
  const fmt = (n, dec = 1) => Number(n).toFixed(dec).replace('.', ',');
  const fmtSigno = (n, dec = 1) => (n > 0.0001 ? '+' : n < -0.0001 ? '−' : '') + fmt(Math.abs(n), dec);
  const ISO = (f) => String(f || '').slice(0, 10);
  const fechaTxt = (f) => new Date(f).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }).replace(/\./g, '').replace(/ de /g, ' ');
  const hoyD = ahora;
  const hoyISO = fechaLocalISO(hoyD);

  // ── Periodo: 30/60/90 días, o desde el inicio de la etapa actual (o todo el histórico si no hay etapas) ──
  let desdeISO = '';
  if (periodo === 'etapa') {
    const fin = ultimaFin(etapas);
    if (fin) { const d = new Date(fin + 'T00:00:00'); d.setDate(d.getDate() + 1); desdeISO = fechaLocalISO(d); }
  } else if (Number(periodo) > 0) {
    const d = new Date(); d.setDate(d.getDate() - Number(periodo)); desdeISO = fechaLocalISO(d);
  }
  // Igual que el resto del panel: nunca se cuenta nada anterior al inicio de la etapa actual (salvo que se vea "todo")
  const base = filtrarSesiones(etapas, c.historial || []).filter(s => s.fecha && s.ejercicio);
  const previos = base.filter(s => desdeISO && ISO(s.fecha) < desdeISO);
  const enPer = base.filter(s => !desdeISO || ISO(s.fecha) >= desdeISO);
  const primeraFecha = enPer.length ? enPer.map(s => ISO(s.fecha)).sort()[0] : (desdeISO || hoyISO);
  const iniISO = desdeISO && desdeISO > primeraFecha ? desdeISO : (desdeISO || primeraFecha);
  const diasPer = Math.max(7, Math.round((new Date(hoyISO) - new Date(iniISO)) / 86400000));
  const nSem = Math.max(1, Math.round(diasPer / 7));

  // ── Entrenos: días distintos con registros (antes se contaba cada ejercicio como una sesión) ──
  const diasEntrenados = new Set(enPer.map(s => ISO(s.fecha))).size;
  const mesos = c.mesociclos || [];
  const mesoAct = mesos.find(m => m.fecha_inicio && ISO(m.fecha_inicio) <= hoyISO && (!m.fecha_fin || ISO(m.fecha_fin) >= hoyISO)) || mesos.find(m => !m.fecha_fin) || null;
  const rutinasPorSem = mesoAct ? (c.rutinas || []).filter(r => !r.es_cardio && String(r.mesociclo_id ?? '') === String(mesoAct.id)).length : 0;
  const previstos = rutinasPorSem * nSem;
  const adher = previstos > 0 ? Math.min(100, Math.round(diasEntrenados / previstos * 100)) : null;

  // ── Series efectivas del periodo: series de fuerza (sin cardio ni descargas); las técnicas intra-serie suman 0,5 cada una ──
  let seriesTot = 0;
  enPer.forEach(s => {
    if (s.en_descarga) return;
    (s.series || '').split('\n').map(x => x.trim()).filter(Boolean).forEach(b => {
      const pb = parseBloqueSerie(b);
      if (pb.vel != null) return;
      seriesTot += volumenBloqueSerie(b);
    });
  });
  seriesTot = Math.round(seriesTot);

  // ── Series por músculo en el periodo (sin descargas ni cardio) ──
  const totM = {};
  enPer.filter(s => !s.en_descarga).forEach(s => {
    const k = claveMusculoSeries(s.ejercicio);
    if (!TABLA_VOLUMEN_MUSCULAR[k]) return;
    totM[k] = (totM[k] || 0) + (s.series || '').split('\n').map(x => x.trim()).filter(Boolean).reduce((a, b) => a + volumenBloqueSerie(b), 0);
  });
  const todosM = Object.entries(totM).map(([k, v]) => ({ k, tot: Math.round(v), nombre: TABLA_VOLUMEN_MUSCULAR[k].nombre })).filter(o => o.tot > 0).sort((a, b) => b.tot - a.tot);
  const musculos = todosM.slice(0, 8);
  const maxM = musculos.length ? musculos[0].tot : 1;
  const nomCorto = (n) => n.replace(/\s*\(.*\)/, '').toLowerCase();
  const listaTxt = (arr) => arr.length > 1 ? arr.slice(0, -1).join(', ') + ' y ' + arr[arr.length - 1] : (arr[0] || '');
  const fraseMus = todosM.length >= 4
    ? `Lo que más has trabajado: <b>${listaTxt(todosM.slice(0, 3).map(o => nomCorto(o.nombre)))}</b>. Lo que menos: <b>${nomCorto(todosM[todosM.length - 1].nombre)}</b>.`
    : '';
  const principal = musculos[0] ? musculos[0].nombre : '—';

  // ── Récords: mejor 1RM estimado (Epley) del periodo frente al mejor anterior (sin descargas) ──
  const e1De = (s) => { let e = 0; parseSeriesDetalle(s.series).forEach(se => { if (se.peso > 0 && se.reps > 0) e = Math.max(e, se.peso * (1 + se.reps / 30)); }); return e; };
  const claveEj = (n) => normalizaNombreEj(n).replace(/[\s-]+/g, '');
  const ej = {};
  const mete = (s, campo) => { const e = e1De(s); if (e <= 0 || s.en_descarga) return; const k = claveEj(s.ejercicio); const o = ej[k] = ej[k] || { nombre: s.ejercicio, ant: 0, act: 0, prim: 0, primF: '' }; o[campo] = Math.max(o[campo], e); if (campo === 'act' && (!o.primF || ISO(s.fecha) < o.primF)) { o.primF = ISO(s.fecha); o.prim = e; } };
  previos.forEach(s => mete(s, 'ant'));
  enPer.forEach(s => mete(s, 'act'));
  const lista = Object.values(ej).filter(o => o.act > 0).map(o => { const ref = o.ant > 0 ? o.ant : o.prim; return { ...o, ref, dif: o.act - ref }; });
  let records = lista.filter(o => o.dif >= 1).sort((a, b) => b.dif - a.dif).slice(0, 5);
  const haySubidas = records.length > 0;
  if (!haySubidas) records = lista.sort((a, b) => b.act - a.act).slice(0, 5);

  // ── Peso corporal del periodo (los mismos registros que la gráfica del panel) ──
  const pesos = (c.seguimientoCorporal || []).filter(d => Number(d.peso) > 0 && d.fecha && (!desdeISO || ISO(d.fecha) >= desdeISO)).sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
  const pIni = pesos.length ? Number(pesos[0].peso) : null, pFin = pesos.length ? Number(pesos[pesos.length - 1].peso) : null;
  const pCambio = pesos.length > 1 ? pFin - pIni : null;

  // ── Titular ──
  const nSemTxt = nSem + ' semana' + (nSem !== 1 ? 's' : '');
  const titular = diasEntrenados > 0 ? `${diasEntrenados} entreno${diasEntrenados !== 1 ? 's' : ''}<br>en ${nSemTxt}.` : `Sin entrenos<br>en ${nSemTxt}.`;
  const periodoTxt = `${fechaTxt(iniISO)} → ${fechaTxt(hoyD)}`;
  const hoy = hoyD.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
  const pn = (inner, style) => `<div class="pn"${style ? ` style="${style}"` : ''}>${inner}</div>`;
  const kpiBig = (lab, val, uni, sub, col) => pn(`<div class="pl">${lab}</div><div style="display:flex;align-items:baseline;gap:1.6mm;margin-top:2.2mm;white-space:nowrap;"><span class="gx" style="font-size:36px;font-weight:700;line-height:1;color:${col || '#fff'};">${val}</span>${uni ? `<span class="mono" style="font-size:12.5px;color:#FFFFFF;">${uni}</span>` : ''}</div>${sub ? `<div class="mono" style="font-size:10px;color:#FFFFFF;margin-top:1.8mm;">${sub}</div>` : ''}`);
  const colorVar = (v) => '#fff';

  const filasRec = records.map(o => `<div class="tr" style="grid-template-columns:50% 29% 21%;"><div class="c1" style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding-right:3mm;">${esc(o.nombre)}</div><div class="c2">${haySubidas ? Math.round(o.ref) + ' → ' : ''}${Math.round(o.act)} <span class="u">kg</span></div><div class="c4" style="color:${haySubidas ? '#4ADE80' : '#fff'};">${haySubidas ? '+' + Math.round(o.dif) + ' kg' : ''}</div></div>`).join('');
  const recHtml = records.length ? `<div class="pl">${haySubidas ? 'Récords del periodo · 1RM estimado' : 'Mejores marcas · 1RM estimado'}</div>
      <div class="th" style="grid-template-columns:50% 29% 21%;"><div>Ejercicio</div><div>${haySubidas ? 'Antes → ahora' : 'Mejor marca'}</div><div style="text-align:right;">${haySubidas ? 'Mejora' : ''}</div></div>${filasRec}`
    : `<div class="pl">Récords del periodo</div><div class="qt" style="margin-top:3mm;">Todavía no hay series con peso y repeticiones en este periodo.</div>`;
  const pesoHtml = pesos.length ? `<div class="pl">Peso corporal</div>
      <div style="display:flex;align-items:baseline;gap:1.6mm;margin-top:2.2mm;white-space:nowrap;"><span class="gx" style="font-size:30px;font-weight:700;line-height:1;">${pCambio != null ? fmtSigno(pCambio) : fmt(pFin)}</span><span class="mono" style="font-size:12px;">kg</span></div>
      <div class="mono" style="font-size:10px;margin-top:1.8mm;">${pCambio != null ? `${fmt(pIni)} → ${fmt(pFin)} kg` : 'Un solo registro'}</div>
      <div class="mono" style="font-size:10px;margin-top:1mm;">${pesos.length} registro${pesos.length !== 1 ? 's' : ''}</div>`
    : `<div class="pl">Peso corporal</div><div class="qt" style="margin-top:3mm;">Sin registros de peso en este periodo.</div>`;

  const filasMus = musculos.map(o => `<div style="display:grid;grid-template-columns:27% 1fr 17%;align-items:center;gap:4mm;padding:1.7mm 0;border-bottom:1px solid #2B3544;">
      <div class="c1" style="font-size:11.5px;">${esc(o.nombre)}</div>
      <div style="height:3mm;background:#202A38;border-radius:1.5mm;overflow:hidden;"><div style="height:100%;width:${Math.max(3, Math.round(o.tot / maxM * 100))}%;background:#2E8BE6;border-radius:1.5mm;"></div></div>
      <div class="c2" style="font-size:11.5px;text-align:right;white-space:nowrap;">${o.tot} <span class="u">series</span></div></div>`).join('');
  const musHtml = musculos.length ? `<div class="pl">Series por músculo · periodo</div>${filasMus}${fraseMus ? `<div class="qt" style="margin-top:3mm;font-size:11.5px;">${fraseMus}</div>` : ''}`
    : `<div class="pl">Series por músculo</div><div class="qt" style="margin-top:3mm;">Todavía no hay entrenos registrados en este periodo.</div>`;

  const html = `<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Resumen ${esc(c.nombre)}</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;700&display=swap" rel="stylesheet"/>
<style>
  @page { size: A4; margin: 0; }
  * { box-sizing:border-box; margin:0; padding:0; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  html, body { background:#0F1319; }
  body { font-family:'Inter','Helvetica Neue',Arial,sans-serif; color:#fff; font-size:11px; }
  .c2, .c4 { font-variant-numeric:tabular-nums; }
  .mono { font-family:'Inter','Helvetica Neue',Arial,sans-serif; font-weight:600; }
  .gx { font-family:'Space Grotesk','Inter',Arial,sans-serif; }
  .sheet { width:210mm; height:297mm; margin:12px auto; background-color:#161B23; background-image:linear-gradient(#1C222C 1px,transparent 1px),linear-gradient(90deg,#1C222C 1px,transparent 1px); background-size:10mm 10mm; display:flex; flex-direction:column; overflow:hidden; box-shadow:0 6px 30px rgba(0,0,0,.5); }
  @media print { html, body { background:#161B23; width:210mm; height:296mm; overflow:hidden; } .sheet { margin:0; height:296mm; box-shadow:none; page-break-after:avoid; break-after:avoid; } }
  .main { flex:1; padding:6mm 12mm 3mm; display:flex; flex-direction:column; justify-content:space-between; gap:4mm; min-height:0; }
  .pn { position:relative; background:rgba(32,39,50,.94); border:.25mm solid #303C4E; padding:4mm 4.5mm; }
  .pn::before, .pn::after { content:''; position:absolute; width:2.4mm; height:2.4mm; border:0 solid #2E8BE6; }
  .pn::before { left:-.3mm; top:-.3mm; border-left-width:.5mm; border-top-width:.5mm; }
  .pn::after { right:-.3mm; bottom:-.3mm; border-right-width:.5mm; border-bottom-width:.5mm; }
  .pl { font-family:'Inter','Helvetica Neue',Arial,sans-serif; font-size:10px; font-weight:700; letter-spacing:1px; text-transform:uppercase; color:#8FC8FF; }
  .grid3 { display:grid; grid-template-columns:repeat(3,1fr); gap:3mm; }
  .th, .tr { display:grid; align-items:center; }
  .th { font-family:'Inter','Helvetica Neue',Arial,sans-serif; font-size:9.5px; font-weight:700; text-transform:uppercase; letter-spacing:.8px; color:#FFFFFF; padding:3mm 0 1.6mm; border-bottom:1px solid #3F4E63; }
  .tr { height:7mm; border-bottom:1px solid #2B3544; font-family:'Inter','Helvetica Neue',Arial,sans-serif; font-size:11.5px; font-weight:600; color:#FFFFFF; }
  .c1 { color:#8FC8FF; font-weight:700; } .c2 { font-weight:700; color:#fff; } .u { font-weight:600; color:#FFFFFF; font-size:10px; } .c4 { font-weight:700; text-align:right; }
  .qt { font-size:12px; font-weight:500; line-height:1.6; color:#FFFFFF; white-space:pre-wrap; }
  .foot { padding:2.5mm 12mm 6mm; }
</style></head>
<body>
<div class="sheet" id="pdfSheet">
  <div style="padding:7mm 12mm 0;display:flex;justify-content:space-between;align-items:center;">
    <img src="${LOGO_JC_PDF}" alt="JC Training Works" style="height:17mm;width:auto;display:block;"/>
    <div class="pn" style="width:64mm;padding:2.6mm 4mm 2.4mm;">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <div class="pl">Cliente</div>
        <div class="pl">Training report</div>
      </div>
      <div class="gx" style="font-size:17px;font-weight:700;line-height:1.1;margin:1.2mm 0 1.8mm;letter-spacing:.6px;text-transform:uppercase;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(c.nombre)}</div>
      <div style="display:flex;justify-content:space-between;gap:5mm;border-top:1px solid #303C4E;padding-top:1.6mm;">
        <div><div class="pl" style="font-size:8px;">Periodo</div><div class="mono" style="font-size:9.5px;color:#fff;margin-top:.6mm;white-space:nowrap;">${periodoTxt}</div></div>
        <div style="text-align:right;"><div class="pl" style="font-size:8px;">Emitido</div><div class="mono" style="font-size:9.5px;color:#fff;margin-top:.6mm;white-space:nowrap;">${fechaTxt(hoyD)}</div></div>
      </div>
    </div>
  </div>

  <div class="main">
    <div>
      <div class="mono" style="font-size:10.5px;font-weight:500;letter-spacing:2px;color:#8FC8FF;text-transform:uppercase;">// Resumen de entrenamiento${c.objetivo ? ' · ' + esc(c.objetivo) : ''}</div>
      <div class="gx" style="font-size:34px;line-height:1.06;font-weight:700;margin-top:2.5mm;">${titular}</div>
    </div>

    <div class="grid3">
      ${kpiBig('Entrenos', diasEntrenados, adher != null ? '' : '', adher != null ? `${adher} % de los ~${previstos} previstos` : `${fmt(diasEntrenados / nSem)} por semana de media`)}
      ${kpiBig('Series efectivas', seriesTot, '', diasEntrenados ? `${fmt(seriesTot / diasEntrenados, 0)} por entreno · sin descargas` : 'sin descargas')}
      ${kpiBig('Más trabajado', `<span style="font-size:24px;">${esc(principal)}</span>`, '', musculos[0] ? `${musculos[0].tot} series en el periodo` : '')}
    </div>

    <div style="display:grid;grid-template-columns:1fr 46mm;gap:3mm;align-items:start;">
      ${pn(recHtml)}
      ${pn(pesoHtml)}
    </div>

    ${pn(musHtml)}

    ${notaEntrenador ? pn(`<div style="display:grid;grid-template-columns:auto 1fr;gap:4mm;">
      <div class="gx" style="font-size:44px;line-height:.75;color:#2E8BE6;">“</div>
      <div><div class="pl" style="margin-bottom:1.6mm;">// Nota del entrenador</div><div class="qt">${esc(notaEntrenador)}</div><div class="mono" style="margin-top:2mm;font-size:8.5px;letter-spacing:1.4px;text-transform:uppercase;color:#8FC8FF;">Juan Carlos · JC Training Works</div></div>
    </div>`) : ''}
  </div>

  <div class="foot">
    <div class="mono" style="border-top:1px solid #2B3544;padding-top:2.8mm;display:flex;justify-content:space-between;align-items:center;gap:10mm;">
      <div style="font-size:9.5px;font-weight:500;color:#FFFFFF;line-height:1.55;max-width:128mm;">El 1RM es una estimación a partir de tus mejores series. Informe generado el ${hoy}.</div>
      <div style="text-align:right;line-height:1.55;white-space:nowrap;font-size:8px;letter-spacing:1.4px;text-transform:uppercase;color:#8FC8FF;"><b style="color:#fff;font-weight:700;">Tú entrenas. Yo controlo el resto.</b><br>@jc_trainingworks</div>
    </div>
  </div>
</div>
<scr\ipt>
  window.addEventListener('load', () => {
    const fuentes = (document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve();
    Promise.race([fuentes, new Promise(r => setTimeout(r, 2500))]).then(() => setTimeout(() => window.print(), 300));
  });
</scr\ipt>
</body></html>`;

  return html;
}