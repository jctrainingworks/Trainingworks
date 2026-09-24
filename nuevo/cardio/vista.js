// Cardio · HTML de cada bloque de la pestaña. Todo lo que viene de datos pasa por esc().
import { esc } from '../core/ui.js';
import {
  PARQ_PREGUNTAS, CARDIO_TESTS, CARDIO_FASE_SUGERIDA,
  calcularZonasKarvonen, fcDeTest, parseSesionCardio, notaVisible
} from './calculos.js';

const fecha = valor => esc(new Date(valor).toLocaleDateString('es-ES'));
const suave = '<span class="f-muted">—</span>';

// ── PAR-Q ──
export function parqFormHtml(parqRegistros) {
  return `
    <div class="f-card">
      <div class="f-card-title">🫀 Valoración cardiorrespiratoria</div>
      <div class="f-ayuda">
        Antes de hacer cualquier test de VO2máx hay que pasar este PAR-Q rápido (vigente 6 meses).
        ${parqRegistros.length ? 'El último que tienes ha caducado — toca repetirlo.' : 'Este cliente todavía no tiene ninguno registrado.'}
      </div>
      <div class="cardio-parq">
        ${PARQ_PREGUNTAS.map(p => `
          <label class="f-check"><input type="checkbox" data-parq="${esc(p.id)}" /> ${esc(p.label)}</label>`).join('')}
      </div>
      <div class="f-ayuda">Si marcas algún "sí", quedará registrado como "requiere visto bueno médico" — la app no borra el histórico, tú decides si sigues adelante.</div>
      <button class="btn btn-primary" data-accion="parq-guardar">Guardar PAR-Q</button>
    </div>`;
}

export function parqEstadoHtml(parq) {
  const noApto = parq.resultado === 'no_apto_requiere_medico';
  return `
    <div class="f-card">
      <div class="f-card-title">✅ PAR-Q vigente</div>
      <div class="${noApto ? 'f-peligro' : 'f-ok'}" style="font-size:13px;">
        ${noApto
          ? `⚠️ Con respuestas positivas — se recomendó consulta médica antes de hacer pruebas de esfuerzo. Registrado el ${fecha(parq.fecha)}.`
          : `✅ Apto, sin banderas rojas. Registrado el ${fecha(parq.fecha)} (caduca a los 6 meses).`}
      </div>
    </div>`;
}

// ── Elegir test ──
export function testHtml(cliente, testSel, pesoActual) {
  const cfg = CARDIO_TESTS[testSel];
  const generoM = cliente.genero === 'Mujer';
  return `
    <div class="f-card">
      <div class="f-card-title">🏃 Elegir test</div>
      <div class="f-fila">
        ${Object.keys(CARDIO_TESTS).map(t => `
          <button class="btn ${testSel === t ? 'btn-primary' : 'btn-ghost'} btn-sm" data-accion="test-elegir" data-test="${esc(t)}">${esc(CARDIO_TESTS[t].label)}</button>`).join('')}
      </div>
      ${cfg ? `
        <div class="f-ayuda">${esc(cfg.desc)}</div>
        <div class="f-grid" style="grid-template-columns:repeat(auto-fill,minmax(160px,1fr));margin-bottom:12px;">
          ${cfg.campos.map(campo => {
            // Peso y edad se rellenan solos desde la ficha / el último registro de Cuerpo.
            const auto = campo.id === 'peso' ? pesoActual : campo.id === 'edad' ? (cliente.edad ?? '') : '';
            return `
            <div class="f-caja">
              <label for="cardio_${esc(campo.id)}">${esc(campo.label)}</label>
              ${campo.tipo === 'sexo'
                ? `<select id="cardio_${esc(campo.id)}" data-campo="${esc(campo.id)}"><option value="H" ${generoM ? '' : 'selected'}>Hombre</option><option value="M" ${generoM ? 'selected' : ''}>Mujer</option></select>`
                : `<input id="cardio_${esc(campo.id)}" data-campo="${esc(campo.id)}" type="number" step="0.1" value="${esc(auto)}" />`}
            </div>`;
          }).join('')}
        </div>
        <button class="btn btn-primary" data-accion="test-guardar">Calcular y guardar</button>`
      : '<div class="f-ayuda" style="margin:0;">Elige uno de los 3 tests según lo que tengas disponible con este cliente.</div>'}
    </div>`;
}

