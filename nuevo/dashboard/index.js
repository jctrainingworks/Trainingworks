// Módulo Dashboard. De momento solo la tarjeta "⚠️ Avisos de entrenamiento" (volumen por encima del
// MRV real, molestias altas, check-in atrasado y mesociclo alargado). El resto del Dashboard
// (estadísticas, cumpleaños, avisos pendientes, pagos y renovaciones) sigue en el panel actual.
// Tablas: clientes, sesiones, seguimiento_corporal (check-ins), mesociclos, ejercicios_biblioteca.
import { esc } from '../core/ui.js';
import { crearResolvedorMusculo, cargarCatalogo } from '../core/musculo.js';
import {
  clientesConVolumenEnRojo, clientesConMolestiasAltas, clientesConCheckinAtrasado, clientesConMesocicloAlargado
} from './alertas.js';

const fechaLocalISO = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const fila = (codigo, fondo, borde, titulo, colorTexto, texto) => `
  <div class="client-card" data-client="${esc(codigo)}" style="cursor:pointer;padding:10px 12px;border-radius:8px;background:${fondo};border:1px solid ${borde};margin-bottom:6px;">
    <div style="font-weight:700;font-size:13px;color:#e2e8f0;">${titulo}</div>
    <div style="font-size:12px;color:${colorTexto};margin-top:2px;">${texto}</div>
  </div>`;

export function avisosEntrenamientoHtml({ volumen, molestias, checkinAtrasado, mesocicloAlargado }) {
  const total = volumen.length + molestias.length + checkinAtrasado.length + mesocicloAlargado.length;
  if (!total) return '';
  const filas = [
    ...volumen.map(v => fila(v.codigo, '#1a0f0f', '#442222', `🔴 ${esc(v.nombre)}`, '#ff8080', `Por encima del MRV real: ${esc(v.detalle)}`)),
    ...molestias.map(m => fila(m.codigo, '#1a1400', '#443322', `🩺 ${esc(m.nombre)}`, '#eab308',
      `Molestias físicas ${esc(m.valor)}/5 en el último check-in${m.nota ? ` — "${esc(m.nota)}"` : ''}`)),
    ...checkinAtrasado.map(a => fila(a.codigo, '#0f1420', '#223344', `📋 ${esc(a.nombre)}`, '#60a5fa',
      a.dias == null ? 'Sin check-ins en los últimos 90 días' : `${esc(a.dias)} días sin mandar check-in`)),
    ...mesocicloAlargado.map(b => fila(b.codigo, '#1a1206', '#443c22', `📅 ${esc(b.nombre)}`, '#f59e0b', `${esc(b.nombreBloque)}: ${esc(b.aviso)}`))
  ].join('');
  return `
    <div class="card" style="margin-bottom:16px;">
      <div class="card-header">
        <div class="card-title">⚠️ Avisos de entrenamiento (${total})</div>
      </div>
      ${filas}
    </div>`;
}

export default {
  id: 'dashboard',
  icono: '⚡',
  etiqueta: 'Dashboard',
  movil: true,

  async montar(contenedor, ctx) {
    const { api, datos } = ctx;
    contenedor.innerHTML = ctx.ui.cargando('Cargando dashboard...');

    const hace90 = new Date(); hace90.setDate(hace90.getDate() - 90);
    const [clientes, sesiones, biblioteca, catalogo, checkins, mesociclosActivos] = await Promise.all([
      datos.clientes(),
      datos.sesiones().catch(() => []),
      api.tabla('ejercicios_biblioteca', { filtro: 'order=nombre_es.asc' }).catch(() => []),
      cargarCatalogo(),
      // Solo lo necesario de cada check-in; luego nos quedamos con el más reciente por cliente.
      api.tabla('seguimiento_corporal', {
        select: 'cliente_id,fecha,molestias,molestias_nota',
        filtro: `origen=eq.checkin&fecha=gte.${fechaLocalISO(hace90)}&order=fecha.desc`
      }).catch(() => []),
      api.tabla('mesociclos', { select: 'id,cliente_id,tipo_atr,fecha_inicio,nombre,numero', filtro: 'fecha_fin=is.null' }).catch(() => [])
    ]);

    const musculoDe = crearResolvedorMusculo({ biblioteca, catalogo });
    const avisos = avisosEntrenamientoHtml({
      volumen: clientesConVolumenEnRojo({ clientes, sesiones, musculoDe }),
      molestias: clientesConMolestiasAltas({ clientes, checkins }),
      checkinAtrasado: clientesConCheckinAtrasado({ clientes, checkins }),
      mesocicloAlargado: clientesConMesocicloAlargado({ clientes, mesociclosActivos })
    });

    contenedor.innerHTML = `
      <div class="page-title">Dashboard</div>
      <div class="page-sub">En construcción en el panel nuevo</div>
      ${avisos}
      <div class="card">
        <p style="margin-bottom:16px;color:var(--muted);">El resto del Dashboard (estadísticas, cumpleaños, avisos pendientes, pagos y renovaciones) todavía se usa desde el panel actual.</p>
        <a class="btn btn-ghost" href="../prueba/">Abrir el panel actual</a>
      </div>`;

    contenedor.addEventListener('click', e => {
      const tarjeta = e.target.closest('[data-client]');
      if (tarjeta) ctx.navegar(`clientes/${encodeURIComponent(tarjeta.dataset.client)}`);
    });
  }
};
