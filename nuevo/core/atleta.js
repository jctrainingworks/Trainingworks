// Nivel del atleta: lo usan varias pestañas (Datos, Cuerpo, Volumen) y Nutrición.
// Copiado del panel actual (prueba/index.html).
export const NIVELES_ATLETA = ['Novato', 'Principiante', 'Intermedio', 'Avanzado', 'Muy avanzado', 'Atleta máster'];

// Novato/Principiante -> Principiante | Intermedio -> Intermedio | Avanzado/Muy avanzado/Atleta máster -> Avanzado
export function mapNivelATier(nivelAtleta) {
  if (nivelAtleta === 'Intermedio') return 'Intermedio';
  if (nivelAtleta === 'Avanzado' || nivelAtleta === 'Muy avanzado' || nivelAtleta === 'Atleta máster') return 'Avanzado';
  return 'Principiante';
}

// Sugerencia según años de entreno serio (y edad, para atleta máster). '' si no hay años.
export function sugerirNivelAtleta(anos, edad) {
  const a = parseFloat(anos);
  if (isNaN(a)) return '';
  const e = parseFloat(edad);
  if (a >= 8 && !isNaN(e) && e > 40) return 'Atleta máster';
  if (a < 0.5) return 'Novato';
  if (a < 4) return 'Principiante';
  if (a < 8) return 'Intermedio';
  if (a < 15) return 'Avanzado';
  return 'Muy avanzado';
}
