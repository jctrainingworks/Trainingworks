import assert from 'node:assert/strict';
import { crearEntorno, hasta as hastaCrudo, invalidarDatos, importar } from './harness.mjs';
// Tras cumplirse la condición se deja un respiro para que la pantalla termine de repintarse.
const hasta = async f => { const r = await hastaCrudo(f); await new Promise(x => setTimeout(x, 40)); return r; };

let ok = 0; const t = (n, f) => { f(); ok++; console.log('✓', n); };
const iso = n => { const d = new Date(); d.setDate(d.getDate() - n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const desc = await importar('core/descarga.js');

t('descarga.js: etiquetas, descanso total y mensaje con {nombre}, {dias} y {fecha}', () => {
  assert.equal(desc.DESCARGA_LABELS.completa, 'Descanso total');
  const man = new Date(); man.setDate(man.getDate() + 2);
  const m = desc.descansoMensajeRender('Hola {nombre}: {dias} / {fecha}', 'ana lópez', iso(-2));
  assert.ok(m.startsWith('Hola Ana: 3 días / '));
  assert.equal(desc.descansoMensajeRender('x', '', null), 'x');
  assert.ok(desc.descansoMensajeRender(null, 'Eva', iso(-1)).startsWith('Te quedan 2 días sin entrenar'));
  assert.equal(desc.descansoDiasTexto(iso(0)), '1 día');
  assert.equal(desc.aplicarDescargaEjercicio({ series: '4' }, 'completa')._notaDescarga, 'DESCANSO TOTAL — no entrenar');
  assert.equal(desc.aplicarDescargaEjercicio({ series: '4', rir: '2' }, 'intensidad', true)._notaDescarga, 'Baja ~10-20% la velocidad o la inclinación (ppm en la zona baja)');
  assert.equal(desc.aplicarDescargaEjercicio({ series: '4' }, 'volumen').series, '3');
});

const base = { id: 1, codigo: 'AAA1111', nombre: 'Ana <b>', estado_cliente: 'ACTIVO', modalidad: 'ONLINE', plan: '1MES' };
async function abrir(cliente, { avisos = [], seguimiento = [], fallos = {}, funciones = {} } = {}) {
  await invalidarDatos();
  const escritos = [];
  const { w, llamadas } = crearEntorno({ clientes: [cliente], fallos, funciones,
    tablas: {
      avisos: (m, qs, body) => { if (m !== 'GET') escritos.push({ m, tabla: 'avisos', qs, body }); return m === 'POST' ? [{ id: 'av-nuevo', fecha: new Date().toISOString(), ...body }] : (m === 'GET' ? avisos : []); },
      seguimiento_corporal: seguimiento, mesociclos: [], etapas: [], rutinas: [], rm_estimaciones: []
    } });
  const { arrancar } = await importar('core/app.js');
  await arrancar();
  w.location.hash = '#/clientes/AAA1111/avisos';
  const $ = s => w.document.querySelector(s);
  await hasta(() => $('#avisoTexto'));
  const patches = () => llamadas.filter(l => l.tabla === 'clientes' && l.method === 'PATCH');
  return { w, $, $$: s => [...w.document.querySelectorAll(s)], llamadas, escritos, patches, pushes: () => llamadas.filter(l => l.tabla === 'fn:send-push').map(l => l.body), txt: () => w.document.body.textContent.replace(/\s+/g, ' ') };
}
const poner = (w, el, v, ev = 'input') => { el.value = v; el.dispatchEvent(new w.Event(ev, { bubbles: true })); };
const alertas = w => [...w.document.querySelectorAll('.alert, .toast, [data-alerta]')].map(x => x.textContent);

{
  const { $, $$, txt } = await abrir(base, { avisos: [{ id: 'a1', texto: 'Sube <i>peso', fecha: '2026-11-01T10:00:00Z', leido: false }, { id: 'a2', texto: 'Visto', fecha: '2026-10-20T10:00:00Z', leido: true }] });
  t('tarjetas en el mismo orden que prueba', () => {
    const titulos = $$('.nutri-card-title').map(x => x.textContent.replace(/\s+/g, ' ').trim());
    assert.deepEqual(titulos, ['📣 Publicar aviso', '🎯 Seguimiento', '✅ Check-in plus', '✅ Check-in simple (peso medio + cintura + preguntas, sin % graso)', '🔻 Descarga / 😴 Descanso total', '🥗 Nutrición', '🍽 Cuestionario de alimentos (qué NO come)', '🕐 Entrenamiento anterior', '💊 Suplementación', '🗂️ Historial de avisos Borrar historial']);
  });
  t('historial: texto escapado, leído / pendiente y botón de borrar', () => {
    assert.ok(txt().includes('Sube <i>peso') && !$('.nutri-row i'));
    assert.ok(txt().includes('🕓 Pendiente de abrir') && txt().includes('✅ Leído'));
    assert.equal($$('[data-borrar-aviso]').length, 2);
  });
  t('estados por defecto: suplementación activa, nutrición y entrenamiento anterior inactivos', () => {
    assert.ok(txt().includes('Activa: el cliente ve la sección de suplementos en la app.'));
    assert.ok(txt().includes('Inactiva: el cliente no ve la nutrición.') && txt().includes('Inactivo: el cliente solo ve su objetivo'));
    assert.ok(txt().includes('Inactiva: el cliente entrena con la rutina normal, sin ajustes.'));
  });
}
{ // publicar aviso
  const { w, $, $$, escritos, pushes, txt } = await abrir(base);
  $('[data-accion="publicar-aviso"]').click();
  t('publicar sin texto: no escribe ni envía', () => { assert.equal(escritos.length, 0); assert.equal(pushes().length, 0); });
  poner(w, $('#avisoTexto'), '  Esta semana sube el peso  ');
  $('[data-accion="publicar-aviso"]').click();
  await hasta(() => pushes().length);
  t('publicar: POST avisos con cliente_id y texto, vacía el cuadro y manda push "NUEVO AVISO"', () => {
    assert.deepEqual(escritos[0].body, { cliente_id: 1, texto: 'Esta semana sube el peso' });
    assert.deepEqual(pushes()[0], { codigo: 'AAA1111', mensaje: 'Esta semana sube el peso', titulo: 'NUEVO AVISO' });
    assert.equal($('#avisoTexto').value, '');
  });
}
{ // push falla
  const { w, $, escritos, pushes, txt } = await abrir(base, { funciones: { 'send-push': () => ({ __error: 'sin dispositivos' }) } });
  poner(w, $('#avisoTexto'), 'Hola');
  $('[data-accion="publicar-aviso"]').click();
  await hasta(() => pushes().length);
  await hasta(() => txt().includes('notificación push falló'));
  t('push fallido: el aviso queda publicado y se explica el fallo', () => { assert.equal(escritos.length, 1); assert.ok(txt().includes('sin dispositivos')); });
}
{ // borrar aviso e historial
  const { $, escritos } = await abrir(base, { avisos: [{ id: 'a1', texto: 'uno', fecha: '2026-11-01T10:00:00Z' }, { id: 'a2', texto: 'dos', fecha: '2026-11-02T10:00:00Z' }] });
  $('[data-borrar-aviso="a1"]').click();
  await hasta(() => escritos.length && !$('[data-borrar-aviso="a1"]'));
  t('borrar un aviso: DELETE por id', () => { assert.equal(escritos[0].m, 'DELETE'); assert.ok(escritos[0].qs.includes('id=eq.a1')); assert.ok(!$('[data-borrar-aviso="a1"]')); });
  $('[data-accion="borrar-historial"]').click();
  await hasta(() => $('[data-r="si"]'));
  $('[data-r="si"]').click();
  await hasta(() => escritos.length === 2 && !$('[data-borrar-aviso]'));
  t('borrar historial: confirma, DELETE de todos los del cliente y la lista queda vacía', () => {
    assert.ok(escritos[1].qs.includes('cliente_id=eq.1') && !escritos[1].qs.includes('id=eq.a'));
    assert.ok(document.body.textContent.includes('Aún no hay avisos publicados.') && !$('[data-accion="borrar-historial"]'));
  });
}
{ // interruptores y push de activación
  const { $, patches, pushes, llamadas, txt } = await abrir(base);
  $('[data-toggle="nutricion"]').click();
  await hasta(() => patches().length);
  t('nutrición: PATCH nutricion_activa true, sin push, y el texto cambia', () => {
    assert.deepEqual(patches()[0].body, { nutricion_activa: true }); assert.equal(pushes().length, 0);
    assert.ok(txt().includes('Activa: el cliente ya puede ver su plan de nutrición.') && $('[data-toggle="nutricion"]').textContent === 'Desactivar nutrición');
  });
  $('[data-toggle="suplementacion"]').click();
  await hasta(() => patches().some(p => 'suplementacion_activa' in p.body));
  t('suplementación (activa por defecto): al pulsar se desactiva, sin push', () => {
    assert.deepEqual(patches().find(p => 'suplementacion_activa' in p.body).body, { suplementacion_activa: false }); assert.equal(pushes().length, 0);
  });
  $('[data-toggle="suplementacion"]').click();
  await hasta(() => pushes().length);
  t('suplementación: al ACTIVAR manda el push fijo', () => assert.deepEqual(pushes()[0], { codigo: 'AAA1111', mensaje: 'Tu suplementación está actualizada 💊 Échale un vistazo en la app.', titulo: 'SUPLEMENTACIÓN' }));
  $('[data-toggle="cuestionario"]').click();
  await hasta(() => pushes().length === 2);
  t('cuestionario de alimentos: PATCH y push de NUTRICIÓN', () => {
    assert.ok(patches().some(p => p.body.cuestionario_alimentos_activo === true));
    assert.equal(pushes()[1].titulo, 'NUTRICIÓN');
  });
  $('[data-toggle="comparativa"]').click();
  await hasta(() => patches().some(p => 'comparativa_activa' in p.body));
  t('entrenamiento anterior: PATCH comparativa_activa true', () => assert.equal(patches().find(p => 'comparativa_activa' in p.body).body.comparativa_activa, true));
  $('[data-toggle="checkin"]').click();
  await hasta(() => pushes().length === 3);
  t('check-in plus: activa, anula recordatorio y cierre automáticos, cancela los abiertos del log y avisa', () => {
    assert.ok(patches().some(p => p.body.checkin_activo === true));
    assert.ok(patches().some(p => 'checkin_recordatorio_en' in p.body && p.body.checkin_cierre_en === null));
    const log = llamadas.find(l => l.tabla === 'checkin_log' && l.method === 'PATCH');
    assert.ok(log.qs.includes('cliente_id=eq.1') && log.qs.includes('resultado=is.null') && log.body.resultado === 'cancelado');
    assert.deepEqual(pushes()[2], { codigo: 'AAA1111', mensaje: 'Ya tienes disponible tu check-in semanal ✅ Puedes rellenarlo cuando quieras.', titulo: 'CHECK-IN' });
  });
  $('[data-toggle="checkin"]').click();
  await hasta(() => patches().filter(p => 'checkin_activo' in p.body).length === 2);
  t('desactivar el check-in: sin push nuevo', () => assert.equal(pushes().length, 3));
  $('[data-toggle="checkin_simple"]').click();
  await hasta(() => pushes().length === 4);
  t('check-in simple sin modo definido: mensaje "Es cortito"', () => assert.ok(pushes()[3].mensaje.endsWith('Es cortito: peso, cintura y unas preguntas.')));
}
{ // error de un interruptor
  const { $, txt } = await abrir(base, { fallos: { 'clientes:PATCH': 'RLS' } });
  $('[data-toggle="nutricion"]').click();
  await hasta(() => txt().includes('No se pudo cambiar la nutrición'));
  t('error al cambiar un interruptor: se dice y el botón sigue como estaba', () => assert.equal($('[data-toggle="nutricion"]').textContent, 'Activar nutrición'));
}
{ // programación del check-in
  const { w, $, patches } = await abrir(base);
  t('programación: por defecto manual, sin formulario ni botón', () => {
    assert.equal($('#cp-modo-plus').value, 'manual');
    assert.equal($('#cp-form-plus').style.display, 'none'); assert.equal($('#cp-btn-plus').style.display, 'none');
  });
  poner(w, $('#cp-modo-plus'), 'programado', 'change');
  t('elegir "Programado" enseña el formulario y el botón "Programar" sin guardar nada', () => {
    assert.equal($('#cp-form-plus').style.display, 'block'); assert.equal($('#cp-btn-plus').textContent, 'Programar'); assert.equal(patches().length, 0);
  });
  poner(w, $('#cp-hora-plus'), ''); $('#cp-btn-plus').click();
  t('hora inválida: no guarda', () => assert.equal(patches().length, 0));
  poner(w, $('#cp-dia-plus'), '3', 'change'); poner(w, $('#cp-hora-plus'), '09:30'); $('#cp-rep-plus').checked = true;
  $('#cp-btn-plus').click();
  await hasta(() => patches().length);
  t('programar: PATCH con tipo, día, hora, repetir y último envío a null', () => {
    assert.deepEqual(patches()[0].body, { checkin_prog_activo: true, checkin_prog_tipo: 'plus', checkin_prog_dia: 3, checkin_prog_hora: '09:30', checkin_prog_repetir: true, checkin_prog_ultimo_envio: null });
    assert.ok($('#cp-form-plus').closest('[data-cp]').textContent.includes('✅ Programado: miércoles a las 09:30 · cada semana'));
  });
  poner(w, $('#cp-modo-plus'), 'manual', 'change');
  t('volver a "Manual": el botón pasa a "Quitar programación"', () => assert.equal($('#cp-btn-plus').textContent, 'Quitar programación'));
  $('#cp-btn-plus').click();
  await hasta(() => patches().length === 2);
  t('quitar programación: PATCH checkin_prog_activo false', () => assert.deepEqual(patches()[1].body, { checkin_prog_activo: false }));
}
{ // modo de seguimiento y frecuencia
  const seg = [{ id: 's1', fecha: iso(20), peso: 70, cuello: 33 }, { id: 's2', fecha: iso(3), peso: 69 }];
  const { w, $, patches, txt } = await abrir({ ...base, frecuencia_seguimiento_semanas: 3 }, { seguimiento: seg });
  poner(w, $('[data-modo-seguimiento]'), 'perimetros', 'change');
  await hasta(() => patches().length);
  t('elegir modo de seguimiento: PATCH y aparece el bloque con la próxima fecha de perímetros', () => {
    assert.deepEqual(patches()[0].body, { seguimiento_modo: 'perimetros' });
    assert.ok(txt().includes('🎯 Seguimiento y check-in semanal') && txt().includes('Último seguimiento completo:') && txt().includes('le toca de nuevo el'));
    assert.ok(txt().includes('el cliente recibe el plus con perímetros y fotos'));
    assert.equal($('[data-frecuencia]').value, '3');
  });
  poner(w, $('[data-frecuencia]'), '4', 'change');
  await hasta(() => patches().length === 2);
  t('cambiar la frecuencia: PATCH con número', () => assert.deepEqual(patches()[1].body, { frecuencia_seguimiento_semanas: 4 }));
}
{ // sin seguimiento completo
  const { $, w, txt } = await abrir({ ...base, seguimiento_modo: 'cintura' });
  t('modo cintura sin perímetros: explica que solo las fotos dependen de la frecuencia y que aún no hay seguimiento', () => {
    assert.ok(txt().includes('Sin perímetros: solo las fotos se piden según la frecuencia.'));
    assert.ok(txt().includes('Aún no tiene seguimiento completo: el próximo check-in lo pedirá.'));
  });
}
{ // descarga / descanso total
  const { w, $, patches, txt } = await abrir({ ...base, nombre: 'Ana López' });
  t('descarga inactiva: tipo volumen, 7 días y botón "Activar descarga"', () => {
    assert.equal($('#descargaTipoInput').value, 'volumen'); assert.equal($('#descargaDiasInput').value, '7');
    assert.equal($('[data-accion="activar-descarga"]').textContent, 'Activar descarga'); assert.ok(!$('#descansoMsgInput'));
  });
  poner(w, $('#descargaDiasInput'), '3'); poner(w, $('#descargaDiasInput'), '3', 'change');
  poner(w, $('#descargaTipoInput'), 'completa', 'change');
  t('descanso total: aparece el mensaje fijo editable, con vista previa y los 3 días elegidos', () => {
    assert.equal($('#descargaDiasInput').value, '3');
    assert.ok($('#descansoMsgInput').value === desc.DESCANSO_MSG_DEFAULT);
    assert.ok($('#descansoPreview').textContent.startsWith('Te quedan 3 días sin entrenar'));
    assert.equal($('[data-accion="activar-descarga"]').textContent, 'Activar descanso total');
  });
  poner(w, $('#descansoMsgInput'), 'Descansa {nombre}, vuelves {fecha}');
  t('editar el mensaje actualiza la vista previa al momento', () => assert.ok($('#descansoPreview').textContent.startsWith('Descansa Ana, vuelves ')));
  $('[data-accion="restaurar-mensaje"]').click();
  t('"Restaurar mensaje fijo" vuelve al texto de serie', () => assert.equal($('#descansoMsgInput').value, desc.DESCANSO_MSG_DEFAULT));
  poner(w, $('#descansoMsgInput'), 'Mi mensaje');
  $('[data-accion="activar-descarga"]').click();
  await hasta(() => patches().length);
  t('activar descanso total 3 días: fin = hoy + 2, mensaje propio guardado', () => {
    const b = patches()[0].body;
    assert.deepEqual([b.modo_descarga, b.tipo_descarga, b.descarga_fin, b.mensaje_descanso], [true, 'completa', iso(-2), 'Mi mensaje']);
  });
  t('descanso total activo: texto de estado, mensaje EDITADO, botón para terminar y banner de la ficha', () => {
    assert.ok(txt().includes('Activa: Descanso total') && txt().includes('El cliente NO puede entrar a Entrenamiento'));
    assert.ok(txt().includes('Mensaje que ve el cliente (EDITADO)'));
    assert.equal($('[data-accion="desactivar-descarga"]').textContent, 'Terminar descanso total');
    assert.ok($('[data-banner-descarga]').textContent.includes('😴 EN DESCANSO TOTAL') && $('[data-banner-descarga]').textContent.includes('Terminar ahora'));
  });
  poner(w, $('#descansoMsgInput'), '   ');
  $('[data-accion="guardar-mensaje"]').click();
  await hasta(() => patches().length === 2);
  t('guardar un mensaje vacío o igual al de serie vuelve al mensaje fijo (null)', () => assert.deepEqual(patches()[1].body, { mensaje_descanso: null }));
  $('[data-accion="desactivar-descarga"]').click();
  await hasta(() => patches().length === 3);
  t('terminar descanso total: PATCH modo_descarga false y desaparece el banner', () => {
    assert.deepEqual(patches()[2].body, { modo_descarga: false });
    assert.ok(!$('[data-banner-descarga]').textContent.includes('DESCANSO'));
    assert.equal($('#descargaTipoInput').value, 'completa'); // la selección se mantiene, como en prueba
  });
}
{ // descarga de volumen: sin mensaje y fin = hoy + días
  const { w, $, patches, txt } = await abrir(base);
  poner(w, $('#descargaDiasInput'), '5', 'change');
  $('[data-accion="activar-descarga"]').click();
  await hasta(() => patches().length);
  t('descarga de volumen 5 días: fin = hoy + 5 y sin mensaje', () => {
    const b = patches()[0].body;
    assert.deepEqual(Object.keys(b).sort(), ['descarga_fin', 'modo_descarga', 'tipo_descarga']);
    assert.equal(b.descarga_fin, iso(-5)); assert.equal(b.tipo_descarga, 'volumen');
    assert.ok(txt().includes('Activa: Reducción de volumen') && txt().includes('El cliente ya ve la rutina y TrackLift ajustados.'));
    assert.ok($('[data-banner-descarga]').textContent.includes('🔻 EN DESCARGA — Reducción de volumen'));
  });
}

console.log(`\n${ok} comprobaciones OK`);
process.exit(0);
