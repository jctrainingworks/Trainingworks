// Planificación (vista global): una fila por cliente activo con su fase de hoy y cuándo cambia.
// Cálculo puro, réplica de renderPlanificacion de prueba/index.html.
import { fechaLocalISO, dia, mesocicloVigente, EVENTOS_TIPOS } from '../periodizacion/calculos.js';

export const PLANIF_ANTES = 28, PLANIF_DESPUES = 168;
const DIA = 86400000;
const fp = v => new Date(dia(v) + 'T00:00:00');

// Última fecha_fin de etapa cerrada por cliente: { [cliente_id]: 'YYYY-MM-DD' }.
export function finesDeEtapa(etapas) {
  const fines = {};
  (etapas || []).forEach(e => { const f = dia(e.fecha_fin); if (!f) return; const k = String(e.cliente_id); if (!fines[k] || f > fines[k]) fines[k] = f; });
  return fines;
}

export function agruparBloques(mesociclos) {
  const por = {};
  (mesociclos || []).forEach(m => { if (!m.fecha_inicio) return; (por[String(m.cliente_id)] = por[String(m.cliente_id)] || []).push(m); });
  return por;
}

// etiqueta(m) → nombre de la fase (la pone la vista para no depender del catálogo aquí).
export function filasPlanificacion({ clientes, porCliente, fines = {}, vistaTodo = false, etiqueta, hoy = fechaLocalISO() }) {
  const hoyD = fp(hoy);
  const activos = (clientes || []).filter(c => !c.es_demo && (c.estado_cliente || '').toUpperCase() === 'ACTIVO');
  const filas = activos.map(c => {
    const finEtapa = vistaTodo ? null : (fines[String(c.id)] || null);
    const bl = (porCliente[String(c.id)] || []).filter(m => !finEtapa || !m.fecha_fin || dia(m.fecha_fin) > finEtapa)
      .sort((x, y) => dia(x.fecha_inicio).localeCompare(dia(y.fecha_inicio)));
    const vig = bl.length ? mesocicloVigente(bl) : null;
    let cambio = null, textoCambio = bl.length ? '' : 'Sin bloques con fecha';
    let siguiente = null;
    if (vig) {
      if (dia(vig.fecha_inicio) > hoy) {
        cambio = Math.round((fp(vig.fecha_inicio) - hoyD) / DIA);
        textoCambio = `Empieza ${etiqueta(vig)} el ${fp(vig.fecha_inicio).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }).replace(/\./g, '')}`;
      } else if (vig.fecha_fin) {
        const sig = bl.find(m => dia(m.fecha_inicio) > dia(vig.fecha_inicio));
        siguiente = sig || null;
        const dd = new Date(fp(vig.fecha_fin).getTime() + DIA);
        cambio = Math.round((dd - hoyD) / DIA);
        const f = d => d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }).replace(/\./g, '');
        textoCambio = sig ? `Cambia a ${etiqueta(sig)} ${cambio <= 0 ? 'hoy' : 'en ' + cambio + ' d'} (${f(fp(sig.fecha_inicio))})` : `Termina el ${f(fp(vig.fecha_fin))} · sin bloque siguiente`;
        if (!sig) cambio = Math.max(cambio, 0);
      } else {
        textoCambio = 'Bloque abierto (sin fecha de fin)';
      }
    }
    const evs = Array.isArray(c.eventos_periodizacion) ? c.eventos_periodizacion : [];
    const conflicto = evs.some(e => {
      const t = EVENTOS_TIPOS[e.tipo] || EVENTOS_TIPOS.otro;
      const d1 = dia(e.desde), d2 = dia(e.hasta || e.desde);
      if (!t.pesa || !d1 || d2 < hoy) return false;
      if ((fp(d2) - fp(d1)) / DIA + 1 < 3) return false;
      return bl.some(m => (m.tipo_atr === 'carga' || m.tipo_atr === 'sobrecarga') && dia(m.fecha_inicio) <= d2 && (!m.fecha_fin || dia(m.fecha_fin) >= d1));
    });
    return { c, bl, vig, siguiente, cambio, textoCambio, evs, conflicto };
  }).sort((x, y) => (x.cambio === null ? 9999 : x.cambio) - (y.cambio === null ? 9999 : y.cambio));
  const proximos = filas.filter(r => r.vig && r.cambio !== null && r.cambio >= 0 && r.cambio <= 7 && r.vig.fecha_fin);
  return { activos, filas, proximos };
}
