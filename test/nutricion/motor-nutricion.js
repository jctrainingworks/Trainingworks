/* ════════════════════════════════════════════════════════════════════════════
   motor-nutricion.js — Motor de cálculo de nutrición · JC Training Works
   ────────────────────────────────────────────────────────────────────────────
   LEER ANTES DE TOCAR: REGLAS-NUTRICION.md (raíz del repo). Manda sobre este archivo.
   Este archivo es el ÚNICO sitio donde vive el cálculo de nutrición. Solo cálculo:
   sin pantallas, sin Supabase, sin estado. Se carga con <script src> (global
   MotorNutricion) y con require() en Node (pruebas en nuevo/pruebas/).

   Qué hace (resumen de las reglas):
   · Manda el TOTAL DEL DÍA de cada macro (proteína, carbohidratos, grasa). Las kcal son secundarias.
   · Cada comida tiene un tamaño orientativo ("guía") por macro, sin porcentajes: modo igual / fijo / libre.
     La guía solo orienta el tamaño de la comida; el total del día es lo que se cumple.
   · El cliente elige 1 alimento por bloque (carbohidrato, proteína, grasa) o 2 (reparto 50/50 por defecto).
     Las cantidades se recalculan solas para llegar al total del día.
   · Tope duro por alimento y comida (ración máxima) y mínimo (1 unidad / un tercio del tope):
     nunca se supera el tope ni sale una cantidad irrisoria. Si un bloque pidiera menos del mínimo, no entra
     en esa comida y los demás bloques compensan.
   · Fruta y "para acompañar" (16-oct-2026, OK de Juan): bloques que reescalan como los demás. Cada alimento aporta los tres
     macros y el motor ajusta su cantidad (tope duro y mínimo incluidos) para que el día cuadre. Cualquier alimento del catálogo
     puede ir en cualquier bloque si aporta ese macro. Los carbohidratos que Juan fija para la fruta / el acompañante son una
     guía suave de tamaño, no una cantidad fija. (Las porciones fijas antiguas, comida.fijos, siguen aceptándose.)
   · Si el día no llega, se dice con números y por qué; nunca un bloque vacío sin explicación.

   SUPUESTOS que las reglas no fijan (decididos aquí, a revisar con Juan):
   · Peso de las guías frente al total del día: ver PESO_DIA / PESO_GUIA / PESO_GUIA_LIBRE.
   · "igual" reparte lo que queda tras los "fijo" a partes iguales entre las comidas no fijas; "libre" recibe la
     misma cifra pero con peso muy bajo (el motor la mueve casi sin coste).
   · Mínimo en alimentos por unidad = max(1, floor(tope_unidades / 3)); por gramos = tope / 3 redondeado hacia
     arriba a múltiplos de 5 g. Alimento sin tope: máximo ilimitado y mínimo MIN_SIN_TOPE_G.
   · Gramos a múltiplos de 5 g; alimentos por unidad, unidades enteras.
   ════════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const VERSION = '1.4.0 · 17-oct-2026';
  const MACROS = ['proteina', 'carbohidratos', 'grasa'];
  const NOMBRE_MACRO = { proteina: 'proteína', carbohidratos: 'carbohidratos', grasa: 'grasa' };
  const TIPO_MACRO = { proteina: 'proteina', carbohidrato: 'carbohidratos', grasa: 'grasa' };
  const NOMBRE_TIPO = { proteina: 'Proteína', carbohidrato: 'Carbohidrato', grasa: 'Grasa', fruta: 'Fruta', acompanante: 'Para acompañar' };
  const ES_EXTRA = { fruta: true, acompanante: true };   // bloques opcionales: la fruta (dominante carbohidratos) y lo que va para acompañar (dominante = su macro principal)

  const PASO_G = 5;                 // los gramos se redondean a múltiplos de 5
  const MIN_FRACCION_TOPE = 1 / 3;  // mínimo = un tercio del tope (regla de Juan, 15-oct-2026)
  const MIN_SIN_TOPE_G = 20;        // solo si un alimento no tiene tope en el catálogo
  const MARGEN_DEFECTO = 0.10;      // ±10 % por macro sobre el total del día

  // Función objetivo (todo relativo al total diario de cada macro):
  //   PESO_DIA · Σ_macros ((total_día − objetivo)/objetivo)²   +   Σ_comidas,macros peso_guía · ((macro_comida − guía)/objetivo_día)²
  const PESO_DIA = 100;
  const PESO_GUIA = 2;
  const PESO_GUIA_LIBRE = 0.2;
  const PESO_EXTRA = 2;          // guía suave de tamaño de fruta / acompañante (mismo peso que la guía de una comida)
  const RIDGE = 1e-8;

  const r1 = n => Math.round(n * 10) / 10;
  const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);

  // ── Límites de un alimento en UNA comida ───────────────────────────────────
  function limitesAlimento(al) {
    const gpu = al.gramosPorUnidad > 0 ? al.gramosPorUnidad : 0;
    if (gpu) {
      const topeU = al.racionMaximaUnidades > 0 ? al.racionMaximaUnidades
        : (al.racionMaximaG > 0 ? Math.max(1, Math.floor(al.racionMaximaG / gpu)) : Infinity);
      const minU = topeU === Infinity ? 1 : Math.max(1, Math.floor(topeU * MIN_FRACCION_TOPE + 1e-9));
      return { porUnidad: true, paso: gpu, minU, maxU: topeU, minG: minU * gpu, maxG: topeU * gpu };
    }
    const tope = al.racionMaximaG > 0 ? al.racionMaximaG : Infinity;
    if (tope === Infinity) return { porUnidad: false, paso: PASO_G, minG: MIN_SIN_TOPE_G, maxG: Infinity };
    const maxG = tope < PASO_G ? tope : Math.floor(tope / PASO_G) * PASO_G;
    const minG = Math.min(maxG, Math.max(PASO_G, Math.ceil(tope * MIN_FRACCION_TOPE / PASO_G - 1e-9) * PASO_G));
    return { porUnidad: false, paso: PASO_G, minG, maxG };
  }

  // Cantidad real (redondeada y dentro de límites) para unos gramos pedidos.
  function cantidad(lim, g) {
    if (lim.porUnidad) {
      const u = Math.min(lim.maxU, Math.max(lim.minU, Math.round(g / lim.paso)));
      return { gramos: r1(u * lim.paso), unidades: u };
    }
    const q = Math.min(lim.maxG, Math.max(lim.minG, Math.round(g / PASO_G) * PASO_G));
    return { gramos: q, unidades: null };
  }

  function macrosAlimento(al, g) {
    const f = g / 100, p = (al.proteina || 0) * f, c = (al.carbohidratos || 0) * f, gr = (al.grasa || 0) * f;
    return { kcal: typeof al.kcal === 'number' ? al.kcal * f : 4 * p + 4 * c + 9 * gr, proteina: p, carbohidratos: c, grasa: gr };
  }

  // ── Revisión de los datos de los alimentos (lo que viene del Gestor puede traer errores) ──
  // Devuelve una lista de problemas { key, nombre, texto }. No cambia nada: solo avisa.
  function revisarAlimentos(catalogo, keys, objetivo, nComidas) {
    const out = [];
    (keys || []).forEach(key => {
      const al = catalogo[key]; if (!al) { out.push({ key, nombre: key, texto: 'no está en el catálogo' }); return; }
      const P = Number(al.proteina), C = Number(al.carbohidratos), G = Number(al.grasa);
      const add = t => out.push({ key, nombre: al.nombre || key, texto: t });
      if (![P, C, G].every(x => isFinite(x) && x >= 0)) { add('macros por 100 g no válidos'); return; }
      if (P + C + G > 100.5) add(`proteína + carbohidratos + grasa suman ${r1(P + C + G)} g por cada 100 g (no puede pasar de 100)`);
      if (P + C + G < 1) add('no aporta macros (todo a 0)');
      const kc = Number(al.kcal);
      if (kc > 0) { const est = 4 * P + 4 * C + 9 * G; if (est > 0 && Math.abs(kc - est) / est > 0.35) add(`las kcal (${r1(kc)}) no cuadran con los macros (${r1(est)} kcal por 100 g)`); }
      const lim = limitesAlimento(al);
      if (!(lim.maxG < Infinity)) add('no tiene ración máxima en el Gestor (el motor no puede limitarlo)');
      else if (lim.maxG > 1000) add(`ración máxima muy alta (${lim.maxG} g)`);
      // El mínimo (1/3 de la ración máxima) se aplica siempre que el alimento entra: si ya aporta más de lo que le toca
      // a una comida, el día se pasa por mucho que se reescale. Casi siempre es una ración máxima mal puesta.
      if (objetivo && nComidas > 0 && lim.maxG < Infinity) {
        [['proteina', 'proteína'], ['carbohidratos', 'carbohidratos'], ['grasa', 'grasa']].forEach(([k, nom]) => {
          const aporta = lim.minG * (Number(al[k]) || 0) / 100, porComida = (objetivo[k] || 0) / nComidas;
          if (aporta > Math.max(porComida * 1.5, 15)) add(`con su mínimo (${r1(lim.minG)} g, un tercio de su ración máxima de ${r1(lim.maxG)} g) ya aporta ${Math.round(aporta)} g de ${nom}; a una comida le tocan unos ${Math.round(porComida)} g. Revisa su ración máxima`);
        });
      }
      if (al.gramosPorUnidad > 0 && al.gramosPorUnidad > 1000) add(`gramos por unidad muy altos (${al.gramosPorUnidad} g)`);
    });
    return out;
  }

  // ── Guía de cada comida: modos igual / fijo / libre (sin porcentajes) ──────
  // comidas[i].reparto = { proteina:{modo,g}, carbohidratos:{modo,g}, grasa:{modo,g} }; lo que falte = 'igual'.
  function repartoPorComida(objetivo, comidas, margen) {
    margen = margen == null ? MARGEN_DEFECTO : margen;
    const avisos = [];
    const guia = comidas.map(() => [0, 0, 0]);
    const modo = comidas.map(() => ['igual', 'igual', 'igual']);
    MACROS.forEach((k, ki) => {
      const total = Number(objetivo && objetivo[k]) || 0;
      let fijoSuma = 0, repartibles = 0;
      comidas.forEach((c, mi) => {
        const r = (c.reparto && c.reparto[k]) || { modo: 'igual' };
        const md = (r.modo === 'fijo' && Number(r.g) >= 0) ? 'fijo' : (r.modo === 'libre' ? 'libre' : 'igual');
        modo[mi][ki] = md;
        if (md === 'fijo') { guia[mi][ki] = Number(r.g); fijoSuma += Number(r.g); } else repartibles++;
      });
      const resto = total - fijoSuma;
      comidas.forEach((c, mi) => { if (modo[mi][ki] !== 'fijo') guia[mi][ki] = repartibles ? Math.max(resto, 0) / repartibles : 0; });
      if (fijoSuma > total * (1 + margen) + 1e-9) {
        avisos.push({ tipo: 'reparto', macro: k, texto: `Has fijado ${r1(fijoSuma)} g de ${NOMBRE_MACRO[k]} entre las comidas y el total del día es ${r1(total)} g: te pasas ${r1(fijoSuma - total)} g.` });
      } else if (!repartibles && fijoSuma < total * (1 - margen) - 1e-9) {
        avisos.push({ tipo: 'reparto', macro: k, texto: `Las comidas fijadas suman ${r1(fijoSuma)} g de ${NOMBRE_MACRO[k]} y el total del día es ${r1(total)} g: faltan ${r1(total - fijoSuma)} g.` });
      }
    });
    return { guia, modo, avisos };
  }

  // Macro dominante de un bloque "para acompañar": el que más kcal aporta entre sus alimentos (que todos aporten).
  function macroDominanteExtra(cat, alimentos) {
    const als = (alimentos || []).map(a => a && cat[a.key]).filter(Boolean);
    if (!als.length) return 'carbohidratos';
    const kc = al => 4 * (al.proteina || 0) + 4 * (al.carbohidratos || 0) + 9 * (al.grasa || 0);
    const puntua = k => als.reduce((t, al) => t + (kc(al) > 0 ? (k === 'grasa' ? 9 : 4) * (al[k] || 0) / kc(al) : 0), 0);
    const comunes = MACROS.filter(k => als.every(al => al[k] > 0));
    const pool = comunes.length ? comunes : MACROS.filter(k => als[0][k] > 0);
    if (!pool.length) return 'carbohidratos';
    return pool.reduce((m, k) => (puntua(k) > puntua(m) ? k : m), pool[0]);
  }

  // ── Preparación de la entrada ──────────────────────────────────────────────
  function preparar(ent, margen) {
    const cat = ent.catalogo || {};
    const avisos = [];
    const T = MACROS.map(k => Number(ent.objetivo && ent.objetivo[k]) || 0);
    const rep = repartoPorComida(ent.objetivo, ent.comidas, margen);
    rep.avisos.forEach(a => avisos.push(a));
    const comidas = ent.comidas.map((c, mi) => {
      const nombre = c.nombre || ('Comida ' + (mi + 1));
      const fijosItems = [], fijosM = [0, 0, 0, 0];
      (c.fijos || []).forEach(f => {
        const al = cat[f.key];
        if (!al) { avisos.push({ tipo: 'alimento', texto: `${nombre}: el alimento "${f.key}" no está en el catálogo y se ignora.` }); return; }
        const gr = f.gramos > 0 ? f.gramos : (f.unidades > 0 && al.gramosPorUnidad ? f.unidades * al.gramosPorUnidad : 0);
        if (!(gr > 0)) return;
        const m = macrosAlimento(al, gr);
        fijosItems.push({ key: f.key, nombre: al.nombre, gramos: r1(gr), unidades: (f.unidades > 0 && al.gramosPorUnidad) ? f.unidades : null, macros: m, fija: true });
        fijosM[0] += m.proteina; fijosM[1] += m.carbohidratos; fijosM[2] += m.grasa; fijosM[3] += m.kcal;
      });
      return { nombre, guia: rep.guia[mi], modo: rep.modo[mi], fijosItems, fijosM, bloques: [] };
    });
    const bloques = [];
    ent.comidas.forEach((c, mi) => (c.bloques || []).forEach(b => {
      const nombreComida = comidas[mi].nombre;
      const dom = ES_EXTRA[b.tipo] ? (b.tipo === 'fruta' ? 'carbohidratos' : macroDominanteExtra(cat, b.alimentos)) : TIPO_MACRO[b.tipo];
      if (!dom) { avisos.push({ tipo: 'bloque', texto: `${nombreComida}: tipo de bloque no válido "${b.tipo}".` }); return; }
      const domK = MACROS.indexOf(dom);
      const pedidos = (b.alimentos || []).filter(a => a && a.key);
      const validos = pedidos.filter(a => {
        const al = cat[a.key];
        if (!al) { avisos.push({ tipo: 'alimento', texto: `${nombreComida} · ${NOMBRE_TIPO[b.tipo]}: el alimento "${a.key}" no está en el catálogo.` }); return false; }
        if (!(al[dom] > 0)) { avisos.push({ tipo: 'alimento', texto: `${nombreComida} · ${NOMBRE_TIPO[b.tipo]}: ${al.nombre} no aporta ${NOMBRE_MACRO[dom]}.` }); return false; }
        // Tope duro (regla 4): sin ración máxima el motor no tiene freno, así que no usa ese alimento hasta que la tenga.
        if (!(limitesAlimento(al).maxG < Infinity)) { avisos.push({ tipo: 'alimento', texto: `${nombreComida} · ${NOMBRE_TIPO[b.tipo]}: ${al.nombre} no tiene ración máxima en el Gestor, así que no se usa. Ponle una.` }); return false; }
        return true;
      });
      const todosPct = validos.length > 0 && validos.every(a => a.pct > 0);
      const suma = todosPct ? validos.reduce((s, a) => s + a.pct, 0) : 0;
      const foods = validos.map(a => {
        const al = cat[a.key];
        const share = todosPct ? a.pct / suma : 1 / validos.length;
        const lim = limitesAlimento(al);
        const dens = share * 100 / al[dom];                       // g de alimento por g del macro dominante del bloque
        return { key: a.key, al, lim, share, dens, m100: [al.proteina || 0, al.carbohidratos || 0, al.grasa || 0] };
      });
      const u = [0, 0, 0];
      foods.forEach(f => { for (let k = 0; k < 3; k++) u[k] += f.dens * f.m100[k] / 100; });
      let hi = Infinity, lo = 0;
      foods.forEach(f => { hi = Math.min(hi, f.lim.maxG / f.dens); lo = Math.max(lo, f.lim.minG / f.dens); });
      if (!foods.length) { hi = 0; lo = 0; }
      if (lo > hi) { avisos.push({ tipo: 'bloque', texto: `${nombreComida} · ${NOMBRE_TIPO[b.tipo]}: el reparto entre los 2 alimentos no cabe entre sus mínimos y sus topes.` }); lo = hi; }
      const bl = { m: mi, tipo: b.tipo, domK, foods, u, lo, hi, sinAlimento: !foods.length, objG: null, postre: b.postre || null };
      if (ES_EXTRA[b.tipo] && foods.length) {
        // Guía suave de tamaño: los carbos que fija Juan (si el macro dominante es el carbohidrato) o, si no, el mínimo del alimento.
        const g0 = (dom === 'carbohidratos' && Number(b.carbos) > 0) ? Number(b.carbos) : lo;
        bl.objG = clamp(g0, lo, hi);
      }
      comidas[mi].bloques.push(bl);
      bloques.push(bl);
    }));
    return { T, comidas, bloques, avisos };
  }

  // ── Resolver un día completo ───────────────────────────────────────────────
  // ent = { catalogo, objetivo:{proteina,carbohidratos,grasa[,kcal]}, comidas:[{ nombre, reparto, bloques:[{tipo, alimentos:[{key,pct}]}], fijos:[{key,gramos|unidades}] }], opciones:{margen} }
  // El total del día manda y las guías de cada comida solo orientan (regla 1). Si con el peso normal de las guías el día
  // se sale del margen, se repite bajando el peso de las guías (×0,1, ×0,01, ×0,001): una comida puede quedarse corta de un
  // macro y la siguiente compensar. Se queda el primer intento que cuadra; si ninguno cuadra, el que deja el día más cerca.
  const ESCALAS_GUIA = [1, 0.1, 0.01, 0.001];
  const desvMax = r => Math.max.apply(null, MACROS.map(k => Math.abs(r.desviacion[k].pct)));
  // POSTRES (opcional, prototipo 17-oct-2026). comida.postres = [{ nombre, bloques:[{ tipo, alimentos:[keys] }] }]: cada postre es una
  // mini-comida con lógica (yogur; yogur con miel; yogur con fruta; yogur con frutos secos; fruta...). Como hace una persona ("me quedo
  // corto, me tomo un yogur de postre"): si con lo elegido el día no cuadra y un macro se queda corto, se AÑADE a una comida un postre
  // que aporte ese macro (como mucho uno por comida y dos por día) y se recalcula. Solo los postres que Juan define para esa comida.
  const macroDeBloque = (cat, tipo, key) => (tipo === 'fruta' ? 'carbohidratos' : ES_EXTRA[tipo] ? macroDominanteExtra(cat, [{ key }]) : TIPO_MACRO[tipo]);
  function variantesPostre(po) {   // producto de los alimentos posibles de cada bloque del postre
    let acc = [[]];
    po.bloques.forEach(b => { const nuevo = []; acc.forEach(pre => b.alimentos.forEach(k => nuevo.push(pre.concat([{ tipo: b.tipo, alimentos: [{ key: k }], postre: po.nombre }])))); acc = nuevo; });
    return acc;
  }
  function resolverDia(ent) {
    const r = resolverDiaBase(ent, false);
    if (r.ok || !ent.comidas.some(c => c.postres && c.postres.length)) return r;
    let cur = r, curDev = desvMax(r), entCur = ent; const conPostre = new Set();
    for (let nivel = 0; nivel < 2 && !cur.ok; nivel++) {
      const cortos = MACROS.filter(k => cur.total[k] < cur.objetivo[k] * (1 - 1e-9));
      if (!cortos.length) break;
      let mejorR = null, mejorD = curDev, mejorEnt = null, mejorMi = -1;
      for (let mi = 0; mi < entCur.comidas.length; mi++) {
        const cm = entCur.comidas[mi];
        if (conPostre.has(mi) || cm.modo === 'libre' || !cm.postres || !cm.postres.length) continue;
        for (const po of cm.postres) for (const v of variantesPostre(po)) {
          if (!v.some(b => cortos.includes(macroDeBloque(entCur.catalogo, b.tipo, b.alimentos[0].key)))) continue;
          const ent2 = Object.assign({}, entCur, { comidas: entCur.comidas.map((c, j) => (j !== mi ? c : Object.assign({}, c, { bloques: c.bloques.concat(v) }))) });
          const r2 = resolverDiaBase(ent2, true);
          if (r2.ok) { r2.postresAnadidos = nivel + 1; return r2; }
          const d2 = desvMax(r2);
          if (d2 < mejorD - 1e-9) { mejorD = d2; mejorR = r2; mejorEnt = ent2; mejorMi = mi; }
        }
      }
      if (!mejorR) break;
      conPostre.add(mejorMi); entCur = mejorEnt;
      cur = resolverDiaBase(entCur, false); cur.postresAnadidos = nivel + 1; curDev = desvMax(cur);
    }
    return cur;
  }
  function resolverDiaBase(ent, ligero) {
    // Mínimos cuadrados no es lo mismo que «dentro del margen»: puede dejar un macro al -12 % cuando existe un reparto con los tres al
    // -9 %. Si el día no cuadra, se reponderan los macros que más se alejan (aproxima el mínimo de la peor desviación) y se repite.
    let mejor = null, peor = Infinity, escala = 1, wmMejor = [1, 1, 1];
    const escalas = ligero ? [1, 0.05] : ESCALAS_GUIA, iters = ligero ? 3 : 6;   // ligero: para probar muchos postres rápido
    for (let i = 0; i < escalas.length; i++) {
      let wm = [1, 1, 1];
      for (let it = 0; it < iters; it++) {
        const r = resolverDiaConGuias(ent, escalas[i], null, wm);
        if (r.ok) return r;
        const devs = MACROS.map(k => Math.abs(r.desviacion[k].pct)), dmax = Math.max.apply(null, devs);
        if (dmax < peor - 1e-12) { peor = dmax; mejor = r; escala = escalas[i]; wmMejor = wm.slice(); }
        wm = wm.map((w, j) => w * (1 + 3 * Math.pow(devs[j] / (dmax || 1), 2)));
      }
    }
    if (ligero) return mejor;
    // Reparación: si algún macro se pasa, probar a que no entre alguno de los bloques que lo aportan (otra comida compensa).
    // Solo se prueban bloques que aportan un macro que está por encima del objetivo; se queda lo que acerca más el día.
    let cur = mejor, dev = peor; const fuera = new Set();
    for (let ronda = 0; ronda < 6; ronda++) {
      const sobra = MACROS.filter(k => cur.total[k] > cur.objetivo[k] + 1e-9);
      if (!sobra.length) break;
      const cands = []; let idx = -1;
      cur.comidas.forEach(c => c.bloques.forEach(bl => { idx++; if (!bl.sinAlimento && bl.items.length && !fuera.has(idx) && sobra.some(k => bl.macros[k] > 0.5)) cands.push(idx); }));
      let mejorR = null, mejorD = dev, mejorI = -1;
      for (const i of cands) {
        const f2 = new Set(fuera); f2.add(i);
        const r = resolverDiaConGuias(ent, escala, f2, wmMejor);
        if (r.ok) return r;
        const d = desvMax(r);
        if (d < mejorD - 1e-9) { mejorD = d; mejorR = r; mejorI = i; }
      }
      if (mejorI < 0) break;
      fuera.add(mejorI); cur = mejorR; dev = mejorD;
    }
    return cur;
  }
  function resolverDiaConGuias(ent, escalaGuia, fuera, wm) {
    wm = wm || [1, 1, 1];   // multiplicadores del peso del día por macro (reponderación minimax)
    const margen = (ent.opciones && ent.opciones.margen != null) ? ent.opciones.margen : MARGEN_DEFECTO;
    const P = preparar(ent, margen);
    const B = P.bloques, nB = B.length, nM = P.comidas.length, T = P.T;
    const invT2 = T.map(t => 1 / (Math.max(t, 1) * Math.max(t, 1)));
    const W = P.comidas.map(c => c.modo.map(md => (md === 'libre' ? PESO_GUIA_LIBRE : PESO_GUIA) * escalaGuia));
    const WX = PESO_EXTRA * escalaGuia;
    const G = P.comidas.map(c => c.guia);

    const s = new Float64Array(nB);                 // g del macro dominante que aporta cada bloque
    const libre = new Array(nB).fill(true);
    const Mm = P.comidas.map(c => [c.fijosM[0], c.fijosM[1], c.fijosM[2]]);
    const D = [0, 0, 0];
    Mm.forEach(m => { for (let k = 0; k < 3; k++) D[k] += m[k]; });

    for (let b = 0; b < nB; b++) {
      if (B[b].sinAlimento || (fuera && fuera.has(b))) { libre[b] = false; continue; }
      const ini = B[b].objG != null ? B[b].objG : clamp(G[B[b].m][B[b].domK], 0, B[b].hi);
      s[b] = ini;
      for (let k = 0; k < 3; k++) { Mm[B[b].m][k] += ini * B[b].u[k]; D[k] += ini * B[b].u[k]; }
    }

    const descenso = (maxIt) => {
      for (let it = 0; it < maxIt; it++) {
        let maxD = 0;
        for (let b = 0; b < nB; b++) {
          if (!libre[b]) continue;
          const bl = B[b], w = W[bl.m], g0 = G[bl.m], mm = Mm[bl.m];
          let g = 0, h = 2 * RIDGE;
          for (let k = 0; k < 3; k++) {
            const uk = bl.u[k]; if (!uk) continue;
            const wd = PESO_DIA * wm[k] * invT2[k], wg = w[k] * invT2[k];
            g += 2 * uk * (wd * (D[k] - T[k]) + wg * (mm[k] - g0[k]));
            h += 2 * uk * uk * (wd + wg);
          }
          if (bl.objG != null) { const wx = WX * invT2[bl.domK]; g += 2 * wx * (s[b] - bl.objG); h += 2 * wx; }
          const ns = clamp(s[b] - g / h, 0, bl.hi);
          const d = ns - s[b];
          if (d !== 0) {
            s[b] = ns;
            for (let k = 0; k < 3; k++) { D[k] += d * bl.u[k]; mm[k] += d * bl.u[k]; }
            if (Math.abs(d) > maxD) maxD = Math.abs(d);
          }
        }
        if (maxD < 2e-3) break;
      }
    };
    const Jcont = () => {
      let J = 0;
      for (let k = 0; k < 3; k++) {
        const e = D[k] - T[k]; J += PESO_DIA * wm[k] * e * e * invT2[k];
        for (let m = 0; m < nM; m++) { const e2 = Mm[m][k] - G[m][k]; J += W[m][k] * e2 * e2 * invT2[k]; }
      }
      for (let b = 0; b < nB; b++) if (B[b].objG != null && !B[b].sinAlimento) { const e3 = s[b] - B[b].objG; J += WX * e3 * e3 * invT2[B[b].domK]; }
      return J;
    };
    const foto = () => ({ s: Float64Array.from(s), libre: libre.slice(), Mm: Mm.map(m => m.slice()), D: D.slice() });
    const volver = (f) => { for (let b = 0; b < nB; b++) { s[b] = f.s[b]; libre[b] = f.libre[b]; } Mm.forEach((m, i) => { m[0] = f.Mm[i][0]; m[1] = f.Mm[i][1]; m[2] = f.Mm[i][2]; }); D[0] = f.D[0]; D[1] = f.D[1]; D[2] = f.D[2]; };
    const fijarEn = (b, v) => {
      const d = v - s[b];
      for (let k = 0; k < 3; k++) { D[k] += d * B[b].u[k]; Mm[B[b].m][k] += d * B[b].u[k]; }
      s[b] = v; libre[b] = false;
    };

    descenso(3000);
    // Mínimo por alimento: si un bloque pide menos de su mínimo, se prueban las dos salidas (dejarlo en su mínimo
    // o que no entre en esa comida) y se queda la que deja el día más cerca del objetivo. Pedir 5 g de avena
    // (mínimo 40 g) → no entra; pedir 28 g de proteína con mínimo 30 g → entra en el mínimo.
    for (let guardia = 0; guardia < nB + 2; guardia++) {
      let peor = -1, ratio = Infinity;
      for (let b = 0; b < nB; b++) {
        if (libre[b] && s[b] > 0.5 && s[b] < B[b].lo - 1e-6 && s[b] / B[b].lo < ratio) { ratio = s[b] / B[b].lo; peor = b; }
      }
      if (peor < 0) break;
      const f0 = foto();
      fijarEn(peor, B[peor].lo); descenso(3000); const Jmin = Jcont(); const fMin = foto();
      volver(f0);
      fijarEn(peor, 0); descenso(3000); const Jfuera = Jcont();
      if (Jmin <= Jfuera) volver(fMin);
    }
    let tocado = false;
    for (let b = 0; b < nB; b++) if (libre[b] && s[b] <= 0.5) { fijarEn(b, 0); tocado = true; }
    if (tocado) descenso(3000);

    // Pulido con cantidades reales (redondeadas): se prueban pequeños cambios de cada bloque y se queda lo que mejora
    // el día. Cuenta incremental: solo se recalcula el bloque que cambia (antes se recalculaba todo cada vez).
    const contribDe = (b, sv) => {
      const r = [0, 0, 0];
      if (sv <= 0) return r;
      for (const f of B[b].foods) {
        const g = cantidad(f.lim, sv * f.dens).gramos / 100;
        r[0] += g * f.m100[0]; r[1] += g * f.m100[1]; r[2] += g * f.m100[2];
      }
      return r;
    };
    const MR = P.comidas.map(c => [c.fijosM[0], c.fijosM[1], c.fijosM[2]]), DR = [0, 0, 0];
    const contrib = new Array(nB);
    for (let b = 0; b < nB; b++) { contrib[b] = contribDe(b, s[b]); for (let k = 0; k < 3; k++) MR[B[b].m][k] += contrib[b][k]; }
    MR.forEach(m => { for (let k = 0; k < 3; k++) DR[k] += m[k]; });
    const energiaReal = () => {
      let J = 0;
      for (let k = 0; k < 3; k++) {
        for (let m = 0; m < nM; m++) { const e = MR[m][k] - G[m][k]; J += W[m][k] * e * e * invT2[k]; }
        const e = DR[k] - T[k]; J += PESO_DIA * wm[k] * e * e * invT2[k];
      }
      for (let b = 0; b < nB; b++) if (B[b].objG != null) { const e3 = contrib[b][B[b].domK] - B[b].objG; J += WX * e3 * e3 * invT2[B[b].domK]; }
      return J;
    };
    const poner = (b, nuevoC) => {
      const m = B[b].m;
      for (let k = 0; k < 3; k++) { const d = nuevoC[k] - contrib[b][k]; MR[m][k] += d; DR[k] += d; }
      contrib[b] = nuevoC;
    };
    const FACTORES = [0.98, 1.02, 0.95, 1.05, 0.9, 1.1, 0.8, 1.2];
    let Jb = energiaReal();
    for (let pase = 0; pase < 40; pase++) {
      let mejoro = false;
      for (let b = 0; b < nB; b++) {
        if (s[b] <= 0) continue;
        const base = s[b], bl = B[b];
        const f0 = bl.foods[0], pasoDom = f0.lim.paso / f0.dens;
        const cands = FACTORES.map(f => base * f).concat([base + pasoDom, base - pasoDom]);
        let mejorS = base, mejorJ = Jb, mejorC = contrib[b];
        const cBase = contrib[b];
        for (const c0 of cands) {
          const c = clamp(c0, bl.lo, bl.hi);
          if (c === base || c === mejorS) continue;
          const cc = contribDe(b, c);
          poner(b, cc);
          const J = energiaReal();
          if (J < mejorJ - 1e-12) { mejorJ = J; mejorS = c; mejorC = cc; }
          poner(b, cBase);
        }
        if (mejorS !== base) { poner(b, mejorC); s[b] = mejorS; Jb = mejorJ; mejoro = true; }
      }
      if (!mejoro) break;
    }

    // ── Resultado ──
    const total = { kcal: 0, proteina: 0, carbohidratos: 0, grasa: 0 };
    const topes = [];
    const comidasOut = P.comidas.map((c, mi) => {
      const mc = { kcal: c.fijosM[3], proteina: c.fijosM[0], carbohidratos: c.fijosM[1], grasa: c.fijosM[2] };
      const bloquesOut = c.bloques.map(bl => {
        const bi = B.indexOf(bl);
        const items = [], mb = { kcal: 0, proteina: 0, carbohidratos: 0, grasa: 0 };
        if (s[bi] > 0) {
          bl.foods.forEach(f => {
            const q = cantidad(f.lim, s[bi] * f.dens);
            const m = macrosAlimento(f.al, q.gramos);
            items.push({ key: f.key, nombre: f.al.nombre, gramos: q.gramos, unidades: q.unidades, macros: m });
            for (const k in mb) mb[k] += m[k];
            if (q.gramos >= f.lim.maxG - 1e-9) topes.push({ comida: mi, nombreComida: c.nombre, tipo: bl.tipo, key: f.key, nombre: f.al.nombre, gramos: q.gramos });
          });
        }
        for (const k in mb) mc[k] += mb[k];
        return { tipo: bl.tipo, cubierto: s[bi] <= 0, sinAlimento: bl.sinAlimento, items, macros: mb, extra: !!ES_EXTRA[bl.tipo], postre: bl.postre };
      });
      for (const k in mc) total[k] += mc[k];
      return { nombre: c.nombre, guia: { proteina: c.guia[0], carbohidratos: c.guia[1], grasa: c.guia[2] }, modo: { proteina: c.modo[0], carbohidratos: c.modo[1], grasa: c.modo[2] }, fijos: c.fijosItems, bloques: bloquesOut, macros: mc };
    });

    const desviacion = {};
    let ok = true;
    MACROS.forEach((k, ki) => {
      const obj = T[ki], dif = total[k] - obj, pct = obj > 0 ? dif / obj : 0;
      const fuera = obj > 0 ? Math.abs(pct) > margen + 1e-9 : false;
      desviacion[k] = { objetivo: obj, total: total[k], dif, pct, fuera };
      if (fuera) ok = false;
    });
    const avisos = P.avisos.slice();
    MACROS.forEach((k) => {
      const d = desviacion[k]; if (!d.fuera) return;
      avisos.push({ tipo: 'dia', macro: k, texto: `${NOMBRE_MACRO[k][0].toUpperCase() + NOMBRE_MACRO[k].slice(1)}: el día queda en ${Math.round(d.total)} g de ${Math.round(d.objetivo)} g (${d.pct > 0 ? '+' : ''}${Math.round(d.pct * 100)} %).` });
    });
    if (!ok && topes.length) {
      avisos.push({ tipo: 'topes', texto: 'Alimentos en su ración máxima: ' + topes.map(t => `${t.nombreComida} · ${NOMBRE_TIPO[t.tipo]} (${t.nombre}, ${t.gramos} g)`).join('; ') + '.' });
    }
    return { ok, margen, total, objetivo: { proteina: T[0], carbohidratos: T[1], grasa: T[2] }, desviacion, comidas: comidasOut, topes, avisos };
  }

  // ── Probador: muchos días con elecciones del cliente al azar ──────────────
  function crearRng(semilla) {
    let a = (semilla >>> 0) || 1;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ent = { catalogo, objetivo, comidas:[{ nombre, reparto, candidatos:{carbohidrato:[keys],proteina:[],grasa:[],fruta:[],acompanante:[]}, extras:{fruta:{carbos},acompanante:{carbos}}, porciones:[{key,gramos|unidades}] }], opciones:{dias,semilla,margen,probDos} }
  // Generador: cada 25 días cede el control con { hechos, total } para que una pantalla pueda mostrar progreso;
  // al terminar devuelve el informe. probarPlan() lo ejecuta de golpe (pruebas en Node).
  function* probarPlanPasos(ent) {
    const o = Object.assign({ dias: 3000, semilla: 12345, margen: MARGEN_DEFECTO, probDos: 0.15, probPorcion: 0.5 }, ent.opciones || {});
    const rng = crearRng(o.semilla), cat = ent.catalogo;
    const t0 = Date.now();
    const capacidad = (key, tipo) => {
      const al = cat[key], mx = limitesAlimento(al).maxG;
      const m = ES_EXTRA[tipo] ? (tipo === 'fruta' ? (al.carbohidratos || 0) : (al.proteina || 0) + (al.carbohidratos || 0) + (al.grasa || 0)) : (al[TIPO_MACRO[tipo]] || 0);
      return m > 0 ? (mx === Infinity ? 1e9 : mx * m / 100) : 0;
    };
    // Platos con lógica (opcional): comida.platos = [{ nombre, candidatos:{carbohidrato:[],proteina:[],grasa:[],fruta:[],acompanante:[]} }].
    // Cada día el "cliente" elige primero un plato y luego los alimentos de ESE plato (entre los marcados en la comida); un tipo sin lista
    // en el plato usa la lista marcada de la comida. En 'min' / 'max' se usa la unión de los platos. Sin platos, mezcla libre.
    const aplicarPlato = (c, modo) => {
      if (!c.platos || !c.platos.length) return c;
      const cand = c.candidatos || {};
      const TIPOS = ['carbohidrato', 'proteina', 'grasa', 'fruta', 'acompanante'];
      const derivar = pl => { const d = {}; TIPOS.forEach(t => { const base = cand[t] || [], lp = pl.candidatos && pl.candidatos[t]; const f = lp ? base.filter(k => lp.includes(k)) : base; d[t] = (t === 'grasa' && !f.length) ? base : f; }); return d; };
      const validos = c.platos.map(pl => ({ pl, d: derivar(pl) })).filter(x => x.d.carbohidrato.length && x.d.proteina.length);
      if (!validos.length) return c;
      if (modo === 'azar') { const x = validos[Math.floor(rng() * validos.length)]; return Object.assign({}, c, { candidatos: x.d, platoElegido: x.pl.nombre }); }
      const u = {}; TIPOS.forEach(t => { u[t] = Array.from(new Set([].concat.apply([], validos.map(x => x.d[t])))); });
      return Object.assign({}, c, { candidatos: u });
    };
    const elegir = (modo) => ent.comidas.map(c0 => {
      const c = aplicarPlato(c0, modo);
      const bloques = [];
      ['carbohidrato', 'proteina', 'grasa'].forEach(tipo => {
        const cand = ((c.candidatos && c.candidatos[tipo]) || []).filter(k => cat[k]);
        if (!cand.length) return;
        if (modo === 'min' || modo === 'max') {
          const orden = cand.slice().sort((a, b) => capacidad(a, tipo) - capacidad(b, tipo));
          bloques.push({ tipo, alimentos: [{ key: modo === 'min' ? orden[0] : orden[orden.length - 1] }] });
          return;
        }
        const a = cand[Math.floor(rng() * cand.length)];
        if (cand.length > 1 && rng() < o.probDos) {
          let b2 = cand[Math.floor(rng() * cand.length)]; while (b2 === a) b2 = cand[Math.floor(rng() * cand.length)];
          bloques.push({ tipo, alimentos: [{ key: a, pct: 50 }, { key: b2, pct: 50 }] });
        } else bloques.push({ tipo, alimentos: [{ key: a }] });
      });
      // Fruta y para acompañar: bloques opcionales que reescalan como los demás. El "cliente" se lleva uno (o ninguno) de los
      // alimentos marcados; en el caso 'min' no lleva ninguno y en el 'max' el que más aporta. c.extras = { fruta:{carbos}, acompanante:{carbos} }.
      ['fruta', 'acompanante'].forEach(tipo => {
        const cand = ((c.candidatos && c.candidatos[tipo]) || []).filter(k => cat[k]);
        if (!cand.length || modo === 'min') return;
        if (modo === 'max') { const orden = cand.slice().sort((a, b) => capacidad(a, tipo) - capacidad(b, tipo)); bloques.push({ tipo, alimentos: [{ key: orden[orden.length - 1] }], carbos: c.extras && c.extras[tipo] && c.extras[tipo].carbos }); return; }
        if (rng() < o.probPorcion) bloques.push({ tipo, alimentos: [{ key: cand[Math.floor(rng() * cand.length)] }], carbos: c.extras && c.extras[tipo] && c.extras[tipo].carbos });
      });
      // porciones: lista de porciones fijas posibles, o lista de grupos (p. ej. [fruta[], acompañar[]]); de cada grupo
      // el "cliente" se lleva como mucho una porción, y solo a veces (los bloques fruta / acompañar son opcionales).
      const fijos = [];
      const grupos = (c.porciones && c.porciones.length) ? (Array.isArray(c.porciones[0]) ? c.porciones : [c.porciones]) : [];
      grupos.forEach(g => { if (g.length && modo !== 'min' && (modo === 'max' || rng() < o.probPorcion)) fijos.push(g[Math.floor(rng() * g.length)]); });
      return { nombre: c.nombre, reparto: c.reparto, bloques, fijos, plato: c.platoElegido, postres: c.postres };
    });

    const informe = {
      dias: 0, dentro: 0, fuera: 0, pct: 0, margen: o.margen, violaciones: 0, ms: 0,
      porMacro: {}, rango: {}, extremos: {}, diasConPostre: 0, postres: {}, postreGramos: {}, descuadreInterno: 0, fallosSinAviso: 0, ejemplosFallo: [], topesEnFallos: {}, avisosReparto: [], bloquesCubiertos: 0, bloquesTotal: 0,
    };
    MACROS.forEach(k => { informe.porMacro[k] = { fuera: 0, corto: 0, pasa: 0, peorCorto: 0, peorPasa: 0, mediaAbs: 0 }; informe.rango[k] = { min: Infinity, max: -Infinity }; });
    const usados = new Set();
    ent.comidas.forEach(c => { Object.values(c.candidatos || {}).forEach(l => (l || []).forEach(k => usados.add(k))); (c.porciones || []).forEach(g => (Array.isArray(g) ? g : [g]).forEach(p => p && usados.add(p.key))); });
    informe.datos = revisarAlimentos(cat, Array.from(usados), ent.objetivo, ent.comidas.length);
    informe.version = VERSION;
    informe.ficha = Array.from(usados).filter(k => cat[k]).map(k => { const al = cat[k], l = limitesAlimento(al); return { key: k, nombre: al.nombre, p: al.proteina, c: al.carbohidratos, g: al.grasa, topeG: l.maxG === Infinity ? null : l.maxG, minG: l.minG, ud: al.gramosPorUnidad || null }; });
    const modos = ['min', 'max'];
    const nDias = o.dias + modos.length;   // 2 extremos + días al azar
    for (let i = 0; i < nDias; i++) {
      const modo = i < modos.length ? modos[i] : 'azar';
      if (i % 25 === 0) yield { hechos: i, total: nDias };
      const comidas = elegir(modo);
      const res = resolverDia({ catalogo: cat, objetivo: ent.objetivo, comidas, opciones: { margen: o.margen } });
      if (i === 0) informe.avisosReparto = res.avisos.filter(a => a.tipo === 'reparto');
      res.comidas.forEach(c => c.bloques.forEach(b => b.items.forEach(it => {
        const lim = limitesAlimento(cat[it.key]);
        if (it.gramos < lim.minG - 1e-6 || it.gramos > lim.maxG + 1e-6) informe.violaciones++;
      })));
      if (i < modos.length) {   // casos extremos: se informan aparte, no cuentan en el % de días al azar
        informe.extremos[modo] = { ok: res.ok, total: res.total, desviacion: res.desviacion, avisos: res.avisos.map(a => a.texto) };
        continue;
      }
      informe.dias++;
      if (res.ok) informe.dentro++; else informe.fuera++;
      { // control interno: los totales se recalculan desde las cantidades finales y tienen que coincidir con lo que dice el motor
        const rc = { proteina: 0, carbohidratos: 0, grasa: 0 }; let usoComp = false; const nombresPostre = new Set();
        res.comidas.forEach(c => { c.fijos.forEach(f => MACROS.forEach(k => { rc[k] += f.macros[k]; })); c.bloques.forEach(b => b.items.forEach(it => {
          const m = macrosAlimento(cat[it.key], it.gramos); MACROS.forEach(k => { rc[k] += m[k]; });
          if (b.postre) { usoComp = true; nombresPostre.add(`${c.nombre} · ${b.postre}`); const g = informe.postreGramos[it.nombre] || (informe.postreGramos[it.nombre] = { n: 0, min: Infinity, max: 0, suma: 0 }); g.n++; g.suma += it.gramos; g.min = Math.min(g.min, it.gramos); g.max = Math.max(g.max, it.gramos); } })); });
        nombresPostre.forEach(kk => { informe.postres[kk] = (informe.postres[kk] || 0) + 1; });
        if (MACROS.some(k => Math.abs(rc[k] - res.total[k]) > 0.5)) informe.descuadreInterno++;
        if (usoComp) informe.diasConPostre++;
      }
      MACROS.forEach(k => {
        const d = res.desviacion[k], pm = informe.porMacro[k], rg = informe.rango[k];
        pm.mediaAbs += Math.abs(d.pct);
        if (d.fuera) { pm.fuera++; if (d.pct < 0) { pm.corto++; pm.peorCorto = Math.min(pm.peorCorto, d.pct); } else { pm.pasa++; pm.peorPasa = Math.max(pm.peorPasa, d.pct); } }
        rg.min = Math.min(rg.min, d.total); rg.max = Math.max(rg.max, d.total);
      });
      res.comidas.forEach(c => c.bloques.forEach(b => { informe.bloquesTotal++; if (b.cubierto) informe.bloquesCubiertos++; }));
      if (!res.ok) {
        if (!res.avisos.some(a => a.tipo === 'dia')) informe.fallosSinAviso++;
        res.topes.forEach(t => { const kk = `${t.nombreComida} · ${NOMBRE_TIPO[t.tipo]} · ${t.nombre}`; informe.topesEnFallos[kk] = (informe.topesEnFallos[kk] || 0) + 1; });
        if (informe.ejemplosFallo.length < 5) informe.ejemplosFallo.push({ modo, total: res.total, desviacion: res.desviacion, avisos: res.avisos.map(a => a.texto),
          detalle: res.comidas.map(c => ({ nombre: c.nombre,
            items: [].concat(c.fijos.map(f => ({ nombre: f.nombre, gramos: f.gramos, unidades: f.unidades, fija: true, p: f.macros.proteina, c: f.macros.carbohidratos, g: f.macros.grasa })),
              ...c.bloques.map(b => b.items.map(it => ({ nombre: it.nombre, gramos: it.gramos, unidades: it.unidades, p: it.macros.proteina, c: it.macros.carbohidratos, g: it.macros.grasa })))) })),
          eleccion: comidas.map(c => `${c.nombre}${c.plato ? ' (' + c.plato + ')' : ''}: ` + c.bloques.map(b => b.alimentos.map(a => a.key).join('+')).join(' / ')) });
      }
    }
    MACROS.forEach(k => { informe.porMacro[k].mediaAbs /= informe.dias; });
    informe.pct = informe.dentro / informe.dias;
    informe.ms = Date.now() - t0;
    return informe;
  }

  function probarPlan(ent) { const g = probarPlanPasos(ent); let r; while (!(r = g.next()).done); return r.value; }

  const api = { VERSION, revisarAlimentos, probarPlanPasos, MACROS, MARGEN_DEFECTO, limitesAlimento, cantidad, repartoPorComida, resolverDia, probarPlan };
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.MotorNutricion = api;
})();
