// Etapas: HTML. Solo pinta.
import { esc } from '../core/ui.js';
import { fechaLocalISO } from '../periodizacion/calculos.js';
import { ETAPA_TIPOS, ETAPAS_SQL, etFechaTxt, etSemanas, etKcalTxt, vistaDesde, ultimaFin, vistaEtapa } from './calculos.js';

export function cargandoHtml() { return '<div class="loading"><div class="loading-spin">⚙</div><div>Cargando etapas...</div></div>'; }

export function errorTablasHtml(mensaje) {
  return `<div class="pz-card">
    <div style="font-weight:700;margin-bottom:6px;">🏁 Etapas — falta crear las tablas en Supabase</div>
    <div style="font-size:13px;color:#aab4c5;margin-bottom:10px;">Copia el SQL, pégalo en el SQL Editor de Supabase y ejecútalo una vez. Luego recarga esta pestaña.</div>
    <button class="btn btn-primary btn-sm" data-accion="copiar-sql">📋 Copiar SQL</button>
    <button class="btn btn-ghost btn-sm" data-accion="reintentar">Reintentar</button>
    <pre style="margin-top:10px;max-height:220px;overflow:auto;font-size:11px;white-space:pre-wrap;color:#aab4c5;">${esc(ETAPAS_SQL)}</pre>
    <div style="font-size:11px;color:#666;margin-top:6px;">Detalle del error: ${esc(mensaje)}</div>
  </div>`;
}

export function listaEtapasHtml(cliente, lista) {
  const tarjetas = lista.map(e => `
    <div class="pz-card" style="padding:14px 18px;cursor:pointer;" data-accion="ver-etapa" data-id="${esc(e.id)}">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
        <div class="pz-title" style="margin:0;">${esc(e.titulo)}</div>
        <div style="display:flex;align-items:center;gap:8px;">
          ${e.tipo ? `<span class="tag tag-obj">${esc(e.tipo)}</span>` : ''}
          <button class="btn btn-ghost btn-xs" title="Borrar esta copia" data-accion="borrar-etapa" data-id="${esc(e.id)}">🗑️</button>
        </div>
      </div>
      <div style="color:var(--muted);font-size:13px;margin-top:6px;">${etFechaTxt(e.fecha_inicio)} → ${etFechaTxt(e.fecha_fin)} · ${etSemanas(e.fecha_inicio, e.fecha_fin)} sem</div>
      ${(e.kcal_inicio != null || e.kcal_fin != null) ? `<div style="color:#fff;font-size:13px;margin-top:6px;">🔥 ${esc(etKcalTxt(e.kcal_inicio, e.kcal_fin))}</div>` : ''}
      ${e.nota ? `<div style="color:#C3CCD9;font-size:13px;margin-top:8px;white-space:pre-wrap;">${esc(e.nota)}</div>` : ''}
    </div>`).join('');
  return `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;gap:8px;">
      <div style="color:#fff;font-weight:700;font-size:16px;">🏁 Etapas de ${esc(cliente.nombre || '')}</div>
      <button class="btn btn-primary btn-sm" data-accion="cerrar-etapa">+ Cerrar etapa</button>
    </div>
    ${lista.length ? tarjetas : '<div class="empty" style="padding:24px 8px;color:#aab4c5;">Todavía no hay etapas guardadas. Pulsa «Cerrar etapa» para guardar una copia de todo lo hecho entre dos fechas (rutina, medidas, sesiones y calorías).</div>'}`;
}

// Franja «Vista: Etapa actual · desde … / Todo el historial». '' si no hay etapas cerradas.
export function franjaEtapaHtml(etapas) {
  const fin = ultimaFin(etapas); if (!fin) return '';
  const act = vistaEtapa.valor !== 'todo';
  return `<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:12px 0 4px;">
    <span style="font-size:12px;color:#aab4c5;">Vista</span>
    <button class="pz-chip ${act ? 'on' : ''}" data-vista-etapa="actual">Etapa actual · desde ${etFechaTxt(vistaDesde(etapas, 'actual'))}</button>
    <button class="pz-chip ${!act ? 'on' : ''}" data-vista-etapa="todo">Todo el historial</button>
  </div>`;
}

