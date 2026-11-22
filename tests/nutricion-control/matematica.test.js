// PASO 1 · Pruebas matemáticas de las funciones nuevas (mcCtrl*). Se ejecuta con: node matematica.test.js
const assert = require('assert'), { cargar } = require('./cargar.js');
const E = cargar(), C = E.ctx, run = E.run;
let ok = 0, fallos = 0; const informe = [];
function t(nombre, fn) { try { fn(); ok++; informe.push('  ✔ ' + nombre); } catch (e) { fallos++; informe.push('  ✘ ' + nombre + '\n      ' + (e.message || e).toString().split('\n').join('\n      ')); } }
function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
const cerca = (a, b, m) => assert.ok(Math.abs(a - b) < 1e-7, `${m || ''} esperado ${b}, obtenido ${a}`);
const K = ['proteina', 'carbo', 'grasa', 'kcal'];

// ── Generadores ─────────────────────────────────────────────────────────────────────────
function entradaAleatoria(r, o) {
  o = o || {};
  const n = 3 + Math.floor(r() * 3), comidas = [];
  for (let i = 0; i < n; i++) {
    const objetivo = o.sinObjetivoEn === i ? null : { proteina: 20 + r() * 40, carbo: 20 + r() * 80, grasa: 5 + r() * 25 };
    const nops = o.vacia === i ? 0 : 1 + Math.floor(r() * 4), opciones = [];
    for (let j = 0; j < nops; j++) {
      const base = objetivo || { proteina: 40, carbo: 60, grasa: 15 }, nIng = Math.floor(r() * 3), alternativas = [];
      const f = o.ajustado ? 0.12 : 1;   // ajustado: desviaciones pequeñas, para que haya muchos menús válidos hoy
      for (let g = 0; g < nIng; g++) { const l = []; for (let a = 0; a < 1 + Math.floor(r() * 2); a++) l.push({ proteina: (r() - 0.5) * 20 * f, carbo: (r() - 0.5) * 30 * f, grasa: (r() - 0.5) * 10 * f }); alternativas.push(l); }
      opciones.push({ id: `p${i}_${j}`, nombre: `Plato ${i}.${j}`, macros: { proteina: base.proteina + (r() - 0.5) * 30 * f, carbo: base.carbo + (r() - 0.5) * 40 * f, grasa: base.grasa + (r() - 0.5) * 14 * f }, alternativas });
    }
    comidas.push({ idx: i, nombre: 'Comida ' + (i + 1), objetivo, opciones });
  }
  const suma = { proteina: 0, carbo: 0, grasa: 0 }; comidas.forEach(c => { if (c.objetivo) K.slice(0, 3).forEach(k => { suma[k] += c.objetivo[k]; }); });
  const diario = o.sinDiario ? null : { proteina: suma.proteina + (o.brecha ? (r() - 0.5) * 40 : 0), carbo: suma.carbo + (o.brecha ? (r() - 0.5) * 60 : 0), grasa: suma.grasa + (o.brecha ? (r() - 0.5) * 20 : 0) };
  return { diario, comidas };
}
// Fuerza bruta: todas las combinaciones de platos × todas las elecciones de alternativa de cada ingrediente. Es la definición de «exacto».
function fuerzaBruta(e) {
  const B = (() => { const b = C.mcCtrlBrecha(e.diario, e.comidas); return b || { proteina: 0, carbo: 0, grasa: 0, kcal: 0 }; })();
  const min = {}, max = {}; K.forEach(k => { min[k] = Infinity; max[k] = -Infinity; });
  const acc = { proteina: 0, carbo: 0, grasa: 0 };
  const refs = e.comidas.map(c => c.objetivo || e.comidas[0] && c.opciones[0].macros);
  function porComida(i) {
    if (i === e.comidas.length) { const v = { proteina: acc.proteina - B.proteina, carbo: acc.carbo - B.carbo, grasa: acc.grasa - B.grasa }; v.kcal = 4 * v.proteina + 4 * v.carbo + 9 * v.grasa; K.forEach(k => { if (v[k] < min[k]) min[k] = v[k]; if (v[k] > max[k]) max[k] = v[k]; }); return; }
    e.comidas[i].opciones.forEach(op => {
      const ref = e.comidas[i].objetivo || e.comidas[i].opciones[0].macros;
      (function alt(g, a2) {
        if (g === (op.alternativas || []).length) { ['proteina', 'carbo', 'grasa'].forEach(k => { acc[k] += op.macros[k] - ref[k] + a2[k]; }); porComida(i + 1); ['proteina', 'carbo', 'grasa'].forEach(k => { acc[k] -= op.macros[k] - ref[k] + a2[k]; }); return; }
        const opciones = [{ proteina: 0, carbo: 0, grasa: 0 }, ...op.alternativas[g]];   // «no cambiar» también es una opción
        opciones.forEach(d => alt(g + 1, { proteina: a2.proteina + d.proteina, carbo: a2.carbo + d.carbo, grasa: a2.grasa + d.grasa }));
      })(0, { proteina: 0, carbo: 0, grasa: 0 });
    });
  }
  porComida(0);
  return { min, max };
}

