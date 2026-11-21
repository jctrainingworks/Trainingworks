// Fecha de renovación de un cliente (réplica de fechaRenovacionCliente de prueba/index.html).
// Usa fecha_renovacion si existe; si no, fecha_inicio + duración del plan. null si no se puede calcular.
export function fechaRenovacionCliente(c, ahora = new Date()) {
  try {
    let d = null;
    if (c.fecha_renovacion) d = new Date(c.fecha_renovacion);
    else if (c.fecha_inicio) {
      const plan = (c.plan || '1MES').toUpperCase();
      d = new Date(c.fecha_inicio);
      d.setDate(d.getDate() + (plan === '6MESES' ? 180 : plan === '3MESES' ? 90 : 30));
    }
    if (!d || isNaN(d)) return null;
    return { texto: d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }), dias: Math.ceil((d - ahora) / 86400000) };
  } catch (e) { return null; }
}
