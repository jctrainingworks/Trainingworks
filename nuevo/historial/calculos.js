// Historial (pestaña Entrenos) · funciones puras: parseo de series, comparación de progreso,
// mapas de mesociclo y detección de estancamiento/bajada. Copiadas tal cual del panel actual
// (prueba/index.html, versión con la ventana de estancamiento de cardio a 5 sesiones).

// Extrae peso/reps (fuerza), seg (isométrico) o vel/inc/dur (cardio en cinta) de una línea de serie.
export function parseBloqueSerie(b) {
  const linea = (b || '').trim();
  if (!linea) return { peso: null, reps: null, seg: null, vel: null, inc: null, dur: null };
  const mVel = linea.match(/(\d+(?:\.\d+)?)\s*km\/?h/i);
  if (mVel) {
    const vel = parseFloat(mVel[1]);
    const mInc = linea.match(/@\s*(\d+(?:\.\d+)?)\s*%/);
    const mDur = linea.match(/\(\s*(\d+(?:\.\d+)?)\s*min\s*\)/i);
    return { peso: null, reps: null, seg: null, vel, inc: mInc ? parseFloat(mInc[1]) : null, dur: mDur ? parseFloat(mDur[1]) : null };
  }
  const mRepsKg = linea.match(/(\d+(?:\.\d+)?)\s*[xX]\s*(\d+(?:\.\d+)?)\s*kg/i);
  const mKgReps = linea.match(/(\d+(?:\.\d+)?)\s*kg\s*[xX]\s*(\d+(?:\.\d+)?)/i);
  const mSeg = linea.match(/(\d+(?:\.\d+)?)\s*seg/i);
  let peso = null, reps = null, seg = null;
  if (mRepsKg) { reps = parseFloat(mRepsKg[1]); peso = parseFloat(mRepsKg[2]); }
  else if (mKgReps) { peso = parseFloat(mKgReps[1]); reps = parseFloat(mKgReps[2]); }
  else if (mSeg) {
    seg = parseFloat(mSeg[1]);
    const mExtra = linea.match(/\+\s*(\d+(?:\.\d+)?)\s*kg/i);
    if (mExtra) peso = parseFloat(mExtra[1]);
  } else {
    const mLibre = linea.match(/(\d+(?:\.\d+)?)\s*[xX]\s*(\d+(?:\.\d+)?)/);
    if (mLibre) { reps = parseFloat(mLibre[1]); peso = parseFloat(mLibre[2]); }
    else {
      const matchKg = linea.match(/(\d+(?:\.\d+)?)\s*kg/i);
      const matchRep = linea.match(/(\d+)\s*rep/i);
      if (matchKg) peso = parseFloat(matchKg[1]);
      if (matchRep) reps = parseInt(matchRep[1]);
    }
  }
  return { peso, reps, seg, vel: null, inc: null, dur: null };
}

export function parseSeriesDetalle(texto) {
  if (!texto) return [];
  return texto.split('\n').map(l => l.trim()).filter(Boolean).map((linea, idx) => {
    const { peso, reps, seg, vel, inc, dur } = parseBloqueSerie(linea);
    return { serie: idx + 1, peso, reps, seg, vel, inc, dur, texto: linea };
  });
}

// Compara la misma serie (por posición) entre la sesión actual y la anterior del MISMO ejercicio.
export function compararSerie(actual, anterior) {
  if (!anterior) return { tipo: 'nuevo' };
  if (actual.seg != null || anterior.seg != null) {
    if (actual.seg == null || anterior.seg == null) return { tipo: 'na' };
    if (actual.seg > anterior.seg || (actual.peso || 0) > (anterior.peso || 0)) return { tipo: 'sube' };
    if (actual.seg < anterior.seg || (actual.peso || 0) < (anterior.peso || 0)) return { tipo: 'baja' };
    return { tipo: 'igual' };
  }
  if (actual.peso == null || actual.reps == null || anterior.peso == null || anterior.reps == null) return { tipo: 'na' };
  if (actual.peso > anterior.peso) return { tipo: 'sube' };
  if (actual.peso === anterior.peso && actual.reps > anterior.reps) return { tipo: 'sube' };
  if (actual.peso === anterior.peso && actual.reps === anterior.reps) return { tipo: 'igual' };
  return { tipo: 'baja' };
}

