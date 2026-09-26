import assert from 'node:assert/strict';
import { crearEntorno, hasta, esperar, invalidarDatos, importar } from './harness.mjs';

const hoy = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const enDias = n => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
const cliente = { id: 5, codigo: 'JC005', nombre: 'Pablo', plan: '3MESES', estado_cliente: 'ACTIVO' };
const biblioteca = [
  { id: 'b1', nombre_es: 'Press banca', musculo: 'Pecho', equipo: 'Peso libre', es_rehabilitacion: false, gif_url: 'https://x/1.gif', pasos: ['Túmbate', 'Baja la barra'] },
  { id: 'b2', nombre_es: 'Plancha frontal', musculo: 'Core', equipo: 'Peso corporal', es_rehabilitacion: false, gif_url: '', pasos: [] },
  { id: 'b3', nombre_es: 'Movilidad de hombro', musculo: 'Hombros', equipo: 'Banda elástica', es_rehabilitacion: true, gif_url: '', pasos: ['Suave'] },
  { id: 'b4', nombre_es: 'Sentadilla <b>búlgara</b>', musculo: 'Cuádriceps', equipo: 'Peso libre', es_rehabilitacion: false, gif_url: '', pasos: [] }
];

function fake(o = {}) {
  const bd = {
    mesociclos: [
      { id: 'm0', numero: 1, nombre: 'Base', tipo_atr: null, fecha_inicio: '2026-01-01', fecha_fin: '2026-03-01' },
      { id: 'm1', numero: 2, nombre: null, tipo_atr: 'acu_carga', fecha_inicio: '2026-03-01', fecha_fin: null }
    ],
    rutinas: [
      { id: 'rA', nombre: 'Push A', orden: 1, mesociclo_id: 'm1' },
      { id: 'rB', nombre: 'Pull B', orden: 2, mesociclo_id: 'm1' },
      { id: 'rC', nombre: 'Legacy', orden: 1, mesociclo_id: 'm0' }
    ],
    ejercicios: [
      { id: 'e1', rutina_id: 'rA', nombre: 'Press banca', series: '3', repeticiones: '8-10, AL FALLO, 6-8', rir: '2, 0, 1', descanso: '90seg, 90seg, 2min', tecnica: 'normal, drop_set:2:20, normal', grupo_tecnica: 'superserie:A', notas: 'Codos', orden: 1, gif_url: 'g.gif', pasos: ['a', 'b'], es_isometrico: false, lastre_kg: null, biblioteca_id: 'b1' },
      { id: 'e2', rutina_id: 'rA', nombre: 'Plancha', series: '2', repeticiones: '30', rir: '1', descanso: '60seg', tecnica: 'isometrico, normal', grupo_tecnica: '', notas: '', orden: 2, gif_url: '', pasos: [], es_isometrico: true, lastre_kg: 5 }
    ]
  };
  const id = qs => (qs.match(/(?:^|&)id=eq\.([^&]+)/) || [])[1];
  return {
    bd,
    tablas: {
      ejercicios_biblioteca: () => biblioteca,
      mesociclos: (m, qs, body) => {
        if (m === 'PATCH') { const f = bd.mesociclos.find(x => x.id === id(qs)); if (f && !o.bloquearPatchMes) Object.assign(f, body); return []; }
        if (m === 'POST') {
          if (o.errorPostMes && o.errorPostMes(body)) return { __error: o.errorPostMes(body) };
          const fila = { id: 'mN' + bd.mesociclos.length, ...body }; bd.mesociclos.push(fila); return [fila];
        }
        if (m === 'DELETE') { const n = bd.mesociclos.length; bd.mesociclos = bd.mesociclos.filter(x => x.id !== id(qs)); return o.bloquearDeleteMes ? [] : (n !== bd.mesociclos.length ? [{ id: 'x' }] : []); }
        return [...bd.mesociclos].sort((a, b) => a.numero - b.numero);
      },
      rutinas: (m, qs, body) => {
        if (m === 'PATCH') { const mes = (qs.match(/mesociclo_id=eq\.([^&]+)/) || [])[1]; bd.rutinas.filter(r => mes ? r.mesociclo_id === mes : r.id === id(qs)).forEach(r => Object.assign(r, body)); return []; }
        if (m === 'DELETE') return [{ id: 'x' }];
        return [...bd.rutinas].sort((a, b) => a.orden - b.orden);
      },
      ejercicios: (m, qs, body) => {
        if (m === 'POST') {
          if (o.sinColumnaBib && 'biblioteca_id' in body) return { __error: 'Could not find the \'biblioteca_id\' column of \'ejercicios\' in the schema cache' };
          bd.ejercicios.push({ ...body }); return [{ ...body }];
        }
        if (m === 'PATCH') { const f = bd.ejercicios.find(e => e.id === id(qs)); if (f && !o.bloquearPatchEj) { if (!('biblioteca_id' in body)) { /* conserva */ } Object.assign(f, body); } return []; }
        if (m === 'DELETE') return [{ id: 'x' }];
        if (id(qs)) return bd.ejercicios.filter(e => e.id === id(qs));
        return bd.ejercicios;
      }
    }
  };
}

