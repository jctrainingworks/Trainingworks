// Pruebas automáticas del motor de nutrición (nuevo/nutricion/motor-nutricion.js).
// Listón aprobado por Juan (15-oct-2026), ver REGLAS-NUTRICION.md → "Cuándo se da por bueno".
// Ejecutar:  node test/nutricion/motor-nutricion.test.mjs   (sale con código 1 si algo no cumple)
import vm from 'node:vm';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const raiz = path.resolve(aqui, '..', '..');   // raíz del repo
const require = createRequire(import.meta.url);
const Motor = require(path.join(raiz, 'test/nutricion/motor-nutricion.js'));

const ctx = vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(raiz, 'test/prueba/alimentos/catalogo.js'), 'utf8') + '\nthis.C = NUTRI_CATALOGO_V2;', ctx);
const CAT = ctx.C;

const DIAS = Number(process.env.DIAS || 3000);
let fallos = 0;
const ok = (cond, msg) => { if (cond) console.log('  ✔ ' + msg); else { console.log('  ✘ ' + msg); fallos++; } };

// Los 8 alimentos por bloque "por defecto" de las pruebas (carbohidrato / proteína / grasa).
const CAND = {
  carbohidrato: ['arroz_basmati', 'pasta_trigo', 'patata', 'boniato', 'pan_integral', 'avena', 'lentejas', 'quinoa'],
  proteina: ['pechuga_pollo', 'pavo_pechuga', 'ternera_magra', 'merluza', 'atun_natural', 'claras_huevo', 'huevo_entero', 'salmon'],
  grasa: ['aove', 'aguacate', 'almendras', 'nueces', 'avellanas', 'mantequilla_almendras', 'crema_cacahuete', 'aceitunas'],
};

// Cliente grande: hidratos densos (patata y pan integral solo dan ≈62 g de hidratos por comida y no bastan para ≈400 g/día).
const CAND_GRANDE = { ...CAND, carbohidrato: ['arroz_basmati', 'pasta_trigo', 'cuscus', 'quinoa', 'avena', 'crema_arroz', 'arroz_integral', 'pasta_integral'] };

const nombres = { 3: ['Desayuno', 'Comida', 'Cena'], 4: ['Desayuno', 'Comida', 'Merienda', 'Cena'], 5: ['Desayuno', 'Media mañana', 'Comida', 'Merienda', 'Cena'] };
function comidas(n, extra) {
  return nombres[n].map((nombre, i) => Object.assign({ nombre, candidatos: CAND }, extra ? extra(i) : {}));
}

const CLIENTES = [
  { nombre: '1600 kcal · 3 comidas', objetivo: { proteina: 120, carbohidratos: 150, grasa: 55 }, comidas: comidas(3) },
  { nombre: '1900 kcal · 4 comidas', objetivo: { proteina: 140, carbohidratos: 200, grasa: 60 }, comidas: comidas(4) },
  { nombre: '2200 kcal · 4 comidas', objetivo: { proteina: 160, carbohidratos: 250, grasa: 70 }, comidas: comidas(4) },
  { nombre: '2600 kcal · 5 comidas', objetivo: { proteina: 190, carbohidratos: 300, grasa: 85 }, comidas: comidas(5) },
  { nombre: '3000 kcal · 5 comidas', objetivo: { proteina: 210, carbohidratos: 370, grasa: 90 }, comidas: comidas(5) },
  { nombre: '3300 kcal · 5 comidas', objetivo: { proteina: 230, carbohidratos: 410, grasa: 100 }, comidas: comidas(5).map(c => ({ ...c, candidatos: CAND_GRANDE })) },
];

const pc = x => (x * 100).toFixed(2) + ' %';

