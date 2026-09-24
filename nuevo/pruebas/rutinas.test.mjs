import assert from 'node:assert/strict';
import { crearEntorno, hasta, esperar, importar, invalidarDatos } from './harness.mjs';

const semanas = n => new Date(Date.now() - n * 7 * 86400000).toISOString().slice(0, 10);
const cliente = { id: 5, codigo: 'JC005', nombre: 'Pablo', plan: '3MESES', estado_cliente: 'ACTIVO' };
const mesociclos = [
  { id: 'm0', numero: 1, nombre: 'Base', tipo_atr: null, fecha_inicio: semanas(60), fecha_fin: semanas(41) },
  { id: 'm1', numero: 2, nombre: null, tipo_atr: 'acu_carga', fecha_inicio: semanas(40), fecha_fin: null }
];
const ejerciciosIniciales = () => [
  { id: 'e1', rutina_id: 'rA', nombre: 'Press <img src=x onerror=alert(1)>', series: '3', repeticiones: '8-10, 8-10, 6-8', rir: '2, 1, 0', descanso: '90seg', tecnica: 'normal, normal, drop_set:2:20', grupo_tecnica: 'superserie:A', notas: 'Codos <b>cerrados</b>', orden: 1 },
  { id: 'e2', rutina_id: 'rA', nombre: 'Aperturas', series: '4', repeticiones: '12', rir: '2', descanso: '60seg', tecnica: 'rest_pause:1, normal, normal, normal', grupo_tecnica: 'superserie:A', notas: '', orden: 2 },
  { id: 'e3', rutina_id: 'rB', nombre: 'Sentadilla', series: '3', repeticiones: '5', rir: '1', descanso: '3min', tecnica: 'isometrico, normal, normal', grupo_tecnica: '', notas: '', orden: 1 }
];

function fake({ bloquearPatch = false, bloquearDelete = false, mes = mesociclos, extra = {} } = {}) {
  const bd = {
    rutinas: [
      { id: 'rA', nombre: 'Push A', orden: 1, mesociclo_id: 'm1', cliente_id: 5 },
      { id: 'rB', nombre: 'Pull <b>B</b>', orden: 2, mesociclo_id: 'm1', cliente_id: 5 },
      { id: 'rC', nombre: 'Legacy', orden: 1, mesociclo_id: 'm0', cliente_id: 5 },
      { id: 'rD', nombre: 'Pierna D', orden: 2, mesociclo_id: 'm1', cliente_id: 5 },
      { id: 'rK', nombre: '🫀 Cardio', orden: 99, mesociclo_id: null, es_cardio: true, cliente_id: 5 }
    ],
    ejercicios: ejerciciosIniciales()
  };
  const idDe = qs => (qs.match(/(?:^|&)id=eq\.([^&]+)/) || [])[1];
  return {
    bd,
    tablas: {
      mesociclos: () => mes,
      rutinas: (m, qs, body) => {
        if (m === 'PATCH') { if (!bloquearPatch) Object.assign(bd.rutinas.find(r => r.id === idDe(qs)), body); return []; }
        if (m === 'DELETE') { const n = bd.rutinas.length; bd.rutinas = bd.rutinas.filter(r => r.id !== idDe(qs)); return bloquearDelete ? [] : (n !== bd.rutinas.length ? [{ id: 'x' }] : []); }
        if (m === 'POST') { bd.rutinas.push({ ...body }); return [body]; }
        return [...bd.rutinas].sort((a, b) => (a.orden ?? 1e9) - (b.orden ?? 1e9));
      },
      ejercicios: (m, qs) => {
        if (m === 'DELETE') { const id = idDe(qs); const rid = (qs.match(/rutina_id=eq\.([^&]+)/) || [])[1]; bd.ejercicios = bd.ejercicios.filter(e => (id ? e.id !== id : e.rutina_id !== rid)); return [{ id: 'x' }]; }
        return bd.ejercicios;
      },
      ...extra
    }
  };
}

async function abrir(opts = {}, datosCliente = {}, clientesExtra = {}) {
  await invalidarDatos();
  const f = fake(opts);
  const { w, llamadas } = crearEntorno({ clientes: [{ ...cliente, ...datosCliente }], tablas: f.tablas, fallos: clientesExtra });
  const { arrancar } = await importar('core/app.js');
  await arrancar();
  const $ = s => w.document.querySelector(s);
  const $$ = s => [...w.document.querySelectorAll(s)];
  w.location.hash = '#/clientes/JC005/rutinas';
  await hasta(() => $('.rut-barra') || $('.alert-error'));
  return { w, llamadas, bd: f.bd, $, $$ };
}
const nombres = $$ => $$('.routine-name').map(x => x.textContent.trim());
let ok = 0; const t = (n, f) => { f(); ok++; console.log('✓', n); };