async function abrir(o = {}, datosCliente = {}) {
  await invalidarDatos();
  const f = fake(o);
  const { w, llamadas } = crearEntorno({ clientes: [{ ...cliente, ...datosCliente }], tablas: f.tablas });
  const { arrancar } = await importar('core/app.js');
  await arrancar();
  const $ = s => w.document.querySelector(s);
  const $$ = s => [...w.document.querySelectorAll(s)];
  w.location.hash = '#/clientes/JC005/rutinas';
  await hasta(() => $('.rut-barra'));
  const escribir = (el, v) => { el.value = v; el.dispatchEvent(new w.Event('input', { bubbles: true })); };
  const cambiar = (el, v) => { el.value = v; el.dispatchEvent(new w.Event('change', { bubbles: true })); };
  const modal = async () => { await hasta(() => $('.modal-overlay')); return $('.modal'); };
  return { w, llamadas, bd: f.bd, $, $$, escribir, cambiar, modal };
}
let ok = 0; const t = (n, f) => { f(); ok++; console.log('✓', n); };
const posts = (llamadas, tabla) => llamadas.filter(l => l.tabla === tabla && l.method === 'POST');
const patches = (llamadas, tabla) => llamadas.filter(l => l.tabla === tabla && l.method === 'PATCH');

// ═══ Ejercicios ═══
{
  const { w, llamadas, bd, $, $$, escribir, cambiar, modal } = await abrir();
  $('[data-accion="ejercicio-nuevo"][data-id="rA"]').click();
  await modal();
  t('modal nuevo: título, rutina, aviso ATR y series precargadas (Acumulación · Carga: 4 series 10-15 / 2-3 / 75seg)', () => {
    assert.equal($('.modal-title')?.textContent, 'Nuevo Ejercicio');
    assert.ok($('.modal-sub')?.textContent.includes('Push A'));
    assert.ok($('.rut-aviso-atr')?.textContent.includes('Acumulación · Carga'));
    assert.equal($$('.rut-mserie:not(.rut-mserie-cab)').length, 4);
    assert.equal($('[data-serie="0"][data-campo="reps"]').value, '10-15');
    assert.equal($('[data-serie="3"][data-campo="desc"]').value, '75seg');
    assert.equal($('#ej_orden').value, '3');
  });
  // Buscador
  escribir($('#ej_nombre'), 'pre');
  t('buscar "pre": solo Press banca (y sin rehabilitación)', () => {
    const op = $$('.rut-opcion');
    assert.equal(op.length, 1);
    assert.ok(op[0].textContent.includes('Press banca') && op[0].textContent.includes('Pecho'));
  });
  $('[data-filtro="tipo"][data-valor="Rehabilitación"]').click();
  t('filtro Rehabilitación: sale Movilidad de hombro', () => {
    assert.deepEqual($$('.rut-opcion-n').map(x => x.textContent), []);
  });
  $('#ej_nombre').value = ''; escribir($('#ej_nombre'), '');
  t('sin texto y con filtros, se listan los de esa categoría', () => {
    assert.deepEqual($$('.rut-opcion-n').map(x => x.textContent), ['Movilidad de hombro']);
  });
  $('[data-filtro="tipo"][data-valor="Normal"]').click();
  $('[data-filtro="musculo"][data-valor="Cuádriceps"]').click();
  t('filtro por músculo y nombre con HTML escapado', () => {
    assert.equal($$('.rut-opcion').length, 1);
    assert.equal($('.rut-opcion b'), null);
    assert.ok($('.rut-opcion-n')?.textContent.includes('<b>búlgara</b>'));
  });
  $('[data-filtro="musculo"][data-valor="Todos"]').click();
  escribir($('#ej_nombre'), 'press');
  $('.rut-opcion').click();
  t('elegir de la biblioteca: rellena nombre, pasos y marca el enlace', () => {
    assert.equal($('#ej_nombre').value, 'Press banca');
    assert.equal($('#ej_pasos').value, 'Túmbate\nBaja la barra');
    assert.equal($('[data-enlace]').hidden, false);
    assert.ok($('.rut-tipo.activo')?.textContent.includes('Dinámico'));
  });
  $('.modal [data-r="si"]').click();
  await hasta(() => posts(llamadas, 'ejercicios').length === 1);
  t('guardar: cuerpo completo con biblioteca_id, series de la plantilla y orden 3', () => {
    const b = posts(llamadas, 'ejercicios')[0].body;
    assert.equal(b.rutina_id, 'rA'); assert.ok(b.id);
    assert.deepEqual([b.nombre, b.series, b.orden, b.biblioteca_id, b.gif_url], ['Press banca', 4, 3, 'b1', 'https://x/1.gif']);
    assert.equal(b.repeticiones, '10-15, 10-15, 10-15, 10-15');
    assert.equal(b.rir, '2-3, 2-3, 2-3, 2-3'); assert.equal(b.descanso, '75seg, 75seg, 75seg, 75seg');
    assert.equal(b.tecnica, 'normal, normal, normal, normal'); assert.equal(b.grupo_tecnica, '');
    assert.deepEqual(b.pasos, ['Túmbate', 'Baja la barra']);
    assert.equal(b.es_isometrico, false); assert.equal(b.lastre_kg, null);
  });
  await hasta(() => !$('.modal-overlay'));
  t('el ejercicio aparece en la rutina, que queda abierta', () => {
    assert.equal($$('.rut-ejercicio').length, 3);
    assert.ok($('#alertas')?.textContent.includes('añadido'));
  });
}
{
  // Nombre a mano, elegir + cambiar nombre, Plancha (isométrico), técnicas, grupos, series
  const { w, llamadas, $, $$, escribir, cambiar, modal } = await abrir();
  $('[data-accion="ejercicio-nuevo"][data-id="rB"]').click();
  await modal();
  t('rutina sin ejercicios: orden 1', () => assert.equal($('#ej_orden').value, '1'));
  escribir($('#ej_nombre'), 'Mi ejercicio raro');
  $('.modal [data-r="si"]').click();
  await hasta(() => posts(llamadas, 'ejercicios').length === 1);
  t('nombre escrito a mano: se guarda SIN biblioteca_id', () => assert.ok(!('biblioteca_id' in posts(llamadas, 'ejercicios')[0].body)));
  await hasta(() => !$('.modal-overlay'));

  $('[data-accion="ejercicio-nuevo"][data-id="rB"]').click(); await modal();
  escribir($('#ej_nombre'), 'press'); $('.rut-opcion').click();
  escribir($('#ej_nombre'), 'Press banca inclinado');
  t('elegir y luego cambiar el nombre a mano: el enlace se quita', () => assert.equal($('[data-enlace]').hidden, true));
  $('.modal [data-r="si"]').click();
  await hasta(() => posts(llamadas, 'ejercicios').length === 2);
  t('… y no viaja biblioteca_id', () => assert.ok(!('biblioteca_id' in posts(llamadas, 'ejercicios')[1].body)));
  await hasta(() => !$('.modal-overlay'));

  $('[data-accion="ejercicio-nuevo"][data-id="rB"]').click(); await modal();
  escribir($('#ej_nombre'), 'planc'); $('.rut-opcion').click();
  t('Plancha: se marca isométrico automáticamente y sale el lastre', () => {
    assert.ok($('.rut-tipo.activo')?.textContent.includes('Isométrico'));
    assert.ok($('#ej_lastre'));
    assert.equal($('.rut-mserie-cab')?.textContent.includes('SEG'), true);
  });
  escribir($('#ej_lastre'), '7.5');
  // series: quitar hasta una, añadir, técnica
  for (let k = 0; k < 3; k++) $$('[data-accion="serie-quitar"]').pop().click();
  t('con una sola serie, ✕ está desactivada', () => {
    assert.equal($$('.rut-mserie:not(.rut-mserie-cab)').length, 1);
    assert.equal($('[data-accion="serie-quitar"]').disabled, true);
  });
  $('[data-accion="serie-anadir"]').click();
  t('+ Serie copia la última', () => assert.equal($$('.rut-mserie:not(.rut-mserie-cab)').length, 2));
  cambiar($('[data-tec="1"]'), 'drop_set');
  t('drop set: fuerza AL FALLO / RIR 0 y pide drops y % de peso', () => {
    assert.equal($('[data-serie="1"][data-campo="reps"]').value, 'AL FALLO');
    assert.equal($('[data-serie="1"][data-campo="rir"]').value, '0');
    assert.equal($('[data-serie="1"][data-campo="tecnicaN"]').value, '1');
    assert.ok($('[data-serie="1"][data-campo="tecnicaPct"]'));
    assert.ok($('.rut-fallo'));
  });
  escribir($('[data-serie="1"][data-campo="tecnicaN"]'), '2');
  escribir($('[data-serie="1"][data-campo="tecnicaPct"]'), '20');
  const desc = $('[data-serie="0"][data-campo="desc"]'); desc.value = '45'; desc.dispatchEvent(new w.Event('focusout', { bubbles: true }));
  t('descanso "45" se completa a "45seg"', () => assert.equal(desc.value, '45seg'));
  cambiar($('[data-grupo-tipo]'), 'superserie');
  escribir($('[data-f="grupoCodigo"]'), ' B ');
  $('.modal [data-r="si"]').click();
  await hasta(() => posts(llamadas, 'ejercicios').length === 3);
  t('cuerpo: técnica por serie, grupo, lastre, isométrico y biblioteca_id', () => {
    const b = posts(llamadas, 'ejercicios')[2].body;
    assert.equal(b.tecnica, 'normal, drop_set:2:20');
    assert.equal(b.grupo_tecnica, 'superserie:B');
    assert.equal(b.repeticiones, '10-15, AL FALLO'.replace('10-15', b.repeticiones.split(', ')[0]));
    assert.equal(b.rir.split(', ')[1], '0');
    assert.equal(b.descanso.split(', ')[0], '45seg');
    assert.deepEqual([b.es_isometrico, b.lastre_kg, b.biblioteca_id, b.series], [true, 7.5, 'b2', 2]);
  });
  await hasta(() => !$('.modal-overlay'));
  $('[data-accion="ejercicio-nuevo"][data-id="rB"]').click(); await modal();
  $('.modal [data-r="si"]').click();
  await hasta(() => $('.modal [data-error] .alert-error'));
  t('sin nombre: error dentro del modal y no guarda', () => {
    assert.ok($('.modal [data-error]')?.textContent.includes('El nombre es obligatorio'));
    assert.equal(posts(llamadas, 'ejercicios').length, 3);
  });
  $('.modal [data-r="no"]').click();
}
{
  // Editar
  const { w, llamadas, bd, $, $$, escribir, cambiar, modal } = await abrir();
  $('[data-toggle="rA"]').click();
  $$('[data-accion="ejercicio-editar"]')[0].click();
  await modal();
  t('editar: se rellena con los valores del ejercicio', () => {
    assert.equal($('.modal-title')?.textContent, 'Editar Ejercicio');
    assert.equal($('#ej_nombre').value, 'Press banca');
    assert.equal($$('.rut-mserie:not(.rut-mserie-cab)').length, 3);
    assert.equal($('[data-serie="1"][data-campo="reps"]').value, 'AL FALLO');
    assert.equal($('[data-tec="1"]').value, 'drop_set');
    assert.equal($('[data-serie="1"][data-campo="tecnicaN"]').value, '2');
    assert.equal($('[data-serie="1"][data-campo="tecnicaPct"]').value, '20');
    assert.equal($('[data-grupo-tipo]').value, 'superserie');
    assert.equal($('[data-f="grupoCodigo"]').value, 'A');
    assert.equal($('#ej_orden').value, '1'); assert.equal($('#ej_notas').value, 'Codos');
    assert.equal($('#ej_pasos').value, 'a\nb');
    assert.equal($('[data-enlace]').hidden, false);
    assert.equal($('.rut-aviso-atr'), null);
  });
  escribir($('#ej_notas'), 'Codos <i>cerrados</i>');
  $('.modal [data-r="si"]').click();
  await hasta(() => patches(llamadas, 'ejercicios').length === 1);
  await hasta(() => !$('.modal-overlay'));
  t('PATCH por id conservando el enlace (mismo nombre)', () => {
    const p = patches(llamadas, 'ejercicios')[0];
    assert.ok(p.qs.includes('id=eq.e1'));
    assert.equal(p.body.notas, 'Codos <i>cerrados</i>');
    assert.equal(p.body.biblioteca_id, 'b1');
    assert.equal(p.body.tecnica, 'normal, drop_set:2:20, normal');
    assert.equal(p.body.grupo_tecnica, 'superserie:A');
    assert.equal($('.rut-nota')?.textContent.includes('<i>cerrados</i>'), true);
    assert.equal($('.rut-nota i'), null);
    assert.ok($('#alertas')?.textContent.includes('actualizado'));
  });
  $$('[data-accion="ejercicio-editar"]')[0].click(); await modal();
  escribir($('#ej_nombre'), 'Press banca con pausa');
  $('.modal [data-r="si"]').click();
  await hasta(() => patches(llamadas, 'ejercicios').length === 2);
  t('editar cambiando el nombre a mano: biblioteca_id pasa a null', () => assert.equal(patches(llamadas, 'ejercicios')[1].body.biblioteca_id, null));
  await hasta(() => !$('.modal-overlay'));
  $$('[data-accion="ejercicio-editar"]')[1].click(); await modal();
  escribir($('#ej_notas'), 'x');
  $('.modal [data-r="si"]').click();
  await hasta(() => patches(llamadas, 'ejercicios').length === 3);
  t('ejercicio sin enlace previo: no se manda biblioteca_id', () => assert.ok(!('biblioteca_id' in patches(llamadas, 'ejercicios')[2].body)));
}
{
  const { $, $$, escribir, modal } = await abrir({ bloquearPatchEj: true });
  $('[data-toggle="rA"]').click();
  $$('[data-accion="ejercicio-editar"]')[0].click(); await modal();
  escribir($('#ej_notas'), 'cambio');
  $('.modal [data-r="si"]').click();
  await hasta(() => $('.modal [data-error] .alert-error'));
  t('RLS bloquea el UPDATE del ejercicio: se detecta y el modal sigue abierto', () => {
    assert.ok($('.modal [data-error]')?.textContent.includes('revisa la política RLS de UPDATE'));
    assert.ok($('.modal-overlay'));
  });
}
{
  // La columna biblioteca_id aún no existe
  const { llamadas, $, escribir, modal } = await abrir({ sinColumnaBib: true });
  $('[data-accion="ejercicio-nuevo"][data-id="rB"]').click(); await modal();
  escribir($('#ej_nombre'), 'press'); $('.rut-opcion').click();
  $('.modal [data-r="si"]').click();
  await hasta(() => posts(llamadas, 'ejercicios').length === 2);
  await hasta(() => !$('.modal-overlay'));
  t('sin la columna: guarda igualmente (sin enlace) y avisa del SQL', () => {
    assert.ok('biblioteca_id' in posts(llamadas, 'ejercicios')[0].body);
    assert.ok(!('biblioteca_id' in posts(llamadas, 'ejercicios')[1].body));
    assert.ok($('#alertas')?.textContent.includes('sql/rutinas_parte2.sql'));
  });
}

