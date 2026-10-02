// Cuerpo · constantes y cálculos puros (sin DOM). Copiado tal cual de prueba/index.html
// (seguimiento corporal: líneas 3861-4540), salvo dos cambios a propósito:
//  - el botón del veredicto ya no lleva un onclick en texto sino `ir: 'nutricion' | 'entrenos'`;
//  - calcularComposicionDesdeEntry vive aquí (antes estaba mezclada con el guardado);
//  - fuerzaDeCliente reproduce el apartado "Fuerza" de la lectura rápida (antes dentro de la función de pintado).
import { mesocicloMapsDeCliente, claveEjercicioRutina, detectarEstancamiento } from '../historial/calculos.js';
import { rnd, calcBF, calcComp, calcWHtR, calcWHR, calcRCV, calcRH, calcRI, calcRS, calcIQF, calcIRR, calcIRE, calcIPO } from '../core/composicion.js';

export const NIVEL_SCORE = { verde: 4, amarillo: 3, naranja: 2, rojo: 1 };
export const NIVEL_COLOR_MAP = { verde: '#22c55e', amarillo: '#eab308', naranja: '#f97316', rojo: '#ef4444' };

// Un único listado de "datos" de seguimiento corporal — cada uno se convierte en una tarjeta con
// gráfica de evolución, igual que las tarjetas de progreso de Entrenos (título + gráfica + ACTUAL).
// Los de tipo "nivel" (riesgos categóricos verde/amarillo/naranja/rojo) se grafican como una escala 1-4
// para poder ver la tendencia, coloreando cada punto según el semáforo de ese día.
export const CAMPOS_SEGUIMIENTO = [
  // Medidas físicas
  { id: 'peso', lbl: 'Peso', unidad: 'kg', color: '#3b82f6', categoria: 'perimetros', get: d => d.peso },
  { id: 'abdomen', lbl: 'Abdomen', unidad: 'cm', color: '#22c55e', categoria: 'perimetros', get: d => d.abdomen },
  { id: 'cuello', lbl: 'Cuello', unidad: 'cm', color: '#f59e0b', categoria: 'perimetros', get: d => d.cuello },
  { id: 'brazo', lbl: 'Brazo', unidad: 'cm', color: '#a855f7', categoria: 'perimetros', get: d => d.brazo },
  { id: 'antebrazo', lbl: 'Antebrazo', unidad: 'cm', color: '#ec4899', categoria: 'perimetros', get: d => d.antebrazo },
  { id: 'cadera', lbl: 'Cadera / Nalgas', unidad: 'cm', color: '#14b8a6', categoria: 'perimetros', get: d => d.cadera },
  { id: 'muslo', lbl: 'Muslo', unidad: 'cm', color: '#eab308', categoria: 'perimetros', get: d => d.muslo },
  { id: 'pantorrilla', lbl: 'Pantorrilla', unidad: 'cm', color: '#f97316', categoria: 'perimetros', get: d => d.pantorrilla },
  // Composición (de "Calcular" en Nutrición)
  { id: 'pctGrasa', lbl: '% Graso', unidad: '%', color: '#ef4444', categoria: 'composicion', get: d => d.composicion?.bf?.media },
  { id: 'masaGrasa', lbl: 'Masa grasa', unidad: 'kg', color: '#f43f5e', categoria: 'composicion', get: d => d.composicion?.comp?.masaGrasa },
  { id: 'masaMagra', lbl: 'Masa magra', unidad: 'kg', color: '#10b981', categoria: 'composicion', get: d => d.composicion?.comp?.masaMagra },
  { id: 'imc', lbl: 'IMC', unidad: '', color: '#0ea5e9', categoria: 'composicion', get: d => d.composicion?.comp?.imc },
  { id: 'ffmi', lbl: 'FFMI', unidad: '', color: '#8b5cf6', categoria: 'composicion', get: d => d.composicion?.comp?.ffmi },
  // Salud — ratios reales, se grafican tal cual
  { id: 'whtr', lbl: 'Cintura/Altura (WHtR)', unidad: '', color: '#eab308', categoria: 'salud', get: d => d.composicion?.w?.v },
  { id: 'whr', lbl: 'Cintura/Cadera (WHR)', unidad: '', color: '#fb923c', categoria: 'salud', get: d => d.composicion?.r2?.v },
  // Salud — riesgos categóricos, escala 1(rojo)-4(verde)
  { id: 'riesgoCV', lbl: 'Riesgo cardiovascular', esNivel: true, categoria: 'salud',
    get: d => NIVEL_SCORE[d.composicion?.cv?.nivel], getNivel: d => d.composicion?.cv?.nivel, getDesc: d => d.composicion?.cv?.desc },
  { id: 'riesgoHormonal', lbl: 'Riesgo hormonal', esNivel: true, categoria: 'salud',
    get: d => NIVEL_SCORE[d.composicion?.rh?.nivel], getNivel: d => d.composicion?.rh?.nivel, getDesc: d => d.composicion?.rh?.desc },
  { id: 'riesgoInsulinico', lbl: 'Riesgo insulínico', esNivel: true, categoria: 'salud',
    get: d => NIVEL_SCORE[d.composicion?.ri?.nivel], getNivel: d => d.composicion?.ri?.nivel, getDesc: d => d.composicion?.ri?.desc },
  { id: 'riesgoSarcopenia', lbl: 'Riesgo sarcopenia', esNivel: true, categoria: 'salud',
    get: d => NIVEL_SCORE[d.composicion?.rs?.nivel], getNivel: d => d.composicion?.rs?.nivel, getDesc: d => d.composicion?.rs?.desc },
  // Rendimiento (0-100)
  { id: 'iqf', lbl: 'Índice físico (IQF)', unidad: '/100', color: '#22d3ee', categoria: 'rendimiento', get: d => d.composicion?.iqf?.valor },
  { id: 'irr', lbl: 'Recuperación (IRR)', unidad: '/100', color: '#a78bfa', categoria: 'rendimiento', get: d => d.composicion?.irr?.valor },
  // Check-in semanal (origen='checkin'): 5 preguntas de sensaciones, escala 1-5. Mismo listado que
  // usa check-ins/index.html — se guardan en esta misma tabla (seguimiento_corporal.origen='checkin').
  { id: 'sensaciones', lbl: '😊 Sensaciones generales', unidad: '/5', color: '#3b82f6', categoria: 'checkin', get: d => d.sensaciones, getNota: d => d.sensaciones_nota },
  { id: 'adherencia', lbl: '🥗 Adherencia a la dieta', unidad: '/5', color: '#22c55e', categoria: 'checkin', get: d => d.adherencia, getNota: d => d.adherencia_nota },
  { id: 'sueno', lbl: '🌙 Calidad del sueño', unidad: '/5', color: '#8b5cf6', categoria: 'checkin', get: d => d.sueno, getNota: d => d.sueno_nota },
  { id: 'energia', lbl: '⚡ Nivel de energía', unidad: '/5', color: '#f59e0b', categoria: 'checkin', get: d => d.energia, getNota: d => d.energia_nota },
  { id: 'molestias', lbl: '🩺 Molestias físicas', unidad: '/5', color: '#ef4444', categoria: 'checkin', get: d => d.molestias, getNota: d => d.molestias_nota }
];

