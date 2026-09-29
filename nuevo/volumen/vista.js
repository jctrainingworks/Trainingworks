// Volumen · pintado. Mismo HTML y mismos estilos que renderDetailVolumen y compañía en
// prueba/index.html; lo único que cambia es que los onclick inline pasan a data-accion (delegación)
// y que los textos del usuario (nombres de bloque/rutina/músculo) pasan por esc().
import { esc } from '../core/ui.js';
import { BLOQUE_TIPOS, semanasTranscurridasMesociclo, avisoDuracionMesociclo } from '../core/atr.js';
import {
  MUSCLE_COLORS, datosComparativa, sesionesDelMesocicloActivo, semanasDeEntreno, volumenPorMusculo,
  volumenPorSesion, frecuenciaSemanalPorMusculo, bucketsTonelajePorMusculoSemana, estadoTonelajeMuscular
} from './calculos.js';

const fmt = (val, metrica) => metrica === 'tonelaje' ? Math.round(val) + 'kg' : metrica === 'reps' ? val + ' reps' : val + ' series';
const fechaCorta = f => new Date(f).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });

// Píldora de filtro. `acento`: 'azul' (relleno) o 'amarillo' (metrica).
function pildora(accion, valor, etiqueta, activa, acento = 'azul', extra = '') {
  const borde = activa ? (acento === 'azul' ? '#1e90ff' : '#e8ff00') : '#2a2a2a';
  const fondo = activa ? (acento === 'azul' ? '#1e90ff' : '#e8ff0022') : '#111';
  const color = activa ? (acento === 'azul' ? '#fff' : '#e8ff00') : '#888';
  return `<div data-accion="${accion}" data-valor="${esc(valor)}" style="padding:7px 16px;border-radius:999px;font-size:12px;font-weight:700;cursor:pointer;border:1px solid ${borde};background:${fondo};color:${color};${extra}">${etiqueta}</div>`;
}
const pildorasMetrica = (metrica, extra = '') => ['series', 'reps', 'tonelaje']
  .map(m => pildora('metrica', m, { series: 'Series', reps: 'Reps', tonelaje: 'Tonelaje' }[m], metrica === m, 'amarillo', extra)).join('');

