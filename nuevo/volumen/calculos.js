// Volumen · cálculos puros (sin DOM ni red). Clonados de prueba/index.html: mismos criterios,
// mismos umbrales y mismas fórmulas que en las funciones de pintado del panel actual.
import { parseBloqueSerie, volumenBloqueSerie } from '../core/series.js';

export const MUSCLE_COLORS = {
  'Pecho': '#3b82f6', 'Espalda': '#8b5cf6', 'Cuádriceps': '#10b981',
  'Isquiotibiales': '#f59e0b', 'Glúteos': '#ec4899', 'Hombros': '#06b6d4',
  'Bíceps': '#f97316', 'Tríceps': '#ef4444', 'Core': '#84cc16',
  'Gemelos': '#a78bfa', 'Trapecios': '#fb7185', 'Deltoides Posterior': '#38bdf8',
  'Abductores': '#fbbf24', 'Aductores': '#34d399', 'Cardio': '#f43f5e', 'Otro': '#6b7280'
};

export const NUM_SEMANAS_HISTORIAL_TONELAJE = 6; // última semana completa (0) + 5 semanas previas

// Normaliza nombres de ejercicio para comparar sin fallos por tildes/espacios/mayúsculas.
export function normalizaNombreEj(s) {
  return (s || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

export function fechaLocalISO(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Músculo de un ejercicio: primero la Biblioteca del entrenador, después el catálogo local
// (nombres en inglés) y, si no está en ninguno, 'Otro'. `avisar` deja un aviso en consola.
export function crearResolvedorMusculo({ biblioteca = [], catalogo = [] } = {}, avisar = false) {
  return nombre => {
    const n = normalizaNombreEj(nombre);
    const enBiblioteca = biblioteca.find(b => normalizaNombreEj(b.nombre_es) === n);
    if (enBiblioteca) return enBiblioteca.musculo || 'Otro';
    const found = catalogo.find(e => normalizaNombreEj(e.name) === n);
    if (found) return found.muscle;
    if (avisar && nombre) console.warn('[Volumen] Ejercicio sin músculo asignado (no está en tu Biblioteca ni en el catálogo):', nombre);
    return 'Otro';
  };
}

const bloquesDe = s => (s.series || '').split(/\n|,/).map(b => b.trim()).filter(Boolean);

// Totales (series/reps/tonelaje/nº entrenos) y desglose por músculo para un conjunto de sesiones.
export function calcularTotalesSesiones(sesiones, musculoDe) {
  const porMusculo = {};
  const fechas = new Set();
  let series = 0, reps = 0, tonelaje = 0;
  sesiones.forEach(s => {
    if (s.fecha) fechas.add(String(s.fecha).slice(0, 10));
    const musculo = musculoDe(s.ejercicio);
    if (!porMusculo[musculo]) porMusculo[musculo] = { series: 0, reps: 0, tonelaje: 0 };
    bloquesDe(s).forEach(b => {
      const { peso, reps: r } = parseBloqueSerie(b);
      const p = peso || 0, rr = r || 0;
      const vol = volumenBloqueSerie(b);
      series += vol;
      reps += rr;
      tonelaje += p * rr;
      porMusculo[musculo].series += vol;
      porMusculo[musculo].reps += rr;
      porMusculo[musculo].tonelaje += p * rr;
    });
  });
  return { series, reps, tonelaje, nEntrenos: fechas.size, porMusculo };
}

// Comparativa: un total por mesociclo (cerrados + activo), ordenados por fecha de inicio.
export function datosComparativa(cliente, historialCompleto, musculoDe) {
  const mesociclos = (cliente.mesociclos || []).slice().sort((a, b) => new Date(a.fecha_inicio || 0) - new Date(b.fecha_inicio || 0));
  const rutinas = cliente.rutinas || [];
  return mesociclos.map(m => {
    const rutinaIds = new Set(rutinas.filter(r => String(r.mesociclo_id ?? '') === String(m.id)).map(r => String(r.id)));
    const sesiones = historialCompleto.filter(s => s.rutina_id != null && rutinaIds.has(String(s.rutina_id)));
    return { mesociclo: m, totales: calcularTotalesSesiones(sesiones, musculoDe) };
  });
}

// Solo cuentan las sesiones del MESOCICLO ACTIVO (el que no tiene fecha_fin), desde que empezó.
// Sin mesociclos, se usa el criterio anterior (rutinas que siguen asignadas).
export function sesionesDelMesocicloActivo(cliente, historialCompleto) {
  const mesocicloActivo = (cliente.mesociclos || []).find(m => !m.fecha_fin);
  let historial;
  if (mesocicloActivo) {
    const rutinaIds = new Set((cliente.rutinas || []).filter(r => String(r.mesociclo_id ?? '') === String(mesocicloActivo.id)).map(r => String(r.id)));
    const inicio = new Date(mesocicloActivo.fecha_inicio);
    historial = historialCompleto.filter(s =>
      s.fecha && new Date(s.fecha) >= inicio &&
      (s.rutina_id == null || rutinaIds.has(String(s.rutina_id)))
    );
  } else {
    const rutinaIdsActivas = new Set((cliente.rutinas || []).map(r => String(r.id)));
    historial = historialCompleto.filter(s => s.rutina_id == null || rutinaIdsActivas.has(String(s.rutina_id)));
  }
  return { historial, mesocicloActivo };
}

// Semanas de entreno ancladas al INICIO del mesociclo activo (bloques de 7 días desde su fecha_inicio;
// sin mesociclo, semanas lun–dom). semanasAtras(f): 0 = última semana cerrada · 1 = la anterior ·
// … · <0 = semana en curso (aún abierta). Si aún no hay semana cerrada se usa la en curso.
export function semanasDeEntreno(mesocicloActivo, hoy = new Date()) {
  const aMedianoche = f => { const [y, m, d] = String(f).slice(0, 10).split('-').map(Number); return new Date(y, m - 1, d); };
  const ancla = (mesocicloActivo && mesocicloActivo.fecha_inicio)
    ? aMedianoche(mesocicloActivo.fecha_inicio)
    : (() => { const d = aMedianoche(fechaLocalISO(hoy)); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d; })();
  const idxSemanaDe = f => Math.floor(Math.round((aMedianoche(f) - ancla) / 86400000) / 7);
  const idxSemanaHoy = idxSemanaDe(fechaLocalISO(hoy));
  const idxUltimaSemanaCerrada = idxSemanaHoy > 0 ? idxSemanaHoy - 1 : 0;
  return { semanasAtras: f => idxUltimaSemanaCerrada - idxSemanaDe(f) };
}

// Series / reps / tonelaje por músculo (opcionalmente solo la última semana completa).
export function volumenPorMusculo(historial, semanasAtras, semanasRango, musculoDe) {
  const porMusculo = {};
  historial.forEach(s => {
    if (!s.fecha) return;
    if (semanasRango) { const k = semanasAtras(s.fecha); if (k < 0 || k >= semanasRango) return; }
    const musculo = musculoDe(s.ejercicio);
    if (!porMusculo[musculo]) porMusculo[musculo] = { series: 0, reps: 0, tonelaje: 0 };
    bloquesDe(s).forEach(b => {
      porMusculo[musculo].series += volumenBloqueSerie(b);
      const { peso, reps } = parseBloqueSerie(b);
      porMusculo[musculo].reps += (reps || 0);
      porMusculo[musculo].tonelaje += (peso || 0) * (reps || 0);
    });
  });
  return porMusculo;
}

// Volumen TOTAL por sesión (todos los ejercicios sumados, agrupado por fecha).
export function volumenPorSesion(historial) {
  const porSesion = {};
  historial.forEach(s => {
    if (!s.fecha) return;
    if (!porSesion[s.fecha]) porSesion[s.fecha] = { series: 0, reps: 0, tonelaje: 0, enDescarga: false, rutina_id: null };
    if (s.en_descarga) porSesion[s.fecha].enDescarga = true;
    if (s.rutina_id != null && porSesion[s.fecha].rutina_id == null) porSesion[s.fecha].rutina_id = s.rutina_id;
    bloquesDe(s).forEach(b => {
      porSesion[s.fecha].series += volumenBloqueSerie(b);
      const { peso, reps } = parseBloqueSerie(b);
      porSesion[s.fecha].reps += (reps || 0);
      porSesion[s.fecha].tonelaje += (peso || 0) * (reps || 0);
    });
  });
  return porSesion;
}

// Nº de sesiones (fechas distintas) en las que se ha tocado cada músculo en la última semana completa.
export function frecuenciaSemanalPorMusculo(historial, semanasAtras, musculoDe) {
  const porMusculo = {}; // musculo -> Set de fechas
  historial.forEach(s => {
    if (!s.fecha) return;
    if (semanasAtras(s.fecha) !== 0) return;
    const musculo = musculoDe(s.ejercicio);
    if (!porMusculo[musculo]) porMusculo[musculo] = new Set();
    porMusculo[musculo].add(s.fecha);
  });
  return porMusculo;
}

// Tonelaje (peso × reps × series-equivalentes) por músculo y semana: musculo -> { idxSemana: {tonelaje, descarga, tieneSesion} }
export function bucketsTonelajePorMusculoSemana(historial, semanasAtras, musculoDe) {
  const buckets = {};
  historial.forEach(s => {
    if (!s.fecha) return;
    const idxSemana = semanasAtras(s.fecha);
    if (idxSemana < 0 || idxSemana >= NUM_SEMANAS_HISTORIAL_TONELAJE) return;
    const musculo = musculoDe(s.ejercicio);
    if (!buckets[musculo]) buckets[musculo] = {};
    if (!buckets[musculo][idxSemana]) buckets[musculo][idxSemana] = { tonelaje: 0, descarga: false, tieneSesion: false };
    const bucket = buckets[musculo][idxSemana];
    bucket.tieneSesion = true;
    if (s.en_descarga) bucket.descarga = true;
    bloquesDe(s).forEach(b => {
      const { peso, reps } = parseBloqueSerie(b);
      bucket.tonelaje += (peso || 0) * (reps || 0) * volumenBloqueSerie(b);
    });
  });
  return buckets;
}

// Tonelaje de una semana de un músculo, o null si esa semana no cuenta (sin sesión de ese músculo
// o marcada como descarga) — así no distorsiona ni la media ni los avisos.
function tonelajeSemanaValido(buckets, idx) {
  const b = buckets[idx];
  return (b && b.tieneSesion && !b.descarga) ? b.tonelaje : null;
}

// 'bajada' · 'estancado' · 'progresando' · null (sin histórico suficiente).
//  · "En descenso": esta semana Y la anterior por debajo del 85% de la media móvil de las 4 previas.
//  · "Estancado": en las últimas semanas (mínimo 3, hasta 4) el tonelaje no se mueve más de ±10%.
export function estadoTonelajeMuscular(buckets) {
  const s0 = tonelajeSemanaValido(buckets, 0);
  const s1 = tonelajeSemanaValido(buckets, 1);
  const previas = [2, 3, 4, 5].map(i => tonelajeSemanaValido(buckets, i)).filter(v => v != null);
  if (previas.length >= 2) {
    const movAvg = previas.reduce((a, b) => a + b, 0) / previas.length;
    if (movAvg > 0 && s0 != null && s1 != null && s0 < movAvg * 0.85 && s1 < movAvg * 0.85) return 'bajada';
  }
  const ultimas = [0, 1, 2, 3].map(i => tonelajeSemanaValido(buckets, i)).filter(v => v != null);
  if (ultimas.length >= 3) {
    const max = Math.max(...ultimas), min = Math.min(...ultimas);
    const media = ultimas.reduce((a, b) => a + b, 0) / ultimas.length;
    if (media > 0 && (max - min) / media <= 0.10) return 'estancado';
  }
  if (s0 != null) return 'progresando';
  return null;
}