export const CATEGORIAS_SEGUIMIENTO = [
  { id: 'perimetros', lbl: '📏 Perímetros y peso' },
  { id: 'composicion', lbl: '🔥 Composición corporal' },
  { id: 'salud', lbl: '❤️ Salud y riesgos' },
  { id: 'checkin', lbl: '✅ Check-in (sensaciones semanales)' },
  { id: 'rendimiento', lbl: '🏋️ Rendimiento' }
];

// Formatea un número de semanas para mostrarlo en una etiqueta corta ("1sem", "0.3sem", "2.5sem").
export function fmtSemanasEtiqueta(semanas) {
  const r = Math.round(semanas * 10) / 10;
  return `${r}sem`;
}

// Etiquetas legibles para el objetivo calórico guardado en Nutrición (planes_nutricion.objetivo_calorico).
export const OBJETIVO_LABEL = { corte: 'déficit', mantenimiento: 'mantenimiento', volumen: 'superávit' };

// Da UNA sola lectura de "qué está pasando con el peso y la composición" para una ventana de tiempo,
// en vez de dos lecturas separadas (informe + insight) que podían acabar diciendo cosas parecidas o
// contradictorias. Usa composición corporal cuando hay (más precisa: masa magra/% graso) y, si no hay,
// cae a un patrón de perímetros. Sabe qué objetivo calórico tiene el cliente (déficit/mantenimiento/
// superávit) para no recomendar "baja calorías" a alguien que ya está en déficit y viceversa.
export function lecturaPesoComposicion({ last, prev, semanas, objetivo, patronTxt }) {
  const deltaPeso = rnd(last.peso - prev.peso, 1);
  const pctSemana = semanas > 0 ? (deltaPeso / prev.peso) / semanas * 100 : 0;
  const kgSemana = semanas > 0 ? rnd(deltaPeso / semanas, 2) : 0;
  const totalTxt = `${deltaPeso > 0 ? '+' : ''}${deltaPeso}kg en ${fmtSemanasEtiqueta(semanas)} (${prev.peso}kg → ${last.peso}kg)`;
  const obj = OBJETIVO_LABEL[objetivo] || null;

  const compL = last.composicion, compP = prev.composicion;
  const deltaMagra = (compL?.comp && compP?.comp) ? rnd(compL.comp.masaMagra - compP.comp.masaMagra, 1) : null;
  const deltaGrasaPct = (compL?.bf && compP?.bf) ? rnd(compL.bf.media - compP.bf.media, 1) : null;

  // 1) Pérdida rápida con caída de masa magra — señal de alerta pase lo que pase con el objetivo.
  if (pctSemana <= -1 && deltaMagra !== null && deltaMagra < -0.2) {
    return { icon: '⚠️', color: '#ef4444',
      txt: `Ritmo de pérdida ~${Math.abs(pctSemana).toFixed(1)}%/semana (${kgSemana}kg/semana, ${totalTxt}) con caída de masa magra (${deltaMagra}kg). La evidencia (Garthe et al.) recomienda no bajar de ~1%/semana para minimizar la pérdida muscular.`,
      rec: 'Sube la ingesta 150-300 kcal y asegura proteína alta (2.2-2.6 g/kg). Mantén el volumen de fuerza — no lo recortes en déficit.' + (obj === 'superávit' ? ' Raro viendo que el objetivo es superávit: revisa que se esté cumpliendo el plan calórico real.' : '') };
  }
  // 2) Recomposición funcionando — buena señal independientemente del objetivo declarado.
  if (deltaMagra !== null && deltaMagra > 0.2 && deltaGrasaPct !== null && deltaGrasaPct <= 0) {
    return { icon: '✅', color: '#22c55e',
      txt: `Masa magra +${deltaMagra}kg con % graso estable o a la baja (${totalTxt}) — la recomposición está funcionando${obj ? ` con el objetivo de ${obj}` : ''}.`,
      rec: 'Mantén las calorías y el entrenamiento tal cual — está funcionando, no cambies nada todavía.' };
  }
  // 3) % graso sube sin masa magra — la lectura correcta depende totalmente del objetivo.
  if (deltaGrasaPct !== null && deltaGrasaPct > 0.5 && deltaMagra !== null && deltaMagra <= 0) {
    let rec;
    if (objetivo === 'volumen') rec = 'El superávit probablemente sea demasiado alto para lo que se puede construir de músculo ahora mismo. Baja 100-200 kcal y prioriza la progresión de cargas para dirigir el extra a masa muscular.';
    else if (objetivo === 'corte' || objetivo === 'mantenimiento') rec = `No cuadra con el objetivo de ${obj} declarado en Nutrición: subir % graso sin ganar masa magra sugiere que se está comiendo por encima de lo pactado. Revisa la adherencia real antes de tocar el entreno.`;
    else rec = 'El aporte calórico actual podría estar por encima de lo que se puede construir de músculo ahora mismo. Revisa la ingesta real (y de paso, guarda el objetivo calórico en Nutrición para que esta lectura sea más precisa).';
    return { icon: '⚠️', color: '#f97316', txt: `% graso +${deltaGrasaPct}pts sin ganancia de masa magra (${totalTxt}).`, rec };
  }

  // 4) Sin composición completa (o ninguno de los patrones anteriores): fallback basado solo en ritmo
  // de peso + perímetros, igual de consciente del objetivo.
  let ritmoLabel;
  if (pctSemana > 0.15) ritmoLabel = 'ganando';
  else if (pctSemana > -0.3) ritmoLabel = 'estancado';
  else if (pctSemana >= -1.0) ritmoLabel = 'bajando_ok';
  else ritmoLabel = 'bajando_rapido';

  const base = { txt: `Peso ${kgSemana > 0 ? '+' : ''}${kgSemana}kg/semana (${totalTxt}).${patronTxt ? ` ${patronTxt}` : ''}` };

  if (objetivo === 'corte') {
    if (ritmoLabel === 'ganando') return { ...base, icon: '⚠️', color: '#f97316', rec: 'El objetivo es déficit pero el peso está subiendo — revisa si realmente se está cumpliendo la dieta.' };
    if (ritmoLabel === 'estancado') return { ...base, icon: '➖', color: '#eab308', rec: 'Si llevas 2-3 semanas casi sin bajar, valora bajar 100-150 kcal o revisar la adherencia real a la dieta.' };
    if (ritmoLabel === 'bajando_ok') return { ...base, icon: '✅', color: '#22c55e', rec: 'Ritmo de pérdida adecuado para el objetivo de déficit — mantén igual, no toques nada todavía.' };
    return { ...base, icon: '⚠️', color: '#ef4444', rec: 'Ritmo demasiado rápido para el objetivo de déficit. Sube la ingesta 150-300 kcal y asegura proteína alta para minimizar la pérdida muscular.' };
  }
  if (objetivo === 'volumen') {
    if (ritmoLabel === 'ganando') return pctSemana > 0.5
      ? { ...base, icon: '⚠️', color: '#f97316', rec: 'Ganancia bastante rápida para un superávit limpio — probablemente se esté acumulando más grasa que músculo. Valora bajar 100-200 kcal.' }
      : { ...base, icon: '✅', color: '#22c55e', rec: 'Ritmo de ganancia adecuado para el objetivo de superávit — mantén igual.' };
    return { ...base, icon: '⚠️', color: '#f97316', rec: 'El objetivo es superávit pero el peso no sube (o baja) — revisa si realmente se está comiendo el superávit pactado.' };
  }
  if (objetivo === 'mantenimiento') {
    if (ritmoLabel === 'estancado') return { ...base, icon: '✅', color: '#22c55e', rec: 'Peso estable, acorde al objetivo de mantenimiento.' };
    return { ...base, icon: '⚠️', color: '#f97316', rec: 'El objetivo es mantenimiento pero el peso se está moviendo — revisa la ingesta real, puede que se esté desviando del plan.' };
  }
  // Sin objetivo guardado: lectura neutra, sin asumir qué se busca.
  const recNeutra = { ganando: 'Si el objetivo es perder grasa, baja 150-200 kcal. Si es volumen/recomposición, este ritmo puede ser el esperado.',
    estancado: 'Si llevas 2-3 semanas así, valora ajustar 100-150 kcal según el objetivo real, o revisar la adherencia.',
    bajando_ok: 'Ritmo razonable si el objetivo es perder grasa — mantén igual si es el caso.',
    bajando_rapido: 'Ritmo rápido para minimizar pérdida muscular. Sube la ingesta 150-300 kcal y asegura proteína alta (evidencia: Garthe et al.).' }[ritmoLabel];
  const colorNeutro = { ganando: '#eab308', estancado: '#eab308', bajando_ok: '#22c55e', bajando_rapido: '#ef4444' }[ritmoLabel];
  const iconNeutro = { ganando: '📈', estancado: '➖', bajando_ok: '✅', bajando_rapido: '⚠️' }[ritmoLabel];
  return { ...base, icon: iconNeutro, color: colorNeutro, rec: recNeutra + ' (Guarda el objetivo calórico en Nutrición para que esta lectura sea automática.)' };
}