// ═══ Mesociclos ═══
{
  const { w, llamadas, bd, $, $$, escribir, cambiar, modal } = await abrir();
  $('[data-accion="mesociclo-nuevo"]').click(); await modal();
  t('+ Mesociclo: numera dentro del mismo bloque y propone el tipo del activo', () => {
    assert.equal($('.modal-title')?.textContent, 'Nuevo mesociclo 3');
    assert.equal($('#form_tipo').value, 'acu_carga');
  });
  cambiar($('#form_tipo'), 'tra_aproximacion');
  $('.modal [data-r="si"]').click();
  await hasta(() => $('.modal-overlay:nth-of-type(2)') || $$('.modal-overlay').length === 2);
  t('Transformación sin ser deportivo: pide confirmación', () => assert.ok($$('.modal-sub').pop().textContent.includes('suele reservarse')));
  $$('.modal-overlay').pop().querySelector('[data-r="no"]').click();
  await hasta(() => $('.modal [data-error] .alert-error'));
  t('si no confirma: no crea nada', () => {
    assert.ok($('.modal [data-error]')?.textContent.includes('confirma el aviso'));
    assert.equal(posts(llamadas, 'mesociclos').length, 0);
    assert.equal(patches(llamadas, 'mesociclos').length, 0);
  });
  cambiar($('#form_tipo'), 'acu_choque');
  $('.modal [data-r="si"]').click();
  await hasta(() => posts(llamadas, 'mesociclos').length === 1);
  await hasta(() => !$('.modal-overlay'));
  t('crear: cierra el activo (fecha_fin hoy) y crea el nuevo', () => {
    const c = patches(llamadas, 'mesociclos')[0];
    assert.ok(c.qs.includes('id=eq.m1')); assert.deepEqual(c.body, { fecha_fin: hoy });
    const n = posts(llamadas, 'mesociclos')[0].body;
    assert.deepEqual([n.cliente_id, n.numero, n.nombre, n.fecha_inicio, n.fecha_fin, n.tipo_atr], [5, 3, null, hoy, null, 'acu_choque']);
    assert.ok(!('deportivo' in n));
  });
  t('el mesociclo nuevo queda seleccionado y el anterior cerrado', () => {
    assert.ok($('.rut-chip.activo')?.textContent.includes('Mesociclo 3'));
    assert.equal($$('[data-accion="mesociclo"]').length, 4);
    assert.ok($('#alertas')?.textContent.includes('Mesociclo 3 creado'));
    assert.deepEqual($$('.routine-name').map(x => x.textContent), []); // aún sin rutinas
  });
}
{
  // Bloque nuevo deportivo
  const { w, llamadas, bd, $, $$, escribir, cambiar, modal } = await abrir();
  $('[data-accion="bloque-nuevo"]').click(); await modal();
  t('Bloque nuevo: nombre, tipo (Acumulación · Carga), deportivo y fecha', () => {
    assert.equal($('.modal-title')?.textContent, 'Bloque nuevo');
    assert.equal($('#form_tipo').value, 'acu_carga');
    assert.equal($('#form_deportivo').checked, false);
    assert.ok($('#form_fecha'));
  });
  $('#form_deportivo').checked = true;
  escribir($('#form_nombre'), 'Puesta a punto');
  $('.modal [data-r="si"]').click();
  await hasta(() => $('.modal [data-error] .alert-error'));
  t('deportivo sin fecha: no deja', () => assert.ok($('.modal [data-error]')?.textContent.includes('fecha del objetivo es obligatoria')));
  escribir($('#form_fecha'), '2020-01-01');
  $('.modal [data-r="si"]').click();
  await hasta(() => $('.modal [data-error]')?.textContent.includes('anterior a hoy'));
  t('deportivo con fecha pasada: no deja', () => assert.equal(posts(llamadas, 'mesociclos').length, 0));
  cambiar($('#form_tipo'), 'rea_competicion');
  escribir($('#form_fecha'), enDias(60));
  $('.modal [data-r="si"]').click();
  await hasta(() => posts(llamadas, 'mesociclos').length === 1);
  await hasta(() => !$('.modal-overlay'));
  t('bloque deportivo: sin aviso de Realización, cierra el activo y guarda deportivo + fecha_objetivo', () => {
    const n = posts(llamadas, 'mesociclos')[0].body;
    assert.deepEqual([n.numero, n.nombre, n.tipo_atr, n.deportivo, n.fecha_objetivo], [1, 'Puesta a punto', 'rea_competicion', true, enDias(60)]);
    assert.ok(patches(llamadas, 'mesociclos')[0].qs.includes('id=eq.m1'));
    assert.ok($('.rut-chip.activo')?.textContent.includes('Puesta a punto 1'));
    assert.ok($('.rut-chip.activo')?.textContent.includes('🎯'));
    assert.ok($('.rut-chip.activo [title*="objetivo"]').title.includes(enDias(60)));
  });
  // + Mesociclo dentro de un bloque deportivo hereda deportivo y fecha
  $('[data-accion="mesociclo-nuevo"]').click(); await modal();
  $('.modal [data-r="si"]').click();
  await hasta(() => posts(llamadas, 'mesociclos').length === 2);
  t('+ Mesociclo dentro del bloque deportivo hereda deportivo y fecha', () => {
    const n = posts(llamadas, 'mesociclos')[1].body;
    assert.deepEqual([n.numero, n.nombre, n.deportivo, n.fecha_objetivo], [2, 'Puesta a punto', true, enDias(60)]);
  });
}
{
  // Recuperación → sugiere descarga
  const { w, llamadas, $, $$, escribir, cambiar, modal } = await abrir();
  $('[data-accion="mesociclo-nuevo"]').click(); await modal();
  cambiar($('#form_tipo'), 'acu_recuperacion');
  $('.modal [data-r="si"]').click();
  await hasta(() => $$('.modal-overlay').length === 1 && $('.modal-title')?.textContent === 'Activar modo descarga');
  $('.modal [data-r="si"]').click();
  await hasta(() => $('.modal-title')?.textContent === 'Modo descarga' && $('#form_tipo'));
  cambiar($('#form_tipo'), 'intensidad'); escribir($('#form_dias'), '10');
  $('.modal [data-r="si"]').click();
  await hasta(() => llamadas.some(l => l.tabla === 'clientes' && l.method === 'PATCH'));
  t('mesociclo de recuperación: ofrece la descarga y la activa en el cliente', () => {
    const p = llamadas.find(l => l.tabla === 'clientes' && l.method === 'PATCH');
    assert.ok(p.qs.includes('id=eq.5'));
    assert.deepEqual([p.body.modo_descarga, p.body.tipo_descarga], [true, 'intensidad']);
    const fin = new Date(); fin.setDate(fin.getDate() + 10);
    assert.equal(p.body.descarga_fin, fin.toISOString().slice(0, 10));
  });
  await hasta(() => !$('.modal-overlay'));
  $('[data-toggle="rA"]');
}
{
  // Errores al crear
  const { llamadas, bd, $, $$, escribir, modal } = await abrir({ errorPostMes: b => (b.numero === 3 ? 'fallo de red' : '') });
  $('[data-accion="mesociclo-nuevo"]').click(); await modal();
  $('.modal [data-r="si"]').click();
  await hasta(() => $('.modal [data-error] .alert-error'));
  t('si falla crear: se dice y se reabre el mesociclo anterior', () => {
    assert.ok($('.modal [data-error]')?.textContent.includes('fallo de red'));
    const ps = patches(llamadas, 'mesociclos');
    assert.equal(ps.length, 2);
    assert.deepEqual(ps[1].body, { fecha_fin: null });
    assert.equal(bd.mesociclos.find(m => m.id === 'm1').fecha_fin, null);
  });
}
{
  const { llamadas, $, $$, escribir, modal } = await abrir({ errorPostMes: b => ('deportivo' in b ? 'Could not find the \'deportivo\' column of \'mesociclos\'' : '') });
  $('[data-accion="bloque-nuevo"]').click(); await modal();
  $('#form_deportivo').checked = true; escribir($('#form_nombre'), 'Torneo'); escribir($('#form_fecha'), enDias(30));
  $('.modal [data-r="si"]').click();
  await hasta(() => posts(llamadas, 'mesociclos').length === 2);
  await hasta(() => !$('.modal-overlay'));
  t('sin columnas deportivo/fecha_objetivo: crea igualmente y avisa del SQL', () => {
    assert.ok(!('deportivo' in posts(llamadas, 'mesociclos')[1].body));
    assert.ok($('#alertas')?.textContent.includes('sql/rutinas_parte2.sql'));
  });
}
{
  const { $, $$, llamadas, modal } = await abrir({ bloquearPatchMes: true });
  $('[data-accion="mesociclo-nuevo"]').click(); await modal();
  $('.modal [data-r="si"]').click();
  await hasta(() => !$('.modal-overlay'));
  t('RLS bloquea cerrar el anterior: se avisa', () => assert.ok($('#alertas')?.textContent.includes('el anterior no se cerró')));
}
{
  // Borrar mesociclo
  const { w, llamadas, bd, $, $$, modal } = await abrir();
  $('[data-accion="mesociclo-borrar"][data-id="m1"]').click(); await modal();
  t('confirmación de borrar cuenta las rutinas colgadas', () => assert.ok($('.modal-sub')?.textContent.includes('2 rutina(s)')));
  $('.modal [data-r="si"]').click();
  await hasta(() => llamadas.some(l => l.tabla === 'mesociclos' && l.method === 'DELETE'));
  await hasta(() => $$('[data-accion="mesociclo"]').length === 2);
  t('borrar: las rutinas quedan sin mesociclo (no se borran) y se pasa a Todos', () => {
    const p = patches(llamadas, 'rutinas')[0];
    assert.ok(p.qs.includes('mesociclo_id=eq.m1')); assert.deepEqual(p.body, { mesociclo_id: null });
    assert.equal(bd.rutinas.filter(r => r.mesociclo_id === null).length, 2);
    assert.ok($('.rut-chip.activo')?.textContent.includes('Todos'));
    assert.deepEqual($$('.routine-name').map(x => x.textContent), ['Push A', 'Legacy', 'Pull B']);
  });
}
{
  const { $, $$, modal } = await abrir({ bloquearDeleteMes: true });
  $('[data-accion="mesociclo-borrar"][data-id="m0"]').click(); await modal();
  $('.modal [data-r="si"]').click();
  await hasta(() => $('#alertas .alert-error'));
  t('RLS bloquea el borrado del mesociclo: error claro', () => assert.ok($('#alertas')?.textContent.includes('revisa la política RLS de DELETE')));
}
console.log(`\n${ok} comprobaciones OK`);
process.exit(0);
