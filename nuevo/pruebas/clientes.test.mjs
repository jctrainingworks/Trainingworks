import assert from 'node:assert/strict';
import fs from 'node:fs';
import { crearEntorno, hasta, invalidarDatos, importar } from './harness.mjs';

let ok = 0; const t = (n, f) => { f(); ok++; console.log('✓', n); };
const iso = n => { const d = new Date(); d.setDate(d.getDate() - n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const form = await importar('clientes/formulario.js');
const msj = await importar('clientes/mensaje.js');
const pesos = await importar('clientes/pesos.js');

// 1) Puro
t('código de acceso: 3 letras (sin I ni O) + 4 números y distinto de los existentes', () => {
  for (let i = 0; i < 200; i++) assert.match(form.generarCodigoCliente([]), /^[A-HJ-KM-NP-Z]{3}\d{4}$/);
  const seq = [0, 0, 0, 0, 0.5, 0.5, 0.5, 0, 0, 0, 0, 0.9]; let i = 0; // primer intento = AAA1000, ocupado → segundo
  const azar = () => (i < 7 ? seq[i++] : [0.1, 0.1, 0.1, 0.1][(i++) % 4]);
  const c = form.generarCodigoCliente([{ codigo: 'AAA1000' }], azar);
  assert.notEqual(c, 'AAA1000');
});
t('plan según modalidad: online 1/3/6 meses, presencial sesión suelta y bonos', () => {
  assert.ok(form.opcionesPlan('ONLINE', '3MESES').includes('<option value="3MESES" selected>3 MESES — 297€'));
  assert.ok(form.opcionesPlan('PRESENCIAL', 'BONO_8').includes('BONO 8 SESIONES — 210€') && !form.opcionesPlan('PRESENCIAL', '').includes('1MES'));
});
t('leerFormulario: mayúsculas, números, revisión semanal solo online', () => {
  const r = form.leerFormulario({ nombre: ' ana ', modalidad: 'online', plan: '1mes', edad: '31', altura: '165.5', pesoInicial: '60,5'.replace(',', '.'), fcReposo: '', email: 'a@b.c', notas: ' vip ' });
  assert.deepEqual([r.nombre, r.modalidad, r.plan, r.revision, r.edad, r.altura, r.fcReposo, r.email, r.notas], ['ANA', 'ONLINE', '1MES', 'SEMANAL', 31, 165.5, null, 'A@B.C', 'vip']);
  assert.equal(form.leerFormulario({ modalidad: 'PRESENCIAL' }).revision, null);
});
t('peso actual: el último válido (sin atípicos); ese día manda el de ficha_cliente; si no hay, peso inicial', () => {
  const l = [{ fecha: '2026-05-01', peso: 80 }, { fecha: '2026-06-01', peso: 79, origen: 'nutricion' }, { fecha: '2026-06-01', peso: 78, origen: 'ficha_cliente' }, { fecha: '2026-07-01', peso: 99, atipico: true }];
  assert.equal(pesos.pesoActualDesdeSeguimiento({}, l), 78);
  assert.equal(pesos.pesoActualDesdeSeguimiento({ peso_inicial: 70 }, []), 70);
});
t('frases del mensaje: unisex + las de su género; sin género, todas', () => {
  const n = msj.MOTIVACION_PUSH_FRASES;
  assert.equal(msj.frasesMotivacionPara({ genero: 'MUJER' }).length, n.unisex.length + n.mujer.length);
  assert.equal(msj.frasesMotivacionPara({ genero: 'HOMBRE' }).length, n.unisex.length + n.hombre.length);
  assert.equal(msj.frasesMotivacionPara({}).length, n.unisex.length + n.hombre.length + n.mujer.length);
});

// 2) Resumen PDF: mismo HTML que generateResumen de prueba
{
  const { construirResumenHtml } = await importar('clientes/resumenHtml.js');
  const { parseBloqueSerie, volumenBloqueSerie } = await importar('core/series.js');
  const { normalizaNombreEj } = await importar('core/musculo.js');
  const { parseSeriesDetalle } = await importar('historial/calculos.js');
  const { fechaLocalISO } = await importar('periodizacion/calculos.js');
  const { TABLA_VOLUMEN_MUSCULAR } = await importar('core/tablavolumen.js');
  const { LOGO_JC_PDF } = await importar('core/logo.js');
  const { esc } = await importar('core/ui.js');
  const src = fs.readFileSync(new URL('../../prueba/index.html', import.meta.url), 'utf8');
  const a = src.indexOf('function generateResumen(notaEntrenador, periodo)'), b = src.indexOf('// ── ⚖️ PDF de peso corporal');
  const musculo = n => ({ 'Press banca': 'Pecho', 'Sentadilla': 'Cuádriceps', 'Remo': 'Espalda', 'Curl': 'Bíceps', 'Press militar': 'Hombros' }[n] || 'Otro');
  const orig = (c, nota, periodo, etapas) => {
    let html = null;
    const f = new Function('state', 'esc', 'parseBloqueSerie', 'volumenBloqueSerie', 'normalizaNombreEj', 'parseSeriesDetalle', 'fechaLocalISO', 'TABLA_VOLUMEN_MUSCULAR', 'LOGO_JC_PDF', 'claveMusculoSeries', 'etapaUltimaFin', 'etapaFiltrarSesiones', 'descargarPdfDesdeHtml', 'abrirAlerta',
      src.slice(a, b) + '; return generateResumen;');
    const clave = n => { const k = normalizaNombreEj(musculo(n)).replace(/\s+/g, ''); return k === 'deltoidesposterior' ? 'hombros' : k; };
    const fin = () => etapas.map(e => String(e.fecha_fin).slice(0, 10)).sort().pop() || null;
    f({ clientDetail: c }, esc, parseBloqueSerie, volumenBloqueSerie, normalizaNombreEj, parseSeriesDetalle, fechaLocalISO, TABLA_VOLUMEN_MUSCULAR, LOGO_JC_PDF, clave, fin,
      (cc, arr) => { const d = fin(); if (!d) return arr; const dt = new Date(d + 'T00:00:00'); dt.setDate(dt.getDate() + 1); const desde = fechaLocalISO(dt); return arr.filter(s => String(s.fecha).slice(0, 10) >= desde); },
      h => { html = h; return Promise.resolve(); }, () => {})(nota, periodo);
    return html;
  };
  const c = { nombre: 'Elena <b>', objetivo: 'DEFINICION',
    historial: [
      { fecha: iso(80), ejercicio: 'Press banca', series: '50kg 10rep\n50kg 9rep', en_descarga: false }, { fecha: iso(70), ejercicio: 'Sentadilla', series: '80kg 8rep\n80kg 8rep', en_descarga: false },
      { fecha: iso(25), ejercicio: 'Press banca', series: '55kg 10rep\n55kg 8rep', en_descarga: false }, { fecha: iso(20), ejercicio: 'Sentadilla', series: '90kg 8rep\n90kg 8rep\n90kg 7rep', en_descarga: false },
      { fecha: iso(12), ejercicio: 'Remo', series: '40kg 10rep', en_descarga: false }, { fecha: iso(10), ejercicio: 'Curl', series: '12kg 12rep', en_descarga: false },
      { fecha: iso(8), ejercicio: 'Press militar', series: '30kg 10rep', en_descarga: true }, { fecha: iso(3), ejercicio: 'Press banca', series: '60kg 10rep\n60kg 9rep', en_descarga: false }
    ],
    mesociclos: [{ id: 1, fecha_inicio: iso(90), fecha_fin: null }], rutinas: [{ id: 'r1', mesociclo_id: 1, es_cardio: false }, { id: 'r2', mesociclo_id: 1, es_cardio: false }],
    seguimientoCorporal: [{ fecha: iso(60), peso: 80 }, { fecha: iso(5), peso: 77.5 }] };
  const casos = [['30', []], ['60', []], ['90', []], ['etapa', []], ['etapa', [{ fecha_fin: iso(40) }]], ['30', [{ fecha_fin: iso(15) }]]];
  t('Resumen PDF: HTML idéntico al de prueba (30/60/90 días, etapa actual, con y sin etapas cerradas)', () => {
    for (const [periodo, etapas] of casos) {
      assert.equal(construirResumenHtml(c, 'Muy bien <i>', periodo, { etapas, musculoDe: musculo }), orig(c, 'Muy bien <i>', periodo, etapas), `${periodo} ${JSON.stringify(etapas)}`);
    }
  });
  t('Resumen PDF: sin entrenos ni pesos también igual', () => {
    const vacio = { nombre: 'Nuevo', historial: [], mesociclos: [], rutinas: [], seguimientoCorporal: [] };
    assert.equal(construirResumenHtml(vacio, '', '30', { musculoDe: musculo }), orig(vacio, '', '30', []));
  });
  t('Resumen PDF: nombre y nota escapados; sin series de descarga', () => {
    const h = construirResumenHtml(c, 'Muy bien <i>', '90', { etapas: [], musculoDe: musculo });
    assert.ok(h.includes('Elena &lt;b&gt;') && h.includes('Muy bien &lt;i&gt;') && !h.includes('Muy bien <i>'));
  });
}

// 3) Lista, alta, edición, mensaje
const clientes = [
  { id: 1, codigo: 'AAA1111', nombre: 'Ana <b>', estado_cliente: 'ACTIVO', modalidad: 'ONLINE', plan: '1MES', objetivo: 'FUERZA', fecha_inicio: iso(25), genero: 'MUJER', edad: 30, altura: 165, peso_inicial: 60, estado_pago: 'AL DIA' },
  { id: 2, codigo: 'BBB2222', nombre: 'Bruno', estado_cliente: 'ACTIVO', modalidad: 'PRESENCIAL', plan: 'BONO_8', genero: 'HOMBRE' },
  { id: 3, codigo: 'CCC3333', nombre: 'Demo uno', estado_cliente: 'ACTIVO', modalidad: 'ONLINE', plan: '3MESES', es_demo: true }
];
async function abrir(hash, { tablas = {}, funciones = {}, fallos = {}, escritos = [] } = {}) {
  await invalidarDatos();
  const tr = (nombre, def) => (m, qs, body) => { if (m !== 'GET') escritos.push({ m, tabla: nombre, qs, body }); return m === 'POST' ? [{ id: 'nuevo', ...body }] : (m === 'GET' ? def : []); };
  const { w, llamadas } = crearEntorno({ clientes, fallos, funciones, tablas: { clientes: tr('clientes', clientes), seguimiento_corporal: tr('seguimiento_corporal', []), mesociclos: [], etapas: [], rutinas: [], rm_estimaciones: [], ...tablas } });
  const { arrancar } = await importar('core/app.js');
  await arrancar();
  w.location.hash = hash;
  const $ = s => w.document.querySelector(s);
  const espera = hash.split('/').length > 3 ? '[data-accion-cabecera]' : '.client-card';
  await hasta(() => $(espera));
  return { w, escritos, llamadas, $, $$: s => [...w.document.querySelectorAll(s)], txt: () => w.document.body.textContent.replace(/\s+/g, ' ') };
}
const poner = (w, el, v, ev = 'input') => { el.value = v; el.dispatchEvent(new w.Event(ev, { bubbles: true })); };
const visibles = $$ => $$('.client-card').filter(c => c.style.display !== 'none').map(c => c.dataset.cliente);

{
  const { w, $, $$, txt } = await abrir('#/clientes');
  t('lista: botones de alta, filtros con contadores y buscador', () => {
    assert.ok($('[data-nuevo-cliente]') && $('[data-cliente-demo]'));
    assert.deepEqual($$('.cf-chip').map(b => b.textContent.trim()), ['Todos 3', 'Online 1', 'Presencial 1', 'Demo 1']);
    assert.ok($('.cf-search'));
  });
  t('lista: una sola rejilla ordenada online, presencial y demo; nombre escapado', () => {
    assert.deepEqual($$('.client-card').map(c => c.dataset.cliente), ['AAA1111', 'BBB2222', 'CCC3333']);
    assert.ok(txt().includes('Ana <b>') && !$('.client-name b'));
  });
  t('lista: renovación solo en online con fecha; sesiones restantes solo en presencial', () => {
    assert.ok($('[data-cliente="AAA1111"] .client-renov').textContent.startsWith('Renov.'));
    assert.ok(!$('[data-cliente="BBB2222"] .client-renov'));
    assert.ok($('[data-cliente="BBB2222"]').textContent.includes('SESIONES RESTANTES'));
  });
  $('.cf-chip[data-modo="presencial"]').click();
  t('filtro Presencial y buscador por nombre o código', () => {
    assert.deepEqual(visibles($$), ['BBB2222']);
    $('.cf-chip[data-modo="todos"]').click();
    poner(w, $('.cf-search'), 'aaa');
    assert.deepEqual(visibles($$), ['AAA1111']);
    poner(w, $('.cf-search'), 'bruno');
    assert.deepEqual(visibles($$), ['BBB2222']);
  });
  t('menú ⋯ muestra y oculta "Eliminar"', () => {
    const card = $('[data-cliente="AAA1111"]');
    assert.ok(!card.querySelector('.card-del').classList.contains('show'));
    card.querySelector('[data-mas]').click();
    assert.ok(card.querySelector('.card-del').classList.contains('show'));
  });
}
{ // eliminar
  const { w, $, $$, escritos } = await abrir('#/clientes');
  $('[data-cliente="BBB2222"] [data-eliminar]').click();
  await hasta(() => $('[data-r="si"]'));
  t('eliminar: pide confirmación con el nombre y no borra si se cancela', () => {
    assert.ok($('.modal-sub').textContent.includes('¿Eliminar a Bruno?'));
    $('[data-r="no"]').click();
    assert.equal(escritos.length, 0);
  });
  $('[data-cliente="BBB2222"] [data-eliminar]').click();
  await hasta(() => $('[data-r="si"]'));
  $('[data-r="si"]').click();
  await hasta(() => escritos.length);
  t('eliminar: DELETE por código', () => { assert.equal(escritos[0].m, 'DELETE'); assert.ok(escritos[0].qs.includes('codigo=eq.BBB2222')); });
}
{ // alta
  const { w, $, $$, escritos } = await abrir('#/clientes');
  $('[data-nuevo-cliente]').click();
  await hasta(() => $('#f_nombre'));
  t('alta: formulario vacío con las secciones y la primera toma de perímetros', () => {
    assert.ok($('.modal-title').textContent === 'Nuevo cliente' && $('details.mx-det') && $('#f_toma_cuello'));
    assert.equal($('#f_plan').value, '');
  });
  poner(w, $('#f_modalidad'), 'PRESENCIAL', 'change');
  t('al elegir PRESENCIAL el plan ofrece sesión suelta y bonos', () => assert.deepEqual($$('#f_plan option').map(o => o.value), ['', 'SESION_SUELTA', 'BONO_8', 'BONO_12']));
  poner(w, $('#f_modalidad'), 'ONLINE', 'change');
  t('al elegir ONLINE el plan ofrece 1/3/6 meses', () => assert.deepEqual($$('#f_plan option').map(o => o.value), ['', '1MES', '3MESES', '6MESES']));
  $('[data-confirmar]').click();
  t('alta sin nombre: avisa y no escribe', () => { assert.ok($('[data-error]').textContent.includes('El nombre es obligatorio')); assert.equal(escritos.length, 0); });
  poner(w, $('#f_nombre'), 'maría pérez'); poner(w, $('#f_plan'), '3MESES', 'change'); poner(w, $('#f_edad'), '28'); poner(w, $('#f_peso_inicial'), '62.5'); poner(w, $('#f_toma_abdomen'), '71');
  poner(w, $('#f_email'), 'm@x.es'); poner(w, $('#f_objetivo'), 'SALUD', 'change');
  $('[data-confirmar]').click();
  await hasta(() => escritos.length >= 2 && !$('#f_nombre'));
  t('alta: POST clientes con mayúsculas, código generado, revisión semanal y es_demo false', () => {
    const c = escritos.find(e => e.tabla === 'clientes' && e.m === 'POST').body;
    assert.equal(c.nombre, 'MARÍA PÉREZ'); assert.match(c.codigo, /^[A-HJ-KM-NP-Z]{3}\d{4}$/); assert.equal(c.plan, '3MESES'); assert.equal(c.revision, 'SEMANAL');
    assert.equal(c.edad, 28); assert.equal(c.peso_inicial, 62.5); assert.equal(c.email, 'M@X.ES'); assert.equal(c.estado_cliente, 'ACTIVO'); assert.equal(c.es_demo, false);
  });
  t('alta: la primera toma crea un registro de seguimiento de hoy con peso y abdomen', () => {
    const s = escritos.find(e => e.tabla === 'seguimiento_corporal').body;
    assert.equal(s.peso, 62.5); assert.equal(s.abdomen, 71); assert.equal(s.fecha, iso(0)); assert.equal(s.origen, 'nutricion'); assert.equal(s.cliente_id, 'nuevo');
  });
}
{ // demo
  const { w, $, escritos } = await abrir('#/clientes');
  $('[data-cliente-demo]').click();
  await hasta(() => $('#f_nombre'));
  t('demo: título, modalidad ONLINE y plan 1 MES preseleccionados', () => {
    assert.ok($('.modal-title').textContent.includes('Cliente demo'));
    assert.equal($('#f_modalidad').value, 'ONLINE'); assert.equal($('#f_plan').value, '1MES');
  });
  poner(w, $('#f_nombre'), 'prueba');
  $('[data-confirmar]').click();
  await hasta(() => escritos.length);
  t('demo: POST con es_demo true', () => assert.equal(escritos[0].body.es_demo, true));
}
{ // error al crear
  const { w, $ } = await abrir('#/clientes', { fallos: { 'clientes:POST': 'duplicado' } });
  $('[data-nuevo-cliente]').click();
  await hasta(() => $('#f_nombre'));
  poner(w, $('#f_nombre'), 'x');
  $('[data-confirmar]').click();
  await hasta(() => $('[data-error]').textContent.includes('duplicado'));
  t('error al crear: se dice en el modal y se puede reintentar', () => { assert.ok(!$('[data-confirmar]').disabled); assert.equal($('[data-confirmar]').textContent, 'Crear Cliente'); });
}
{ // editar desde la ficha
  const seg = [{ id: 's1', cliente_id: 1, fecha: iso(10), peso: 61, origen: 'nutricion' }];
  const escritos = [];
  const { w, $ } = await abrir('#/clientes/AAA1111/datos', { escritos, tablas: { seguimiento_corporal: (m, qs, b) => { if (m !== 'GET') escritos.push({ m, tabla: 'seguimiento_corporal', qs, body: b }); return m === 'POST' ? [{ id: 'sn', ...b }] : (m === 'GET' ? seg : []); } } });
  $('[data-accion-cabecera="editar"]').click();
  await hasta(() => $('#f_nombre'));
  t('editar: formulario con los datos del cliente y el peso actual del seguimiento', () => {
    assert.equal($('.modal-title').textContent, 'Editar cliente');
    assert.equal($('#f_nombre').value, 'Ana <b>'); assert.equal($('#f_modalidad').value, 'ONLINE'); assert.equal($('#f_plan').value, '1MES');
    assert.equal($('#f_peso_inicial').value, '61'); assert.equal($('#f_edad').value, '30');
    assert.ok(!$('#f_toma_cuello') && $('[data-confirmar]').textContent === 'Guardar Cambios');
  });
  poner(w, $('#f_edad'), '31'); poner(w, $('#f_peso_inicial'), '60.2');
  $('[data-confirmar]').click();
  await hasta(() => escritos.some(e => e.tabla === 'seguimiento_corporal') && !$('#f_nombre'));
  t('editar: PATCH por código conservando el peso inicial (ya hay pesos) y apuntando el peso nuevo como ficha_cliente', () => {
    const p = escritos.find(e => e.tabla === 'clientes').body;
    assert.equal(escritos.find(e => e.tabla === 'clientes').m, 'PATCH'); assert.ok(escritos.find(e => e.tabla === 'clientes').qs.includes('codigo=eq.AAA1111'));
    assert.equal(p.edad, 31); assert.equal(p.peso_inicial, 60); assert.equal(p.nombre, 'ANA <B>'); assert.equal(p.estado_cliente, 'ACTIVO');
    const s = escritos.find(e => e.tabla === 'seguimiento_corporal');
    assert.equal(s.m, 'POST'); assert.equal(s.body.peso, 60.2); assert.equal(s.body.origen, 'ficha_cliente'); assert.equal(s.body.fecha, iso(0)); assert.equal(s.body.cliente_id, 1);
  });
  t('editar: la cabecera de la ficha se repinta con el nombre nuevo', () => assert.ok($('.detail-name').textContent.includes('ANA <B>')));
}
{ // editar sin cambiar el peso: no toca seguimiento
  const seg = [{ id: 's1', cliente_id: 1, fecha: iso(10), peso: 61, origen: 'nutricion' }];
  const escritos = [];
  const { w, $ } = await abrir('#/clientes/AAA1111/datos', { escritos, tablas: { seguimiento_corporal: (m, qs, b) => { if (m !== 'GET') escritos.push({ m, tabla: 'seguimiento_corporal', qs, body: b }); return m === 'GET' ? seg : []; } } });
  $('[data-accion-cabecera="editar"]').click();
  await hasta(() => $('#f_nombre'));
  poner(w, $('#f_edad'), '33');
  $('[data-confirmar]').click();
  await hasta(() => escritos.some(e => e.tabla === 'clientes') && !$('#f_nombre'));
  t('editar sin cambiar el peso: no escribe en seguimiento corporal', () => assert.ok(!escritos.some(e => e.tabla === 'seguimiento_corporal')));
}
{ // mensaje
  const { w, $, $$, llamadas } = await abrir('#/clientes/AAA1111/datos', { funciones: { 'send-push': b => (b.mensaje.includes('falla') ? { __error: 'sin dispositivos' } : { enviados: 1 }) } });
  $('[data-accion-cabecera="mensaje"]').click();
  await hasta(() => $('#f_pushMensaje'));
  t('mensaje: frases rápidas según género (mujer) y texto de ayuda', () => {
    assert.equal($$('[data-frase]').length, msj.MOTIVACION_PUSH_FRASES.unisex.length + msj.MOTIVACION_PUSH_FRASES.mujer.length);
    assert.ok($('.modal-sub').textContent.includes('Ana <b> — AAA1111') && !$('.modal-sub b'));
  });
  $('[data-enviar]').click();
  t('mensaje vacío: avisa y no llama', () => { assert.ok($('[data-error]').textContent.includes('Escribe un mensaje')); assert.equal(llamadas.filter(l => l.tabla === 'fn:send-push').length, 0); });
  $('[data-frase="0"]').click();
  t('tocar una frase rellena el mensaje', () => assert.equal($('#f_pushMensaje').value, msj.MOTIVACION_PUSH_FRASES.unisex[0]));
  poner(w, $('#f_pushMensaje'), 'esto falla');
  $('[data-enviar]').click();
  await hasta(() => $('[data-error]').textContent.includes('sin dispositivos'));
  t('mensaje con error de la función: se enseña el motivo y el botón se reactiva', () => assert.ok(!$('[data-enviar]').disabled));
  poner(w, $('#f_pushMensaje'), 'Buen trabajo');
  $('[data-enviar]').click();
  await hasta(() => !$('#f_pushMensaje'));
  t('mensaje: llama a send-push con código, mensaje y título COACH', () => {
    const l = llamadas.filter(x => x.tabla === 'fn:send-push').pop();
    assert.deepEqual(l.body, { codigo: 'AAA1111', mensaje: 'Buen trabajo', titulo: 'COACH' });
  });
}
{ // resumen: el modal
  const { $ } = await abrir('#/clientes/AAA1111/datos');
  $('[data-accion-cabecera="resumen"]').click();
  await hasta(() => $('#f_resumenDias'));
  t('resumen: modal con periodos 30/60/90/etapa actual y nota', () => {
    assert.deepEqual([...$('#f_resumenDias').options].map(o => o.value), ['30', '60', '90', 'etapa']);
    assert.ok($('#f_notaResumen') && $('[data-generar]').textContent.includes('Generar PDF'));
  });
}

console.log(`\n${ok} comprobaciones OK`);
process.exit(0);
