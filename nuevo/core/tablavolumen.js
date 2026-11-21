// Tabla de volumen semanal por músculo (MED · MAV1 · MAV2 · MRV) y en qué tramo cae un número de series.
// Copiada de prueba/index.html.
export const TABLA_VOLUMEN_MUSCULAR = {
  cuadriceps:      { nombre: 'Cuádriceps',        med: [6, 6], mav1: [8, 12], mav2: [12, 18], mrv: 20 },
  isquiotibiales:  { nombre: 'Isquiotibiales',    med: [4, 4], mav1: [6, 10], mav2: [10, 16], mrv: 20 },
  gluteos:         { nombre: 'Glúteos',           med: [0, 0], mav1: [0, 4],  mav2: [4, 12],  mrv: 24 },
  pecho:           { nombre: 'Pecho',             med: [8, 8], mav1: [10, 12], mav2: [12, 20], mrv: 22 },
  espalda:         { nombre: 'Espalda',           med: [8, 8], mav1: [10, 14], mav2: [14, 22], mrv: 24 },
  hombros:         { nombre: 'Hombros (deltoides)', med: [0, 6], mav1: [8, 16], mav2: [16, 22], mrv: 26 },
  biceps:          { nombre: 'Bíceps',            med: [0, 6], mav1: [8, 14], mav2: [14, 20], mrv: 20 },
  triceps:         { nombre: 'Tríceps',           med: [0, 4], mav1: [6, 10], mav2: [10, 14], mrv: 22 },
  trapecios:       { nombre: 'Trapecio',          med: [0, 0], mav1: [1, 12], mav2: [12, 20], mrv: 24 },
  gemelos:         { nombre: 'Gemelos y sóleo',   med: [0, 6], mav1: [8, 12], mav2: [12, 16], mrv: 20 },
  core:            { nombre: 'Core',              med: [0, 0], mav1: [1, 15], mav2: [16, 20], mrv: 25 }
};
export const TABLA_VOL_COLORES = { bajo: '#9ca3af', mav1: '#22c55e', mav2: '#fb923c', sobre: '#f87171', mrv: '#dc2626' };
// En qué tramo de la tabla cae un número de series semanales.
// txt = frase completa (para el detalle desplegado); corto = etiqueta de la fila compacta.
export function zonaTablaVolumen(k, s) {
  const t = TABLA_VOLUMEN_MUSCULAR[k];
  if (!t) return null;
  const C = TABLA_VOL_COLORES;
  if (s >= t.mrv) return { txt: 'En el máximo recuperable (MRV) o por encima', corto: 'MRV o más', color: C.mrv };
  if (s > t.mav2[1]) return { txt: 'Por encima del máximo adaptativo (MAV2), por debajo del máximo recuperable (MRV)', corto: 'Sobre máx. adaptativo', color: C.sobre };
  if (s >= t.mav2[0]) return { txt: 'En la franja del máximo adaptativo (MAV2)', corto: 'Máx. adaptativo', color: C.mav2 };
  if (s > t.mav1[1]) return { txt: 'Entre el mínimo adaptativo (MAV1) y el máximo adaptativo (MAV2)', corto: 'Entre mín. y máx.', color: C.mav1 };
  if (s >= t.mav1[0]) return { txt: 'En la franja del mínimo adaptativo (MAV1)', corto: 'Mín. adaptativo', color: C.mav1 };
  if (s < t.med[0]) return { txt: 'Por debajo del mínimo necesario (MED)', corto: 'Bajo mín. necesario', color: C.bajo };
  return { txt: 'Sobre el mínimo necesario (MED), aún por debajo del mínimo adaptativo (MAV1)', corto: 'Bajo mín. adaptativo', color: C.bajo };
}
