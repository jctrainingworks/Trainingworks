// Progreso por ejercicio a partir de las sesiones guardadas en una etapa (cálculo puro).
// Métrica: 1RM estimado (Epley) de la mejor serie de cada sesión; sin peso, reps máximas.
// Compara la media de las 2 primeras sesiones con la de las 2 últimas (con 4+ sesiones). Con 3 es solo
// orientativo (primera vs última) y con menos no se compara. Sin sesiones en descarga.
// Los nombres se agrupan sin distinguir mayúsculas ni tildes. ±2,5 % = se mantuvo.
import { parseSeriesDetalle } from '../historial/calculos.js';
import { etD } from './calculos.js';

export const ETAPA_MEDIDAS = [['peso', 'Peso', 'kg'], ['abdomen', 'Abdomen', 'cm'], ['cuello', 'Cuello', 'cm'], ['brazo', 'Brazo', 'cm'],
  ['antebrazo', 'Antebrazo', 'cm'], ['cadera', 'Cadera', 'cm'], ['muslo', 'Muslo', 'cm'], ['pantorrilla', 'Pantorrilla', 'cm']];

const media = a => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const mediana = a => { if (!a.length) return 0; const b = a.slice().sort((x, y) => x - y), m = Math.floor(b.length / 2); return b.length % 2 ? b[m] : (b[m - 1] + b[m]) / 2; };
const clave = n => String(n || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

export function etapaProgresoEjercicios(s) {
  const porEj = {}, nombres = {};
  (s.sesiones || []).forEach(x => {
    if (x.en_descarga || !x.ejercicio) return;
    const k = clave(x.ejercicio); if (!k) return;
    if (!nombres[k]) nombres[k] = String(x.ejercicio).trim();
    let best = null, maxReps = 0;
    parseSeriesDetalle(x.series || '').forEach(se => {
      if (se.reps > maxReps) maxReps = se.reps;
      if (se.peso > 0 && se.reps > 0) {
        const e1 = se.peso * (1 + se.reps / 30);
        if (!best || e1 > best.e1) best = { peso: se.peso, reps: se.reps, e1 };
      }
    });
    (porEj[k] = porEj[k] || []).push({ f: etD(x.fecha), best, maxReps });
  });
  const pesos = (s.medidas || []).map(r => Number(r.peso)).filter(v => v > 0);
  const pesoIni = pesos.length ? pesos[0] : null, pesoFin = pesos.length ? pesos[pesos.length - 1] : null;
  const filas = Object.keys(porEj).map(k => {
    const nombre = nombres[k];
    const ses = porEj[k].sort((a, b) => a.f.localeCompare(b.f));
    const conPeso = ses.filter(z => z.best);
    const modo = conPeso.length >= 3 ? 'e1rm' : 'reps';
    const base = modo === 'e1rm' ? conPeso : ses.filter(z => z.maxReps > 0);
    const val = z => (modo === 'e1rm' ? z.best.e1 : z.maxReps);
    if (base.length < 3) return { nombre, n: ses.length, modo, estado: 'pocos' };
    const n = base.length >= 4 ? 2 : 1;
    const ini = media(base.slice(0, n).map(val)), fin = media(base.slice(-n).map(val));
    const pct = ini > 0 ? (fin - ini) / ini * 100 : 0;
    const mejor = arr => (modo === 'e1rm' ? arr.reduce((a, z) => ((!a || z.best.e1 > a.e1) ? z.best : a), null) : null);
    const estado = base.length < 4 ? 'orient' : pct > 2.5 ? 'sube' : pct < -2.5 ? 'baja' : 'igual';
    let rel = null;
    if (modo === 'e1rm' && pesoIni && pesoFin && ini > 0) rel = ((fin / pesoFin) / (ini / pesoIni) - 1) * 100;
    return { nombre, n: ses.length, modo, ini, fin, pct, estado, rel, mejorIni: mejor(base.slice(0, n)), mejorFin: mejor(base.slice(-n)) };
  });
  const cuenta = { sube: 0, igual: 0, baja: 0, orient: 0, pocos: 0 };
  filas.forEach(f => { cuenta[f.estado]++; });
  const rels = filas.filter(f => f.rel != null && (f.estado === 'sube' || f.estado === 'igual' || f.estado === 'baja')).map(f => f.rel);
  return { filas, cuenta, relMediana: rels.length ? mediana(rels) : null };
}
