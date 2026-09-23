// Datos de salud de la pestaña Datos: patologías y lesiones con sus precauciones de programación.
// Copiados tal cual del panel actual (prueba/index.html), solo con `export`.

export const PATOLOGIAS_LISTA = [
  { id: 'cardiovascular', label: 'Enfermedad cardiovascular' },
  { id: 'hipertension', label: 'Hipertensión' },
  { id: 'diabetes', label: 'Diabetes' },
  { id: 'epoc_asma', label: 'EPOC / Asma' },
  { id: 'obesidad', label: 'Obesidad' },
  { id: 'osteoporosis', label: 'Osteoporosis' },
  { id: 'artrosis', label: 'Artrosis' },
  { id: 'embarazo', label: 'Embarazo / Postparto' }
];

// ── Fase 0 (ago 2026, a petición de Juan) — patologías donde la prescripción calórica/de macros
// automática (fórmulas genéricas) puede ser inadecuada o insegura sin coordinación médica: diabetes
// (control glucémico, riesgo de hipo/hiperglucemia con cambios bruscos de carbohidratos) y embarazo
// (necesidades calóricas y de micronutrientes específicas por trimestre, no cubiertas por TDEE genérico).
// No bloquea el entrenamiento (eso ya lo cubre poblaciones-especiales.md) — bloquea el guardado del
// PLAN DE NUTRICIÓN hasta que el entrenador confirme explícitamente que lo ha revisado con criterio
// profesional (o derivado a dietista-nutricionista colegiado si procede).
export const PATOLOGIA_INFO = {
  cardiovascular: {
    label: 'Enfermedad cardiovascular',
    tips: [
      'Confirma que está estable y autorizado por su cardiólogo (angina inestable / infarto reciente = NO entrenar). PAR-Q obligatorio.',
      'FITT fuerza: 30-40% 1RM brazos, 50-60% 1RM piernas, 2-3 series de 10-15 reps cómodas, 2-3 días/semana (>48h entre sesiones).',
      'FITT cardio: 40-80% FCR (RPE 11-16), 20-30 min (tras evento cardíaco empezar en 1-5 min), 3-7 días/semana. EVITA maniobra de Valsalva.',
      'Para de inmediato y deriva si aparece: dolor en pecho/mandíbula/brazo izquierdo, sudor frío, mareo, arritmia perceptible o disnea desproporcionada.'
    ]
  },
  hipertension: {
    label: 'Hipertensión',
    tips: [
      'No entrenar si la TA en reposo es >200 sistólica o >115 diastólica. Mide la TA antes de cada sesión.',
      'FITT fuerza: 60-80% 1RM progresivo, ≥1 serie de 8-12 reps, 2-3 días/semana. Cargas bajas y más repeticiones si prefieres circuito. EVITA Valsalva.',
      'FITT cardio: 40-<60% FCR (RPE 11-13), 30-60 min/sesión (se puede fraccionar en bloques de 10 min), 3-7 días/semana.',
      'Si toma betabloqueantes, la FC no es fiable para marcar intensidad — usa RPE o el talk test. El objetivo principal suele ser la pérdida de grasa.'
    ]
  },
  diabetes: {
    label: 'Diabetes',
    tips: [
      'Pregunta tipo I o II y si toma insulina. Objetivo de glucemia: 90-250 mg/dl antes, <180 mg/dl después de entrenar.',
      'FITT fuerza: 60-70% 1RM progresando hasta ≥80%, 2-4 series de 8-12 reps, 2-3 días/semana (≥48h entre sesiones).',
      'FITT cardio: 150-300 min/semana en bloques ≥10 min, 3-7 días/semana.',
      'No entrenar con glucemia muy alta + cetonas, ni muy baja sin corregir antes (lleva carbohidratos de rescate). Si hay neuropatía periférica: evita terreno irregular, prioriza bici/natación, revisa el estado de los pies.'
    ]
  },
  epoc_asma: {
    label: 'EPOC / Asma',
    tips: [
      'La disnea manda, no el cansancio muscular — respeta la escala de Borg, usa intervalos con descanso.',
      'FITT: intensidad ~50% del consumo máximo de O2, tonificación 2-3 días/semana, duración variable según tolerancia.',
      'En asma, pregunta si necesita su inhalador de rescate antes de la sesión.'
    ]
  },
  obesidad: {
    label: 'Obesidad',
    tips: [
      'FITT fuerza: 60-70% 1RM progresando hasta ≥80%, 2-4 series de 8-12 reps, 2-3 días/semana (≥48h entre sesiones).',
      'FITT cardio: 40-≤60% FCR progresando hasta ≥60%, 30-60 min progresivo (objetivo ≥150 min/semana), 2-5 días/semana.',
      'Progresa la duración poco a poco — empezar en torno a 30 min. Si hay alteraciones de la marcha, prioriza bici reclinada, elíptica, natación o gimnasia acuática.',
      'La fuerza es un complemento importante al cardio, no un accesorio — ayuda a preservar masa magra durante la pérdida de peso.'
    ]
  },
  osteoporosis: {
    label: 'Osteoporosis',
    tips: [
      'EVITA flexión de columna cargada, impacto fuerte y torsiones rápidas.',
      'FITT fuerza: 80-85% 1RM progresivo, 2-3 series de <8 reps con máxima velocidad concéntrica, 2-3 días/semana.',
      'FITT cardio: 60-85% FCR progresivo, 10-30 min progresivo, >3 días/semana.',
      'Prioriza fuerza con pesas libres de pie (estimula cadera + columna). Los cambios de densidad ósea tardan 9-12 meses en notarse — gestiona expectativas.'
    ]
  },
  artrosis: {
    label: 'Artrosis',
    tips: [
      'La inmovilización empeora la artrosis más que el ejercicio bien dosificado — el movimiento nutre el cartílago.',
      'FITT fuerza: intensidad baja-moderada (incluye isométricos), 3-5 ejercicios de 1 serie de 5-10 reps, 2 días/semana, descansos preferiblemente pasivos.',
      'FITT cardio: RPE 12-16 (50-75% FCR), 30 min en bloques de 10 min al principio, 3-4 días/semana.',
      'Prioriza bajo impacto (el trabajo en agua es ideal). Dato útil: perder un 10% del peso corporal reduce ~50% el dolor de rodilla en artrosis de rodilla. Evita fases agudas/inflamación activa.'
    ]
  },
  embarazo: {
    label: 'Embarazo / Postparto',
    tips: [
      'PROHIBIDO decúbito supino a partir de la semana 16. Evita Valsalva, movimientos balísticos, cargas sobre cabeza (2T) y ambientes calurosos/húmedos.',
      'FITT fuerza: ≤70% 1RM, principiantes 1×≥10 reps, experimentadas 2-3×≥10, 3 días no consecutivos, descansos ~2 min activos.',
      'FITT cardio: RPE 12-14 y talk test (no FC fija — ACOG abandonó los rangos fijos); T1 10-30 min, T2 20-30 min, T3 30 min; 2-5 días/semana según trimestre.',
      'Para de inmediato y deriva si hay: sangrado, mareo, dolor abdominal/cabeza, pérdida de líquido, contracciones o descenso de movimiento fetal.'
    ]
  }
};

