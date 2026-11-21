// Botón «📄 Resumen PDF»: modal (periodo + nota) → lee los datos del cliente → genera el PDF de una hoja A4.
import { esc } from '../core/ui.js';
import { crearResolvedorMusculo, cargarCatalogo } from '../core/musculo.js';
import { descargarPdfDesdeHtml, abrirHtmlEnVentana } from '../core/pdf.js';
import { construirResumenHtml } from './resumenHtml.js';
import { cargarEtapasCliente } from '../etapas/datos.js';

export async function leerDatosResumen(ctx) {
  const { api, cliente } = ctx;
  const [sesiones, mesociclos, rutinas, seguimiento, etapas, biblioteca, catalogo] = await Promise.all([
    api.tabla('sesiones', { filtro: `codigo_cliente=eq.${cliente.codigo}&order=fecha.desc` }).catch(() => []),
    api.tabla('mesociclos', { filtro: `cliente_id=eq.${cliente.id}&order=numero.asc` }).catch(() => []),
    api.tabla('rutinas', { filtro: `cliente_id=eq.${cliente.id}&order=orden.asc` }).catch(() => []),
    api.tabla('seguimiento_corporal', { filtro: `cliente_id=eq.${cliente.id}&order=fecha.desc` }).catch(() => []),
    cargarEtapasCliente(api, cliente.id),
    api.tabla('ejercicios_biblioteca', { filtro: 'order=nombre_es.asc' }).catch(() => []),
    cargarCatalogo().catch(() => [])
  ]);
  const historial = sesiones.map(s => ({ fecha: s.fecha, ejercicio: s.ejercicio, series: s.series_detalle, en_descarga: !!s.en_descarga, rutina_id: s.rutina_id ?? null }));
  return { c: { ...cliente, historial, mesociclos, rutinas, seguimientoCorporal: seguimiento }, etapas, musculoDe: crearResolvedorMusculo({ biblioteca, catalogo }) };
}

export function abrirResumenCliente({ ctx }) {
  const { cliente, ui } = ctx;
  const capa = document.createElement('div');
  capa.className = 'modal-overlay';
  capa.innerHTML = `
    <div class="modal">
      <div class="modal-title">📄 Generar Resumen</div>
      <div class="modal-sub">${esc(cliente.nombre)}</div>
      <div class="form-group">
        <label class="form-label">Periodo</label>
        <select class="form-select" id="f_resumenDias">
          <option value="30">Últimos 30 días</option><option value="60">Últimos 60 días</option><option value="90">Últimos 90 días</option><option value="etapa">Etapa actual</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Nota del entrenador (opcional)</label>
        <textarea class="form-textarea" id="f_notaResumen" rows="4" placeholder="Este mes has mejorado mucho en sentadilla, el objetivo ahora es..." style="resize:vertical;"></textarea>
      </div>
      <div style="font-size:12px;color:var(--muted);margin-bottom:12px;">Una sola hoja A4: entrenos y adherencia, series efectivas, récords de 1RM estimado, peso corporal y series por músculo (sin contar semanas de descarga).</div>
      <div data-error></div>
      <div class="modal-footer">
        <button class="btn btn-ghost" data-cancelar>Cancelar</button>
        <button class="btn btn-primary" data-generar>📄 Generar PDF</button>
      </div>
    </div>`;
  const $ = s => capa.querySelector(s);
  const alTecla = e => { if (e.key === 'Escape') cerrar(); };
  const cerrar = () => { capa.remove(); document.removeEventListener('keydown', alTecla); };
  capa.addEventListener('click', async e => {
    if (e.target.closest('[data-cancelar]')) return cerrar();
    if (!e.target.closest('[data-generar]')) return;
    const nota = $('#f_notaResumen').value.trim();
    const periodo = $('#f_resumenDias').value || '30';
    const boton = $('[data-generar]');
    boton.textContent = 'Generando...'; boton.disabled = true;
    try {
      const d = await leerDatosResumen(ctx);
      const html = construirResumenHtml(d.c, nota, periodo, { etapas: d.etapas, musculoDe: d.musculoDe });
      cerrar();
      await descargarPdfDesdeHtml(html, 'Resumen ' + (cliente.nombre || 'cliente') + '.pdf').catch(err => {
        console.warn('PDF directo no disponible, uso impresión:', err);
        if (!abrirHtmlEnVentana(html)) ui.alerta('No se pudo generar el PDF. Permite ventanas emergentes en el navegador e inténtalo de nuevo.', 'error');
      });
    } catch (err) {
      $('[data-error]').innerHTML = `<div class="alert alert-error">Error: ${esc(err.message)}</div>`;
      boton.textContent = '📄 Generar PDF'; boton.disabled = false;
    }
  });
  document.addEventListener('keydown', alTecla);
  document.body.appendChild(capa);
}