// ── 1. Exactitud: fórmula cerrada = fuerza bruta (incluye alternativas y brecha) ───────────
t('exacto por métrica = fuerza bruta (200 menús aleatorios con alternativas y brecha ≠ 0)', () => {
  const r = rng(7);
  for (let i = 0; i < 200; i++) {
    const e = entradaAleatoria(r, { brecha: i % 2 === 0 }), d = C.mcCtrlDia(e, C.mcCtrlConfig(null, null)), fb = fuerzaBruta(e);
    K.forEach(k => { cerca(d.metricas[k].alto, fb.max[k], `alto ${k} menú ${i}`); cerca(d.metricas[k].bajo, fb.min[k], `bajo ${k} menú ${i}`); });
  }
});
t('la enumeración de platos (sin alternativas) da los mismos extremos por métrica', () => {
  const r = rng(11);
  for (let i = 0; i < 100; i++) {
    const e = entradaAleatoria(r, { brecha: true }); e.comidas.forEach(c => c.opciones.forEach(o => { o.alternativas = []; }));
    const d = C.mcCtrlDia(e, C.mcCtrlConfig(null, null));
    assert.strictEqual(d.enumeracion.modo, 'enumerado');
    K.forEach(k => { cerca(d.enumeracion.max[k], d.metricas[k].alto, 'max ' + k); cerca(d.enumeracion.min[k], d.metricas[k].bajo, 'min ' + k); });
  }
});
t('kcal: el límite exacto es ≤ la cota conservadora (suma de P, H y G) y puede ser estrictamente menor', () => {
  const r = rng(5); let estricto = 0;
  for (let i = 0; i < 200; i++) {
    const e = entradaAleatoria(r, { brecha: true }), d = C.mcCtrlDia(e, C.mcCtrlConfig(null, null));
    assert.ok(d.metricas.kcal.alto <= d.conservador.kcalSumandoMacros.alto + 1e-7 && d.metricas.kcal.bajo >= d.conservador.kcalSumandoMacros.bajo - 1e-7);
    if (d.metricas.kcal.alto < d.conservador.kcalSumandoMacros.alto - 1) estricto++;
  }
  assert.ok(estricto > 20, 'debería haber muchos casos donde la cota conservadora sobreestima; hubo ' + estricto);
});
t('ejemplo del informe: plato +20 P y −20 G → kcal −100, no +80 / −180 por separado', () => {
  const e = { diario: { proteina: 40, carbo: 60, grasa: 20 }, comidas: [{ idx: 0, nombre: 'C', objetivo: { proteina: 40, carbo: 60, grasa: 20 }, opciones: [
    { id: 'a', nombre: 'A', macros: { proteina: 60, carbo: 60, grasa: 0 }, alternativas: [] }, { id: 'b', nombre: 'B', macros: { proteina: 40, carbo: 60, grasa: 20 }, alternativas: [] }] }] };
  const d = C.mcCtrlDia(e, C.mcCtrlConfig(null, null));
  cerca(d.metricas.kcal.bajo, -100, 'kcal bajo'); cerca(d.metricas.kcal.alto, 0, 'kcal alto');
  cerca(d.conservador.kcalSumandoMacros.bajo, 4 * 0 + 0 + 9 * -20, 'conservador bajo');   // −180: no es una combinación real
});

