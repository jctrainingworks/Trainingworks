// Historial · notas de sesión del cliente (TrackLift → sesiones_meta): chips, energía y texto libre, y el
// resumen de tendencia de las últimas sesiones. Copiado de prueba/index.html; solo cambia que
// cargarSesionesMeta recibe `api` en vez de usar las funciones globales.
import { esc } from '../core/ui.js';

// ── Notas de sesión del cliente (TrackLift → sesiones_meta): chips, energía y texto libre ──
export const META_CHIPS = {
  dia_top:   { icon: '🔥', label: 'Día top',                 tono: 'ok'   },
  normal:    { icon: '👍', label: 'Normal',                  tono: 'neu'  },
  dia_duro:  { icon: '😮‍💨', label: 'Día duro',                tono: 'warn' },
  molestias: { icon: '🤕', label: 'Con algunas molestias',   tono: 'warn' },
  // valores antiguos (primera versión de la nota) — solo lectura
  tecnica_limpia:     { icon: '✅', label: 'Técnica limpia',                       tono: 'ok'   },
  ultima_serie_justa: { icon: '💥', label: 'Última serie justa',                   tono: 'neu'  },
  peor_control:       { icon: '⚠️', label: 'Peor control que la semana pasada',    tono: 'warn' }
};
export function metaChipsDe(m) {
  if (!m || !m.nota_chip) return [];
  return String(m.nota_chip).split(',').map(k => k.trim()).filter(k => META_CHIPS[k]);
}
export function metaClaveFecha(f) { return f ? String(f).slice(0, 10) : ''; }

// Carga todas las notas de sesión del cliente (tabla sesiones_meta: codigo, fecha, nota_chip, nota_texto, energia).
export async function cargarSesionesMeta(api, codigo, historial) {
  // Lectura directa. Si las políticas de la tabla no dejan leer al panel, Supabase devuelve
  // una lista VACÍA sin dar error; por eso, si viene vacía, se pregunta día a día con la RPC.
  try {
    const rows = await api.tabla('sesiones_meta', { filtro: `codigo=eq.${codigo}&order=fecha.desc` });
    if (Array.isArray(rows) && rows.length) return rows;
  } catch (e) { /* seguimos con la RPC */ }
  const dias = [...new Set((historial || []).map(s => metaClaveFecha(s.fecha)).filter(Boolean))].slice(0, 45);
  const out = [];
  await Promise.all(dias.map(async dia => {
    try {
      const r = await api.rpc('obtener_sesion_meta', { p_codigo: codigo, p_fecha: dia });
      const row = Array.isArray(r) ? r[0] : r;
      if (row && (row.nota_chip || row.nota_texto || row.energia)) out.push({ ...row, fecha: dia });
    } catch (e) { /* día sin nota */ }
  }));
  return out.sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)));
}

