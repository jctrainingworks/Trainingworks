// Historial (Entrenos) · HTML. Todo lo que viene de datos pasa por esc().
import { esc } from '../core/ui.js';
import { compararSerie, parseSeriesDetalle } from './calculos.js';

const fecha = iso => { try { return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' }); } catch { return esc(iso || ''); } };

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
export function graficasHtml(exercisesWithData) {
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
    const ex = exercisesWithData[0];
    const base = ex.nombre.replace(/[^a-zA-Z0-9]/g, '_');
    const hayDescarga = ex.data.some(d => d.en_descarga);
    html += tarjeta('peso_' + base, `${ex.nombre} — PESO (serie top)`, 'kg', hayDescarga)
      + tarjeta('reps_' + base, `${ex.nombre} — REPS (serie top)`, '', hayDescarga)
      + tarjeta('series_' + base, `${ex.nombre} — Nº DE SERIES`, '', hayDescarga);
  } else {
    exercisesWithData.forEach(ex => {
      const base = ex.nombre.replace(/[^a-zA-Z0-9]/g, '_');
      html += tarjeta(base, ex.nombre, 'kg', ex.data.some(d => d.en_descarga));
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

function grupoHtml(clave, grupo, abierto, sesionAnteriorMap) {
  const idsGrupoConId = grupo.sesiones.filter(s => s.id != null).map(s => String(s.id));
  const marcadosGrupo = grupo.sesiones.filter(s => s.en_descarga).length;
  const todosMarcadosGrupo = idsGrupoConId.length > 0 && marcadosGrupo === grupo.sesiones.length;
  const labelGrupo = todosMarcadosGrupo ? '🔻 Día en descarga' : (marcadosGrupo > 0 ? `🔻 ${marcadosGrupo}/${grupo.sesiones.length}` : 'Marcar día');
  return `
    <div style="margin-bottom:10px;border:1px solid #333;border-radius:12px;background:#080808;overflow:hidden;">
      <div data-toggle-dia="${esc(clave)}" style="display:flex;justify-content:space-between;align-items:center;padding:12px 15px;cursor:pointer;gap:8px;">
        <div style="color:#3b82f6;font-weight:700;font-size:14px;">${grupo.fechaObj ? fecha(grupo.fechaObj) : 'Sin fecha registrada'} <span style="color:#888;font-weight:400;font-size:12px;">(${grupo.sesiones.length} ejercicio${grupo.sesiones.length !== 1 ? 's' : ''})</span></div>
        <div style="display:flex;align-items:center;gap:10px;">
          ${idsGrupoConId.length ? `<span data-accion="grupo-descarga" data-ids="${esc(idsGrupoConId.join(','))}" data-marcado="${todosMarcadosGrupo ? '1' : ''}" style="cursor:pointer;font-size:10px;font-weight:700;padding:3px 8px;border-radius:6px;border:1px solid ${marcadosGrupo ? '#ffb400' : '#333'};color:${marcadosGrupo ? '#ffb400' : '#888'};">${esc(labelGrupo)}</span>` : ''}
          ${idsGrupoConId.length ? `<span data-accion="grupo-borrar" data-ids="${esc(idsGrupoConId.join(','))}" title="Borrar todo el día" style="cursor:pointer;color:#ff4444;font-size:13px;">🗑️</span>` : ''}
          <div style="color:#888;font-size:12px;">${abierto ? '▲' : '▼'}</div>
        </div>
      </div>
      ${abierto ? `<div style="padding:0 15px 15px;">
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

export function sesionesHtml({ clavesRecientes, clavesAntiguas, grupos, sesionesAbiertas, sesionAnteriorMap, etiquetaFiltro }) {
  let html = `<div class="charts-title" style="margin-top:25px;margin-bottom:15px;">📋 Sesiones ${etiquetaFiltro ? '— ' + esc(etiquetaFiltro) : ''}</div>`;
  html += '<div style="color:#666;font-size:11px;margin-bottom:10px;">↑ progresa &nbsp; = mantiene &nbsp; ↓ baja &nbsp; ★ primera vez registrada</div>';
  html += clavesRecientes.map(clave => grupoHtml(clave, grupos[clave], !!sesionesAbiertas[clave], sesionAnteriorMap)).join('');
  if (clavesAntiguas.length) {
    html += `<div data-accion="mas-antiguo" style="text-align:center;padding:12px;margin-top:6px;border:1px dashed #333;border-radius:12px;color:#888;font-size:13px;cursor:pointer;">
      Ver más antiguo (${clavesAntiguas.length} día${clavesAntiguas.length !== 1 ? 's' : ''} más)
    </div>`;
  }
  return html;
}
