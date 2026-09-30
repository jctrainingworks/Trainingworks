// Dashboard · avisos de entrenamiento. Funciones puras (sin DOM ni red), clonadas de prueba/index.html:
// clientesConVolumenEnRojo, clientesConMolestiasAltas, clientesConCheckinAtrasado y
// clientesConMesocicloAlargado. Reutilizan los mismos helpers que la pestaña Volumen de la ficha
// (parseBloqueSerie/volumenBloqueSerie, resolvedor de músculo y MRV real) para que un cliente no
// salga "en rojo" aquí y "verde" en su ficha.
import { volumenBloqueSerie } from '../core/series.js';
import { MRV_REAL_POR_MUSCULO } from '../core/volumen.js';
import { avisoDuracionMesociclo } from '../core/atr.js';

const esActivoReal = c => !c.es_demo && (c.estado_cliente || '').toUpperCase() === 'ACTIVO';
const DIA_MS = 1000 * 60 * 60 * 24;

// Último check-in de cada cliente (por cliente_id).
function ultimoCheckinPorCliente(checkins) {
  const ultimo = {};
  (checkins || []).forEach(d => {
    const actual = ultimo[d.cliente_id];
    if (!actual || new Date(d.fecha) > new Date(actual.fecha)) ultimo[d.cliente_id] = d;
  });
  return ultimo;
}

// Series equivalentes de los últimos 7 días por músculo, comparadas con el MRV real.
// Ojo: las sesiones vienen tal cual de Supabase, con el texto en `series_detalle`.
export function clientesConVolumenEnRojo({ clientes, sesiones, musculoDe, hoy = new Date() }) {
  const haceUnaSemana = new Date(hoy); haceUnaSemana.setDate(hoy.getDate() - 7);
  const resultado = [];
  (clientes || []).filter(esActivoReal).forEach(c => {
    const porMusculoSemana = {};
    (sesiones || [])
      .filter(s => s.codigo_cliente === c.codigo && s.fecha && new Date(s.fecha) >= haceUnaSemana)
      .forEach(s => {
        const musculo = musculoDe(s.ejercicio);
        const bloques = (s.series_detalle ?? s.series ?? '').split(/\n|,/).map(b => b.trim()).filter(Boolean);
        const vol = bloques.reduce((acc, b) => acc + volumenBloqueSerie(b), 0);
        porMusculoSemana[musculo] = (porMusculoSemana[musculo] || 0) + vol;
      });
    const enRojo = Object.entries(porMusculoSemana)
      .filter(([m, series]) => MRV_REAL_POR_MUSCULO[m] != null && series > MRV_REAL_POR_MUSCULO[m])
      .map(([m, series]) => `${m} (${series})`);
    if (enRojo.length) resultado.push({ codigo: c.codigo, nombre: c.nombre, detalle: enRojo.join(', ') });
  });
  return resultado;
}

// Molestias físicas altas (≥4/5) en el ÚLTIMO check-in de cada cliente activo.
export function clientesConMolestiasAltas({ clientes, checkins }) {
  const ultimo = ultimoCheckinPorCliente(checkins);
  const resultado = [];
  (clientes || []).filter(esActivoReal).forEach(c => {
    const d = ultimo[c.id];
    if (d && d.molestias != null && d.molestias >= 4) {
      resultado.push({ codigo: c.codigo, nombre: c.nombre, valor: d.molestias, nota: d.molestias_nota });
    }
  });
  return resultado;
}

// Clientes con checkin_activo que llevan 14+ días sin mandar check-in — o que nunca han mandado
// ninguno dentro de la ventana de 90 días que se carga. Umbral fijo de 14 días.
export function clientesConCheckinAtrasado({ clientes, checkins, hoy = new Date() }) {
  const ultimo = ultimoCheckinPorCliente(checkins);
  const resultado = [];
  (clientes || []).filter(c => esActivoReal(c) && c.checkin_activo).forEach(c => {
    const d = ultimo[c.id];
    const dias = d ? Math.floor((hoy - new Date(d.fecha)) / DIA_MS) : null;
    if (dias == null) {
      // Sin ningún check-in: solo avisa si ya han pasado 14+ días desde el alta.
      const diasDesdeAlta = c.fecha_inicio ? Math.floor((hoy - new Date(c.fecha_inicio)) / DIA_MS) : 999;
      if (diasDesdeAlta >= 14) resultado.push({ codigo: c.codigo, nombre: c.nombre, dias: null });
    } else if (dias >= 14) {
      resultado.push({ codigo: c.codigo, nombre: c.nombre, dias });
    }
  });
  return resultado;
}

// Clientes con un mesociclo activo que lleva más semanas de las habituales para su tipo.
export function clientesConMesocicloAlargado({ clientes, mesociclosActivos }) {
  const porId = {};
  (clientes || []).forEach(c => { porId[c.id] = c; });
  const resultado = [];
  (mesociclosActivos || []).forEach(m => {
    const c = porId[m.cliente_id];
    if (!c || !esActivoReal(c)) return;
    const aviso = avisoDuracionMesociclo(m);
    if (aviso) resultado.push({ codigo: c.codigo, nombre: c.nombre, aviso, nombreBloque: m.nombre || `Mesociclo ${m.numero || ''}` });
  });
  return resultado;
}
