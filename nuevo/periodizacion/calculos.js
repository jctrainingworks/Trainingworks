// Periodización: cálculos puros (sin DOM ni Supabase). Réplica de prueba/index.html:
// generador de macrociclo CSD, avisos de secuencia, rangos propios (JCTW), eventos y sugerencias.
import { BLOQUE_TIPOS, BLOQUE_DURACION_SEMANAS, CSD_DURACION_SEMANAS, semanasTranscurridasMesociclo } from '../core/atr.js';
import { detectarEstancamiento, claveEjercicioRutina, mesocicloMapsDeCliente } from '../historial/calculos.js';

export const fechaLocalISO = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const dia = v => String(v || '').slice(0, 10);
const fp = v => new Date(dia(v) + 'T00:00:00');
const DIA_MS = 86400000;

// ── Modelo ──
export const MODELO_PROPIO_NOMBRE = 'JCTW';
export const modeloEsCSD = m => m === 'CSD' || m === 'PROPIO';
export const nombreModelo = m => (m === 'PROPIO' ? MODELO_PROPIO_NOMBRE : (m || 'ATR'));

// ── Rangos de series (libro de Roberto, informativos) y grupos que clasifica ──
export const CSD_RANGOS_INFORMATIVOS = {
  carga:         { grande: '10-14', pequeno: '8-12' },
  sobrecarga:    { grande: '14-20', pequeno: '12-16' },
  descarga:      { grande: '4-8',   pequeno: '4-6' },
  mantenimiento: { grande: '6-8',   pequeno: '4-6' }
};
export const TAMANO_GRUPO_MUSCULAR = { pecho: 'grande', espalda: 'grande', cuadriceps: 'grande', hombros: 'pequeno', biceps: 'pequeno', triceps: 'pequeno' };

// Músculos para los que se pueden definir rangos propios (clave → nombre), como TABLA_VOLUMEN_MUSCULAR.
export const MUSCULOS_PROPIOS = [
  ['cuadriceps', 'Cuádriceps'], ['isquiotibiales', 'Isquiotibiales'], ['gluteos', 'Glúteos'], ['pecho', 'Pecho'],
  ['espalda', 'Espalda'], ['hombros', 'Hombros (deltoides)'], ['biceps', 'Bíceps'], ['triceps', 'Tríceps'],
  ['trapecios', 'Trapecio'], ['gemelos', 'Gemelos y sóleo'], ['core', 'Core']
];
export const MUSCULOS_SOBRECARGA_CSD = [['pecho', 'Pecho'], ['espalda', 'Espalda'], ['cuadriceps', 'Cuádriceps'], ['hombros', 'Hombros'], ['biceps', 'Bíceps'], ['triceps', 'Tríceps']];

// Rango propio de series/semana de un músculo en una fase; null si no usa el modelo propio o no hay rango.
// En Sobrecarga, los músculos no marcados (si hay alguno marcado) se miden con su rango de Carga, como en CSD.
export function rangoPropioSeries(c, tipo, k, selSob) {
  if (!c || c.modelo_periodizacion !== 'PROPIO' || !c.rangos_propios || !c.rangos_propios[k]) return null;
  let t = tipo;
  if (tipo === 'sobrecarga' && selSob && selSob.size && !selSob.has(k)) t = 'carga';
  const v = c.rangos_propios[k][t];
  return (Array.isArray(v) && v.length === 2 && isFinite(v[0]) && isFinite(v[1])) ? [Number(v[0]), Number(v[1])] : null;
}

// valores: { 'pecho_carga_a': '10', 'pecho_carga_b': '14', ... } → { rangos, malos }
export function validarRangosPropios(valores, fases) {
  const rangos = {}, malos = [];
  MUSCULOS_PROPIOS.forEach(([k, n]) => fases.forEach(fase => {
    const a = String(valores[`${k}_${fase}_a`] ?? '').trim(), b = String(valores[`${k}_${fase}_b`] ?? '').trim();
    if (a === '' && b === '') return;
    const mn = Number(a), mx = Number(b);
    if (a === '' || b === '' || !isFinite(mn) || !isFinite(mx) || mn < 0 || mn > mx) { malos.push({ k, fase, texto: `${n} · ${fase}` }); return; }
    (rangos[k] = rangos[k] || {})[fase] = [mn, mx];
  }));
  return { rangos, malos };
}

