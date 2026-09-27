// "📝 Registrar sesión pasada": el entrenador mete una sesión con fecha manual (el cliente no tiene
// esta opción en su app). Una fila numérica por serie de cada ejercicio de la rutina elegida; una
// llamada RPC por ejercicio con series rellenas, la misma que usa la app del cliente al guardar.
import { esc } from '../core/ui.js';

const hoyStr = () => new Date().toISOString().slice(0, 10);

function ejerciciosHtml(ejerciciosRutina) {
  return ejerciciosRutina.map(ex => {
    const numSeries = parseInt(ex.series) || 3;
    const esIso = !!ex.es_isometrico;
    let filas = '';
    for (let i = 1; i <= numSeries; i++) {
      filas += `
        <div style="display:flex;gap:8px;align-items:center;margin-bottom:6px;">
          <span style="width:52px;color:#888;font-size:12px;">Serie ${i}</span>
          <input type="number" step="0.5" placeholder="${esIso ? 'seg' : 'kg'}" data-serie="${esc(ex.id)}_${i}_a" class="form-input" style="flex:1;padding:6px 8px;font-size:13px;">
          ${esIso ? '' : `<span style="color:#666;font-size:12px;">x</span><input type="number" placeholder="reps" data-serie="${esc(ex.id)}_${i}_b" class="form-input" style="flex:1;padding:6px 8px;font-size:13px;">`}
        </div>`;
    }
    return `
      <div style="border:1px solid #222;border-radius:10px;padding:10px 12px;margin-bottom:10px;background:#0a0a0a;" data-bloque-ej="${esc(ex.id)}">
        <div style="font-weight:700;color:#3b82f6;font-size:13px;margin-bottom:8px;">${esc(ex.nombre)}</div>
        ${filas}
      </div>`;
  }).join('');
}

// rutinas: [{id, nombre}] · ejerciciosPorRutina(id) => ejercicios de esa rutina, ya ordenados.
// alEnviar(paquetes) recibe [{ejercicio, texto}] a guardar, uno por ejercicio con alguna serie rellena.
export function abrirModalSesionPasada({ nombreCliente, rutinas, ejerciciosPorRutina, alEnviar }) {
  return new Promise(resolver => {
    const s = { rutinaId: String(rutinas[0].id), fecha: hoyStr() };
    const capa = document.createElement('div');
    capa.className = 'modal-overlay';
    function pintar() {
      const ejerciciosRutina = ejerciciosPorRutina(s.rutinaId);
      capa.innerHTML = `
        <div class="modal" role="dialog" aria-modal="true">
          <div class="modal-title">📝 Registrar sesión pasada</div>
          <div class="modal-sub">Para ${esc(nombreCliente)}. Solo tú puedes registrar sesiones con fecha manual — el cliente no tiene esta opción en su app. Deja vacía cualquier serie que no quieras registrar.</div>
          <div class="form-group">
            <label class="form-label" for="sp_rutina">Rutina</label>
            <select class="form-input" id="sp_rutina">${rutinas.map(r => `<option value="${esc(r.id)}" ${String(r.id) === s.rutinaId ? 'selected' : ''}>${esc(r.nombre)}</option>`).join('')}</select>
          </div>
          <div class="form-group">
            <label class="form-label" for="sp_fecha">Fecha del entreno</label>
            <input type="date" class="form-input" id="sp_fecha" value="${esc(s.fecha)}" max="${hoyStr()}">
          </div>
          ${ejerciciosRutina.length ? ejerciciosHtml(ejerciciosRutina) : '<div class="empty" style="padding:20px 0;">Esta rutina no tiene ejercicios todavía.</div>'}
          <div data-error></div>
          <div class="modal-footer">
            <button class="btn btn-ghost" data-r="no">Cancelar</button>
            <button class="btn btn-primary" data-r="si">Guardar sesión</button>
          </div>
        </div>`;
    }
    const cerrar = ok => { capa.remove(); document.removeEventListener('keydown', alTecla); resolver(ok); };
    const alTecla = e => { if (e.key === 'Escape') cerrar(false); };
    async function enviar() {
      const err = capa.querySelector('[data-error]');
      if (s.fecha > hoyStr()) { err.innerHTML = '<div class="alert alert-error">La fecha no puede ser futura</div>'; return; }
      const ejerciciosRutina = ejerciciosPorRutina(s.rutinaId);
      const paquetes = [];
      ejerciciosRutina.forEach(ex => {
        const numSeries = parseInt(ex.series) || 3;
        const esIso = !!ex.es_isometrico;
        const seriesTexto = [];
        for (let i = 1; i <= numSeries; i++) {
          const a = capa.querySelector(`[data-serie="${ex.id}_${i}_a"]`)?.value;
          const b = esIso ? null : capa.querySelector(`[data-serie="${ex.id}_${i}_b"]`)?.value;
          if (a || b) seriesTexto.push(esIso ? `SERIE ${i}: ${a || '?'}seg` : `SERIE ${i}: ${a || '?'}kg x ${b || '?'}`);
        }
        if (seriesTexto.length) paquetes.push({ ejercicio: ex, texto: seriesTexto.join('\n') });
      });
      if (!paquetes.length) { err.innerHTML = '<div class="alert alert-error">Rellena al menos una serie de un ejercicio</div>'; return; }
      const boton = capa.querySelector('[data-r="si"]');
      boton.disabled = true;
      try {
        await alEnviar(paquetes, s.fecha, s.rutinaId);
        cerrar(true);
      } catch (e) {
        err.innerHTML = `<div class="alert alert-error">${esc(e.message)}</div>`;
        boton.disabled = false;
      }
    }
    capa.addEventListener('click', e => {
      const r = e.target.closest('[data-r]');
      if (r) { if (r.dataset.r === 'si') enviar(); else cerrar(false); }
      else if (e.target === capa) cerrar(false);
    });
    capa.addEventListener('change', e => { if (e.target.id === 'sp_rutina') { s.rutinaId = e.target.value; pintar(); } else if (e.target.id === 'sp_fecha') s.fecha = e.target.value; });
    document.addEventListener('keydown', alTecla);
    pintar();
    document.body.appendChild(capa);
  });
}
