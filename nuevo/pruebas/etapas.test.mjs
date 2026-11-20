import assert from 'node:assert/strict';
import { crearEntorno, hasta, invalidarDatos, importar } from './harness.mjs';

let ok = 0; const t = (n, f) => { f(); ok++; console.log('✓', n); };
const iso = n => { const d = new Date(); d.setDate(d.getDate() - n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const calc = await importar('etapas/calculos.js');

// 1) Cálculos puros
t('ultimaFin y vistaDesde: día siguiente al fin de la última etapa; "todo" y sin etapas no filtran', () => {
  const l = [{ fecha_fin: '2026-03-10' }, { fecha_fin: '2026-06-30' }];
  assert.equal(calc.ultimaFin(l), '2026-06-30');
  assert.equal(calc.vistaDesde(l, 'actual'), '2026-07-01');
  assert.equal(calc.vistaDesde(l, 'todo'), null);
  assert.equal(calc.vistaDesde([], 'actual'), null);
});
t('mesociclosVisibles: el abierto siempre; los cerrados solo si acaban después de la etapa', () => {
  const ms = [{ id: 1, fecha_fin: '2026-06-01' }, { id: 2, fecha_fin: '2026-06-30' }, { id: 3, fecha_fin: '2026-07-20' }, { id: 4, fecha_fin: null }];
  assert.deepEqual(calc.mesociclosVisibles(ms, [{ fecha_fin: '2026-06-30' }], 'actual').map(m => m.id), [3, 4]);
  assert.equal(calc.mesociclosVisibles(ms, [{ fecha_fin: '2026-06-30' }], 'todo').length, 4);
});
t('filtrarMedidas incluye el pesaje del último día de la etapa; filtrarSesiones no', () => {
  const e = [{ fecha_fin: '2026-06-30' }];
  const arr = [{ fecha: '2026-06-29' }, { fecha: '2026-06-30' }, { fecha: '2026-07-02' }];
  assert.equal(calc.filtrarMedidas(e, arr, 'actual').length, 2);
  assert.equal(calc.filtrarSesiones(e, arr, 'actual').length, 1);
});
t('kcalAuto: inicio = último ≤ ini; fin = último dentro; sin historial usa el plan si fin ≥ hoy', () => {
  const hist = [{ fecha: '2026-01-01', kcal_objetivo: 2500 }, { fecha: '2026-02-15', kcal_objetivo: 2300 }, { fecha: '2026-03-20', kcal_objetivo: 2100 }];
  const a = calc.kcalAuto({ hist, plan: null }, '2026-02-01', '2026-03-31', '2026-04-01');
  assert.deepEqual([a.inicio, a.fin], [2500, 2100]);
  const b = calc.kcalAuto({ hist: [], plan: { kcal_objetivo: 2200 } }, '2026-02-01', '2026-04-01', '2026-04-01');
  assert.deepEqual([b.inicio, b.fin], [null, 2200]);
  assert.ok(b.texto.includes('objetivo actual'));
});
t('validarCierre: título, fechas, futuro y "Hasta = hoy" si empieza etapa nueva', () => {
  const hoy = '2026-11-20';
  assert.ok(calc.validarCierre({ titulo: ' ', ini: '2026-01-01', fin: hoy }, hoy).includes('título'));
  assert.ok(calc.validarCierre({ titulo: 'x', ini: '', fin: hoy }, hoy).includes('fechas'));
  assert.ok(calc.validarCierre({ titulo: 'x', ini: '2026-05-01', fin: '2026-04-01' }, hoy).includes('posterior'));
  assert.ok(calc.validarCierre({ titulo: 'x', ini: '2026-05-01', fin: '2026-12-01' }, hoy).includes('futura'));
  assert.ok(calc.validarCierre({ titulo: 'x', ini: '2026-05-01', fin: '2026-11-19', nueva: true }, hoy).includes('hoy'));
  assert.equal(calc.validarCierre({ titulo: 'x', ini: '2026-05-01', fin: hoy, nueva: true }, hoy), null);
});
t('datosEnRango: bloques que tocan el rango, rutinas de esos bloques o usadas en el rango', () => {
  const datos = {
    mesociclos: [{ id: 1, fecha_inicio: '2026-01-01', fecha_fin: '2026-02-28' }, { id: 2, fecha_inicio: '2026-03-01', fecha_fin: '2026-04-30' }],
    rutinas: [{ id: 'r1', mesociclo_id: 1 }, { id: 'r2', mesociclo_id: 2 }, { id: 'r3', mesociclo_id: null }, { id: 'r4', mesociclo_id: null }],
    ejercicios: [{ rutina_id: 'r1' }, { rutina_id: 'r2' }, { rutina_id: 'r3' }, { rutina_id: 'r4' }],
    medidas: [{ fecha: '2026-03-05' }, { fecha: '2026-05-01' }],
    sesiones: [{ fecha: '2026-03-10', rutina_id: 'r3' }, { fecha: '2026-06-01', rutina_id: 'r4' }]
  };
  const x = calc.datosEnRango(datos, '2026-03-01', '2026-03-31');
  assert.deepEqual(x.mesos.map(m => m.id), [2]);
  assert.deepEqual(x.rutinas.map(r => r.id).sort(), ['r2', 'r3']);
  assert.equal(x.ejercicios.length, 2); assert.equal(x.medidas.length, 1); assert.equal(x.sesiones.length, 1);
});
t('construirEtapa: snapshot solo con lo marcado y kcal nulas si no se guardan', () => {
  const datos = { mesociclos: [], rutinas: [{ id: 'r1' }], ejercicios: [], medidas: [{ fecha: '2026-03-05', peso: 80 }], sesiones: [{ fecha: '2026-03-06', ejercicio: 'Press', series: '10x50', rutina_id: 'r1', en_descarga: 0 }] };
  const f = (incl) => calc.construirEtapa({ cliente: { id: 9 }, titulo: ' T ', tipo: 'Volumen', ini: '2026-03-01', fin: '2026-03-31', nota: '  ', kIni: 2500, kFin: 2300, incl, datos, ctx: { plan: null, hist: [] } });
  const a = f({ rut: true, med: false, ses: true, kcal: false });
  assert.equal(a.cliente_id, '9'); assert.equal(a.titulo, 'T'); assert.equal(a.nota, null);
  assert.deepEqual([a.kcal_inicio, a.kcal_fin], [null, null]);
  assert.ok(a.snapshot.rutinas && a.snapshot.sesiones && !a.snapshot.medidas && !a.snapshot.nutricion);
  assert.equal(a.snapshot.sesiones[0].en_descarga, false);
  const b = f({ rut: false, med: true, ses: false, kcal: true });
  assert.deepEqual([b.kcal_inicio, b.kcal_fin], [2500, 2300]);
  assert.ok(b.snapshot.medidas && b.snapshot.nutricion.kcal_fin === 2300 && !b.snapshot.rutinas);
});

// 2) Pestaña
const cliente = { id: 9, codigo: 'JC009', nombre: 'Elena <b>', estado_cliente: 'ACTIVO' };
async function abrir(cli, { etapas = [], fallos = {}, mesociclos = [] } = {}) {
  await invalidarDatos();
  const escritos = [];
  const { w, llamadas } = crearEntorno({
    clientes: [cli], fallos,
    tablas: {
      etapas: (m, qs, body) => { if (m !== 'GET') escritos.push({ m, tabla: 'etapas', qs, body }); return m === 'POST' ? [{ id: 'n1', ...body }] : (m === 'GET' ? (/(^|[?&])id=eq\./.test(qs) ? etapas.filter(x => qs.includes('id=eq.' + x.id)) : etapas) : []); },
      mesociclos: (m, qs, body) => { if (m !== 'GET') escritos.push({ m, tabla: 'mesociclos', qs, body }); return m === 'POST' ? [{ id: 'mn', ...body }] : (m === 'GET' ? mesociclos : []); },
      rutinas: [{ id: 'r1', cliente_id: 9, mesociclo_id: 1, nombre: 'Torso' }], ejercicios: [{ id: 'e1', rutina_id: 'r1' }],
      sesiones: [{ id: 's1', fecha: iso(30), ejercicio: 'Press', series: '10x50', rutina_id: 'r1' }],
      seguimiento_corporal: [{ id: 'm1', fecha: iso(30), peso: 80 }],
      planes_nutricion: [{ kcal_objetivo: 2200, tdee: 2600, objetivo_calorico: 'Definición', peso: 80 }],
      nutricion_historial: [{ fecha: iso(60), kcal_objetivo: 2500 }], rm_estimaciones: []
    }
  });
  const { arrancar } = await importar('core/app.js');
  await arrancar();
  w.location.hash = '#/clientes/JC009/etapas';
  const $ = s => w.document.querySelector(s);
  await hasta(() => $('[data-accion="cerrar-etapa"]') || $('[data-accion="copiar-sql"]'));
  return { w, escritos, llamadas, $, $$: s => [...w.document.querySelectorAll(s)], txt: () => w.document.body.textContent.replace(/\s+/g, ' ') };
}

async function abrirDetalle(fila) {
  const r = await abrir(cliente, { etapas: [fila] });
  r.$('[data-accion="ver-etapa"]').click();
  await hasta(() => r.$('.et-kpis'));
  return r;
}
const poner = (el, v, ev = 'input') => { el.value = v; el.dispatchEvent(new el.ownerDocument.defaultView.Event(ev, { bubbles: true })); };

{
  const { $, $$, txt } = await abrir(cliente);
  t('pestaña Etapas en la ficha; sin etapas explica qué hace "Cerrar etapa"', () => {
    assert.ok($('[data-pestana="etapas"]'));
    assert.ok(txt().includes('Todavía no hay etapas guardadas'));
    assert.ok(txt().includes('Etapas de Elena <b>') && !$('.pz-title b, [data-accion="cerrar-etapa"] b'));
  });
}
{
  const { $, $$, txt } = await abrir(cliente, { etapas: [{ id: 'x1', titulo: 'Def <i>', tipo: 'Definición', fecha_inicio: '2026-01-01', fecha_fin: '2026-03-31', kcal_inicio: 2500, kcal_fin: 2300, nota: 'Bien' }] });
  t('lista de etapas: título escapado, fechas dd/mm/aaaa, semanas y calorías', () => {
    assert.ok(txt().includes('Def <i>') && !$('.pz-title i'));
    assert.ok(txt().includes('01/01/2026 → 31/03/2026 · 13 sem'));
    assert.ok(txt().includes('2500 → 2300 kcal (−200)'));
  });
}
{
  const { $, txt } = await abrir(cliente, { fallos: { 'etapas:GET': 'relation "etapas" does not exist' } });
  t('sin tabla etapas: muestra el SQL y el botón de copiar', () => {
    assert.ok(txt().includes('falta crear las tablas en Supabase') && txt().includes('create table if not exists etapas'));
  });
}
{ // cerrar etapa (cliente ATR, sin etapa siguiente)
  const { $, $$, w, escritos, txt } = await abrir(cliente);
  $('[data-accion="cerrar-etapa"]').click();
  await hasta(() => $('[data-confirmar]'));
  t('modal: desde = primera fecha con datos, hasta = hoy, kcal sacadas del historial', () => {
    assert.equal($('[data-campo="fin"]').value, iso(0));
    assert.equal($('[data-campo="kcalIni"]').value, '2500');
    assert.ok($('[data-preview]').textContent.includes('Rutinas: 1') && $('[data-preview]').textContent.includes('Medidas: 1'));
  });
  $('[data-confirmar]').click();
  t('guardar sin título: avisa y no escribe', () => { assert.ok($('[data-error]').textContent.includes('título')); assert.equal(escritos.length, 0); });
  poner($('[data-campo="titulo"]'), 'Definición otoño');
  poner($('[data-campo="kcalFin"]'), '2100,5');
  $('[data-chk="med"]').checked = false; $('[data-chk="med"]').dispatchEvent(new w.Event('change', { bubbles: true }));
  $('[data-confirmar]').click();
  await hasta(() => escritos.length && !$('[data-confirmar]'));
  t('guardar: POST etapas con cliente_id texto, snapshot sin medidas y kcal editadas', () => {
    const e = escritos[0];
    assert.equal(e.tabla, 'etapas'); assert.equal(e.m, 'POST');
    assert.equal(e.body.cliente_id, '9'); assert.equal(e.body.titulo, 'Definición otoño'); assert.equal(e.body.kcal_inicio, 2500); assert.equal(e.body.kcal_fin, 2100.5);
    assert.ok(e.body.snapshot.rutinas.length === 1 && e.body.snapshot.sesiones.length === 1 && !e.body.snapshot.medidas);
    assert.equal(escritos.length, 1);
  });
}
{ // empezar etapa siguiente (ATR)
  const activo = { id: 7, cliente_id: 9, numero: 2, nombre: 'ATR', tipo_atr: 'acu_carga', fecha_inicio: iso(30), fecha_fin: null };
  const { $, w, escritos } = await abrir(cliente, { mesociclos: [activo] });
  $('[data-accion="cerrar-etapa"]').click();
  await hasta(() => $('[data-confirmar]'));
  poner($('[data-campo="titulo"]'), 'Cierre'); poner($('[data-campo="fin"]'), iso(1));
  $('[data-nueva]').checked = true; $('[data-nueva]').dispatchEvent(new w.Event('change', { bubbles: true }));
  $('[data-confirmar]').click();
  t('etapa siguiente con "Hasta" ≠ hoy: avisa y no escribe', () => { assert.ok($('[data-error]').textContent.includes('tiene que ser hoy')); assert.equal(escritos.length, 0); });
  poner($('[data-campo="fin"]'), iso(0)); poner($('[data-campo="nuevoNombre"]'), 'Bloque B'); poner($('[data-campo="nuevoTipo"]'), 'acu_carga', 'change');
  $('[data-confirmar]').click();
  await hasta(() => w.location.hash === '#/clientes/JC009/rutinas');
  t('etapa siguiente: guarda etapa, cierra el bloque activo hoy, crea bloque nuevo y abre Rutinas', () => {
    assert.deepEqual(escritos.map(e => e.m + ' ' + e.tabla), ['POST etapas', 'PATCH mesociclos', 'POST mesociclos']);
    assert.ok(escritos[1].qs.includes('id=eq.7')); assert.deepEqual(escritos[1].body, { fecha_fin: iso(0) });
    assert.deepEqual([escritos[2].body.nombre, escritos[2].body.tipo_atr, escritos[2].body.fecha_inicio, escritos[2].body.fecha_fin], ['Bloque B', 'acu_carga', iso(0), null]);
  });
}
{ // CSD / JCTW: asistente en dos pasos
  const activo = { id: 7, cliente_id: 9, numero: 2, nombre: 'Macrociclo anual · Volumen', tipo_atr: 'carga', fecha_inicio: iso(30), fecha_fin: null };
  const { $, $$, w, escritos, txt } = await abrir({ ...cliente, modelo_periodizacion: 'CSD' }, { mesociclos: [activo] });
  $('[data-accion="cerrar-etapa"]').click();
  await hasta(() => $('[data-confirmar]'));
  t('cliente CSD: la etapa siguiente está disponible y el botón pasa a "Siguiente →"', () => {
    assert.ok(!$('[data-nueva]').disabled);
    assert.equal($('[data-confirmar]').textContent, 'Guardar etapa');
    $('[data-nueva]').checked = true; $('[data-nueva]').dispatchEvent(new w.Event('change', { bubbles: true }));
    assert.equal($('[data-confirmar]').textContent, 'Siguiente →');
  });
  poner($('[data-campo="titulo"]'), 'Cierre CSD'); poner($('[data-campo="fin"]'), iso(1));
  $('[data-confirmar]').click();
  t('paso 1 con "Hasta" ≠ hoy: avisa y no pasa al paso 2', () => { assert.ok($('[data-error]').textContent.includes('tiene que ser hoy')); assert.ok(!$('[data-mc-confirmar]')); });
  poner($('[data-campo="fin"]'), iso(0));
  $('[data-confirmar]').click();
  await hasta(() => $('[data-mc-confirmar]'));
  t('paso 2: propuesta de macrociclo con "Paso 2 de 2", desde hoy y SIN escribir nada todavía', () => {
    assert.ok(txt().includes('Paso 2 de 2 · Etapa nueva y macrociclo') && !$('[data-campo="titulo"]'));
    assert.equal($('[data-mc-inicio]').value, iso(0));
    assert.ok($('[data-mc-confirmar]').textContent.includes('Guardar etapa y crear'));
    assert.equal(escritos.length, 0);
  });
  $('[data-mc-volver]').click();
  await hasta(() => $('[data-campo="titulo"]'));
  t('← Volver: reabre el paso 1 con lo que ya habías escrito', () => {
    assert.equal($('[data-campo="titulo"]').value, 'Cierre CSD'); assert.equal($('[data-campo="fin"]').value, iso(0));
    assert.ok($('[data-nueva]').checked && $('[data-confirmar]').textContent === 'Siguiente →');
  });
  $('[data-confirmar]').click();
  await hasta(() => $('[data-mc-confirmar]'));
  $('[data-mc-etapa-tipo]').value = 'Definición'; $('[data-mc-etapa-tipo]').dispatchEvent(new w.Event('change', { bubbles: true }));
  const nn = $$('[data-mc-tipo]').length;
  $('[data-mc-confirmar]').click();
  await hasta(() => w.location.hash === '#/clientes/JC009/rutinas');
  t('confirmar: guarda la etapa, cierra el bloque activo el día antes y crea los bloques "Macrociclo anual · Definición"', () => {
    assert.equal(escritos[0].m + ' ' + escritos[0].tabla, 'POST etapas');
    assert.equal(escritos[0].body.titulo, 'Cierre CSD'); assert.equal(escritos[0].body.cliente_id, '9');
    assert.equal(escritos[1].m + ' ' + escritos[1].tabla, 'PATCH mesociclos');
    assert.ok(escritos[1].qs.includes('id=eq.7'));
    const posts = escritos.filter(e => e.m === 'POST' && e.tabla === 'mesociclos');
    assert.equal(posts.length, nn);
    assert.deepEqual(posts.map(p => p.body.numero), posts.map((_, i) => i + 1));
    assert.ok(posts.every(p => p.body.nombre === 'Macrociclo anual · Definición'));
    const d = new Date(posts[0].body.fecha_inicio + 'T00:00:00'); d.setDate(d.getDate() - 1);
    assert.equal(escritos[1].body.fecha_fin, `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
  });
}
{ // «Crear macrociclo (asistente)» desde Periodización con datos: pasa por «Cerrar etapa» con la etapa siguiente marcada
  const { $, w, escritos } = await abrir({ ...cliente, modelo_periodizacion: 'CSD' });
  w.location.hash = '#/clientes/JC009/periodizacion';
  await hasta(() => $('[data-accion="crear-macrociclo"]'));
  $('[data-accion="crear-macrociclo"]').click();
  await hasta(() => $('[data-campo="titulo"]'));
  t('desde Periodización con datos: abre «Cerrar etapa» con "Empezar la etapa siguiente" ya marcado', () => {
    assert.ok($('[data-nueva]').checked); assert.equal($('[data-confirmar]').textContent, 'Siguiente →');
    assert.equal(escritos.length, 0);
  });
  $('[data-cancelar]').click();
  t('cancelar el paso 1 no escribe nada', () => assert.equal(escritos.length, 0));
}
{ // error al guardar
  const { $, escritos } = await abrir(cliente, { fallos: { 'etapas:POST': 'permission denied' } });
  $('[data-accion="cerrar-etapa"]').click();
  await hasta(() => $('[data-confirmar]'));
  poner($('[data-campo="titulo"]'), 'X');
  $('[data-confirmar]').click();
  await hasta(() => $('[data-error]').textContent.includes('permission denied'));
  t('error al guardar: se dice en el modal y el botón se reactiva', () => { assert.ok(!$('[data-confirmar]').disabled); });
  $('[data-cancelar]').click();
  t('cancelar cierra el modal', () => assert.ok(!$('[data-confirmar]')));
}
{ // borrar
  const { $, escritos } = await abrir(cliente, { etapas: [{ id: 'x1', titulo: 'Def', fecha_inicio: '2026-01-01', fecha_fin: '2026-03-31' }] });
  $('[data-accion="borrar-etapa"]').click();
  await hasta(() => $('[data-r="si"]'));
  $('[data-r="si"]').click();
  await hasta(() => escritos.length);
  t('borrar etapa: confirma y hace DELETE solo de esa fila', () => { assert.equal(escritos[0].m, 'DELETE'); assert.ok(escritos[0].qs.includes('id=eq.x1')); });
}

// 3) Detalle de etapa
import fs from 'node:fs';
const { etapaProgresoEjercicios } = await importar('etapas/progreso.js');
const { parseSeriesDetalle } = await importar('historial/calculos.js');
const ses = (f, ej, series, extra = {}) => ({ fecha: iso(f), ejercicio: ej, series, rutina_id: 'r1', ...extra });
const snapshot = {
  sesiones: [
    ses(60, 'Press banca', '50kg 10rep\n50kg 9rep'), ses(53, 'press  banca', '52kg 10rep'), ses(46, 'Press Banca', '55kg 10rep'), ses(39, 'Press banca', '57kg 10rep'), ses(32, 'Press banca', '60kg 10rep'),
    ses(60, 'Sentadilla', '80kg 8rep'), ses(50, 'Sentadilla', '80kg 8rep'), ses(40, 'Sentadilla', '80kg 8rep'), ses(30, 'Sentadilla', '80kg 8rep'),
    ses(60, 'Remo', '40kg 10rep'), ses(50, 'Remo', '42kg 10rep'), ses(40, 'Remo', '38kg 10rep'),
    ses(60, 'Curl', '10kg 10rep'), ses(50, 'Curl', '10kg 10rep'),
    ses(45, 'Jalón', '60kg 10rep', { en_descarga: 1 }), ses(20, 'Dominadas', '8rep'), ses(15, 'Dominadas', '9rep'), ses(10, 'Dominadas', '10rep'), ses(5, 'Dominadas', '10rep')
  ],
  medidas: [{ fecha: iso(60), peso: 90, abdomen: 100 }, { fecha: iso(32), peso: 85, abdomen: 94 }],
  rutinas: [{ id: 'r1', nombre: '<b>Torso</b>', mesociclo_id: 1, orden: 1 }, { id: 'r2', nombre: 'Suelta', mesociclo_id: null, orden: 2 }],
  mesociclos: [{ id: 1, nombre: 'Base', numero: 1, fecha_inicio: iso(60), fecha_fin: iso(30) }],
  ejercicios: [{ rutina_id: 'r1', nombre: 'Press banca', series: 4, reps: '8-10', rir: 2, orden: 1 }],
  nutricion: { kcal_inicio: 2500, kcal_fin: 2300, historial: [{ fecha: iso(45), kcal_objetivo: 2400, objetivo_calorico: 'Déficit' }], plan_actual: { macros: { proteina: 160, carbo: 250, grasa: 70 } }, menu: null }
};
t('progreso por ejercicio: agrupa sin mayúsculas/tildes, estados y sin descargas', () => {
  const r = etapaProgresoEjercicios(snapshot);
  const f = n => r.filas.find(x => x.nombre === n);
  assert.equal(f('Press banca').estado, 'sube'); assert.equal(f('Press banca').n, 5); assert.equal(f('Press banca').modo, 'e1rm');
  assert.equal(f('Sentadilla').estado, 'igual');
  assert.equal(f('Remo').estado, 'orient');
  assert.equal(f('Curl').estado, 'pocos');
  assert.equal(f('Dominadas').modo, 'reps'); assert.equal(f('Dominadas').estado, 'sube');
  assert.ok(!r.filas.some(x => x.nombre === 'Jalón'));
  assert.deepEqual(r.cuenta, { sube: 2, igual: 1, baja: 0, orient: 1, pocos: 1 });
  assert.ok(r.relMediana != null);
});
t('progreso por ejercicio: idéntico a prueba/index.html', () => {
  const src = fs.readFileSync(new URL('../../prueba/index.html', import.meta.url), 'utf8');
  const a = src.indexOf('function _etMedia'), b = src.indexOf('function setEtapaSeccion');
  const orig = new Function('parseSeriesDetalle', '_etD', `${src.slice(a, b)}; return etapaProgresoEjercicios;`)(parseSeriesDetalle, x => String(x || '').slice(0, 10));
  assert.deepEqual(etapaProgresoEjercicios(snapshot), orig(snapshot));
  assert.deepEqual(etapaProgresoEjercicios({ sesiones: [] }), orig({ sesiones: [] }));
});
{
  const fila = { id: 'x1', titulo: 'Def <i>', tipo: 'Definición', fecha_inicio: iso(60), fecha_fin: iso(30), kcal_inicio: 2500, kcal_fin: 2300, nota: 'Bien', snapshot };
  const { $, $$, txt, w } = await abrirDetalle(fila);
  t('detalle: cabecera con título escapado y tarjetas Duración, Entrenos, Calorías y Peso', () => {
    assert.ok(txt().includes('Def <i>') && !$('.et-card-t i'));
    const k = $$('.et-kpi').map(x => x.textContent.replace(/\s+/g, ' ').trim());
    assert.equal(k.length, 4);
    assert.ok(k[0].startsWith('Duración') && k[1].startsWith('Entrenos') && k[2].includes('2500 → 2300') && k[3].includes('90 → 85 kg'));
  });
  t('detalle: pestañas internas según lo guardado y resumen con progreso y nutrición', () => {
    assert.deepEqual($$('[data-seccion].pz-chip').map(x => x.dataset.seccion), ['resumen', 'ejercicios', 'medidas', 'rutinas', 'sesiones']);
    assert.ok(txt().includes('PROGRESO EN UN VISTAZO') && txt().includes('Mayores mejoras') && txt().includes('En una definición, mantener la fuerza'));
    assert.ok(txt().includes('NUTRICIÓN') && txt().includes('2500 → 2300 kcal (−200)') && txt().includes('P 160 · C 250 · G 70 g') && txt().includes('Déficit'));
    assert.ok(txt().includes('🔒 Plan de menús: aún no se guarda'));
  });
  $('[data-seccion="ejercicios"]').click();
  t('ejercicios: lista con filtros y conteo; filtrar por "Mejoraron"', () => {
    assert.ok(txt().includes('PROGRESO POR EJERCICIO') && $$('.et-cel').length === 5);
    $('[data-filtro-ej="sube"]').click();
    assert.equal($$('.et-cel').length, 2);
    $('[data-filtro-ej="todos"]').click();
  });
  $('[data-seccion="medidas"]').click();
  t('medidas: tabla inicio → fin con diferencia', () => assert.ok(txt().includes('Peso') && txt().includes('85 kg') && txt().includes('2 registros') && txt().includes('−6')));
  $('[data-seccion="rutinas"]').click();
  t('rutinas: agrupadas por bloque, con sueltas, nombre escapado', () => {
    assert.ok(txt().includes('Base 1') && txt().includes('Rutinas sin bloque') && txt().includes('<b>Torso</b>') && !$('summary b'));
    assert.ok(txt().includes('Press banca — 4 × 8-10 · RIR 2'));
  });
  $('[data-seccion="sesiones"]').click();
  t('sesiones: la más reciente primero y marca de descarga', () => {
    assert.ok(txt().includes('REGISTRO DE SESIONES') && txt().includes('· descarga'));
    const f = iso(5).split('-');
    assert.equal($$('.et-card b')[0].textContent, `${f[2]}/${f[1]}/${f[0]}`);
  });
  $('[data-accion="volver-etapas"]').click();
  t('← Etapas vuelve a la lista', () => assert.ok($('[data-accion="cerrar-etapa"]') && !$('.et-kpis')));
}
{
  const fila = { id: 'x2', titulo: 'Solo rutina', fecha_inicio: iso(60), fecha_fin: iso(30), snapshot: { rutinas: [], ejercicios: [], mesociclos: [] } };
  const { $, $$ } = await abrirDetalle(fila);
  t('detalle con snapshot parcial: solo Resumen y Rutinas, sin tarjetas de entrenos', () => {
    assert.deepEqual($$('[data-seccion].pz-chip').map(x => x.dataset.seccion), ['resumen', 'rutinas']);
    assert.equal($$('.et-kpi').length, 1);
  });
}
{
  const fila = { id: 'x3', titulo: 'Borrable', fecha_inicio: iso(60), fecha_fin: iso(30), snapshot: {} };
  const { $, escritos } = await abrirDetalle(fila);
  $('[data-accion="borrar-etapa"]').click();
  await hasta(() => $('[data-r="si"]'));
  $('[data-r="si"]').click();
  await hasta(() => escritos.length);
  t('borrar desde el detalle: DELETE y vuelve a la lista', () => { assert.equal(escritos[0].m, 'DELETE'); assert.ok(escritos[0].qs.includes('id=eq.x3')); });
}

console.log(`\n${ok} comprobaciones OK`);
process.exit(0);
