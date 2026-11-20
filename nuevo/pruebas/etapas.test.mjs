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
      etapas: (m, qs, body) => { if (m !== 'GET') escritos.push({ m, tabla: 'etapas', qs, body }); return m === 'POST' ? [{ id: 'n1', ...body }] : (m === 'GET' ? etapas : []); },
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
{ // CSD: etapa siguiente deshabilitada
  const { $, txt } = await abrir({ ...cliente, modelo_periodizacion: 'CSD' });
  $('[data-accion="cerrar-etapa"]').click();
  await hasta(() => $('[data-confirmar]'));
  t('cliente CSD: "Empezar la etapa siguiente" deshabilitado con aviso', () => {
    assert.ok($('[data-nueva]').disabled); assert.ok(txt().includes('pestaña Periodización'));
  });
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

console.log(`\n${ok} comprobaciones OK`);
process.exit(0);