// Patrón simple de perímetros (adiposidad vs. entrenados) — solo se usa como apoyo cuando no hay
// composición corporal completa para dar una lectura más precisa.
export function patronPerimetros(last, prev) {
  const deltaCampo = k => (last[k] == null || prev[k] == null) ? null : rnd(last[k] - prev[k], 1);
  const adip = [{ k: 'abdomen', lbl: 'Abdomen' }, { k: 'cuello', lbl: 'Cuello' }]
    .map(c => ({ ...c, delta: deltaCampo(c.k) })).filter(c => c.delta !== null);
  const musc = [{ k: 'brazo', lbl: 'Brazo' }, { k: 'muslo', lbl: 'Muslo' }, { k: 'pantorrilla', lbl: 'Pantorrilla' }]
    .map(c => ({ ...c, delta: deltaCampo(c.k) })).filter(c => c.delta !== null);
  if (adip.length && adip.every(c => c.delta < 0) && musc.length && musc.every(c => c.delta >= 0)) {
    return `Los perímetros acompañan: ${adip.map(c => `${c.lbl.toLowerCase()} ${c.delta}cm`).join(', ')} bajan mientras las zonas entrenadas se mantienen o suben.`;
  }
  if (adip.length && adip.every(c => c.delta < 0)) return `Los perímetros de adiposidad bajan (${adip.map(c => `${c.lbl} ${c.delta}cm`).join(', ')}).`;
  if (adip.length && adip.every(c => c.delta > 0)) return `Los perímetros de adiposidad suben (${adip.map(c => `${c.lbl} +${c.delta}cm`).join(', ')}).`;
  return null;
}


// Ranking de las etiquetas de IRR (peor→mejor) para poder detectar si la recuperación ha mejorado o empeorado
export const IRR_RANK = ['Comprometida', 'Recuperación limitada', 'Recuperación normal', 'Recuperación buena', 'Recuperación óptima'];
// Igual pero para las categorías de IRE (tipo de respondedor), mismo criterio peor→mejor
export const IRE_RANK = ['RESPONDEDOR BAJO', 'RESPONDEDOR MEDIO', 'RESPONDEDOR ALTO'];

