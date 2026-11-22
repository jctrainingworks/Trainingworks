// Prueba del marcador de iPad en un navegador simulado (jsdom): node marcador.test.js
const assert = require('assert'), fs = require('fs'), path = require('path'), acorn = require('acorn'), { JSDOM } = require('jsdom'), { RAIZ, scriptPrincipal } = require('./cargar.js');
const BASE = 'https://raw.githubusercontent.com/jctrainingworks/Trainingworks/nutricion-fase1/tests/nutricion-control/';
const MARCADOR = fs.readFileSync(path.join(__dirname, 'marcador.txt'), 'utf8').trim();
let ok = 0, fallos = 0; const informe = [];
async function t(n, fn) { try { await fn(); ok++; informe.push('  ✔ ' + n); } catch (e) { fallos++; informe.push('  ✘ ' + n + '\n      ' + e.message); } }
const catalogo = [{ id: 'prot', nombre: 'Proteína', kcal_100g: 80, proteina_100g: 20, carbo_100g: 0, grasa_100g: 0 }, { id: 'carb', nombre: 'Hidrato', kcal_100g: 200, proteina_100g: 0, carbo_100g: 50, grasa_100g: 0 }, { id: 'gras', nombre: 'Grasa', kcal_100g: 450, proteina_100g: 0, carbo_100g: 0, grasa_100g: 50 }];
const ing = (id, g) => ({ alimento_id: id, nombre: id, gramos: g });
const plato = (n, p, c, g, pr) => ({ id: n, nombre: n, principal: !!pr, ingredientes: [ing('prot', p), ing('carb', c), ing('gras', g)], macros: {} });
const base4 = (c) => ['Desayuno', 'Comida', 'Merienda', 'Cena'].map(n => ({ id: n, nombre: n, platos: [plato(n + '-A', 200, c, 32, true)] }));
const obj = { proteinaGKg: 2.0, grasaGKg: 0.8, carbohidratos: 250, numComidas: 4, diaSinEntreno: { activo: false, carbosMenos: 60 } };
const tope = { proteina: 20, carbo: 20, grasa: 20 };
const planes = [{ cliente_id: 'A', plan_version: 5, porcentajes_comida: null, dias: [{ comidas: base4(125), menu_cerrado: { tope } }] },
  { cliente_id: 'B', plan_version: 5, porcentajes_comida: null, dias: [{ comidas: base4(100), menu_cerrado: { tope }, reparto_gramos: { proteina: [40, 40, 40, 40], carbohidratos: [50, 50, 50, 50], grasa: [16, 16, 16, 16] } }] }];
