// Pestaña Avisos: HTML. Réplica de renderDetailAvisos / renderCheckinProg de prueba/index.html. Solo pinta.
import { esc } from '../core/ui.js';
import { calcularEstadoDescarga, DESCARGA_LABELS, DESCANSO_MSG_DEFAULT, descansoMensajeRender } from '../core/descarga.js';
import { fechaLocalISO } from '../periodizacion/calculos.js';

export const CHECKIN_PROG_DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const PERIMETROS = ['cuello', 'brazo', 'antebrazo', 'cadera', 'muslo', 'pantorrilla'];

// Programación del check-in (manual / programado) de un tipo ('plus' | 'simple').
export function checkinProgHtml(c, tipo) {
  const progOn = !!c.checkin_prog_activo && (c.checkin_prog_tipo || 'plus') === tipo;
  const otroProg = !!c.checkin_prog_activo && (c.checkin_prog_tipo || 'plus') !== tipo;
  const dia = c.checkin_prog_dia || 7;
  const hora = String(c.checkin_prog_hora || '20:00').slice(0, 5);
  const repetir = !!c.checkin_prog_repetir;
  const estado = progOn
    ? `<div style="font-size:13px;color:#22c55e;margin-top:10px;">✅ Programado: ${CHECKIN_PROG_DIAS[dia - 1].toLowerCase()} a las ${esc(hora)} · ${repetir ? 'cada semana' : 'solo esta vez'}</div>`
    : `<div style="font-size:13px;color:var(--muted);margin-top:10px;">Sin programar (manual)${otroProg ? ' · este cliente tiene la programación en el otro check-in; si programas aquí, pasa a este' : ''}</div>`;
  return `
    <div style="margin-bottom:14px;" data-cp="${tipo}">
      <div style="font-size:13px;color:var(--muted);margin-bottom:8px;">Envío</div>
      <select id="cp-modo-${tipo}" class="form-input" data-on="${progOn ? '1' : '0'}" data-cp-modo="${tipo}">
        <option value="manual" ${progOn ? '' : 'selected'}>Manual</option>
        <option value="programado" ${progOn ? 'selected' : ''}>Programado</option>
      </select>
      <div id="cp-form-${tipo}" style="display:${progOn ? 'block' : 'none'};">
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;">
          <select id="cp-dia-${tipo}" class="form-input" style="flex:1;min-width:140px;">
            ${CHECKIN_PROG_DIAS.map((n, i) => `<option value="${i + 1}" ${dia === i + 1 ? 'selected' : ''}>${n}</option>`).join('')}
          </select>
          <input id="cp-hora-${tipo}" type="time" class="form-input" style="flex:1;min-width:120px;" value="${esc(hora)}">
        </div>
        <label style="display:flex;gap:8px;align-items:center;margin-top:10px;font-size:13px;cursor:pointer;">
          <input id="cp-rep-${tipo}" type="checkbox" ${repetir ? 'checked' : ''}>
          Repetir cada semana
        </label>
      </div>
      <button id="cp-btn-${tipo}" class="btn" style="display:${progOn ? 'block' : 'none'};margin-top:12px;background:var(--blue);color:#fff;" data-cp-guardar="${tipo}">${progOn ? 'Guardar cambios' : 'Programar'}</button>
      ${estado}
    </div>`;
}

const sel = (v, x) => (v == x ? 'selected' : '');
const boton = (on, accion, txtOn, txtOff) => `<button class="btn" style="background:${on ? 'var(--danger)' : 'var(--blue)'};color:#fff;" data-toggle="${accion}" data-valor="${on ? '0' : '1'}">${on ? txtOn : txtOff}</button>`;

