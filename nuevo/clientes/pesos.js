// Peso actual y «apuntar peso/cintura de hoy» (Editar cliente y tarjeta «Peso y cintura»). Réplica de
// elegirRegistroPeso / guardarMedidaFicha / guardarSeguimientoCorporal de prueba/index.html, hablando con la API.
import { fechaLocalISO } from '../periodizacion/calculos.js';

// El peso más reciente que no sea atípico; si hay varios ese día, el de ficha_cliente.
export function elegirRegistroPeso(lista) {
  const validos = (lista || []).filter(d => d.peso && !d.atipico);
  if (!validos.length) return null;
  const maxF = validos.reduce((m, d) => (d.fecha > m ? d.fecha : m), '');
  const delDia = validos.filter(d => d.fecha === maxF);
  return delDia.find(d => d.origen === 'ficha_cliente') || delDia[0];
}
export const pesoActualDesdeSeguimiento = (c, lista) => { const r = elegirRegistroPeso(lista); return r ? r.peso : (c?.peso_inicial ?? ''); };

export const cargarSeguimiento = (api, clienteId) =>
  api.tabla('seguimiento_corporal', { filtro: `cliente_id=eq.${clienteId}&order=fecha.desc` }).catch(() => []);

// Apunta peso y/o cintura de HOY con origen 'ficha_cliente'. Si hoy ya hay un registro de ficha lo actualiza en vez de
// crear otro, conservando el dato que no se pasa. `lista` = seguimiento ya cargado. Devuelve { fila } o { error }.
export async function guardarMedidaFicha(api, clienteId, peso, abdomen, lista) {
  const hoy = fechaLocalISO();
  const previo = (lista || []).find(r => r.fecha === hoy && r.origen === 'ficha_cliente' && String(r.cliente_id) === String(clienteId));
  const p = peso > 0 ? peso : (Number(previo?.peso) || null);
  const a = abdomen > 0 ? abdomen : (Number(previo?.abdomen) || null);
  if (!p && !a) return { error: 'sin datos' };
  const fila = { cliente_id: clienteId, fecha: hoy, origen: 'ficha_cliente', peso: p ? Number(p) : null, cuello: null, brazo: null, antebrazo: null,
    abdomen: a ? Number(a) : null, cadera: null, muslo: null, pantorrilla: null, anos_entreno: null, activo4h: null, composicion: null };
  try {
    if (previo) await api.tabla('seguimiento_corporal', { method: 'PATCH', filtro: `id=eq.${previo.id}`, cuerpo: fila });
    else await api.tabla('seguimiento_corporal', { method: 'POST', cuerpo: fila });
    return { fila };
  } catch (e) { console.error('No se pudo guardar en seguimiento_corporal:', e); return { error: (e && e.message) || String(e) }; }
}