// ── Histórico ──
function textoFC(h, anterior) {
  const fc = fcDeTest(h);
  if (fc == null) return suave;
  const fcAnt = anterior ? fcDeTest(anterior) : null;
  let delta = '';
  if (fcAnt != null && fc !== fcAnt) {
    delta = fc < fcAnt ? ' <span class="f-ok f-mini">↓ mejora</span>' : ' <span class="f-muted f-mini">↑</span>';
  }
  return `${esc(fc)} ppm${delta}`;
}

// Velocidad/inclinación de un test hecho en cinta, con delta contra el test anterior del MISMO tipo.
function textoCinta(h, anterior) {
  const vel = h.datos_input && h.datos_input.velocidad;
  const inc = h.datos_input && h.datos_input.inclinacion;
  if (vel == null && inc == null) return suave;
  const partes = [];
  if (vel != null) partes.push(`${esc(vel)} km/h`);
  if (inc != null) partes.push(`${esc(inc)}% inc.`);
  let delta = '';
  if (anterior) {
    const velAnt = anterior.datos_input && anterior.datos_input.velocidad;
    const incAnt = anterior.datos_input && anterior.datos_input.inclinacion;
    const bits = [];
    if (vel != null && velAnt != null && vel !== velAnt) bits.push(vel > velAnt ? '↑ vel' : '↓ vel');
    if (inc != null && incAnt != null && inc !== incAnt) bits.push(inc > incAnt ? '↑ inc' : '↓ inc');
    if (bits.length) delta = ` <span class="f-ok f-mini">(${bits.join(', ')})</span>`;
  }
  return partes.join(' · ') + delta;
}