export const NIVEL_ATLETA_AVANZADO = ['Avanzado', 'Muy avanzado', 'Atleta máster'];
export const RITMO_OBJETIVO = {
  corte:         { avanzado: { min: 0.2,  max: 0.5 }, general: { min: 0.3,  max: 1.0 } },
  volumen:       { avanzado: { min: 0.05, max: 0.25 }, general: { min: 0.15, max: 0.5 } },
  mantenimiento: { avanzado: { min: -0.25, max: 0.25 }, general: { min: -0.25, max: 0.25 } },
};
export function bucketNivelAtleta(nivelAtleta) { return NIVEL_ATLETA_AVANZADO.includes(nivelAtleta) ? 'avanzado' : 'general'; }

export function generarInsightsSeguimiento(datos, objetivo, nivelAtleta) {
  if (datos.length < 2) return [];
  const last = datos[datos.length - 1];
  const prevCorto = datos[datos.length - 2];

  const fechaLast = new Date(last.fecha);
  const objetivoLargo = new Date(fechaLast);
  objetivoLargo.setDate(objetivoLargo.getDate() - 28);
  let prevLargo = null, mejorDif = Infinity;
  datos.slice(0, -1).forEach(d => {
    const dif = Math.abs(new Date(d.fecha) - objetivoLargo);
    if (dif < mejorDif) { mejorDif = dif; prevLargo = d; }
  });

  // Cuántas semanas separan el último registro del anterior — para que "Corto plazo" no sea una
  // etiqueta ambigua: puede ser de un día a un mes según lo seguido que esté el cliente.
  const semanasCorto = (fechaLast - new Date(prevCorto.fecha)) / 86400000 / 7;
  const ventanas = [{ tag: `Corto plazo (${fmtSemanasEtiqueta(semanasCorto)})`, prev: prevCorto }];
  if (prevLargo && prevLargo.id !== prevCorto.id) ventanas.push({ tag: 'Tendencia (~4 sem)', prev: prevLargo });

  // Ritmo real reciente (%/semana) para comparar contra el objetivo — se prioriza la ventana de
  // tendencia (~4 semanas) si existe por ser más fiable que un solo dato suelto; si no hay suficiente
  // historial, cae al corto plazo.
  const prevRitmo = prevLargo || prevCorto;
  const semanasRitmo = (fechaLast - new Date(prevRitmo.fecha)) / 86400000 / 7;
  const pctSemanaRitmo = (last.peso && prevRitmo.peso && semanasRitmo >= 0.5)
    ? ((last.peso - prevRitmo.peso) / prevRitmo.peso) / semanasRitmo * 100
    : null;

  const insights = [];
  ventanas.forEach(({ tag, prev }) => {
    const semanas = (new Date(last.fecha) - new Date(prev.fecha)) / 86400000 / 7;
    if (semanas < 0.2) return; // demasiado cerca en el tiempo para sacar conclusiones de ritmo

    const compL = last.composicion, compP = prev.composicion;

    // Peso + composición: UNA sola lectura por ventana (antes eran dos tarjetas separadas que podían
    // repetirse o contradecirse). Se calcula siempre que haya peso en ambos registros, aunque no haya
    // composición completa (en ese caso usa perímetros como apoyo). Sabe el objetivo real del cliente.
    if (last.peso && prev.peso) {
      const patronTxt = (!compL?.comp || !compP?.comp) ? patronPerimetros(last, prev) : null;
      const lectura = lecturaPesoComposicion({ last, prev, semanas, objetivo, patronTxt });
      // Si hay composición completa (masa magra/grasa reales) es un dato de "composicion"; si solo
      // tenemos peso + perímetros de apoyo, encaja mejor en la categoría "perimetros".
      const categoriaPeso = (compL?.comp && compP?.comp) ? 'composicion' : 'perimetros';
      insights.push({ tag, tema: 'pesocomp', categoria: categoriaPeso, ...lectura });
    }

    if (compL?.w && compP?.w && NIVEL_SCORE[compL.w.nivel] < NIVEL_SCORE[compP.w.nivel]) {
      insights.push({ tag, tema: 'whtr', categoria: 'salud', icon: '⚠️', color: '#ef4444', txt: 'El riesgo cardiovascular por cintura/altura (WHtR) ha empeorado.',
        rec: 'Añade cardio moderado (~150 min/semana) y revisa el sueño/estrés si el abdomen crece más que el resto del cuerpo — puede indicar retención o cortisol elevado.' });
    }
    if (compL?.r2 && compP?.r2 && NIVEL_SCORE[compL.r2.nivel] < NIVEL_SCORE[compP.r2.nivel]) {
      insights.push({ tag, tema: 'whr', categoria: 'salud', icon: '⚠️', color: '#ef4444', txt: 'El riesgo por distribución cintura/cadera (WHR) ha empeorado.',
        rec: 'Revisa la tendencia de peso/grasa general — un WHR peor suele acompañar ganancia de grasa visceral, no es solo un tema local.' });
    }
    if (compL?.irr && compP?.irr) {
      const rL = IRR_RANK.indexOf(compL.irr.label), rP = IRR_RANK.indexOf(compP.irr.label);
      if (rL >= 0 && rP >= 0 && rL < rP) {
        insights.push({ tag, tema: 'irr', categoria: 'rendimiento', icon: '😴', color: '#a78bfa', txt: `La recuperación ha empeorado (${compP.irr.label} → ${compL.irr.label}).`,
          rec: 'Valora una semana de descarga (baja el volumen ~20-30%) y prioriza dormir 7-9h antes de seguir progresando cargas.' });
      }
    }
    if (compL?.comp && compP?.comp) {
      const deltaFFMI = compL.comp.ffmi - compP.comp.ffmi;
      if (deltaFFMI > 0.3) {
        insights.push({ tag, tema: 'ffmi', categoria: 'composicion', icon: '🏋️', color: '#8b5cf6', txt: `FFMI +${deltaFFMI.toFixed(1)} — buen progreso de masa muscular.`,
          rec: 'Sigue con la progresión actual de cargas; si la recuperación acompaña, hay margen para subir un poco el volumen semanal.' });
      }
    }

    // IRE: no es solo una foto fija (ver más abajo el caso BAJO/ALTO del último registro) — si ha
    // mejorado entre registros es la prueba de que el ajuste de volumen/técnica recomendado antes está
    // funcionando, y merece decírselo al entrenador tanto como cuando empeora.
    if (compL?.ire && compP?.ire) {
      const rL = IRE_RANK.indexOf(compL.ire.cat), rP = IRE_RANK.indexOf(compP.ire.cat);
      if (rL >= 0 && rP >= 0 && rL > rP) {
        insights.push({ tag, tema: 'ire_evol', categoria: 'rendimiento', icon: '📈', color: '#22c55e',
          txt: `El tipo de respondedor ha mejorado (${compP.ire.cat} → ${compL.ire.cat}).`,
          rec: 'El ajuste de volumen/técnica que se hizo está dando resultado — mantenlo, no hace falta cambiar nada por ahora.' });
      } else if (rL >= 0 && rP >= 0 && rL < rP) {
        insights.push({ tag, tema: 'ire_evol', categoria: 'rendimiento', icon: '📉', color: '#f97316',
          txt: `El tipo de respondedor ha empeorado (${compP.ire.cat} → ${compL.ire.cat}).`,
          rec: 'Revisa si ha bajado el volumen efectivo, la adherencia al entreno o si toca meter algo de intensidad (rest-pause, drop set) antes de la próxima revisión.' });
      }
    }
  });

  // Si corto plazo y tendencia larga dan lecturas opuestas sobre peso+composición (una en verde, otra
  // en rojo/naranja), no es un fallo — son ventanas de tiempo distintas y el % graso se estima con
  // fórmulas indirectas con su propio margen de ruido (hidratación, hora del pesaje, etc.). Para que no
  // quede la duda de "¿a cuál hago caso?", se avisa explícitamente y se indica cuál priorizar.
  const pesoComp = insights.filter(i => i.tema === 'pesocomp');
  if (pesoComp.length === 2) {
    const positivo = pesoComp.find(i => i.color === '#22c55e');
    const negativo = pesoComp.find(i => i.color === '#ef4444' || i.color === '#f97316');
    if (positivo && negativo) {
      insights.push({ tag: 'Nota', categoria: 'composicion', icon: 'ℹ️', color: '#3b82f6',
        txt: 'El corto plazo y la tendencia larga dicen cosas distintas sobre peso/composición — no es un error: son ventanas de tiempo diferentes, y el % graso se estima con fórmulas indirectas que varían un poco según hidratación o el momento del pesaje.',
        rec: 'Para decidir si tocar algo, prioriza siempre la tendencia de varias semanas sobre el dato de una sola semana — el corto plazo es más una alerta temprana que una conclusión.' });
    }
  }

  if (last.composicion?.ire?.cat === 'RESPONDEDOR BAJO') {
    insights.push({ tag: 'Estado actual', categoria: 'rendimiento', icon: '💪', color: '#ef4444', txt: 'Respondedor bajo al estímulo actual.',
      rec: 'Valora subir el volumen semanal (series efectivas) o introducir técnicas de alta intensidad (rest-pause, drop set) durante 4-6 semanas antes de reevaluar.' });
  } else if (last.composicion?.ire?.cat === 'RESPONDEDOR ALTO') {
    insights.push({ tag: 'Estado actual', categoria: 'rendimiento', icon: '🚀', color: '#22c55e', txt: 'Respondedor alto al estímulo actual — genética favorable.',
      rec: 'Tienes margen para exigir más que a un cliente medio: valora subir algo el volumen o la intensidad relativa antes de que el progreso se estanque por quedarte corto de estímulo.' });
  }

  // Las reglas de arriba solo avisan cuando algo empeora o hay un caso concreto (respondedor bajo,
  // FFMI +0.3...). Si el cliente está estable o mejorando poco a poco, esas secciones se quedaban
  // mudas. Aquí se da una lectura del estado actual — sin inventar tendencia, solo el dato real de
  // hoy — cuando no ha saltado ya ningún aviso de esa categoría. OJO: se busca el ÚLTIMO registro que
  // SÍ tenga ese dato (no necesariamente 'last'), porque el check-in más reciente puede no traer
  // medidas completas (solo se piden cada X semanas) y por tanto no tener composición calculada.
  const NIVEL_TXT = { verde: 'bajo', amarillo: 'leve', naranja: 'moderado', rojo: 'alto' };
  const ultimoConSalud = datos.slice().reverse().find(d => d.composicion?.cv || d.composicion?.rh || d.composicion?.ri || d.composicion?.rs);
  const ultimoConComp = datos.slice().reverse().find(d => d.composicion?.comp);
  const ultimoConRend = datos.slice().reverse().find(d => d.composicion?.irr || d.composicion?.iqf || d.composicion?.ire);

  if (!insights.some(i => i.categoria === 'salud') && ultimoConSalud) {
    const cs = ultimoConSalud.composicion;
    const riesgos = [['Cardiovascular', cs.cv], ['Hormonal', cs.rh], ['Insulínico', cs.ri], ['Sarcopenia', cs.rs]].filter(([, r]) => r);
    const peor = riesgos.reduce((p, c) => (NIVEL_SCORE[c[1].nivel] < NIVEL_SCORE[p[1].nivel] ? c : p), riesgos[0]);
    if (peor[1].nivel === 'verde') {
      insights.push({ tag: 'Estado actual', categoria: 'salud', icon: '✅', color: '#22c55e',
        txt: 'Todos los marcadores de riesgo por perímetros (cardiovascular, hormonal, insulínico, sarcopenia) están en nivel bajo.', rec: null });
    } else {
      insights.push({ tag: 'Estado actual', categoria: 'salud', icon: peor[1].nivel === 'rojo' ? '🔴' : (peor[1].nivel === 'naranja' ? '🟠' : '🟡'),
        color: NIVEL_COLOR_MAP[peor[1].nivel], txt: `Riesgo ${peor[0].toLowerCase()} en nivel ${NIVEL_TXT[peor[1].nivel]} (${peor[1].desc || ''}), sin cambios recientes.`,
        rec: 'No es una alarma nueva, pero conviene no perderlo de vista en las próximas semanas.' });
    }
  }
  if (!insights.some(i => i.categoria === 'composicion') && ultimoConComp) {
    const c = ultimoConComp.composicion.comp;
    insights.push({ tag: 'Estado actual', categoria: 'composicion', icon: '📊', color: '#22c55e',
      txt: `Composición actual: ${c.masaMagra}kg masa magra, ${c.masaGrasa}kg masa grasa, FFMI ${c.ffmi}${ultimoConComp.composicion.bf ? `, ${ultimoConComp.composicion.bf.media}% graso` : ''}.`, rec: null });
  }
  if (!insights.some(i => i.categoria === 'rendimiento') && ultimoConRend) {
    const cr = ultimoConRend.composicion;
    const partes = [];
    if (cr.iqf) partes.push(`Índice físico (IQF) ${cr.iqf.valor}/100`);
    if (cr.irr) partes.push(`${cr.irr.label} (${cr.irr.valor}/100)`);
    if (cr.ire) partes.push(cr.ire.cat === 'RESPONDEDOR MEDIO' ? 'respuesta al entreno típica' : cr.ire.cat.toLowerCase());
    const irrBajo = cr.irr && cr.irr.valor < 45;
    insights.push({ tag: 'Estado actual', categoria: 'rendimiento', icon: irrBajo ? '⚠️' : '✅', color: irrBajo ? '#f97316' : '#22c55e',
      txt: `${partes.join(', ')}.`, rec: irrBajo ? 'La recuperación está algo baja — vigila sueño y volumen de entreno antes de seguir subiendo cargas.' : null });
  }

  // Objetivo calórico vs ritmo real de cambio de peso (sustituye a la comparación anterior basada en el
  // IPO puntual). Compara pctSemanaRitmo contra el rango esperado según el objetivo guardado y el nivel
  // del atleta (RITMO_OBJETIVO, ver definición arriba) — Helms 2014 / Iraki 2019 / Roberts 2020.
  if (pctSemanaRitmo !== null && objetivo && RITMO_OBJETIVO[objetivo]) {
    const bucket = bucketNivelAtleta(nivelAtleta);
    const rango = RITMO_OBJETIVO[objetivo][bucket];
    const abs = Math.abs(pctSemanaRitmo);
    const signoOk = objetivo === 'corte' ? pctSemanaRitmo < 0 : objetivo === 'volumen' ? pctSemanaRitmo > 0 : true;
    const etiquetaNivel = bucket === 'avanzado' ? 'avanzado' : 'novato/intermedio';
    const ritmoTxt = `${pctSemanaRitmo > 0 ? '+' : ''}${pctSemanaRitmo.toFixed(2)}%/semana`;

    if (signoOk && abs >= rango.min && abs <= rango.max) {
      insights.push({ tag: 'Estado actual', categoria: 'objetivo', icon: '🎯', color: '#22c55e',
        txt: `El ritmo real (${ritmoTxt}) encaja con el objetivo de ${OBJETIVO_LABEL[objetivo]} para un perfil ${etiquetaNivel} (evidencia: Helms 2014 / Iraki 2019 / Roberts 2020).`, rec: null });
    } else if (signoOk && abs > rango.max) {
      insights.push({ tag: 'Estado actual', categoria: 'objetivo', icon: '⚠️', color: '#ef4444',
        txt: `Ritmo demasiado rápido (${ritmoTxt}) para el objetivo de ${OBJETIVO_LABEL[objetivo]} — el rango recomendado para un perfil ${etiquetaNivel} es ${rango.min}-${rango.max}%/semana.`,
        rec: objetivo === 'corte' ? 'Sube la ingesta 150-300 kcal y asegura proteína alta para minimizar pérdida de masa magra (Helms 2014 / Roberts 2020).' : 'Baja 100-200 kcal — probablemente se esté acumulando más grasa de la que se puede construir de músculo ahora mismo (Iraki 2019).' });
    } else if ((objetivo === 'corte' || objetivo === 'volumen') && (!signoOk || abs < rango.min)) {
      insights.push({ tag: 'Estado actual', categoria: 'objetivo', icon: '➖', color: '#eab308',
        txt: `Ritmo más lento de lo esperado (${ritmoTxt}) para el objetivo de ${OBJETIVO_LABEL[objetivo]} — el rango recomendado para un perfil ${etiquetaNivel} es ${rango.min}-${rango.max}%/semana.`,
        rec: `Si lleva 2-3 semanas así, valora ajustar ${objetivo === 'corte' ? 'bajando' : 'subiendo'} 100-150 kcal, o revisa la adherencia real al plan.` });
    } else {
      insights.push({ tag: 'Estado actual', categoria: 'objetivo', icon: '⚠️', color: '#f97316',
        txt: `El peso se mueve en dirección contraria al objetivo de ${OBJETIVO_LABEL[objetivo]} (${ritmoTxt}).`,
        rec: 'Revisa si realmente se está cumpliendo el plan calórico pactado.' });
    }
  }

  return insights;
}

