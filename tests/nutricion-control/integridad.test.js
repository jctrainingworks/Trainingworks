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
t('las líneas añadidas están todas dentro del bloque delimitado «CONTROL NUTRICIONAL V2»', () => {
  const nuevo = fs.readFileSync(path.join(RAIZ, 'prueba/index.html'), 'utf8'), a = nuevo.indexOf('// ═══ CONTROL NUTRICIONAL V2 · FASE 1'), b = nuevo.indexOf('// ═══ FIN CONTROL NUTRICIONAL V2 (fase 1)');
  const bloque = nuevo.slice(a, nuevo.indexOf('\n', b) + 1), viejo = git('show main:prueba/index.html');
  assert.strictEqual(nuevo.replace(bloque, ''), viejo, 'quitando el bloque, el archivo debe ser idéntico a main');
});
t('el bloque no se llama desde fuera de sí mismo (sin conectar a interfaz, guardado ni app)', () => {
  const nuevo = fs.readFileSync(path.join(RAIZ, 'prueba/index.html'), 'utf8'), a = nuevo.indexOf('// ═══ CONTROL NUTRICIONAL V2 · FASE 1'), b = nuevo.indexOf('// ═══ FIN CONTROL NUTRICIONAL V2 (fase 1)'), fuera = nuevo.slice(0, a) + nuevo.slice(b);
  assert.ok(!/mcCtrl[A-Za-z]*|nutriDiagnosticoControlV2/.test(fuera), 'referencias fuera del bloque');
});
t('sin cambios de esquema ni SQL en lo añadido', () => assert.ok(!anadidas.some(l => /\b(ALTER|CREATE|DROP)\s+(TABLE|COLUMN|INDEX)|\.rpc\(|method:\s*'(POST|PATCH|DELETE|PUT)'/i.test(l)), 'hay SQL o escritura'));
t('plan_version = 5 intacto (mismas apariciones que en main)', () => { const c = s => (s.match(/plan_version:\s*5/g) || []).length; assert.strictEqual(c(fs.readFileSync(path.join(RAIZ, 'prueba/index.html'), 'utf8')), c(git('show main:prueba/index.html'))); });
t('el algoritmo de reescalado, mcPeorCaso, mcValidar y el guardado son byte a byte los de main', () => {
  const acorn = require('acorn'), { scriptPrincipal } = require('./cargar.js');
  const decl = html => { const src = scriptPrincipal(html), m = {}; acorn.parse(src, { ecmaVersion: 'latest' }).body.forEach(n => { if (n.type === 'FunctionDeclaration') m[n.id.name] = src.slice(n.start, n.end); }); return m; };
  const A = decl(fs.readFileSync(path.join(RAIZ, 'prueba/index.html'), 'utf8')), B = decl(git('show main:prueba/index.html'));
  const nombres = ['mcReescalarPlato', 'mcRedondeoEscala', 'mcAjustarALimites', 'mcPeorCaso', 'mcValidar', 'mcConstruirDias', 'mcCopiaPlato', 'mcGuardar', 'mcConstruirDiaSinEntreno', 'mcConVista', 'mcCambiarVista', 'mcListaDiaCore', 'mcOfrecido', 'mcCuadra', 'nv2ObjetivoComidaV4', 'nv2ObjetivoEfectivo', 'nutriMacrosPlato', 'nv2GuardarObjetivoCliente'];
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
