// Modal "Cambiar ejercicio" de una sesión ya registrada: solo sustituye el nombre (peso/reps/series
// de esa sesión no se tocan). Buscador en la biblioteca, igual que el de Rutinas pero sin filtros.
import { esc } from '../core/ui.js';

export function abrirModalCambiarEjercicio({ nombreActual, biblioteca, alEnviar }) {
  return new Promise(resolver => {
    let nombre = nombreActual;
    let resultados = [];
    const capa = document.createElement('div');
    capa.className = 'modal-overlay';
    function pintar() {
      capa.innerHTML = `
        <div class="modal" role="dialog" aria-modal="true">
          <div class="modal-title">Cambiar ejercicio</div>
          <div class="modal-sub">Se sustituye el nombre del ejercicio de esta sesión ya registrada — el peso, reps y series que ya metió el cliente NO se tocan.</div>
          <div class="form-group" style="position:relative;">
            <label class="form-label" for="ce_nombre">Ejercicio *</label>
            <input class="form-input" id="ce_nombre" value="${esc(nombre)}" placeholder="Busca un ejercicio..." autocomplete="off" />
            <div class="rut-dropdown" data-dropdown hidden></div>
          </div>
          <div data-error></div>
          <div class="modal-footer">
            <button class="btn btn-ghost" data-r="no">Cancelar</button>
            <button class="btn btn-primary" data-r="si">Guardar Cambios</button>
          </div>
        </div>`;
    }
    function buscar() {
      const caja = capa.querySelector('[data-dropdown]');
      const q = nombre.toLowerCase();
      resultados = !q ? [] : biblioteca.filter(b => String(b.nombre_es || '').toLowerCase().includes(q)).slice(0, 30);
      caja.hidden = !resultados.length;
      caja.innerHTML = resultados.map((b, i) => `
        <div class="rut-opcion" data-pick="${i}">
          ${b.gif_url ? `<img src="${esc(b.gif_url)}" alt="" loading="lazy" />` : ''}
          <div><div class="rut-opcion-n">${esc(b.nombre_es)}</div><div class="rut-opcion-m">${esc(b.musculo || '')}</div></div>
        </div>`).join('');
    }
    const cerrar = ok => { capa.remove(); document.removeEventListener('keydown', alTecla); resolver(ok); };
    const alTecla = e => { if (e.key === 'Escape') cerrar(false); };
    async function enviar() {
      const n = nombre.trim();
      const err = capa.querySelector('[data-error]');
      if (!n) { err.innerHTML = '<div class="alert alert-error">El nombre es obligatorio</div>'; return; }
      if (n === nombreActual) { cerrar(false); return; }
      const boton = capa.querySelector('[data-r="si"]');
      boton.disabled = true;
      try {
        await alEnviar(n);
        cerrar(true);
      } catch (e) {
        err.innerHTML = `<div class="alert alert-error">${esc(e.message)}</div>`;
        boton.disabled = false;
      }
    }
    capa.addEventListener('click', e => {
      const r = e.target.closest('[data-r]');
      if (r) { if (r.dataset.r === 'si') enviar(); else cerrar(false); return; }
      if (e.target === capa) { cerrar(false); return; }
      const pick = e.target.closest('[data-pick]');
      if (pick) { const b = resultados[Number(pick.dataset.pick)]; if (b) { nombre = b.nombre_es; pintar(); } }
    });
    capa.addEventListener('input', e => { if (e.target.id === 'ce_nombre') { nombre = e.target.value; buscar(); } });
    capa.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.id === 'ce_nombre') enviar(); });
    document.addEventListener('keydown', alTecla);
    pintar();
    document.body.appendChild(capa);
    capa.querySelector('#ce_nombre').focus();
  });
}