// Insights propios del check-in semanal (sensaciones/adherencia/sueño/energía/molestias, escala 1-5),
// independientes de si hay o no estancamiento en Entrenos (ese cruce ya existe en renderAnalisisCruzado;
// esto es la lectura de la categoría Check-in por sí sola). Mismo criterio "bajo = ≤2/5" que el resto
// de la app, para no inventar una vara de medir nueva.
export function generarInsightsCheckin(datos) {
  const checkins = datos.filter(d => d.origen === 'checkin' && d.sensaciones != null)
    .slice().sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
  if (checkins.length < 2) return [];

  const bajo = v => v != null && v <= 2;
  const last = checkins[checkins.length - 1];
  const prev = checkins[checkins.length - 2];
  const ultimos3 = checkins.slice(-3);
  const insights = [];

  if (ultimos3.length === 3 && ultimos3.every(ch => bajo(ch.sueno) || bajo(ch.energia))) {
    insights.push({ categoria: 'checkin', tema: 'descanso', icon: '😴', color: '#f97316',
      txt: `Los últimos ${ultimos3.length} check-ins seguidos marcan sueño y/o energía bajos (≤2/5).`,
      rec: 'Señal temprana de fatiga acumulada, aunque el rendimiento en el gym todavía aguante. Vigílalo con una semana algo más ligera antes de que se note en las cargas.' });
  }
  if (bajo(last.adherencia) && bajo(prev.adherencia)) {
    insights.push({ categoria: 'checkin', tema: 'adherencia', icon: '🥗', color: '#eab308',
      txt: `Adherencia a la dieta baja dos check-ins seguidos (${prev.adherencia}/5 → ${last.adherencia}/5).`,
      rec: 'Antes de tocar el plan, habla con el cliente para entender qué está fallando — un plan que no se sigue no se puede evaluar.' });
  }
  if (bajo(last.molestias) && (prev.molestias == null || last.molestias <= prev.molestias)) {
    insights.push({ categoria: 'checkin', tema: 'molestias', icon: '🩺', color: '#ef4444',
      txt: `Molestias físicas marcadas como altas en el último check-in (${last.molestias}/5).`,
      rec: 'Revisa técnica y rango de movimiento en los ejercicios implicados, y valora sustituir o bajar carga unas semanas si persiste.' });
  }
  const mediaSensaciones3 = ultimos3.reduce((s, ch) => s + (ch.sensaciones || 0), 0) / ultimos3.length;
  if (ultimos3.length === 3 && mediaSensaciones3 < 3) {
    insights.push({ categoria: 'checkin', tema: 'sensaciones', icon: '⚠️', color: '#f97316',
      txt: `Sensaciones generales bajas de media en los últimos 3 check-ins (${mediaSensaciones3.toFixed(1)}/5).`,
      rec: 'Riesgo de bajón de motivación/adherencia. Merece una llamada o un cambio de estímulo antes de que se traduzca en abandono del plan.' });
  }
  if (insights.length === 0 && last.sensaciones >= 4 && last.adherencia >= 4) {
    insights.push({ categoria: 'checkin', tema: 'sensaciones', icon: '✅', color: '#22c55e',
      txt: 'Check-ins consistentes y en verde: sensaciones y adherencia altas, sin señales de fatiga ni molestias.',
      rec: 'Todo en orden — mantén el plan actual.' });
  }
  return insights;
}

