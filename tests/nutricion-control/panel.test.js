// PASO 2 · Prueba del panel informativo del Menú cerrado (mcCtrlPanelHtml) con las funciones reales: node panel.test.js
const assert = require('assert'), { cargar } = require('./cargar.js');
const E = cargar(), C = E.ctx, run = E.run; let ok = 0, fallos = 0; const informe = [];
function t(n, fn) { try { fn(); ok++; informe.push('  ✔ ' + n); } catch (e) { fallos++; informe.push('  ✘ ' + n + '\n      ' + e.message); } }
C.state.nutriAlimentos = [{ id: 'prot', nombre: 'Proteína', kcal_100g: 80, proteina_100g: 20, carbo_100g: 0, grasa_100g: 0 }, { id: 'carb', nombre: 'Hidrato', kcal_100g: 200, proteina_100g: 0, carbo_100g: 50, grasa_100g: 0 }, { id: 'gras', nombre: 'Grasa', kcal_100g: 450, proteina_100g: 0, carbo_100g: 0, grasa_100g: 50 }, { id: 'alt', nombre: 'Alternativa', kcal_100g: 240, proteina_100g: 0, carbo_100g: 60, grasa_100g: 0 }];
const plato = (id, p, c, g) => ({ id, nombre: id, ingredientes: [{ alimento_id: 'prot', cantidad_base_g: p }, { alimento_id: 'carb', cantidad_base_g: c }, { alimento_id: 'gras', cantidad_base_g: g }] });
function montar(o) {
  o = o || {}; const n = 4; C.state.nutriPlatos = [];
  const mc = { principal: {}, marcados: {}, ajustes: {}, alts: {}, sueltos: {}, fijasCli: {}, quitados: {}, anadidos: {}, fijos: {}, abierto: {}, margen: o.margen || { proteina: 30, carbo: 20, grasa: 20 }, tope: o.tope || { proteina: 30, carbo: 30, grasa: 30 } };
  for (let i = 0; i < n; i++) { if (o.sinPlatoEn === i) continue; const cc = o.gramos ? [100, 92] : [125, 115], a = plato('A' + i, 200, cc[0], 32), b = plato('B' + i, 215, cc[1], 34); C.state.nutriPlatos.push(a, b); mc.principal[i] = a.id; mc.marcados[i] = [b.id]; }
  if (o.alt) mc.alts[0] = { A0: { 1: [{ id: 'alt', g: 200 }] } };   // alternativa que mueve +45 g de hidratos
  const est = { numComidas: n, porcentajesComida: null, objetivoDiarioV4: o.sinObjetivo ? null : { kcal: 2100, proteina: 160, carbohidratos: 250, grasa: 64 } };
  if (o.gramos) est.gramosComidaV4 = { proteina: [40, 40, 40, 40], carbohidratos: [50, 50, 50, 50], grasa: [16, 16, 16, 16] };
  return { est, mc };
}
const html = o => { const { est, mc } = montar(o); C.__est = est; C.__mc = mc; return run('mcCtrlPanelHtml({ id: "c1" }, __est, __mc)'); };
t('menú que cuadra: ✅, casilla del tope con los valores guardados, margen en solo lectura, kcal informativas y control actual coincidente', () => {
  const h = html(); assert.ok(/✅ El día cuadra con tu objetivo diario/.test(h), h);
  assert.ok(/onchange="mcCtrlSetTope\('c1','proteina',this\.value\)"/.test(h) && /value="30"/.test(h)); assert.strictEqual((h.match(/<input type="number"/g) || []).length, 3, 'tres casillas: P, H y G');
  assert.ok(/mcCtrlRestablecerTope\('c1'\)/.test(h) && /Restablecer a 20/.test(h)); assert.ok(/Margen por plato \(solo lectura\): P 30 · H 20 · G 20 g/.test(h)); assert.ok(/El tope se guarda para este cliente y vale para las dos pestañas/.test(h));
  assert.ok(/Kcal en el peor caso/.test(h) && /informativo/.test(h)); assert.ok(/Control actual: ✔ da el menú por bueno\./.test(h)); assert.ok(/no bloquea ni guarda nada/.test(h));
});
t('en vista previa el panel avisa de que el tope no se guarda', () => { C.window.__jctwPrevia = true; const h = html(); delete C.window.__jctwPrevia; assert.ok(/Vista previa: los cambios del tope no se guardan/.test(h) && !/El tope se guarda para este cliente/.test(h)); });
t('el valor de la casilla refleja el tope en uso (cambiarlo en mc cambia lo que se pinta y el veredicto)', () => { const h = html({ tope: { proteina: 12, carbo: 30, grasa: 30 } }); assert.ok(/value="12"/.test(h)); });
t('reparto por gramos que no suma el día: ⛔ con la causa, y avisa de que el control actual no lo ve', () => {
  const h = html({ gramos: true }); assert.ok(/⛔ Respecto a tu objetivo diario el día se sale: Hidratos hacia abajo/.test(h), h); assert.ok(/Reparto: tus comidas suman 50 g menos de hidratos/.test(h) || /Reparto: tus comidas suman .*hidratos/.test(h), h);
  assert.ok(/Control actual: ✔ da el menú por bueno/.test(h) && /el nuevo no coincide/.test(h) && /no suman exactamente el objetivo diario/.test(h));
});
t('una alternativa por alimento que se pasa: ⛔ y explica que el exceso sale de las alternativas', () => {
  const h = html({ alt: true, tope: { proteina: 30, carbo: 30, grasa: 30 } }); assert.ok(/⛔/.test(h) && /Hidratos hacia arriba/.test(h), h); assert.ok(/Ninguna lo hace solo con platos: el exceso sale de sumar las alternativas por alimento/.test(h), h);
});
t('faltan platos en una comida: 🟡 con el nombre de la comida', () => { const h = html({ sinPlatoEn: 2 }); assert.ok(/🟡 Faltan platos en: Merienda/.test(h), h); });
t('sin objetivo del cliente (sin peso): ⚪ «no cuenta como validado»', () => { const h = html({ sinObjetivo: true }); assert.ok(/⚪ Sin referencia/.test(h) && /no cuenta como validado/.test(h), h); });
t('sin ningún plato elegido no pinta nada', () => { const { est, mc } = montar(); mc.principal = {}; C.__est = est; C.__mc = mc; assert.strictEqual(run('mcCtrlPanelHtml({ id: "c1" }, __est, __mc)'), ''); });
t('a prueba de errores: con datos rotos devuelve vacío y NO lanza (no puede romper el Menú cerrado)', () => {
  C.__est = null; C.__mc = null; assert.strictEqual(run('mcCtrlPanelHtml({}, __est, __mc)'), '');
  const { est, mc } = montar(); mc.principal[0] = 'no_existe'; C.__est = est; C.__mc = mc; assert.doesNotThrow(() => run('mcCtrlPanelHtml({}, __est, __mc)'));
  const m2 = montar(); m2.mc.alts = { 0: { A0: 'basura' } }; C.__est = m2.est; C.__mc = m2.mc; assert.doesNotThrow(() => run('mcCtrlPanelHtml({}, __est, __mc)'));
});
t('solo lee: no cambia el menú (mc) ni el objetivo (est)', () => {
  const { est, mc } = montar({ gramos: true, alt: true }); C.__est = est; C.__mc = mc; run('mcCtrlPanelHtml({ id: "c1" }, __est, __mc)'); const a = JSON.stringify(mc), e0 = JSON.stringify({ ...est, porcentajesComida: null });
  run('mcCtrlPanelHtml({ id: "c1" }, __est, __mc)'); assert.strictEqual(JSON.stringify(mc), a); assert.strictEqual(JSON.stringify({ ...est, porcentajesComida: null }), e0);
});
t('es rápido: 5 comidas × 7 platos (16.807 combinaciones) en menos de 1 s', () => {
  C.state.nutriPlatos = []; const mc = { principal: {}, marcados: {}, ajustes: {}, alts: {}, sueltos: {}, fijasCli: {}, quitados: {}, anadidos: {}, fijos: {}, abierto: {}, margen: { proteina: 99, carbo: 99, grasa: 99 }, tope: { proteina: 30, carbo: 30, grasa: 30 } };
  for (let i = 0; i < 5; i++) { const ids = []; for (let j = 0; j < 7; j++) { const p = plato(`P${i}_${j}`, 150 + j * 10, 100 + j * 8, 25 + j * 2); C.state.nutriPlatos.push(p); ids.push(p.id); } mc.principal[i] = ids[0]; mc.marcados[i] = ids.slice(1); }
  C.__est = { numComidas: 5, porcentajesComida: null, objetivoDiarioV4: { kcal: 2100, proteina: 160, carbohidratos: 250, grasa: 64 } }; C.__mc = mc;
  const t0 = Date.now(), h = run('mcCtrlPanelHtml({ id: "c1" }, __est, __mc)'); assert.ok(Date.now() - t0 < 1000, 'tardó ' + (Date.now() - t0) + ' ms'); assert.ok(/Control del día/.test(h) && /16807 combinaciones/.test(h), h.slice(0, 300));
});
console.log('\nCONTROL V2 · paso 2 · panel del Menú cerrado\n' + informe.join('\n') + `\n\n${ok} correctas, ${fallos} fallidas`); process.exit(fallos ? 1 : 0);
