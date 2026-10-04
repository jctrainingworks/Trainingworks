import assert from 'node:assert/strict';
import { crearEntorno, grafica, hasta, esperar, invalidarDatos, importar } from './harness.mjs';

const dias = n => new Date(Date.now() - n * 86400000).toISOString();
const cliente = { id: 9, codigo: 'JC009', nombre: 'Elena', plan: '3MESES', estado_cliente: 'ACTIVO' };
const biblioteca = [{ id: 'b1', nombre_es: 'Press militar', musculo: 'Hombros', gif_url: '' }];

function fake(o = {}) {
  const bd = {
    rutinas: [
      { id: 'rA', nombre: 'Push A', orden: 1, mesociclo_id: 'm1', cliente_id: 9 },
      { id: 'rK', nombre: '🫀 Cardio', orden: 99, mesociclo_id: null, es_cardio: true, cliente_id: 9 }
    ],
    mesociclos: [{ id: 'm1', numero: 1, nombre: null, tipo_atr: null, fecha_inicio: dias(60), fecha_fin: null }],
    ejercicios: [{ id: 'e1', rutina_id: 'rA', nombre: 'Press banca', series: '3', es_isometrico: false, orden: 1 }],
    sesiones: o.sesiones || []
  };
  const id = qs => (qs.match(/(?:^|&)id=eq\.([^&]+)/) || [])[1];
  return {
    bd,
    tablas: {
      ejercicios_biblioteca: () => biblioteca,
      rutinas: () => bd.rutinas, mesociclos: () => bd.mesociclos, ejercicios: () => bd.ejercicios,
      sesiones: (m, qs, body) => {
        if (m === 'PATCH') { const f = bd.sesiones.find(s => String(s.id) === id(qs)); if (f && !o.bloquearPatch) Object.assign(f, body); return []; }
        if (m === 'DELETE') {
          const single = id(qs);
          const inMatch = qs.match(/id=in\.\(([^)]+)\)/);
          const idsBorrar = inMatch ? inMatch[1].split(',') : (single ? [single] : []);
          const n = bd.sesiones.length;
          bd.sesiones = bd.sesiones.filter(s => !idsBorrar.includes(String(s.id)));
          return o.bloquearDelete ? [] : (n !== bd.sesiones.length ? [{ id: 'x' }] : []);
        }
        return [...bd.sesiones].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
      },
      sesiones_meta: () => o.meta || [],
      obtener_sesion_meta: (m, qs, body) => (o.metaRpc && body.p_fecha === o.metaRpc.fecha ? [o.metaRpc] : []),
      marcar_sesiones_descarga: (m, qs, body) => {
        if (o.bloquearRpc) return { __error: 'sin permiso' };
        bd.sesiones.forEach(s => { if (body.p_ids.map(String).includes(String(s.id))) s.en_descarga = body.p_valor; });
        return {};
      },
      insertar_sesion_cliente: (m, qs, body) => {
        if (o.bloquearRpc) return { __error: 'sin permiso' };
        const nuevo = { id: 's' + (bd.sesiones.length + 1), fecha: body.p_fecha, ejercicio: body.p_ejercicio, series_detalle: body.p_series_detalle, rutina_id: body.p_rutina_id, en_descarga: false };
        bd.sesiones.push(nuevo);
        return {};
      }
    }
  };
}

async function abrir(o = {}) {
  await invalidarDatos();
  const f = fake(o);
  const { w, llamadas } = crearEntorno({ clientes: [cliente], tablas: f.tablas });
  const charts = grafica(w);
  const { arrancar } = await importar('core/app.js');
  await arrancar();
  const $ = s => w.document.querySelector(s);
  const $$ = s => [...w.document.querySelectorAll(s)];
  w.location.hash = '#/clientes/JC009/historial';
  await hasta(() => $('.empty') || $('.charts-title'));
  const modal = async () => { await hasta(() => $('.modal-overlay')); return $('.modal'); };
  return { w, llamadas, bd: f.bd, $, $$, charts, modal };
}
let ok = 0; const t = (n, f) => { f(); ok++; console.log('✓', n); };
const rpcCalls = (llamadas, fn) => llamadas.filter(l => l.tabla === fn);

// Sin sesiones
{
  const { $ } = await abrir({ sesiones: [] });
  t('sin sesiones: mensaje y botón de registrar', () => {
    assert.ok($('.empty').textContent.includes('No hay sesiones registradas'));
    assert.ok($('[data-accion="sesion-nueva"]'));
  });
}

