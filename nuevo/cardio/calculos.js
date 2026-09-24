// Cardio · constantes y cálculos puros (sin DOM ni red). Copiados tal cual del panel actual
// (prueba/index.html), solo con `export`; parqVigente pasa a recibir la lista de PAR-Q.

export const PARQ_PREGUNTAS = [
  { id: 'dolor_pecho',    label: 'Dolor en el pecho en reposo o durante el esfuerzo' },
  { id: 'mareos',         label: 'Mareos, pérdida de equilibrio o pérdida de conciencia' },
  { id: 'oseo_articular', label: 'Problema óseo o articular que empeore con el ejercicio' },
  { id: 'medicacion',     label: 'Toma medicación para el corazón o la tensión arterial' },
  { id: 'diagnostico',    label: 'Diagnóstico de enfermedad cardiaca, pulmonar o diabetes no controlada' },
  { id: 'embarazo',       label: 'Está embarazada actualmente' }
];
export const PARQ_VIGENCIA_MESES = 6;

// Config de los 3 tests disponibles. `campos` define el formulario de inputs de cada uno.
export const CARDIO_TESTS = {
  rockport: {
    label: 'Rockport (caminar 1 milla)',
    desc: 'Para clientes sedentarios, con sobrepeso o novatos. Solo hace falta cronómetro y una milla (1609m) medida o cinta.',
    campos: [
      { id: 'peso',  label: 'Peso (kg)', tipo: 'number' },
      { id: 'edad',  label: 'Edad',      tipo: 'number' },
      { id: 'sexo',  label: 'Sexo',      tipo: 'sexo' },
      { id: 'tiempo', label: 'Tiempo en completar la milla (min, ej. 14.5)', tipo: 'number' },
      { id: 'fc',    label: 'FC al terminar (ppm)', tipo: 'number' },
      { id: 'velocidad', label: 'Velocidad en cinta (km/h, opcional)', tipo: 'number', opcional: true },
      { id: 'inclinacion', label: 'Inclinación en cinta (%, opcional)', tipo: 'number', opcional: true }
    ]
  },
  cooper: {
    label: 'Cooper (12 min corriendo)',
    desc: 'Para clientes con algo más de forma física. Necesitas pista/espacio o cinta donde medir la distancia recorrida en 12 min.',
    campos: [
      { id: 'distancia', label: 'Distancia recorrida en 12 min (metros)', tipo: 'number' },
      { id: 'fc', label: 'FC al terminar (ppm, opcional)', tipo: 'number', opcional: true },
      { id: 'velocidad', label: 'Velocidad en cinta (km/h, opcional)', tipo: 'number', opcional: true },
      { id: 'inclinacion', label: 'Inclinación en cinta (%, opcional)', tipo: 'number', opcional: true }
    ]
  },
  queens: {
    label: 'Queens College Step Test',
    desc: '3 min subiendo/bajando un step a ritmo fijo, luego FC de recuperación. El más cómodo si tienes step/cajón en el box.',
    campos: [
      { id: 'sexo', label: 'Sexo', tipo: 'sexo' },
      { id: 'fc_recuperacion', label: 'FC de recuperación (ppm, 5-20seg tras terminar)', tipo: 'number' }
    ]
  }
};

// Categorías VO2máx por edad/sexo — norma orientativa (Cooper Institute / ACSM). Es una referencia
// estándar del sector, no la tabla exacta del PDF de Juan; si quiere calcarla al milímetro de su PDF,
// solo hay que sustituir estos rangos.
export const VO2MAX_TABLA = {
  H: [
    { max: 29, rangos: [[55,999,'Excelente'],[51,54,'Buena'],[45,50,'Por encima de la media'],[41,44,'Media'],[35,40,'Por debajo de la media'],[0,34,'Baja']] },
    { max: 39, rangos: [[51,999,'Excelente'],[46,50,'Buena'],[42,45,'Por encima de la media'],[36,41,'Media'],[31,35,'Por debajo de la media'],[0,30,'Baja']] },
    { max: 49, rangos: [[45,999,'Excelente'],[42,44,'Buena'],[36,41,'Por encima de la media'],[32,35,'Media'],[26,31,'Por debajo de la media'],[0,25,'Baja']] },
    { max: 59, rangos: [[41,999,'Excelente'],[36,40,'Buena'],[32,35,'Por encima de la media'],[27,31,'Media'],[22,26,'Por debajo de la media'],[0,21,'Baja']] },
    { max: 999, rangos: [[37,999,'Excelente'],[33,36,'Buena'],[28,32,'Por encima de la media'],[23,27,'Media'],[18,22,'Por debajo de la media'],[0,17,'Baja']] }
  ],
  M: [
    { max: 29, rangos: [[49,999,'Excelente'],[43,48,'Buena'],[38,42,'Por encima de la media'],[33,37,'Media'],[28,32,'Por debajo de la media'],[0,27,'Baja']] },
    { max: 39, rangos: [[45,999,'Excelente'],[39,44,'Buena'],[34,38,'Por encima de la media'],[29,33,'Media'],[24,28,'Por debajo de la media'],[0,23,'Baja']] },
    { max: 49, rangos: [[41,999,'Excelente'],[36,40,'Buena'],[31,35,'Por encima de la media'],[26,30,'Media'],[21,25,'Por debajo de la media'],[0,20,'Baja']] },
    { max: 59, rangos: [[36,999,'Excelente'],[31,35,'Buena'],[26,30,'Por encima de la media'],[22,25,'Media'],[18,21,'Por debajo de la media'],[0,17,'Baja']] },
    { max: 999, rangos: [[32,999,'Excelente'],[27,31,'Buena'],[22,26,'Por encima de la media'],[18,21,'Media'],[14,17,'Por debajo de la media'],[0,13,'Baja']] }
  ]
};

