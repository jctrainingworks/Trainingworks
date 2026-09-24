import assert from 'node:assert/strict';
import { crearEntorno, grafica, hasta, esperar, importar } from './harness.mjs';

const hoy = new Date().toISOString();
const hace = d => new Date(Date.now() - d * 86400000).toISOString();
const cliente = { id: 3, codigo: 'JC003', nombre: 'Marta', plan: '3MESES', estado_cliente: 'ACTIVO', genero: 'Mujer', edad: 40, fc_reposo: 60, peso_inicial: 70 };

// ── Escenario A: sin PAR-Q vigente ──
async function escenario(tablas, fallos = {}) {
  const { w, llamadas } = crearEntorno({ clientes: [cliente], tablas, fallos });
  const charts = grafica(w);
  const { arrancar } = await importar('core/app.js');
  await arrancar();
  const $ = s => w.document.querySelector(s);
  const $$ = s => [...w.document.querySelectorAll(s)];
  w.location.hash = '#/clientes/JC003/cardio';
  await hasta(() => $('[data-sec="parq"]') && $('[data-sec="parq"]').innerHTML.trim());
  return { w, llamadas, charts, $, $$ };
}
let ok = 0; const t = (n, f) => { f(); ok++; console.log('✓', n); };

{
  const { w, llamadas, $, $$ } = await escenario({ cardio_parq: [{ id: 1, fecha: hace(300), resultado: 'apto' }], cardio_valoraciones: [], rutinas: [] });
  t('PAR-Q caducado: muestra el formulario y aviso de caducado', () => {
    assert.equal($$('[data-parq]').length, 6);
    assert.ok($('[data-sec="parq"]').textContent.includes('ha caducado'));
    assert.equal($('[data-sec="test"]').innerHTML, '');
    assert.equal($('[data-sec="prescripcion"]').innerHTML, '');
  });
  $('[data-parq="mareos"]').checked = true;
  $('[data-accion="parq-guardar"]').click();
  await hasta(() => llamadas.some(l => l.tabla === 'cardio_parq' && l.method === 'POST'));
  t('guardar PAR-Q con un sí → no apto', () => {
    const p = llamadas.find(l => l.tabla === 'cardio_parq' && l.method === 'POST').body;
    assert.equal(p.cliente_id, 3); assert.equal(p.resultado, 'no_apto_requiere_medico'); assert.equal(p.respuestas.mareos, true); assert.equal(p.respuestas.dolor_pecho, false);
  });
  await hasta(() => $('[data-sec="test"] [data-accion="test-elegir"]'));
  t('con PAR-Q vigente salen el estado (⚠️), los tests y la prescripción', () => {
    assert.ok($('[data-sec="parq"]').textContent.includes('Con respuestas positivas'));
    assert.equal($$('[data-accion="test-elegir"]').length, 3);
    assert.ok($('#cardio_rx_tipo'));
    assert.ok($('[data-sec="prescripcion"]').textContent.includes('Este cliente todavía no tiene cardio pautado'));
  });

  // Rockport: peso/edad autorrellenados, sexo Mujer, campo obligatorio vacío
  $('[data-test="rockport"]').click();
  t('Rockport: peso (inicial), edad y sexo prellenados', () => {
    assert.equal($('[data-campo="peso"]').value, '70');
    assert.equal($('[data-campo="edad"]').value, '40');
    assert.equal($('[data-campo="sexo"]').value, 'M');
  });
  $('[data-campo="tiempo"]').value = '14.5';
  $('[data-accion="test-guardar"]').click();
  await esperar(20);
  t('falta la FC → error y no guarda', () => {
    assert.ok($('#alertas').textContent.includes('Falta un dato: FC al terminar'));
    assert.ok(!llamadas.some(l => l.tabla === 'cardio_valoraciones' && l.method === 'POST'));
  });
  $('[data-campo="fc"]').value = '130';
  $('[data-accion="test-guardar"]').click();
  await hasta(() => llamadas.some(l => l.tabla === 'cardio_valoraciones' && l.method === 'POST'));
  t('Rockport guardado: VO2 y categoría coherentes, cinta en null', () => {
    const b = llamadas.find(l => l.tabla === 'cardio_valoraciones' && l.method === 'POST').body;
    const esperado = 132.853 - 0.0769 * 70 * 2.20462 - 0.3877 * 40 + 6.315 * 0 - 3.2649 * 14.5 - 0.1565 * 130;
    assert.equal(b.vo2max_estimado, Math.round(esperado * 10) / 10);
    assert.equal(b.tipo_test, 'rockport'); assert.equal(b.datos_input.velocidad, null); assert.equal(b.datos_input.sexo, 'M');
    assert.ok(['Baja', 'Por debajo de la media', 'Media', 'Por encima de la media', 'Buena', 'Excelente'].includes(b.categoria));
  });
  await hasta(() => $('[data-sec="historial"] tbody tr'));
  t('el histórico muestra el test nuevo y el formulario se limpia', () => {
    assert.equal($$('[data-sec="historial"] tbody tr').length, 1);
    assert.equal($('[data-sec="test"] [data-campo="fc"]'), null);
  });

  // Añadir cardio: crea la rutina de cardio y la línea con el marcador de zona
  $('#cardio_rx_tipo').value = 'Bici'; $('#cardio_rx_zona').value = '70';
  $('#cardio_rx_duracion').value = '20'; $('#cardio_rx_frecuencia').value = '3'; // la sugerencia por defecto depende del test recién guardado
  $('[data-accion="notas-abrir"]').click();
  $('#cardio_rx_notas').value = 'Sube <b>poco</b> a poco';
  $('[data-accion="cardio-anadir"]').click();
  await hasta(() => llamadas.some(l => l.tabla === 'ejercicios' && l.method === 'POST'));
  t('crea la rutina 🫀 Cardio (es_cardio) una vez', () => {
    const r = llamadas.filter(l => l.tabla === 'rutinas' && l.method === 'POST');
    assert.equal(r.length, 1);
    assert.deepEqual([r[0].body.nombre, r[0].body.es_cardio, r[0].body.cliente_id, r[0].body.codigo_cliente], ['🫀 Cardio', true, 3, 'JC003']);
  });
  t('línea de cardio: zona en rir, duración, marcador con rango de ppm', () => {
    const e = llamadas.find(l => l.tabla === 'ejercicios' && l.method === 'POST').body;
    // fcMax 180, reposo 60: zona 70 → 60+120*0.65=138 .. 60+120*0.75=150
    assert.equal(e.nombre, 'Bici'); assert.equal(e.rir, '70'); assert.equal(e.series, 3); assert.equal(e.repeticiones, '20min');
    assert.equal(e.notas, 'Sube <b>poco</b> a poco\n[[cardiozona:70:138:150]]');
    assert.equal(e.orden, 1);
  });
  await hasta(() => $('[data-accion="linea-borrar"]'));
  t('la tabla no enseña el marcador y escapa la nota', () => {
    const fila = $('[data-sec="prescripcion"] tbody tr').textContent;
    assert.ok(fila.includes('Bici') && fila.includes('3x/semana') && fila.includes('20min'));
    assert.ok(!fila.includes('cardiozona'));
    assert.ok(fila.includes('<b>poco</b>'));
    assert.equal($('[data-sec="prescripcion"] tbody b'), null);
  });
  // Segunda línea: no vuelve a crear la rutina
  $('[data-accion="cardio-anadir"]').click();
  await hasta(() => llamadas.filter(l => l.tabla === 'ejercicios' && l.method === 'POST').length === 2);
  t('segunda línea reutiliza la rutina y sigue el orden', () => {
    assert.equal(llamadas.filter(l => l.tabla === 'rutinas' && l.method === 'POST').length, 1);
    assert.equal(llamadas.filter(l => l.tabla === 'ejercicios' && l.method === 'POST')[1].body.orden, 2);
  });
  // Borrar línea con confirmación
  await hasta(() => w.document.querySelectorAll('[data-accion="linea-borrar"]').length === 2);
  $('[data-accion="linea-borrar"]').click();
  await hasta(() => $('.modal-overlay'));
  $('.modal [data-r="no"]').click(); await esperar(20);
  t('cancelar la confirmación no borra', () => assert.ok(!llamadas.some(l => l.method === 'DELETE')));
  $('[data-accion="linea-borrar"]').click();
  await hasta(() => $('.modal-overlay')); $('.modal [data-r="si"]').click();
  await hasta(() => llamadas.some(l => l.method === 'DELETE'));
  await hasta(() => w.document.querySelectorAll('[data-accion="linea-borrar"]').length === 1);
  t('confirmar borra la línea', () => assert.equal(llamadas.find(l => l.method === 'DELETE').tabla, 'ejercicios'));
}

