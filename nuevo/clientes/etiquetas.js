// Pequeñas funciones compartidas por la lista y la ficha.
import { esc } from '../core/ui.js';

export const esPresencial = c => (c.modalidad || '').toUpperCase() === 'PRESENCIAL';

// Clase CSS segura a partir del plan (solo letras, números y _).
const claseSegura = valor => String(valor || '').toLowerCase().replace(/[^a-z0-9_]/g, '');

export function etiquetasHtml(c) {
  const plan = c.plan || '1MES';
  const estado = c.estado || 'ACTIVO';
  const claseEstado = String(estado).toUpperCase() === 'ACTIVO' ? 'tag-activo' : 'tag-inactivo';
  return [
    c.es_demo ? '<span class="tag tag-demo">🧪 DEMO</span>' : '',
    `<span class="tag tag-${claseSegura(plan)}">${esc(plan)}</span>`,
    `<span class="tag ${claseEstado}">${esc(estado)}</span>`,
    c.objetivo ? `<span class="tag tag-otro">${esc(c.objetivo)}</span>` : ''
  ].join('');
}