// d = { titulo, tipo, ini, fin, kcalIni, kcalFin, nota, nueva, nuevoNombre, nuevoTipo, rut, med, ses, kcal }, resumenHtml ya calculado
export function modalCerrarEtapaHtml(cliente, d, { resumenHtml, kcalNota, csd, tiposNuevo }) {
  const chk = (k, txt) => `<label style="display:flex;gap:8px;align-items:center;color:#fff;font-size:13px;margin:4px 0;"><input type="checkbox" data-chk="${k}" ${d[k] !== false ? 'checked' : ''}> ${txt}</label>`;
  return `
<div class="modal">
  <div class="modal-title">🏁 Cerrar etapa</div>
  <div class="modal-sub">Para ${esc(cliente.nombre || '')}. Guarda una copia de todo lo hecho entre dos fechas. No se borra ni se oculta nada del panel.</div>
  <div class="form-group"><label class="form-label">Título</label>
    <input class="form-input" data-campo="titulo" placeholder="Ej: Definición verano 2026" value="${esc(d.titulo || '')}"></div>
  <div class="form-group"><label class="form-label">Tipo</label>
    <select class="form-input" data-campo="tipo">${ETAPA_TIPOS.map(t => `<option ${t === d.tipo ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
  <div style="display:flex;gap:10px;">
    <div class="form-group" style="flex:1;"><label class="form-label">Desde</label><input type="date" class="form-input" data-campo="ini" value="${esc(d.ini || '')}" max="${fechaLocalISO()}"></div>
    <div class="form-group" style="flex:1;"><label class="form-label">Hasta</label><input type="date" class="form-input" data-campo="fin" value="${esc(d.fin || '')}" max="${fechaLocalISO()}"></div>
  </div>
  <div class="form-group">
    <label class="form-label">Qué se guarda</label>
    ${chk('rut', 'Rutinas y ejercicios')}${chk('med', 'Medidas')}${chk('ses', 'Sesiones')}${chk('kcal', 'Calorías (inicio y fin)')}
    <label style="display:flex;gap:8px;align-items:center;color:#666;font-size:13px;margin:4px 0;"><input type="checkbox" disabled> 🔒 Plan de menús completo — se activa cuando Nutrición esté terminada</label>
    <div data-preview style="margin-top:8px;padding:8px 10px;border:1px solid #34405A;border-radius:8px;background:#1A2230;color:#fff;font-size:12.5px;line-height:1.6;">${resumenHtml}</div>
  </div>
  <div style="display:flex;gap:10px;">
    <div class="form-group" style="flex:1;"><label class="form-label">Kcal al empezar</label>
      <input class="form-input" data-campo="kcalIni" type="text" inputmode="decimal" placeholder="—" value="${esc(d.kcalIni || '')}"></div>
    <div class="form-group" style="flex:1;"><label class="form-label">Kcal al terminar</label>
      <input class="form-input" data-campo="kcalFin" type="text" inputmode="decimal" placeholder="—" value="${esc(d.kcalFin || '')}"></div>
  </div>
  <div data-kcal-nota style="font-size:11.5px;color:#aab4c5;margin:-4px 0 10px;">${esc(kcalNota)}</div>
  <div class="form-group"><label class="form-label">Nota (opcional)</label>
    <textarea class="form-input" data-campo="nota" rows="3" placeholder="Qué funcionó, qué cambiar…">${esc(d.nota || '')}</textarea></div>
  <div class="form-group" style="border:1px dashed #1e90ff;border-radius:10px;padding:10px 12px;">
    <label style="display:flex;gap:8px;align-items:center;color:#fff;font-size:13px;font-weight:700;"><input type="checkbox" data-nueva ${d.nueva ? 'checked' : ''} ${csd ? 'disabled' : ''}> ▶️ Empezar la etapa siguiente ahora</label>
    ${csd
      ? '<div style="font-size:12px;color:#aab4c5;margin-top:6px;">Para clientes CSD/JCTW el asistente con la propuesta de macrociclo aún no está en el panel nuevo: guarda la etapa aquí y crea el macrociclo desde la pestaña Periodización.</div>'
      : `<div data-nueva-box style="display:${d.nueva ? 'block' : 'none'};margin-top:10px;">
      <div style="font-size:12px;color:#aab4c5;margin-bottom:8px;">Se cierra el bloque activo con fecha de hoy y se crea un bloque nuevo vacío. «Hasta» tiene que ser hoy. Ojo: el cliente no verá rutina en la app hasta que montes la nueva.</div>
      <div class="form-group"><label class="form-label">Nombre del bloque nuevo</label>
        <input class="form-input" data-campo="nuevoNombre" placeholder="Ej: ATR" value="${esc(d.nuevoNombre || '')}"></div>
      <div class="form-group" style="margin-bottom:0;"><label class="form-label">Tipo de bloque (ATR)</label>
        <select class="form-input" data-campo="nuevoTipo">${tiposNuevo.map(([k, l]) => `<option value="${k}" ${k === d.nuevoTipo ? 'selected' : ''}>${esc(l)}</option>`).join('')}<option value="" ${d.nuevoTipo === '' ? 'selected' : ''}>Sin especificar</option></select></div>
    </div>`}
  </div>
  <div data-error></div>
  <div class="modal-footer">
    <button class="btn btn-ghost" data-cancelar>Cancelar</button>
    <button class="btn btn-primary" data-confirmar>Guardar etapa</button>
  </div>
</div>`;
}

export function resumenCierreHtml(x, d) {
  if (!d.ini || !d.fin || d.ini > d.fin) return '<span style="color:#f59e0b;">Revisa las fechas.</span>';
  const dias = new Set(x.sesiones.map(s => String(s.fecha || '').slice(0, 10))).size;
  const lin = (ok, txt) => `<div style="opacity:${ok ? 1 : .45};">${ok ? '✅' : '⬜'} ${txt}</div>`;
  return lin(d.rut !== false, `Rutinas: <b>${x.rutinas.length}</b> · ejercicios: <b>${x.ejercicios.length}</b> · bloques: <b>${x.mesos.length}</b>`)
    + lin(d.med !== false, `Medidas: <b>${x.medidas.length}</b> registro(s)`)
    + lin(d.ses !== false, `Sesiones: <b>${dias}</b> día(s) entrenados · <b>${x.sesiones.length}</b> registros de ejercicio`)
    + lin(d.kcal !== false, 'Calorías de inicio y fin');
}