// ── Comparativa de mesociclos ──
export function comparativaHtml(est, historialCompleto, musculoDe) {
  const c = est.cliente;
  if ((c.mesociclos || []).length < 2) {
    return `<div class="empty">Necesitas al menos 2 mesociclos para comparar. Crea el siguiente con "+ Mesociclo" o "🔄 Bloque nuevo" en la pestaña Rutinas 📊</div>`;
  }
  const metricaSel = est.metrica || 'tonelaje';
  const datos = datosComparativa(c, historialCompleto, musculoDe);

  const filas = datos.map((d, i) => {
    const m = d.mesociclo;
    const nombreBloque = m.nombre || null;
    const anterior = datos.slice(0, i).reverse().find(x => (x.mesociclo.nombre || null) === nombreBloque);
    const valorActual = d.totales[metricaSel];
    const valorAnterior = anterior ? anterior.totales[metricaSel] : null;

    let cambioHtml = '<span style="color:#555;font-size:12px;">— primero del bloque</span>';
    if (valorAnterior != null) {
      if (valorAnterior === 0) {
        cambioHtml = '<span style="color:#555;font-size:12px;">—</span>';
      } else {
        const pct = ((valorActual - valorAnterior) / valorAnterior) * 100;
        const color = pct > 5 ? '#4caf50' : pct < -5 ? '#ff4444' : '#1e90ff';
        const flecha = pct > 5 ? '↑' : pct < -5 ? '↓' : '≈';
        cambioHtml = `<span style="color:${color};font-weight:700;font-size:13px;">${flecha} ${pct > 0 ? '+' : ''}${pct.toFixed(0)}%</span>`;
      }
    }

    const periodo = m.fecha_fin
      ? `${fechaCorta(m.fecha_inicio)} – ${fechaCorta(m.fecha_fin)}`
      : `${m.fecha_inicio ? fechaCorta(m.fecha_inicio) : '?'} – activo`;

    const expandido = est.mesocicloExpandido === m.id;
    const musculos = Object.keys(d.totales.porMusculo).sort((a, b) => d.totales.porMusculo[b][metricaSel] - d.totales.porMusculo[a][metricaSel]);
    const maxMusculo = Math.max(1, ...musculos.map(mu => d.totales.porMusculo[mu][metricaSel]));

    const detalleHtml = expandido ? `
      <div style="padding:14px 16px;background:#0a0a0a;border-top:1px solid #1a1a1a;">
        ${musculos.length ? musculos.map(mu => {
          const val = d.totales.porMusculo[mu][metricaSel];
          const pct = (val / maxMusculo) * 100;
          const color = MUSCLE_COLORS[mu] || '#6b7280';
          return `
            <div style="margin-bottom:8px;">
              <div style="display:flex;justify-content:space-between;font-size:12px;color:#aaa;margin-bottom:3px;">
                <span>${esc(mu)}</span>
                <span style="color:${color};font-weight:700;">${fmt(val, metricaSel)}</span>
              </div>
              <div style="background:#1a1a2e;border-radius:999px;height:6px;overflow:hidden;">
                <div style="width:${pct}%;height:100%;background:${color};border-radius:999px;"></div>
              </div>
            </div>`;
        }).join('') : '<div style="color:#555;font-size:12px;">Sin sesiones registradas en este mesociclo.</div>'}
      </div>` : '';

    const tipo = m.tipo_atr && BLOQUE_TIPOS[m.tipo_atr];
    return `
      <div style="border-bottom:1px solid #1a1a2e;">
        <div data-accion="expandir" data-valor="${esc(m.id)}" style="padding:14px 16px;cursor:pointer;display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;">
          <div>
            <div style="font-weight:700;color:#e2e8f0;font-size:14px;display:flex;align-items:center;gap:6px;">${tipo ? `<span title="${esc(tipo.label)}" style="width:8px;height:8px;border-radius:50%;background:${tipo.color};flex-shrink:0;"></span>` : ''}${m.nombre ? esc(m.nombre) + ' ' : 'Mesociclo '}${esc(m.numero)}${!m.fecha_fin ? ' 🟢' : ''}</div>
            <div style="font-size:11px;color:#666;margin-top:2px;">${periodo} · ${d.totales.nEntrenos} entreno${d.totales.nEntrenos === 1 ? '' : 's'}</div>
          </div>
          <div style="display:flex;align-items:center;gap:16px;">
            <div style="text-align:right;">
              <div style="font-family:'Bebas Neue';font-size:18px;color:#e8ff00;">${fmt(valorActual, metricaSel)}</div>
              ${cambioHtml}
            </div>
            <span style="color:#555;font-size:12px;">${expandido ? '▲' : '▼'}</span>
          </div>
        </div>
        ${detalleHtml}
      </div>`;
  }).join('');

  return `
    <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap;">${pildorasMetrica(metricaSel)}</div>
    <div style="background:#0f0f0f;border:1px solid #1a1a1a;border-radius:12px;overflow:hidden;">
      ${filas}
    </div>
    <div style="font-size:11px;color:#555;margin-top:10px;">Toca cualquier mesociclo para ver su desglose por músculo. El % de cambio compara con el mesociclo anterior del mismo bloque.</div>`;
}

