import assert from 'node:assert/strict';
import { crearEntorno, hasta, invalidarDatos, importar } from './harness.mjs';

let ok = 0; const t = (n, f) => { f(); ok++; console.log('✓', n); };
const iso = n => { const d = new Date(); d.setDate(d.getDate() - n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const { fechaRenovacionCliente } = await importar('core/renovacion.js');

t('renovación: fecha_renovacion manda; si no, inicio + 30/90/180 según plan; sin datos null', () => {
  const ahora = new Date('2026-10-01T00:00:00Z');
  assert.equal(fechaRenovacionCliente({ fecha_renovacion: '2026-10-12T00:00:00Z' }, ahora).dias, 11);
  assert.equal(fechaRenovacionCliente({ fecha_inicio: '2026-10-01', plan: '1MES' }, ahora).dias, 30);
  assert.equal(fechaRenovacionCliente({ fecha_inicio: '2026-10-01', plan: '3MESES' }, ahora).dias, 90);
  assert.equal(fechaRenovacionCliente({ fecha_inicio: '2026-10-01', plan: '6MESES' }, ahora).dias, 180);
  assert.equal(fechaRenovacionCliente({}, ahora), null);
});

const cliente = { id: 9, codigo: 'JC009', nombre: 'Elena <b>', estado_cliente: 'ACTIVO', plan: '1MES', fecha_inicio: iso(25), objetivo: 'Definición', nivel_atleta: 'Intermedio' };
async function abrir(cli, mesociclos = [], pestana = 'datos') {
  await invalidarDatos();
  const { w } = crearEntorno({ clientes: [cli], tablas: { mesociclos, etapas: [], rutinas: [], sesiones: [], seguimiento_corporal: [], planes_nutricion: [], rm_estimaciones: [] } });
  const { arrancar } = await importar('core/app.js');
  await arrancar();
  w.location.hash = `#/clientes/JC009/${pestana}`;
  const $ = s => w.document.querySelector(s);
  await hasta(() => $('.detail-line'));
  return { w, $, $$: s => [...w.document.querySelectorAll(s)], txt: () => w.document.body.textContent.replace(/\s+/g, ' ') };
}

{
  const { $, $$, txt } = await abrir(cliente, [{ id: 1, numero: 2, nombre: 'Base', tipo_atr: 'sobrecarga', fecha_inicio: iso(10), fecha_fin: null }]);
  t('cabecera compacta: nombre escapado, etiquetas y las 3 acciones', () => {
    assert.ok($('.detail-header.dh-compact') && !$('.detail-name b'));
    assert.ok(txt().includes('Elena <b>') && txt().includes('JC009') && txt().includes('Definición') && txt().includes('Intermedio'));
    assert.deepEqual($$('[data-accion-cabecera]').map(b => b.textContent.trim()), ['✏️ Editar cliente', '📄 Resumen PDF', '🔔 Mensaje']);
  });
  t('línea de la ficha: mesociclo activo por su tipo y renovación con los días que quedan', () => {
    assert.ok($('.detail-line').textContent.replace(/\s+/g, ' ').includes('Mesociclo activo Sobrecarga'));
    assert.ok($('.detail-line .stat-chip').textContent.trim() === '5 d' || /^\d+ d$/.test($('.detail-line .stat-chip').textContent.trim()));
    assert.ok($('.detail-line .stat-chip').style.color.includes('danger'));
  });
  t('barra de pestañas: sticky, con icono SVG y etiqueta, sin emojis', () => {
    assert.ok($('.tabs.tabs-ico.tabs-sticky'));
    assert.ok($$('.tabs-sticky .tab').every(b => b.querySelector('.tab-ico svg') && b.querySelector('.tab-lbl')));
    assert.deepEqual($$('.tabs-sticky .tab-lbl').map(x => x.textContent), ['Datos', 'Rutinas', 'Periodización', 'Cardio', 'Historial', 'Volumen', 'Etapas', 'Cuerpo', 'Avisos']);
  });
}
{
  const { $ } = await abrir({ ...cliente, fecha_inicio: null }, []);
  t('sin bloques ni fecha: guiones en mesociclo y renovación', () => {
    const l = $('.detail-line').textContent.replace(/\s+/g, ' ');
    assert.ok(l.includes('Mesociclo activo —') && l.includes('Renovación —'));
  });
}
{
  const { $ } = await abrir({ ...cliente, fecha_inicio: iso(60) }, [{ id: 1, numero: 1, nombre: 'Base', tipo_atr: null, fecha_inicio: iso(-3), fecha_fin: null }]);
  t('bloque que aún no empieza: "(próximo)"; bloque sin tipo: usa su nombre y número', () => {
    assert.ok($('.detail-line').textContent.replace(/\s+/g, ' ').includes('Base 1 (próximo)'));
  });
}

console.log(`\n${ok} comprobaciones OK`);
process.exit(0);