// Resumen de tendencia: últimas 5 sesiones con nota (un día = una sesión).
export function metaFechaCorta(f) { const d = metaClaveFecha(f); return d ? `${d.slice(8, 10)}/${d.slice(5, 7)}` : ''; }
export function metaResumenTendenciaHtml(metaLista) {
  const conNota = (metaLista || []).filter(m => metaChipsDe(m).length || m.energia || m.nota_texto)
    .sort((a, b) => metaClaveFecha(b.fecha).localeCompare(metaClaveFecha(a.fecha)));
  if (!conNota.length) return '';
  const ult = conNota.slice(0, 5);
  const cuenta = {};
  ult.forEach(m => metaChipsDe(m).forEach(k => { cuenta[k] = (cuenta[k] || 0) + 1; }));
  const resumen = Object.keys(cuenta).sort((a, b) => cuenta[b] - cuenta[a])
    .map(k => `${cuenta[k]} ${META_CHIPS[k].icon} <span style="font-size:13px;color:#bbb;">${META_CHIPS[k].label}</span>`).join(' &nbsp;·&nbsp; ');
  const energias = ult.map(m => Number(m.energia)).filter(n => n > 0);
  const energiaMedia = energias.length ? (energias.reduce((a, b) => a + b, 0) / energias.length).toFixed(1) : null;

  const ult3 = ult.slice(0, 3);
  const duros3 = ult3.filter(m => metaChipsDe(m).includes('dia_duro')).length;
  const molest3 = ult3.filter(m => metaChipsDe(m).includes('molestias')).length;
  const tops3 = ult3.filter(m => metaChipsDe(m).includes('dia_top')).length;
  let avisos = '';
  if (molest3 >= 2) avisos += `<div style="color:#ff6b6b;font-size:12px;margin-top:8px;">🤕 Molestias en ${molest3} de las últimas ${ult3.length} sesiones. Revisa qué zona es (mira el texto de cada día) y valora ajustar ejercicios o carga.</div>`;
  if (duros3 >= 2) avisos += `<div style="color:#ffb400;font-size:12px;margin-top:8px;">😮‍💨 ${duros3} días duros en las últimas ${ult3.length} sesiones. Puede ser carga alta o poco descanso: pregúntale cómo duerme y come.</div>`;
  if (tops3 >= 3 && !molest3) avisos += `<div style="color:#22c55e;font-size:12px;margin-top:8px;">🔥 Tres días top seguidos: buena señal para progresar carga o volumen.</div>`;

  // Línea de tiempo: una fila por sesión (más antigua → más reciente, como se lee una evolución)
  const filas = [...ult].reverse().map(m => {
    const chipsTxt = metaChipsDe(m).map(k => `<span style="color:${META_CHIPS[k].tono === 'warn' ? '#ffb400' : META_CHIPS[k].tono === 'ok' ? '#22c55e' : '#ccc'};">${META_CHIPS[k].icon} ${META_CHIPS[k].label}</span>`).join(' &nbsp;·&nbsp; ') || '<span style="color:#555;">Sin valoración</span>';
    const en = Number(m.energia) > 0 ? `<span style="color:#f59e0b;">⚡ Energía ${Number(m.energia)}/5</span>` : '';
    return `<div style="padding:7px 0;border-bottom:1px solid #161616;font-size:13px;">
      <div style="display:flex;flex-wrap:wrap;align-items:center;gap:6px 14px;">
        <span style="color:#8fa3b8;min-width:42px;">${metaFechaCorta(m.fecha)}</span>
        ${chipsTxt}
        ${en}
      </div>
      ${m.nota_texto ? `<div style="color:#aaa;font-style:italic;font-size:12px;margin:3px 0 0 56px;">“${esc(m.nota_texto)}”</div>` : ''}
    </div>`;
  }).join('');

  // Últimos comentarios escritos (los más valiosos: zonas con molestia, sensaciones concretas)
  const comentarios = conNota.filter(m => m.nota_texto).slice(0, 3).map(m =>
    `<div style="margin-top:6px;font-size:13px;color:#ddd;"><span style="color:#8fa3b8;font-size:11px;">${metaFechaCorta(m.fecha)}</span> &nbsp;“${esc(m.nota_texto)}”</div>`).join('');

  return `
    <div style="background:#0d0d0d;border:1px solid #222;border-radius:12px;padding:12px 14px;margin:18px 0 6px;">
      <div style="color:#8fa3b8;font-size:11px;font-weight:700;text-transform:uppercase;margin-bottom:6px;">📝 Cómo le van las sesiones (${ult.length === 1 ? 'última sesión con nota' : 'últimas ' + ult.length + ' con nota'})</div>
      <div style="color:#eee;font-size:15px;">${resumen || '—'}${energiaMedia ? ` &nbsp;·&nbsp; <span style="color:#f59e0b;">⚡ ${energiaMedia}/5</span> <span style="color:#666;font-size:11px;">energía media al llegar</span>` : ''}</div>
      ${avisos}
      <div style="margin-top:10px;">${filas}</div>
      ${comentarios ? `<div style="margin-top:10px;"><div style="color:#8fa3b8;font-size:11px;font-weight:700;text-transform:uppercase;">💬 Últimos comentarios</div>${comentarios}</div>` : ''}
    </div>`;
}
