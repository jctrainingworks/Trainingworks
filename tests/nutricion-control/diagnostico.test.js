// PASO 0 · Prueba del diagnóstico de solo lectura con datos sintéticos: node diagnostico.test.js
const assert = require('assert'), { cargar } = require('./cargar.js');
const catalogo = [
  { id: 'prot', nombre: 'Proteína', kcal_100g: 80, proteina_100g: 20, carbo_100g: 0, grasa_100g: 0 },
  { id: 'carb', nombre: 'Hidrato', kcal_100g: 200, proteina_100g: 0, carbo_100g: 50, grasa_100g: 0 },
  { id: 'gras', nombre: 'Grasa', kcal_100g: 450, proteina_100g: 0, carbo_100g: 0, grasa_100g: 50 },
  { id: 'alt', nombre: 'Alternativa', kcal_100g: 240, proteina_100g: 0, carbo_100g: 60, grasa_100g: 0 },
  { id: 'nuez', nombre: 'Nueces', kcal_100g: 654, proteina_100g: 15, carbo_100g: 14, grasa_100g: 65 },   // como el catálogo real: declara ≈ 7 % menos que 4/4/9
];
const ing = (id, g, extra) => ({ alimento_id: id, nombre: id, gramos: g, ...(extra || {}) });
const plato = (nombre, p, c, g, principal, extra) => ({ id: nombre, nombre, principal: !!principal, ingredientes: [ing('prot', p, extra && extra.alt ? { alternativas: [{ alimento_id: 'alt', gramos: extra.alt }] } : {}), ing('carb', c), ing('gras', g)],
  macros: { kcal: 0, proteina: p * 0.2, carbohidratos: c * 0.5, grasa: g * 0.5 } });
