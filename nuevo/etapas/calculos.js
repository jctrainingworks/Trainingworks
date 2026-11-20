// Etapas: cálculos puros. Una etapa es una copia guardada de lo hecho entre dos fechas (rutinas, medidas,
// sesiones, calorías). Réplica de las funciones etapa*/_et* de prueba/index.html.
import { fechaLocalISO } from '../periodizacion/calculos.js';

export const ETAPA_TIPOS = ['Volumen', 'Definición', 'Mantenimiento', 'Recomposición', 'Otra'];
export const ETAPAS_SQL = `create table if not exists etapas (
  id uuid primary key default gen_random_uuid(),
  cliente_id text not null,
  titulo text not null,
  tipo text,
  fecha_inicio date not null,
  fecha_fin date not null,
  nota text,
  kcal_inicio numeric,
  kcal_fin numeric,
  snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists etapas_cliente_idx on etapas (cliente_id, fecha_inicio desc);
alter table etapas enable row level security;
drop policy if exists etapas_entrenador on etapas;
create policy etapas_entrenador on etapas for all to authenticated using (true) with check (true);

create table if not exists nutricion_historial (
  id uuid primary key default gen_random_uuid(),
  cliente_id text not null,
  fecha date not null default current_date,
  objetivo_calorico text,
  kcal_objetivo numeric,
  tdee numeric,
  peso numeric,
  macros jsonb,
  created_at timestamptz not null default now()
);
create index if not exists nutricion_historial_cliente_idx on nutricion_historial (cliente_id, fecha);
alter table nutricion_historial enable row level security;
drop policy if exists nutricion_historial_entrenador on nutricion_historial;
create policy nutricion_historial_entrenador on nutricion_historial for all to authenticated using (true) with check (true);`;

export const etD = x => String(x || '').slice(0, 10);
export function etFechaTxt(f) { const s = etD(f); if (!s) return '—'; const p = s.split('-'); return `${p[2]}/${p[1]}/${p[0]}`; }
export function etNum(x) { const n = parseFloat(String(x == null ? '' : x).replace(',', '.')); return isFinite(n) ? n : null; }
export function etSemanas(ini, fin) {
  const dias = Math.round((new Date(etD(fin) + 'T00:00:00') - new Date(etD(ini) + 'T00:00:00')) / 86400000) + 1;
  return Math.max(1, Math.round(dias / 7));
}
export function etKcalTxt(a, b) {
  if (a == null && b == null) return '—';
  const f = v => v == null ? '?' : Math.round(Number(v)) + '';
  const dlt = (a != null && b != null) ? Number(b) - Number(a) : null;
  return `${f(a)} → ${f(b)} kcal` + (dlt != null && dlt !== 0 ? ` (${dlt > 0 ? '+' : '−'}${Math.abs(Math.round(dlt))})` : '');
}

// ── Vista «Etapa actual / Todo el historial» ──
// Etapa actual = desde el día siguiente al fin de la última etapa cerrada. Sin etapas cerradas, o con la vista
// en «todo», no se filtra nada (null).
export const vistaEtapa = { valor: 'actual' };
export const setVistaEtapa = v => { vistaEtapa.valor = v === 'todo' ? 'todo' : 'actual'; };

export function ultimaFin(etapas) {
  if (!etapas || !etapas.length) return null;
  return etapas.map(e => etD(e.fecha_fin)).filter(Boolean).sort().pop() || null;
}
export function vistaDesde(etapas, vista = vistaEtapa.valor) {
  if (vista === 'todo') return null;
  const fin = ultimaFin(etapas); if (!fin) return null;
  const dt = new Date(fin + 'T00:00:00'); dt.setDate(dt.getDate() + 1);
  return fechaLocalISO(dt);
}
export function mesociclosVisibles(mesociclos, etapas, vista = vistaEtapa.valor) {
  const todos = mesociclos || [];
  if (!vistaDesde(etapas, vista)) return todos;
  const fin = ultimaFin(etapas);
  return todos.filter(m => !m.fecha_fin || etD(m.fecha_fin) > fin);
}
export const filtrarSesiones = (etapas, arr, vista) => { const d = vistaDesde(etapas, vista); return d ? arr.filter(s => etD(s.fecha) >= d) : arr; };
// Las medidas del ÚLTIMO día de la etapa cerrada cuentan como punto de partida de la etapa nueva.
export const filtrarMedidas = (etapas, arr, vista) => { const d = vistaDesde(etapas, vista); return d ? arr.filter(r => etD(r.fecha) >= (ultimaFin(etapas) || d)) : arr; };