// ── Mesociclos ──
export const esMacroAnual = m => String((m && m.nombre) || '').startsWith('Macrociclo anual');

// Vigente: el abierto, o el que cubre hoy, o el próximo en empezar.
export function mesocicloVigente(mesociclos) {
  const lista = mesociclos || [];
  const abierto = lista.find(m => !m.fecha_fin);
  if (abierto) return abierto;
  const hoy = fechaLocalISO();
  const cubre = lista.find(m => dia(m.fecha_inicio) && dia(m.fecha_inicio) <= hoy && dia(m.fecha_fin) >= hoy);
  if (cubre) return cubre;
  return lista.filter(m => dia(m.fecha_inicio) > hoy).sort((a, b) => dia(a.fecha_inicio).localeCompare(dia(b.fecha_inicio)))[0] || null;
}

// ── Macrociclo anual CSD ──
export const MACRO_SEMANAS_DEF = { carga: 7, sobrecarga: 4, descarga: 2, mantenimiento: 7 };
export const MACRO_MANT_DIC_RANGO = { min: 3, max: 4 };
export const MACRO_MANT_DIC_SEMANAS = 4;

export function mesPermiteMantenimiento(fechaInicioISO) {
  if (!fechaInicioISO) return true;
  const m = fp(fechaInicioISO).getMonth();
  return m === 6 || m === 7 || m === 11;
}
export function rangoSemanasBloqueMacro(tipo, fechaInicioISO) {
  if (tipo === 'mantenimiento' && fechaInicioISO && fp(fechaInicioISO).getMonth() === 11) return MACRO_MANT_DIC_RANGO;
  return CSD_DURACION_SEMANAS[tipo];
}

// Encadena las fechas desde `inicio`: cada bloque empieza el día después de que acabe el anterior.
export function encadenarMacrociclo(bloques, inicio) {
  let cursor = fp(inicio || fechaLocalISO());
  bloques.forEach(b => {
    const fin = new Date(cursor); fin.setDate(fin.getDate() + b.semanas * 7 - 1);
    b.fecha_inicio = fechaLocalISO(cursor);
    b.fecha_fin = fechaLocalISO(fin);
    cursor = new Date(fin); cursor.setDate(cursor.getDate() + 1);
  });
  return bloques;
}

// Carga→Sobrecarga→Descarga repetido 1 año. Mantenimiento solo en jul-ago/dic; tras Sobrecarga, 1 sem de
// Descarga antes; nunca dos Mantenimientos seguidos; tras él se reinicia en Carga; nunca acaba en Sobrecarga.
export function generarMacrocicloPropuestaCSD(fechaInicioStr, defs) {
  defs = defs || MACRO_SEMANAS_DEF;
  const CICLO = ['carga', 'sobrecarga', 'descarga'];
  const HORIZONTE = 52, DESCARGA_ANTES_MANT = 1;
  const cursor = fp(fechaInicioStr);
  let acumuladas = 0, i = 0, prev = null;
  const bloques = [];
  const push = (tipo, semanas) => {
    bloques.push({ tipo, semanas, fecha_inicio: '', fecha_fin: '' });
    cursor.setDate(cursor.getDate() + semanas * 7);
    acumuladas += semanas; prev = tipo;
  };
  const mesMant = d => { const m = d.getMonth(); return m === 6 || m === 7 || m === 11; };
  while (acumuladas < HORIZONTE) {
    const mes = cursor.getMonth();
    if (mesMant(cursor) && prev !== 'mantenimiento') {
      if (prev === 'sobrecarga') {
        const tras = new Date(cursor); tras.setDate(tras.getDate() + DESCARGA_ANTES_MANT * 7);
        if (mesMant(tras)) push('descarga', DESCARGA_ANTES_MANT);
        else { push('descarga', DESCARGA_ANTES_MANT); i = 0; continue; }
      }
      push('mantenimiento', mes === 11 ? MACRO_MANT_DIC_SEMANAS : defs.mantenimiento);
      i = 0;
      continue;
    }
    if (prev === 'mantenimiento') i = 0;
    const tipo = CICLO[i % CICLO.length]; i++;
    push(tipo, defs[tipo]);
  }
  if (prev === 'sobrecarga') push('descarga', defs.descarga);
  return encadenarMacrociclo(bloques, fechaInicioStr);
}

