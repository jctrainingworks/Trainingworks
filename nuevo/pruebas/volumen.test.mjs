import assert from 'node:assert/strict';
import { crearEntorno, hasta, invalidarDatos, importar } from './harness.mjs';

const iso = n => { const d = new Date(); d.setDate(d.getDate() - n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const cliente = { id: 9, codigo: 'JC009', nombre: 'Elena', plan: '3MESES', estado_cliente: 'ACTIVO' };
const biblioteca = [
  { id: 'b1', nombre_es: 'Press banca', musculo: 'Pecho', gif_url: '' },
  { id: 'b2', nombre_es: 'Sentadilla', musculo: 'Cuádriceps', gif_url: '' }
];

async function abrir({ sesiones, mesociclos, rutinas }) {
  await invalidarDatos();
  const { w, llamadas } = crearEntorno({ clientes: [cliente], tablas: { ejercicios_biblioteca: biblioteca, rutinas, mesociclos, sesiones } });
  const { arrancar } = await importar('core/app.js');
  await arrancar();
  w.location.hash = '#/clientes/JC009/volumen';
  const $ = s => w.document.querySelector(s);
  const $$ = s => [...w.document.querySelectorAll(s)];
  await hasta(() => $('[data-accion="vista"]') || $('.alert-error') || $('.empty'));
  return { w, llamadas, $, $$, txt: () => w.document.body.textContent.replace(/\s+/g, ' ') };
}
let ok = 0; const t = (n, f) => { f(); ok++; console.log('✓', n); };
const rutinas = [{ id: 'rA', nombre: 'Push <A>', orden: 1, mesociclo_id: 'm1', cliente_id: 9 }];

// Sin sesiones
{
  const { txt } = await abrir({ sesiones: [], mesociclos: [], rutinas });
  t('sin sesiones: mensaje', () => assert.ok(txt().includes('No hay sesiones registradas para calcular volumen')));
}

// Mesociclo activo desde hace 21 días → semanas: 0 (21-15), 1 (14-8), 2 (7-1) = última cerrada, hoy = semana 3
{
  const sesiones = [
    { id: 1, fecha: iso(3), ejercicio: 'Press banca', series_detalle: 'SERIE 1: 100kg x 10', rutina_id: 'rA' },
    { id: 2, fecha: iso(10), ejercicio: 'Press banca', series_detalle: 'SERIE 1: 80kg x 10', rutina_id: 'rA' },
    { id: 3, fecha: iso(4), ejercicio: 'Sentadilla', series_detalle: 'SERIE 1: 60kg x 10 ⚡RP+2', rutina_id: 'rA' },
    { id: 4, fecha: iso(30), ejercicio: 'Press banca', series_detalle: 'SERIE 1: 999kg x 10', rutina_id: 'rA' } // antes del mesociclo activo: no cuenta
  ];
  const mesociclos = [{ id: 'm1', numero: 1, nombre: null, tipo_atr: null, fecha_inicio: iso(21), fecha_fin: null }];
  const { $, $$, txt } = await abrir({ sesiones, mesociclos, rutinas });

  t('activo: tabs de vista y filtros', () => {
    assert.equal($$('[data-accion="vista"]').length, 3);
    assert.ok(txt().includes('Última semana') && txt().includes('Todo el mesociclo'));
  });
  t('activo: última semana → tonelaje por músculo (Pecho 1000kg, Cuádriceps 600kg)', () => {
    assert.ok(txt().includes('Pecho 1000kg'), 'Pecho');
    assert.ok(txt().includes('Cuádriceps 600kg'), 'Cuádriceps');
  });
  t('tabla semanal: Pecho 1000 vs 800 = 25% y 1x/sem; la sesión previa al mesociclo no cuenta', () => {
    const fila = $$('tbody tr').find(tr => tr.textContent.includes('Pecho'));
    assert.ok(fila.textContent.includes('1000kg') && fila.textContent.includes('800kg') && fila.textContent.includes('25%') && fila.textContent.includes('1x/sem'));
    assert.ok(!txt().includes('999'));
    assert.ok(fila.textContent.includes('Todo en 1 sesión'));
  });
  t('⚡RP+2 cuenta 2 series-equivalentes en el tonelaje semanal (60×10×2)', () => {
    assert.ok($$('tbody tr').find(tr => tr.textContent.includes('Cuádriceps')).textContent.includes('1200kg'));
  });
  t('volumen por sesión: nombre de rutina escapado', () => {
    assert.ok(txt().includes('Push <A>'));
    assert.ok(!$$('span').some(s => s.innerHTML.includes('<A>')));
  });
  t('métrica Series: Cuádriceps cuenta 2 series-equivalentes (1 + 2×0,5)', () => {
    $('[data-accion="metrica"][data-valor="series"]').click();
    assert.ok(txt().includes('Cuádriceps 2 series'));
  });
  t('rango "Todo el mesociclo" incluye la semana anterior', () => {
    $('[data-accion="metrica"][data-valor="tonelaje"]').click();
    $('[data-accion="rango"][data-valor="todos"]').click();
    assert.ok(txt().includes('Pecho 1800kg'));
  });
  t('comparativa con un solo mesociclo: aviso', () => {
    $('[data-accion="vista"][data-valor="comparativa"]').click();
    assert.ok(txt().includes('Necesitas al menos 2 mesociclos'));
  });
  t('línea de tiempo: barra del bloque y leyenda ATR', () => {
    $('[data-accion="vista"][data-valor="timeline"]').click();
    assert.ok(txt().includes('Sin nombre') && txt().includes('Acumulación') && txt().includes('Sin tipo'));
    assert.ok($('[title*="Sin tipo especificado"]'));
  });
}

// Comparativa con 2 mesociclos del mismo bloque
{
  const rutinas2 = [
    { id: 'r1', nombre: 'A', orden: 1, mesociclo_id: 'm1', cliente_id: 9 },
    { id: 'r2', nombre: 'B', orden: 2, mesociclo_id: 'm2', cliente_id: 9 }
  ];
  const mesociclos = [
    { id: 'm1', numero: 1, nombre: 'Fuerza', tipo_atr: 'acu_carga', fecha_inicio: iso(50), fecha_fin: iso(20) },
    { id: 'm2', numero: 2, nombre: 'Fuerza', tipo_atr: 'acu_choque', fecha_inicio: iso(20), fecha_fin: null }
  ];
  const sesiones = [
    { id: 1, fecha: iso(40), ejercicio: 'Press banca', series_detalle: 'SERIE 1: 100kg x 10', rutina_id: 'r1' },
    { id: 2, fecha: iso(5), ejercicio: 'Press banca', series_detalle: 'SERIE 1: 120kg x 10', rutina_id: 'r2' }
  ];
  const { $, $$, txt } = await abrir({ sesiones, mesociclos, rutinas: rutinas2 });
  $('[data-accion="vista"][data-valor="comparativa"]').click();
  t('comparativa: +20% vs el mesociclo anterior del mismo bloque', () => {
    assert.ok(txt().includes('1200kg') && txt().includes('↑ +20%'));
    assert.ok(txt().includes('— primero del bloque'));
  });
  t('comparativa: desplegar un mesociclo enseña su desglose por músculo', () => {
    $$('[data-accion="expandir"]')[1].click();
    assert.ok(txt().includes('Pecho 1200kg'));
    $$('[data-accion="expandir"]')[1].click();
    assert.ok(!txt().includes('Pecho 1200kg'));
  });
  t('comparativa: métrica Reps', () => {
    $('[data-accion="metrica"][data-valor="reps"]').click();
    assert.ok(txt().includes('10 reps'));
  });
}

// Banner de descarga en la ficha (visible en todas las pestañas) y "Terminar descarga ahora"
{
  await invalidarDatos();
  const enDescarga = { ...cliente, modo_descarga: true, tipo_descarga: 'volumen', descarga_fin: iso(-5) };
  const { w, llamadas } = crearEntorno({ clientes: [enDescarga], tablas: { ejercicios_biblioteca: biblioteca, rutinas: [], mesociclos: [], sesiones: [] } });
  const { arrancar } = await importar('core/app.js');
  await arrancar();
  const $ = s => w.document.querySelector(s);
  const txt = () => w.document.body.textContent.replace(/\s+/g, ' ');
  w.location.hash = '#/clientes/JC009/volumen';
  await hasta(() => $('[data-terminar-descarga]'));
  t('banner: 🔻 EN DESCARGA con tipo y fecha de fin', () => {
    assert.ok(txt().includes('🔻 EN DESCARGA — Reducción de volumen · hasta'));
    assert.ok($('[data-banner-descarga] [data-terminar-descarga]'));
  });
  $('[data-terminar-descarga]').click();
  await hasta(() => !$('[data-terminar-descarga]'));
  t('terminar descarga: PATCH modo_descarga=false y el banner desaparece', () => {
    const p = llamadas.find(l => l.tabla === 'clientes' && l.method === 'PATCH');
    assert.equal(p.body.modo_descarga, false);
    assert.ok(p.qs.includes('id=eq.9'));
    assert.ok(!txt().includes('EN DESCARGA'));
  });
}

// Descarga caducada: no hay banner
{
  await invalidarDatos();
  const caducada = { ...cliente, modo_descarga: true, tipo_descarga: 'volumen', descarga_fin: iso(3) };
  const { w } = crearEntorno({ clientes: [caducada], tablas: { ejercicios_biblioteca: biblioteca, rutinas: [], mesociclos: [], sesiones: [] } });
  const { arrancar } = await importar('core/app.js');
  await arrancar();
  w.location.hash = '#/clientes/JC009/volumen';
  await hasta(() => w.document.querySelector('.tabs'));
  t('descarga caducada: sin banner', () => assert.ok(!w.document.body.textContent.includes('EN DESCARGA')));
}

// Error al terminar la descarga
{
  await invalidarDatos();
  const enDescarga = { ...cliente, modo_descarga: true, tipo_descarga: 'completa', descarga_fin: iso(-2) };
  const { w } = crearEntorno({ clientes: [enDescarga], fallos: { 'clientes:PATCH': 'sin permiso' }, tablas: { ejercicios_biblioteca: biblioteca, rutinas: [], mesociclos: [], sesiones: [] } });
  const { arrancar } = await importar('core/app.js');
  await arrancar();
  w.location.hash = '#/clientes/JC009/volumen';
  await hasta(() => w.document.querySelector('[data-terminar-descarga]'));
  w.document.querySelector('[data-terminar-descarga]').click();
  await hasta(() => w.document.querySelector('.alert-error'));
  t('error al terminar: aviso y el banner se mantiene', () => {
    assert.ok(w.document.querySelector('.alert-error').textContent.includes('No se pudo desactivar la descarga'));
    assert.ok(w.document.querySelector('[data-terminar-descarga]'));
  });
}

// Cliente CSD: "+ Mesociclo" ofrece los tipos CSD, y "Descarga" propone activar el modo descarga
{
  await invalidarDatos();
  const csd = { ...cliente, modelo_periodizacion: 'CSD' };
  const bd = { mesociclos: [{ id: 'm1', numero: 1, nombre: 'Base', tipo_atr: 'carga', fecha_inicio: iso(30), fecha_fin: null }] };
  const { w, llamadas } = crearEntorno({ clientes: [csd], tablas: {
    ejercicios_biblioteca: biblioteca, rutinas: [{ id: 'r1', nombre: 'A', orden: 1, mesociclo_id: 'm1', cliente_id: 9 }], ejercicios: [], sesiones: [],
    mesociclos: (m, qs, body) => {
      if (m === 'POST') { bd.mesociclos.push({ id: 'm2', ...body }); return [{ id: 'm2', ...body }]; }
      if (m === 'PATCH') { const f = bd.mesociclos.find(x => qs.includes('id=eq.' + x.id)); if (f) Object.assign(f, body); return []; }
      return bd.mesociclos;
    } } });
  const { arrancar } = await importar('core/app.js');
  await arrancar();
  const $ = s => w.document.querySelector(s);
  w.location.hash = '#/clientes/JC009/rutinas';
  await hasta(() => $('[data-accion="mesociclo-nuevo"]'));
  $('[data-accion="mesociclo-nuevo"]').click();
  await hasta(() => $('#form_tipo'));
  t('CSD: el desplegable ofrece Carga/Sobrecarga/Descarga/Mantenimiento', () => {
    const vals = [...$('#form_tipo').options].map(o => o.value);
    assert.deepEqual(vals, ['carga', 'sobrecarga', 'descarga', 'mantenimiento', '']);
    assert.ok($('.modal').textContent.includes('Tipo de bloque (CSD)'));
    assert.equal($('#form_tipo').value, 'carga');
  });
  $('#form_tipo').value = 'descarga';
  $('[data-r="si"]').click();
  await hasta(() => $('.modal-title')?.textContent === 'Activar modo descarga');
  t('CSD: tipo "descarga" propone activar el modo descarga (sin aviso de rendimiento)', () => {
    assert.ok($('.modal-sub').textContent.includes('Este mesociclo es de tipo "Descarga"'));
    assert.ok(llamadas.find(l => l.tabla === 'mesociclos' && l.method === 'POST').body.tipo_atr === 'descarga');
  });
}

console.log(`\n${ok} comprobaciones OK`);
process.exit(0);