// ── VEREDICTO ── Antes de esto había una lista de insights sueltos que el entrenador tenía que
// interpretar uno por uno. Esto los rankea por gravedad real y da UN titular con las 2-3 razones que
// más pesan y UNA sola recomendación accionable — el resto del detalle sigue disponible dentro de cada
// sección de abajo para quien quiera profundizar. Severidad por color, no por texto, para no depender
// de regex frágiles sobre el mensaje.
export const VEREDICTO_SEVERIDAD = { '#ef4444': 0, '#f97316': 1, '#a78bfa': 1, '#eab308': 2, '#3b82f6': 3, '#8b5cf6': 4, '#22c55e': 4 };

// Varios insights (peso/composición, WHtR, WHR, IRR, FFMI) se calculan dos veces — una por ventana de
// "Corto plazo" y otra de "Tendencia (~4 sem)" — y si ambas disparan la misma alerta, salían como dos
// líneas casi idénticas en el veredicto. Aquí se fusiona por 'tema', quedándose con la de peor
// severidad y, en empate, con la de tendencia larga (más fiable que un solo dato suelto de corto plazo).
export function dedupeInsightsPorTema(insights) {
  const porTema = new Map();
  const sinTema = [];
  insights.forEach(i => {
    if (!i.tema) { sinTema.push(i); return; }
    const actual = porTema.get(i.tema);
    if (!actual) { porTema.set(i.tema, i); return; }
    const sevActual = VEREDICTO_SEVERIDAD[actual.color] ?? 5;
    const sevNuevo = VEREDICTO_SEVERIDAD[i.color] ?? 5;
    if (sevNuevo < sevActual || (sevNuevo === sevActual && /Tendencia/.test(i.tag || '') && !/Tendencia/.test(actual.tag || ''))) {
      porTema.set(i.tema, i);
    }
  });
  return [...porTema.values(), ...sinTema];
}

