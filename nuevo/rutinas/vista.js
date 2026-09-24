// Rutinas · HTML de la pestaña. Todo lo que viene de datos pasa por esc().
import { esc } from '../core/ui.js';
import { ATR_TIPOS, avisoDuracionMesociclo } from '../core/atr.js';
import { TECNICAS_SERIE, TECNICAS_GRUPO, parseTecnicaSerie, parseGrupoTecnica, colorGrupoCodigo, calcVolumenEquivalente } from '../core/tecnicas.js';
import { aplicarDescargaEjercicio } from '../core/descarga.js';

const nombreMesociclo = m => `${m.nombre ? m.nombre : 'Mesociclo'} ${m.numero}`;

// Chip de una técnica de alta intensidad dentro de una serie.
function badgeTecnica(texto) {
  const t = parseTecnicaSerie(texto);
  if (t.tipo === 'normal') return '';
  const cfg = TECNICAS_SERIE[t.tipo];
  if (!cfg || (!cfg.onOff && !t.n)) return '';
  const extra = cfg.onOff ? '' : (t.tipo === 'drop_set' ? `${t.n}${t.pct ? ` -${t.pct}%` : ''}` : `+${t.n}`);
  return `<div class="rut-chip-tec" title="${esc(cfg.label)}" style="background:${cfg.color}22;color:${cfg.color};">⚡${esc(cfg.corto)}${extra ? ' ' + esc(extra) : ''}</div>`;
}

export function chipsHtml(mesociclos, seleccionado) {
  if (!mesociclos.length) {
    return `<div class="rut-chips"><div class="rut-sin-mes">Sin mesociclos todavía — las rutinas se muestran todas juntas.</div></div>`;
  }
  const chip = (activo, contenido) => `class="rut-chip ${activo ? 'activo' : ''}"`;
  return `
    <div class="rut-chips">
      <button ${chip(seleccionado === null)} data-accion="mesociclo" data-id="todos">Todos</button>
      ${mesociclos.map(m => {
        const atr = m.tipo_atr ? ATR_TIPOS[m.tipo_atr] : null;
        // Solo se avisa de duración larga en el mesociclo activo (sin fecha_fin).
        const aviso = !m.fecha_fin ? avisoDuracionMesociclo(m) : null;
        return `
        <button ${chip(String(seleccionado) === String(m.id))} data-accion="mesociclo" data-id="${esc(m.id)}">
          ${atr ? `<span class="rut-punto" title="${esc(atr.label)}" style="background:${atr.color};"></span>` : ''}
          ${esc(nombreMesociclo(m))}${!m.fecha_fin ? ' 🟢' : ''}
          ${aviso ? `<span title="${esc(aviso)}" style="cursor:help;">⏱️</span>` : ''}
        </button>`;
      }).join('')}
    </div>`;
}

function ejercicioHtml(exOriginal, tipoDescarga) {
  const ex = tipoDescarga ? aplicarDescargaEjercicio(exOriginal, tipoDescarga) : exOriginal;
  const lista = valor => String(valor || '').split(',').map(s => s.trim());
  const reps = lista(ex.repeticiones), rir = lista(ex.rir), desc = lista(ex.descanso), tec = lista(ex.tecnica);
  const numS = parseInt(ex.series) || reps.filter(Boolean).length || 1;
  const volEq = calcVolumenEquivalente(ex);
  const grupo = parseGrupoTecnica(ex.grupo_tecnica);
  const color = grupo.tipo ? colorGrupoCodigo(grupo.codigo) : '';
  const series = Array.from({ length: numS }, (_, i) => `
    <div class="rut-serie">
      <div class="rut-serie-n">S${i + 1}</div>
      <div class="rut-serie-val">${esc(reps[i] || reps[0] || '—')} / RIR ${esc(rir[i] || rir[0] || '—')} / ${esc(desc[i] || desc[0] || '—')}</div>
      ${badgeTecnica(tec[i] || 'normal')}
    </div>`).join('');
  return `
    <div class="rut-ejercicio" ${grupo.tipo ? `style="border-left:3px solid ${color};"` : ''}>
      <div class="rut-ej-info" ${grupo.tipo ? 'style="padding-left:8px;"' : ''}>
        <div class="rut-ej-cabecera">
          <button class="btn btn-ghost btn-xs rut-ej-borrar" data-accion="ejercicio-borrar" data-id="${esc(ex.id)}" title="Eliminar ejercicio">🗑️</button>
          <div class="ex-name">${esc(ex.nombre)}</div>
        </div>
        ${ex.notas ? `<div class="rut-nota">${esc(ex.notas)}</div>` : ''}
        ${ex._notaDescarga ? `<div class="rut-nota-descarga">🔻 ${esc(ex._notaDescarga)}</div>` : ''}
        ${grupo.tipo ? `<div class="rut-grupo" style="background:${color}22;color:${color};">🔗 ${esc(TECNICAS_GRUPO[grupo.tipo].corto)} · ${esc(grupo.codigo)}</div>` : ''}
        ${volEq > numS ? `<div class="rut-vol">Vol. equivalente: ${volEq % 1 === 0 ? volEq : volEq.toFixed(1)} series</div>` : ''}
      </div>
      ${series}
    </div>`;
}

