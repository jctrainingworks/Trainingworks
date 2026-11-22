// Prueba de la vista previa del paso 2 en un navegador simulado: el panel «vivo» es el de MAIN (sin paso 2); node vista-previa.test.js
const assert = require('assert'), fs = require('fs'), path = require('path'), acorn = require('acorn'), { execSync } = require('child_process'), { JSDOM } = require('jsdom'), { RAIZ, scriptPrincipal } = require('./cargar.js');
const RAW = 'https://raw.githubusercontent.com/jctrainingworks/Trainingworks/nutricion-fase1/', MARCADOR = fs.readFileSync(path.join(__dirname, 'marcador-vista-previa.txt'), 'utf8').trim();
const mainHtml = execSync('git show main:prueba/index.html', { cwd: RAIZ, encoding: 'utf8', maxBuffer: 1 << 28 });
let ok = 0, fallos = 0; const informe = [];
async function t(n, fn) { try { await fn(); ok++; informe.push('  ✔ ' + n); } catch (e) { fallos++; informe.push('  ✘ ' + n + '\n      ' + e.message); } }
function entorno(opts) {
  opts = opts || {}; const dom = new JSDOM('<!doctype html><body></body>', { runScripts: 'outside-only', url: 'https://jctrainingworks.github.io/Trainingworks/prueba/' }), w = dom.window, src = scriptPrincipal(mainHtml);
  w.eval('var state = { nutriAlimentos: [], nutriPlatos: [], nutricionV2: {}, clients: [] }; window.__renders = 0; var render = function () { window.__renders++; };');
  w.eval(fs.readFileSync(path.join(RAIZ, 'prueba/alimentos/catalogo.js'), 'utf8').replace(/^\s*const NUTRI_CATALOGO_V2/m, 'var NUTRI_CATALOGO_V2'));
  acorn.parse(src, { ecmaVersion: 'latest' }).body.forEach(n => { if (n.type === 'FunctionDeclaration' && !['supabase', 'render'].includes(n.id.name) && !(opts.sinSeccion && n.id.name === 'mcSeccionHtml')) w.eval(src.slice(n.start, n.end)); else if (n.type === 'VariableDeclaration' && !n.declarations.some(d => ['state', 'render'].includes(d.id && d.id.name))) { try { w.eval(src.slice(n.start, n.end).replace(/^(const|let)\b/, 'var')); } catch (e) { /* constante que depende del arranque de la página: no hace falta */ } } });
  w.fetch = async u => { assert.ok(u.startsWith(RAW), 'URL inesperada ' + u); const rel = u.slice(RAW.length).split('?')[0]; return { text: async () => fs.readFileSync(path.join(RAIZ, rel), 'utf8') }; };
  w.supabase = async () => { throw new Error('la vista previa NO debe llamar a Supabase'); };
  return w;
}
const esperar = async (fn, ms) => { const t0 = Date.now(); while (Date.now() - t0 < (ms || 5000)) { if (fn()) return true; await new Promise(r => setTimeout(r, 25)); } return false; };
(async () => {
  await t('el marcador es una línea corta sin caracteres problemáticos', () => { assert.ok(MARCADOR.startsWith('javascript:') && !/\n/.test(MARCADOR) && MARCADOR.length < 600 && !/[%#]/.test(MARCADOR)); });
  const w = entorno();
  await t('en el panel «vivo» (main) NO existe aún el control nuevo', () => { assert.strictEqual(typeof w.mcCtrlPanelHtml, 'undefined'); assert.ok(!w.mcSeccionHtml.toString().includes('mcCtrlPanelHtml')); });
  w.eval(MARCADOR.replace(/^javascript:/, ''));
  await t('activa la vista previa: define el bloque, parchea mcSeccionHtml con UNA línea y repinta', async () => {
    assert.ok(await esperar(() => /Vista previa activada/.test(w.document.body.textContent)), w.document.body.textContent);
    assert.strictEqual(typeof w.mcCtrlPanelHtml, 'function'); assert.strictEqual(w.mcSeccionHtml.toString().split('mcCtrlPanelHtml(c, est, mc)').length - 1, 1); assert.ok(w.__renders >= 1);
    const original = mainHtml.match(/function mcSeccionHtml[\s\S]*?\n}\n/)[0].trim(); assert.strictEqual(w.mcSeccionHtml.toString().replace('    ${mcCtrlPanelHtml(c, est, mc)}\n', ''), original, 'aparte de esa línea es idéntica');
  });
  await t('el Menú cerrado parcheado pinta el panel nuevo con datos reales de ejemplo (y el resto del Menú cerrado sigue ahí)', () => {
    w.state.nutriAlimentos = [{ id: 'prot', nombre: 'P', kcal_100g: 80, proteina_100g: 20, carbo_100g: 0, grasa_100g: 0 }, { id: 'carb', nombre: 'H', kcal_100g: 200, proteina_100g: 0, carbo_100g: 50, grasa_100g: 0 }, { id: 'gras', nombre: 'G', kcal_100g: 450, proteina_100g: 0, carbo_100g: 0, grasa_100g: 50 }];
    const pl = (id, p, c, g) => ({ id, nombre: id, franjas: [], ingredientes: [{ alimento_id: 'prot', cantidad_base_g: p, rol: 'proteina' }, { alimento_id: 'carb', cantidad_base_g: c, rol: 'carbohidrato' }, { alimento_id: 'gras', cantidad_base_g: g, rol: 'grasa' }] });
    const cli = { id: 'c1', nombre: 'Demo', apellidos: 'X', alimentos_excluidos_v2: [] }; w.state.clients = [cli]; w.state.nutriPlatos = [];
    const est = w.nv2Estado('c1'); est.numComidas = 4; est.objetivo = { proteinaGKg: 2, grasaGKg: 0.8, carbohidratos: 250 }; est.pesoObjetivoV4 = 80; est.preferenciasCargadas = true;
    const mc = w.mcEst('c1'); mc.tope = { proteina: 30, carbo: 30, grasa: 30 }; mc.margen = { proteina: 30, carbo: 20, grasa: 20 };
    for (let i = 0; i < 4; i++) { const a = pl('A' + i, 200, 125, 32); w.state.nutriPlatos.push(a); mc.principal[i] = a.id; mc.marcados[i] = []; }
    const h = w.mcSeccionHtml(cli); assert.ok(/Menú cerrado/.test(h) && /Calcular lista de platos/.test(h) && /Guardar menú cerrado/.test(h), 'el Menú cerrado dejó de pintarse'); assert.ok(/Control del día · nuevo/.test(h), 'no aparece el panel nuevo'); assert.ok(/Tope guardado en este menú: P 30 · H 30 · G 30 g/.test(h), h.slice(0, 200));
  });
  await t('ejecutarlo dos veces no duplica la línea', async () => { w.eval(MARCADOR.replace(/^javascript:/, '')); await esperar(() => (w.__renders || 0) >= 2); assert.strictEqual(w.mcSeccionHtml.toString().split('mcCtrlPanelHtml(c, est, mc)').length - 1, 1); });
  const w2 = entorno({ sinSeccion: true }); w2.eval(MARCADOR.replace(/^javascript:/, ''));
  await t('fuera del panel avisa con un mensaje claro y no cambia nada', async () => { assert.ok(await esperar(() => /Abre primero el panel/.test(w2.document.body.textContent))); assert.strictEqual(typeof w2.mcCtrlPanelHtml, 'undefined'); });
  const w3 = entorno(); w3.eval('(function(){ var s = mcSeccionHtml.toString().replace("${peorHtml}", "${peorHtml2}"); (0,eval)("window.mcSeccionHtml = " + s); })()'); w3.eval(MARCADOR.replace(/^javascript:/, ''));
  await t('si el Menú cerrado de la página es distinto del esperado, no toca nada y lo dice', async () => { assert.ok(await esperar(() => /distinto del esperado/.test(w3.document.body.textContent)), w3.document.body.textContent); assert.ok(!w3.mcSeccionHtml.toString().includes('mcCtrlPanelHtml(c')); });
  console.log('\nVISTA PREVIA PASO 2 · pruebas en navegador simulado\n' + informe.join('\n') + `\n\n${ok} correctas, ${fallos} fallidas`); process.exit(fallos ? 1 : 0);
})();