// Etiqueta corta por categoría para las líneas del veredicto — mismo icono que ya usan las secciones
// de abajo, para que se reconozca de un vistazo a qué bloque pertenece cada línea.
export const VEREDICTO_CAT_ORDEN = ['perimetros', 'composicion', 'objetivo', 'salud', 'checkin', 'rendimiento'];
export const VEREDICTO_CAT_LBL = { perimetros: '📏 Perímetros', composicion: '🔥 Composición', objetivo: '🎯 Objetivo', salud: '❤️ Salud', checkin: '✅ Check-in', rendimiento: '🏋️ Rendimiento' };

export function calcularVeredicto(datos, objetivo, nivelAtleta) {
  const insights = dedupeInsightsPorTema([...generarInsightsSeguimiento(datos, objetivo, nivelAtleta), ...generarInsightsCheckin(datos)]);
  if (insights.length === 0) return null;

  // UNA línea por categoría (la más grave de esa categoría si hay varias) — así el veredicto es el
  // cuadro completo del cliente, no solo el peor dato de todos ignorando el resto. Antes, en cuanto
  // había algo malo en una categoría, se ocultaba todo lo bueno de las demás; ahora cada bloque
  // aparece siempre que tenga datos, en verde si está bien y en su color real si no.
  const porCategoria = {};
  insights.forEach(i => {
    const actual = porCategoria[i.categoria];
    if (!actual || (VEREDICTO_SEVERIDAD[i.color] ?? 5) < (VEREDICTO_SEVERIDAD[actual.color] ?? 5)) porCategoria[i.categoria] = i;
  });
  const lineas = VEREDICTO_CAT_ORDEN.filter(cat => porCategoria[cat]).map(cat => ({ cat, ...porCategoria[cat] }));
  if (lineas.length === 0) return null;

  const peor = lineas.slice().sort((a, b) => (VEREDICTO_SEVERIDAD[a.color] ?? 5) - (VEREDICTO_SEVERIDAD[b.color] ?? 5))[0];
  const peorSev = VEREDICTO_SEVERIDAD[peor.color] ?? 5;

  let titulo, color, icon;
  if (peorSev === 0) { titulo = 'Revisar antes de la próxima sesión'; color = '#ef4444'; icon = '🔴'; }
  else if (peorSev === 1) { titulo = 'Atención esta semana'; color = '#f97316'; icon = '🟠'; }
  else if (peorSev === 2) { titulo = 'Vigilar'; color = '#eab308'; icon = '🟡'; }
  else { titulo = 'Todo en orden — mantén el plan actual'; color = '#22c55e'; icon = '🟢'; }

  // Acción concreta: en cualquier nivel que no sea verde (rojo/naranja/amarillo) — "vigilar" sin decir
  // qué hacer no vale de nada. Ligada a la categoría/tema del insight más grave, con botón directo a
  // la pantalla donde se resuelve (Nutrición para adherencia/ritmo de peso, Entrenos para
  // descanso/molestias/recuperación).
  let accion = null;
  if (peorSev <= 2 && peor.rec) {
    const vaANutricion = peor.categoria === 'perimetros' || peor.categoria === 'composicion' || peor.categoria === 'objetivo' || peor.tema === 'adherencia';
    const vaAEntrenos = peor.categoria === 'rendimiento' || peor.tema === 'descanso' || peor.tema === 'molestias';
    accion = {
      txt: peor.rec,
      boton: vaANutricion ? '📏 Ir a Nutrición' : (vaAEntrenos ? '💪 Ir a Entrenos' : null),
      ir: vaANutricion ? 'nutricion' : (vaAEntrenos ? 'entrenos' : null)
    };
  }

  return { titulo, color, icon, lineas, accion };
}

