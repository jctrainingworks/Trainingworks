// Utilidades de interfaz compartidas: escape de HTML, avisos, confirmación, carga de CSS por módulo.
export function esc(valor) {
  return String(valor ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

const cssCargados = new Set();
export function cargarCss(url) {
  const href = String(url);
  if (cssCargados.has(href)) return;
  cssCargados.add(href);
  const enlace = document.createElement('link');
  enlace.rel = 'stylesheet';
  enlace.href = href;
  document.head.appendChild(enlace);
}

// Carga un <script> externo una sola vez (p. ej. Chart.js desde cdnjs) y devuelve una promesa.
const scriptsCargados = new Map();
export function cargarScript(url) {
  const src = String(url);
  if (!scriptsCargados.has(src)) {
    scriptsCargados.set(src, new Promise((resolver, rechazar) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = () => resolver();
      s.onerror = () => { scriptsCargados.delete(src); rechazar(new Error('No se pudo cargar ' + src)); };
      document.head.appendChild(s);
    }));
  }
  return scriptsCargados.get(src);
}

export const cargando = (texto = 'Cargando...') =>
  `<div class="loading"><div class="loading-spin">⚙</div><div>${esc(texto)}</div></div>`;

export const vacio = texto => `<div class="empty">${esc(texto)}</div>`;

let temporizador;
export function alerta(mensaje, tipo = 'success') {
  const caja = document.getElementById('alertas');
  if (!caja) return;
  caja.innerHTML = `<div class="alert alert-${tipo === 'error' ? 'error' : 'success'}">${esc(mensaje)}</div>`;
  clearTimeout(temporizador);
  temporizador = setTimeout(() => { caja.innerHTML = ''; }, 3500);
}

// await ui.confirmar('¿Borrar?', { peligro: true })  →  true / false
export function confirmar(mensaje, { titulo = 'Confirmar', aceptar = 'Aceptar', cancelar = 'Cancelar', peligro = false } = {}) {
  return new Promise(resolver => {
    const capa = document.createElement('div');
    capa.className = 'modal-overlay';
    capa.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true">
        <div class="modal-title">${esc(titulo)}</div>
        <div class="modal-sub">${esc(mensaje)}</div>
        <div class="modal-footer">
          <button class="btn btn-ghost" data-r="no">${esc(cancelar)}</button>
          <button class="btn ${peligro ? 'btn-danger' : 'btn-primary'}" data-r="si">${esc(aceptar)}</button>
        </div>
      </div>`;
    const alTecla = e => { if (e.key === 'Escape') cerrar(false); };
    const cerrar = ok => { capa.remove(); document.removeEventListener('keydown', alTecla); resolver(ok); };
    capa.addEventListener('click', e => {
      const r = e.target.closest && e.target.closest('[data-r]');
      if (r) cerrar(r.dataset.r === 'si');
      else if (e.target === capa) cerrar(false);
    });
    document.addEventListener('keydown', alTecla);
    document.body.appendChild(capa);
    capa.querySelector('[data-r="si"]').focus();
  });
}