// ── 2. Relación con el control actual ────────────────────────────────────────────────────
t('con brecha 0: el nuevo nunca es más estricto que el actual (alto_nuevo ≤ up_actual y bajo_nuevo ≥ down_actual) y todo menú válido hoy sigue válido', () => {
  const r = rng(21); let validosHoy = 0;
  for (let i = 0; i < 400; i++) {
    const e = entradaAleatoria(r, { brecha: false, ajustado: i % 4 !== 0 }), cfg = C.mcCtrlConfig(null, null), d = C.mcCtrlDia(e, cfg), v = C.mcCtrlPeorCasoAntiguo(e, cfg.tolDia);
    ['proteina', 'carbo', 'grasa'].forEach(k => { assert.ok(d.metricas[k].alto <= v.r[k].up + 1e-7, 'alto'); assert.ok(d.metricas[k].bajo >= v.r[k].down - 1e-7, 'bajo'); });
    if (!v.excesos.length) { validosHoy++; assert.strictEqual(d.estado, 'valido', 'menú válido hoy debe seguir válido'); }
  }
  assert.ok(validosHoy > 30, 'hay que probar con suficientes menús válidos; hubo ' + validosHoy);
});
t('con brecha ≠ 0 el nuevo detecta lo que el actual no ve (reparto por gramos que no suma el objetivo diario)', () => {
  const e = { diario: { proteina: 120, carbo: 200, grasa: 60 }, comidas: [0, 1].map(i => ({ idx: i, nombre: 'C' + i, objetivo: { proteina: 50, carbo: 75, grasa: 25 },
    opciones: [{ id: 'p' + i, nombre: 'P' + i, macros: { proteina: 50, carbo: 75, grasa: 25 }, alternativas: [] }] })) };   // las comidas suman 100/150/50: faltan 20/50/10
  const cfg = C.mcCtrlConfig(null, null), d = C.mcCtrlDia(e, cfg), v = C.mcCtrlPeorCasoAntiguo(e, cfg.tolDia);
  assert.strictEqual(v.excesos.length, 0, 'el control actual da el menú por bueno');
  assert.strictEqual(d.estado, 'fuera'); cerca(d.brecha.carbo, 50); assert.ok(d.excesos.some(x => x.k === 'carbo' && x.sentido === 'hacia abajo'));
});
t('el control actual (réplica pura y adaptador del panel) coincide con la mcPeorCaso REAL de index.html (150 menús)', () => {
  const r = rng(99), esq = n => n;
  for (let it = 0; it < 150; it++) {
    const n = 3 + Math.floor(r() * 3), alimentos = [];
    for (let a = 0; a < 8; a++) alimentos.push({ id: 'a' + a, nombre: 'Al' + a, kcal_100g: 100, proteina_100g: r() * 25, carbo_100g: r() * 70, grasa_100g: r() * 20 });
    C.state.nutriAlimentos = alimentos; C.state.nutriPlatos = [];
    const mc = { principal: {}, marcados: {}, ajustes: {}, alts: {}, sueltos: {}, fijasCli: {}, quitados: {}, anadidos: {}, fijos: {}, margen: { proteina: 20, carbo: 20, grasa: 20 }, tope: { proteina: 20, carbo: 20, grasa: 20 } };
    const est = { numComidas: n, porcentajesComida: null, objetivoDiarioV4: it % 7 === 0 ? null : { kcal: 2000, proteina: 150 + r() * 30, carbohidratos: 220 + r() * 50, grasa: 60 + r() * 15 } };
    if (it % 3 === 0) est.gramosComidaV4 = { proteina: Array.from({ length: n }, () => 20 + r() * 30), carbohidratos: Array.from({ length: n }, () => 30 + r() * 60), grasa: Array.from({ length: n }, () => 8 + r() * 15) };
    if (it % 5 === 0) est.repartoMacroV4 = { carbohidratos: Array.from({ length: n }, () => 10 + r() * 30) };
    const entrada = { diario: null, comidas: [] };
    for (let i = 0; i < n; i++) {
      const nops = 1 + Math.floor(r() * 4), ids = [];
      for (let j = 0; j < nops; j++) {
        const ings = [0, 1, 2].map(() => ({ alimento_id: 'a' + Math.floor(r() * 8), cantidad_base_g: 40 + Math.floor(r() * 200) })), id = `pl${i}_${j}`;
        C.state.nutriPlatos.push({ id, nombre: id, ingredientes: ings }); ids.push(id);
        if (j === 0 && r() < 0.5) mc.alts[i] = { [id]: { 0: [{ id: 'a' + Math.floor(r() * 8), g: 30 + Math.floor(r() * 150) }, { id: 'a' + Math.floor(r() * 8), g: 20 + Math.floor(r() * 100) }] } };
      }
      mc.principal[i] = ids[0]; mc.marcados[i] = ids.slice(1);
      if (r() < 0.3) { mc.anadidos[i] = [ids[ids.length - 1]]; }   // algún plato forzado a mano
    }
    C.__mc = mc; C.__est = est;
    const real = run('mcPeorCaso(__est, __mc)');
    // Misma entrada para la réplica: objetivo por comida real, ofrecidos con el filtro real (mcOfrecido), alternativas con las macros reales
    for (let i = 0; i < n; i++) {
      const o = run(`nv2ObjetivoComidaV4(__est, ${i})`), ref = run(`mcRefComida(__est, ${i})`);
      const pr = run(`mcPlatoAj(__mc, ${i}, __mc.principal[${i}])`);
      C.__i = i; C.__pr = pr;
      const ofr = [pr, ...mc.marcados[i].map(id => run(`mcPlatoAj(__mc, ${i}, '${id}')`)).filter(p => { C.__p = p; return run(`mcOfrecido(__est, __mc, __i, __p, __pr)`); })];
      entrada.comidas.push({ idx: i, nombre: 'C' + i, objetivo: ref ? { proteina: ref.proteina, carbo: ref.carbo, grasa: ref.grasa } : null,
        opciones: ofr.map(p => {
          C.__p = p; const m = run('nutriMacrosPlato(__p.ingredientes)'), alts = [], ar = (mc.alts[i] || {})[p.id] || {};
          Object.keys(ar).forEach(key => { const ing = p.ingredientes[Number(key)]; C.__ing = ing; const m0 = run('mcAltMacros(__ing.alimento_id, parseFloat(__ing.cantidad_base_g))');
            alts.push(ar[key].map(e => { const m1 = run(`mcAltMacros('${e.id}', ${e.g})`); return { proteina: m1.proteina - m0.proteina, carbo: m1.carbo - m0.carbo, grasa: m1.grasa - m0.grasa }; })); });
          return { id: p.id, nombre: p.nombre, macros: { proteina: m.proteina, carbo: m.carbo, grasa: m.grasa }, alternativas: alts };
        }) });
    }
    const rep2 = C.mcCtrlPeorCasoAntiguo(run('mcCtrlEntradaDesdeEstado(__est, __mc)'), mc.tope);   // el adaptador del panel (paso 2) debe dar lo mismo que mcPeorCaso real
    ['proteina', 'carbo', 'grasa'].forEach(k => { cerca(rep2.r[k].up, real.r[k].up, `adaptador up ${k} it ${it}`); cerca(rep2.r[k].down, real.r[k].down, `adaptador down ${k} it ${it}`); });
    const rep = C.mcCtrlPeorCasoAntiguo(entrada, mc.tope);
    ['proteina', 'carbo', 'grasa'].forEach(k => { cerca(rep.r[k].up, real.r[k].up, `up ${k} it ${it}`); cerca(rep.r[k].down, real.r[k].down, `down ${k} it ${it}`); });
    assert.strictEqual(rep.excesos.length, real.excesos.length, 'nº de excesos it ' + it);
  }
});

