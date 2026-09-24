// ATR (Acumulación-Transformación-Realización): catálogo, plantillas y avisos de duración.
// Lo comparten Rutinas, Volumen y Preparación. Copiado tal cual del panel actual (prueba/index.html).

// Catálogo de tipos ATR (Acumulación-Transformación-Realización, modelo Issurin). Cada mesociclo
// puede llevar opcionalmente un tipo_atr guardado en Supabase; el color agrupa por macro-fase
// (verde=Acumulación, naranja=Transformación, rojo=Realización) igual que en la hoja de planificación.
export const ATR_TIPOS = {
  acu_ajuste:        { label: 'Acumulación · Ajuste',        grupo: 'Acumulación',    color: '#22c55e' },
  acu_carga:         { label: 'Acumulación · Carga',         grupo: 'Acumulación',    color: '#22c55e' },
  acu_choque:        { label: 'Acumulación · Choque',        grupo: 'Acumulación',    color: '#22c55e' },
  acu_recuperacion:  { label: 'Acumulación · Recuperación',  grupo: 'Acumulación',    color: '#22c55e' },
  tra_aproximacion:  { label: 'Transformación · Aproximación', grupo: 'Transformación', color: '#f59e0b' },
  rea_competicion:   { label: 'Realización · Competición',   grupo: 'Realización',    color: '#ef4444' },
  rea_recuperacion:  { label: 'Realización · Recuperación',  grupo: 'Realización',    color: '#ef4444' }
};
export const ATR_ORDEN = ['acu_ajuste', 'acu_carga', 'acu_choque', 'acu_recuperacion', 'tra_aproximacion', 'rea_competicion', 'rea_recuperacion'];

// Idea 3: plantillas de series/reps/RIR/descanso por tipo de mesociclo. Se usan solo como punto de
// partida al AÑADIR un ejercicio nuevo a una rutina que pertenece a un mesociclo con tipo_atr
// conocido — Juan puede editar cualquier valor después con total libertad, esto no bloquea nada.
export const ATR_PLANTILLAS_SERIES = {
  acu_ajuste:        { series: 3, reps: '15-20', rir: '3-4', desc: '45seg' },  // adaptación, carga muy baja
  acu_carga:         { series: 4, reps: '10-15', rir: '2-3', desc: '75seg' },  // volumen principal
  acu_choque:        { series: 4, reps: '6-10',  rir: '0-1', desc: '90seg' },  // pico de esfuerzo, cerca del fallo
  acu_recuperacion:  { series: 2, reps: '12-15', rir: '3-4', desc: '60seg' },  // descarga
  tra_aproximacion:  { series: 4, reps: '4-6',   rir: '1-2', desc: '120seg' }, // fuerza/potencia específica
  rea_competicion:   { series: 3, reps: '1-3',   rir: '0-1', desc: '180seg' }, // pico de rendimiento
  rea_recuperacion:  { series: 2, reps: '12-15', rir: '3-4', desc: '60seg' }
};

// Idea 4: duración orientativa por tipo de mesociclo (en semanas), según los apuntes de Juan.
// Solo se usa para avisar (nunca bloquea) si un mesociclo activo lleva ya más semanas de las
// habituales para su tipo — puede ser totalmente normal alargarlo, es solo un recordatorio visual.
export const ATR_DURACION_SEMANAS = {
  acu_ajuste:        { min: 2, max: 4 },
  acu_carga:         { min: 5, max: 6 },
  acu_choque:        { min: 0, max: 1 },  // "menos de 1 semana"
  acu_recuperacion:  { min: 1, max: 2 },
  tra_aproximacion:  { min: 2, max: 4 },
  rea_competicion:   { min: 1, max: 2 },
  rea_recuperacion:  { min: 1, max: 2 }
};

// Semanas transcurridas desde fecha_inicio hasta fecha_fin (o hasta hoy si sigue activo).
export function semanasTranscurridasMesociclo(mesociclo) {
  if (!mesociclo?.fecha_inicio) return 0;
  const inicio = new Date(mesociclo.fecha_inicio + 'T00:00:00');
  const fin = mesociclo.fecha_fin ? new Date(mesociclo.fecha_fin + 'T00:00:00') : new Date();
  const dias = Math.max(0, Math.round((fin - inicio) / 86400000));
  return dias / 7;
}

// Devuelve un texto de aviso si el mesociclo (activo o cerrado) se alargó más de lo habitual para
// su tipo_atr, o null si está dentro de rango / no tiene tipo / no hay plantilla de duración.
export function avisoDuracionMesociclo(mesociclo) {
  if (!mesociclo?.tipo_atr || !ATR_DURACION_SEMANAS[mesociclo.tipo_atr]) return null;
  const { max } = ATR_DURACION_SEMANAS[mesociclo.tipo_atr];
  const semanas = semanasTranscurridasMesociclo(mesociclo);
  if (semanas <= max) return null;
  const label = ATR_TIPOS[mesociclo.tipo_atr].label;
  return `⚠️ Lleva ~${semanas.toFixed(1)} semanas en "${label}" (lo habitual son ${max <= 1 ? 'menos de 1' : `${ATR_DURACION_SEMANAS[mesociclo.tipo_atr].min}-${max}`} semanas)`;
}