export function rutinaHtml(r, { ejercicios, mesociclos, hermanas, abierta, tipoDescarga }) {
  // Número de orden (rotación de la app del cliente); se marca REPETIDO si otra del mismo mesociclo lo comparte.
  const repetido = !r.es_cardio && hermanas.some(o => String(o.id) !== String(r.id) && !o.es_cardio
    && String(o.mesociclo_id ?? '') === String(r.mesociclo_id ?? '') && (o.orden ?? null) === (r.orden ?? null));
  return `
    <div class="routine-block">
      <div class="routine-header" data-toggle="${esc(r.id)}">
        <div class="rut-cab-izq">
          ${r.es_cardio ? '' : `
          <div class="rut-orden ${repetido ? 'repetido' : ''}" title="Orden en la rotación de la app (1 = primera). Cámbialo y se recolocan las demás.">
            <input type="number" min="1" value="${esc(r.orden ?? '')}" data-orden="${esc(r.id)}" />
            <span>${repetido ? 'REPETIDO' : 'ORDEN'}</span>
          </div>`}
          <div>
            <div class="routine-name">${esc(r.nombre)}</div>
            <div class="routine-code">${ejercicios.length} ejercicios</div>
          </div>
        </div>
        <div class="rut-cab-der">
          ${mesociclos.length ? `
          <select data-mover="${esc(r.id)}" title="Mover a otro mesociclo">
            <option value="" ${!r.mesociclo_id ? 'selected' : ''}>Sin mesociclo</option>
            ${mesociclos.map(m => `<option value="${esc(m.id)}" ${String(r.mesociclo_id) === String(m.id) ? 'selected' : ''}>${esc(nombreMesociclo(m))}</option>`).join('')}
          </select>` : ''}
          <button class="btn btn-danger btn-xs" data-accion="rutina-borrar" data-id="${esc(r.id)}" data-nombre="${esc(r.nombre)}">🗑️</button>
          <span class="rut-flecha">${abierta ? '▲' : '▼'}</span>
        </div>
      </div>
      ${abierta ? `
      <div class="routine-body">
        ${ejercicios.length === 0
          ? '<div class="f-ayuda" style="padding:10px 0;margin:0;">Sin ejercicios aún</div>'
          : `<div class="rut-encabezado"><div class="ex-head" style="flex:1;min-width:150px;padding-left:36px;">Ejercicio</div><div class="ex-head">Series →</div></div>
             ${ejercicios.map(e => ejercicioHtml(e, tipoDescarga)).join('')}`}
      </div>` : ''}
    </div>`;
}

export function listaHtml(rutinas, ctxLista) {
  return `
    <div class="rut-barra">
      <div class="f-ayuda" style="margin:0;font-size:13px;">${rutinas.length} rutina${rutinas.length !== 1 ? 's' : ''} asignadas</div>
      <button class="btn btn-primary btn-sm" data-accion="rutina-nueva">+ Añadir Rutina</button>
    </div>
    ${rutinas.length === 0
      ? '<div class="empty">No hay rutinas. Añade la primera 💪</div>'
      : rutinas.map(r => rutinaHtml(r, {
          ejercicios: ctxLista.ejerciciosDe(r.id),
          mesociclos: ctxLista.mesociclos,
          hermanas: rutinas,
          abierta: String(ctxLista.abierta) === String(r.id),
          tipoDescarga: ctxLista.tipoDescarga
        })).join('')}
    <div class="f-ayuda rut-pendiente">
      Añadir y editar ejercicios, y crear o cerrar mesociclos, de momento se hace en el panel actual.
      <a href="../prueba/">Abrir el panel actual</a>
    </div>`;
}
