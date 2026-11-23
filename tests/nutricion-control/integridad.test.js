// Pruebas de INTEGRIDAD: node integridad.test.js — comparan la rama con main para demostrar que no se ha tocado nada más.
const assert = require('assert'), { execSync } = require('child_process'), fs = require('fs'), path = require('path'), vm = require('vm'), { cargar, RAIZ } = require('./cargar.js');
const git = c => execSync('git ' + c, { cwd: RAIZ, encoding: 'utf8', maxBuffer: 1 << 28 });
let ok = 0, fallos = 0; const informe = [];
function t(n, fn) { try { fn(); ok++; informe.push('  ✔ ' + n); } catch (e) { fallos++; informe.push('  ✘ ' + n + '\n      ' + e.message); } }
const archivos = git('diff --name-only main').split('\n').filter(Boolean).concat(git('ls-files --others --exclude-standard').split('\n').filter(Boolean));
const diffIndex = git('diff -U0 main -- prueba/index.html'), quitadas = diffIndex.split('\n').filter(l => l.startsWith('-') && !l.startsWith('---')), anadidas = diffIndex.split('\n').filter(l => l.startsWith('+') && !l.startsWith('+++'));
t('app/index.html (lo que ve el cliente) sin ningún cambio', () => assert.ok(!archivos.some(f => f.startsWith('app/')), archivos.join(', ')));
t('solo cambian prueba/index.html y tests/nutricion-control/', () => { const raros = archivos.filter(f => f !== 'prueba/index.html' && !f.startsWith('tests/nutricion-control/')); assert.deepStrictEqual(raros, []); });
t('prueba/index.html: solo líneas AÑADIDAS (0 borradas ni modificadas)', () => assert.strictEqual(quitadas.length, 0, quitadas.slice(0, 3).join('\n')));
const LINEA = '    ${mcCtrlPanelHtml(c, est, mc)}\n';
// Las ÚNICAS líneas añadidas dentro de funciones que ya existían (todas son adiciones; ninguna se modifica ni se borra):
const ENGANCHES = [
  { fn: 'mcSeccionHtml', linea: LINEA },
  { fn: 'nv2CargarPreferenciasGuardadas', linea: "      if (o.control && typeof o.control === 'object') est.control = mcCtrlControlLimpio(o.control);\n" },
  { fn: 'nv2CargarPreferenciasGuardadas', linea: '  mcCtrlAplicarControl(clienteId);\n' },
  { fn: 'mcAplicarPendiente', linea: '  mcCtrlAplicarControl(c.id);   // el tope por cliente (objetivo_nutri_v2.control) manda sobre el que traía el plan guardado\n' },
  { fn: 'nv2GuardarObjetivoCliente', linea: '    ...(est.control ? { control: est.control } : {}),\n' },
];
const quitarEnganches = txt => ENGANCHES.reduce((s, e) => s.replace(e.linea, ''), txt);
t('las líneas añadidas son SOLO el bloque delimitado + 5 líneas de enganche (quitándolas, el archivo es idéntico a main)', () => {
  const nuevo = fs.readFileSync(path.join(RAIZ, 'prueba/index.html'), 'utf8'), a = nuevo.indexOf('// ═══ CONTROL NUTRICIONAL V2 · FASE 1'), b = nuevo.indexOf('// ═══ FIN CONTROL NUTRICIONAL V2 (fase 1)');
  const bloque = nuevo.slice(a, nuevo.indexOf('\n', b) + 1), viejo = git('show main:prueba/index.html');
  ENGANCHES.forEach(e => assert.strictEqual(nuevo.split(e.linea).length - 1, 1, 'la línea de enganche debe aparecer exactamente una vez: ' + e.linea.trim().slice(0, 60)));
  assert.strictEqual(quitarEnganches(nuevo.replace(bloque, '')), viejo, 'quitando bloque y enganches, el archivo debe ser idéntico a main');
});
t('cada enganche está dentro de su función y esa función solo difiere de main en esa línea (las demás, byte a byte)', () => {
  const acorn = require('acorn'), { scriptPrincipal } = require('./cargar.js');
  const decl = html => { const src = scriptPrincipal(html), m = {}; acorn.parse(src, { ecmaVersion: 'latest' }).body.forEach(n => { if (n.type === 'FunctionDeclaration') m[n.id.name] = src.slice(n.start, n.end); }); return m; };
  const A = decl(fs.readFileSync(path.join(RAIZ, 'prueba/index.html'), 'utf8')), B = decl(git('show main:prueba/index.html'));
  ENGANCHES.forEach(e => assert.ok(A[e.fn].includes(e.linea), e.fn + ' no contiene su enganche'));
  [...new Set(ENGANCHES.map(e => e.fn))].forEach(fn => assert.strictEqual(ENGANCHES.filter(e => e.fn === fn).reduce((s, e) => s.replace(e.linea, ''), A[fn]), B[fn], fn + ' difiere de main en algo más que sus enganches'));
  assert.ok(A.mcSeccionHtml.includes('    ${peorHtml}\n' + LINEA), 'conexión del panel mal situada');
});
t('el bloque no se llama desde ningún otro sitio (ni validación, ni cálculo, ni la app): solo desde esos enganches', () => {
  const nuevo = fs.readFileSync(path.join(RAIZ, 'prueba/index.html'), 'utf8'), a = nuevo.indexOf('// ═══ CONTROL NUTRICIONAL V2 · FASE 1'), b = nuevo.indexOf('// ═══ FIN CONTROL NUTRICIONAL V2 (fase 1)'), fuera = quitarEnganches(nuevo.slice(0, a) + nuevo.slice(b));
  assert.ok(!/mcCtrl[A-Za-z]*|nutriDiagnosticoControlV2/.test(fuera), 'referencias fuera del bloque');
});
t('app/index.html no usa objetivo_nutri_v2 (el cliente no puede verse afectado por el nuevo campo control)', () => assert.ok(!/objetivo_nutri_v2/.test(fs.readFileSync(path.join(RAIZ, 'app/index.html'), 'utf8'))));
t('sin cambios de esquema ni SQL; la única escritura nueva es el PATCH de clientes.objetivo_nutri_v2 del tope', () => {
  assert.ok(!anadidas.some(l => /\b(ALTER|CREATE|DROP)\s+(TABLE|COLUMN|INDEX)|\.rpc\(|method:\s*'(POST|DELETE|PUT)'/i.test(l)), 'hay SQL o escrituras no previstas');
  const parches = anadidas.filter(l => /method:\s*'PATCH'/.test(l)); assert.strictEqual(parches.length, 1, 'debe haber exactamente un PATCH nuevo'); assert.ok(/supabase\('clientes'.*filter: `id=eq\.\$\{clienteId\}`.*objetivo_nutri_v2/.test(parches[0]), parches[0]);
});
t('plan_version = 5 intacto (mismas apariciones que en main)', () => { const c = s => (s.match(/plan_version:\s*5/g) || []).length; assert.strictEqual(c(fs.readFileSync(path.join(RAIZ, 'prueba/index.html'), 'utf8')), c(git('show main:prueba/index.html'))); });
t('el algoritmo de reescalado, mcPeorCaso, mcValidar y el guardado son byte a byte los de main', () => {
  const acorn = require('acorn'), { scriptPrincipal } = require('./cargar.js');
  const decl = html => { const src = scriptPrincipal(html), m = {}; acorn.parse(src, { ecmaVersion: 'latest' }).body.forEach(n => { if (n.type === 'FunctionDeclaration') m[n.id.name] = src.slice(n.start, n.end); }); return m; };
  const A = decl(fs.readFileSync(path.join(RAIZ, 'prueba/index.html'), 'utf8')), B = decl(git('show main:prueba/index.html'));
  const nombres = ['mcReescalarPlato', 'mcRedondeoEscala', 'mcAjustarALimites', 'mcPeorCaso', 'mcValidar', 'mcConstruirDias', 'mcCopiaPlato', 'mcGuardar', 'mcConstruirDiaSinEntreno', 'mcConVista', 'mcCambiarVista', 'mcListaDiaCore', 'mcOfrecido', 'mcCuadra', 'nv2ObjetivoComidaV4', 'nv2ObjetivoEfectivo', 'nutriMacrosPlato'];
  nombres.forEach(n => { assert.ok(B[n], n + ' no existe en main'); assert.strictEqual(A[n], B[n], n + ' ha cambiado'); });
  const perdidas = Object.keys(B).filter(n => !A[n]); assert.deepStrictEqual(perdidas, [], 'funciones eliminadas'); informe.push('      (' + Object.keys(B).length + ' funciones en main, ' + Object.keys(A).length + ' ahora: +' + (Object.keys(A).length - Object.keys(B).length) + ' nuevas, 0 eliminadas, ' + nombres.length + ' comprobadas una a una)');
});
t('index.html sigue siendo JavaScript válido (se carga entero con acorn) y expone mcPeorCaso original junto a las nuevas', () => { const e = cargar(); assert.strictEqual(typeof e.ctx.mcPeorCaso, 'function'); assert.strictEqual(typeof e.ctx.mcCtrlDia, 'function'); });
t('el fragmento de consola generado se ejecuta y define el diagnóstico', () => {
  const e = cargar(), snip = fs.readFileSync(path.join(__dirname, 'diagnostico-consola.js'), 'utf8'); vm.runInContext(snip, e.ctx); vm.runInContext(snip, e.ctx);   // dos veces: no debe fallar
  assert.strictEqual(typeof e.ctx.nutriDiagnosticoControlV2, 'function');
});
console.log('\nCONTROL V2 · integridad frente a main\n' + informe.join('\n') + `\n\n${ok} correctas, ${fallos} fallidas`);
process.exit(fallos ? 1 : 0);