export function avisosSecuenciaMacrociclo(bloques) {
  const av = [];
  const n = k => `bloque ${k + 1}`;
  bloques.forEach((b, k) => {
    const sig = bloques[k + 1], ant = bloques[k - 1];
    if (b.tipo === 'sobrecarga') {
      if (!sig) av.push(`La propuesta acaba en Sobrecarga (${n(k)}): falta la Descarga.`);
      else if (sig.tipo === 'mantenimiento') av.push(`Sobrecarga (${n(k)}) seguida de Mantenimiento sin Descarga: mete 1-2 sem de Descarga entre los dos.`);
      else if (sig.tipo && sig.tipo !== 'descarga') av.push(`Sobrecarga (${n(k)}) sin Descarga después.`);
    }
    if (b.tipo === 'descarga' && ant && ant.tipo === 'mantenimiento') av.push(`Descarga (${n(k)}) justo después de Mantenimiento: el volumen ya es bajo.`);
    if (b.tipo === 'mantenimiento' && ant && ant.tipo === 'mantenimiento') av.push(`Dos Mantenimientos seguidos (${n(k - 1)} y ${n(k)}): en total ${ant.semanas + b.semanas} sem.`);
    if (b.tipo === 'sobrecarga' && ant && ant.tipo !== 'carga') av.push(`Sobrecarga (${n(k)}) sin Carga antes: la sobrecarga se aplica sobre el volumen de carga.`);
  });
  const total = bloques.reduce((t, b) => t + b.semanas, 0);
  if (bloques.length && total < 52) av.push(`La propuesta cubre ${total} sem, menos del año completo (52).`);
  return av;
}

// Agrupa por ciclos (Carga+Sobrecarga+Descarga); cada Mantenimiento forma su grupo.
export function agruparCiclosMacrociclo(bloques) {
  const grupos = [];
  let g = null, nCiclo = 0;
  const mes = iso => fp(iso).toLocaleDateString('es-ES', { month: 'short' }).replace(/\./g, '');
  bloques.forEach((b, idx) => {
    const esMant = b.tipo === 'mantenimiento';
    const prevMant = g && g.mant;
    const nuevo = !g || (esMant && !prevMant) || (!esMant && prevMant) || (!esMant && b.tipo === 'carga' && g.bloques.some(x => x.b.tipo === 'descarga' || x.b.tipo === 'sobrecarga'));
    if (nuevo) { g = { bloques: [], semanas: 0, mant: esMant }; grupos.push(g); if (!esMant) nCiclo++; g.n = nCiclo; }
    g.bloques.push({ b, idx });
    g.semanas += b.semanas;
  });
  grupos.forEach(x => {
    const ini = x.bloques[0].b.fecha_inicio, fin = x.bloques[x.bloques.length - 1].b.fecha_fin;
    const rango = ini && fin ? (mes(ini) === mes(fin) ? mes(ini) : `${mes(ini)}-${mes(fin)}`) : '';
    x.titulo = (x.mant ? 'Mantenimiento' : `Ciclo ${x.n}`) + (rango ? ` · ${rango}` : '');
  });
  return grupos;
}

export function validarBloquesMacrociclo(bloques) {
  const sinTipo = bloques.findIndex(b => !b.tipo);
  if (sinTipo !== -1) return `Falta elegir el tipo del bloque ${sinTipo + 1}.`;
  const fechasMal = bloques.findIndex(b => !b.fecha_inicio || !b.fecha_fin || b.fecha_fin < b.fecha_inicio);
  if (fechasMal !== -1) return `Revisa las fechas del bloque ${fechasMal + 1} (el fin no puede ser anterior al inicio).`;
  const mantMal = bloques.findIndex(b => b.tipo === 'mantenimiento' && !mesPermiteMantenimiento(b.fecha_inicio));
  if (mantMal !== -1) return `El bloque ${mantMal + 1} es Mantenimiento pero no empieza en julio, agosto o diciembre.`;
  return null;
}