// ── Qué se copia al cerrar ──
// datos = { mesociclos, rutinas, ejercicios, medidas, sesiones }
export function datosEnRango(datos, ini, fin) {
  const enRango = f => etD(f) >= ini && etD(f) <= fin;
  const mesosTodos = datos.mesociclos || [];
  const mesos = mesosTodos.filter(m => etD(m.fecha_inicio) <= fin && (!m.fecha_fin || etD(m.fecha_fin) >= ini));
  const idsM = new Set(mesos.map(m => String(m.id)));
  const medidas = (datos.medidas || []).filter(r => enRango(r.fecha)).sort((a, b) => etD(a.fecha).localeCompare(etD(b.fecha)));
  const sesiones = (datos.sesiones || []).filter(s => enRango(s.fecha)).sort((a, b) => etD(a.fecha).localeCompare(etD(b.fecha)));
  const idsConSesion = new Set(sesiones.map(s => String(s.rutina_id ?? '')).filter(Boolean));
  const rutinas = mesosTodos.length ? (datos.rutinas || []).filter(r => idsM.has(String(r.mesociclo_id ?? '')) || idsConSesion.has(String(r.id))) : (datos.rutinas || []);
  const idsR = new Set(rutinas.map(r => String(r.id)));
  const ejercicios = (datos.ejercicios || []).filter(e => idsR.has(String(e.rutina_id)));
  return { mesos, rutinas, ejercicios, medidas, sesiones };
}

// Calorías de inicio/fin sacadas del historial de objetivos (nutricion_historial) y del plan actual.
export function kcalAuto({ hist, plan }, ini, fin, hoy = fechaLocalISO()) {
  const h = (hist || []).filter(x => x.kcal_objetivo != null).sort((a, b) => etD(a.fecha).localeCompare(etD(b.fecha)));
  const antes = h.filter(x => etD(x.fecha) <= ini);
  const dentro = h.filter(x => etD(x.fecha) > ini && etD(x.fecha) <= fin);
  const recIni = antes.length ? antes[antes.length - 1] : (dentro[0] || null);
  const recFin = dentro.length ? dentro[dentro.length - 1] : (antes.length ? antes[antes.length - 1] : null);
  const inicio = recIni ? Number(recIni.kcal_objetivo) : null;
  let finV = recFin ? Number(recFin.kcal_objetivo) : null;
  let texto = h.length
    ? 'Sacado del historial de objetivos guardados. Puedes corregirlo a mano.'
    : 'Aún no hay historial de calorías (se empieza a guardar desde ahora). Si recuerdas con cuántas empezó, escríbelo a mano.';
  if (finV == null && plan && plan.kcal_objetivo && fin >= hoy) { finV = Number(plan.kcal_objetivo); texto += ' El final es el objetivo actual del cliente.'; }
  return { inicio, fin: finV, texto };
}

// Fecha de inicio por defecto del cierre: el día siguiente a la última etapa, o la primera fecha con datos.
export function inicioPorDefecto({ mesociclos, medidas, sesiones }, etapas, hoy = fechaLocalISO()) {
  const fechas = [...(mesociclos || []).map(m => etD(m.fecha_inicio)), ...(medidas || []).map(r => etD(r.fecha)), ...(sesiones || []).map(s => etD(s.fecha))].filter(Boolean).sort();
  let ini = fechas[0] || hoy;
  const fin = ultimaFin(etapas);
  if (fin) { const dt = new Date(fin + 'T00:00:00'); dt.setDate(dt.getDate() + 1); ini = fechaLocalISO(dt); if (ini > hoy) ini = hoy; }
  return ini;
}

// Valida el formulario de cierre; devuelve un mensaje de error o null.
export function validarCierre({ titulo, ini, fin, nueva }, hoy = fechaLocalISO()) {
  if (!String(titulo || '').trim()) return 'Ponle un título a la etapa';
  if (!ini || !fin) return 'Faltan las fechas';
  if (ini > fin) return '«Desde» no puede ser posterior a «Hasta»';
  if (fin > hoy) return '«Hasta» no puede ser una fecha futura';
  if (nueva && fin !== hoy) return 'Para empezar la etapa siguiente ahora, «Hasta» tiene que ser hoy.';
  return null;
}

// Cuerpo de la fila `etapas` con su snapshot. incl = { rut, med, ses, kcal }.
export function construirEtapa({ cliente, titulo, tipo, ini, fin, nota, kIni, kFin, incl, datos, ctx, ahora = new Date() }) {
  const x = datosEnRango(datos, ini, fin);
  const snap = { version: 1, creado: ahora.toISOString() };
  if (incl.rut) { snap.mesociclos = x.mesos; snap.rutinas = x.rutinas; snap.ejercicios = x.ejercicios; }
  if (incl.med) snap.medidas = x.medidas;
  if (incl.ses) snap.sesiones = x.sesiones.map(s => ({ fecha: s.fecha, ejercicio: s.ejercicio, series: s.series, rutina_id: s.rutina_id, en_descarga: !!s.en_descarga }));
  if (incl.kcal) {
    const p = ctx.plan;
    snap.nutricion = {
      kcal_inicio: kIni, kcal_fin: kFin,
      historial: (ctx.hist || []).filter(h => etD(h.fecha) >= ini && etD(h.fecha) <= fin),
      plan_actual: p ? { kcal_objetivo: p.kcal_objetivo, tdee: p.tdee, objetivo_calorico: p.objetivo_calorico, macros: p.macros, peso: p.peso } : null,
      menu: null
    };
  }
  return { cliente_id: String(cliente.id), titulo: String(titulo).trim(), tipo: tipo || null, fecha_inicio: ini, fecha_fin: fin, nota: String(nota || '').trim() || null,
    kcal_inicio: incl.kcal ? kIni : null, kcal_fin: incl.kcal ? kFin : null, snapshot: snap };
}