// ── Lista, mesociclos, ejercicios ──
{
  const { w, $, $$ } = await abrir();
  t('por defecto: mesociclo activo seleccionado, con sus rutinas (sin cardio ni de otros mesociclos)', () => {
    assert.equal($('.rut-chip.activo').textContent.includes('Mesociclo 2'), true);
    assert.deepEqual(nombres($$), ['Push A', 'Pull <b>B</b>', 'Pierna D']);
    assert.equal($('.routine-name b'), null);
  });
  t('chips: Todos + 2 mesociclos; el activo lleva 🟢, punto ATR y aviso de duración', () => {
    assert.equal($$('.rut-chip').length, 3);
    const activo = $('.rut-chip.activo');
    assert.ok(activo.textContent.includes('🟢') && activo.textContent.includes('⏱️'));
    assert.ok(activo.querySelector('.rut-punto'));
    assert.ok(activo.querySelector('[title*="Lleva ~"]'));
    assert.ok(!$$('.rut-chip')[1].textContent.includes('⏱️')); // el cerrado no avisa
  });
  t('REPETIDO: B y D comparten orden 2 en el mismo mesociclo', () => {
    const rep = $$('.rut-orden.repetido');
    assert.equal(rep.length, 2);
    assert.ok(rep.every(x => x.textContent.includes('REPETIDO')));
  });
  $$('.rut-chip')[0].click();
  t('Todos: 4 rutinas incl. cardio (sin casilla de orden)', () => {
    assert.deepEqual(nombres($$), ['Push A', 'Legacy', 'Pull <b>B</b>', 'Pierna D', '🫀 Cardio']);
    assert.equal($$('[data-orden]').length, 4);
    assert.ok($('.routine-header').textContent.includes('ORDEN'));
  });
  // Desplegar
  $('[data-toggle="rA"]').click();
  t('desplegar Push A: 2 ejercicios, escapados, con series/técnicas/grupo/volumen', () => {
    assert.equal($$('.rut-ejercicio').length, 2);
    assert.equal($('.rut-ejercicio img'), null);
    assert.ok($('.rut-ej-info').textContent.includes('<img'));
    assert.ok($('.rut-nota').textContent.includes('<b>cerrados</b>'));
    const primero = $$('.rut-ejercicio')[0];
    assert.equal(primero.querySelectorAll('.rut-serie').length, 3);
    assert.ok(primero.querySelectorAll('.rut-serie-val')[2].textContent.includes('6-8 / RIR 0 / 90seg'));
    assert.ok(primero.querySelector('.rut-chip-tec').textContent.includes('DS 2 -20%'));
    assert.ok(primero.querySelector('.rut-grupo').textContent.includes('SS · A'));
    assert.ok(primero.querySelector('.rut-vol').textContent.includes('3.5'));
    const seg = $$('.rut-ejercicio')[1];
    assert.equal(seg.querySelectorAll('.rut-serie').length, 4);
    assert.ok(seg.querySelector('.rut-chip-tec').textContent.includes('RP +1'));
  });
  t('mismo código de superserie = mismo color', () => {
    const [a, b] = $$('.rut-grupo').map(x => x.style.color);
    assert.equal(a, b);
  });
  t('clic en el número de orden no pliega la rutina', () => {
    $('[data-orden="rA"]').click();
    assert.equal($$('.rut-ejercicio').length, 2);
  });
  $('[data-toggle="rA"]').click();
  t('segundo clic en la cabecera pliega', () => assert.equal($$('.rut-ejercicio').length, 0));
}