// c = cliente · avisos = filas de `avisos` · st = { tipoSel, diasSel, descansoMsgSel } · seguimiento = registros de seguimiento_corporal
export function avisosHtml(c, avisos, st, seguimiento) {
  const checkinOn = !!c.checkin_activo;
  const checkinSimpleOn = !!c.checkin_simple_activo;
  const nutricionOn = !!c.nutricion_activa;
  const comparativaOn = !!c.comparativa_activa;
  const suplementacionOn = c.suplementacion_activa !== false;
  const tipoDescargaActiva = calcularEstadoDescarga(c);
  const tipoSel = st.tipoSel || 'volumen';
  const diasSel = st.diasSel || 7;

  const avisosFilas = avisos.length
    ? avisos.map(a => `
        <div class="nutri-row" style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;">
          <div style="flex:1;">
            <div style="font-size:13px;color:var(--text);white-space:pre-wrap;">${esc(a.texto)}</div>
            <div style="font-size:11px;color:var(--muted);margin-top:6px;display:flex;align-items:center;gap:8px;">
              <span>${new Date(a.fecha).toLocaleDateString('es-ES')}</span>
              ${a.leido ? '<span style="color:#22c55e;">✅ Leído</span>' : '<span style="color:#f59e0b;">🕓 Pendiente de abrir</span>'}
            </div>
          </div>
          <button class="btn btn-ghost btn-sm" style="color:var(--danger);flex-shrink:0;" title="Borrar este aviso" data-borrar-aviso="${esc(a.id)}">🗑️</button>
        </div>`).join('')
    : '<div style="color:var(--muted);font-size:13px;padding:10px 0;">Aún no hay avisos publicados.</div>';

  // ── Seguimiento y check-in semanal ──
  const modoSeg = (c.seguimiento_modo === 'cintura' || c.seguimiento_modo === 'perimetros') ? c.seguimiento_modo : '';
  const freqSeg = c.frecuencia_seguimiento_semanas || 2;
  const optsFrecSeg = [2, 3, 4].map(n => `<option value="${n}" ${freqSeg == n ? 'selected' : ''}>Cada ${n} semanas</option>`).join('');
  const selFrec = (extra = '') => `<select class="form-input" data-frecuencia ${extra}>${optsFrecSeg}</select>`;
  const selModoSeg = `
    <select class="form-input" data-modo-seguimiento>
      <option value="" ${modoSeg ? '' : 'selected'}>Sin definir (los dos check-ins, como hasta ahora)</option>
      <option value="cintura" ${modoSeg === 'cintura' ? 'selected' : ''}>Solo cintura</option>
      <option value="perimetros" ${modoSeg === 'perimetros' ? 'selected' : ''}>Con perímetros</option>
    </select>`;
  // Último seguimiento completo = el mayor entre la fecha guardada y el último registro con perímetros (como la función
  // obtener_estado_seguimiento de Supabase), para enseñar cuándo le tocará de nuevo.
  const fechasSeg = [c.ultimo_seguimiento_completo]
    .concat((seguimiento || []).filter(r => PERIMETROS.some(k => r[k] != null)).map(r => r.fecha))
    .filter(Boolean).map(f => String(f).slice(0, 10)).sort();
  const ultSeg = fechasSeg.length ? fechasSeg[fechasSeg.length - 1] : null;
  const fmtSeg = iso => new Date(iso + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  let proxSegTxt;
  if (ultSeg) {
    const dp = new Date(ultSeg + 'T00:00:00'); dp.setDate(dp.getDate() + freqSeg * 7);
    proxSegTxt = `Último seguimiento completo: ${fmtSeg(ultSeg)} · le toca de nuevo el ${fmtSeg(fechaLocalISO(dp))}.`;
  } else proxSegTxt = 'Aún no tiene seguimiento completo: el próximo check-in lo pedirá.';

  const legacyCheckins = `
    <div class="nutri-card">
      <div class="nutri-card-title">✅ Check-in plus</div>
      <div style="font-size:13px;color:var(--muted);margin-bottom:10px;">
        ${checkinOn ? 'Activo: el cliente ya puede rellenar su check-in.' : 'Inactivo: el cliente no ve la opción de check-in.'}
      </div>
      ${checkinProgHtml(c, 'plus')}
      ${boton(checkinOn, 'checkin', 'Desactivar check-in', 'Activar check-in')}
      <div style="margin-top:14px;padding-top:14px;border-top:1px solid var(--border);">
        <div style="font-size:13px;color:var(--muted);margin-bottom:8px;">
          Medidas y fotos (peso y sensaciones siguen siendo cada semana) — el check-in plus pide las 7 medidas y las fotos:
        </div>
        ${selFrec()}
      </div>
    </div>

    <div class="nutri-card">
      <div class="nutri-card-title">✅ Check-in simple <span style="color:var(--muted);font-weight:400;font-size:12px;">(peso medio + cintura + preguntas, sin % graso)</span></div>
      <div style="font-size:13px;color:var(--muted);margin-bottom:10px;">
        ${checkinSimpleOn ? 'Activo: el cliente ya puede rellenar su check-in simple.' : 'Inactivo: el cliente no ve la opción de check-in simple.'}
      </div>
      ${checkinProgHtml(c, 'simple')}
      ${boton(checkinSimpleOn, 'checkin_simple', 'Desactivar check-in simple', 'Activar check-in simple')}
      <div style="margin-top:14px;padding-top:14px;border-top:1px solid var(--border);">
        <div style="font-size:13px;color:var(--muted);margin-bottom:8px;">
          Fotos (se piden cada tantas semanas; el peso y la cintura se piden en cada check-in simple):
        </div>
        ${selFrec()}
      </div>
    </div>
  `;
  const bloqueCheckins = modoSeg ? `
    <div class="nutri-card">
      <div class="nutri-card-title">🎯 Seguimiento y check-in semanal</div>
      ${selModoSeg}
      <div style="font-size:12px;color:var(--muted);margin:8px 0 12px;">
        ${modoSeg === 'perimetros'
          ? 'Cada semana, el check-in simple (peso medio + cintura). Cuando toca según la frecuencia, el cliente recibe el plus con perímetros y fotos.'
          : 'Cada semana, el check-in simple (peso medio + cintura). Sin perímetros: solo las fotos se piden según la frecuencia.'}
      </div>
      <div style="font-size:13px;color:var(--muted);margin-bottom:8px;">${modoSeg === 'perimetros' ? 'Perímetros y fotos' : 'Fotos'}:</div>
      ${selFrec()}
      <div style="font-size:12px;color:var(--muted);margin-top:8px;">${proxSegTxt}</div>
      <div style="margin-top:14px;padding-top:14px;border-top:1px solid var(--border);">
        <div style="font-size:13px;color:var(--muted);margin-bottom:10px;">
          ${checkinSimpleOn ? 'Activo: el cliente ya puede rellenar su check-in semanal.' : 'Inactivo: el cliente no ve la opción de check-in.'}
        </div>
        ${checkinProgHtml(c, 'simple')}
        ${boton(checkinSimpleOn, 'checkin_simple', 'Desactivar check-in', 'Activar check-in')}
        ${checkinOn ? '<div style="font-size:12px;color:#f59e0b;margin-top:12px;">⚠️ Tiene activo el check-in plus antiguo: con este modo ya no hace falta. <a href="#" style="color:var(--blue);" data-toggle="checkin" data-valor="0">Desactivarlo</a></div>' : ''}
      </div>
    </div>
  ` : `
    <div class="nutri-card">
      <div class="nutri-card-title">🎯 Seguimiento</div>
      <div style="font-size:12px;color:var(--muted);margin-bottom:8px;">Elige «Solo cintura» o «Con perímetros» y la app decide sola qué check-in toca cada semana. Sin definir, funcionan los dos check-ins de abajo como hasta ahora.</div>
      ${selModoSeg}
    </div>
    ${legacyCheckins}
  `;

  // ── Descarga / descanso total ──
  const finPrevisto = () => { const d = new Date(); d.setDate(d.getDate() + Math.max(1, parseInt(diasSel) || 7) - 1); return fechaLocalISO(d); };
  const previewActiva = esc(descansoMensajeRender(c.mensaje_descanso, c.nombre, c.descarga_fin));
  const previewNueva = esc(descansoMensajeRender(st.descansoMsgSel != null ? st.descansoMsgSel : DESCANSO_MSG_DEFAULT, c.nombre, finPrevisto()));
  const cajaPreview = html => `<div style="font-size:12px;color:var(--muted);margin:10px 0 4px;">Vista previa tal como lo verá:</div>
          <div id="descansoPreview" style="white-space:pre-line;font-size:13px;padding:12px;border-radius:10px;background:rgba(30,144,255,0.08);border:1px solid rgba(30,144,255,0.3);">${html}</div>`;
  const descarga = `
    <div class="nutri-card">
      <div class="nutri-card-title">🔻 Descarga / 😴 Descanso total</div>
      ${tipoDescargaActiva ? `
        <div style="font-size:13px;color:#ffb400;margin-bottom:10px;">
          Activa: ${esc(DESCARGA_LABELS[tipoDescargaActiva] || tipoDescargaActiva)}${c.descarga_fin ? ` · hasta ${new Date(c.descarga_fin + 'T00:00:00').toLocaleDateString('es-ES')}` : ''}.
          ${tipoDescargaActiva === 'completa' ? 'El cliente NO puede entrar a Entrenamiento: ve la pantalla de descanso con el mensaje de abajo.' : 'El cliente ya ve la rutina y TrackLift ajustados.'}
        </div>
        ${tipoDescargaActiva === 'completa' ? `
          <div style="font-size:12px;color:var(--muted);margin-bottom:6px;">Mensaje que ve el cliente (${c.mensaje_descanso ? 'EDITADO' : 'FIJO'}). Puedes usar {nombre}, {dias} y {fecha}.</div>
          <textarea id="descansoMsgInput" class="nutri-textarea" rows="8">${esc(c.mensaje_descanso || DESCANSO_MSG_DEFAULT)}</textarea>
          ${cajaPreview(previewActiva)}
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin:10px 0;">
            <button class="btn btn-primary" data-accion="guardar-mensaje">Guardar mensaje</button>
            <button class="btn btn-ghost" data-accion="restaurar-mensaje">Restaurar mensaje fijo</button>
          </div>
        ` : ''}
        <button class="btn" style="background:var(--danger);color:#fff;" data-accion="desactivar-descarga">${tipoDescargaActiva === 'completa' ? 'Terminar descanso total' : 'Desactivar descarga'}</button>
      ` : `
        <div style="font-size:13px;color:var(--muted);margin-bottom:10px;">
          Inactiva: el cliente entrena con la rutina normal, sin ajustes.
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;">
          <select id="descargaTipoInput" class="form-input" style="flex:1;min-width:160px;">
            <option value="volumen" ${tipoSel === 'volumen' ? 'selected' : ''}>Reducción de volumen (–series)</option>
            <option value="intensidad" ${tipoSel === 'intensidad' ? 'selected' : ''}>Reducción de intensidad (–carga/RIR)</option>
            <option value="completa" ${tipoSel === 'completa' ? 'selected' : ''}>DESCANSO TOTAL (no puede entrenar)</option>
          </select>
          <input id="descargaDiasInput" class="form-input" type="number" min="1" value="${esc(diasSel)}" style="width:80px;" placeholder="días" />
        </div>
        ${tipoSel === 'completa' ? `
          <div style="font-size:12px;color:var(--muted);margin-bottom:6px;">Mensaje fijo para el cliente — edítalo si quieres (solo para este descanso). Puedes usar {nombre}, {dias} y {fecha}.</div>
          <textarea id="descansoMsgInput" class="nutri-textarea" rows="8">${esc(st.descansoMsgSel != null ? st.descansoMsgSel : DESCANSO_MSG_DEFAULT)}</textarea>
          ${cajaPreview(previewNueva)}
          <div style="margin:10px 0;"><button class="btn btn-ghost btn-xs" data-accion="restaurar-mensaje">Restaurar mensaje fijo</button></div>
        ` : ''}
        <button class="btn btn-primary" data-accion="activar-descarga">${tipoSel === 'completa' ? 'Activar descanso total' : 'Activar descarga'}</button>
      `}
    </div>`;

  const cuestionario = c.cuestionario_alimentos_activo
    ? 'Activo: el cliente lo ve en su pantalla de inicio y puede rellenarlo.'
    : (c.alimentos_propuestos_cliente && c.alimentos_propuestos_cliente.estado === 'pendiente')
      ? '📩 Respuesta recibida: revísala en Nutrición, arriba de Alergias / alimentos que no quiere.'
      : (c.alimentos_propuestos_cliente && c.alimentos_propuestos_cliente.estado === 'aplicada')
        ? 'Respondido y aplicado. Puedes volver a activarlo si quieres que lo repita.'
        : 'Inactivo: el cliente no ve el cuestionario.';

  return `
    <div class="nutri-card">
      <div class="nutri-card-title">📣 Publicar aviso</div>
      <textarea class="nutri-textarea" id="avisoTexto" placeholder="Ej. Esta semana sube un poco el peso en sentadilla..."></textarea>
      <button class="btn btn-primary" style="margin-top:10px;" data-accion="publicar-aviso">Publicar</button>
    </div>

    ${bloqueCheckins}

    ${descarga}

    <div class="nutri-card">
      <div class="nutri-card-title">🥗 Nutrición</div>
      <div style="font-size:13px;color:var(--muted);margin-bottom:10px;">
        ${nutricionOn ? 'Activa: el cliente ya puede ver su plan de nutrición.' : 'Inactiva: el cliente no ve la nutrición.'}
      </div>
      ${boton(nutricionOn, 'nutricion', 'Desactivar nutrición', 'Activar nutrición')}
    </div>

    <div class="nutri-card">
      <div class="nutri-card-title">🍽 Cuestionario de alimentos <span style="color:var(--muted);font-weight:400;font-size:12px;">(qué NO come)</span></div>
      <div style="font-size:13px;color:var(--muted);margin-bottom:10px;">${cuestionario}</div>
      ${boton(!!c.cuestionario_alimentos_activo, 'cuestionario', 'Desactivar cuestionario', 'Activar cuestionario')}
    </div>

    <div class="nutri-card">
      <div class="nutri-card-title">🕐 Entrenamiento anterior</div>
      <div style="font-size:13px;color:var(--muted);margin-bottom:10px;">
        ${comparativaOn ? 'Activo: el cliente ve junto a cada serie lo que hizo la vez anterior.' : 'Inactivo: el cliente solo ve su objetivo, sin comparar con la sesión pasada.'}
      </div>
      ${boton(comparativaOn, 'comparativa', 'Desactivar entrenamiento anterior', 'Activar entrenamiento anterior')}
    </div>

    <div class="nutri-card">
      <div class="nutri-card-title">💊 Suplementación</div>
      <div style="font-size:13px;color:var(--muted);margin-bottom:10px;">
        ${suplementacionOn ? 'Activa: el cliente ve la sección de suplementos en la app.' : 'Inactiva: el cliente no ve la sección de suplementos.'}
      </div>
      ${boton(suplementacionOn, 'suplementacion', 'Desactivar suplementación', 'Activar suplementación')}
    </div>

    <div class="nutri-card">
      <div class="nutri-card-title" style="display:flex; justify-content:space-between; align-items:center;">
        <span>🗂️ Historial de avisos</span>
        ${avisos.length ? '<button class="btn" style="background:var(--danger); color:#fff; font-size:12px; padding:6px 10px;" data-accion="borrar-historial">Borrar historial</button>' : ''}
      </div>
      ${avisosFilas}
    </div>
  `;
}
