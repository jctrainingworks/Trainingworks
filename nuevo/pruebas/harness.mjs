// Arnés de pruebas: JSDOM + Supabase simulada. Los módulos del panel se importan tal cual.
import { JSDOM } from 'jsdom';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const RAIZ = new URL('..', import.meta.url).pathname.replace(/\/$/, '');

export function crearEntorno({ clientes, rm = [], fallarRm = false, patchFalla = false, tablas = {}, fallos = {} }) {
  const dom = new JSDOM('<!DOCTYPE html><body><div id="app"></div></body>', { url: 'http://localhost/nuevo/index.html', pretendToBeVisual: true });
  const w = dom.window;
  globalThis.window = w; globalThis.document = w.document; globalThis.location = w.location;
  globalThis.localStorage = w.localStorage; globalThis.Node = w.Node; globalThis.Event = w.Event;
  const llamadas = [];
  globalThis.fetch = async (url, op = {}) => {
    const u = String(url);
    const json = (datos, status = 200) => ({ ok: status < 400, status, statusText: 'x', json: async () => datos });
    if (u.includes('/auth/v1/token')) return json({ access_token: 'a', refresh_token: 'r2' });
    const m = u.match(/\/rest\/v1\/([a-z_]+)\?(.*)$/);
    if (!m) return json({}, 404);
    const [, tabla, qs] = m;
    llamadas.push({ tabla, qs, method: op.method || 'GET', body: op.body ? JSON.parse(op.body) : null });
    const metodo = op.method || 'GET';
    if (fallos[tabla + ':' + metodo]) return json({ message: fallos[tabla + ':' + metodo] }, 500);
    if (typeof tablas[tabla] === 'function') return json(tablas[tabla](metodo, qs, op.body ? JSON.parse(op.body) : null));
    if (metodo === 'POST') return json([{ id: 'nuevo-' + llamadas.length, ...JSON.parse(op.body) }]);
    if (metodo === 'DELETE') return json([{ id: 'borrado' }]);
    if (tabla in tablas && tabla !== 'clientes') return json(tablas[tabla]);
    if (tabla === 'clientes' && op.method === 'PATCH') return patchFalla ? json({ message: 'boom' }, 500) : json([]);
    if (tabla === 'clientes') return json(clientes);
    if (tabla === 'sesiones') return json([]);
    if (tabla === 'rm_estimaciones') return fallarRm ? json({ message: 'sin permiso' }, 403) : json(rm);
    return json([]);
  };
  w.localStorage.setItem('jctw_nuevo_refresh_token', 'r1');
  return { w, llamadas };
}

export function grafica(w) {
  const instancias = [];
  w.Chart = class { constructor(canvas, cfg) { this.canvas = canvas; this.cfg = cfg; instancias.push(this); } destroy() { this.destruida = true; } static register() {} };
  w.Chart.registry = { plugins: { get: () => true } };
  w.ChartDataLabels = {};
  return instancias;
}
export const esperar = ms => new Promise(r => setTimeout(r, ms));
export async function hasta(cond, ms = 2000) {
  const t = Date.now();
  while (Date.now() - t < ms) { if (cond()) return true; await esperar(10); }
  return false;
}
export const importar = ruta => import(pathToFileURL(path.join(RAIZ, ruta)).href + '?v=' + Math.random());

// Los módulos hijos (datos.js…) se cachean entre escenarios: se vacía la caché de datos antes de cada uno.
export async function invalidarDatos() {
  const m = await import(pathToFileURL(path.join(RAIZ, 'core/datos.js')).href);
  m.invalidar();
}
