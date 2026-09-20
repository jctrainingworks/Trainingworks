// Datos compartidos por varias secciones, con caché. "Actualizar" llama a invalidar().
import * as api from './api.js';

let cache = {};
export function invalidar() { cache = {}; }

function una(clave, cargar) {
  if (!cache[clave]) cache[clave] = cargar().catch(e => { delete cache[clave]; throw e; });
  return cache[clave];
}

export const clientes = () => una('clientes', async () => {
  const filas = await api.tabla('clientes', { filtro: 'order=nombre.asc' });
  return filas.map(c => ({ ...c, estado: c.estado_cliente }));
});

export const sesiones = () => una('sesiones', () => api.tabla('sesiones', { filtro: 'order=fecha.desc' }));
