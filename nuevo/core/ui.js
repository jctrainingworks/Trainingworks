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

// Formulario en un modal. Devuelve true si se envió bien y false si se canceló.
//   await ui.formulario({
//     titulo: 'Nueva rutina', subtitulo: 'Para Ana', aceptar: 'Crear',
//     campos: [{ id: 'nombre', etiqueta: 'Nombre *', tipo: 'text', valor: '', placeholder: '', min: 1 }],
//     alEnviar: async valores => { ...; throw new Error('mensaje') }   // el error se enseña dentro del modal
//   })
export function formulario({ titulo, subtitulo = '', aceptar = 'Guardar', campos, alEnviar }) {
  return new Promise(resolver => {
    const capa = document.createElement('div');
    capa.className = 'modal-overlay';
    capa.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true">
        <div class="modal-title">${esc(titulo)}</div>
        ${subtitulo ? `<div class="modal-sub">${esc(subtitulo)}</div>` : ''}
        ${campos.map(c => `
          <div class="form-group">
            <label class="form-label" for="form_${esc(c.id)}">${esc(c.etiqueta)}</label>
            <input class="form-input" id="form_${esc(c.id)}" data-campo="${esc(c.id)}" type="${esc(c.tipo || 'text')}"
              value="${esc(c.valor ?? '')}" placeholder="${esc(c.placeholder || '')}" ${c.min !== undefined ? `min="${esc(c.min)}"` : ''} />
          </div>`).join('')}
        <div data-error></div>
        <div class="modal-footer">
          <button class="btn btn-ghost" data-r="no">Cancelar</button>
          <button class="btn btn-primary" data-r="si">${esc(aceptar)}</button>
        </div>
      </div>`;
    const alTecla = e => { if (e.key === 'Escape') cerrar(false); };
    const cerrar = ok => { capa.remove(); document.removeEventListener('keydown', alTecla); resolver(ok); };
    const enviar = async () => {
      const boton = capa.querySelector('[data-r="si"]');
      const valores = {};
      capa.querySelectorAll('[data-campo]').forEach(i => { valores[i.dataset.campo] = i.value; });
      boton.disabled = true;
      try {
        await alEnviar(valores);
        cerrar(true);
      } catch (e) {
        capa.querySelector('[data-error]').innerHTML = `<div class="alert alert-error">${esc(e.message)}</div>`;
        boton.disabled = false;
      }
    };
    capa.addEventListener('click', e => {
      const r = e.target.closest && e.target.closest('[data-r]');
      if (r) { if (r.dataset.r === 'si') enviar(); else cerrar(false); }
      else if (e.target === capa) cerrar(false);
    });
    capa.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.matches('input')) enviar(); });
    document.addEventListener('keydown', alTecla);
    document.body.appendChild(capa);
    const primero = capa.querySelector('[data-campo]');
    if (primero) primero.focus();
  });
}