// Calcula la composición (bf, comp, whtr, whr, riesgos, iqf/irr/ire/ipo) para UNA fila de
// seguimiento_corporal a partir de sus medidas + datos base del cliente (altura/edad/sexo).
// Igual que "Calcular" de Nutrición, pero aplicable a cualquier registro (manual o check-in plus) con
// peso+abdomen y el resto de medidas (si faltan, devuelve null: ver faltaMedida). Para IQF/IRR/IRE/IPO se usa actividad 'activo' (no se guarda por registro).
export function calcularComposicionDesdeEntry(entry, cliente) {
  const peso = parseFloat(entry.peso), abdomen = parseFloat(entry.abdomen);
  const altura = parseFloat(cliente?.altura), edad = parseFloat(cliente?.edad);
  if (!peso || !abdomen || !altura || !edad) return null; // faltan datos base imprescindibles
  const sexo = cliente?.genero === 'MUJER' ? 'mujer' : 'hombre';
  const d = {
    sexo, edad, altura, abdomen,
    cuello: parseFloat(entry.cuello) || 0, cadera: parseFloat(entry.cadera) || 0,
    brazo: parseFloat(entry.brazo) || 0, antebrazo: parseFloat(entry.antebrazo) || 0,
    muslo: parseFloat(entry.muslo) || 0, pantorrilla: parseFloat(entry.pantorrilla) || 0,
    activo4h: entry.activo4h || 'no'
  };
  // Un check-in SIMPLE solo trae peso + abdomen: sin el resto de medidas las fórmulas de % graso darían un
  // número basura (cuello/brazo/etc. a 0), así que no se calcula composición — la lectura rápida
  // (cintura/altura, tendencia) se hace aparte con peso y abdomen.
  const faltaMedida = !d.cuello || !d.antebrazo ||
    (sexo === 'hombre' ? (edad <= 26 ? !d.brazo : !d.cadera) : (!d.cadera || !d.muslo || (edad > 26 && !d.pantorrilla)));
  if (faltaMedida) return null;
  const bf = calcBF(d);
  if (!Number.isFinite(bf.media)) return null;
  const comp = calcComp(peso, altura, bf.media);
  const w = calcWHtR(abdomen, altura);
  const r2 = d.cadera ? calcWHR(abdomen, d.cadera, sexo) : null;
  const cv = calcRCV(abdomen, sexo);
  const rh = calcRH(bf.media, sexo);
  const ri = calcRI(abdomen, bf.media, sexo);
  const rs = calcRS(comp.ffmi, edad, sexo);
  const anos = parseFloat(cliente?.anos_entreno) || 0;
  const iqf = calcIQF(comp.ffmi, bf.media, sexo, 'activo');
  const irr = calcIRR(edad, bf.media, sexo, 'activo', anos);
  const ire = calcIRE(comp.ffmi, sexo, anos);
  const ipo = calcIPO(bf.media, comp.ffmi, sexo);
  return { bf, comp, w, r2, cv, rh, ri, rs, iqf, irr, ire, ipo };
}

// Fuerza para la lectura rápida: misma detección de estancamiento/bajada que la pestaña Historial.
// `historial` = sesiones con { fecha, ejercicio, series, rutina_id }. null si no hay sesiones.
export function fuerzaDeCliente(historial, rutinas, mesociclos) {
  if (!historial || !historial.length) return null;
  const sesionAnteriorMap = new Map();
  const porEj = {};
  [...historial].sort((x, y) => (x.fecha ? new Date(x.fecha) : new Date(0)) - (y.fecha ? new Date(y.fecha) : new Date(0))).forEach(x => {
    if (!x.ejercicio) return;
    const k = claveEjercicioRutina(x);
    (porEj[k] = porEj[k] || []).push(x);
  });
  Object.values(porEj).forEach(l => { for (let i = 1; i < l.length; i++) sesionAnteriorMap.set(l[i], l[i - 1]); });
  const { rutinaMesocicloMap, rutinaNombreMap } = mesocicloMapsDeCliente(rutinas, mesociclos);
  const cardioIds = new Set(rutinas.filter(r => r.es_cardio).map(r => String(r.id)));
  const { ejerciciosEstancados, ejerciciosEnBajada } = detectarEstancamiento(historial, sesionAnteriorMap, rutinaMesocicloMap, rutinaNombreMap, cardioIds);
  if (ejerciciosEnBajada.length) return { estado: 'baja', txt: `En bajada (${ejerciciosEnBajada.length})` };
  if (ejerciciosEstancados.length) return { estado: 'estancada', txt: `Estancada (${ejerciciosEstancados.length})` };
  return { estado: 'ok', txt: 'Se mantiene o sube' };
}