export function historialHtml(historial) {
  if (!historial.length) {
    return '<div class="f-card"><div class="f-card-title">📈 Histórico</div><div class="f-ayuda" style="margin:0;">Todavía no hay valoraciones guardadas.</div></div>';
  }
  const porTipo = {};
  historial.forEach(h => { (porTipo[h.tipo_test] = porTipo[h.tipo_test] || []).push(h); });
  // Con un solo test una gráfica no dice nada: solo se dibuja con 2 o más del mismo tipo.
  const conGrafica = Object.keys(porTipo).filter(t => porTipo[t].length >= 2);
  return `
    <div class="f-card">
      <div class="f-card-title">📈 Histórico de VO2máx</div>
      <div class="f-scroll">
        <table class="f-tabla" style="min-width:640px;">
          <thead><tr><th>Fecha</th><th>Test</th><th>VO2máx</th><th>Categoría</th><th>FC</th><th>Cinta</th><th></th></tr></thead>
          <tbody>
            ${historial.map((h, idx) => {
              const anterior = historial.slice(idx + 1).find(x => x.tipo_test === h.tipo_test);
              return `<tr>
                <td>${fecha(h.fecha)}</td>
                <td>${esc(CARDIO_TESTS[h.tipo_test]?.label || h.tipo_test)}</td>
                <td>${esc(h.vo2max_estimado)} ml/kg/min</td>
                <td>${esc(h.categoria)}</td>
                <td class="f-mini">${textoFC(h, anterior)}</td>
                <td class="f-mini">${textoCinta(h, anterior)}</td>
                <td><button class="btn btn-ghost btn-sm f-borrar" data-accion="valoracion-borrar" data-id="${esc(h.id)}" title="Borrar este registro">🗑️</button></td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
      <div class="f-ayuda" style="margin:8px 0 0;">💡 Repite el test cada 8-12 semanas para ver evolución real, no solo el número suelto.</div>
    </div>
    ${conGrafica.map(tipo => `
      <div class="f-card">
        <div class="f-card-title">📊 Evolución — ${esc(CARDIO_TESTS[tipo]?.label || tipo)}</div>
        <div class="cardio-grafica"><canvas data-grafica-test="${esc(tipo)}"></canvas></div>
        <div class="f-ayuda cardio-leyenda" style="margin:8px 0 0;">
          <span><i style="background:#3b82f6"></i>VO2máx</span>
          <span><i style="background:#ef4444"></i>FC</span>
        </div>
      </div>`).join('')}`;
}

// Datos para dibujar la evolución de cada tipo de test con 2+ registros (del más antiguo al más reciente).
export function seriesEvolucion(historial) {
  const porTipo = {};
  historial.forEach(h => { (porTipo[h.tipo_test] = porTipo[h.tipo_test] || []).push(h); });
  return Object.keys(porTipo).filter(t => porTipo[t].length >= 2).map(tipo => {
    const ordenado = [...porTipo[tipo]].reverse();
    return {
      tipo,
      labels: ordenado.map(h => new Date(h.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })),
      vo2: ordenado.map(h => h.vo2max_estimado),
      fc: ordenado.map(h => fcDeTest(h))
    };
  });
}

// ── Prescripción de cardio ──
export function prescripcionHtml(cliente, ultimoTest, ejerciciosCardio) {
  const fcReposo = cliente.fc_reposo || (ultimoTest && ultimoTest.datos_input && ultimoTest.datos_input.fc_reposo) || 70;
  const { fcMax, zonas } = calcularZonasKarvonen(fcReposo, cliente.edad);
  const sug = (ultimoTest && CARDIO_FASE_SUGERIDA[ultimoTest.categoria]) || CARDIO_FASE_SUGERIDA['Media'];
  return `
    <div class="f-card">
      <div class="f-card-title">🏃 Rutina de cardio a seguir</div>
      ${!ultimoTest ? `<div class="f-ayuda">Sin un test de VO2máx todavía uso zona ${sug.zona}% por defecto${cliente.fc_reposo ? '' : ' (y FC reposo 70 por defecto, añádela en Datos básicos para afinar)'}. Haz un test arriba para afinar la prescripción.</div>` : ''}
      <div class="f-ayuda">
        FCmáx estimada: <b class="f-blanco">${fcMax} ppm</b> &nbsp;·&nbsp;
        Zona 60%: <b class="f-blanco">${zonas[60].lo}-${zonas[60].hi} ppm</b> &nbsp;·&nbsp;
        Zona 70%: <b class="f-blanco">${zonas[70].lo}-${zonas[70].hi} ppm</b> &nbsp;·&nbsp;
        Zona 80%: <b class="f-blanco">${zonas[80].lo}-${zonas[80].hi} ppm</b>
      </div>

      ${ejerciciosCardio.length ? `
        <div class="f-scroll">
          <table class="f-tabla" style="margin-bottom:14px;min-width:480px;">
            <thead><tr><th>Tipo</th><th>Frecuencia</th><th>Duración</th><th>Notas</th><th></th></tr></thead>
            <tbody>
              ${ejerciciosCardio.map(e => `<tr>
                <td>${esc(e.nombre)}</td><td>${esc(e.series)}x/semana</td><td>${esc(e.repeticiones)}</td>
                <td class="f-mini">${esc(notaVisible(e.notas))}</td>
                <td><button class="btn btn-ghost btn-sm" data-accion="linea-borrar" data-id="${esc(e.id)}" title="Borrar esta sesión">🗑️</button></td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
        <div class="f-ayuda">💡 Para editar una línea (no solo borrarla), ve a la pestaña Rutinas → chip "Todos" → "🫀 Cardio" (ahí es una rutina normal, editable como cualquier otra).</div>`
      : '<div class="f-ayuda" style="font-size:13px;">Este cliente todavía no tiene cardio pautado.</div>'}

      <div class="cardio-nueva">
        <div class="f-ayuda">
          Sugerencia según su último resultado: <b class="f-blanco">Fase ${esc(sug.fase)}</b> — ~${sug.frecuencia}x/semana, ${sug.duracion}min, zona ${sug.zona}%.
        </div>
        <div class="f-grid" style="margin-bottom:12px;">
          <div class="f-caja">
            <label for="cardio_rx_tipo">Tipo</label>
            <select id="cardio_rx_tipo">
              <option>Bici</option><option>Cinta</option><option>Elíptica</option>
              <option>Remo</option><option>Caminar</option><option selected>Cardio libre</option>
            </select>
          </div>
          <div class="f-caja" style="grid-column:span 2;">
            <label for="cardio_rx_zona">Zona (Karvonen)</label>
            <select id="cardio_rx_zona" style="font-size:16px;">
              <option value="60" ${sug.zona === 60 ? 'selected' : ''}>60% (suave)</option>
              <option value="70" ${sug.zona === 70 ? 'selected' : ''}>70% (moderada)</option>
              <option value="80" ${sug.zona === 80 ? 'selected' : ''}>80% (dura)</option>
            </select>
          </div>
          <div class="f-caja">
            <label for="cardio_rx_duracion">Duración (min)</label>
            <input id="cardio_rx_duracion" type="number" value="${sug.duracion}" />
          </div>
          <div class="f-caja">
            <label for="cardio_rx_frecuencia">Frecuencia (x/semana)</label>
            <input id="cardio_rx_frecuencia" type="number" value="${sug.frecuencia}" />
          </div>
        </div>
        <div class="f-caja f-caja-izq" data-notas hidden style="margin-bottom:12px;">
          <label for="cardio_rx_notas">Indicaciones para esta sesión</label>
          <textarea id="cardio_rx_notas" class="f-textarea" rows="2" placeholder="Ej: subir intensidad progresivamente, evitar impacto en rodilla..."></textarea>
        </div>
        <button class="btn btn-ghost btn-sm" data-accion="notas-abrir" style="margin-bottom:12px;">📝 Añadir notas</button>
        <div><button class="btn btn-primary" data-accion="cardio-anadir">+ Añadir a la rutina de cardio</button></div>
      </div>
    </div>`;
}

// ── Progresión de sesiones ──
const flecha = (actual, anterior) => {
  if (actual == null || anterior == null || actual === anterior) return '';
  return actual > anterior ? ' <span class="f-ok f-mini">↑</span>' : ' <span class="f-muted f-mini">↓</span>';
};

// `sesiones` viene ordenado fecha descendente y son solo las de la rutina de cardio.
export function progresionHtml(sesiones) {
  const conCinta = sesiones
    .map(s => ({ ...s, cinta: parseSesionCardio(s.series_detalle) }))
    .filter(s => s.cinta.vel != null || s.cinta.inc != null || s.cinta.dur != null);
  return `
    <div class="f-card">
      <div class="f-card-title">📈 Progresión de sesiones de cardio</div>
      ${sesiones.length ? `
        <div class="cardio-grafica"><canvas data-grafica-progresion></canvas></div>
        <div class="f-ayuda" style="margin:8px 0 0;">Sesiones que el cliente ha registrado desde su app (mismo botón "Guardar sesión" de siempre), agrupadas por semana.</div>`
      : '<div class="f-ayuda" style="font-size:13px;margin:0;">Todavía no ha registrado ninguna sesión de cardio desde su app.</div>'}
      ${conCinta.length ? `
        <div class="cardio-cinta">
          <div class="f-ayuda">🏃 Últimas sesiones reales en cinta (lo que marca el cliente al guardar la sesión):</div>
          <table class="f-tabla">
            <thead><tr><th>Fecha</th><th>Velocidad</th><th>Inclinación</th><th>Duración</th></tr></thead>
            <tbody>
              ${conCinta.slice(0, 8).map((s, idx) => {
                const ant = conCinta[idx + 1];
                return `<tr>
                  <td>${fecha(s.fecha)}</td>
                  <td>${s.cinta.vel != null ? esc(s.cinta.vel) + ' km/h' + flecha(s.cinta.vel, ant && ant.cinta.vel) : '—'}</td>
                  <td>${s.cinta.inc != null ? esc(s.cinta.inc) + '%' + flecha(s.cinta.inc, ant && ant.cinta.inc) : '—'}</td>
                  <td>${s.cinta.dur != null ? esc(s.cinta.dur) + ' min' : '—'}</td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
          <div class="f-ayuda" style="margin:6px 0 0;">Subir velocidad o inclinación aquí ya es progreso real, aunque no le toque repetir el test de VO2máx todavía.</div>
        </div>` : ''}
    </div>`;
}

// Sesiones por semana (lunes de cada semana), las últimas 8.
export function sesionesPorSemana(sesiones) {
  const porSemana = {};
  sesiones.forEach(s => {
    const d = new Date(s.fecha);
    const lunes = new Date(d);
    lunes.setDate(lunes.getDate() - ((lunes.getDay() + 6) % 7));
    const clave = lunes.toISOString().slice(0, 10);
    porSemana[clave] = (porSemana[clave] || 0) + 1;
  });
  const semanas = Object.keys(porSemana).sort().slice(-8);
  return {
    labels: semanas.map(k => new Date(k).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })),
    valores: semanas.map(k => porSemana[k])
  };
}
