import assert from 'node:assert/strict';
import { crearEntorno, grafica, hasta, esperar, invalidarDatos, importar } from './harness.mjs';

const dia = n => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
const cliente = {
  id: 7, codigo: 'JC007', nombre: 'Lucía', plan: '3MESES', estado_cliente: 'ACTIVO',
  genero: 'MUJER', edad: 30, altura: 165, anos_entreno: 3, nivel_atleta: 'Principiante'
};
const medidasCompletas = { cuello: 31, brazo: 28, antebrazo: 23, cadera: 98, muslo: 56, pantorrilla: 36, activo4h: 'no' };

let ok = 0; const t = (n, f) => { f(); ok++; console.log('✓', n); };
const { calcularComposicionDesdeEntry } = await importar('cuerpo/calculos.js');
const comp = e => calcularComposicionDesdeEntry(e, cliente);

// BD simulada de seguimiento_corporal (+ opciones para bloquear borrados / fallar la carga)
function bd(inicial, { bloquearDelete = false, falla = false, sesiones = [], fallaSesiones = false } = {}) {
  const filas = inicial.map((f, i) => ({ id: 'r' + (i + 1), cliente_id: 7, origen: 'checkin', ...f }));
  const id = qs => (qs.match(/(?:^|&)id=eq\.([^&]+)/) || [])[1];
  return {
    filas,
    tablas: {
      seguimiento_corporal: (m, qs, body) => {
        if (falla && m === 'GET') return { __error: 'sin permiso' };
        if (m === 'GET') return filas.map(f => ({ ...f }));
        if (m === 'POST') { const n = { id: 'n' + (filas.length + 1), ...body }; filas.push(n); return [n]; }
        if (m === 'PATCH') { const f = filas.find(x => String(x.id) === id(qs)); if (f) Object.assign(f, body); return f ? [f] : []; }
        if (m === 'DELETE') {
          if (bloquearDelete) return [];
          if (id(qs)) { const i = filas.findIndex(x => String(x.id) === id(qs)); if (i >= 0) filas.splice(i, 1); }
          else filas.length = 0;
          return [{ id: 'x' }];
        }
        return [];
      },
      planes_nutricion: () => [{ objetivo_calorico: 'corte' }],
      sesiones: () => (fallaSesiones ? { __error: 'caído' } : sesiones),
      rutinas: () => [{ id: 'rA', nombre: 'Push', orden: 1, mesociclo_id: null, cliente_id: 7 }],
      mesociclos: () => []
    }
  };
}

async function escenario(base, opciones) {
  await invalidarDatos();
  const b = bd(base, opciones);
  const { w, llamadas } = crearEntorno({ clientes: [cliente], tablas: b.tablas });
  const charts = grafica(w);
  const { arrancar } = await importar('core/app.js');
  await arrancar();
  const $ = s => w.document.querySelector(s);
  const $$ = s => [...w.document.querySelectorAll(s)];
  w.location.hash = '#/clientes/JC007/cuerpo';
  await hasta(() => $('[data-sec="seguimiento"]') || $('.alert-error'));
  return { w, llamadas, charts, $, $$, b };
}

// ── A: sin registros ──
{
  const { $, $$ } = await escenario([]);
  t('sin registros: mensaje vacío, botón añadir y sin lectura rápida', () => {
    assert.ok($('[data-sec="seguimiento"]').textContent.includes('Todavía no hay registros'));
    assert.ok($('[data-accion="anadir"]'));
    assert.equal($('[data-sec="lectura"]').innerHTML.trim(), '');
    assert.equal($$('canvas').length, 0);
  });
}

// ── B: la carga falla → se dice, nunca "vacío" ──
{
  const { $ } = await escenario([], { falla: true });
  t('si falla la carga, se dice (no se enseña vacío)', () => {
    assert.ok($('.alert-error').textContent.includes('No se pudo cargar el seguimiento corporal'));
    assert.equal($('[data-accion="anadir"]'), null);
  });
}

