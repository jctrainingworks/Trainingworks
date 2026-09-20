// Ficha de cliente. De momento solo la cabecera; las pestañas (Datos, Rutinas, Cardio, Historial,
// Volumen, Objetivo, Avisos) se irán clonando desde sus carpetas.
import { esc } from '../core/ui.js';
import { etiquetasHtml } from './etiquetas.js';

export function pintarFicha(c) {
  return `
    <button class="back-btn" data-volver>← Volver a clientes</button>
    <div class="detail-header">
      <div class="detail-name">${esc(c.nombre)}</div>
      <div class="detail-meta">
        <span class="client-code" style="margin-bottom:0;">${esc(c.codigo)}</span>
        ${etiquetasHtml(c)}
      </div>
    </div>
    <div class="card">
      <div class="card-title" style="margin-bottom:8px;">Pestañas de la ficha</div>
      <p style="color:var(--muted);font-size:14px;">Datos · Rutinas · Cardio · Historial · Volumen · Objetivo · Avisos: pendientes de clonar.</p>
    </div>`;
}
