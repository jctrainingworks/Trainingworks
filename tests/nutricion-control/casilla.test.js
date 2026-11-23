// PASO 3 · Casilla del tope del día (por cliente) y su guardado en objetivo_nutri_v2.control: node casilla.test.js
const assert = require('assert'), { cargar } = require('./cargar.js');
let ok = 0, fallos = 0; const informe = [];
async function t(n, fn) { try { await fn(); ok++; informe.push('  ✔ ' + n); } catch (e) { fallos++; informe.push('  ✘ ' + n + '\n      ' + (e.stack || e.message).split('\n').slice(0, 4).join('\n      ')); } }
const SERVIDOR0 = { proteinaGKg: 2.2, grasaGKg: 0.8, carbohidratos: 250, numComidas: 3, numDias: 1, diaSinEntreno: { activo: true, carbosMenos: 60 }, futuro: { clave: 'no tocar' } };
function entorno(o) {
  o = o || {}; const reg = { gets: [], patches: [], otras: [] }; let servidor = o.servidor === undefined ? JSON.parse(JSON.stringify(SERVIDOR0)) : o.servidor;
  const E = cargar({ omitir: ['render', 'abrirAlerta', 'mcProgramarSyncCalendario'], supabase: async (tabla, op) => {
    const m = (op && op.method) || 'GET';
    if (tabla === 'clientes' && m === 'GET') { reg.gets.push(op.select); return op.select === 'objetivo_nutri_v2' ? [{ objetivo_nutri_v2: servidor }] : []; }
    if (tabla === 'clientes' && m === 'PATCH') { if (o.falla) throw new Error('sin conexión'); reg.patches.push(op.body); servidor = op.body.objetivo_nutri_v2; return []; }
    if (tabla === 'planes_nutricion' && m === 'GET') return o.plan ? [o.plan] : [];
    reg.otras.push(tabla + ':' + m); return [];
  } });
  E.ctx.renders = 0; E.ctx.alertas = []; E.run('var render = function () { renders++; }; var abrirAlerta = function (m) { alertas.push(m); }; var mcProgramarSyncCalendario = function () { syncs = (typeof syncs === "number" ? syncs : 0) + 1; };');
  E.run('var syncs = 0;'); E.servidor = () => servidor; E.reg = reg;
  const est = E.run("nv2Estado('c1')"), mc = E.run("mcEst('c1')"); mc.tope = { proteina: 30, carbo: 30, grasa: 30 }; return { E, C: E.ctx, est, mc, reg, run: E.run, servidor: () => servidor };
}
const esp = () => new Promise(r => setTimeout(r, 30));
(async () => {
  const x = entorno(); const C = x.C;
  await t('mcCtrlControlLimpio: valida, conserva claves desconocidas y descarta basura', () => {
    const L = v => C.mcCtrlControlLimpio(v), j = v => JSON.parse(JSON.stringify(v === undefined ? null : v));
    assert.strictEqual(L(null), undefined); assert.strictEqual(L([]), undefined); assert.strictEqual(L({}), undefined); assert.strictEqual(L({ tolDia: 'x' }), undefined);
    assert.deepStrictEqual(j(L({ tolDia: { proteina: 30, carbo: '25', grasa: 12.5 } })), { tolDia: { proteina: 30, carbo: 25, grasa: 12.5 } });
    assert.deepStrictEqual(j(L({ tolDia: { proteina: -1, carbo: 999, grasa: 'abc' } })), null);
    assert.deepStrictEqual(j(L({ tolDia: { proteina: 30, carbo: -4 }, tolDiaKcal: 150 })), { tolDia: { proteina: 30 }, tolDiaKcal: 150 });
  });
  await t('editar el tope de proteína: cambia el menú, repinta y guarda UNA vez SOLO control, sin pisar nada más ni tocar el calendario del cliente', async () => {
    const y = entorno(); y.C.mcCtrlSetTope('c1', 'proteina', '25'); await esp();
    assert.deepStrictEqual(JSON.parse(JSON.stringify(y.mc.tope)), { proteina: 25, carbo: 30, grasa: 30 }); assert.strictEqual(y.C.renders, 1);
    assert.strictEqual(y.reg.patches.length, 1); const b = y.reg.patches[0].objetivo_nutri_v2;
    assert.deepStrictEqual(JSON.parse(JSON.stringify(b)), { ...SERVIDOR0, control: { tolDia: { proteina: 25, carbo: 30, grasa: 30 } } });
    assert.deepStrictEqual(y.reg.otras, [], 'solo debe tocar clientes: ' + y.reg.otras); assert.strictEqual(y.run('syncs'), 0, 'no debe sincronizar el calendario');
  });
  await t('la coma decimal vale («27,5» → 27,5) y el valor se redondea a 1 decimal', async () => { const y = entorno(); y.C.mcCtrlSetTope('c1', 'carbo', '27,55'); await esp(); assert.strictEqual(y.mc.tope.carbo, 27.6); });
  await t('valores raros (vacío, texto, negativo, >200, macro inventado) no cambian nada, no escriben y repintan el valor actual', async () => {
    const y = entorno(); ['', '  ', 'abc', '-5', '201', 'NaN'].forEach(v => y.C.mcCtrlSetTope('c1', 'proteina', v)); y.C.mcCtrlSetTope('c1', 'fibra', '10'); await esp();
    assert.deepStrictEqual(JSON.parse(JSON.stringify(y.mc.tope)), { proteina: 30, carbo: 30, grasa: 30 }); assert.strictEqual(y.reg.patches.length, 0); assert.strictEqual(y.reg.gets.length, 0); assert.strictEqual(y.C.renders, 7); assert.strictEqual(y.est.control, undefined);
  });
  await t('varias ediciones seguidas acumulan en control.tolDia y el servidor acaba con los tres valores', async () => {
    const y = entorno(); y.C.mcCtrlSetTope('c1', 'proteina', '30'); await esp(); y.C.mcCtrlSetTope('c1', 'carbo', '22'); await esp(); y.C.mcCtrlSetTope('c1', 'grasa', '15'); await esp();
    assert.deepStrictEqual(JSON.parse(JSON.stringify(y.servidor().control)), { tolDia: { proteina: 30, carbo: 22, grasa: 15 } }); assert.deepStrictEqual(y.servidor().futuro, SERVIDOR0.futuro); assert.strictEqual(y.servidor().carbohidratos, 250);
  });
  await t('«Restablecer a 20»: vuelve a 20/20/20 y quita control del servidor (el objeto queda como estaba antes) sin tocar el resto', async () => {
    const y = entorno(); y.C.mcCtrlSetTope('c1', 'proteina', '35'); await esp(); y.C.mcCtrlRestablecerTope('c1'); await esp();
    assert.deepStrictEqual(JSON.parse(JSON.stringify(y.mc.tope)), { proteina: 20, carbo: 20, grasa: 20 }); assert.strictEqual(y.est.control, undefined); assert.deepStrictEqual(JSON.parse(JSON.stringify(y.servidor())), SERVIDOR0);
  });
  await t('si falla la escritura avisa con un mensaje claro y no revienta; el cambio sigue visible en pantalla', async () => {
    const y = entorno({ falla: true }); y.C.mcCtrlSetTope('c1', 'proteina', '28'); await esp();
    assert.strictEqual(y.mc.tope.proteina, 28); assert.strictEqual(y.C.alertas.length, 1); assert.ok(/No se pudo guardar el tope del día: sin conexión/.test(y.C.alertas[0]));
  });
  await t('VISTA PREVIA: la casilla cambia lo que ves pero NO llama a Supabase para nada', async () => {
    const y = entorno(); y.C.window.__jctwPrevia = true; y.C.mcCtrlSetTope('c1', 'proteina', '22'); y.C.mcCtrlRestablecerTope('c1'); y.C.mcCtrlSetTope('c1', 'grasa', '10'); await esp();
    assert.strictEqual(y.mc.tope.grasa, 10); assert.strictEqual(y.reg.patches.length, 0); assert.strictEqual(y.reg.gets.length, 0); assert.deepStrictEqual(y.reg.otras, []);
  });
  await t('cliente sin objetivo guardado aún (columna vacía): usa el guardado normal, que ya incluye control y las claves de siempre', async () => {
    const y = entorno({ servidor: null }); y.est.objetivo = { proteinaGKg: 2, grasaGKg: 0.8, carbohidratos: 240 }; y.C.mcCtrlSetTope('c1', 'proteina', '24'); await esp(); await esp();
    assert.ok(y.reg.patches.length >= 1); const b = y.reg.patches[y.reg.patches.length - 1].objetivo_nutri_v2; assert.deepStrictEqual(Object.keys(b), ['proteinaGKg', 'grasaGKg', 'carbohidratos', 'numComidas', 'numDias', 'diaSinEntreno', 'control']); assert.strictEqual(b.control.tolDia.proteina, 24);
  });
  await t('EL GUARDADO NORMAL DEL OBJETIVO arrastra control (si no, la casilla se borraría al cambiar proteína o nº de comidas)', async () => {
    const y = entorno({ servidor: SERVIDOR0 }); y.est.objetivo = { proteinaGKg: 2.3, grasaGKg: 0.8, carbohidratos: 250 }; y.est.control = { tolDia: { proteina: 30, carbo: 30, grasa: 30 } };
    await y.run("nv2GuardarObjetivoCliente('c1')"); const b = y.reg.patches[0].objetivo_nutri_v2; assert.deepStrictEqual(JSON.parse(JSON.stringify(b.control)), { tolDia: { proteina: 30, carbo: 30, grasa: 30 } }); assert.strictEqual(b.proteinaGKg, 2.3);
  });
  await t('SIN control, el guardado normal deja el objeto exactamente como antes: las mismas 6 claves, ninguna nueva', async () => {
    const y = entorno({ servidor: SERVIDOR0 }); y.est.objetivo = { proteinaGKg: 2.3, grasaGKg: 0.8, carbohidratos: 250 }; await y.run("nv2GuardarObjetivoCliente('c1')");
    assert.deepStrictEqual(Object.keys(y.reg.patches[0].objetivo_nutri_v2), ['proteinaGKg', 'grasaGKg', 'carbohidratos', 'numComidas', 'numDias', 'diaSinEntreno']);
  });
  await t('al abrir el cliente: lee control y MANDA sobre el tope guardado en el plan (30 frente a 20)', async () => {
    const plan = { plan_version: 5, porcentajes_comida: null, dias: [{ id: 'dia1', comidas: [], menu_cerrado: { margen: { proteina: 20, carbo: 20, grasa: 20 }, tope: { proteina: 20, carbo: 20, grasa: 20 } } }] };
    const y = entorno({ servidor: { ...SERVIDOR0, control: { tolDia: { proteina: 30, carbo: 30, grasa: 30 } } }, plan }); const est = y.run("nv2Estado('c1')"); delete est.mc;
    await y.run("nv2CargarPreferenciasGuardadas('c1')"); y.run("mcAplicarPendiente({ id: 'c1' })"); const mc = y.run("mcEst('c1')");   // mcSeccionHtml aplica el menú pendiente al pintar: ahí el plan trae su tope
    assert.deepStrictEqual(JSON.parse(JSON.stringify(est.control)), { tolDia: { proteina: 30, carbo: 30, grasa: 30 } }); assert.deepStrictEqual(JSON.parse(JSON.stringify(mc.tope)), { proteina: 30, carbo: 30, grasa: 30 });
  });
  await t('orden de carrera: si editas la casilla ANTES de que se aplique el menú pendiente, tu valor no lo pisa el tope del plan', async () => {
    const plan = { plan_version: 5, porcentajes_comida: null, dias: [{ id: 'dia1', comidas: [], menu_cerrado: { margen: { proteina: 20, carbo: 20, grasa: 20 }, tope: { proteina: 20, carbo: 20, grasa: 20 } } }] };
    const y = entorno({ plan }); const est = y.run("nv2Estado('c1')"); delete est.mc; await y.run("nv2CargarPreferenciasGuardadas('c1')"); y.C.mcCtrlSetTope('c1', 'proteina', '33'); await esp();
    y.run("mcAplicarPendiente({ id: 'c1' })"); const mc = y.run("mcEst('c1')"); assert.strictEqual(mc.tope.proteina, 33);
  });
  await t('al abrir un cliente SIN control: el tope del plan guardado sigue mandando (comportamiento de siempre, sin cambios)', async () => {
    const plan = { plan_version: 5, porcentajes_comida: null, dias: [{ id: 'dia1', comidas: [], menu_cerrado: { margen: { proteina: 30, carbo: 20, grasa: 20 }, tope: { proteina: 30, carbo: 30, grasa: 30 } } }] };
    const y = entorno({ plan }); const est = y.run("nv2Estado('c1')"); delete est.mc; await y.run("nv2CargarPreferenciasGuardadas('c1')"); y.run("mcAplicarPendiente({ id: 'c1' })"); const mc = y.run("mcEst('c1')");
    assert.strictEqual(est.control, undefined); assert.deepStrictEqual(JSON.parse(JSON.stringify(mc.tope)), { proteina: 30, carbo: 30, grasa: 30 });
  });
  await t('control corrupto en el servidor (texto, números fuera de rango) se ignora sin romper la carga', async () => {
    const y = entorno({ servidor: { ...SERVIDOR0, control: { tolDia: { proteina: 'x', carbo: -3, grasa: 5000 } } } }); const est = y.run("nv2Estado('c1')"); await y.run("nv2CargarPreferenciasGuardadas('c1')");
    assert.strictEqual(est.control, undefined); assert.strictEqual(est.preferenciasCargadas, true);
  });
  console.log('\nCONTROL V2 · paso 3 · casilla del tope y control\n' + informe.join('\n') + `\n\n${ok} correctas, ${fallos} fallidas`); process.exit(fallos ? 1 : 0);
})();