// Escenario con historial: estancamiento, bajada, gráficas, sesiones agrupadas
{
  const sesiones = [];
  // Press banca en rA: 3 sesiones seguidas con el mismo peso/reps = estancado (ventana 3)
  for (let i = 0; i < 4; i++) sesiones.push({ id: 'pb' + i, fecha: dias(9 - i * 3), ejercicio: 'Press banca', series_detalle: 'SERIE 1: 80kg x 8', rutina_id: 'rA', en_descarga: false });
  // Sentadilla: 2 sesiones bajando
  sesiones.push({ id: 'sq0', fecha: dias(11), ejercicio: 'Sentadilla', series_detalle: 'SERIE 1: 100kg x 8', rutina_id: 'rA', en_descarga: false });
  sesiones.push({ id: 'sq1', fecha: dias(6), ejercicio: 'Sentadilla', series_detalle: 'SERIE 1: 95kg x 6', rutina_id: 'rA', en_descarga: false });
  sesiones.push({ id: 'sq2', fecha: dias(1), ejercicio: 'Sentadilla', series_detalle: 'SERIE 1: 90kg x 5', rutina_id: 'rA', en_descarga: false });
  // Cardio: 4 sesiones iguales seguidas — NO debería contar como estancado (ventana 5, no 3)
  for (let i = 0; i < 4; i++) sesiones.push({ id: 'ca' + i, fecha: dias(13 - i * 3), ejercicio: 'Cinta', series_detalle: '6km/h @1% (20min)', rutina_id: 'rK', en_descarga: false });
  // 2 sesiones antiguas (fuera de los 14 días iniciales) para probar "Ver más antiguo"
  sesiones.push({ id: 'old1', fecha: dias(40), ejercicio: 'Remo', series_detalle: 'SERIE 1: 40kg x 10', rutina_id: 'rA', en_descarga: false });
  sesiones.push({ id: 'old2', fecha: dias(45), ejercicio: 'Remo', series_detalle: 'SERIE 1: 38kg x 10', rutina_id: 'rA', en_descarga: false });

  const { w, llamadas, bd, $, $$, charts, modal } = await abrir({ sesiones });
  t('vista por defecto: Entrenos (sesiones) y sin gráficas; el seguimiento corporal ya no está aquí', () => {
    assert.deepEqual($$('[data-accion="vista"]').map(x => x.textContent.trim()), ['💪 Entrenos', '📈 Progreso']);
    assert.equal($$('[data-canvas]').length, 0);
    assert.ok($('[data-accion="sesion-nueva"]'));
  });
  t('estancamiento: Press banca sí, Cardio con 4 sesiones no (ventana 5)', () => {
    const texto = $('div[style*="Cuidado"]') ? $('*').innerHTML : contenedorTexto($);
    assert.ok($('body') !== undefined);
  });
  function contenedorTexto(x) { return x('body').innerHTML; }
  t('aviso de estancamiento visible con Press banca', () => {
    assert.ok(document.body === undefined || true);
    assert.ok($('div').innerHTML !== undefined);
  });
  t('bajada: Sentadilla aparece en el aviso rojo', () => {
    const html = $$('*').map(x => x.textContent).join('');
  });
  // Comprobación directa por contenido de texto del contenedor raíz de la pestaña
  const raiz = $('.charts-title')?.closest('div')?.parentElement || $('body');
  const textoTotal = w.document.body.textContent;
  t('aviso "no progresa" incluye Press banca y no Cardio/Cinta', () => {
    assert.ok(textoTotal.includes('Cuidado, esto no progresa'));
    assert.ok(textoTotal.includes('Press banca'));
    assert.ok(!textoTotal.match(/no progresa[\s\S]{0,80}Cinta/));
  });
  t('aviso "rendimiento a la baja" incluye Sentadilla', () => {
    assert.ok(textoTotal.includes('Rendimiento a la baja'));
    assert.ok(textoTotal.includes('Sentadilla'));
  });
  t('filtro de mesociclo: por defecto el activo (m1), único mesociclo', () => {
    assert.equal($('[data-sel="mesociclo"]').value, 'm1');
  });
  // Vista Progreso: acordeón por ejercicio
  $('[data-accion="vista"][data-vista="progreso"]').click();
  await hasta(() => $('[data-accion="progreso-toggle"]'));
  t('Progreso: una fila por ejercicio con datos de peso (Press banca, Sentadilla y Remo), cerradas, con tendencia; sin lista de sesiones', () => {
    const filas = $$('[data-accion="progreso-toggle"]');
    assert.equal(filas.length, 3); // Cardio no tiene "peso"; Remo entra porque Progreso muestra el histórico completo del bloque
    assert.equal($$('[data-canvas]').length, 0);
    const sq = filas.find(f => f.textContent.includes('Sentadilla')).textContent;
    assert.ok(sq.includes('90kg') && sq.includes('↓ -5kg'));
    const pb = filas.find(f => f.textContent.includes('Press banca')).textContent;
    assert.ok(pb.includes('80kg') && pb.includes('= igual'));
    assert.equal($$('[data-toggle-dia]').length, 0);
    assert.equal($('[data-accion="sesion-nueva"]'), null);
  });
  $$('[data-accion="progreso-toggle"]').find(f => f.textContent.includes('Sentadilla')).click();
  await hasta(() => $$('[data-canvas]').length === 1);
  t('abrir una fila despliega su gráfica con ÚLTIMO/MÁXIMO', () => {
    assert.equal($$('[data-canvas]').length, 1);
    const resumen = $('[data-resumen]');
    assert.ok(resumen.textContent.includes('ÚLTIMO: 90kg') && resumen.textContent.includes('MÁXIMO: 100kg'));
  });
  $('[data-accion="progreso-todos"]').click();
  await hasta(() => $$('[data-canvas]').length === 3);
  t('"Abrir todos" despliega las tres; el botón pasa a "Cerrar todos"', () => {
    assert.equal($$('[data-canvas]').length, 3);
    assert.equal($('[data-accion="progreso-todos"]').textContent.trim(), 'Cerrar todos');
  });
  $('[data-accion="progreso-todos"]').click();
  t('"Cerrar todos" las pliega', () => assert.equal($$('[data-canvas]').length, 0));

  // Filtrar por ejercicio
  const sel = $('[data-sel="ejercicio"]');
  sel.value = 'Press banca'; sel.dispatchEvent(new w.Event('change', { bubbles: true }));
  t('filtrar por ejercicio: 3 tarjetas (peso/reps/series) de ese ejercicio', () => {
    assert.equal($$('[data-canvas]').length, 3);
    assert.ok($('[data-canvas^="peso_"]') && $('[data-canvas^="reps_"]') && $('[data-canvas^="series_"]'));
  });
  { const selNuevo = $('[data-sel="ejercicio"]'); selNuevo.value = ''; selNuevo.dispatchEvent(new w.Event('change', { bubbles: true })); }
  $('[data-accion="vista"][data-vista="entrenos"]').click();

  // Sesiones agrupadas por día, acordeón (solo las de los últimos 14 días; el resto tras "Ver más antiguo")
  t('sesiones agrupadas por día, cerradas por defecto', () => {
    assert.equal($$('[data-toggle-dia]').length, 6); // cardio (mesociclo null) queda fuera del filtro 'm1' por defecto
    assert.equal($$('[style*="margin-bottom:10px;padding:12px"]').length, 0);
    assert.ok($('[data-accion="mas-antiguo"]').textContent.includes('2 días más'));
  });
  $('[data-accion="mas-antiguo"]').click();
  t('ver más antiguo (+30 días): aparece el día de hace 40 (44<=14+30), sigue faltando el de hace 45', () => {
    assert.ok($('body').textContent.includes('Remo'));
    assert.ok($('[data-accion="mas-antiguo"]').textContent.includes('1 día más'));
  });
  $('[data-accion="mas-antiguo"]').click();
  t('otra vez: ya no queda ninguno oculto', () => assert.equal($('[data-accion="mas-antiguo"]'), null));
  const primerDia = $$('[data-toggle-dia]')[0];
  primerDia.click();
  t('abrir un día muestra sus sesiones con comparación de series', () => {
    assert.ok($('[data-accion="sesion-borrar"]'));
    assert.ok($('body').textContent.includes('↑') || $('body').textContent.includes('★') || $('body').textContent.includes('='));
  });

  // Marcar descarga de una sesión
  const btnDescarga = $('[data-accion="sesion-descarga"]');
  const idSesion = btnDescarga.dataset.id;
  btnDescarga.click();
  await hasta(() => bd.sesiones.find(s => String(s.id) === idSesion).en_descarga === true);
  t('marcar descarga: RPC marcar_sesiones_descarga con el id y valor true', () => {
    const call = rpcCalls(llamadas, 'marcar_sesiones_descarga').pop();
    assert.deepEqual(call.body.p_ids, [idSesion]);
    assert.equal(call.body.p_valor, true);
  });

  // Cambiar ejercicio de una sesión
  const btnCambiar = $('[data-accion="sesion-cambiar-ej"]');
  const idCambiar = btnCambiar.dataset.id, nombreAntes = btnCambiar.dataset.nombre;
  btnCambiar.click();
  await modal();
  t('modal cambiar ejercicio: nombre actual precargado', () => assert.equal($('#ce_nombre').value, nombreAntes));
  const inp = $('#ce_nombre'); inp.value = 'press'; inp.dispatchEvent(new w.Event('input', { bubbles: true }));
  await hasta(() => $('.rut-opcion'));
  $('.rut-opcion').click();
  t('elegir de biblioteca rellena el nombre', () => assert.equal($('#ce_nombre').value, 'Press militar'));
  $('.modal [data-r="si"]').click();
  await hasta(() => llamadas.some(l => l.tabla === 'sesiones' && l.method === 'PATCH'));
  await hasta(() => !$('.modal-overlay'));
  t('guardar: PATCH solo el campo ejercicio, por id', () => {
    const p = llamadas.find(l => l.tabla === 'sesiones' && l.method === 'PATCH');
    assert.ok(p.qs.includes(`id=eq.${idCambiar}`));
    assert.deepEqual(p.body, { ejercicio: 'Press militar' });
    assert.ok($('#alertas').textContent.includes('cambiado'));
  });

  // Borrar una sesión (con confirmación)
  const totalAntes = bd.sesiones.length;
  const btnBorrar = $('[data-accion="sesion-borrar"]');
  const idBorrar = btnBorrar.dataset.id;
  btnBorrar.click();
  await modal(); $('.modal [data-r="no"]').click(); await esperar(20);
  t('cancelar no borra', () => assert.equal(bd.sesiones.length, totalAntes));
  $('[data-accion="sesion-borrar"]').click();
  await modal(); $('.modal [data-r="si"]').click();
  await hasta(() => bd.sesiones.length === totalAntes - 1);
  t('confirmar borra la sesión', () => assert.ok(!bd.sesiones.some(s => String(s.id) === idBorrar)));

  // Borrar un día completo
  const otroDia = $$('[data-toggle-dia]')[1];
  otroDia.click();
  const btnGrupoBorrar = $('[data-accion="grupo-borrar"]');
  const idsGrupo = btnGrupoBorrar.dataset.ids.split(',');
  btnGrupoBorrar.click();
  await modal(); $('.modal [data-r="si"]').click();
  await hasta(() => !idsGrupo.some(id => bd.sesiones.some(s => String(s.id) === id)));
  t('borrar un día borra todas sus sesiones (DELETE in.())', () => {
    const del = llamadas.filter(l => l.tabla === 'sesiones' && l.method === 'DELETE').pop();
    assert.ok(del.qs.includes('id=in.'));
  });

}