// ── Descarga ──
{
  const { w, $, $$ } = await abrir({}, { modo_descarga: true, tipo_descarga: 'volumen' });
  $('[data-toggle="rA"]').click();
  t('descarga por volumen: 3 series → 2 y 4 → 3 (~-45%)', () => {
    const [a, b] = $$('.rut-ejercicio');
    assert.equal(a.querySelectorAll('.rut-serie').length, 2);
    assert.equal(b.querySelectorAll('.rut-serie').length, 3);
  });
}
{
  const { $, $$ } = await abrir({}, { modo_descarga: true, tipo_descarga: 'intensidad', descarga_fin: '2999-01-01' });
  $('[data-toggle="rA"]').click();
  t('descarga por intensidad: RIR +2 y nota en ámbar', () => {
    assert.ok($$('.rut-serie-val')[0].textContent.includes('RIR 4'));
    assert.ok($('.rut-nota-descarga').textContent.includes('Baja ~10-20%'));
  });
}
{
  const { $, $$ } = await abrir({}, { modo_descarga: true, tipo_descarga: 'completa', descarga_fin: '2000-01-01' });
  $('[data-toggle="rA"]').click();
  t('descarga caducada: no se aplica', () => {
    assert.equal($$('.rut-serie').length > 0, true);
    assert.equal($('.rut-nota-descarga'), null);
  });
}

// ── Nueva rutina ──
{
  const { w, llamadas, bd, $, $$ } = await abrir();
  $('[data-accion="rutina-nueva"]').click();
  await hasta(() => $('.modal-overlay'));
  t('orden sugerido = siguiente libre del mesociclo activo (3)', () => assert.equal($('#form_orden').value, '3'));
  $('.modal [data-r="si"]').click();
  await hasta(() => $('.modal [data-error] .alert-error'));
  t('sin nombre: error dentro del modal y nada guardado', () => {
    assert.ok($('.modal [data-error]').textContent.includes('El nombre es obligatorio'));
    assert.ok(!llamadas.some(l => l.tabla === 'rutinas' && l.method === 'POST'));
  });
  $('#form_nombre').value = '  Upper <i>C</i> ';
  $('.modal [data-r="si"]').click();
  await hasta(() => !$('.modal-overlay'));
  t('se crea con cliente, código, orden y mesociclo activo', () => {
    const p = llamadas.find(l => l.tabla === 'rutinas' && l.method === 'POST').body;
    assert.deepEqual([p.nombre, p.orden, p.cliente_id, p.codigo_cliente, p.mesociclo_id], ['Upper <i>C</i>', 3, 5, 'JC005', 'm1']);
    assert.ok(p.id);
    assert.deepEqual(nombres($$), ['Push A', 'Pull <b>B</b>', 'Pierna D', 'Upper <i>C</i>']);
    assert.ok($('#alertas').textContent.includes('creada'));
    assert.equal($('.routine-name i'), null);
  });
}

// ── Orden ──
{
  const { w, llamadas, bd, $, $$ } = await abrir();
  const cambia = (el, v) => { el.value = v; el.dispatchEvent(new w.Event('change', { bubbles: true })); };
  cambia($('[data-orden="rD"]'), '1');
  await hasta(() => $('#alertas').textContent.includes('Orden actualizado'));
  t('subir D a la posición 1: se recolocan las demás 1..n sin huecos', () => {
    assert.deepEqual(bd.rutinas.filter(r => r.mesociclo_id === 'm1').sort((a, b) => a.orden - b.orden).map(r => [r.id, r.orden]), [['rD', 1], ['rA', 2], ['rB', 3]]);
    assert.deepEqual(nombres($$), ['Pierna D', 'Push A', 'Pull <b>B</b>']);
    assert.equal($$('.rut-orden.repetido').length, 0);
  });
  t('no toca las rutinas de otros mesociclos ni el cardio', () => {
    const tocadas = llamadas.filter(l => l.method === 'PATCH').map(l => l.qs);
    assert.ok(tocadas.every(q => !q.includes('rC') && !q.includes('rK')));
  });
  cambia($('[data-orden="rD"]'), '99');
  await hasta(() => bd.rutinas.find(r => r.id === 'rD').orden === 3);
  t('un número fuera de rango se ajusta al último', () => assert.equal(bd.rutinas.find(r => r.id === 'rD').orden, 3));
  const antes = llamadas.filter(l => l.method === 'PATCH').length;
  cambia($('[data-orden="rD"]'), '3');
  await esperar(50);
  t('mismo número: no guarda nada', () => assert.equal(llamadas.filter(l => l.method === 'PATCH').length, antes));
}
{
  const { w, bd, $, $$ } = await abrir({ bloquearPatch: true });
  const el = $('[data-orden="rD"]'); el.value = '1'; el.dispatchEvent(new w.Event('change', { bubbles: true }));
  await hasta(() => $('#alertas').textContent.includes('No se guardó el orden'));
  t('RLS bloquea el UPDATE: se detecta releyendo y se avisa', () => {
    assert.ok($('#alertas .alert-error'));
    assert.equal($('[data-orden="rD"]').value, '2'); // vuelve al valor real
  });
}

