// Constantes de volumen semanal por músculo. Copiadas tal cual de prueba/index.html.

// Rangos de series efectivas por semana, según nivel de atleta.
// Fuente: Israetel/RP Strength (landmarks MEV–MAV–MRV), contrastado con fitgeneration.es (Schoenfeld, Baz-Valle).
// Solo 3 escalones en la fuente — se mapean los 6 niveles de la app a estos 3 (ver core/atleta.js).
export const VOLUMEN_SEMANAL_RANGOS = {
  'Pecho':           { Principiante: [10, 12], Intermedio: [12, 20], Avanzado: [20, 24] },
  'Espalda':         { Principiante: [10, 14], Intermedio: [14, 22], Avanzado: [22, 26] },
  'Cuádriceps':      { Principiante: [8, 12],  Intermedio: [12, 18], Avanzado: [18, 22] },
  'Isquiotibiales':  { Principiante: [6, 10],  Intermedio: [10, 16], Avanzado: [16, 20] },
  'Hombros':         { Principiante: [8, 14],  Intermedio: [14, 20], Avanzado: [20, 24] },
  'Tríceps':         { Principiante: [6, 10],  Intermedio: [10, 14], Avanzado: [14, 18] },
  'Bíceps':          { Principiante: [8, 14],  Intermedio: [14, 20], Avanzado: [20, 26] },
  'Glúteos':         { Principiante: [4, 6],   Intermedio: [6, 12],  Avanzado: [12, 16] },
  'Gemelos':         { Principiante: [8, 12],  Intermedio: [12, 16], Avanzado: [16, 20] }
};

// Techo real de MRV (Maximum Recoverable Volume) por músculo, según la tabla oficial de
// Israetel/RP Strength — independiente del nivel del atleta. Solo pasar de ESTE número es el
// aviso real de sobre-entrenamiento.
export const MRV_REAL_POR_MUSCULO = {
  'Pecho': 22, 'Espalda': 25, 'Cuádriceps': 20, 'Isquiotibiales': 20,
  'Hombros': 26, 'Tríceps': 18, 'Bíceps': 26, 'Glúteos': 16, 'Gemelos': 20
};