export function clasificarVO2max(vo2, edad, sexo) {
  const tabla = VO2MAX_TABLA[sexo === 'M' ? 'M' : 'H'];
  const bloque = tabla.find(b => edad <= b.max) || tabla[tabla.length - 1];
  const fila = bloque.rangos.find(([min, max]) => vo2 >= min && vo2 <= max);
  return fila ? fila[2] : '—';
}

export function calcularVO2Test(tipo, f) {
  if (tipo === 'rockport') {
    const sexoVal = f.sexo === 'M' ? 0 : 1;
    return 132.853 - (0.0769 * f.peso * 2.20462) - (0.3877 * f.edad) + (6.315 * sexoVal) - (3.2649 * f.tiempo) - (0.1565 * f.fc);
  }
  if (tipo === 'cooper') {
    return (f.distancia - 504.9) / 44.73;
  }
  if (tipo === 'queens') {
    return f.sexo === 'M' ? (65.81 - (0.1847 * f.fc_recuperacion)) : (111.33 - (0.42 * f.fc_recuperacion));
  }
  return null;
}

// Sugerencia de fase/frecuencia/duración/zona según la categoría del último test de VO2máx,
// basada en la tabla ACSM de los apuntes de Juan (fase acondicionamiento/mejora/mantenimiento).
export const CARDIO_FASE_SUGERIDA = {
  'Baja':                   { fase: 'Acondicionamiento', duracion: 12, frecuencia: 3, zona: 60 },
  'Por debajo de la media': { fase: 'Acondicionamiento', duracion: 15, frecuencia: 3, zona: 60 },
  'Media':                  { fase: 'Mejora',            duracion: 20, frecuencia: 4, zona: 70 },
  'Por encima de la media': { fase: 'Mejora',            duracion: 25, frecuencia: 4, zona: 70 },
  'Buena':                  { fase: 'Mantenimiento',     duracion: 25, frecuencia: 3, zona: 80 },
  'Excelente':              { fase: 'Mantenimiento',     duracion: 30, frecuencia: 3, zona: 80 }
};

// Zonas de Karvonen (60/70/80%) a partir de FC reposo + FC máxima estimada por edad (220-edad).
// Cada zona se da como rango (±5 puntos porcentuales alrededor del % nominal), no como número
// cerrado — así refleja mejor la evidencia real (las zonas de FC son bandas, no un valor exacto).
export function calcularZonasKarvonen(fcReposo, edad) {
  const fcMax = 220 - (edad || 30);
  const zonas = {};
  [60, 70, 80].forEach(pct => {
    const lo = Math.round(fcReposo + (fcMax - fcReposo) * ((pct - 5) / 100));
    const hi = Math.round(fcReposo + (fcMax - fcReposo) * ((pct + 5) / 100));
    zonas[pct] = { lo, hi };
  });
  return { fcMax, zonas };
}

// La rutina de cardio del cliente (columna es_cardio=true), o null si todavía no tiene ninguna.
// Nota: la columna `rir` de `ejercicios` (sin uso real en cardio, siempre '-' en fuerza cuando no
// aplica) se reutiliza aquí para guardar la zona de Karvonen en % (ej. "70") — así app/index.html

// Último PAR-Q vigente (dentro de los 6 meses) o null si no hay o ha caducado.
// `registros` viene ordenado por fecha descendente (el primero es el último).
export function parqVigente(registros) {
  if (!registros || !registros.length) return null;
  const ultimo = registros[0];
  const limite = new Date(ultimo.fecha);
  limite.setMonth(limite.getMonth() + PARQ_VIGENCIA_MESES);
  return limite >= new Date() ? ultimo : null;
}

// FC "de esfuerzo" de un test: Rockport y Cooper guardan 'fc'; Queens, 'fc_recuperacion'.
export function fcDeTest(h) {
  if (!h || !h.datos_input) return null;
  return h.tipo_test === 'queens' ? h.datos_input.fc_recuperacion : h.datos_input.fc;
}

// Sesión de cardio registrada desde la app del cliente: "6.5km/h @2% (20min)" → { vel, inc, dur }.
// (Mismo formato y expresiones que parseBloqueSerie del panel actual, solo la rama de cardio.)
export function parseSesionCardio(texto) {
  const vacio = { vel: null, inc: null, dur: null };
  const linea = String(texto || '').split('\n').map(l => l.trim()).filter(Boolean)[0];
  if (!linea) return vacio;
  const mVel = linea.match(/(\d+(?:\.\d+)?)\s*km\/?h/i);
  if (!mVel) return vacio;
  const mInc = linea.match(/@\s*(\d+(?:\.\d+)?)\s*%/);
  const mDur = linea.match(/\(\s*(\d+(?:\.\d+)?)\s*min\s*\)/i);
  return { vel: parseFloat(mVel[1]), inc: mInc ? parseFloat(mInc[1]) : null, dur: mDur ? parseFloat(mDur[1]) : null };
}

// La zona de Karvonen se guarda en la columna `rir`; la nota lleva un marcador técnico que lee la
// app del cliente ([[cardiozona:70:120:140]]). En el panel se esconde para no ensuciar la tabla.
export const notaVisible = notas => String(notas || '').replace(/\[\[cardiozona:[^\]]*\]\]/g, '').trim();
export const marcadorZona = (zona, lo, hi) => `[[cardiozona:${zona}:${lo}:${hi}]]`;