// ── Escenario B: PAR-Q vigente, historial, rutina y sesiones ──
{
  const valoraciones = [
    { id: 'v2', fecha: hace(10), tipo_test: 'cooper', vo2max_estimado: 40.2, categoria: 'Buena', datos_input: { distancia: 2300, fc: 150, velocidad: 12, inclinacion: 2 } },
    { id: 'v1', fecha: hace(90), tipo_test: 'cooper', vo2max_estimado: 36.1, categoria: '<b>Media</b>', datos_input: { distancia: 2100, fc: 160, velocidad: 11, inclinacion: 1 } }
  ];
  const sesiones = [
    { fecha: hace(2), series_detalle: '7km/h @3% (25min)', rutina_id: 'rc' },
    { fecha: hace(9), series_detalle: '6.5km/h @2% (20min)', rutina_id: 'rc' },
    { fecha: hace(10), series_detalle: '6.5km/h @2% (20min)', rutina_id: 'rc' },
    { fecha: hace(40), series_detalle: 'texto raro', rutina_id: 'rc' }
  ];
  const { w, llamadas, charts, $, $$ } = await escenario({
    cardio_parq: [{ id: 1, fecha: hace(20), resultado: 'apto' }],
    cardio_valoraciones: valoraciones,
    rutinas: [{ id: 'rc', nombre: '🫀 Cardio', es_cardio: true }],
    ejercicios: [{ id: 'e1', nombre: '<img src=x onerror=alert(1)>', series: 3, repeticiones: '20min', notas: '[[cardiozona:60:126:138]]', rutina_id: 'rc' }],
    sesiones, seguimiento_corporal: [{ peso: 64.5 }]
  });
  await hasta(() => $('[data-sec="progresion"] table'));
  t('PAR-Q vigente y apto', () => assert.ok($('[data-sec="parq"]').textContent.includes('Apto')));
  t('histórico: 2 filas, escapado, delta de FC y de cinta contra el anterior del mismo test', () => {
    const filas = $$('[data-sec="historial"] tbody tr');
    assert.equal(filas.length, 2);
    assert.ok(filas[1].textContent.includes('<b>Media</b>'));
    assert.equal($('[data-sec="historial"] tbody b'), null);
    assert.ok(filas[0].textContent.includes('150 ppm') && filas[0].textContent.includes('↓ mejora'));
    assert.ok(filas[0].textContent.includes('12 km/h') && filas[0].textContent.includes('↑ vel') && filas[0].textContent.includes('↑ inc'));
  });
  t('línea con nombre malicioso queda escapada', () => assert.equal($('img'), null));
  t('Rockport prellenaría el peso desde Cuerpo (64.5)', () => {
    $('[data-test="rockport"]').click();
    assert.equal($('[data-campo="peso"]').value, '64.5');
  });
  await hasta(() => charts.length >= 2);
  t('gráfica de evolución Cooper: orden cronológico y 2 ejes', () => {
    const g = charts.find(c => c.canvas.dataset.graficaTest === 'cooper');
    assert.deepEqual(g.cfg.data.datasets[0].data, [36.1, 40.2]);
    assert.deepEqual(g.cfg.data.datasets[1].data, [160, 150]);
  });
  t('gráfica de progresión: sesiones por semana', () => {
    const g = charts.find(c => 'graficaProgresion' in c.canvas.dataset);
    assert.equal(g.cfg.data.datasets[0].data.reduce((a, b) => a + b, 0), 4);
    assert.ok(g.cfg.data.datasets[0].data.length <= 8);
  });
  t('tabla de cinta: solo sesiones con datos, con flechas', () => {
    const filas = $$('[data-sec="progresion"] tbody tr');
    assert.equal(filas.length, 3);
    assert.ok(filas[0].textContent.includes('7 km/h') && filas[0].textContent.includes('3%') && filas[0].textContent.includes('25 min') && filas[0].textContent.includes('↑'));
  });
  // Borrar valoración
  $('[data-accion="valoracion-borrar"][data-id="v1"]').click();
  await hasta(() => $('.modal-overlay')); $('.modal [data-r="si"]').click();
  await hasta(() => llamadas.some(l => l.method === 'DELETE' && l.tabla === 'cardio_valoraciones'));
  await hasta(() => $$('[data-sec="historial"] tbody tr').length === 1);
  t('borrar valoración: DELETE por id y desaparece; sin 2 tests ya no hay gráfica', () => {
    assert.ok(llamadas.find(l => l.method === 'DELETE').qs.includes('id=eq.v1'));
    assert.equal($('[data-grafica-test]'), null);
  });
  t('las consultas piden solo lo de este cliente', () => {
    const q = llamadas.filter(l => l.method === 'GET').map(l => l.tabla + '?' + l.qs);
    assert.ok(q.some(x => x.startsWith('cardio_parq') && x.includes('cliente_id=eq.3')));
    assert.ok(q.some(x => x.startsWith('sesiones') && x.includes('codigo_cliente=eq.JC003') && x.includes('rutina_id=eq.rc')));
    assert.ok(q.some(x => x.startsWith('rutinas') && x.includes('es_cardio=eq.true')));
  });
}

// ── Escenario C: error de red al cargar ──
{
  const { w, $ } = crearEntorno({ clientes: [cliente], fallos: { 'cardio_parq:GET': 'sin permiso' } });
  grafica(w);
  const { arrancar } = await importar('core/app.js');
  await arrancar();
  w.location.hash = '#/clientes/JC003/cardio';
  await hasta(() => w.document.querySelector('.alert-error'));
  t('si falla la carga, se dice (no se ofrece un PAR-Q en blanco)', () => {
    assert.ok(w.document.querySelector('.alert-error').textContent.includes('No se pudo cargar la pestaña "Cardio"'));
    assert.equal(w.document.querySelector('[data-parq]'), null);
  });
}
console.log(`\n${ok} comprobaciones OK`);
process.exit(0);