// Clave de comparación: MISMO ejercicio en la MISMA rutina (para no comparar la sesión A con la B).
export const claveEjercicioRutina = s => `${s.ejercicio}||${s.rutina_id ?? ''}`;

// rutinaMesocicloMap: rutina_id -> mesociclo_id. mesocicloNombreMap: mesociclo_id -> nombre.
export function mesocicloMapsDeCliente(rutinas, mesociclos) {
  const rutinaMesocicloMap = new Map((rutinas || []).filter(r => r.mesociclo_id != null).map(r => [String(r.id), String(r.mesociclo_id)]));
  const mesocicloNombreMap = new Map((mesociclos || []).map(m => [String(m.id), m.nombre || 'Bloque']));
  const rutinaNombreMap = new Map((rutinas || []).map(r => [String(r.id), r.nombre]));
  return { rutinaMesocicloMap, mesocicloNombreMap, rutinaNombreMap };
}

// Mesociclo por defecto del filtro: el activo (sin fecha_fin), o 'todos' si no hay ninguno.
export function mesocicloPorDefecto(mesociclos) {
  const activo = (mesociclos || []).find(m => !m.fecha_fin);
  return activo ? String(activo.id) : 'todos';
}

export function rutinaIdsDeMesociclo(rutinas, mesocicloId) {
  if (mesocicloId == null || mesocicloId === 'todos') return null;
  return new Set((rutinas || []).filter(r => String(r.mesociclo_id ?? '') === String(mesocicloId)).map(r => String(r.id)));
}

// Serie temporal por ejercicio: peso/reps de la "serie top" del día y nº de series (volumen).
export function construirDatosGraficasEntreno(historialFiltrado, rutinaMesocicloMap = null, mesocicloNombreMap = null, rutinaNombreMap = null) {
  const exerciseMap = {};
  const nomRutinaDe = s => (rutinaNombreMap ? (rutinaNombreMap.get(String(s.rutina_id ?? '')) || null) : null);
  const rutinasPorEj = {};
  historialFiltrado.forEach(s => {
    const nr = nomRutinaDe(s);
    if (!s.ejercicio || !nr) return;
    (rutinasPorEj[s.ejercicio] = rutinasPorEj[s.ejercicio] || new Set()).add(nr);
  });
  historialFiltrado.forEach(s => {
    if (!s.ejercicio || !s.series) return;
    const seriesDetalle = parseSeriesDetalle(s.series);
    if (seriesDetalle.length === 0) return;
    let serieTop = seriesDetalle[0];
    seriesDetalle.forEach(se => {
      const pesoActual = se.peso || 0, pesoTop = serieTop.peso || 0;
      if (pesoActual > pesoTop) serieTop = se;
      else if (pesoActual === pesoTop && (se.seg || 0) > (serieTop.seg || 0)) serieTop = se;
    });
    const mesocicloId = rutinaMesocicloMap ? (rutinaMesocicloMap.get(String(s.rutina_id ?? '')) ?? null) : null;
    const nrGraf = nomRutinaDe(s);
    const claveGraf = (nrGraf && rutinasPorEj[s.ejercicio] && rutinasPorEj[s.ejercicio].size > 1) ? `${s.ejercicio} · ${nrGraf}` : s.ejercicio;
    if (!exerciseMap[claveGraf]) exerciseMap[claveGraf] = [];
    exerciseMap[claveGraf].push({
      fecha: s.fecha || '', peso: serieTop.peso || 0, reps: serieTop.reps || 0, numSeries: seriesDetalle.length,
      en_descarga: !!s.en_descarga, mesociclo_id: mesocicloId,
      mesociclo_nombre: mesocicloId && mesocicloNombreMap ? (mesocicloNombreMap.get(mesocicloId) ?? null) : null
    });
  });
  return exerciseMap;
}

