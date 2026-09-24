// Descarga (modo temporal, sin duplicar rutinas). Lo comparten Rutinas y Volumen.
// Copiado tal cual del panel actual (prueba/index.html).
// ── DESCARGA (modo temporal, sin duplicar rutinas) ──
// Lee el estado de descarga del cliente y decide si sigue activa (respeta fecha de fin).
export function calcularEstadoDescarga(c) {
  if (!c || !c.modo_descarga) return null;
  if (c.descarga_fin) {
    const fin = new Date(c.descarga_fin + 'T23:59:59');
    if (new Date() > fin) return null; // ya caducó, se trata como inactiva
  }
  return c.tipo_descarga || 'volumen';
}

export const DESCARGA_LABELS = { volumen: 'Reducción de volumen', intensidad: 'Reducción de intensidad', completa: 'Descarga completa' };

// Aplica el ajuste de descarga a UN ejercicio (no muta el original, ni toca lo guardado en Supabase).
export function aplicarDescargaEjercicio(ex, tipo) {
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
    out._notaDescarga = 'Baja ~10-20% el peso habitual';
  } else if (tipo === 'completa') {
    out._notaDescarga = 'DESCANSO — descarga completa, no entrenar';
  }
  return out;
}