// ── C: historial completo (2 de composición + check-in plus sin composición + check-in con notas) ──
{
  const r1 = { fecha: dia(60), origen: 'nutricion', peso: 70, abdomen: 80, ...medidasCompletas };
  const r2 = { fecha: dia(30), origen: 'nutricion', peso: 68.5, abdomen: 77, ...medidasCompletas, cuello: 30.5 };
  r1.composicion = comp(r1); r2.composicion = comp(r2);
  const r3 = { fecha: dia(14), peso: 68.2, abdomen: 76, ...medidasCompletas, composicion: null };
  const r4 = { fecha: dia(7), peso: 67.9, abdomen: 75.5, composicion: null,
    sensaciones: 4, sensaciones_nota: '<img src=x onerror=alert(1)>', adherencia: 4, sueno: 3, energia: 4, molestias: 5 };
  const { w, llamadas, charts, $, $$, b } = await escenario([r1, r2, r3, r4]);
  await hasta(() => llamadas.some(l => l.method === 'PATCH'));
  t('cabecera: 4 registros y lectura rápida visible', () => {
    assert.ok($('[data-sec="seguimiento"]').textContent.includes('4 registros'));
    assert.ok($('[data-sec="lectura"]').textContent.includes('Lectura rápida'));
  });
  t('lectura rápida con composición: % graso y masa magra; sin sesiones dice que no hay fuerza', () => {
    const txt = $('[data-sec="lectura"]').textContent;
    assert.ok(txt.includes('% graso') && txt.includes('Masa magra'));
    assert.ok(txt.includes('sesiones registradas'));
  });
  t('autocompletar: el check-in plus sin composición se calcula y se guarda (PATCH); el simple no', () => {
    const parches = llamadas.filter(l => l.method === 'PATCH' && l.tabla === 'seguimiento_corporal');
    assert.equal(parches.length, 1);
    assert.ok(parches[0].qs.includes('id=eq.r3'));
    assert.ok(parches[0].body.composicion && parches[0].body.composicion.bf);
    assert.equal(b.filas.find(f => f.id === 'r4').composicion, null);
  });
  t('las gráficas no se cargan hasta pulsar "Ver evolución"', () => {
    assert.equal(charts.length, 0);
    assert.equal($('[data-sec="seguimiento"] [data-accion="toggle-categoria"]'), null);
  });
  $('[data-accion="toggle-graficas"]').click();
  await hasta(() => $('[data-accion="toggle-categoria"]'));
  t('Ver evolución: veredicto y categorías con datos (cerradas)', () => {
    assert.ok($('[data-sec="seguimiento"]').textContent.includes('Qué tocar') || $('[data-sec="seguimiento"]').textContent.includes('Perímetros'));
    const cats = $$('[data-accion="toggle-categoria"]').map(e => e.dataset.cat);
    assert.ok(cats.includes('perimetros') && cats.includes('composicion') && cats.includes('checkin'));
    assert.equal($$('canvas').length, 0);
  });
  $('[data-accion="toggle-categoria"][data-cat="perimetros"]').click();
  await hasta(() => charts.length >= 1);
  t('categoría Perímetros: gráfica de peso en orden cronológico', () => {
    const g = charts.find(c => c.canvas.dataset.grafica === 'peso');
    assert.deepEqual(g.cfg.data.datasets[0].data, [70, 68.5, 68.2, 67.9]);
  });
  $('[data-accion="toggle-categoria"][data-cat="checkin"]').click();
  await esperar(30);
  t('check-in con un solo envío: se muestra el dato sin gráfica y la nota va escapada', () => {
    const cuerpo = $('[data-accion="toggle-categoria"][data-cat="checkin"]').parentElement.textContent;
    assert.ok(cuerpo.includes('primer check-in'));
    assert.equal($('[data-sec="seguimiento"] img'), null);
    assert.ok($('[data-sec="seguimiento"]').textContent.includes('<img src=x onerror=alert(1)>'));
  });
  $('[data-accion="toggle-lista"]').click();
  await esperar(10);
  t('lista de registros: 4 filas, una por registro, con su origen', () => {
    const filas = $$('[data-accion="borrar-registro"]');
    assert.equal(filas.length, 4);
    assert.ok($('[data-sec="seguimiento"]').textContent.includes('Check-in'));
    assert.ok($('[data-sec="seguimiento"]').textContent.includes('Manual / Nutrición'));
  });
  // Borrar un registro suelto
  $('[data-accion="borrar-registro"][data-id="r2"]').click();
  await hasta(() => $('.modal-overlay')); $('.modal [data-r="si"]').click();
  await hasta(() => llamadas.some(l => l.method === 'DELETE'));
  await hasta(() => $('[data-sec="seguimiento"]').textContent.includes('3 registros'));
  t('borrar registro: DELETE por id y desaparece', () => {
    assert.ok(llamadas.find(l => l.method === 'DELETE').qs.includes('id=eq.r2'));
    assert.ok(!b.filas.some(f => f.id === 'r2'));
  });
  // Borrar el historial completo
  $('[data-accion="borrar-historial"]').click();
  await hasta(() => $('.modal-overlay')); $('.modal [data-r="si"]').click();
  await hasta(() => $('[data-sec="seguimiento"]').textContent.includes('Todavía no hay registros'));
  t('borrar historial: DELETE por cliente y vuelve al estado vacío', () => {
    const d = llamadas.filter(l => l.method === 'DELETE').pop();
    assert.ok(d.qs.includes('cliente_id=eq.7'));
    assert.equal($('[data-sec="lectura"]').innerHTML.trim(), '');
  });
}

