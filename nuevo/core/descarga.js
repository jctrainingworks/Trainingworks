// Descarga (modo temporal, sin duplicar rutinas) y DESCANSO TOTAL. Lo comparten Rutinas, Volumen, Cardio y Avisos.
// Copiado tal cual del panel actual (prueba/index.html).
export function calcularEstadoDescarga(c) {
  if (!c || !c.modo_descarga) return null;
  if (c.descarga_fin) {
    const fin = new Date(c.descarga_fin + 'T23:59:59');
    if (new Date() > fin) return null; // ya caducó, se trata como inactiva
  }
  return c.tipo_descarga || 'volumen';
}

export const DESCARGA_LABELS = { volumen: 'Reducción de volumen', intensidad: 'Reducción de intensidad', completa: 'Descanso total' };
// ── DESCANSO TOTAL (descarga completa): helpers del mensaje ──
// Placeholders: {nombre} (primer nombre), {dias} (días que quedan, p. ej. "3 días"), {fecha} (día de vuelta).
export const DESCANSO_MSG_DEFAULT = "Te quedan {dias} sin entrenar: ni pesas, ni cardio, nada. Tu cuerpo no se hace más fuerte mientras entrenas, sino mientras se recupera, y este descanso es parte del plan, no un paréntesis.\n\nCome bien, duerme mucho y desconecta de verdad.\n\nVolvemos con más ganas y más fuerte.";
export function descansoFechaVuelta(finISO) {
  if (!finISO) return 'pronto';
  const d = new Date(finISO + 'T00:00:00');
  d.setDate(d.getDate() + 1);
  return d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }).replace(',', '');
}
export function descansoDiasTexto(finISO) {
  if (!finISO) return 'unos días';
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const fin = new Date(finISO + 'T00:00:00');
  const n = Math.max(1, Math.round((fin - hoy) / 86400000) + 1);
  return n === 1 ? '1 día' : n + ' días';
}
export function descansoMensajeRender(plantilla, nombre, finISO) {
  const primero = String(nombre || '').trim().split(/\s+/)[0] || '';
  const nom = primero ? primero.charAt(0).toUpperCase() + primero.slice(1).toLowerCase() : 'Hola';
  return String(plantilla || DESCANSO_MSG_DEFAULT)
    .replace(/\{nombre\}/g, nom)
    .replace(/\{dias\}/g, descansoDiasTexto(finISO))
    .replace(/\{fecha\}/g, descansoFechaVuelta(finISO));
}


// Aplica el ajuste de descarga a UN ejercicio (no muta el original, ni toca lo guardado en Supabase).
export function aplicarDescargaEjercicio(ex, tipo, esCardio) {
  if (!tipo) return ex;
  const out = { ...ex };
  const numBase = parseInt(ex.series) || 1;
  if (tipo === 'volumen') {
    out.series = String(Math.max(1, Math.ceil(numBase * 0.55))); // ~-45% series, redondeando arriba
  } else if (tipo === 'intensidad') {
    const rirArr = (ex.rir || '').split(',').map(s => s.trim());
    out.rir = rirArr.map(r => {
      const n = parseFloat(r);
      return isNaN(n) ? r : String(n + 2);
    }).join(', ');
    out._notaDescarga = esCardio ? 'Baja ~10-20% la velocidad o la inclinación (ppm en la zona baja)' : 'Baja ~10-20% el peso habitual';
  } else if (tipo === 'completa') {
    out._notaDescarga = 'DESCANSO TOTAL — no entrenar';
  }
  return out;
}