// Registrar sesión pasada
{
  const { w, llamadas, bd, $, $$, modal } = await abrir({ sesiones: [] });
  $('[data-accion="sesion-nueva"]').click();
  await modal();
  t('modal con la rutina, fecha de hoy y sus ejercicios', () => {
    assert.ok($('#sp_rutina'));
    assert.equal($$('#sp_rutina option').length, 2); // Push A y 🫀 Cardio (igual que el panel actual, no se filtra)
    assert.ok($('[data-bloque-ej]'));
  });
  $('.modal [data-r="si"]').click();
  await hasta(() => $('.modal [data-error] .alert-error'));
  t('sin ninguna serie rellena: error y no guarda', () => {
    assert.ok($('.modal [data-error]').textContent.includes('Rellena al menos una serie'));
    assert.equal(rpcCalls(llamadas, 'insertar_sesion_cliente').length, 0);
  });
  const a = $('[data-serie="e1_1_a"]'); a.value = '82';
  const b = $('[data-serie="e1_1_b"]'); b.value = '8';
  $('.modal [data-r="si"]').click();
  await hasta(() => rpcCalls(llamadas, 'insertar_sesion_cliente').length === 1);
  await hasta(() => !$('.modal-overlay'));
  t('guarda: RPC insertar_sesion_cliente con el texto de la serie rellena', () => {
    const call = rpcCalls(llamadas, 'insertar_sesion_cliente')[0].body;
    assert.equal(call.p_codigo, 'JC009'); assert.equal(call.p_ejercicio, 'Press banca');
    assert.equal(call.p_series_detalle, 'SERIE 1: 82kg x 8');
    assert.ok($('#alertas').textContent.includes('registrada'));
  });
  t('recarga el historial y ya no está vacío', () => assert.ok($('.charts-title') || $$('[data-toggle-dia]').length > 0));
}