console.log('\n1) Seis clientes · ' + DIAS + ' días al azar cada uno (±10 %, mínimo 99 % de días dentro)');
let totalDias = 0, totalDentro = 0, violaciones = 0;
for (const cl of CLIENTES) {
  const inf = Motor.probarPlan({ catalogo: CAT, objetivo: cl.objetivo, comidas: cl.comidas, opciones: { dias: DIAS, semilla: Number(process.env.SEMILLA || 12345) } });
  totalDias += inf.dias; totalDentro += inf.dentro; violaciones += inf.violaciones;
  const m = inf.porMacro;
  console.log(`  ${cl.nombre}: ${pc(inf.pct)} dentro (${inf.dentro}/${inf.dias}) · fuera P ${m.proteina.fuera} / C ${m.carbohidratos.fuera} / G ${m.grasa.fuera} · bloques sin entrar ${inf.bloquesCubiertos}/${inf.bloquesTotal} · ${inf.ms} ms`);
  ok(inf.pct >= 0.99, `${cl.nombre}: ≥ 99 % de días dentro del ±10 %`);
  ok(inf.fallosSinAviso === 0, `${cl.nombre}: todo día que no llega trae su aviso con números`);
  if (inf.pct < 0.99) {
    console.log('     peor corto/pasado:', JSON.stringify(MACROS_RESUMEN(m)));
    inf.ejemplosFallo.slice(0, 3).forEach(e => console.log('     ejemplo:', e.modo, JSON.stringify(e.eleccion), e.avisos.join(' | ')));
    const top = Object.entries(inf.topesEnFallos).sort((a, b) => b[1] - a[1]).slice(0, 5);
    if (top.length) console.log('     topes más repetidos en los fallos:', top.map(t => t.join(' ×')).join('; '));
  }
}
function MACROS_RESUMEN(m) { const o = {}; for (const k in m) o[k] = { corto: m[k].corto, pasa: m[k].pasa, peorCorto: +(m[k].peorCorto * 100).toFixed(1), peorPasa: +(m[k].peorPasa * 100).toFixed(1) }; return o; }
ok(violaciones === 0, 'Nunca una cantidad por debajo del mínimo ni por encima del tope (violaciones: ' + violaciones + ')');
console.log(`  Total: ${pc(totalDentro / totalDias)} de ${totalDias} días dentro`);

console.log('\n2) Casos especiales');
const base = { catalogo: CAT, objetivo: { proteina: 160, carbohidratos: 250, grasa: 70 } };
const mk = (bloquesPorComida, extra) => nombres[4].map((nombre, i) => Object.assign({ nombre, bloques: bloquesPorComida(i) }, extra ? extra(i) : {}));
const bloquesBasicos = () => [
  { tipo: 'carbohidrato', alimentos: [{ key: 'arroz_basmati' }] },
  { tipo: 'proteina', alimentos: [{ key: 'pechuga_pollo' }] },
  { tipo: 'grasa', alimentos: [{ key: 'aove' }] },
];
const lim = (k) => Motor.limitesAlimento(CAT[k]);
const enRango = (res) => res.comidas.every(c => c.bloques.every(b => b.items.every(it => { const l = lim(it.key); return it.gramos >= l.minG - 1e-9 && it.gramos <= l.maxG + 1e-9; })));

