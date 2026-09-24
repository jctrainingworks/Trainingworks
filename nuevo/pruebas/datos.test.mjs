import assert from 'node:assert/strict';
import { crearEntorno, hasta, esperar, importar } from './harness.mjs';

const cliente = {
  id: 7, codigo: 'JC007', nombre: 'Ana <img src=x onerror=alert(1)>', plan: '3MESES', estado_cliente: 'ACTIVO',
  modalidad: 'ONLINE', edad: 45, genero: 'Mujer', altura: 165, peso_inicial: 62, whatsapp: '600', email: 'a@a.es',
  fecha_inicio: '2026-01-05T00:00:00', origen: 'Instagram', anos_entreno: 9, nivel_atleta: null,
  patologias: 'hipertension', lesion_tipo: 'rodilla_lca_menisco', condicion_medica: 'Menisco <b>x</b>', notas: 'VIP',
  alimentos_excluidos: ['gambas', '<script>'], alimentos_preferidos: 'pollo, arroz', sin_suplementos: true
};
const rm = [
  { ejercicio: 'Press banca', un_rm: 80, fecha: '2026-03-01T00:00:00' },
  { ejercicio: 'Press banca', un_rm: 85.25, fecha: '2026-06-01T00:00:00' },
  { ejercicio: 'Sentadilla', un_rm: 120, fecha: '2026-05-01T00:00:00' }
];
const { w, llamadas } = crearEntorno({ clientes: [cliente], rm });
const { arrancar } = await importar('core/app.js');
await arrancar();
const $ = s => w.document.querySelector(s);
const $$ = s => [...w.document.querySelectorAll(s)];
let ok = 0; const t = (n, f) => { f(); ok++; console.log('✓', n); };

await hasta(() => $('[data-cliente]'));
t('lista de clientes pintada', () => assert.equal($$('[data-cliente]').length, 1));

w.location.hash = '#/clientes/JC007';
await hasta(() => $('.ficha-tabs'));
t('ficha con 7 pestañas y Datos activa', () => {
  assert.deepEqual($$('.ficha-tabs .tab').map(x => x.textContent.trim()), ['📋 Datos', '💪 Rutinas', '🫀 Cardio', '📊 Historial', '📏 Cuerpo', '💪 Volumen', '📣 Avisos']);
  assert.equal($('.ficha-tabs .tab.active').dataset.pestana, 'datos');
});
t('nombre y datos escapados (sin HTML inyectado)', () => {
  assert.equal($('img[src="x"]'), null);
  assert.ok($('.detail-name').textContent.includes('<img'));
  assert.equal($('script'), null);
});
await hasta(() => $('[data-rms] table'));
t('%1RM: solo el último por ejercicio', () => {
  const filas = $$('[data-rms] tbody tr').map(tr => tr.textContent);
  assert.equal(filas.length, 2);
  assert.ok(filas[0].includes('Press banca') && filas[0].includes('85.3') && filas[0].includes('2026-06-01'));
});
t('nivel sugerido por años+edad (máster) y select correcto', () => assert.equal($('[data-nivel]').value, 'Atleta máster'));
t('patología y lesión con su info', () => {
  assert.ok($('[data-info-patologias]').textContent.includes('Hipertensión'));
  assert.ok($('[data-info-lesion]').textContent.includes('Rodilla'));
});

// Interacciones
const dia = $('[data-patologia="diabetes"]'); dia.checked = true; dia.dispatchEvent(new w.Event('change', { bubbles: true }));
t('marcar diabetes añade su aviso', () => assert.ok($('[data-info-patologias]').textContent.includes('Diabetes')));
const lesion = $('[data-lesion]'); lesion.value = ''; lesion.dispatchEvent(new w.Event('change', { bubbles: true }));
t('quitar lesión vacía el aviso', () => assert.equal($('[data-info-lesion]').innerHTML.trim(), ''));

$('[data-accion="guardar-salud"]').click();
await hasta(() => llamadas.some(l => l.method === 'PATCH'));
t('guardar salud: PATCH correcto', () => {
  const p = llamadas.find(l => l.method === 'PATCH');
  assert.equal(p.qs.includes('id=eq.7'), true);
  assert.deepEqual(p.body, { patologias: 'hipertension,diabetes', condicion_medica: 'Menisco <b>x</b>', lesion_tipo: null });
});
await esperar(20);
t('sale aviso de guardado', () => assert.ok($('#alertas').textContent.includes('Salud y limitaciones guardadas')));

const anos = $('[data-anos]'); anos.value = '1'; anos.dispatchEvent(new w.Event('input', { bubbles: true }));
t('escribir años sugiere nivel', () => assert.equal($('[data-nivel]').value, 'Principiante'));
$('[data-accion="guardar-nivel"]').click();
await hasta(() => llamadas.filter(l => l.method === 'PATCH').length === 2);
t('guardar nivel: PATCH correcto', () => assert.deepEqual(llamadas.filter(l => l.method === 'PATCH')[1].body, { anos_entreno: 1, nivel_atleta: 'Principiante' }));

$('#f_datos_notas').value = '  ';
$('[data-accion="guardar-notas"]').click();
await hasta(() => llamadas.filter(l => l.method === 'PATCH').length === 3);
t('notas vacías se guardan como null', () => assert.deepEqual(llamadas.filter(l => l.method === 'PATCH')[2].body, { notas: null }));

// Pestaña pendiente
$('[data-pestana="rutinas"]').click();
await hasta(() => $('.ficha-tabs .tab.active')?.dataset.pestana === 'rutinas');
t('pestaña pendiente lleva al panel actual', () => assert.ok($('a[href="../prueba/"]')));
t('URL con la pestaña', () => assert.equal(w.location.hash, '#/clientes/JC007/rutinas'));

// Lo guardado sobrevive a cambiar de pestaña (objeto compartido con la lista)
w.location.hash = '#/clientes/JC007/datos';
await hasta(() => $('[data-lesion]'));
t('salud guardada persiste al volver a Datos', () => {
  assert.equal($('[data-lesion]').value, '');
  assert.equal($('[data-patologia="diabetes"]').checked, true);
  assert.equal($('[data-anos]').value, '1');
  assert.equal($('[data-nivel]').value, 'Principiante');
});

// Cliente inexistente y pestaña desconocida
w.location.hash = '#/clientes/JC007/nada';
await hasta(() => $('.ficha-tabs .tab.active')?.dataset.pestana === 'datos');
t('pestaña desconocida cae en Datos', () => assert.equal($('.ficha-tabs .tab.active').dataset.pestana, 'datos'));
w.location.hash = '#/clientes/NOEXISTE';
await hasta(() => $('.empty'));
t('cliente inexistente', () => assert.ok($('.empty').textContent.includes('No existe')));
console.log(`\n${ok} comprobaciones OK`);
process.exit(0);