// Orientación de entrenador (no clínica) para lesiones comunes, basada en protocolos de
// fisioterapia ortopédica y readaptación deportiva. Siempre sujeta al alta del fisio/médico.
export const LESION_INFO = {
  rodilla_lca_menisco: {
    label: 'Rodilla — LCA reconstruido / menisco',
    recomendados: [
      'Trabajo en cadena cinética cerrada controlado: sentadilla/prensa en rango parcial e indoloro, step-ups, zancadas cortas.',
      'Isométricos y excéntricos de cuádriceps e isquiotibiales para equilibrar fuerza entre ambas piernas.',
      'Trabajo de propiocepción y equilibrio unipodal (progresando de superficie estable a inestable).',
      'Cardio de bajo impacto: bici, elíptica, natación.'
    ],
    precaucion: [
      'Evita pivotar, cambios de dirección bruscos o saltos con aterrizaje descontrolado hasta tener el visto bueno del fisio para esa fase.',
      'Progresa el rango de flexión con carga poco a poco; no fuerces flexión profunda cargada de entrada.',
      'Si hubo reparación de menisco (no solo meniscectomía), sé más conservador con la carga en flexión profunda — pregúntale qué tipo de cirugía fue exactamente.'
    ],
    alerta: 'Deriva a fisio si hay hinchazón nueva, sensación de bloqueo/fallo de la rodilla, o dolor que no baja con el reposo.'
  },
  hombro_manguito: {
    label: 'Hombro — Manguito rotador',
    recomendados: [
      'Rotación externa/interna con banda, codo pegado al cuerpo, cargas ligeras y muchas repeticiones.',
      'Press en banco inclinado o en máquina antes que press plano/overhead pesado.',
      'Trabajo de estabilidad escapular (remo, face pull con control).',
      'Ejercicios de tren inferior y core no se ven afectados — mantén el volumen ahí.'
    ],
    precaucion: [
      'Evita press militar/overhead pesado, dominadas tras nuca y jalón tras nuca hasta que no haya molestia.',
      'Cuidado con el press banca y fondos si aparece pinzamiento (dolor al bajar cerca del pecho).',
      'Progresa carga y rango poco a poco — el objetivo es entrenar sin dolor, no "aguantar" el dolor.'
    ],
    alerta: 'Deriva a fisio si hay pérdida de fuerza notable, dolor nocturno, o el hombro "falla" en movimientos cotidianos.'
  },
  espalda_hernia: {
    label: 'Espalda baja — Hernia discal / lumbalgia',
    recomendados: [
      'Puente de glúteo, pallof press / anti-rotación, plancha, pájaro-perro — estabilidad sin flexionar la columna.',
      'Bisagra de cadera con técnica impecable y carga baja-moderada antes que peso muerto pesado.',
      'Cardio de bajo impacto: caminar, bici, natación.'
    ],
    precaucion: [
      'Evita flexión de columna cargada: abdominales tipo crunch/sit-up, buenos días, remo con espalda redondeada.',
      'Evita rotación cargada (giros rusos con peso, máquinas de rotación de tronco sentado).',
      'Sentadilla y peso muerto: técnica antes que carga, rango que no le duela, sin redondear la zona lumbar.'
    ],
    alerta: 'Deriva a médico/fisio si hay dolor que baja por la pierna, hormigueo, entumecimiento o pérdida de fuerza en la pierna.'
  },
  tobillo_esguince: {
    label: 'Tobillo — Esguince',
    recomendados: [
      'Propiocepción y equilibrio unipodal (plato de equilibrio, superficie inestable) — es lo que más reduce el riesgo de recaída.',
      'Fortalecimiento de peroneos con banda (eversión) y gemelo/sóleo.',
      'Trabajo de cadera y glúteo medio (más determinante para la estabilidad que el propio tobillo).'
    ],
    precaucion: [
      'Progresa saltos/pliometría y cambios de dirección solo cuando camine y suba escaleras sin ninguna molestia.',
      'Cuidado con superficies irregulares o carrera en cuestas hasta recuperar estabilidad completa.'
    ],
    alerta: 'Deriva a fisio si sigue hinchado, inestable ("se le va" el tobillo) o con dolor varias semanas después.'
  },
  otra: {
    label: 'Otra lesión (especificar en detalles)',
    recomendados: [],
    precaucion: [],
    alerta: 'Descríbela en el cuadro de detalles y, si tienes dudas de qué evitar, coméntamelo y busco algo específico para ese caso.'
  }
};