// ── Mover de mesociclo ──
{
  const { w, llamadas, bd, $, $$ } = await abrir();
  const sel = $('[data-mover="rB"]'); sel.value = 'm0'; sel.dispatchEvent(new w.Event('change', { bubbles: true }));
  await hasta(() => $('#alertas').textContent.includes('Rutina movida'));
  t('mover B a Base: PATCH y desaparece del mesociclo activo', () => {
    assert.equal(llamadas.find(l => l.method === 'PATCH').body.mesociclo_id, 'm0');
    assert.deepEqual(nombres($$), ['Push A', 'Pierna D']);
  });
  $$('.rut-chip')[0].click();
  const sel2 = $('[data-mover="rB"]'); sel2.value = ''; sel2.dispatchEvent(new w.Event('change', { bubbles: true }));
  await hasta(() => bd.rutinas.find(r => r.id === 'rB').mesociclo_id === null);
  t('"Sin mesociclo" guarda null', () => assert.equal(bd.rutinas.find(r => r.id === 'rB').mesociclo_id, null));
}

// ── Borrar rutina y ejercicio ──
{
  const { w, llamadas, bd, $, $$ } = await abrir();
  $('[data-accion="rutina-borrar"][data-id="rA"]').click();
  await hasta(() => $('.modal-overlay'));
  t('la confirmación nombra la rutina', () => assert.ok($('.modal-sub').textContent.includes('"Push A"')));
  $('.modal [data-r="no"]').click(); await esperar(20);
  t('cancelar no borra', () => assert.ok(!llamadas.some(l => l.method === 'DELETE')));
  $('[data-accion="rutina-borrar"][data-id="rA"]').click();
  await hasta(() => $('.modal-overlay')); $('.modal [data-r="si"]').click();
  await hasta(() => !nombres($$).includes('Push A'));
  t('borrar rutina: primero sus ejercicios, luego la rutina', () => {
    const d = llamadas.filter(l => l.method === 'DELETE');
    assert.deepEqual(d.map(l => l.tabla), ['ejercicios', 'rutinas']);
    assert.ok(d[0].qs.includes('rutina_id=eq.rA') && d[1].qs.includes('id=eq.rA'));
    assert.ok(!bd.ejercicios.some(e => e.rutina_id === 'rA'));
  });
  $('[data-toggle="rB"]').click();
  $('[data-accion="ejercicio-borrar"]').click();
  await hasta(() => $('.modal-overlay')); $('.modal [data-r="si"]').click();
  await hasta(() => $$('.rut-ejercicio').length === 0);
  t('borrar ejercicio: DELETE por id y la rutina sigue abierta', () => {
    assert.ok(llamadas.filter(l => l.method === 'DELETE').pop().qs.includes('id=eq.e3'));
    assert.ok($('.routine-body').textContent.includes('Sin ejercicios aún'));
  });
}
{
  const { $, $$ } = await abrir({ bloquearDelete: true });
  $('[data-accion="rutina-borrar"][data-id="rD"]').click();
  await hasta(() => $('.modal-overlay')); $('.modal [data-r="si"]').click();
  await hasta(() => $('#alertas .alert-error'));
  t('RLS bloquea el borrado: error claro', () => assert.ok($('#alertas').textContent.includes('revisa la política RLS de DELETE')));
}

// ── Sin mesociclos y errores de carga ──
{
  const { $, $$ } = await abrir({ mes: [] });
  t('sin mesociclos: mensaje y todas las rutinas juntas', () => {
    assert.ok($('.rut-sin-mes').textContent.includes('Sin mesociclos todavía'));
    assert.equal(nombres($$).length, 5);
    assert.equal($('[data-mover]'), null);
  });
}
{
  const { w, $ } = await abrir({}, {}, { 'ejercicios:GET': 'sin permiso' });
  t('si falla la carga, se dice', () => assert.ok($('.alert-error').textContent.includes('No se pudo cargar la pestaña "Rutinas"')));
}
console.log(`\n${ok} comprobaciones OK`);
process.exit(0);
