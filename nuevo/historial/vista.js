// Historial (Entrenos) · HTML. Todo lo que viene de datos pasa por esc().
import { esc } from '../core/ui.js';
import { compararSerie, parseSeriesDetalle } from './calculos.js';
import { META_CHIPS, metaChipsDe, metaResumenTendenciaHtml } from './notasSesion.js';

const fecha = iso => { try { return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' }); } catch { return esc(iso || ''); } };

// Sub-vistas del Historial: 💪 Entrenos (sesiones) y 📈 Progreso (gráficas por ejercicio). El
// seguimiento corporal que antes era la tercera vista vive ahora en la pestaña Cuerpo.
export function vistaBotonesHtml(vista) {
  const pill = (id, texto) => `<div data-accion="vista" data-vista="${id}" style="padding:8px 18px;border-radius:999px;font-size:13px;font-weight:700;cursor:pointer;border:1px solid ${vista === id ? '#1e90ff' : '#2a2a2a'};background:${vista === id ? '#1e90ff' : '#111'};color:${vista === id ? '#fff' : '#888'};transition:all .15s;">${texto}</div>`;
  return `<div style="display:flex;gap:8px;margin-bottom:18px;flex-wrap:wrap;">${pill('entrenos', '💪 Entrenos')}${pill('progreso', '📈 Progreso')}</div>`;
}

export function avisosHtml(estancados, enBajada) {
  const aviso = (color, fondo, titulo, lista, plural) => `
    <div style="background:${fondo};border:1px solid ${color};border-radius:12px;padding:14px 16px;margin-bottom:12px;">
      <div style="color:${color};font-weight:800;font-size:14px;margin-bottom:4px;">${titulo}</div>
      <div style="color:#ddd;font-size:13px;line-height:1.5;"><b>${esc(lista.join(', '))}</b> ${plural(lista.length)}</div>
    </div>`;
  return (estancados.length ? aviso('#ff9800', '#2a1400', '⚠️ Cuidado, esto no progresa', estancados,
      n => `lleva${n === 1 ? '' : 'n'} varias sesiones seguidas sin ningún progreso (ni peso/reps, ni series de más). Puede que toque cambiar el estímulo.`) : '')
    + (enBajada.length ? aviso('#ef4444', '#2a0808', '🔻 Rendimiento a la baja', enBajada,
      n => `lleva${n === 1 ? '' : 'n'} 2 sesiones seguidas bajando. Vigila fatiga acumulada — puede tocar bajar volumen o meter una descarga.`) : '');
}

export function controlesHtml(mesociclos, mesocicloActivoId, filtroMesociclo, ejercicios, filtroEj, mostrarMarcasDeCorte) {
  const opcionesMesociclo = mesociclos.map(m => {
    const esActivo = mesocicloActivoId != null && String(m.id) === String(mesocicloActivoId);
    const label = (m.nombre ? m.nombre : 'Bloque') + (m.numero != null ? ` #${m.numero}` : '') + (esActivo ? ' (activo)' : '');
    return `<option value="${esc(m.id)}" ${String(filtroMesociclo) === String(m.id) ? 'selected' : ''}>${esc(label)}</option>`;
  }).join('');
  const opcionesEjercicio = ejercicios.map(n => `<option value="${esc(n)}" ${filtroEj === n ? 'selected' : ''}>${esc(n)}</option>`).join('');
  return `
    <div style="display:flex;gap:8px;margin-bottom:6px;flex-wrap:wrap;align-items:center;">
      <div style="flex:1;"></div>
      ${mesociclos.length ? `
      <select data-sel="mesociclo" style="background:#111;color:#e2e8f0;border:1px solid #2a2a2a;border-radius:8px;padding:7px 10px;font-size:12px;max-width:220px;">
        ${opcionesMesociclo}
        <option value="todos" ${filtroMesociclo === 'todos' ? 'selected' : ''}>Ver histórico completo</option>
      </select>` : ''}
      <select data-sel="ejercicio" style="background:#111;color:#e2e8f0;border:1px solid #2a2a2a;border-radius:8px;padding:7px 10px;font-size:12px;max-width:220px;">
        <option value="">Todos los ejercicios</option>
        ${opcionesEjercicio}
      </select>
    </div>
    ${mostrarMarcasDeCorte
      ? '<div style="color:#666;font-size:11px;margin-bottom:12px;">Viendo el histórico completo — las líneas discontinuas en las gráficas marcan dónde empieza cada bloque nuevo.</div>'
      : '<div style="margin-bottom:12px;"></div>'}`;
}

// Estructura de las tarjetas (canvas incluido); dibujarGraficas() del index.js las rellena después.
export function graficasHtml(exercisesWithData, progresoAbiertos = {}) {
  if (!exercisesWithData.length) return '<div class="empty" style="margin-bottom:10px;">Sin datos de peso en este periodo/ejercicio 📊</div>';
  const tarjeta = (id, titulo, unidad, hayDescarga) => `
    <div class="chart-card" style="background:#111;padding:15px;border-radius:12px;border:1px solid #222;">
      <div style="color:#fff;font-weight:700;margin-bottom:10px;">${esc(titulo)}</div>
      <div style="height:150px;"><canvas data-canvas="${esc(id)}"></canvas></div>
      <div style="color:#3b82f6;font-size:12px;margin-top:10px;font-weight:bold;" data-resumen="${esc(id)}"></div>
      ${hayDescarga ? '<div style="color:#ffb400;font-size:10px;margin-top:4px;">🔻 Puntos en naranja = sesión de descarga</div>' : ''}
    </div>`;
  let html = '<div class="charts-title" style="margin-bottom:15px;">📈 Progreso</div><div class="charts-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:15px;">';
  if (exercisesWithData.length === 1) {
    // Un solo ejercicio filtrado → 3 tarjetas: peso, reps (serie top) y nº de series.
    const ex = exercisesWithData[0];
    const base = ex.nombre.replace(/[^a-zA-Z0-9]/g, '_');
    const hayDescarga = ex.data.some(d => d.en_descarga);
    html += tarjeta('peso_' + base, `${ex.nombre} — PESO (serie top)`, 'kg', hayDescarga)
      + tarjeta('reps_' + base, `${ex.nombre} — REPS (serie top)`, '', hayDescarga)
      + tarjeta('series_' + base, `${ex.nombre} — Nº DE SERIES`, '', hayDescarga);
  } else {
    // Varios ejercicios → acordeón: una fila por ejercicio (último peso + tendencia) que se despliega con su gráfica.
    const claves = exercisesWithData.map(ex => ex.nombre.replace(/[^a-zA-Z0-9]/g, '_'));
    const todosAbiertos = claves.every(k => progresoAbiertos[k]);
    html += `<div style="grid-column:1/-1;display:flex;justify-content:space-between;align-items:center;">
      <span style="color:#666;font-size:11px;">Toca un ejercicio para ver su gráfica &nbsp; ↑ sube &nbsp; = igual &nbsp; ↓ baja</span>
      <span data-accion="progreso-todos" data-abrir="${todosAbiertos ? '' : '1'}" data-claves="${esc(claves.join(','))}" style="cursor:pointer;font-size:11px;font-weight:700;padding:5px 10px;border-radius:8px;border:1px solid #333;color:#3b82f6;white-space:nowrap;">${todosAbiertos ? 'Cerrar todos' : 'Abrir todos'}</span>
    </div>`;
    exercisesWithData.forEach(ex => {
      const base = ex.nombre.replace(/[^a-zA-Z0-9]/g, '_');
      const pesos = ex.data.map(d => d.peso);
      const last = pesos[pesos.length - 1];
      const prev = pesos.length > 1 ? pesos[pesos.length - 2] : null;
      const abierto = !!progresoAbiertos[base];
      let tendencia, colorTend;
      if (prev == null) { tendencia = '★ 1ª vez'; colorTend = '#3b82f6'; }
      else if (last > prev) { tendencia = `↑ +${Math.round((last - prev) * 100) / 100}kg`; colorTend = '#22c55e'; }
      else if (last < prev) { tendencia = `↓ ${Math.round((last - prev) * 100) / 100}kg`; colorTend = '#ef4444'; }
      else { tendencia = '= igual'; colorTend = '#888'; }
      html += `
        <div class="chart-card" style="grid-column:1/-1;background:#111;border-radius:12px;border:1px solid #222;overflow:hidden;">
          <div data-accion="progreso-toggle" data-base="${esc(base)}" style="display:flex;justify-content:space-between;align-items:center;gap:10px;padding:12px 15px;cursor:pointer;">
            <div style="color:#fff;font-weight:700;font-size:14px;min-width:0;">${esc(ex.nombre)}</div>
            <div style="display:flex;align-items:center;gap:12px;white-space:nowrap;">
              <span style="color:#3b82f6;font-size:13px;font-weight:700;">${esc(last)}kg</span>
              <span style="color:${colorTend};font-size:12px;font-weight:700;">${tendencia}</span>
              <span style="color:#888;font-size:12px;">${abierto ? '▲' : '▼'}</span>
            </div>
          </div>
          ${abierto ? `<div style="padding:0 15px 15px;">
            <div style="height:150px;"><canvas data-canvas="${esc(base)}"></canvas></div>
            <div style="color:#3b82f6;font-size:12px;margin-top:10px;font-weight:bold;" data-resumen="${esc(base)}"></div>
            ${ex.data.some(d => d.en_descarga) ? '<div style="color:#ffb400;font-size:10px;margin-top:4px;">🔻 Puntos en naranja = sesión de descarga</div>' : ''}
          </div>` : ''}
        </div>`;
    });
  }
  return html + '</div>';
}

function seriesComparadasHtml(s, anterior) {
  const seriesActuales = parseSeriesDetalle(s.series);
  if (!seriesActuales.length) {
    return `<div style="color:#eee;font-family:monospace;background:#0a0a0a;padding:8px;border-radius:6px;border:1px solid #1a1a1a;font-size:13px;">${esc(s.series)}</div>`;
  }
  const seriesAnteriores = anterior ? parseSeriesDetalle(anterior.series) : [];
  const colores = { sube: '#22c55e', baja: '#ef4444', igual: '#888', nuevo: '#3b82f6', na: '#888' };
  const iconos = { sube: '↑', baja: '↓', igual: '=', nuevo: '★', na: '' };
  const filas = seriesActuales.map(serie => {
    const cmp = compararSerie(serie, seriesAnteriores[serie.serie - 1]);
    let texto;
    if (serie.seg != null) texto = serie.peso ? `${serie.seg}seg (+${serie.peso}kg)` : `${serie.seg}seg`;
    else if (serie.peso != null && serie.reps != null) texto = `${serie.peso}kg x ${serie.reps}`;
    else texto = serie.texto;
    return `<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;border-bottom:1px solid #151515;">
      <span style="color:#888;font-size:12px;">Serie ${serie.serie}</span>
      <span style="color:${colores[cmp.tipo]};font-weight:700;font-size:13px;">${esc(texto)} ${iconos[cmp.tipo]}</span>
    </div>`;
  }).join('');
  return `<div style="background:#0a0a0a;padding:6px 10px;border-radius:6px;border:1px solid #1a1a1a;">${filas}</div>`;
}

function grupoHtml(clave, grupo, abierto, sesionAnteriorMap, metaDia) {
  const idsGrupoConId = grupo.sesiones.filter(s => s.id != null).map(s => String(s.id));
  const marcadosGrupo = grupo.sesiones.filter(s => s.en_descarga).length;
  const todosMarcadosGrupo = idsGrupoConId.length > 0 && marcadosGrupo === grupo.sesiones.length;
  const labelGrupo = todosMarcadosGrupo ? '🔻 Día en descarga' : (marcadosGrupo > 0 ? `🔻 ${marcadosGrupo}/${grupo.sesiones.length}` : 'Marcar día');
  const chipsDia = metaChipsDe(metaDia);
  const colorTono = k => (META_CHIPS[k].tono === 'warn' ? '#ffb400' : META_CHIPS[k].tono === 'ok' ? '#22c55e' : '#bbb');
  const metaCabecera = (chipsDia.length || (metaDia && metaDia.energia))
    ? ` <span title="Nota del cliente" style="font-size:12px;margin-left:8px;font-weight:600;">${chipsDia.map(k => `<span style="color:${colorTono(k)};margin-right:8px;">${META_CHIPS[k].icon} ${META_CHIPS[k].label}</span>`).join('')}${metaDia && metaDia.energia ? `<span style="color:#f59e0b;">⚡ Energía ${Number(metaDia.energia)}/5</span>` : ''}</span>`
    : '';
  const metaPreview = (metaDia && metaDia.nota_texto)
    ? `<div style="color:#888;font-size:11px;font-weight:400;font-style:italic;margin-top:3px;max-width:340px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">“${esc(metaDia.nota_texto)}”</div>`
    : '';
  const metaCuerpo = (chipsDia.length || (metaDia && (metaDia.nota_texto || metaDia.energia)))
    ? `<div style="margin-bottom:10px;padding:10px 12px;border:1px solid #1e3a5f;border-radius:10px;background:#07111c;">
        <div style="color:#8fa3b8;font-size:10px;font-weight:700;text-transform:uppercase;margin-bottom:6px;">📝 Nota del cliente</div>
        ${chipsDia.length ? `<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:6px;">${chipsDia.map(k => `<span style="font-size:12px;padding:3px 10px;border-radius:14px;border:1px solid ${META_CHIPS[k].tono === 'warn' ? '#ffb400' : META_CHIPS[k].tono === 'ok' ? '#22c55e' : '#444'};color:${colorTono(k)};">${META_CHIPS[k].icon} ${META_CHIPS[k].label}</span>`).join('')}</div>` : ''}
        ${metaDia && metaDia.energia ? `<div style="color:#f59e0b;font-size:12px;margin-bottom:4px;">⚡ Llegó con energía ${Number(metaDia.energia)}/5</div>` : ''}
        ${metaDia && metaDia.nota_texto ? `<div style="color:#ddd;font-size:13px;font-style:italic;">“${esc(metaDia.nota_texto)}”</div>` : ''}
      </div>`
    : '';
  return `
    <div style="margin-bottom:10px;border:1px solid #333;border-radius:12px;background:#080808;overflow:hidden;">
      <div data-toggle-dia="${esc(clave)}" style="display:flex;justify-content:space-between;align-items:center;padding:12px 15px;cursor:pointer;gap:8px;">
        <div style="color:#3b82f6;font-weight:700;font-size:14px;">${grupo.fechaObj ? fecha(grupo.fechaObj) : 'Sin fecha registrada'} <span style="color:#888;font-weight:400;font-size:12px;">(${grupo.sesiones.length} ejercicio${grupo.sesiones.length !== 1 ? 's' : ''})</span>${metaCabecera}${metaPreview}</div>
        <div style="display:flex;align-items:center;gap:10px;">
          ${idsGrupoConId.length ? `<span data-accion="grupo-descarga" data-ids="${esc(idsGrupoConId.join(','))}" data-marcado="${todosMarcadosGrupo ? '1' : ''}" style="cursor:pointer;font-size:10px;font-weight:700;padding:3px 8px;border-radius:6px;border:1px solid ${marcadosGrupo ? '#ffb400' : '#333'};color:${marcadosGrupo ? '#ffb400' : '#888'};">${esc(labelGrupo)}</span>` : ''}
          ${idsGrupoConId.length ? `<span data-accion="grupo-borrar" data-ids="${esc(idsGrupoConId.join(','))}" title="Borrar todo el día" style="cursor:pointer;color:#ff4444;font-size:13px;">🗑️</span>` : ''}
          <div style="color:#888;font-size:12px;">${abierto ? '▲' : '▼'}</div>
        </div>
      </div>
      ${abierto ? `<div style="padding:0 15px 15px;">
        ${metaCuerpo}
        ${grupo.sesiones.map(s => `
          <div style="margin-bottom:10px;padding:12px;border:1px solid #222;border-radius:10px;background:#000;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px;">
              <div style="font-weight:700;color:#3b82f6;font-size:14px;">${esc(s.ejercicio)}</div>
              <div style="display:flex;align-items:center;gap:8px;">
                ${s.id != null ? `<span data-accion="sesion-descarga" data-id="${esc(s.id)}" data-marcado="${s.en_descarga ? '1' : ''}" style="cursor:pointer;font-size:10px;font-weight:700;padding:3px 8px;border-radius:6px;border:1px solid ${s.en_descarga ? '#ffb400' : '#333'};color:${s.en_descarga ? '#ffb400' : '#888'};">🔻</span>` : ''}
                ${s.id != null ? `<span data-accion="sesion-cambiar-ej" data-id="${esc(s.id)}" data-nombre="${esc(s.ejercicio)}" title="Cambiar ejercicio de esta sesión" style="cursor:pointer;color:#3b82f6;font-size:13px;">✏️</span>` : ''}
                ${s.id != null ? `<span data-accion="sesion-borrar" data-id="${esc(s.id)}" title="Borrar esta sesión" style="cursor:pointer;color:#ff4444;font-size:13px;">🗑️</span>` : ''}
              </div>
            </div>
            ${seriesComparadasHtml(s, sesionAnteriorMap.get(s))}
          </div>`).join('')}
      </div>` : ''}
    </div>`;
}

export function sesionesHtml({ clavesRecientes, clavesAntiguas, grupos, sesionesAbiertas, sesionAnteriorMap, etiquetaFiltro, sesionesMeta = [], metaPorFecha = {} }) {
  let html = metaResumenTendenciaHtml(sesionesMeta) + `<div class="charts-title" style="margin-top:25px;margin-bottom:15px;">📋 Sesiones ${etiquetaFiltro ? '— ' + esc(etiquetaFiltro) : ''}</div>`;
  html += '<div style="color:#666;font-size:11px;margin-bottom:10px;">↑ progresa &nbsp; = mantiene &nbsp; ↓ baja &nbsp; ★ primera vez registrada</div>';
  html += clavesRecientes.map(clave => grupoHtml(clave, grupos[clave], !!sesionesAbiertas[clave], sesionAnteriorMap, metaPorFecha[clave])).join('');
  if (clavesAntiguas.length) {
    html += `<div data-accion="mas-antiguo" style="text-align:center;padding:12px;margin-top:6px;border:1px dashed #333;border-radius:12px;color:#888;font-size:13px;cursor:pointer;">
      Ver más antiguo (${clavesAntiguas.length} día${clavesAntiguas.length !== 1 ? 's' : ''} más)
    </div>`;
  }
  return html;
}
