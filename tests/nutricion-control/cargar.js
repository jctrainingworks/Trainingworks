// Carga en un contexto aislado (vm) las FUNCIONES REALES de prueba/index.html (sin ejecutar el arranque de la página),
// más las constantes que necesitan. Así las pruebas comparan las funciones nuevas con las que están en producción.
const fs = require('fs'), path = require('path'), vm = require('vm'), acorn = require('acorn');
const RAIZ = path.resolve(__dirname, '..', '..');
function scriptPrincipal(html) {
  const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g; let m, mejor = '';
  while ((m = re.exec(html))) if (m[1].length > mejor.length) mejor = m[1];
  return mejor;
}
const CONSTS = ['MC_MACROS', 'MC_CAMPO_100G', 'MC_MIN_EQUIV', 'MC_MAX_EQUIV', 'NUTRI_ESQUEMAS_COMIDAS_V2', 'NUTRI_NOMBRE_A_FRANJA_V3'];
function cargar(opciones) {
  opciones = opciones || {};
  const html = fs.readFileSync(path.join(RAIZ, opciones.archivo || 'prueba/index.html'), 'utf8'), src = scriptPrincipal(html);
  const ast = acorn.parse(src, { ecmaVersion: 'latest', sourceType: 'script' });
  const llamadas = [];
  const ctx = vm.createContext({ console, Math, JSON, Date, Object, Array, Number, String, Set, Map, Promise, parseFloat, parseInt, isFinite, isNaN,
    window: {}, document: { getElementById: () => null, querySelector: () => null }, render: () => {} });
  vm.runInContext('var state = { nutriAlimentos: [], nutriPlatos: [], nutricionV2: {}, clients: [] };', ctx);
  vm.runInContext(fs.readFileSync(path.join(RAIZ, 'prueba/alimentos/catalogo.js'), 'utf8').replace(/^\s*const NUTRI_CATALOGO_V2/m, 'var NUTRI_CATALOGO_V2'), ctx);
  ctx.supabase = async (tabla, o) => { llamadas.push({ tabla, metodo: (o && o.method) || 'GET', o }); return (opciones.supabase ? opciones.supabase(tabla, o) : []); };
  let nFun = 0;
  ast.body.forEach(n => {
    if (n.type === 'FunctionDeclaration' && n.id.name !== 'supabase' && !(opciones.omitir || []).includes(n.id.name)) { vm.runInContext(src.slice(n.start, n.end), ctx); nFun++; }
    else if (n.type === 'VariableDeclaration' && n.declarations.some(d => CONSTS.includes(d.id.name))) {
      try { vm.runInContext(src.slice(n.start, n.end).replace(/^(const|let)\b/, 'var'), ctx); } catch (e) { /* constante con dependencias: no hace falta */ }
    }
  });
  return { ctx, llamadas, nFun, run: c => vm.runInContext(c, ctx) };
}
module.exports = { cargar, RAIZ, scriptPrincipal };
