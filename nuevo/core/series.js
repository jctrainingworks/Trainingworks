// Parseo de las series registradas por el cliente ("80kg x 10", "10x80kg", "40seg", "6.5km/h @2% (20min)")
// y volumen equivalente de un bloque con técnica de alta intensidad (⚡RP+2, ⚡MP+1, ⚡DS+3).
// Copiado tal cual del panel actual (prueba/index.html), solo con `export`.
// Lo usa Volumen; Historial tiene su propia copia idéntica en historial/calculos.js.

// ÚNICA fuente de verdad para este parseo en el panel actual.
export function parseBloqueSerie(b) {
  const linea = (b || '').trim();
  if (!linea) return { peso: null, reps: null, seg: null, vel: null, inc: null, dur: null };
  // Formato de sesión de CARDIO registrada desde TrackLift: "6.5km/h @2% (20min)". Se comprueba
  // antes que el resto de formatos porque si no, "6.5km/h" podría confundirse con un bloque de
  // fuerza mal formado. inc/dur son opcionales sueltos (el cliente pudo no rellenar inclinación).
  const mVel = linea.match(/(\d+(?:\.\d+)?)\s*km\/?h/i);
  if (mVel) {
    const vel = parseFloat(mVel[1]);
    const mInc = linea.match(/@\s*(\d+(?:\.\d+)?)\s*%/);
    const mDur = linea.match(/\(\s*(\d+(?:\.\d+)?)\s*min\s*\)/i);
    return {
      peso: null, reps: null, seg: null,
      vel, inc: mInc ? parseFloat(mInc[1]) : null, dur: mDur ? parseFloat(mDur[1]) : null
    };
  }
  const mRepsKg = linea.match(/(\d+(?:\.\d+)?)\s*[xX]\s*(\d+(?:\.\d+)?)\s*kg/i);
  const mKgReps = linea.match(/(\d+(?:\.\d+)?)\s*kg\s*[xX]\s*(\d+(?:\.\d+)?)/i);
  const mSeg    = linea.match(/(\d+(?:\.\d+)?)\s*seg/i);
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
      const matchKg  = linea.match(/(\d+(?:\.\d+)?)\s*kg/i);
      const matchRep = linea.match(/(\d+)\s*rep/i);
      if (matchKg) peso = parseFloat(matchKg[1]);
      if (matchRep) reps = parseInt(matchRep[1]);
    }
  }
  return { peso, reps, seg, vel: null, inc: null, dur: null };
}

// 1 serie base + 0.5 por cada rep/drop extra de rest-pause/micropausa/drop-set.
export function volumenBloqueSerie(b) {
  const m = (b || '').match(/⚡(RP|MP|DS)\+(\d+)/);
  if (!m) return 1;
  return 1 + (parseInt(m[2]) * 0.5);
}
