import assert from 'node:assert/strict';
import fs from 'node:fs';
import { crearEntorno, hasta, invalidarDatos, importar, RAIZ } from './harness.mjs';

let ok = 0; const t = (n, f) => { f(); ok++; console.log('✓', n); };
const iso = n => { const d = new Date(); d.setDate(d.getDate() - n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

// 1) El generador es idéntico al de prueba/index.html (se extrae su código y se compara salida a salida).
{
  const src = fs.readFileSync(RAIZ + '/../prueba/index.html', 'utf8');
  const cortar = nombre => { const i = src.indexOf('function ' + nombre); return src.slice(i, src.indexOf('\n}\n', i) + 3); };
  const original = new Function(cortar('fechaLocalISO') + cortar('generarMacrocicloPropuestaCSD') + 'return generarMacrocicloPropuestaCSD;')();
  const { generarMacrocicloPropuestaCSD: nuevo } = await importar('clientes/periodizacion.js');
  t('generador de macrociclo: idéntico a prueba para 8 fechas de inicio', () => {
    for (const f of ['2026-09-01', '2026-01-05', '2026-06-15', '2026-07-01', '2026-11-20', '2026-12-01', '2027-02-28', '2026-03-31']) {
      assert.deepEqual(nuevo(f), original(f), f);
    }
  });
  t('generador: ≥52 semanas, bloques contiguos, arranca Carga→Sobrecarga→Descarga', () => {
    const b = nuevo('2026-09-01');
    assert.deepEqual(b.slice(0, 3).map(x => x.tipo), ['carga', 'sobrecarga', 'descarga']);
    for (let i = 1; i < b.length; i++) {
      const previo = new Date(b[i - 1].fecha_fin + 'T00:00:00'); previo.setDate(previo.getDate() + 1);
      assert.equal(b[i].fecha_inicio, `${previo.getFullYear()}-${String(previo.getMonth() + 1).padStart(2, '0')}-${String(previo.getDate()).padStart(2, '0')}`);
    }
    assert.ok(b.some(x => x.tipo === 'mantenimiento'));
  });
}

// 2) Tarjeta de modelo en Datos + modal de propuesta
const cliente = { id: 9, codigo: 'JC009', nombre: 'Elena <b>', plan: '3MESES', estado_cliente: 'ACTIVO' };
async function abrir(cli, { fallos = {}, mesociclos = [] } = {}) {
  await invalidarDatos();
  const escritos = [];
  const { w, llamadas } = crearEntorno({
    clientes: [cli], fallos,
    tablas: {
      mesociclos: (m, qs, body) => { if (m !== 'GET') escritos.push({ m, qs, body }); return m === 'POST' ? [{ id: 'nuevo', ...body }] : (m === 'PATCH' ? [] : mesociclos); },
      rm_estimaciones: []
    }
  });
  const { arrancar } = await importar('core/app.js');
  await arrancar();
  w.location.hash = '#/clientes/JC009/datos';
  const $ = s => w.document.querySelector(s);
  const $$ = s => [...w.document.querySelectorAll(s)];
  await hasta(() => $('[data-modelo-sel]'));
  const cambiar = (el, v) => { el.value = v; el.dispatchEvent(new w.Event('change', { bubbles: true })); };
  return { w, llamadas, escritos, $, $$, cambiar, txt: () => w.document.body.textContent.replace(/\s+/g, ' ') };
}

{
  const { llamadas, $, cambiar, txt } = await abrir(cliente);
  t('modelo: por defecto ATR y sin bloque de macrociclo', () => {
    assert.equal($('[data-modelo-sel]').value, 'ATR');
    assert.ok(!$('[data-fecha-macrociclo]'));
    assert.ok(txt().includes('🧭 Modelo de periodización'));
  });
  cambiar($('[data-modelo-sel]'), 'CSD');
  $('[data-accion="guardar-modelo"]').click();
  await hasta(() => $('[data-fecha-macrociclo]'));
  t('guardar CSD: PATCH y aparece el bloque de macrociclo (botón deshabilitado sin fecha)', () => {
    const p = llamadas.find(l => l.tabla === 'clientes' && l.method === 'PATCH');
    assert.deepEqual(p.body, { modelo_periodizacion: 'CSD' });
    assert.ok(txt().includes('✅ Modelo de periodización guardado (CSD)'));
    assert.ok($('[data-accion="propuesta-macrociclo"]').disabled);
  });
  $('[data-fecha-macrociclo]').value = '2026-09-01';
  $('[data-accion="guardar-fecha-macrociclo"]').click();
  await hasta(() => !$('[data-accion="propuesta-macrociclo"]').disabled);
  t('guardar fecha de inicio: PATCH y se habilita "Generar propuesta"', () => {
    const p = llamadas.filter(l => l.tabla === 'clientes' && l.method === 'PATCH').pop();
    assert.deepEqual(p.body, { fecha_inicio_macrociclo: '2026-09-01' });
    assert.equal($('[data-fecha-macrociclo]').value, '2026-09-01');
  });
}

{
  const activo = { id: 'mAct', numero: 1, nombre: 'Base', tipo_atr: 'carga', fecha_inicio: iso(30), fecha_fin: null };
  const { w, escritos, $, $$, cambiar, txt } = await abrir({ ...cliente, modelo_periodizacion: 'CSD', fecha_inicio_macrociclo: '2026-09-01' }, { mesociclos: [activo] });
  $('[data-accion="propuesta-macrociclo"]').click();
  await hasta(() => $('[data-mc-confirmar]'));
  const filas = () => $$('[data-mc-tipo]').length;
  const n0 = filas();
  t('modal: una fila por bloque, nombre escapado y botón con el total', () => {
    assert.ok(n0 >= 8);
    assert.ok(txt().includes('Elena <b> — JC009'));
    assert.ok(!$('.modal-sub b'));
    assert.ok($('[data-mc-confirmar]').textContent.includes(`Confirmar y crear ${n0} mesociclos`));
    // La etiqueta de semanas usa la misma fórmula que prueba (redondea hacia arriba un bloque de 7 sem → "8 sem").
    assert.ok($('[data-mc-tipo="0"]').value === 'carga' && txt().includes('8 sem'));
  });
  t('modal: cambiar tipo, quitar y añadir bloque', () => {
    cambiar($('[data-mc-tipo="0"]'), 'mantenimiento');
    assert.equal($('[data-mc-tipo="0"]').value, 'mantenimiento');
    $('[data-mc-quitar="1"]').click();
    assert.equal(filas(), n0 - 1);
    $('[data-mc-anadir]').click();
    assert.equal(filas(), n0);
    assert.ok($$('[data-mc-tipo]').pop().value === 'carga');
    cambiar($('[data-mc-fecha="0:fecha_fin"]'), '2026-09-14');
    assert.ok(txt().includes('3 sem'));
  });
  $('[data-mc-confirmar]').click();
  await hasta(() => !$('[data-mc-confirmar]'));
  t('confirmar: cierra el activo el día antes del primer bloque y crea los mesociclos "Macrociclo anual"', () => {
    const patch = escritos.find(e => e.m === 'PATCH');
    assert.ok(patch.qs.includes('id=eq.mAct'));
    assert.deepEqual(patch.body, { fecha_fin: '2026-08-31' });
    const posts = escritos.filter(e => e.m === 'POST');
    assert.equal(posts.length, n0);
    assert.deepEqual(posts.map(p => p.body.numero), posts.map((_, i) => i + 1));
    assert.ok(posts.every(p => p.body.nombre === 'Macrociclo anual' && p.body.cliente_id === 9 && p.body.fecha_fin && p.body.tipo_atr));
    assert.equal(posts[0].body.tipo_atr, 'mantenimiento');
    assert.ok(txt().includes(`✅ Macrociclo creado: ${n0} bloques`));
  });
}

{
  const { $, cambiar, escritos, txt } = await abrir({ ...cliente, modelo_periodizacion: 'CSD', fecha_inicio_macrociclo: '2026-09-01' }, { fallos: { 'mesociclos:POST': 'sin permiso' } });
  $('[data-accion="propuesta-macrociclo"]').click();
  await hasta(() => $('[data-mc-confirmar]'));
  $('[data-mc-confirmar]').click();
  await hasta(() => $('.modal .alert-error'));
  t('error al crear: se dice dentro del modal, sigue abierto y se puede reintentar', () => {
    assert.ok($('.modal .alert-error').textContent.includes('Error creando el macrociclo: sin permiso'));
    assert.ok($('[data-mc-confirmar]') && !$('[data-mc-confirmar]').disabled);
  });
  $('[data-mc-cancelar]').click();
  t('cancelar cierra el modal sin escribir nada', () => {
    assert.ok(!$('.modal-overlay'));
    assert.equal(escritos.filter(e => e.m === 'POST').length, 0);
  });
}

console.log(`\n${ok} comprobaciones OK`);
process.exit(0);