{ // Día básico
  const r = Motor.resolverDia({ ...base, comidas: mk(bloquesBasicos) });
  ok(r.ok, 'Día básico (arroz + pollo + AOVE, 4 comidas) cuadra: P ' + Math.round(r.total.proteina) + ' C ' + Math.round(r.total.carbohidratos) + ' G ' + Math.round(r.total.grasa));
  ok(enRango(r), 'Cantidades dentro de mínimo y tope');
  ok(r.comidas.every(c => c.bloques.every(b => b.items.every(it => it.gramos % 5 === 0))), 'Gramos múltiplos de 5');
}
{ // Determinismo
  const a = JSON.stringify(Motor.resolverDia({ ...base, comidas: mk(bloquesBasicos) }));
  const b = JSON.stringify(Motor.resolverDia({ ...base, comidas: mk(bloquesBasicos) }));
  ok(a === b, 'Mismo plan → mismo resultado (determinista)');
}
{ // Bloque de 2 alimentos: arroz + lentejas (lentejas aportan proteína)
  const r = Motor.resolverDia({ ...base, comidas: mk(i => [
    { tipo: 'carbohidrato', alimentos: [{ key: 'arroz_basmati', pct: 50 }, { key: 'lentejas', pct: 50 }] },
    { tipo: 'proteina', alimentos: [{ key: 'pechuga_pollo' }] },
    { tipo: 'grasa', alimentos: [{ key: 'aove' }] }]) });
  const c0 = r.comidas[0].bloques[0].items;
  ok(r.ok && c0.length === 2, 'Arroz + lentejas 50/50 cuadra el día (' + c0.map(i => i.nombre + ' ' + i.gramos + ' g').join(' + ') + ')');
  const mac = c0.reduce((s, i) => s + i.macros.carbohidratos, 0);
  const a = c0[0].macros.carbohidratos, b = c0[1].macros.carbohidratos;
  ok(Math.abs(a - b) <= Math.max(a, b) * 0.2, 'Reparto ≈50/50 en carbohidratos (' + Math.round(a) + ' / ' + Math.round(b) + ' g, total ' + Math.round(mac) + ')');
  const prot = c0.reduce((s, i) => s + i.macros.proteina, 0);
  ok(prot > 0 && r.comidas[0].macros.proteina >= prot, 'La proteína de las lentejas cuenta en el total');
  ok(enRango(r), 'Cantidades dentro de mínimo y tope');
}
{ // Reparto 70/30 cambiado por el cliente
  const r = Motor.resolverDia({ ...base, comidas: mk(i => [
    { tipo: 'carbohidrato', alimentos: [{ key: 'arroz_basmati', pct: 70 }, { key: 'lentejas', pct: 30 }] },
    { tipo: 'proteina', alimentos: [{ key: 'pechuga_pollo' }] },
    { tipo: 'grasa', alimentos: [{ key: 'aove' }] }]) });
  const it = r.comidas[0].bloques[0].items;
  ok(it.length === 2 && it[0].macros.carbohidratos > it[1].macros.carbohidratos, 'Reparto 70/30 respetado (' + it.map(i => Math.round(i.macros.carbohidratos) + ' g CH').join(' / ') + ')');
}
{ // Claras + huevos en proteína
  const r = Motor.resolverDia({ ...base, comidas: mk(i => [
    { tipo: 'carbohidrato', alimentos: [{ key: 'arroz_basmati' }] },
    { tipo: 'proteina', alimentos: [{ key: 'claras_huevo', pct: 50 }, { key: 'huevo_entero', pct: 50 }] },
    { tipo: 'grasa', alimentos: [{ key: 'aove' }] }]) });
  const it = r.comidas[0].bloques[1].items;
  const huevo = it.find(x => x.key === 'huevo_entero');
  ok(r.ok && it.length === 2, 'Claras + huevos cuadra el día (' + it.map(x => x.nombre + ' ' + x.gramos + ' g').join(' + ') + ')');
  ok(huevo && Number.isInteger(huevo.unidades) && huevo.unidades >= 1 && huevo.unidades <= 4, 'Huevos en unidades enteras (' + (huevo && huevo.unidades) + ' ud, tope 4)');
}
{ // Porciones fijas: el motor no las toca y las cuenta
  const fijos = i => i === 0 ? [{ key: 'manzana', unidades: 1 }, { key: 'leche_semi', gramos: 250 }] : [];
  const r = Motor.resolverDia({ ...base, comidas: mk(bloquesBasicos, i => ({ fijos: fijos(i) })) });
  const f = r.comidas[0].fijos;
  ok(f.length === 2 && f[0].gramos === 150 && f[0].unidades === 1 && f[1].gramos === 250, 'Porciones fijas intactas (manzana 1 ud = 150 g, leche 250 g)');
  const sinFijos = Motor.resolverDia({ ...base, comidas: mk(bloquesBasicos) });
  ok(r.ok && r.comidas[0].macros.kcal > 0, 'Con porciones fijas el día sigue cuadrando: C ' + Math.round(r.total.carbohidratos));
  ok(r.comidas[0].bloques[0].items[0].gramos <= sinFijos.comidas[0].bloques[0].items[0].gramos, 'La fruta/leche se resta del resto de la comida (arroz del desayuno ' + r.comidas[0].bloques[0].items[0].gramos + ' g ≤ ' + sinFijos.comidas[0].bloques[0].items[0].gramos + ' g)');
}
{ // Modo fijo: proteína fija 60 g en comida 2 (guía)
  const rep = Motor.repartoPorComida({ proteina: 160, carbohidratos: 250, grasa: 70 }, mk(bloquesBasicos, i => ({ reparto: i === 1 ? { proteina: { modo: 'fijo', g: 70 } } : (i === 3 ? { proteina: { modo: 'libre' } } : {}) })));
  ok(rep.guia[1][0] === 70 && Math.abs(rep.guia[0][0] - 30) < 1e-9 && Math.abs(rep.guia[3][0] - 30) < 1e-9, 'Modos fijo/igual/libre: fijo 70 g, el resto (160-70)/3 = 30 g cada una; guía ' + rep.guia.map(g => Math.round(g[0])).join('/'));
}
{ // Igual: 3 comidas, 180 g → 60 g cada una
  const rep = Motor.repartoPorComida({ proteina: 180, carbohidratos: 240, grasa: 60 }, comidas(3));
  ok(rep.guia.every(g => g[0] === 60 && g[1] === 80 && g[2] === 20), 'Partes iguales: 180 g de proteína en 3 comidas → 60 g cada una');
}
{ // Fijo que se pasa del total → aviso
  const rep = Motor.repartoPorComida({ proteina: 100, carbohidratos: 200, grasa: 60 }, mk(bloquesBasicos, i => ({ reparto: { proteina: { modo: 'fijo', g: 50 } } })));
  ok(rep.avisos.length === 1 && /proteína/.test(rep.avisos[0].texto), 'Fijos que se pasan del total → aviso claro: «' + (rep.avisos[0] && rep.avisos[0].texto) + '»');
}
{ // Comida en modo fijo/libre: el total del día cuadra igual
  const r = Motor.resolverDia({ ...base, comidas: mk(bloquesBasicos, i => ({ reparto: { proteina: i === 0 ? { modo: 'fijo', g: 20 } : { modo: 'igual' }, carbohidratos: i === 3 ? { modo: 'libre' } : { modo: 'igual' } } })) });
  ok(r.ok && enRango(r), 'Mezcla de modos (fijo + igual + libre): el total del día cuadra');
}
{ // Mínimo: un alimento que pediría casi nada no entra (sin cantidades irrisorias)
  const r = Motor.resolverDia({ catalogo: CAT, objetivo: { proteina: 160, carbohidratos: 250, grasa: 70 }, comidas: [
    { nombre: 'Comida 1', reparto: { carbohidratos: { modo: 'fijo', g: 5 } }, bloques: [{ tipo: 'carbohidrato', alimentos: [{ key: 'avena' }] }, { tipo: 'proteina', alimentos: [{ key: 'pechuga_pollo' }] }] },
    { nombre: 'Comida 2', bloques: bloquesBasicos() }, { nombre: 'Comida 3', bloques: bloquesBasicos() }, { nombre: 'Comida 4', bloques: bloquesBasicos() }] });
  const av = r.comidas[0].bloques[0];
  ok(av.items.length === 0 || av.items[0].gramos >= lim('avena').minG, 'Avena nunca por debajo de su mínimo (' + (av.items[0] ? av.items[0].gramos + ' g' : 'no entra en esa comida') + ', mínimo ' + lim('avena').minG + ' g)');
}
{ // Día imposible → mensaje claro, sin bloque vacío mudo
  const r = Motor.resolverDia({ catalogo: CAT, objetivo: { proteina: 230, carbohidratos: 250, grasa: 70 }, comidas: [
    { nombre: 'Comida 1', bloques: [{ tipo: 'carbohidrato', alimentos: [{ key: 'arroz_basmati' }] }, { tipo: 'proteina', alimentos: [{ key: 'whey' }] }, { tipo: 'grasa', alimentos: [{ key: 'aove' }] }] },
    { nombre: 'Comida 2', bloques: [{ tipo: 'carbohidrato', alimentos: [{ key: 'arroz_basmati' }] }, { tipo: 'proteina', alimentos: [{ key: 'whey' }] }, { tipo: 'grasa', alimentos: [{ key: 'aove' }] }] }] });
  ok(!r.ok, 'Día imposible (230 g de proteína con 2 comidas de whey): se detecta');
  ok(r.avisos.some(a => a.tipo === 'dia' && a.macro === 'proteina' && /\d+ g de \d+ g/.test(a.texto)), 'El aviso dice cuánto falta con números: «' + (r.avisos.find(a => a.tipo === 'dia') || {}).texto + '»');
  ok(r.avisos.some(a => a.tipo === 'topes'), 'El aviso nombra los alimentos que están en su ración máxima');
}
{ // Alimento que no aporta el macro / no existe → aviso, no explota
  const r = Motor.resolverDia({ ...base, comidas: mk(i => [{ tipo: 'proteina', alimentos: [{ key: 'aove' }, { key: 'no_existe' }] }, { tipo: 'carbohidrato', alimentos: [{ key: 'arroz_basmati' }] }]) });
  ok(r.avisos.filter(a => a.tipo === 'alimento').length >= 2 && r.comidas.every(c => c.bloques[0].sinAlimento), 'Bloque sin alimentos válidos → avisos y marcado sinAlimento (nunca mudo)');
}
{ // Bloque de 2 alimentos con pct inválido (sumas ≠ 100) se normaliza
  const r = Motor.resolverDia({ ...base, comidas: mk(i => [
    { tipo: 'carbohidrato', alimentos: [{ key: 'arroz_basmati', pct: 30 }, { key: 'lentejas', pct: 30 }] },
    { tipo: 'proteina', alimentos: [{ key: 'pechuga_pollo' }] }, { tipo: 'grasa', alimentos: [{ key: 'aove' }] }]) });
  ok(r.ok, 'Porcentajes de un bloque de 2 que no suman 100 se normalizan');
}