// ── Línea de tiempo (Gantt) de los mesociclos ──
export function timelineHtml(est) {
  const c = est.cliente;
  const mesociclos = (c.mesociclos || []).slice()
    .filter(m => m.fecha_inicio)
    .sort((a, b) => new Date(a.fecha_inicio) - new Date(b.fecha_inicio));

  if (!mesociclos.length) return `<div class="empty">Todavía no hay mesociclos con fecha para dibujar la línea de tiempo 🗓️</div>`;

  const hoy = new Date();
  const parseFecha = f => new Date(f + 'T00:00:00');
  const inicioGlobal = parseFecha(mesociclos[0].fecha_inicio);
  const finGlobal = mesociclos.reduce((max, m) => {
    const f = m.fecha_fin ? parseFecha(m.fecha_fin) : hoy;
    return f > max ? f : max;
  }, hoy);
  const rangoTotalDias = Math.max(1, Math.round((finGlobal - inicioGlobal) / 86400000));

  // Cada fila es un bloque; solo se agrupan tramos CONSECUTIVOS con el mismo nombre.
  const bloques = [];
  mesociclos.forEach(m => {
    const nombreBloque = m.nombre || 'Sin nombre';
    const ultimo = bloques[bloques.length - 1];
    if (ultimo && ultimo.nombre === nombreBloque) ultimo.mesociclos.push(m);
    else bloques.push({ nombre: nombreBloque, mesociclos: [m] });
  });

  const filas = bloques.map(bloque => {
    const segmentos = bloque.mesociclos.map(m => {
      const inicio = parseFecha(m.fecha_inicio);
      const fin = m.fecha_fin ? parseFecha(m.fecha_fin) : hoy;
      const offsetPct = Math.max(0, (inicio - inicioGlobal) / 86400000 / rangoTotalDias * 100);
      const anchoPct = Math.max(0.8, (fin - inicio) / 86400000 / rangoTotalDias * 100);
      const atr = m.tipo_atr ? BLOQUE_TIPOS[m.tipo_atr] : null;
      const color = atr ? atr.color : '#3a3a3a';
      const semanas = semanasTranscurridasMesociclo(m).toFixed(1);
      const avisoTxt = !m.fecha_fin ? avisoDuracionMesociclo(m) : null;
      const tooltip = `${atr ? atr.label : 'Sin tipo especificado'} · Mesociclo ${m.numero} · ${semanas} semanas${m.fecha_fin ? '' : ' (activo)'}${avisoTxt ? '\n' + avisoTxt : ''}`;
      return `<div title="${esc(tooltip)}" style="position:absolute;left:${offsetPct}%;width:${anchoPct}%;top:0;bottom:0;background:${color};border-radius:3px;${!m.fecha_fin ? 'box-shadow:0 0 0 1.5px #fff inset;' : ''}"></div>`;
    }).join('');
    return `
      <div style="margin-bottom:12px;">
        <div style="font-size:12px;font-weight:700;color:#e2e8f0;margin-bottom:4px;">${esc(bloque.nombre)}</div>
        <div style="position:relative;height:20px;background:#111;border-radius:4px;border:1px solid #1a1a1a;">${segmentos}</div>
      </div>`;
  }).join('');

  const gruposLeyenda = (c.modelo_periodizacion || 'ATR') === 'CSD'
    ? ['Carga', 'Sobrecarga', 'Descarga', 'Mantenimiento']
    : ['Acumulación', 'Transformación', 'Realización'];
  const punto = color => `<span style="width:8px;height:8px;border-radius:50%;background:${color};display:inline-block;"></span>`;
  const leyenda = gruposLeyenda.map(g => {
    const key = Object.keys(BLOQUE_TIPOS).find(k => BLOQUE_TIPOS[k].grupo === g);
    return `<span style="display:inline-flex;align-items:center;gap:5px;font-size:11px;color:#888;margin-right:14px;">${punto(BLOQUE_TIPOS[key].color)}${g}</span>`;
  }).join('') + `<span style="display:inline-flex;align-items:center;gap:5px;font-size:11px;color:#888;">${punto('#3a3a3a')}Sin tipo</span>`;

  return `
    <div style="font-size:11px;color:#555;margin-bottom:14px;">${inicioGlobal.toLocaleDateString('es-ES')} — ${finGlobal.toLocaleDateString('es-ES')}${finGlobal.toDateString() === hoy.toDateString() ? ' (hoy)' : ''}</div>
    <div>${filas}</div>
    <div style="margin-top:10px;">${leyenda}</div>
    <div style="font-size:11px;color:#555;margin-top:10px;">Cada fila es un bloque; los segmentos de color son sus mesociclos (fases) en orden. El borde blanco marca el mesociclo activo. Pasa el cursor por un segmento para ver detalles.</div>`;
}

