import assert from 'node:assert/strict';
import { crearEntorno, hasta, invalidarDatos, importar } from './harness.mjs';

let ok = 0; const t = (n, f) => { f(); ok++; console.log('✓', n); };
const iso = n => { const d = new Date(); d.setDate(d.getDate() - n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const compartido = await import(new URL('../etapas/calculos.js', import.meta.url).href); // misma instancia que usan las pestañas

const cliente = { id: 9, codigo: 'JC009', nombre: 'Elena', estado_cliente: 'ACTIVO', modelo_periodizacion: 'CSD' };
const mesociclos = [
  { id: 1, cliente_id: 9, numero: 1, nombre: 'Viejo', tipo_atr: 'carga', fecha_inicio: iso(90), fecha_fin: iso(41) },
  { id: 2, cliente_id: 9, numero: 2, nombre: 'Nuevo', tipo_atr: 'sobrecarga', fecha_inicio: iso(39), fecha_fin: null }
];
const rutinas = [{ id: 'r1', cliente_id: 9, mesociclo_id: 1, nombre: 'RutinaVieja', orden: 1 }, { id: 'r2', cliente_id: 9, mesociclo_id: 2, nombre: 'RutinaNueva', orden: 2 }];
const sesiones = [
  { id: 's1', fecha: iso(60), ejercicio: 'Press viejo', series_detalle: '10x50', rutina_id: 'r1', codigo_cliente: 'JC009' },
  { id: 's2', fecha: iso(10), ejercicio: 'Sentadilla nueva', series_detalle: '8x80', rutina_id: 'r2', codigo_cliente: 'JC009' }
];
const medidas = [
  { id: 'm1', cliente_id: 9, fecha: iso(60), peso: 85, origen: 'panel' },
  { id: 'm2', cliente_id: 9, fecha: iso(40), peso: 82, origen: 'panel' },
  { id: 'm3', cliente_id: 9, fecha: iso(5), peso: 80, origen: 'panel' }
];

async function abrir(pestana, { conEtapa = true } = {}) {
  await invalidarDatos();
  const { w } = crearEntorno({
    clientes: [cliente],
    tablas: { mesociclos, rutinas, ejercicios: [], sesiones, seguimiento_corporal: medidas, etapas: conEtapa ? [{ id: 'e1', fecha_inicio: iso(100), fecha_fin: iso(40) }] : [], planes_nutricion: [], ejercicios_biblioteca: [], rm_estimaciones: [], sesiones_meta: [] }
  });
  const { arrancar } = await importar('core/app.js');
  await arrancar();
  w.location.hash = `#/clientes/JC009/${pestana}`;
  const $ = s => w.document.querySelector(s);
  await hasta(() => $('.ficha-tabs .tab.active') && $('.ficha-tabs .tab.active').dataset.pestana === pestana && w.document.querySelector('#contenido-pestana, .ficha-contenido, [data-pestana-contenido]') !== undefined);
  await new Promise(r => setTimeout(r, 150));
  return { w, $, $$: s => [...w.document.querySelectorAll(s)], txt: () => w.document.body.textContent.replace(/\s+/g, ' ') };
}

compartido.setVistaEtapa('actual');
{
  const { $, $$, txt } = await abrir('rutinas');
  t('Ficha: franja con "Etapa actual · desde" (en todas las pestañas) y Rutinas solo con los bloques de la etapa actual', () => {
    assert.ok($('[data-vista-etapa="actual"]').textContent.includes('Etapa actual · desde'));
    assert.deepEqual($$('.rut-chip-sel').map(b => b.dataset.id), ['2']);
    assert.ok(txt().includes('RutinaNueva') && !txt().includes('RutinaVieja'));
  });
  $('[data-vista-etapa="todo"]').click();
  await hasta(() => $$('.rut-chip-sel').length === 2);
  t('Rutinas: "Todo el historial" enseña también los bloques anteriores', () => {
    assert.deepEqual($$('.rut-chip-sel').map(b => b.dataset.id), ['1', '2']);
    assert.ok($('[data-vista-etapa="todo"]').classList.contains('on'));
  });
  $('[data-vista-etapa="actual"]').click();
  await hasta(() => $$('.rut-chip-sel').length === 1);
  t('Rutinas: volver a "Etapa actual" oculta otra vez lo anterior', () => assert.deepEqual($$('.rut-chip-sel').map(b => b.dataset.id), ['2']));
}
{
  const { txt, $ } = await abrir('historial');
  t('la franja también está en Historial', () => assert.ok($('[data-vista-etapa="actual"]')));
  t('Historial (etapa actual): solo las sesiones desde la etapa y el filtro dice "Toda la etapa"', () => {
    assert.ok(txt().includes('Sentadilla nueva') && !txt().includes('Press viejo'));
    assert.ok(txt().includes('Toda la etapa') && !txt().includes('Ver histórico completo'));
  });
}
{
  const { txt } = await abrir('cuerpo');
  t('Cuerpo (etapa actual): el pesaje del último día de la etapa cuenta como punto de partida, el anterior no', () => {
    assert.ok(txt().includes('Seguimiento corporal (2 registros)'));
    assert.ok(txt().includes('actual 80kg'));
  });
}
{
  const { txt } = await abrir('periodizacion');
  t('Periodización (etapa actual): la línea de tiempo no dibuja el bloque anterior a la etapa', () => {
    assert.ok(txt().includes('Sobrecarga'));
    assert.ok(!/(^|[^a-zA-Z])Carga ·/.test(txt()));
  });
}
compartido.setVistaEtapa('todo');
{
  const { txt } = await abrir('historial');
  t('Historial (todo el historial): vuelve la etiqueta normal del filtro', () => {
    assert.ok(txt().includes('Ver histórico completo') && !txt().includes('Toda la etapa'));
  });
}
{
  const { txt } = await abrir('cuerpo');
  t('Cuerpo (todo el historial): vuelven los 3 registros', () => assert.ok(txt().includes('Seguimiento corporal (3 registros)')));
}
compartido.setVistaEtapa('actual');
{
  const { txt } = await abrir('historial', { conEtapa: false });
  t('sin etapas cerradas, Historial no filtra nada', () => assert.ok(txt().includes('Ver histórico completo')));
  const r = await abrir('rutinas', { conEtapa: false });
  t('sin etapas cerradas, Rutinas no enseña la franja y lista todos los bloques', () => {
    assert.ok(!r.$('[data-vista-etapa]'));
    assert.deepEqual(r.$$('.rut-chip-sel').map(b => b.dataset.id), ['1', '2']);
  });
}

console.log(`\n${ok} comprobaciones OK`);
process.exit(0);
