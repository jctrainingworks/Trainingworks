// DIAGNÓSTICO DE SOLO LECTURA · Control nutricional V2 (fase 1, paso 0)
// 1) Abre el panel de entrenador con la sesión iniciada. 2) Abre la consola del navegador (F12 → Console). 3) Pega TODO este archivo y pulsa Enter.
// 4) Después ejecuta:   const r = await nutriDiagnosticoControlV2();   — imprime una tabla y un resumen. Para copiarlo y pasármelo:   copy(r.texto)
//    Para ver todas las columnas por menú:   copy(JSON.stringify(r.filas))
// Solo hace lecturas (GET). No escribe en Supabase, no cambia la pantalla ni el estado del panel. Si lo pegas dos veces no pasa nada.
// Generado desde prueba/index.html por tests/nutricion-control/generar-consola.js — no editar a mano.
// ═══ CONTROL NUTRICIONAL V2 · FASE 1 (pasos 0-1) · nov 2026 ═══════════════════════════════════════════════
// Pasos 0-1: funciones nuevas sin conectar. Paso 2: SOLO se pinta (mcCtrlPanelHtml, informativo y a prueba de errores); nada bloquea, guarda ni llega a la app. mcPeorCaso sigue siendo el control activo.
// Sirve para (1) comparar el cálculo actual con uno exacto anclado al objetivo diario y (2) medir los menús reales con
// nutriDiagnosticoControlV2() (solo lectura). Solo funciones (sin const/let) para poder pegarlo entero en la consola más de una vez.
// Vocabulario de los resultados (no se mezclan):
//   · exacto_por_metrica: suma, comida a comida, de la mejor/peor opción PARA ESA MÉTRICA. Es una combinación real, pero cada métrica tiene la suya.
//   · conservador: cota que no corresponde a ninguna combinación real (p. ej. kcal sumando los límites de P, H y G por separado; o los suelos en 0 de mcPeorCaso).
//   · enumerado: se han recorrido TODAS las combinaciones de platos; los valores conjuntos (kcal, varios macros a la vez, nº de combinaciones fuera) son reales.
// Referencia: el objetivo DIARIO. desvío_día = Σ desvíos de comida − brecha, con brecha = objetivo_día − Σ objetivos_comida.
function mcCtrlNum(x) { const n = Number(x); return Number.isFinite(n) ? n : 0; }
function mcCtrlKcal(m) { return 4 * mcCtrlNum(m && m.proteina) + 4 * mcCtrlNum(m && m.carbo) + 9 * mcCtrlNum(m && m.grasa); }
function mcCtrlMetricas(m) { return { proteina: mcCtrlNum(m && m.proteina), carbo: mcCtrlNum(m && m.carbo), grasa: mcCtrlNum(m && m.grasa), kcal: mcCtrlKcal(m) }; }
// Configuración con valores por defecto (en fase 3 vivirá en clientes.objetivo_nutri_v2.control). Sin configuración: tolerancia del día = tope actual (20 g), kcal solo informativas.
function mcCtrlConfig(control, mc) {
  const c = control && typeof control === 'object' ? control : {}, tope = mc && mc.tope ? mc.tope : {}, tol = {};
  ['proteina', 'carbo', 'grasa'].forEach(k => {
    const propio = c.tolDia && c.tolDia[k] != null && c.tolDia[k] !== '' ? Number(c.tolDia[k]) : NaN, actual = tope[k] != null && tope[k] !== '' ? Number(tope[k]) : NaN;
    tol[k] = propio >= 0 ? propio : actual >= 0 ? actual : 20;
  });
  const tk = c.tolDiaKcal != null && c.tolDiaKcal !== '' ? Number(c.tolDiaKcal) : NaN, pk = c.margenPlatoKcal != null && c.margenPlatoKcal !== '' ? Number(c.margenPlatoKcal) : NaN;
  return { tolDia: tol, tolDiaKcal: tk >= 0 ? tk : null, modoKcal: 'informar', margenPlatoKcal: pk >= 0 ? pk : null };
}
// Cuánto pueden subir/bajar las métricas de una opción si el cliente cambia ingredientes por sus alternativas.
// opcion.alternativas = [ [ {proteina, carbo, grasa} (cambio de ESA alternativa respecto al ingrediente), … ] (una lista por ingrediente) ].
// Cada ingrediente es independiente: la mejor alternativa de cada métrica se elige por separado → exacto por métrica. Para kcal se elige la alternativa que más
// kcal mueve (4/4/9 sobre su propio cambio): también exacto, y más ajustado que sumar los límites de P, H y G (esa suma es la cota conservadora).
function mcCtrlExtremosAlts(opcion) {
  const r = { proteina: { up: 0, down: 0 }, carbo: { up: 0, down: 0 }, grasa: { up: 0, down: 0 }, kcal: { up: 0, down: 0 } };
  (opcion && opcion.alternativas || []).forEach(lista => {
    const mx = { proteina: 0, carbo: 0, grasa: 0, kcal: 0 }, mn = { proteina: 0, carbo: 0, grasa: 0, kcal: 0 };
    (lista || []).forEach(d => {
      const m = mcCtrlMetricas(d);
      Object.keys(mx).forEach(k => { if (m[k] > mx[k]) mx[k] = m[k]; if (m[k] < mn[k]) mn[k] = m[k]; });
    });
    Object.keys(r).forEach(k => { r[k].up += mx[k]; r[k].down += mn[k]; });
  });
  r.kcalConservador = { up: 4 * r.proteina.up + 4 * r.carbo.up + 9 * r.grasa.up, down: 4 * r.proteina.down + 4 * r.carbo.down + 9 * r.grasa.down };
  return r;
}
// Rango de una comida respecto a su referencia (su objetivo; sin objetivo, su primera opción = el principal, como hace mcPeorCaso). SIN suelos en 0.
function mcCtrlRangoComida(comida) {
  const ops = comida.opciones || [], obj = comida.objetivo ? mcCtrlMetricas(comida.objetivo) : null;
  if (!ops.length) return { idx: comida.idx, nombre: comida.nombre, vacia: true, sinObjetivo: !obj, n: 0, ref: obj, r: null };
  const ref = obj || mcCtrlMetricas(ops[0].macros), r = {};
  ['proteina', 'carbo', 'grasa', 'kcal'].forEach(k => { r[k] = { hi: -Infinity, lo: Infinity, pesaHi: null, pesaLo: null }; });
  ops.forEach(op => {
    const m = mcCtrlMetricas(op.macros), x = mcCtrlExtremosAlts(op);
    Object.keys(r).forEach(k => {
      const d = m[k] - ref[k], hi = d + x[k].up, lo = d + x[k].down, alt = v => (Math.abs(v) > 0.5 ? ' + alternativas' : '');
      if (hi > r[k].hi) { r[k].hi = hi; r[k].pesaHi = (op.nombre || op.id || '?') + alt(x[k].up); }
      if (lo < r[k].lo) { r[k].lo = lo; r[k].pesaLo = (op.nombre || op.id || '?') + alt(x[k].down); }
    });
  });
  return { idx: comida.idx, nombre: comida.nombre, vacia: false, sinObjetivo: !obj, n: ops.length, ref, r };
}
// Brecha de reparto: objetivo diario − suma de los objetivos de comida. null si no hay objetivo diario o a alguna comida le falta el suyo (no se puede anclar).
function mcCtrlBrecha(diario, comidas) {
  if (!diario || (comidas || []).some(c => !c.objetivo)) return null;
  const sum = { proteina: 0, carbo: 0, grasa: 0 };
  comidas.forEach(c => { sum.proteina += mcCtrlNum(c.objetivo.proteina); sum.carbo += mcCtrlNum(c.objetivo.carbo); sum.grasa += mcCtrlNum(c.objetivo.grasa); });
  const b = { proteina: mcCtrlNum(diario.proteina) - sum.proteina, carbo: mcCtrlNum(diario.carbo) - sum.carbo, grasa: mcCtrlNum(diario.grasa) - sum.grasa };
  b.kcal = mcCtrlKcal(b);
  return b;
}
// Recorre TODAS las combinaciones de platos (una opción por comida; las alternativas por alimento NO se enumeran: van como límite por métrica).
// Devuelve valores reales y conjuntos. Si hay demasiadas combinaciones, lo dice (modo 'omitido'): no se inventa nada.
function mcCtrlEnumerar(comidas, brecha, tol, cap) {
  const ops = comidas.map(c => (c.opciones || []).map(op => ({ nombre: op.nombre || op.id || '?', d: null, m: mcCtrlMetricas(op.macros) })));
  const total = ops.reduce((p, l) => p * Math.max(1, l.length), 1), tope = cap || 200000;
  if (total > tope) return { modo: 'omitido', total, cap: tope };
  const refs = comidas.map(c => c.objetivo ? mcCtrlMetricas(c.objetivo) : mcCtrlMetricas(((c.opciones || [])[0] || {}).macros));
  ops.forEach((l, i) => l.forEach(o => { o.d = { proteina: o.m.proteina - refs[i].proteina, carbo: o.m.carbo - refs[i].carbo, grasa: o.m.grasa - refs[i].grasa, kcal: o.m.kcal - refs[i].kcal }; }));
  const B = brecha || { proteina: 0, carbo: 0, grasa: 0, kcal: 0 }, K = ['proteina', 'carbo', 'grasa', 'kcal'];
  const min = {}, max = {}; K.forEach(k => { min[k] = Infinity; max[k] = -Infinity; });
  let fueraAlguno = 0, fueraVarios = 0, peorAlto = null, peorBajo = null;
  const elegido = new Array(ops.length).fill(0), acc = { proteina: 0, carbo: 0, grasa: 0, kcal: 0 };
  const rec = i => {
    if (i === ops.length) {
      const v = {}; K.forEach(k => { v[k] = acc[k] - B[k]; if (v[k] < min[k]) min[k] = v[k]; if (v[k] > max[k]) max[k] = v[k]; });
      const fuera = ['proteina', 'carbo', 'grasa'].filter(k => Math.abs(v[k]) > mcCtrlNum(tol[k]) + 0.0001).length;
      if (fuera >= 1) fueraAlguno++; if (fuera >= 2) fueraVarios++;
      if (!peorAlto || v.kcal > peorAlto.kcal) peorAlto = { kcal: v.kcal, platos: elegido.map((j, n) => ops[n][j].nombre) };
      if (!peorBajo || v.kcal < peorBajo.kcal) peorBajo = { kcal: v.kcal, platos: elegido.map((j, n) => ops[n][j].nombre) };
      return;
    }
    ops[i].forEach((o, j) => { elegido[i] = j; K.forEach(k => { acc[k] += o.d[k]; }); rec(i + 1); K.forEach(k => { acc[k] -= o.d[k]; }); });
  };
  rec(0);
  return { modo: 'enumerado', total, min, max, fueraAlguno, fueraVarios, peorKcalAlto: peorAlto, peorKcalBajo: peorBajo };
}
// Control del día completo. entrada = { diario: {proteina, carbo, grasa}|null, comidas: [{idx, nombre, objetivo|null, opciones: [{id, nombre, macros, alternativas}]}] } (principal primero).
// cfg = salida de mcCtrlConfig. Estados: 'incompleto' | 'sin_referencia' | 'fuera' | 'valido' (válido = cumple el objetivo DIARIO dentro de la tolerancia en todas las combinaciones posibles).
function mcCtrlDia(entrada, cfg) {
  cfg = cfg || mcCtrlConfig(null, null);
  const comidas = entrada.comidas || [], rangos = comidas.map(mcCtrlRangoComida), vacias = rangos.filter(r => r.vacia).map(r => r.nombre);
  const brecha = mcCtrlBrecha(entrada.diario, comidas), B = brecha || { proteina: 0, carbo: 0, grasa: 0, kcal: 0 }, K = ['proteina', 'carbo', 'grasa', 'kcal'];
  const llenas = rangos.filter(r => !r.vacia), m = {}, suelo0 = {};
  K.forEach(k => {
    let alto = 0, bajo = 0, s0a = 0, s0b = 0, pesaA = null, pesaB = null;
    llenas.forEach(r => {
      const x = r.r[k]; alto += x.hi; bajo += x.lo; s0a += Math.max(0, x.hi); s0b += Math.min(0, x.lo);
      if (!pesaA || x.hi > pesaA.val) pesaA = { idx: r.idx, comida: r.nombre, val: x.hi, plato: x.pesaHi };
      if (!pesaB || x.lo < pesaB.val) pesaB = { idx: r.idx, comida: r.nombre, val: x.lo, plato: x.pesaLo };
    });
    m[k] = { alto: alto - B[k], bajo: bajo - B[k], pesaAlto: pesaA, pesaBajo: pesaB, tipo: 'exacto_por_metrica' };
    suelo0[k] = { alto: s0a, bajo: s0b };
  });
  const conservador = { kcalSumandoMacros: { alto: 4 * m.proteina.alto + 4 * m.carbo.alto + 9 * m.grasa.alto, bajo: 4 * m.proteina.bajo + 4 * m.carbo.bajo + 9 * m.grasa.bajo, nota: 'no corresponde a una combinación real: cada macro tiene sus propios platos extremos' }, suelo0: { ...suelo0, nota: 'método actual (mcPeorCaso): suelos en 0 por comida y sin brecha' } };
  const excesos = [], nombres = { proteina: 'Proteína', carbo: 'Hidratos', grasa: 'Grasa' };
  ['proteina', 'carbo', 'grasa'].forEach(k => {
    const t = cfg.tolDia[k];
    if (llenas.length && m[k].alto > t + 0.0001) excesos.push({ k, nombre: nombres[k], sentido: 'hacia arriba', val: m[k].alto, tope: t, pesa: m[k].pesaAlto });
    if (llenas.length && -m[k].bajo > t + 0.0001) excesos.push({ k, nombre: nombres[k], sentido: 'hacia abajo', val: m[k].bajo, tope: t, pesa: m[k].pesaBajo });
  });
  const enumeracion = vacias.length ? { modo: 'omitido', motivo: 'faltan comidas con plato' } : mcCtrlEnumerar(comidas, brecha, cfg.tolDia, cfg.capEnum);
  const referencia = brecha ? 'dia' : 'sin_referencia';
  const estado = vacias.length ? 'incompleto' : referencia === 'sin_referencia' ? 'sin_referencia' : excesos.length ? 'fuera' : 'valido';
  const tk = cfg.tolDiaKcal;
  return { estado, referencia, brecha, comidasSinPlato: vacias, metricas: m, conservador, enumeracion, excesos,
    kcal: { alto: m.kcal.alto, bajo: m.kcal.bajo, tol: tk, modo: 'informar', supera: tk == null ? null : (m.kcal.alto > tk + 0.0001 || -m.kcal.bajo > tk + 0.0001) },
    alternativas: { incluidasEnLimites: true, enumeradas: false, nota: 'cada ingrediente tiene alternativas independientes: el límite por métrica es exacto; la combinación conjunta de alternativas no se enumera' } };
}
// Réplica pura del cálculo ACTUAL (mcPeorCaso: suelos en 0, referencia por comida, sin brecha) para compararlo con el nuevo. Se valida contra la función real en las pruebas.
function mcCtrlPeorCasoAntiguo(entrada, tope) {
  const r = { proteina: { up: 0, down: 0 }, carbo: { up: 0, down: 0 }, grasa: { up: 0, down: 0 } };
  (entrada.comidas || []).forEach(c => {
    const rg = mcCtrlRangoComida(c); if (rg.vacia) return;
    Object.keys(r).forEach(k => { r[k].up += Math.max(0, rg.r[k].hi); r[k].down += Math.min(0, rg.r[k].lo); });
  });
  const excesos = [];
  Object.keys(r).forEach(k => { const t = mcCtrlNum(tope && tope[k]); if (r[k].up > t + 0.0001) excesos.push({ k, sentido: 'hacia arriba', val: r[k].up }); if (-r[k].down > t + 0.0001) excesos.push({ k, sentido: 'hacia abajo', val: r[k].down }); });
  return { r, excesos };
}
// ¿Las kcal declaradas de cada alimento cuadran con 4/4/9 sobre sus macros? Solo informa (no corrige nada). Admite campos del catálogo v3 (kcal_100g…) o V2 (kcal, proteina…).
// Si algún día hay fibra_100g, añade la variante con fibra a 2 kcal/g (carbohidratos disponibles = totales − fibra). Hoy ningún catálogo trae fibra ni polioles.
function mcCtrlCoherenciaKcal(alimentos, umbralAbs, umbralPct) {
  const ua = umbralAbs == null ? 10 : umbralAbs, up = umbralPct == null ? 0.05 : umbralPct;   // umbrales solo para listar (informativo): máx(10 kcal, 5 %)
  return (alimentos || []).map(a => {
    const kc = mcCtrlNum(a.kcal_100g != null ? a.kcal_100g : a.kcal), p = mcCtrlNum(a.proteina_100g != null ? a.proteina_100g : a.proteina), c = mcCtrlNum(a.carbo_100g != null ? a.carbo_100g : a.carbohidratos), g = mcCtrlNum(a.grasa_100g != null ? a.grasa_100g : a.grasa);
    const calc = 4 * p + 4 * c + 9 * g, dif = kc - calc, fib = a.fibra_100g != null ? mcCtrlNum(a.fibra_100g) : null;
    return { id: a.id || a.nombre, nombre: a.nombre, kcalDeclarada: kc, kcal449: Math.round(calc * 10) / 10, dif: Math.round(dif * 10) / 10, difPct: kc > 0 ? Math.round(dif / kc * 1000) / 10 : null,
      incoherente: Math.abs(dif) > Math.max(ua, up * kc), kcalConFibra: fib == null ? null : Math.round((4 * p + 4 * Math.max(0, c - fib) + 2 * fib + 9 * g) * 10) / 10 };
  });
}
// ── Paso 0: diagnóstico de SOLO LECTURA sobre los menús guardados ──────────────────────────────────────────
// Qué hace: para cada cliente con plan_version 5 (y para su menú de descanso si existe) reconstruye objetivos de comida y platos ofrecidos desde el plan GUARDADO,
// calcula el control actual y el nuevo, y devuelve la comparación. Solo hace GET (planes_nutricion, seguimiento_corporal y, si falta, clientes.objetivo_nutri_v2).
// No escribe en Supabase, no cambia state ni la pantalla. Uso (consola del panel, con sesión iniciada):  const r = await nutriDiagnosticoControlV2();  console.log(r.texto)
function mcCtrlMacrosGuardados(ingredientes, catalogo) {
  const porId = {}; (catalogo || []).forEach(a => { porId[a.id] = a; });
  const t = { proteina: 0, carbo: 0, grasa: 0, kcal: 0 }, sinDatos = [];
  (ingredientes || []).forEach(ing => {
    const g = parseFloat(ing.gramos != null ? ing.gramos : ing.cantidad_base_g), a = porId[ing.alimento_id];
    if (!(g > 0)) return;
    if (!a) { sinDatos.push(ing.nombre || ing.alimento_id); return; }
    t.proteina += g * mcCtrlNum(a.proteina_100g) / 100; t.carbo += g * mcCtrlNum(a.carbo_100g) / 100; t.grasa += g * mcCtrlNum(a.grasa_100g) / 100; t.kcal += g * mcCtrlNum(a.kcal_100g) / 100;
  });
  return { ...t, sinDatos };
}
function mcCtrlAltsGuardadas(ingredientes, catalogo) {
  const porId = {}; (catalogo || []).forEach(a => { porId[a.id] = a; });
  const mac = (id, g) => { const a = porId[id] || {}; return { proteina: g * mcCtrlNum(a.proteina_100g) / 100, carbo: g * mcCtrlNum(a.carbo_100g) / 100, grasa: g * mcCtrlNum(a.grasa_100g) / 100 }; };
  return (ingredientes || []).filter(ing => Array.isArray(ing.alternativas) && ing.alternativas.length).map(ing => {
    const m0 = mac(ing.alimento_id, parseFloat(ing.gramos) || 0);
    return ing.alternativas.map(e => { const m1 = mac(e.alimento_id, parseFloat(e.gramos) || 0); return { proteina: m1.proteina - m0.proteina, carbo: m1.carbo - m0.carbo, grasa: m1.grasa - m0.grasa }; });
  });
}
function mcCtrlEntradaDesdePlan(dia, row, objDia, catalogo) {
  const est = { numComidas: (dia.comidas || []).length, porcentajesComida: Array.isArray(row.porcentajes_comida) ? row.porcentajes_comida.slice() : null, gramosComidaV4: dia.reparto_gramos || null, repartoMacroV4: dia.reparto_macros || null,
    objetivoDiarioV4: objDia ? { kcal: objDia.kcal, proteina: objDia.proteina, carbohidratos: objDia.carbohidratos, grasa: objDia.grasa } : null };
  const modo = nv2GramosComidaV4(est) ? 'gramos' : nv2AjustesMacroV4(est) ? 'por_macro' : 'porcentaje', drift = [], sinDatos = [], difKcal = [];
  const comidas = (dia.comidas || []).map((cm, idx) => {
    const o = est.objetivoDiarioV4 ? nv2ObjetivoComidaV4(est, idx) : null;
    const platos = (cm.platos || []).slice().sort((a, b) => (b.principal ? 1 : 0) - (a.principal ? 1 : 0));
    return { idx, nombre: cm.nombre, objetivo: o && o.kcal > 0 ? { proteina: o.proteina, carbo: o.carbohidratos, grasa: o.grasa } : null,
      opciones: platos.map(p => {
        const m = mcCtrlMacrosGuardados(p.ingredientes, catalogo); m.sinDatos.forEach(n => { if (!sinDatos.includes(n)) sinDatos.push(n); });
        const k449 = 4 * m.proteina + 4 * m.carbo + 9 * m.grasa; if (k449 > 0 && m.kcal > 0) difKcal.push({ plato: p.nombre, dif: m.kcal - k449, pct: (m.kcal - k449) / k449 * 100 });
        if (p.macros) { const dd = Math.max(Math.abs(mcCtrlNum(p.macros.proteina) - m.proteina), Math.abs(mcCtrlNum(p.macros.carbohidratos) - m.carbo), Math.abs(mcCtrlNum(p.macros.grasa) - m.grasa)); if (dd > 1.5) drift.push({ plato: p.nombre, dif: Math.round(dd * 10) / 10 }); }
        return { id: p.id, nombre: p.nombre, macros: { proteina: m.proteina, carbo: m.carbo, grasa: m.grasa }, alternativas: mcCtrlAltsGuardadas(p.ingredientes, catalogo) };
      }) };
  });
  return { entrada: { diario: objDia ? { proteina: objDia.proteina, carbo: objDia.carbohidratos, grasa: objDia.grasa } : null, comidas }, modo, drift, sinDatos, difKcal };
}
async function nutriDiagnosticoControlV2(opts) {
  opts = opts || {};
  const catalogo = state.nutriAlimentos || [], filas = [], avisos = [], platosKcal = [];
  const planes = await supabase('planes_nutricion', { select: 'cliente_id,plan_version,dias,porcentajes_comida,updated_at', filter: 'plan_version=eq.5' });
  for (const row of planes || []) {
    const c = (state.clients || []).find(x => String(x.id) === String(row.cliente_id)), nombre = c ? ((c.nombre || '') + ' ' + (c.apellidos || '')).trim() || String(row.cliente_id) : String(row.cliente_id);
    try {
      let obj = c && c.objetivo_nutri_v2;
      if (!obj) { const fo = await supabase('clientes', { select: 'objetivo_nutri_v2', filter: `id=eq.${row.cliente_id}` }); obj = fo && fo[0] && fo[0].objetivo_nutri_v2; }
      let peso = '', seg = [];
      try { seg = (await supabase('seguimiento_corporal', { filter: `cliente_id=eq.${row.cliente_id}&order=fecha.desc&limit=12` })) || []; const rp = elegirRegistroPeso(seg); if (rp) peso = rp.peso; } catch (e) { /* sin seguimiento: se usa el peso inicial */ }
      if (!peso) peso = c && c.peso_inicial != null ? c.peso_inicial : '';
      const pesoRef = Number(nv2PesoReferencia(c, peso, seg).peso) || 0;
      const base = { proteinaGKg: obj && obj.proteinaGKg, grasaGKg: obj && obj.grasaGKg, carbohidratos: obj && obj.carbohidratos };
      const oE = obj && pesoRef > 0 ? nv2ObjetivoEfectivo({ objetivo: base }, pesoRef) : null;
      const ds = dseNormalizar(obj && obj.diaSinEntreno), tope = (row.dias[0] && row.dias[0].menu_cerrado && row.dias[0].menu_cerrado.tope) || null, margen = (row.dias[0] && row.dias[0].menu_cerrado && row.dias[0].menu_cerrado.margen) || null, cfg = mcCtrlConfig(obj && obj.control, { tope });
      (row.dias || []).slice(0, 2).forEach((dia, di) => {
        if (!dia || !Array.isArray(dia.comidas)) return;
        const D = !oE ? null : di === 0 ? oE : (() => { const ch = Math.max(0, oE.carbohidratos - Math.max(0, Number(ds.carbosMenos) || 0)); return { ...oE, carbohidratos: ch, kcal: nv2CalcularKcalDesdeMacros({ proteina: oE.proteina, grasa: oE.grasa, carbohidratos: ch }) }; })();
        const e = mcCtrlEntradaDesdePlan(dia, row, D, catalogo), nuevo = mcCtrlDia(e.entrada, cfg), viejo = mcCtrlPeorCasoAntiguo(e.entrada, cfg.tolDia);
        const kcalDia = D ? D.kcal : null, pct = v => (kcalDia ? Math.round(v / kcalDia * 1000) / 10 : null), f1 = v => Math.round(v * 10) / 10;
        filas.push({ cliente: nombre, menu: di === 0 ? 'entreno' : 'descanso', reparto: e.modo, comidas: e.entrada.comidas.length, platos: e.entrada.comidas.reduce((s, x) => s + x.opciones.length, 0),
          estado: nuevo.estado, estadoActual: viejo.excesos.length ? 'fuera' : 'ok', cambia: (viejo.excesos.length ? 'fuera' : 'ok') !== (nuevo.excesos.length ? 'fuera' : 'ok'),
          brechaP: nuevo.brecha ? f1(nuevo.brecha.proteina) : null, brechaH: nuevo.brecha ? f1(nuevo.brecha.carbo) : null, brechaG: nuevo.brecha ? f1(nuevo.brecha.grasa) : null, brechaKcal: nuevo.brecha ? Math.round(nuevo.brecha.kcal) : null,
          altoP_actual: f1(viejo.r.proteina.up), bajoP_actual: f1(viejo.r.proteina.down), altoP: f1(nuevo.metricas.proteina.alto), bajoP: f1(nuevo.metricas.proteina.bajo),
          altoH_actual: f1(viejo.r.carbo.up), bajoH_actual: f1(viejo.r.carbo.down), altoH: f1(nuevo.metricas.carbo.alto), bajoH: f1(nuevo.metricas.carbo.bajo),
          altoG_actual: f1(viejo.r.grasa.up), bajoG_actual: f1(viejo.r.grasa.down), altoG: f1(nuevo.metricas.grasa.alto), bajoG: f1(nuevo.metricas.grasa.bajo),
          kcalAlto: Math.round(nuevo.kcal.alto), kcalBajo: Math.round(nuevo.kcal.bajo), kcalAltoPct: pct(nuevo.kcal.alto), kcalBajoPct: pct(nuevo.kcal.bajo), kcalConservadorAlto: Math.round(nuevo.conservador.kcalSumandoMacros.alto), kcalConservadorBajo: Math.round(nuevo.conservador.kcalSumandoMacros.bajo),
          combinaciones: nuevo.enumeracion.total || null, combFueraAlguno: nuevo.enumeracion.fueraAlguno != null ? nuevo.enumeracion.fueraAlguno : null, combFueraVarios: nuevo.enumeracion.fueraVarios != null ? nuevo.enumeracion.fueraVarios : null,
          macrosGuardadosDistintos: e.drift.length, alimentosSinDatos: e.sinDatos.length, sinPeso: !oE,
          topeP: tope && tope.proteina != null ? Number(tope.proteina) : null, topeH: tope && tope.carbo != null ? Number(tope.carbo) : null, topeG: tope && tope.grasa != null ? Number(tope.grasa) : null,
          margenP: margen && margen.proteina != null ? Number(margen.proteina) : null, margenH: margen && margen.carbo != null ? Number(margen.carbo) : null, margenG: margen && margen.grasa != null ? Number(margen.grasa) : null,
          platoKcalDeclVs449MaxAbs: e.difKcal.length ? f1(Math.max(...e.difKcal.map(x => Math.abs(x.dif)))) : null, platoKcalDeclVs449MaxPct: e.difKcal.length ? f1(Math.max(...e.difKcal.map(x => Math.abs(x.pct)))) : null });
        e.difKcal.forEach(x => platosKcal.push(x));
        if (e.sinDatos.length) avisos.push(`${nombre} (${di === 0 ? 'entreno' : 'descanso'}): alimentos sin datos en el catálogo actual: ${e.sinDatos.join(', ')}`);
      });
    } catch (err) { avisos.push(`${nombre}: no se pudo analizar (${err && err.message ? err.message : err})`); }
  }
  const coherencia = mcCtrlCoherenciaKcal(catalogo), mal = coherencia.filter(x => x.incoherente);
  const n = filas.length, cuenta = fn => filas.filter(fn).length, orden = (arr, k) => arr.map(x => x[k]).filter(v => v != null).sort((a, b) => a - b), pctil = (arr, p) => (arr.length ? arr[Math.min(arr.length - 1, Math.floor(p * arr.length))] : null);
  const kcalMax = orden(filas.map(x => ({ v: Math.max(Math.abs(x.kcalAltoPct || 0), Math.abs(x.kcalBajoPct || 0)) })), 'v');
  const cuentaClaves = fn => { const o = {}; filas.forEach(f => { const k = fn(f); o[k] = (o[k] || 0) + 1; }); return Object.keys(o).map(k => `${k} ×${o[k]}`).join(' · '); };
  const texto = [
    `DIAGNÓSTICO CONTROL V2 (solo lectura) · ${n} menús analizados (${cuenta(x => x.menu === 'entreno')} entreno, ${cuenta(x => x.menu === 'descanso')} descanso)`,
    `Reparto: ${cuenta(x => x.reparto === 'porcentaje')} por %, ${cuenta(x => x.reparto === 'por_macro')} por macro, ${cuenta(x => x.reparto === 'gramos')} por gramos · sin peso (⚪): ${cuenta(x => x.sinPeso)}`,
    `Estado nuevo: ✅ ${cuenta(x => x.estado === 'valido')} · ⛔ ${cuenta(x => x.estado === 'fuera')} · 🟡 ${cuenta(x => x.estado === 'incompleto')} · ⚪ ${cuenta(x => x.estado === 'sin_referencia')}`,
    `Menús cuyo veredicto cambiaría respecto al control actual: ${cuenta(x => x.cambia)}`,
    `Menús con brecha de reparto ≠ 0 (>0,5 g en algún macro): ${cuenta(x => [x.brechaP, x.brechaH, x.brechaG].some(v => v != null && Math.abs(v) > 0.5))}`,
    `Desvío kcal del día en el peor caso (% del objetivo): mediana ${pctil(kcalMax, 0.5)} · p90 ${pctil(kcalMax, 0.9)} · máx ${pctil(kcalMax, 1)}`,
    `Menús con macros guardados distintos del catálogo actual (>1,5 g): ${cuenta(x => x.macrosGuardadosDistintos > 0)} · con alimentos sin datos: ${cuenta(x => x.alimentosSinDatos > 0)}`,
    `Tope guardado en los menús (P/H/G, g): ${cuentaClaves(f => `${f.topeP}/${f.topeH}/${f.topeG}`)}   (null = sin tope guardado: se usa 20)`,
    `Margen por plato guardado (P/H/G, g): ${cuentaClaves(f => `${f.margenP}/${f.margenH}/${f.margenG}`)}`,
    `Platos ofrecidos (${platosKcal.length}): kcal declaradas − kcal 4/4/9 → mediana ${pctil(orden(platosKcal.map(x => ({ v: Math.round(Math.abs(x.dif)) })), 'v'), 0.5)} kcal (${pctil(orden(platosKcal.map(x => ({ v: Math.round(Math.abs(x.pct) * 10) / 10 })), 'v'), 0.5)} %) · p90 ${pctil(orden(platosKcal.map(x => ({ v: Math.round(Math.abs(x.dif)) })), 'v'), 0.9)} kcal (${pctil(orden(platosKcal.map(x => ({ v: Math.round(Math.abs(x.pct) * 10) / 10 })), 'v'), 0.9)} %) · máx ${pctil(orden(platosKcal.map(x => ({ v: Math.round(Math.abs(x.dif)) })), 'v'), 1)} kcal · declaran menos que 4/4/9: ${platosKcal.filter(x => x.dif < -1).length} · más: ${platosKcal.filter(x => x.dif > 1).length}`,
    `Catálogo: ${mal.length} de ${coherencia.length} alimentos con kcal declaradas distintas de 4/4/9 (umbral máx(10 kcal, 5 %), solo informativo)`,
    ...mal.slice(0, 25).map(x => `  · ${x.nombre}: declara ${x.kcalDeclarada}, 4/4/9 da ${x.kcal449} (${x.dif > 0 ? '+' : ''}${x.dif})`),
    ...avisos.slice(0, 15),
  ].join('\n');
  const res = { filas, coherencia: mal, avisos, texto };
  if (!opts.silencioso && typeof console !== 'undefined') { if (console.table) console.table(filas.map(x => ({ cliente: x.cliente, menu: x.menu, reparto: x.reparto, estado: x.estado, actual: x.estadoActual, cambia: x.cambia, brechaH: x.brechaH, kcalAltoPct: x.kcalAltoPct, kcalBajoPct: x.kcalBajoPct }))); console.log(texto); }
  return res;
}
// ── Paso 2: panel informativo en el Menú cerrado (solo se PINTA; no bloquea, no guarda, no cambia estado) ───────────
// Misma entrada que usa mcPeorCaso (principal + ofrecidos, con las alternativas por alimento), pero con el formato de mcCtrlDia.
function mcCtrlEntradaDesdeEstado(est, mc) {
  const esq = NUTRI_ESQUEMAS_COMIDAS_V2[est.numComidas] || NUTRI_ESQUEMAS_COMIDAS_V2[4], o = est.objetivoDiarioV4;
  const comidas = esq.map((meta, idx) => {
    const ref = mcRefComida(est, idx), objetivo = ref ? { proteina: ref.proteina, carbo: ref.carbo, grasa: ref.grasa } : null;
    const pr = mc.principal[idx] ? mcPlatoAj(mc, idx, mc.principal[idx]) : null;
    if (!pr) return { idx, nombre: meta.nombre, objetivo, opciones: [] };
    const ofrecidos = [pr, ...(mc.marcados[idx] || []).map(id => mcPlatoAj(mc, idx, id)).filter(p => p && p.id !== pr.id && mcOfrecido(est, mc, idx, p, pr))];
    return { idx, nombre: meta.nombre, objetivo, opciones: ofrecidos.map(p => {
      const m = nutriMacrosPlato(p.ingredientes), alts = mcAltsPlato(mc, idx, p.id), alternativas = [];
      Object.keys(alts).forEach(key => {
        const ing = (p.ingredientes || [])[Number(key)]; if (!ing) return;
        const m0 = mcAltMacros(ing.alimento_id, parseFloat(ing.cantidad_base_g)), lista = [];
        (alts[key] || []).forEach(e => { const g = mcAltG(ing, e); if (!(g > 0)) return; const m1 = mcAltMacros(e.id, g); lista.push({ proteina: m1.proteina - m0.proteina, carbo: m1.carbo - m0.carbo, grasa: m1.grasa - m0.grasa }); });
        alternativas.push(lista);
      });
      return { id: p.id, nombre: p.nombre, macros: { proteina: m.proteina, carbo: m.carbo, grasa: m.grasa }, alternativas };
    }) };
  });
  return { diario: o ? { proteina: o.proteina, carbo: o.carbohidratos, grasa: o.grasa } : null, comidas };
}
function mcCtrlPanelHtml(c, est, mc) {
  try {
    if (!Object.keys(mc.principal || {}).length) return '';
    const cfg = { ...mcCtrlConfig(null, mc), capEnum: 20000 }, d = mcCtrlDia(mcCtrlEntradaDesdeEstado(est, mc), cfg), viejo = mcPeorCaso(est, mc).excesos.length;
    const f1 = v => { const r = Math.round(v * 10) / 10; return (r > 0 ? '+' : '') + String(r).replace('.', ','); }, nom = { proteina: 'Proteína', carbo: 'Hidratos', grasa: 'Grasa' };
    const esq = NUTRI_ESQUEMAS_COMIDAS_V2[est.numComidas] || NUTRI_ESQUEMAS_COMIDAS_V2[4], t = cfg.tolDia, m = mc.margen || {};
    let cab;
    if (d.estado === 'valido') cab = '<span style="color:#22c55e">✅ El día cuadra con tu objetivo diario en todas las combinaciones posibles.</span>';
    else if (d.estado === 'fuera') cab = `<span style="color:#ef4444">⛔ Respecto a tu objetivo diario el día se sale: ${d.excesos.map(e => `${esc(e.nombre)} ${e.sentido} ${f1(e.val)} g (tope ${e.tope}; ${String(Math.round((Math.abs(e.val) - e.tope) * 10) / 10).replace('.', ',')} g sobre el tope)${e.pesa ? ` — pesa más ${esc(e.pesa.comida)}: ${esc(e.pesa.plato)}` : ''}`).join(' · ')}.</span>`;
    else if (d.estado === 'incompleto') cab = `<span style="color:#f59e0b">🟡 Faltan platos en: ${d.comidasSinPlato.map(esc).join(', ')}. Hasta que estén todas las comidas no se puede verificar el día.</span>`;
    else cab = '<span style="color:#9aa4b2">⚪ Sin referencia: falta el peso del cliente (o su objetivo), así que no se puede comprobar contra su objetivo diario. Este menú no cuenta como validado.</span>';
    const lineaMacros = ['proteina', 'carbo', 'grasa'].map(k => { const x = d.metricas[k], mal = x.alto > t[k] + 0.0001 || -x.bajo > t[k] + 0.0001; return `<span style="${mal ? 'color:#ef4444' : ''}">${nom[k]} ${f1(x.alto)} / ${f1(x.bajo)}${mal ? ' ⚠' : ''}</span>`; }).join(' · ');
    const brecha = d.brecha ? ['proteina', 'carbo', 'grasa'].filter(k => Math.abs(d.brecha[k]) > 0.5).map(k => `${Math.abs(Math.round(d.brecha[k] * 10) / 10)} g ${d.brecha[k] < 0 ? 'más' : 'menos'} de ${nom[k].toLowerCase()}`) : [];
    const kd = est.objetivoDiarioV4 && est.objetivoDiarioV4.kcal > 0 ? est.objetivoDiarioV4.kcal : null, pc = (a, b) => (kd ? ` (${f1(a / kd * 100)} % / ${f1(b / kd * 100)} % del objetivo)` : '');
    const nuevoFuera = d.excesos.length > 0, en = d.enumeracion;
    return `<div style="margin-top:8px;padding:8px 10px;border:1px dashed #3a4555;border-radius:8px;font-size:12.5px;line-height:1.5;">
      <div style="font-weight:600;">Control del día · nuevo <span class="nu-hint" style="font-weight:400;">en prueba: solo informa, no bloquea ni guarda nada</span></div>
      <div>${cab}</div>
      <div class="nu-hint">Peor caso del día sobre tu objetivo diario, en g (más / menos): ${lineaMacros}</div>
      <div class="nu-hint">Tope guardado en este menú: P ${t.proteina} · H ${t.carbo} · G ${t.grasa} g · margen por plato: P ${mc.margen ? m.proteina : '–'} · H ${mc.margen ? m.carbo : '–'} · G ${mc.margen ? m.grasa : '–'} g (hoy no se pueden cambiar desde el panel).</div>
      ${brecha.length ? `<div class="nu-hint">Reparto: tus comidas suman ${brecha.join(', ')} que el objetivo diario.</div>` : ''}
      <div class="nu-hint">Kcal en el peor caso: ${f1(d.kcal.alto)} / ${f1(d.kcal.bajo)}${pc(d.kcal.alto, d.kcal.bajo)} · informativo (macros × 4/4/9), no bloquea.</div>
      ${en && en.modo === 'enumerado' ? `<div class="nu-hint">${en.total} ${en.total === 1 ? 'combinación' : 'combinaciones'} de platos: ${en.fueraAlguno} ${en.fueraAlguno === 1 ? 'se sale' : 'se salen'} del tope.${nuevoFuera && en.fueraAlguno === 0 ? ' Ninguna lo hace solo con platos: el exceso sale de sumar las alternativas por alimento.' : ''}</div>` : ''}
      <div class="nu-hint">Control actual: ${viejo ? '⛔ no deja guardar' : '✔ da el menú por bueno'}${(viejo > 0) !== nuevoFuera ? ' · <b>el nuevo no coincide</b>' + (brecha.length ? ' porque tiene en cuenta que tus comidas no suman exactamente el objetivo diario' : '') : ''}.</div>
    </div>`;
  } catch (e) { return ''; }   // este panel nunca debe romper el Menú cerrado
}
// ═══ FIN CONTROL NUTRICIONAL V2 (fase 1) ══════════════════════════════════════════════════════════════════
