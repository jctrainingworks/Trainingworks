import assert from 'node:assert/strict';
import fs from 'node:fs';
import { crearEntorno, hasta, invalidarDatos, importar, RAIZ } from './harness.mjs';

let ok = 0; const t = (n, f) => { f(); ok++; console.log('✓', n); };
const iso = n => { const d = new Date(); d.setDate(d.getDate() - n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

const calc = await importar('periodizacion/calculos.js');

// 1) Generador, avisos y agrupación idénticos a los de prueba/index.html (se extrae su código y se compara).
{
  const src = fs.readFileSync(RAIZ + '/../prueba/index.html', 'utf8');
  const desde = src.indexOf('const MACRO_SEMANAS_DEF');
  const hasta_ = src.indexOf('// Los bloques del macrociclo se llaman');
  const trozo = src.slice(desde, hasta_);
  const fabrica = new Function('CSD_DURACION_SEMANAS', `
    const fechaLocalISO = d => { d = d || new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
    const state = {};
    ${trozo}
    return { generar: (f, defs) => { state.macrocicloPropuestaInicio = f; const b = generarMacrocicloPropuestaCSD(f, defs); state.macrocicloPropuesta = b; encadenarMacrociclo(); return b; }, avisos: avisosSecuenciaMacrociclo, agrupar: agruparCiclosMacrociclo };
  `);
  const orig = fabrica({ carga: { min: 6, max: 8 }, sobrecarga: { min: 3, max: 4 }, descarga: { min: 1, max: 2 }, mantenimiento: { min: 6, max: 8 } });
  const fechas = ['2026-09-01', '2026-01-05', '2026-06-15', '2026-07-01', '2026-11-20', '2026-12-01', '2027-02-28', '2026-03-31'];
  t('generador de macrociclo: idéntico a prueba para 8 fechas de inicio', () => {
    for (const f of fechas) assert.deepEqual(calc.generarMacrocicloPropuestaCSD(f), orig.generar(f), f);
  });
  t('generador con duraciones personalizadas: idéntico a prueba', () => {
    const defs = { carga: 6, sobrecarga: 3, descarga: 1, mantenimiento: 8 };
    for (const f of fechas) assert.deepEqual(calc.generarMacrocicloPropuestaCSD(f, defs), orig.generar(f, defs), f);
  });
  t('avisos de secuencia y agrupación por ciclos: idénticos a prueba', () => {
    for (const f of fechas) {
      const b = calc.generarMacrocicloPropuestaCSD(f);
      assert.deepEqual(calc.avisosSecuenciaMacrociclo(b), orig.avisos(b), f);
      assert.deepEqual(calc.agruparCiclosMacrociclo(b).map(g => [g.titulo, g.semanas]), orig.agrupar(b).map(g => [g.titulo, g.semanas]), f);
    }
  });
  t('generador: ≥52 semanas, contiguo, Mantenimiento solo en jul/ago/dic, no acaba en Sobrecarga', () => {
    for (const f of fechas) {
      const b = calc.generarMacrocicloPropuestaCSD(f);
      assert.ok(b.reduce((s, x) => s + x.semanas, 0) >= 52);
      assert.ok(b.filter(x => x.tipo === 'mantenimiento').every(x => calc.mesPermiteMantenimiento(x.fecha_inicio)));
      assert.notEqual(b[b.length - 1].tipo, 'sobrecarga');
      for (let i = 1; i < b.length; i++) {
        const p = new Date(b[i - 1].fecha_fin + 'T00:00:00'); p.setDate(p.getDate() + 1);
        assert.equal(b[i].fecha_inicio, calc.fechaLocalISO(p));
      }
    }
  });
}

// 2) Cálculos puros
t('rangos propios: solo en modelo PROPIO; en Sobrecarga los no marcados usan Carga', () => {
  const c = { modelo_periodizacion: 'PROPIO', rangos_propios: { pecho: { carga: [10, 14], sobrecarga: [14, 20] } } };
  assert.deepEqual(calc.rangoPropioSeries(c, 'carga', 'pecho'), [10, 14]);
  assert.deepEqual(calc.rangoPropioSeries(c, 'sobrecarga', 'pecho', new Set(['pecho'])), [14, 20]);
  assert.deepEqual(calc.rangoPropioSeries(c, 'sobrecarga', 'pecho', new Set(['espalda'])), [10, 14]);
  assert.equal(calc.rangoPropioSeries({ ...c, modelo_periodizacion: 'CSD' }, 'carga', 'pecho'), null);
});
t('validarRangosPropios: pares completos y mín ≤ máx', () => {
  const r = calc.validarRangosPropios({ pecho_carga_a: '10', pecho_carga_b: '14', pecho_descarga_a: '8', pecho_descarga_b: '4', espalda_carga_a: '5', espalda_carga_b: '' }, ['carga', 'sobrecarga', 'descarga', 'mantenimiento']);
  assert.deepEqual(r.rangos, { pecho: { carga: [10, 14] } });
  assert.deepEqual(r.malos.map(m => `${m.k}:${m.fase}`).sort(), ['espalda:carga', 'pecho:descarga']);
});
t('crearEvento: exige inicio y fin ≥ inicio; fin por defecto = inicio', () => {
  assert.ok(calc.crearEvento({ desde: '' }).error);
  assert.ok(calc.crearEvento({ desde: '2026-12-10', hasta: '2026-12-01' }).error);
  const e = calc.crearEvento({ tipo: 'viaje', titulo: ' Cádiz ', desde: '2026-12-10' }).evento;
  assert.deepEqual([e.tipo, e.titulo, e.hasta], ['viaje', 'Cádiz', '2026-12-10']);
});
t('mesocicloVigente: abierto > cubre hoy > próximo', () => {
  assert.equal(calc.mesocicloVigente([{ id: 1, fecha_inicio: iso(50), fecha_fin: iso(40) }, { id: 2, fecha_inicio: iso(30), fecha_fin: null }]).id, 2);
  assert.equal(calc.mesocicloVigente([{ id: 1, fecha_inicio: iso(10), fecha_fin: iso(-10) }]).id, 1);
  assert.equal(calc.mesocicloVigente([{ id: 1, fecha_inicio: iso(-5), fecha_fin: iso(-20) }]).id, 1);
  assert.equal(calc.mesocicloVigente([]), null);
});
t('sugerencias: bloque que acaba esta semana, evento largo en Carga y evento en Descarga', () => {
  const esc = s => String(s);
  const vig = { id: 1, tipo_atr: 'carga', fecha_inicio: iso(40), fecha_fin: iso(-3) };
  const sig = { id: 2, tipo_atr: 'descarga', fecha_inicio: iso(-4), fecha_fin: iso(-18) };
  const ev = { id: 'a', tipo: 'viaje', titulo: 'Cádiz', desde: iso(-1), hasta: iso(-3) };
  const s = calc.sugerenciasPeriodizacion({ vig, visibles: [vig, sig], eventos: [ev], prog: { estancados: ['Press banca'], enBajada: [] } }, esc);
  assert.ok(s.some(x => x.k === 'info' && x.txt.includes('Este bloque termina en 3 días')));
  assert.ok(s.some(x => x.k === 'aviso' && x.txt.includes('Sin progreso: <b>Press banca</b>')));
  assert.ok(s.some(x => x.k === 'aviso' && x.txt.includes('valora mover la descarga')));
});

// 3) Pestaña
const cliente = { id: 9, codigo: 'JC009', nombre: 'Elena <b>', plan: '3MESES', estado_cliente: 'ACTIVO' };
async function abrir(cli, { fallos = {}, mesociclos = [] } = {}) {
  await invalidarDatos();
  const escritos = [];
  const { w, llamadas } = crearEntorno({
    clientes: [cli], fallos,
    tablas: {
      mesociclos: (m, qs, body) => { if (m !== 'GET') escritos.push({ m, tabla: 'mesociclos', qs, body }); return m === 'POST' ? [{ id: 'nuevo', ...body }] : (m === 'PATCH' || m === 'DELETE' ? [] : mesociclos); },
      rutinas: [], sesiones: [], rm_estimaciones: [], ejercicios_biblioteca: []
    }
  });
  const { arrancar } = await importar('core/app.js');
  await arrancar();
  w.location.hash = '#/clientes/JC009/periodizacion';
  const $ = s => w.document.querySelector(s);
  const $$ = s => [...w.document.querySelectorAll(s)];
  await hasta(() => $('[data-modelo-sel]'));
  const cambiar = (el, v) => { el.value = v; el.dispatchEvent(new w.Event('change', { bubbles: true })); };
  return { w, llamadas, escritos, $, $$, cambiar, txt: () => w.document.body.textContent.replace(/\s+/g, ' ') };
}
const patches = llamadas => llamadas.filter(l => l.tabla === 'clientes' && l.method === 'PATCH');

{
  const { llamadas, $, cambiar, txt } = await abrir(cliente);
  t('pestaña: existe en la ficha, modelo ATR por defecto, sin macrociclo y con fecha de competición', () => {
    assert.ok($('[data-pestana="periodizacion"]'));
    assert.equal($('[data-modelo-sel]').value, 'ATR');
    assert.ok(!$('[data-accion="crear-macrociclo"]'));
    assert.ok(txt().includes('🏁 Fecha de competición') && txt().includes('Todavía no hay bloques con fecha'));
  });
  cambiar($('[data-modelo-sel]'), 'CSD');
  t('cambiar el desplegable avisa de que falta guardar', () => assert.ok(txt().includes('Sin guardar')));
  $('[data-accion="guardar-modelo"]').click();
  await hasta(() => $('[data-accion="crear-macrociclo"]'));
  t('guardar CSD: PATCH y aparece el macrociclo con el botón deshabilitado sin fecha', () => {
    assert.deepEqual(patches(llamadas).pop().body, { modelo_periodizacion: 'CSD' });
    assert.ok($('[data-accion="crear-macrociclo"]').disabled);
  });
  $('#fechaInicioMacrocicloInput').value = '2026-09-01';
  $('[data-accion="guardar-fecha-macrociclo"]').click();
  await hasta(() => !$('[data-accion="crear-macrociclo"]').disabled);
  t('guardar fecha de inicio: PATCH y se habilita Crear macrociclo', () => {
    assert.deepEqual(patches(llamadas).pop().body, { fecha_inicio_macrociclo: '2026-09-01' });
  });
  cambiar($('[data-modelo-sel]'), 'PROPIO');
  $('[data-accion="guardar-modelo"]').click();
  await hasta(() => $('#rp_pecho_carga_a'));
  t('modelo JCTW: aparece el editor de rangos propios', () => assert.ok(txt().includes('Tus rangos de series por semana')));
  $('[data-accion="rangos-roberto"]').click();
  t('"Partir de los de Roberto" rellena pecho 10-14 en Carga', () => assert.equal($('#rp_pecho_carga_a').value + '-' + $('#rp_pecho_carga_b').value, '10-14'));
  $('#rp_pecho_descarga_a').value = '9'; $('#rp_pecho_descarga_b').value = '3';
  $('[data-accion="guardar-rangos"]').click();
  t('rangos inválidos: no se guarda y se marca el error', () => {
    assert.ok(txt().includes('Revisa (ambos números y mín ≤ máx): Pecho · descarga'));
    assert.ok(!patches(llamadas).some(p => 'rangos_propios' in p.body));
  });
  $('#rp_pecho_descarga_b').value = '10';
  $('[data-accion="guardar-rangos"]').click();
  await hasta(() => txt().includes('✅ Rangos guardados') || patches(llamadas).some(p => 'rangos_propios' in p.body));
  t('rangos válidos: PATCH con { pecho: { carga, descarga } }', () => {
    const p = patches(llamadas).find(x => 'rangos_propios' in x.body).body.rangos_propios;
    assert.deepEqual(p.pecho.carga, [10, 14]); assert.deepEqual(p.pecho.descarga, [9, 10]);
  });
}

{ // eventos
  const { llamadas, $, $$, txt } = await abrir({ ...cliente, modelo_periodizacion: 'CSD' });
  $('#evTitulo').value = 'Semana Santa <i>';
  $('[data-accion="anadir-evento"]').click();
  t('evento sin fecha: aviso y no escribe', () => { assert.ok($('#evMsg').textContent.includes('fecha de inicio')); assert.equal(patches(llamadas).length, 0); });
  $('#evTipo').value = 'viaje'; $('#evDesde').value = iso(-5); $('#evHasta').value = iso(-9);
  $('[data-accion="anadir-evento"]').click();
  await hasta(() => $('[data-accion="borrar-evento"]'));
  t('añadir evento: PATCH eventos_periodizacion y sale en la lista con el título escapado', () => {
    const ev = patches(llamadas)[0].body.eventos_periodizacion;
    assert.equal(ev.length, 1); assert.equal(ev[0].tipo, 'viaje');
    assert.ok(txt().includes('Semana Santa <i>') && !$('.pz-card i'));
  });
  $('[data-accion="borrar-evento"]').click();
  await hasta(() => !$('[data-accion="borrar-evento"]'));
  t('borrar evento: PATCH con lista vacía', () => assert.deepEqual(patches(llamadas)[1].body.eventos_periodizacion, []));
}

{ // línea de tiempo, dónde estás, sobrecarga
  const macro = [
    { id: 'm1', numero: 1, nombre: 'Macrociclo anual', tipo_atr: 'carga', fecha_inicio: iso(60), fecha_fin: iso(33) },
    { id: 'm2', numero: 2, nombre: 'Macrociclo anual', tipo_atr: 'sobrecarga', fecha_inicio: iso(32), fecha_fin: iso(-5) },
    { id: 'm3', numero: 3, nombre: 'Macrociclo anual', tipo_atr: 'descarga', fecha_inicio: iso(-6), fecha_fin: iso(-19) }
  ];
  const { escritos, $, $$, txt } = await abrir({ ...cliente, modelo_periodizacion: 'CSD' }, { mesociclos: macro });
  t('dónde estás: Sobrecarga, semana y siguiente bloque; línea de tiempo con "hoy"', () => {
    assert.ok(txt().includes('📍 Dónde estás ahora') && txt().includes('Sobrecarga') && txt().includes('Siguiente: Descarga'));
    assert.ok(txt().includes('hoy') && txt().includes('← aquí'));
    assert.ok(txt().includes('3 bloques'));
  });
  $('[data-accion="toggle-sobrecarga"][data-musculo="pecho"]').click();
  await hasta(() => escritos.length);
  t('músculos en sobrecarga: PATCH musculos_sobrecarga en el mesociclo vigente', () => {
    assert.ok(escritos[0].qs.includes('id=eq.m2'));
    assert.deepEqual(escritos[0].body, { musculos_sobrecarga: ['pecho'] });
  });
}

{ // crear macrociclo
  const activo = { id: 'mAct', numero: 1, nombre: 'Base', tipo_atr: 'carga', fecha_inicio: iso(30), fecha_fin: null };
  const { escritos, $, $$, cambiar, txt } = await abrir({ ...cliente, modelo_periodizacion: 'CSD', fecha_inicio_macrociclo: '2026-09-01' }, { mesociclos: [activo] });
  $('[data-accion="crear-macrociclo"]').click();
  await hasta(() => $('[data-mc-confirmar]'));
  const filas = () => $$('[data-mc-tipo]').length;
  const n0 = filas();
  t('modal: una fila por bloque, nombre escapado y botón con el total', () => {
    assert.ok(n0 >= 8);
    assert.ok(txt().includes('Elena <b> — JC009') && !$('.modal-sub b'));
    assert.ok($('[data-mc-confirmar]').textContent.includes(`Crear ${n0} mesociclos`));
    assert.equal($('[data-mc-tipo="0"]').value, 'carga');
  });
  t('modal: cambiar semanas reencadena fechas; quitar y añadir bloque', () => {
    const antes = txt();
    $('[data-mc-sem="0:1"]').click();
    assert.ok(txt().includes('8 sem'));
    assert.notEqual(txt(), antes);
    $('[data-mc-quitar="1"]').click();
    assert.equal(filas(), n0 - 1);
    $('[data-mc-anadir]').click();
    assert.equal(filas(), n0);
  });
  t('modal: Mantenimiento solo se admite en jul/ago/dic', () => {
    cambiar($('[data-mc-tipo="0"]'), 'mantenimiento');
    assert.equal($('[data-mc-tipo="0"]').value, 'carga');
    assert.ok(txt().includes('Mantenimiento solo se puede elegir'));
  });
  t('modal: "Dejar solo semanas" borra tipos y confirmar avisa sin escribir', () => {
    $('[data-mc-quitar-tipos]').click();
    $('[data-mc-confirmar]').click();
    assert.ok(txt().includes('Falta elegir el tipo del bloque 1.'));
    assert.equal(escritos.length, 0);
  });
  $('[data-mc-regenerar]').click(); // hay ediciones: pide confirmar antes de regenerar
  await hasta(() => $('[data-r="si"]'));
  $('[data-r="si"]').click();
  await hasta(() => $('[data-mc-tipo="0"]') && $('[data-mc-tipo="0"]').value === 'carga');
  const nn = filas();
  $('[data-mc-confirmar]').click();
  await hasta(() => !$('[data-mc-confirmar]'));
  t('confirmar: cierra el activo el día antes y crea los mesociclos "Macrociclo anual"', () => {
    const patch = escritos.find(e => e.m === 'PATCH');
    assert.ok(patch.qs.includes('id=eq.mAct'));
    assert.deepEqual(patch.body, { fecha_fin: '2026-08-31' });
    const posts = escritos.filter(e => e.m === 'POST');
    assert.equal(posts.length, nn);
    assert.deepEqual(posts.map(p => p.body.numero), posts.map((_, i) => i + 1));
    assert.ok(posts.every(p => p.body.nombre === 'Macrociclo anual' && p.body.cliente_id === 9 && p.body.fecha_fin && p.body.tipo_atr));
  });
}

{ // error al crear
  const { $, escritos, txt } = await abrir({ ...cliente, modelo_periodizacion: 'CSD', fecha_inicio_macrociclo: '2026-09-01' }, { fallos: { 'mesociclos:POST': 'sin permiso' } });
  $('[data-accion="crear-macrociclo"]').click();
  await hasta(() => $('[data-mc-confirmar]'));
  $('[data-mc-confirmar]').click();
  await hasta(() => $('[data-error]') && $('[data-error]').textContent.includes('sin permiso'));
  t('error al crear: se dice dentro del modal, sigue abierto y se puede reintentar', () => {
    assert.ok($('[data-mc-confirmar]') && !$('[data-mc-confirmar]').disabled);
  });
  $('[data-mc-cancelar]').click();
  t('cancelar cierra el modal', () => assert.ok(!$('[data-mc-confirmar]')));
}

{ // editar / regenerar un macrociclo existente
  const macro = [
    { id: 'm1', numero: 1, nombre: 'Macrociclo anual', tipo_atr: 'carga', fecha_inicio: iso(10), fecha_fin: iso(-39) },
    { id: 'm2', numero: 2, nombre: 'Macrociclo anual', tipo_atr: 'sobrecarga', fecha_inicio: iso(-40), fecha_fin: iso(-67) },
    { id: 'm3', numero: 3, nombre: 'Macrociclo anual', tipo_atr: 'descarga', fecha_inicio: iso(-68), fecha_fin: iso(-81) }
  ];
  const { escritos, $, $$, txt } = await abrir({ ...cliente, modelo_periodizacion: 'CSD' }, { mesociclos: macro });
  $('[data-accion="editar-macrociclo"]').click();
  await hasta(() => $('[data-mc-confirmar]'));
  t('editar: arranca con los bloques existentes y el inicio bloqueado', () => {
    assert.equal($$('[data-mc-tipo]').length, 3);
    assert.ok($('[data-mc-inicio]').disabled);
    assert.ok($('[data-mc-confirmar]').textContent.includes('Aplicar cambios (3 bloques)'));
  });
  $('[data-mc-quitar="2"]').click();
  $('[data-mc-confirmar]').click();
  await hasta(() => !$('[data-mc-confirmar]'));
  t('aplicar: PATCH de los 2 bloques que quedan y DELETE del sobrante', () => {
    assert.equal(escritos.filter(e => e.m === 'PATCH').length, 2);
    assert.ok(escritos.filter(e => e.m === 'PATCH').every(e => e.body.nombre === 'Macrociclo anual'));
    const del = escritos.find(e => e.m === 'DELETE');
    assert.ok(del.qs.includes('id=in.(m3)'));
  });
}

console.log(`\n${ok} comprobaciones OK`);
process.exit(0);