// Bloques para editar un macrociclo ya creado: desde el que cubre hoy (o el próximo) en adelante.
// null = no hay macrociclo; { terminado: true } = ya acabó; si no { existentes, numBase, bloques, inicio }.
export function bloquesParaEditarMacro(mesociclos) {
  const macro = (mesociclos || []).filter(esMacroAnual).sort((a, b) => dia(a.fecha_inicio).localeCompare(dia(b.fecha_inicio)));
  if (!macro.length) return null;
  const hoy = fechaLocalISO();
  let desde = macro.findIndex(m => dia(m.fecha_inicio) <= hoy && dia(m.fecha_fin) >= hoy);
  if (desde < 0) desde = macro.findIndex(m => dia(m.fecha_inicio) > hoy);
  if (desde < 0) return { terminado: true };
  const ex = macro.slice(desde);
  const dias = (a, b) => Math.round((fp(b) - fp(a)) / DIA_MS) + 1;
  const bloques = ex.map(m => ({ tipo: m.tipo_atr || '', semanas: Math.max(1, Math.round(dias(dia(m.fecha_inicio), dia(m.fecha_fin)) / 7)), fecha_inicio: '', fecha_fin: '' }));
  const inicio = dia(ex[0].fecha_inicio);
  encadenarMacrociclo(bloques, inicio);
  return { existentes: ex, numBase: desde, bloques, inicio };
}

// ── Eventos de vida real ──
export const EVENTOS_TIPOS = {
  viaje:      { label: 'Viaje',                    color: '#38bdf8', pesa: true },
  vacaciones: { label: 'Vacaciones',               color: '#34d399', pesa: true },
  puente:     { label: 'Puente / festivo',         color: '#fbbf24', pesa: true },
  estres:     { label: 'Examen / trabajo intenso', color: '#f87171', pesa: false },
  otro:       { label: 'Otro',                     color: '#a78bfa', pesa: false }
};

// Valida y crea un evento; { error } o { evento }.
export function crearEvento({ tipo, titulo, desde, hasta }) {
  if (!desde) return { error: 'Pon al menos la fecha de inicio.' };
  hasta = hasta || desde;
  if (hasta < desde) return { error: 'La fecha final no puede ser anterior a la inicial.' };
  return { evento: { id: 'e' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), tipo: tipo || 'otro', titulo: (titulo || '').trim(), desde, hasta } };
}

// ── Sugerencias (regla del libro, cap. 6) ──
// Estancados / en bajada con el mismo criterio que Historial (detectarEstancamiento).
export function estadoProgresoCliente(rutinas, mesociclos, historial) {
  try {
    const sesionAnteriorMap = new Map(), porEj = {};
    [...historial].sort((x, y) => (x.fecha ? new Date(x.fecha) : new Date(0)) - (y.fecha ? new Date(y.fecha) : new Date(0)))
      .forEach(x => { if (!x.ejercicio) return; (porEj[claveEjercicioRutina(x)] = porEj[claveEjercicioRutina(x)] || []).push(x); });
    Object.values(porEj).forEach(l => { for (let i = 1; i < l.length; i++) sesionAnteriorMap.set(l[i], l[i - 1]); });
    const maps = mesocicloMapsDeCliente(rutinas, mesociclos);
    const cardioIds = new Set((rutinas || []).filter(r => r.es_cardio).map(r => String(r.id)));
    const r = detectarEstancamiento(historial, sesionAnteriorMap, maps.rutinaMesocicloMap, maps.rutinaNombreMap, cardioIds);
    return { estancados: r.ejerciciosEstancados || [], enBajada: r.ejerciciosEnBajada || [] };
  } catch (e) { return { estancados: [], enBajada: [] }; }
}