// Estancado: últimas N sesiones sin ningún progreso (N=5 en cardio —progresa más despacio semana a
// semana—, N=3 en fuerza). En bajada: 2 sesiones seguidas bajando.
export function detectarEstancamiento(historialCompleto, sesionAnteriorMap, rutinaMesocicloMap, rutinaNombreMap = null, rutinaCardioIds = new Set()) {
  const ejerciciosEstancados = [];
  const ejerciciosEnBajada = [];
  const porEjercicio = {};
  [...historialCompleto]
    .filter(s => s.ejercicio && s.series)
    .sort((a, b) => (a.fecha ? new Date(a.fecha) : new Date(0)) - (b.fecha ? new Date(b.fecha) : new Date(0)))
    .forEach(s => {
      const clave = claveEjercicioRutina(s);
      if (!porEjercicio[clave]) porEjercicio[clave] = [];
      porEjercicio[clave].push(s);
    });

  const balanceSesion = s => {
    const anterior = sesionAnteriorMap.get(s);
    if (!anterior) return null;
    if (s.en_descarga || anterior.en_descarga) return null;
    if (rutinaMesocicloMap) {
      const mesoAnterior = rutinaMesocicloMap.get(String(anterior.rutina_id ?? ''));
      const mesoActual = rutinaMesocicloMap.get(String(s.rutina_id ?? ''));
      if (mesoAnterior != null && mesoActual != null && String(mesoAnterior) !== String(mesoActual)) return null;
    } else if (anterior.rutina_id != null && s.rutina_id != null && String(anterior.rutina_id) !== String(s.rutina_id)) {
      return null;
    }
    const seriesAct = parseSeriesDetalle(s.series);
    const seriesAnt = parseSeriesDetalle(anterior.series);
    const masSeries = seriesAct.length > seriesAnt.length;
    let suben = 0, bajan = 0;
    seriesAct.forEach(serie => {
      const tipo = compararSerie(serie, seriesAnt[serie.serie - 1]).tipo;
      if (tipo === 'sube') suben++;
      else if (tipo === 'baja') bajan++;
    });
    return { progreso: masSeries || suben > 0, negativo: !masSeries && bajan > suben };
  };

  const fechaUlt = l => { const f = l[l.length - 1].fecha; return f ? new Date(f).getTime() : 0; };
  const mesoUlt = l => (rutinaMesocicloMap ? (rutinaMesocicloMap.get(String(l[l.length - 1].rutina_id ?? '')) ?? null) : null);
  const gruposPorNombre = {};
  Object.values(porEjercicio).forEach(l => { (gruposPorNombre[l[0].ejercicio] = gruposPorNombre[l[0].ejercicio] || []).push(l); });
  const listasVigentes = [];
  Object.entries(gruposPorNombre).forEach(([nombreEj, grupos]) => {
    const reciente = grupos.reduce((a, b) => (fechaUlt(b) > fechaUlt(a) ? b : a));
    const mesoRef = mesoUlt(reciente);
    const vigentes = grupos.filter(l => l === reciente
      || (mesoRef != null ? mesoUlt(l) === mesoRef : (fechaUlt(reciente) - fechaUlt(l)) <= 21 * 86400000));
    vigentes.forEach(l => {
      const nomRutina = rutinaNombreMap ? rutinaNombreMap.get(String(l[l.length - 1].rutina_id ?? '')) : null;
      const etiqueta = vigentes.length > 1 && nomRutina ? `${nombreEj} (${nomRutina})` : nombreEj;
      listasVigentes.push([etiqueta, l]);
    });
  });

  listasVigentes.forEach(([nombre, lista]) => {
    const esCardio = rutinaCardioIds.has(String(lista[lista.length - 1]?.rutina_id ?? ''));
    const ventana = esCardio ? 5 : 3;
    if (lista.length >= ventana + 1) {
      const ultimasN = lista.slice(-ventana).map(balanceSesion).filter(Boolean);
      if (ultimasN.length === ventana && !ultimasN.some(b => b.progreso)) ejerciciosEstancados.push(nombre);
    }
    if (lista.length >= 3) {
      const ultimas2 = lista.slice(-2).map(balanceSesion).filter(Boolean);
      if (ultimas2.length === 2 && ultimas2.every(b => b.negativo)) ejerciciosEnBajada.push(nombre);
    }
  });

  return { ejerciciosEstancados: ejerciciosEstancados.filter(n => !ejerciciosEnBajada.includes(n)), ejerciciosEnBajada };
}