function entorno(opciones) {
  opciones = opciones || {};
  const dom = new JSDOM('<!doctype html><body></body>', { runScripts: 'outside-only', url: 'https://jctrainingworks.github.io/Trainingworks/prueba/', pretendToBeVisual: true }), w = dom.window, llamadas = [];
  const src = scriptPrincipal(fs.readFileSync(path.join(RAIZ, 'prueba/index.html'), 'utf8')), ast = acorn.parse(src, { ecmaVersion: 'latest' });
  w.eval('var state = { nutriAlimentos: [], nutriPlatos: [], nutricionV2: {}, clients: [] }; var render = function () {};');
  w.eval(fs.readFileSync(path.join(RAIZ, 'prueba/alimentos/catalogo.js'), 'utf8').replace(/^\s*const NUTRI_CATALOGO_V2/m, 'var NUTRI_CATALOGO_V2'));
  if (!opciones.sinPanel) {
    ast.body.forEach(n => { if (n.type === 'FunctionDeclaration' && n.id.name !== 'supabase') w.eval(src.slice(n.start, n.end)); else if (n.type === 'VariableDeclaration' && n.declarations.some(d => ['MC_MACROS', 'MC_CAMPO_100G', 'NUTRI_ESQUEMAS_COMIDAS_V2', 'NUTRI_NOMBRE_A_FRANJA_V3'].includes(d.id.name))) { try { w.eval(src.slice(n.start, n.end).replace(/^(const|let)\b/, 'var')); } catch (e) { /* no necesaria */ } } });
    w.supabase = async (tabla, o) => { llamadas.push((o && o.method) || 'GET'); return tabla === 'planes_nutricion' ? planes : tabla === 'seguimiento_corporal' ? [{ peso: 80, fecha: '2026-11-01', origen: 'x' }] : [{ objetivo_nutri_v2: obj }]; };
    w.state.nutriAlimentos = catalogo; w.state.clients = [{ id: 'A', nombre: 'Marta', apellidos: 'Gómez', sexo: 'mujer', altura: 170, peso_inicial: 80, objetivo_nutri_v2: obj }, { id: 'B', nombre: 'Pedro', apellidos: 'Ruiz', sexo: 'hombre', altura: 180, peso_inicial: 80, objetivo_nutri_v2: obj }];
  }
  w.fetch = async u => { assert.ok(u.startsWith(BASE), 'URL inesperada: ' + u); const f = path.join(__dirname, u.slice(BASE.length).split('?')[0]); return { text: async () => fs.readFileSync(f, 'utf8') }; };
  const copiado = []; Object.defineProperty(w.navigator, 'clipboard', { value: { writeText: async s => { copiado.push(s); } }, configurable: true });
  w.alert = m => { w.__alert = m; };
  return { w, llamadas, copiado, dom };
}
const esperar = async (fn, ms) => { const t0 = Date.now(); while (Date.now() - t0 < (ms || 5000)) { if (fn()) return true; await new Promise(r => setTimeout(r, 25)); } return false; };
(async () => {
  await t('el marcador es una sola línea corta, empieza por javascript: y no usa caracteres problemáticos', () => { assert.ok(MARCADOR.startsWith('javascript:')); assert.ok(!/\n/.test(MARCADOR)); assert.ok(MARCADOR.length < 600, 'longitud ' + MARCADOR.length); assert.ok(!/[%#]/.test(MARCADOR)); });
  const { w, llamadas, copiado } = entorno();
  w.eval(MARCADOR.replace(/^javascript:/, ''));
  await t('muestra la pantalla y termina el análisis', async () => { assert.ok(await esperar(() => w.document.querySelector('#jctw-diag textarea')), 'no apareció el resultado: ' + (w.document.getElementById('jctw-diag') || {}).textContent); });
  await t('solo hizo lecturas (GET) contra Supabase', () => { assert.ok(llamadas.length > 0 && llamadas.every(m => m === 'GET'), llamadas.join(',')); });
  const area = () => w.document.querySelector('#jctw-diag textarea').value;
  await t('el resumen sale anonimizado por defecto (C01, C02) y sin nombres reales', () => { assert.ok(/C01/.test(area()) && /C02/.test(area())); assert.ok(!/Marta|Pedro|Gómez|Ruiz/.test(area())); assert.ok(/DIAGNÓSTICO CONTROL V2/.test(area()) && /POR MENÚ/.test(area())); });
  await t('el menú con reparto por gramos aparece como ⛔ y marcado «CAMBIA» frente al control actual', () => { assert.ok(/C02 · entreno · reparto gramos · ⛔ \(actual: ok · CAMBIA\)/.test(area()), area()); assert.ok(/C01 · entreno · reparto porcentaje · ✅/.test(area())); });
  await t('«Copiar resumen» copia el texto anonimizado; «JSON» también', async () => {
    const [b1, b2] = [...w.document.querySelectorAll('#jctw-diag button')].filter(b => /Copiar/.test(b.textContent));
    b1.click(); await esperar(() => copiado.length >= 1); assert.ok(/C01/.test(copiado[0]) && !/Marta/.test(copiado[0]));
    b2.click(); await esperar(() => copiado.length >= 2); assert.ok(/"cliente":"C01"/.test(copiado[1]) && !/Marta|Pedro/.test(copiado[1]));
  });
  await t('con «Incluir nombres» marcado salen los nombres reales', async () => { const c = w.document.querySelector('#jctw-diag input'); c.checked = true; c.dispatchEvent(new w.Event('change')); assert.ok(/Marta/.test(area()) && /Pedro/.test(area())); });
  await t('«Cerrar» quita la pantalla y el panel queda como estaba', () => { [...w.document.querySelectorAll('#jctw-diag button')].find(b => b.textContent === 'Cerrar').click(); assert.strictEqual(w.document.getElementById('jctw-diag'), null); assert.strictEqual(w.document.body.children.length, 0); });
  const s2 = entorno({ sinPanel: true }); s2.w.eval(MARCADOR.replace(/^javascript:/, ''));
  await t('fuera del panel (sin sesión/funciones) avisa con un mensaje claro y no rompe nada', async () => { assert.ok(await esperar(() => /Abre primero el panel/.test((s2.w.document.getElementById('jctw-diag') || {}).textContent || ''))); });
  const s3 = entorno(); s3.w.fetch = async () => { throw new Error('sin conexión'); }; s3.w.eval(MARCADOR.replace(/^javascript:/, ''));
  await t('si no hay conexión con GitHub, lo dice (no se queda colgado en «Analizando»)', async () => { assert.ok(await esperar(() => /No se pudo/.test((s3.w.document.getElementById('jctw-diag') || {}).textContent || '') || /No se pudo cargar/.test(s3.w.__alert || ''))); });
  console.log('\nMARCADOR IPAD · pruebas en navegador simulado\n' + informe.join('\n') + `\n\n${ok} correctas, ${fallos} fallidas`); process.exit(fallos ? 1 : 0);
})();