// ── Mesociclo activo ──
export function activoHtml(est, historialCompleto, musculoDe) {
  if (!historialCompleto.length) return '<div class="empty">No hay sesiones registradas para calcular volumen 📊</div>';
  const c = est.cliente;
  const { historial, mesocicloActivo } = sesionesDelMesocicloActivo(c, historialCompleto);
  if (!historial.length) return '<div class="empty">No hay sesiones del mesociclo actual para calcular volumen 📊</div>';

  const rangoSel = est.rango === 'todos' ? 'todos' : '1semana';
  const metricaSel = est.metrica || 'tonelaje';
  const { semanasAtras } = semanasDeEntreno(mesocicloActivo);
  const semanasRango = rangoSel === '1semana' ? 1 : null;

  const porMusculo = volumenPorMusculo(historial, semanasAtras, semanasRango, musculoDe);

  // Volumen total por sesión
  const rutinaNombreMap = {};
  (c.rutinas || []).forEach(r => { rutinaNombreMap[String(r.id)] = r.nombre; });
  const porSesion = volumenPorSesion(historial);
  const fechasSesion = Object.keys(porSesion).sort((a, b) => new Date(b) - new Date(a)).slice(0, 12);
  const maxSesionVal = Math.max(1, ...fechasSesion.map(f => porSesion[f][metricaSel]));
  const filasVolumenSesion = fechasSesion.map(f => {
    const v = porSesion[f];
    const pct = (v[metricaSel] / maxSesionVal) * 100;
    const colorBarra = v.enDescarga ? '#ffb400' : '#3b82f6';
    const nombreRutina = v.rutina_id != null ? (rutinaNombreMap[String(v.rutina_id)] || null) : null;
    return `
      <div style="margin-bottom:10px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
          <span style="font-size:12px;color:#aaa;">${fechaCorta(f)}${nombreRutina ? ` · <span style="color:#666;">${esc(nombreRutina)}</span>` : ''}${v.enDescarga ? ' 🔻' : ''}</span>
          <span style="font-family:'Bebas Neue';font-size:14px;color:${colorBarra};">${fmt(metricaSel === 'tonelaje' ? v.tonelaje : metricaSel === 'reps' ? v.reps : v.series, metricaSel)}</span>
        </div>
        <div style="background:#1a1a2e;border-radius:999px;height:7px;overflow:hidden;">
          <div style="width:${pct}%;height:100%;background:${colorBarra};border-radius:999px;"></div>
        </div>
      </div>`;
  }).join('');
  const hayDescargaEnSesiones = fechasSesion.some(f => porSesion[f].enDescarga);
  const volumenSesionHtml = fechasSesion.length ? `
    <div style="background:#0f0f0f;border:1px solid #1a1a1a;border-radius:12px;padding:20px;margin-bottom:16px;">
      <div class="charts-title" style="margin-bottom:4px;">🏋️ Volumen total por sesión (este mesociclo/rutina)</div>
      <div style="font-size:11px;color:#888;margin-bottom:14px;">Suma de todos los ejercicios de cada entreno — últimas ${fechasSesion.length} sesiones.</div>
      ${filasVolumenSesion}
      ${hayDescargaEnSesiones ? `<div style="color:#ffb400;font-size:10px;margin-top:8px;">🔻 Naranja = sesión en descarga</div>` : ''}
    </div>` : '';

  const musculos = Object.keys(porMusculo).sort((a, b) => porMusculo[b][metricaSel] - porMusculo[a][metricaSel]);
  if (!musculos.length) return `<div class="empty">Sin sesiones en ${rangoSel === '1semana' ? 'la última semana' : 'este mesociclo'} 📊</div>`;
  const maxVal = Math.max(...musculos.map(m => porMusculo[m][metricaSel]));

  const barras = musculos.map(m => {
    const val = porMusculo[m][metricaSel];
    const pct = maxVal > 0 ? (val / maxVal * 100) : 0;
    const color = MUSCLE_COLORS[m] || '#6b7280';
    return `
      <div style="margin-bottom:14px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px;">
          <span style="font-size:13px;font-weight:600;color:#e2e8f0;">${esc(m)}</span>
          <span style="font-family:'Bebas Neue';font-size:16px;color:${color};">${fmt(val, metricaSel)}</span>
        </div>
        <div style="background:#1a1a2e;border-radius:999px;height:10px;overflow:hidden;">
          <div style="width:${pct}%;height:100%;background:${color};border-radius:999px;transition:width .4s ease;box-shadow:0 0 8px ${color}55;"></div>
        </div>
      </div>`;
  }).join('');

  // Tabla de volumen semanal por tonelaje (independiente del filtro de arriba)
  const frecPorMusculo = frecuenciaSemanalPorMusculo(historial, semanasAtras, musculoDe);
  const buckets = bucketsTonelajePorMusculoSemana(historial, semanasAtras, musculoDe);
  const musculosSemana = Object.keys(buckets)
    .sort((a, b) => ((buckets[b][0] || {}).tonelaje || 0) - ((buckets[a][0] || {}).tonelaje || 0));

  const filasVolumenSemanal = musculosSemana.map(m => {
    const bk = buckets[m];
    const estaS = Math.round((bk[0] || {}).tonelaje || 0);
    const antS = Math.round((bk[1] || {}).tonelaje || 0);
    const colorM = MUSCLE_COLORS[m] || '#6b7280';
    const frecSemana = frecPorMusculo[m] ? frecPorMusculo[m].size : 0;
    const enDescargaEstaSemana = !!(bk[0] || {}).descarga;

    let icono, colorCambio;
    if (antS === 0) {
      icono = `<svg width="10" height="10" viewBox="0 0 10 10"><circle cx="5" cy="5" r="5" fill="#555"/></svg>`;
      colorCambio = '#555';
    } else {
      const pct = ((estaS - antS) / antS) * 100;
      if (pct <= -15) {
        icono = `<svg width="10" height="12" viewBox="0 0 10 12"><polygon points="5,12 10,0 0,0" fill="#ff9800"/></svg>`;
        colorCambio = '#ff9800';
      } else if (pct <= 10) {
        icono = `<svg width="10" height="10" viewBox="0 0 10 10"><circle cx="5" cy="5" r="5" fill="#1e90ff"/></svg>`;
        colorCambio = '#1e90ff';
      } else if (pct <= 25) {
        icono = `<svg width="10" height="12" viewBox="0 0 10 12"><polygon points="5,0 10,12 0,12" fill="#4caf50"/></svg>`;
        colorCambio = '#4caf50';
      } else {
        icono = `<svg width="10" height="12" viewBox="0 0 10 12"><polygon points="5,0 10,12 0,12" fill="#ff4444"/></svg>`;
        colorCambio = '#ff4444';
      }
    }
    const pctTexto = antS === 0 ? '—' : (((estaS - antS) / antS) * 100).toFixed(0) + '%';

    const estado = estadoTonelajeMuscular(bk);
    let estadoHtml;
    if (enDescargaEstaSemana) {
      estadoHtml = `<span style="font-size:12px;color:#ffb400;">🔻 Descarga</span>`;
    } else if (estado === 'bajada') {
      estadoHtml = `<div style="display:flex;align-items:center;gap:6px;font-weight:700;font-size:12px;color:#ff4444;"><span style="width:8px;height:8px;border-radius:50%;background:#ff4444;flex-shrink:0;"></span>En descenso</div>`;
    } else if (estado === 'estancado') {
      estadoHtml = `<div style="display:flex;align-items:center;gap:6px;font-weight:700;font-size:12px;color:#eab308;"><span style="width:8px;height:8px;border-radius:50%;background:#eab308;flex-shrink:0;"></span>Estancado</div>`;
    } else if (estado === 'progresando') {
      estadoHtml = `<div style="display:flex;align-items:center;gap:6px;font-weight:700;font-size:12px;color:#4caf50;">✓ Progresando</div>`;
    } else {
      estadoHtml = `<span style="font-size:12px;color:#555;">Sin histórico suficiente</span>`;
    }
    const avisoFrecuencia = (frecSemana === 1 && estaS > 0)
      ? `<div style="margin-top:3px;font-size:10px;color:#eab308;">⚠️ Todo en 1 sesión</div>` : '';

    return `
      <tr style="border-bottom:1px solid #1a1a2e;">
        <td style="padding:10px 8px;font-weight:600;color:#e2e8f0;display:flex;align-items:center;gap:8px;">
          <span style="width:10px;height:10px;border-radius:50%;background:${colorM};flex-shrink:0;display:inline-block;"></span>${esc(m)}
        </td>
        <td style="padding:10px 8px;text-align:center;font-family:'Bebas Neue';font-size:16px;color:${colorM};">${estaS}kg</td>
        <td style="padding:10px 8px;text-align:center;font-family:'Bebas Neue';font-size:16px;color:#555;">${antS}kg</td>
        <td style="padding:10px 8px;text-align:center;">
          <div style="display:inline-flex;align-items:center;gap:6px;font-weight:700;font-size:13px;color:${colorCambio};">${icono} ${pctTexto}</div>
        </td>
        <td style="padding:10px 8px;text-align:center;font-size:12px;color:${frecSemana <= 1 ? '#888' : '#4caf50'};">${frecSemana}x/sem</td>
        <td style="padding:10px 8px;">${estadoHtml}${avisoFrecuencia}</td>
      </tr>`;
  }).join('');

  const th = (txt, izq) => `<th style="padding:10px 8px;text-align:${izq ? 'left' : 'center'};font-size:11px;color:#555;text-transform:uppercase;letter-spacing:.5px;">${txt}</th>`;
  const leyendaItem = (svg, txt) => `<div style="display:flex;align-items:center;gap:6px;font-size:11px;color:#555;">${svg}${txt}</div>`;
  const tablaVolumenSemanalHtml = `
    <div style="background:#0f0f0f;border:1px solid #1a1a1a;border-radius:12px;overflow:hidden;margin-bottom:16px;">
      <div style="padding:16px 16px 4px;">
        <div class="charts-title" style="margin-bottom:4px;">🎯 Volumen semanal por músculo</div>
        <div style="font-size:11px;color:#888;margin-bottom:10px;">Tonelaje (peso × reps × series) de la última semana completa del mesociclo vs. la anterior, y su evolución frente a semanas previas — independiente del filtro de arriba. La semana en curso no cuenta hasta que se cierra.</div>
      </div>
      ${filasVolumenSemanal ? `
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr style="background:#141414;">
            ${th('Músculo', true)}${th('Últ. sem.')}${th('Sem. ant.')}${th('Cambio')}${th('Frecuencia')}${th('Estado', true)}
          </tr>
        </thead>
        <tbody>${filasVolumenSemanal}</tbody>
      </table>` : `<div class="empty" style="padding:0 16px 16px;">Sin sesiones en las últimas 2 semanas.</div>`}
      <div style="padding:12px 16px;border-top:1px solid #1a1a1a;display:flex;gap:20px;flex-wrap:wrap;">
        ${leyendaItem('<svg width="10" height="10" viewBox="0 0 10 10"><circle cx="5" cy="5" r="5" fill="#1e90ff"/></svg>', 'Estable o reducida')}
        ${leyendaItem('<svg width="10" height="12" viewBox="0 0 10 12"><polygon points="5,0 10,12 0,12" fill="#4caf50"/></svg>', 'Progresión normal (+10–25%)')}
        ${leyendaItem('<svg width="10" height="12" viewBox="0 0 10 12"><polygon points="5,0 10,12 0,12" fill="#ff4444"/></svg>', 'Carga elevada (+25%)')}
        ${leyendaItem('<svg width="10" height="12" viewBox="0 0 10 12"><polygon points="5,12 10,0 0,0" fill="#ff9800"/></svg>', 'Descarga puntual (bajada >15% vs. sem. anterior)')}
      </div>
      <div style="padding:0 16px 12px;font-size:10px;color:#555;">Estado: compara el tonelaje frente a la media móvil de semanas previas (excluyendo semanas marcadas como descarga) — "En descenso" si dos semanas seguidas caen por debajo del 85% de esa media; "Estancado" si en las últimas semanas apenas se mueve (±10%).</div>
    </div>`;

  const t = 'transition:all .15s;';
  return `
    <div style="display:flex;gap:8px;margin-bottom:20px;flex-wrap:wrap;">
      ${pildora('rango', '1semana', 'Última semana', rangoSel === '1semana', 'azul', t)}
      ${pildora('rango', 'todos', 'Todo el mesociclo', rangoSel === 'todos', 'azul', t)}
      <div style="flex:1;"></div>
      ${pildorasMetrica(metricaSel, t)}
    </div>

    <div style="background:#0f0f0f;border:1px solid #1a1a1a;border-radius:12px;padding:20px;margin-bottom:16px;">
      <div class="charts-title" style="margin-bottom:18px;">📊 Volumen por músculo — ${rangoSel === '1semana' ? 'última semana' : 'todo el mesociclo'} (${metricaSel === 'tonelaje' ? 'tonelaje' : 'series totales'})</div>
      ${barras}
    </div>

    ${volumenSesionHtml}

    ${tablaVolumenSemanalHtml}`;
}

// ── Contenedor con las 3 vistas ──
export function volumenHtml(est, historialCompleto, musculoDe) {
  const vista = est.vista || 'activo';
  const toggle = `
    <div style="display:flex;gap:8px;margin-bottom:16px;">
      ${pildora('vista', 'activo', '📊 Mesociclo activo', vista === 'activo')}
      ${pildora('vista', 'comparativa', '📈 Comparar mesociclos', vista === 'comparativa')}
      ${pildora('vista', 'timeline', '🗓️ Línea de tiempo', vista === 'timeline')}
    </div>`;
  if (vista === 'comparativa') return toggle + comparativaHtml(est, historialCompleto, musculoDe);
  if (vista === 'timeline') return toggle + timelineHtml(est);
  return toggle + activoHtml(est, historialCompleto, musculoDe);
}