const comida = (nombre, platos) => ({ id: 'c', nombre, platos });
const objetivo = { proteinaGKg: 2.0, grasaGKg: 0.8, carbohidratos: 250, numComidas: 4, diaSinEntreno: { activo: true, carbosMenos: 60, diasSemana: [false, false, false, false, false, true, true], periodos: [] } };
const base4 = () => ['Desayuno', 'Comida', 'Merienda', 'Cena'].map(n => comida(n, [plato(n + '-A', 200, 125, 32, true), plato(n + '-B', 225, 115, 36)]));
const rest4 = () => ['Desayuno', 'Comida', 'Merienda', 'Cena'].map(n => comida(n, [plato(n + '-A', 200, 95, 32, true), plato(n + '-B', 225, 90, 36)]));
const tope = { proteina: 20, carbo: 20, grasa: 20 };
const planes = [
  { cliente_id: 'A', plan_version: 5, porcentajes_comida: null, dias: [{ id: 'dia1', comidas: base4(), menu_cerrado: { margen: tope, tope } }, { id: 'dia2', comidas: rest4() }] },
  { cliente_id: 'B', plan_version: 5, porcentajes_comida: null, dias: [{ id: 'dia1', comidas: base4().map(c => ({ ...c, platos: [plato(c.nombre + '-A', 200, 100, 32, true)] })), menu_cerrado: { margen: tope, tope }, reparto_gramos: { proteina: [40, 40, 40, 40], carbohidratos: [50, 50, 50, 50], grasa: [16, 16, 16, 16] } }] },
  { cliente_id: 'C', plan_version: 5, porcentajes_comida: null, dias: [{ id: 'dia1', comidas: base4(), menu_cerrado: { margen: tope, tope } }] },
  { cliente_id: 'D', plan_version: 5, porcentajes_comida: null, dias: [{ id: 'dia1', comidas: base4().map((c, i) => (i === 2 ? { ...c, platos: [] } : c)), menu_cerrado: { margen: tope, tope } }] },
  { cliente_id: 'E', plan_version: 5, porcentajes_comida: null, dias: [{ id: 'dia1', comidas: base4().map((c, i) => (i === 1 ? { ...c, platos: [plato('Comida-A', 200, 125, 32, true, { alt: 200 })] } : c)), menu_cerrado: { margen: tope, tope } }] },
];
const seg = { A: [{ peso: 80, fecha: '2026-11-01', origen: 'x' }], B: [{ peso: 80, fecha: '2026-11-01', origen: 'x' }], C: [], D: [{ peso: 80, fecha: '2026-11-01', origen: 'x' }], E: [{ peso: 80, fecha: '2026-11-01', origen: 'x' }] };
const E = cargar({ supabase: (tabla, o) => {
  if (tabla === 'planes_nutricion') return planes;
  if (tabla === 'seguimiento_corporal') return seg[(o.filter.match(/cliente_id=eq\.([^&]+)/) || [])[1]] || [];
  if (tabla === 'clientes') return [{ objetivo_nutri_v2: objetivo }];
  return [];
} });
const C = E.ctx; let ok = 0, fallos = 0; const informe = [];
async function t(n, fn) { try { await fn(); ok++; informe.push('  ✔ ' + n); } catch (e) { fallos++; informe.push('  ✘ ' + n + '\n      ' + e.message); } }
(async () => {
  C.state.nutriAlimentos = catalogo;
  C.state.clients = ['A', 'B', 'C', 'D', 'E'].map(id => ({ id, nombre: 'Cliente ' + id, sexo: 'hombre', altura: 180, peso_inicial: id === 'C' ? null : 80, objetivo_nutri_v2: id === 'C' ? { ...objetivo, carbohidratos: 250 } : objetivo }));
  const antes = JSON.stringify(C.state);
  const res = await C.nutriDiagnosticoControlV2({ silencioso: true });
  const por = (cli, menu) => res.filas.find(f => f.cliente === 'Cliente ' + cli && f.menu === (menu || 'entreno'));
  await t('solo lectura: todas las llamadas a Supabase son GET', () => { assert.ok(E.llamadas.length > 0); assert.ok(E.llamadas.every(l => l.metodo === 'GET'), JSON.stringify(E.llamadas.map(l => l.metodo))); });
  await t('no modifica el estado del panel', () => assert.strictEqual(JSON.stringify(C.state), antes));
  await t('analiza entreno y descanso: 6 filas (A×2, B, C, D, E)', () => assert.strictEqual(res.filas.length, 6, res.filas.map(f => f.cliente + f.menu).join(',')));
  await t('A entreno (reparto por %, platos ajustados): válido y sin brecha', () => { const f = por('A'); assert.strictEqual(f.estado, 'valido'); assert.strictEqual(f.reparto, 'porcentaje'); assert.ok(Math.abs(f.brechaH) < 0.01 && Math.abs(f.brechaP) < 0.01); assert.strictEqual(f.cambia, false); });
  await t('A descanso: objetivo con 60 g menos de hidratos (menú de descanso válido contra SU objetivo)', () => { const f = por('A', 'descanso'); assert.strictEqual(f.estado, 'valido'); assert.ok(Math.abs(f.brechaH) < 0.01); });
  await t('B (reparto por gramos que suma 50 g de hidratos menos que el día): ⛔ nuevo, «ok» en el control actual, y se marca que cambia el veredicto', () => {
    const f = por('B'); assert.strictEqual(f.reparto, 'gramos'); assert.ok(Math.abs(f.brechaH - 50) < 0.01, 'brecha H ' + f.brechaH); assert.strictEqual(f.estado, 'fuera'); assert.strictEqual(f.estadoActual, 'ok'); assert.strictEqual(f.cambia, true); });
  await t('C (sin peso): ⚪ sin referencia, nunca válido', () => { const f = por('C'); assert.strictEqual(f.estado, 'sin_referencia'); assert.strictEqual(f.sinPeso, true); assert.strictEqual(f.brechaH, null); });
  await t('D (una comida sin platos): 🟡 incompleto', () => assert.strictEqual(por('D').estado, 'incompleto'));
  await t('E (alternativa por alimento que mueve +30 g de hidratos): ⛔ por las alternativas', () => { const f = por('E'); assert.strictEqual(f.estado, 'fuera'); });
  await t('kcal informativa presente en cada fila válida y el texto resumen se genera', () => { assert.ok(res.filas.filter(f => f.estado !== 'sin_referencia').every(f => typeof f.kcalAlto === 'number' && typeof f.kcalConservadorAlto === 'number')); assert.ok(/DIAGNÓSTICO CONTROL V2/.test(res.texto) && /Menús cuyo veredicto cambiaría/.test(res.texto)); });
  await t('coherencia kcal: marca solo las Nueces (declara 654, 4/4/9 = 701) y el resumen informa de la diferencia por plato', () => { assert.deepStrictEqual(res.coherencia.map(x => x.id), ['nuez']); assert.ok(/kcal declaradas − kcal 4\/4\/9/.test(res.texto)); });
  await t('diferencia por plato: un plato con 30 g de nueces declara 14,1 kcal menos que 4/4/9; los demás 0', async () => {
    const E3 = cargar({ supabase: (tabla) => (tabla === 'planes_nutricion' ? [{ cliente_id: 'A', plan_version: 5, porcentajes_comida: null, dias: [{ id: 'd', comidas: base4().map((c, i) => (i === 0 ? { ...c, platos: [{ ...c.platos[0], ingredientes: [...c.platos[0].ingredientes, ing('nuez', 30)] }] } : c)), menu_cerrado: { margen: tope, tope } }] }] : tabla === 'seguimiento_corporal' ? seg.A : [{ objetivo_nutri_v2: objetivo }]) });
    E3.ctx.state.nutriAlimentos = catalogo; E3.ctx.state.clients = [{ id: 'A', nombre: 'Cliente A', sexo: 'hombre', altura: 180, peso_inicial: 80, objetivo_nutri_v2: objetivo }];
    const r = await E3.ctx.nutriDiagnosticoControlV2({ silencioso: true }), f = r.filas[0];
    assert.ok(Math.abs(f.platoKcalDeclVs449MaxAbs - 14.1) < 0.05, 'diferencia ' + f.platoKcalDeclVs449MaxAbs + ' (30 g: 196,2 − 210,3 = −14,1)'); assert.ok(f.platoKcalDeclVs449MaxPct > 0);
  });
  await t('un cliente con datos rotos no tira el diagnóstico entero', async () => {
    const E2 = cargar({ supabase: (tabla) => { if (tabla === 'planes_nutricion') return [{ cliente_id: 'X', plan_version: 5, dias: [{ comidas: null }] }, ...planes.slice(0, 1)]; if (tabla === 'seguimiento_corporal') return seg.A; return [{ objetivo_nutri_v2: objetivo }]; } });
    E2.ctx.state.nutriAlimentos = catalogo; E2.ctx.state.clients = [{ id: 'A', nombre: 'Cliente A', sexo: 'hombre', altura: 180, peso_inicial: 80, objetivo_nutri_v2: objetivo }];
    const r2 = await E2.ctx.nutriDiagnosticoControlV2({ silencioso: true }); assert.ok(r2.filas.length >= 2);
  });
  console.log('\nCONTROL V2 · diagnóstico de solo lectura (datos sintéticos)\n' + informe.join('\n') + `\n\n${ok} correctas, ${fallos} fallidas\n\n--- texto que verá Juan con datos de ejemplo ---\n` + res.texto);
  process.exit(fallos ? 1 : 0);
})();
