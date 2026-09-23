// Módulo provisional para las secciones que aún no se han clonado del panel actual.
import { esc } from './ui.js';

export function crearPendiente({ id, icono, etiqueta, movil = false }) {
  return {
    id, icono, etiqueta, movil,
    montar(contenedor) {
      contenedor.innerHTML = `
        <div class="page-title">${esc(etiqueta)}</div>
        <div class="page-sub">En construcción en el panel nuevo</div>
        <div class="card">
          <p style="margin-bottom:16px;color:var(--muted);">Esta sección todavía se usa desde el panel actual.</p>
          <a class="btn btn-ghost" href="../prueba/">Abrir el panel actual</a>
        </div>`;
    }
  };
}

// Igual que crearPendiente, pero para una pestaña de la ficha de cliente.
export function crearPestanaPendiente({ id, icono, etiqueta, orden }) {
  return {
    id, icono, etiqueta, orden,
    montar(contenedor) {
      contenedor.innerHTML = `
        <div class="card">
          <p style="margin-bottom:16px;color:var(--muted);">La pestaña ${esc(etiqueta)} todavía se usa desde el panel actual.</p>
          <a class="btn btn-ghost" href="../prueba/">Abrir el panel actual</a>
        </div>`;
    }
  };
}
