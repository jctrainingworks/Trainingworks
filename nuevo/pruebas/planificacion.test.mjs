import assert from 'node:assert/strict';
import { crearEntorno, hasta, invalidarDatos, importar } from './harness.mjs';

let ok = 0; const t = (n, f) => { f(); ok++; console.log('✓', n); };
const iso = n => { const d = new Date(); d.setDate(d.getDate() - n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

const clientes = [
  { id: 1, codigo: 'JC001', nombre: 'Ana <b>', estado_cliente: 'ACTIVO', modelo_periodizacion: 'CSD', eventos_periodizacion: [{ id: 'e1', tipo: 'viaje', titulo: 'Cádiz', desde: iso(-1), hasta: iso(-4) }] },
  { id: 2, codigo: 'JC002', nombre: 'Bea', estado_cliente: 'ACTIVO', modelo_periodizacion: 'PROPIO' },
  { id: 3, codigo: 'JC003', nombre: 'Carlos', estado_cliente: 'PAUSADO' },
  { id: 4, codigo: 'JC004', nombre: 'Demo', estado_cliente: 'ACTIVO', es_demo: true },
  { id: 5, codigo: 'JC005', nombre: 'Eva', estado_cliente: 'ACTIVO' },
  { id: 6, codigo: 'JC006', nombre: 'Fran', estado_cliente: 'ACTIVO' }
];
const mesociclos = [
  { id: 'a1', cliente_id: 1, numero: 1, nombre: 'Macrociclo anual', tipo_atr: 'carga', fecha_inicio: iso(20), fecha_fin: iso(-3) },
  { id: 'a2', cliente_id: 1, numero: 2, nombre: 'Macrociclo anual', tipo_atr: 'sobrecarga', fecha_inicio: iso(-4), fecha_fin: iso(-30) },
  { id: 'e1', cliente_id: 5, numero: 1, nombre: 'Viejo', tipo_atr: 'carga', fecha_inicio: iso(60), fecha_fin: iso(40) },
  { id: 'e2', cliente_id: 5, numero: 2, nombre: 'Nuevo', tipo_atr: 'descarga', fecha_inicio: iso(39), fecha_fin: null },
  { id: 'f1', cliente_id: 6, numero: 1, nombre: 'Base', tipo_atr: 'carga', fecha_inicio: iso(-10), fecha_fin: iso(-40) }
];
const etapas = [{ id: 1, cliente_id: 5, fecha_fin: iso(45) }];

async function abrir({ conEtapas = true } = {}) {
  await invalidarDatos();
  const { w, llamadas } = crearEntorno({ clientes, tablas: { mesociclos, etapas: conEtapas ? etapas : () => ({ __error: 'no existe' }), rm_estimaciones: [] } });
  const { arrancar } = await importar('core/app.js');
  await arrancar();
  w.location.hash = '#/planificacion';
  const $ = s => w.document.querySelector(s);
  const $$ = s => [...w.document.querySelectorAll(s)];
  await hasta(() => $('[data-abrir]') || $('.empty'));
  return { w, llamadas, $, $$, txt: () => w.document.body.textContent.replace(/\s+/g, ' ') };
}

{
  const { w, $, $$, txt } = await abrir();
  t('menú: Planificación después de Clientes', () => {
    const ids = $$('.sidebar-nav [data-nav]').map(x => x.dataset.nav);
    assert.equal(ids.indexOf('planificacion'), ids.indexOf('clientes') + 1);
  });
  t('solo clientes activos y no demo, con el nombre escapado', () => {
    const nombres = $$('[data-abrir]').map(b => b.textContent);
    assert.deepEqual(nombres.sort(), ['Ana <b>', 'Bea', 'Eva', 'Fran']);
    assert.ok(!$('[data-abrir] b'));
  });
  t('orden: el que cambia antes va primero y los sin bloques al final', () => {
    const nombres = $$('[data-abrir]').map(b => b.textContent);
    assert.equal(nombres[0], 'Ana <b>');
    assert.ok(['Bea'].includes(nombres[nombres.length - 1]) || nombres.indexOf('Bea') > nombres.indexOf('Fran'));
  });
  t('cambio de fase: "Cambia a Sobrecarga en 4 d" y semana actual', () => {
    assert.ok(txt().includes('Cambia a Sobrecarga en 4 d'));
    assert.ok(txt().includes('Carga · sem 3/3'));
  });
  t('bloque futuro: "Empieza Carga el ..."; sin bloques: aviso', () => {
    assert.ok(txt().includes('Empieza Carga el'));
    assert.ok(txt().includes('Sin bloques con fecha'));
  });
  t('📌 Esta semana lista a Ana y avisa del viaje en Carga', () => {
    assert.ok(txt().includes('📌 Esta semana') && txt().includes('Ana <b> · Carga → Sobrecarga en 4 d'));
    assert.ok(txt().includes('Evento (viaje, puente, vacaciones) en Carga o Sobrecarga: Ana <b>'));
  });
  t('etapa cerrada: Eva solo ve los bloques posteriores (Descarga, no el viejo)', () => {
    const tarjeta = $$('.pz-card').find(c => c.textContent.includes('Eva'));
    assert.ok(tarjeta.textContent.includes('Descarga'));
    assert.ok(!tarjeta.textContent.includes('Carga · sem'));
  });
  t('modelos: JCTW para PROPIO, ATR por defecto', () => {
    assert.ok(txt().includes('JCTW') && txt().includes('ATR'));
  });
  $('[data-abrir="JC001"]').click();
  await hasta(() => w.location.hash === '#/clientes/JC001/periodizacion');
  t('pulsar el nombre abre su pestaña Periodización', () => assert.equal(w.location.hash, '#/clientes/JC001/periodizacion'));
}

{
  const { txt, $$ } = await abrir({ conEtapas: false });
  t('sin tabla de etapas: no se filtra nada y no falla', () => {
    assert.equal($$('[data-abrir]').length, 4);
    const eva = $$('.pz-card').find(c => c.textContent.includes('Eva'));
    assert.ok(eva.textContent.includes('Descarga'));
  });
}

console.log(`\n${ok} comprobaciones OK`);
process.exit(0);
