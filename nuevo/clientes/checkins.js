// Historial de check-ins programados (tabla checkin_log): cuándo se abrió cada uno, si el cliente lo abrió y si lo envió.
// resultado: null = abierto, 'enviado', 'sin_enviar' (se cerró por tiempo sin enviarlo) o 'cancelado' (lo cerraste tú a mano).
// Réplica de ckFechaHora / renderCheckinHistorialProg de prueba/index.html.
import { esc } from '../core/ui.js';

export function ckFechaHora(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('es-ES', { weekday: 'short', day: '2-digit', month: 'short' }) + ' ' + d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

// Últimos 90 días de un cliente. Si la tabla aún no existe, queda vacío sin romper nada.
export const cargarCheckinLogCliente = (api, clienteId, ahora = Date.now()) => {
  const desde = new Date(ahora - 90 * 24 * 60 * 60 * 1000).toISOString();
  return api.tabla('checkin_log', { filtro: `cliente_id=eq.${clienteId}&abierto_en=gte.${desde}&order=abierto_en.desc` }).then(r => r || []).catch(() => []);
};

export function checkinHistorialHtml(logs) {
  logs = (logs || []).slice(0, 12);
  const etiqueta = l => l.resultado === 'enviado' ? '<span style="color:#22c55e;">✅ Enviado</span>'
    : l.resultado === 'sin_enviar' ? '<span style="color:var(--danger);">⚠️ Sin enviar</span>'
    : l.resultado === 'cancelado' ? '<span style="color:var(--muted);">⏹️ Cancelado a mano</span>'
    : '<span style="color:#eab308;">⏳ Abierto</span>';
  const filas = logs.map(l => {
    const partes = [
      `check-in ${l.tipo === 'simple' ? 'simple' : 'plus'}`,
      l.visto_en ? `lo abrió ${ckFechaHora(l.visto_en)}` : 'no lo abrió',
      l.notificaciones === false ? 'sin notificaciones' : 'con notificaciones'
    ];
    if (l.recordatorio_en) partes.push('recordatorio enviado');
    if (l.resultado === 'enviado' && l.enviado_en) partes.push(`enviado ${ckFechaHora(l.enviado_en)}`);
    if (l.resultado === 'sin_enviar' && l.cerrado_en) partes.push(`cerró ${ckFechaHora(l.cerrado_en)}`);
    return `
      <div style="padding:10px 0;border-bottom:1px solid var(--border);font-size:13px;">
        <div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;">
          <div style="font-weight:600;">${esc(ckFechaHora(l.abierto_en))}</div>
          <div>${etiqueta(l)}</div>
        </div>
        <div style="color:var(--muted);font-size:12px;margin-top:3px;">${esc(partes.join(' · '))}</div>
      </div>`;
  }).join('');
  return `
    <div class="f-card-title">⏰ Historial de check-ins programados</div>
    <div style="font-size:12px;color:var(--muted);margin-bottom:6px;">Últimos 90 días: cuándo se abrió cada uno, si el cliente lo abrió y si lo envió.</div>
    ${logs.length ? filas : '<div style="font-size:13px;color:var(--muted);padding:8px 0;">Todavía no hay check-ins programados para este cliente.</div>'}`;
}