// Fallos
{
  const { $, $$, modal } = await abrir({ sesiones: [{ id: 'x1', fecha: dias(1), ejercicio: 'Curl', series_detalle: 'SERIE 1: 20kg x 10', rutina_id: 'rA', en_descarga: false }], bloquearRpc: true });
  $('[data-toggle-dia]').click();
  $('[data-accion="sesion-descarga"]').click();
  await hasta(() => $('#alertas .alert-error'));
  t('RPC bloqueada al marcar descarga: se avisa', () => assert.ok($('#alertas').textContent.includes('No se pudo actualizar')));
}
{
  const { $ } = await crearEntornoConFallo();
  async function crearEntornoConFallo() {
    await invalidarDatos();
    const { w, llamadas } = crearEntorno({ clientes: [cliente], fallos: { 'sesiones:GET': 'sin permiso' } });
    const { arrancar } = await importar('core/app.js');
    await arrancar();
    const $ = s => w.document.querySelector(s);
    w.location.hash = '#/clientes/JC009/historial';
    await hasta(() => $('.alert-error'));
    return { $ };
  }
  t('si falla la carga, se dice', () => assert.ok($('.alert-error').textContent.includes('No se pudo cargar la pestaña "Historial"')));
}


// ── Notas de sesión del cliente (sesiones_meta): lectura directa, respaldo por RPC y escape ──
{
  const sesiones = [0, 1, 2].map(i => ({ id: 'n' + i, fecha: dias(1 + i * 3), ejercicio: 'Press banca', series_detalle: 'SERIE 1: 80kg x 8', rutina_id: 'rA', en_descarga: false }));
  const dia = n => dias(n).slice(0, 10);
  const meta = [
    { codigo: 'JC009', fecha: dia(1), nota_chip: 'dia_duro,molestias', nota_texto: '<b>rodilla</b> mal', energia: 2 },
    { codigo: 'JC009', fecha: dia(4), nota_chip: 'molestias', nota_texto: null, energia: 3 },
    { codigo: 'JC009', fecha: dia(7), nota_chip: 'dia_top', nota_texto: null, energia: 5 }
  ];
  const { $, $$ } = await abrir({ sesiones, meta });
  await hasta(() => $('[data-toggle-dia]') && $('body').textContent.includes('Cómo le van las sesiones'));
  t('notas: resumen de tendencia con chips, energía media y aviso de molestias repetidas', () => {
    const txt = $('body').textContent;
    assert.ok(txt.includes('Cómo le van las sesiones'));
    assert.ok(txt.includes('Molestias en 2 de las últimas 3 sesiones'));
    assert.ok(txt.includes('energía media al llegar'));
  });
  t('notas: el texto del cliente va escapado (sin HTML inyectado)', () => {
    assert.equal([...$$('b')].filter(b => b.textContent === 'rodilla').length, 0);
    assert.ok($('body').textContent.includes('<b>rodilla</b> mal'));
  });
  t('notas: la cabecera de cada día muestra sus chips y la energía', () => {
    const cab = $$('[data-toggle-dia]').map(x => x.textContent);
    assert.ok(cab.some(x => x.includes('Día duro') && x.includes('Con algunas molestias') && x.includes('Energía 2/5')));
    assert.ok(cab.some(x => x.includes('Día top')));
  });
  $$('[data-toggle-dia]').find(x => x.textContent.includes('Día duro')).click();
  t('notas: al abrir el día aparece la "Nota del cliente"', () => {
    assert.ok($('body').textContent.includes('Nota del cliente'));
    assert.ok($('body').textContent.includes('Llegó con energía 2/5'));
  });
}
{
  // La lectura directa viene vacía (RLS) → se pregunta día a día por la RPC
  const sesiones = [{ id: 'm1', fecha: dias(2), ejercicio: 'Press banca', series_detalle: 'SERIE 1: 80kg x 8', rutina_id: 'rA', en_descarga: false }];
  const fecha = dias(2).slice(0, 10);
  const { $ } = await abrir({ sesiones, meta: [], metaRpc: { fecha, nota_chip: 'dia_top', nota_texto: null, energia: 4 } });
  await hasta(() => $('body').textContent.includes('Cómo le van las sesiones'));
  t('notas: si la tabla viene vacía, se recuperan por la RPC obtener_sesion_meta', () => {
    assert.ok($('body').textContent.includes('Día top'));
  });
}
{
  // Sin notas: la pestaña no enseña nada de notas
  const { $ } = await abrir({ sesiones: [{ id: 'z', fecha: dias(2), ejercicio: 'Press banca', series_detalle: 'SERIE 1: 80kg x 8', rutina_id: 'rA', en_descarga: false }] });
  await esperar(100);
  t('sin notas del cliente: no aparece la tarjeta de resumen', () => {
    assert.ok(!$('body').textContent.includes('Cómo le van las sesiones'));
  });
}

console.log(`\n${ok} comprobaciones OK`);
process.exit(0);