// ── D: añadir registro (completo → con composición; solo peso+abdomen → sin composición) ──
{
  const { w, llamadas, $, b } = await escenario([]);
  const abrir = async () => { $('[data-accion="anadir"]').click(); await hasta(() => $('.modal-overlay')); };
  const poner = (campo, v) => { $(`.modal [data-campo="${campo}"]`).value = v; };
  await abrir();
  $('.modal [data-r="si"]').click();
  await hasta(() => $('.modal [data-error]').textContent.includes('al menos el peso'));
  t('modal vacío: pide peso o abdomen y no escribe nada', () => {
    assert.ok($('.modal [data-error]').textContent.includes('al menos el peso'));
    assert.equal(llamadas.filter(l => l.method === 'POST').length, 0);
  });
  poner('peso', '68,4'); poner('abdomen', '76'); poner('cuello', '31'); poner('antebrazo', '23');
  poner('cadera', '98'); poner('muslo', '56'); poner('pantorrilla', '36'); poner('brazo', '28');
  $('.modal [data-r="si"]').click();
  await hasta(() => llamadas.some(l => l.method === 'POST'));
  await hasta(() => !$('.modal-overlay'));
  t('registro completo: POST con fecha de hoy, número con coma y composición calculada', () => {
    const p = llamadas.find(l => l.method === 'POST');
    assert.equal(p.tabla, 'seguimiento_corporal');
    assert.equal(p.body.peso, 68.4);
    assert.equal(p.body.cliente_id, 7);
    assert.equal(p.body.origen, 'nutricion');
    assert.match(p.body.fecha, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(p.body.composicion && p.body.composicion.bf && p.body.composicion.comp);
    assert.equal(p.body.anos_entreno, 3);
  });
  await hasta(() => $('[data-sec="seguimiento"]').textContent.includes('1 registro'));
  t('tras guardar se recarga y aparece la cabecera con 1 registro', () => {
    assert.ok($('[data-sec="seguimiento"]').textContent.includes('(1 registro)'));
    assert.equal(b.filas.length, 1);
  });
  // Segundo registro el mismo día: se actualiza, no se duplica; y sin medidas no hay composición
  await abrir();
  poner('peso', '68.0'); poner('abdomen', '75');
  $('.modal [data-r="si"]').click();
  await hasta(() => llamadas.some(l => l.method === 'PATCH' && l.tabla === 'seguimiento_corporal' && l.body && l.body.peso === 68));
  await hasta(() => !$('.modal-overlay'));
  t('mismo día y mismo origen: PATCH en vez de fila duplicada; sin medidas, composición null', () => {
    const p = llamadas.filter(l => l.method === 'PATCH' && l.tabla === 'seguimiento_corporal').pop();
    assert.ok(p.qs.includes('id=eq.n1'));
    assert.equal(p.body.composicion, null);
    assert.equal(b.filas.length, 1);
  });
}

// ── E: RLS bloquea el borrado → error claro ──
{
  const r = { fecha: dia(5), peso: 70, abdomen: 80 };
  const { $, b } = await escenario([r], { bloquearDelete: true });
  $('[data-accion="toggle-lista"]').click();
  await esperar(10);
  $('[data-accion="borrar-registro"]').click();
  await hasta(() => $('.modal-overlay')); $('.modal [data-r="si"]').click();
  await hasta(() => $('#alertas') && $('#alertas').textContent.includes('RLS'));
  t('RLS bloquea el borrado: aviso con la tabla y el registro sigue', () => {
    assert.ok($('#alertas').textContent.includes('política RLS de seguimiento_corporal'));
    assert.equal(b.filas.length, 1);
  });
}

// ── F: fuerza en la lectura rápida ──
{
  const regs = [
    { fecha: dia(40), peso: 70, abdomen: 80 }, { fecha: dia(5), peso: 68.5, abdomen: 77 }
  ];
  const sesiones = [0, 1, 2, 3].map(i => ({ fecha: dia(30 - i * 7), ejercicio: 'Press banca', series_detalle: `SERIE 1: ${80 - i * 5}kg x 8`, rutina_id: 'rA' }));
  const { $ } = await escenario(regs, { sesiones });
  t('fuerza cayendo en Entrenos: la lectura lo muestra como "En bajada"', () => {
    assert.ok($('[data-sec="lectura"]').textContent.includes('En bajada (1)'));
  });
  const { $: $2 } = await escenario(regs, { fallaSesiones: true });
  t('si falla el historial de entrenos: la pestaña funciona y avisa de que la fuerza no entra', () => {
    assert.ok($2('[data-sec="lectura"]').textContent.includes('Lectura rápida'));
    assert.ok($2('[data-sec="lectura"]').textContent.includes('No se pudo leer el historial de entrenos'));
  });
}

// ── G: composición desde entry (check-in simple no inventa % graso) ──
t('calcularComposicionDesdeEntry: solo peso+abdomen → null (check-in simple)', () => {
  assert.equal(comp({ peso: 68, abdomen: 76 }), null);
});
t('calcularComposicionDesdeEntry: medidas completas → composición con índices', () => {
  const c = comp({ peso: 68, abdomen: 76, ...medidasCompletas });
  assert.ok(c.bf.media > 5 && c.bf.media < 50);
  for (const k of ['comp', 'w', 'cv', 'rh', 'ri', 'rs', 'iqf', 'irr', 'ire', 'ipo']) assert.ok(c[k], k);
});

console.log(`\n${ok} comprobaciones OK`);