// Devuelve [{ k: 'aviso'|'info'|'ok', txt }] (txt con HTML ya escapado). `esc` se pasa para no depender del DOM.
export function sugerenciasPeriodizacion({ vig, visibles, eventos, prog }, esc) {
  const out = [];
  const hoy = fechaLocalISO(), hoyD = fp(hoy);
  const fmt = d => d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }).replace(/\./g, '');
  const lab = m => (m && m.tipo_atr && BLOQUE_TIPOS[m.tipo_atr]) ? BLOQUE_TIPOS[m.tipo_atr].label : 'el siguiente bloque';
  const nombres = a => a.slice(0, 4).map(esc).join(', ') + (a.length > 4 ? '…' : '');
  prog = prog || { estancados: [], enBajada: [] };
  if (vig && vig.tipo_atr && dia(vig.fecha_inicio) <= hoy) {
    const t = vig.tipo_atr;
    const sem = semanasTranscurridasMesociclo(vig);
    const dur = BLOQUE_DURACION_SEMANAS[t];
    if (vig.fecha_fin) {
      const dias = Math.round((fp(vig.fecha_fin) - hoyD) / DIA_MS);
      const sig = visibles.find(m => dia(m.fecha_inicio) > dia(vig.fecha_inicio));
      if (dias >= 0 && dias <= 7) out.push({ k: 'info', txt: `Este bloque termina ${dias === 0 ? 'hoy' : 'en ' + dias + ' día' + (dias === 1 ? '' : 's')}${sig ? ': el ' + fmt(fp(sig.fecha_inicio)) + ' entra ' + esc(lab(sig)) : ''}. Revisa que las rutinas del siguiente bloque estén listas.` });
    }
    if (t === 'carga') {
      if (prog.enBajada.length) out.push({ k: 'aviso', txt: `En bajada: <b>${nombres(prog.enBajada)}</b>. Si además notas fatiga acumulada, el libro dice bajar: valora adelantar la descarga.` });
      if (prog.estancados.length) out.push({ k: 'aviso', txt: `Sin progreso: <b>${nombres(prog.estancados)}</b>. ¿Hay fatiga? Si no, el libro sube 1-2 series del músculo; si la hay, baja.${dur && sem >= dur.min ? ` Llevas ${Math.floor(sem)} semanas en Carga: es buen momento para valorar Sobrecarga en 1-2 grupos.` : ''}` });
    } else if (t === 'sobrecarga') {
      if (dur && sem >= dur.min) out.push({ k: 'aviso', txt: `Llevas ${Math.floor(sem)} semanas en Sobrecarga (habitual ${dur.min}-${dur.max}): prepara la descarga.` });
      if (prog.enBajada.length) out.push({ k: 'aviso', txt: `En bajada: <b>${nombres(prog.enBajada)}</b>. En Sobrecarga la fatiga se acumula rápido: valora adelantar la descarga.` });
    } else if (t === 'descarga') {
      if (dur && sem >= dur.min) out.push({ k: 'info', txt: 'La descarga ya cumple su mínimo de semanas: puedes volver a Carga cuando te encaje.' });
    }
  }
  (eventos || []).filter(e => e.desde && dia(e.hasta || e.desde) >= hoy).sort((x, y) => dia(x.desde).localeCompare(dia(y.desde))).slice(0, 6).forEach(e => {
    const t = EVENTOS_TIPOS[e.tipo] || EVENTOS_TIPOS.otro;
    const a = fp(e.desde), b = fp(e.hasta || e.desde);
    const dias = Math.round((b - a) / DIA_MS) + 1;
    const bl = visibles.find(m => dia(m.fecha_inicio) <= dia(e.hasta || e.desde) && (!m.fecha_fin || dia(m.fecha_fin) >= dia(e.desde)));
    if (!bl || !bl.tipo_atr) return;
    const tip = bl.tipo_atr;
    const cuando = `${esc(e.titulo || t.label)} (${fmt(a)}${dias > 1 ? ' → ' + fmt(b) : ''}, ${dias} día${dias === 1 ? '' : 's'})`;
    if (t.pesa && dias >= 3) {
      if (tip === 'carga' || tip === 'sobrecarga') out.push({ k: 'aviso', txt: `${cuando} cae en ${esc(lab(bl))}. El libro pone la descarga en puentes y viajes: valora mover la descarga a esa semana.` });
      else if (tip === 'descarga') out.push({ k: 'ok', txt: `${cuando} coincide con la descarga ✓` });
    } else if (!t.pesa && e.tipo === 'estres' && (tip === 'carga' || tip === 'sobrecarga')) {
      out.push({ k: 'info', txt: `${cuando} cae en ${esc(lab(bl))}: poca recuperación esa semana, valora bajar el volumen.` });
    }
  });
  return out;
}