// ── 3. Estados y casos límite ─────────────────────────────────────────────────────────────
t('estado «incompleto» si falta algún plato: nunca ✅', () => {
  const r = rng(3), e = entradaAleatoria(r, { vacia: 1 }), d = C.mcCtrlDia(e, C.mcCtrlConfig(null, null));
  assert.strictEqual(d.estado, 'incompleto'); assert.deepStrictEqual(d.comidasSinPlato, ['Comida 2']); assert.strictEqual(d.enumeracion.modo, 'omitido');
});
t('estado «sin_referencia» sin objetivo diario o con una comida sin objetivo: nunca ✅, pero sigue informando excesos como hoy', () => {
  const r = rng(4);
  [{ sinDiario: true }, { sinObjetivoEn: 0 }].forEach(o => {
    const e = entradaAleatoria(r, o), d = C.mcCtrlDia(e, C.mcCtrlConfig(null, null));
    assert.strictEqual(d.estado, 'sin_referencia'); assert.strictEqual(d.brecha, null); assert.strictEqual(d.referencia, 'sin_referencia');
  });
});
t('válido solo si hay referencia diaria, está completo y cumple en todas las combinaciones', () => {
  const e = { diario: { proteina: 100, carbo: 100, grasa: 40 }, comidas: [0, 1].map(i => ({ idx: i, nombre: 'C' + i, objetivo: { proteina: 50, carbo: 50, grasa: 20 }, opciones: [{ id: 'x' + i, nombre: 'X', macros: { proteina: 55, carbo: 45, grasa: 22 }, alternativas: [] }] })) };
  assert.strictEqual(C.mcCtrlDia(e, C.mcCtrlConfig(null, null)).estado, 'valido');
  e.comidas[0].opciones[0].macros.carbo = 100;   // +50 de hidratos
  assert.strictEqual(C.mcCtrlDia(e, C.mcCtrlConfig(null, null)).estado, 'fuera');
});
t('las alternativas cuentan: una alternativa que se pasa del tope hace fallar un menú que sin ella pasaba', () => {
  const e = { diario: { proteina: 50, carbo: 50, grasa: 20 }, comidas: [{ idx: 0, nombre: 'C', objetivo: { proteina: 50, carbo: 50, grasa: 20 }, opciones: [{ id: 'a', nombre: 'A', macros: { proteina: 50, carbo: 50, grasa: 20 }, alternativas: [[{ proteina: 0, carbo: 35, grasa: 0 }]] }] }] };
  const d = C.mcCtrlDia(e, C.mcCtrlConfig(null, null)); assert.strictEqual(d.estado, 'fuera'); assert.ok(d.excesos[0].pesa.plato.includes('alternativas'));
});
t('kcal es informativa: no cambia el estado aunque se supere la tolerancia configurada', () => {
  const e = { diario: { proteina: 100, carbo: 100, grasa: 40 }, comidas: [0, 1].map(i => ({ idx: i, nombre: 'C' + i, objetivo: { proteina: 50, carbo: 50, grasa: 20 }, opciones: [{ id: 'x' + i, nombre: 'X', macros: { proteina: 58, carbo: 58, grasa: 28 }, alternativas: [] }] })) };
  const d = C.mcCtrlDia(e, C.mcCtrlConfig({ tolDiaKcal: 50 }, null));
  assert.strictEqual(d.kcal.supera, true); assert.strictEqual(d.kcal.modo, 'informar'); assert.ok(d.kcal.alto > 50);
  assert.ok(d.estado === 'valido' || d.estado === 'fuera'); assert.strictEqual(d.excesos.some(x => x.k === 'kcal'), false);
});
t('enumeración: se declara «omitido» si hay demasiadas combinaciones (no se inventa nada)', () => {
  const e = entradaAleatoria(rng(1), {}); const r = C.mcCtrlEnumerar(e.comidas, null, { proteina: 20, carbo: 20, grasa: 20 }, 2);
  assert.strictEqual(r.modo, 'omitido');
});
t('enumeración: cuenta combinaciones reales fuera de tolerancia (un solo macro y varios a la vez)', () => {
  const mk = (p, c, g) => ({ proteina: p, carbo: c, grasa: g }), ob = mk(50, 50, 20);
  const e = { diario: mk(100, 100, 40), comidas: [0, 1].map(i => ({ idx: i, nombre: 'C' + i, objetivo: ob, opciones: [{ id: 'a', nombre: 'ok', macros: ob, alternativas: [] }, { id: 'b', nombre: 'carbo+30', macros: mk(50, 80, 20), alternativas: [] }, { id: 'c', nombre: 'todo+25', macros: mk(75, 75, 45), alternativas: [] }] })) };
  const r = C.mcCtrlEnumerar(e.comidas, C.mcCtrlBrecha(e.diario, e.comidas), { proteina: 20, carbo: 20, grasa: 20 });
  assert.strictEqual(r.total, 9); assert.ok(r.fueraAlguno > 0 && r.fueraVarios > 0 && r.fueraVarios <= r.fueraAlguno);
  // a mano: 9 combinaciones; solo (ok,ok) cumple. (ok,b): carbo+30 fuera. (ok,c),(c,ok): 3 macros fuera. (b,b): carbo+60. (b,c),(c,b): carbo+55.. P+25 fuera. (c,c): todo.
  assert.strictEqual(r.fueraAlguno, 8); assert.ok(r.peorKcalAlto.platos.length === 2);
});
t('mcCtrlConfig: sin configuración usa el tope actual del menú; valores raros caen al tope; kcal por defecto sin límite', () => {
  assert.deepStrictEqual(JSON.parse(JSON.stringify(C.mcCtrlConfig(null, null))), { tolDia: { proteina: 20, carbo: 20, grasa: 20 }, tolDiaKcal: null, modoKcal: 'informar', margenPlatoKcal: null });
  const c = C.mcCtrlConfig({ tolDia: { proteina: 'x', carbo: 30 }, tolDiaKcal: '' }, { tope: { proteina: 15, carbo: 25, grasa: 18 } });
  assert.deepStrictEqual(JSON.parse(JSON.stringify(c.tolDia)), { proteina: 15, carbo: 30, grasa: 18 }); assert.strictEqual(c.tolDiaKcal, null);
});

// ── 4. Coherencia kcal vs 4/4/9 en el catálogo estático V2 (112 alimentos) ──────────────
t('coherencia kcal: el cálculo funciona y señala los alimentos conocidos (V2)', () => {
  const V2 = C.NUTRI_CATALOGO_V2, lista = Object.keys(V2).map(k => ({ id: k, ...V2[k] })), res = C.mcCtrlCoherenciaKcal(lista), mal = res.filter(x => x.incoherente).map(x => x.id);
  assert.strictEqual(res.length, 112); ['aguacate', 'datiles', 'mejillones', 'tempeh'].forEach(id => assert.ok(mal.includes(id), id + ' debería estar señalado'));
  informe.push('      (V2: ' + mal.length + ' de 112 con diferencia > máx(10 kcal, 5 %): ' + mal.join(', ') + ')');
});

console.log('\nCONTROL V2 · pruebas matemáticas\n' + informe.join('\n') + `\n\n${ok} correctas, ${fallos} fallidas`);
process.exit(fallos ? 1 : 0);
