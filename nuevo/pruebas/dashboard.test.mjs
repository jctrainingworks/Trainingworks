import assert from 'node:assert/strict';
import { crearEntorno, hasta, invalidarDatos, importar } from './harness.mjs';

const iso = n => { const d = new Date(); d.setDate(d.getDate() - n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const cl = (id, nombre, extra = {}) => ({ id, codigo: 'JC00' + id, nombre, plan: '3MESES', estado_cliente: 'ACTIVO', ...extra });
const biblioteca = [{ id: 'b1', nombre_es: 'Press banca', musculo: 'Pecho' }, { id: 'b2', nombre_es: 'Curl', musculo: 'Bíceps' }];
const ochoSeries = Array.from({ length: 8 }, (_, i) => `SERIE ${i + 1}: 80kg x 10`).join('\n');

async function abrir({ clientes, sesiones = [], checkins = [], mesociclos = [], fallos = {} }) {
  await invalidarDatos();
  const { w, llamadas } = crearEntorno({ clientes, fallos, tablas: { sesiones, ejercicios_biblioteca: biblioteca, seguimiento_corporal: checkins, mesociclos } });
  const { arrancar } = await importar('core/app.js');
  await arrancar();
  w.location.hash = '#/dashboard';
  const $ = s => w.document.querySelector(s);
  const $$ = s => [...w.document.querySelectorAll(s)];
  await hasta(() => $('.page-title')?.textContent === 'Dashboard' && !$('.loading'));
  return { w, llamadas, $, $$, txt: () => w.document.body.textContent.replace(/\s+/g, ' ') };
}
let ok = 0; const t = (n, f) => { f(); ok++; console.log('✓', n); };

// Sin avisos: no hay tarjeta
{
  const { $, txt } = await abrir({ clientes: [cl(1, 'Ana')] });
  t('sin avisos: no se pinta la tarjeta, sí el enlace al panel actual', () => {
    assert.ok(!txt().includes('Avisos de entrenamiento'));
    assert.ok($('a[href="../prueba/"]'));
  });
}

// Las cuatro alertas a la vez
{
  const clientes = [
    cl(1, 'Ana'),
    cl(2, 'Beto', { checkin_activo: true, fecha_inicio: iso(30) }),
    cl(3, 'Carla', { checkin_activo: true }),
    cl(4, 'Dani', { estado_cliente: 'INACTIVO', checkin_activo: true }),
    cl(5, 'Eva'),
    cl(6, 'Fran', { checkin_activo: true, fecha_inicio: iso(3) }),
    cl(7, 'Demo <b>', { es_demo: true, checkin_activo: true, fecha_inicio: iso(60) })
  ];
  const sesiones = [
    { id: 1, codigo_cliente: 'JC001', fecha: iso(1), ejercicio: 'Press banca', series_detalle: ochoSeries },
    { id: 2, codigo_cliente: 'JC001', fecha: iso(3), ejercicio: 'Press banca', series_detalle: ochoSeries },
    { id: 3, codigo_cliente: 'JC001', fecha: iso(5), ejercicio: 'Press banca', series_detalle: ochoSeries },
    { id: 4, codigo_cliente: 'JC005', fecha: iso(2), ejercicio: 'Curl', series_detalle: ochoSeries },   // 8 < MRV bíceps: no
    { id: 5, codigo_cliente: 'JC005', fecha: iso(20), ejercicio: 'Press banca', series_detalle: ochoSeries + '\n' + ochoSeries + '\n' + ochoSeries } // fuera de la semana
  ];
  const checkins = [
    { cliente_id: 1, fecha: iso(10), molestias: 1, molestias_nota: null },
    { cliente_id: 1, fecha: iso(2), molestias: 4, molestias_nota: 'rodilla <i>' },
    { cliente_id: 3, fecha: iso(20), molestias: 5, molestias_nota: null },  // 20 días → atrasado, pero molestias altas también
    { cliente_id: 4, fecha: iso(1), molestias: 5, molestias_nota: null },   // inactivo: se ignora
    { cliente_id: 6, fecha: iso(1), molestias: 2, molestias_nota: null }
  ];
  const mesociclos = [
    { id: 'm1', cliente_id: 5, tipo_atr: 'acu_carga', fecha_inicio: iso(60), nombre: 'Fuerza', numero: 1 },
    { id: 'm2', cliente_id: 6, tipo_atr: 'acu_carga', fecha_inicio: iso(10), nombre: null, numero: 2 }
  ];
  const { $, $$, txt } = await abrir({ clientes, sesiones, checkins, mesociclos });
  const tarjetas = () => $$('.client-card[data-client]');
  const de = cod => tarjetas().filter(x => x.dataset.client === cod).map(x => x.textContent.replace(/\s+/g, ' ').trim());

  t('cabecera con el total de avisos', () => assert.ok(txt().includes('⚠️ Avisos de entrenamiento (6)'), txt().match(/Avisos de entrenamiento \(\d+\)/)?.[0]));
  t('volumen: Ana supera el MRV real de Pecho (24 series)', () => assert.ok(de('JC001').some(x => x.includes('🔴 Ana') && x.includes('Por encima del MRV real: Pecho (24)'))));
  t('molestias: solo cuenta el ÚLTIMO check-in (4/5) y se escapa la nota', () => {
    assert.ok(de('JC001').some(x => x.includes('🩺 Ana') && x.includes('4/5') && x.includes('rodilla <i>')));
    assert.ok(!$$('.client-card i').length);
  });
  t('check-in atrasado: Carla (20 días) y Beto (sin check-ins y de alta hace 30 días)', () => {
    assert.ok(de('JC003').some(x => x.includes('📋 Carla') && x.includes('20 días sin mandar check-in')));
    assert.ok(de('JC002').some(x => x.includes('📋 Beto') && x.includes('Sin check-ins en los últimos 90 días')));
  });
  t('no avisa: recién dada de alta, inactivos, demo, ni volumen fuera de la semana', () => {
    assert.equal(de('JC006').filter(x => x.includes('📋')).length, 0);
    assert.equal(de('JC004').length, 0);
    assert.equal(de('JC007').length, 0);
    assert.ok(!de('JC005').some(x => x.includes('🔴')));
  });
  t('mesociclo alargado: Eva (activo desde hace 60 días); Fran (10 días) no', () => {
    assert.ok(de('JC005').some(x => x.includes('📅 Eva') && x.includes('Fuerza:') && x.includes('semanas en "Acumulación · Carga"')));
    assert.equal(de('JC006').filter(x => x.includes('📅')).length, 0);
  });
  t('clic en una tarjeta abre la ficha del cliente', () => {
    tarjetas().find(x => x.dataset.client === 'JC003').click();
    assert.equal(location.hash, '#/clientes/JC003');
  });
}

// Si falla una tabla secundaria, el dashboard sigue
{
  const { $, txt } = await abrir({
    clientes: [cl(2, 'Beto', { checkin_activo: true, fecha_inicio: iso(30) })],
    fallos: { 'seguimiento_corporal:GET': 'sin permiso', 'mesociclos:GET': 'sin permiso' }
  });
  t('fallo en check-ins/mesociclos: se pinta igual con lo que hay', () => {
    assert.ok(!$('.alert-error'));
    assert.ok(txt().includes('Sin check-ins en los últimos 90 días'));
  });
}

// Check-in simple: se espera uno por semana, así que avisa a partir de 10 días (el plus sigue en 14)
{
  const { clientesConCheckinAtrasado } = await importar('dashboard/alertas.js');
  const c = (id, extra) => ({ id, codigo: 'JC00' + id, nombre: 'C' + id, estado_cliente: 'ACTIVO', fecha_inicio: iso(60), ...extra });
  const hoy = new Date();
  const clientes = [
    c(1, { checkin_simple_activo: true }),                         // solo simple, 11 días → avisa
    c(2, { checkin_simple_activo: true }),                         // solo simple, 8 días → no
    c(3, { checkin_activo: true }),                                // solo plus, 11 días → no (umbral 14)
    c(4, { checkin_activo: true, checkin_simple_activo: true }),   // ambos: manda el plus (14), 11 días → no
    c(5, {})                                                       // sin ningún check-in activo → no
  ];
  const checkins = [1, 3, 4].map(id => ({ cliente_id: id, fecha: iso(11) })).concat([{ cliente_id: 2, fecha: iso(8) }, { cliente_id: 5, fecha: iso(30) }]);
  const r = clientesConCheckinAtrasado({ clientes, checkins, hoy });
  t('check-in simple: avisa a los 10 días; el plus y el mixto siguen en 14', () => {
    assert.deepEqual(r.map(x => x.codigo), ['JC001']);
    assert.equal(r[0].dias, 11);
  });
  t('check-in simple sin ningún check-in: avisa si lleva 14+ días de alta', () => {
    const sin = clientesConCheckinAtrasado({ clientes: [c(9, { checkin_simple_activo: true })], checkins: [], hoy });
    assert.equal(sin.length, 1);
    assert.equal(sin[0].dias, null);
  });
}

console.log(`\n${ok} comprobaciones OK`);
process.exit(0);