console.log('\n2b) Cliente de 3300 kcal con la lista floja (patata y pan integral): el probador tiene que avisar, no callar');
{
  const cl = { objetivo: { proteina: 230, carbohidratos: 410, grasa: 100 }, comidas: comidas(5) };
  const inf = Motor.probarPlan({ catalogo: CAT, objetivo: cl.objetivo, comidas: cl.comidas, opciones: { dias: Math.min(DIAS, 1500) } });
  console.log('  Resultado informativo: ' + pc(inf.pct) + ' de días dentro; carbohidratos fuera en ' + inf.porMacro.carbohidratos.fuera + ' días (peor ' + (inf.porMacro.carbohidratos.peorCorto * 100).toFixed(1) + ' %)');
  ok(inf.fallosSinAviso === 0, 'Los días que no llegan salen todos con aviso claro (' + inf.fallosSinAviso + ' sin aviso)');
  ok(inf.ejemplosFallo.length === 0 || inf.ejemplosFallo[0].avisos.some(a => /\d+ g de \d+ g/.test(a)), 'El aviso dice cuántos gramos faltan');
}

console.log('\n3) Exclusión de un alimento: el día sigue llegando sin él');
{
  const sin = k => { const c = {}; for (const t in CAND) c[t] = CAND[t].filter(x => x !== k); return c; };
  const cl = CLIENTES[2];
  const inf = Motor.probarPlan({ catalogo: CAT, objetivo: cl.objetivo, comidas: cl.comidas.map(c => ({ ...c, candidatos: sin('pechuga_pollo') })), opciones: { dias: Math.min(DIAS, 1500) } });
  ok(inf.pct >= 0.99, 'Cliente 2200 sin pollo: ' + pc(inf.pct) + ' de días dentro');
}

console.log('\n' + (fallos ? `✘ ${fallos} comprobación(es) fallan` : '✔ Todo en verde'));
process.exit(fallos ? 1 : 0);
