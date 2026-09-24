// Arranque: sesión → shell (menú + zona principal) → enrutado por hash (#/modulo/parte/parte).
import * as api from './api.js';
import * as datos from './datos.js';
import { crearStore } from './store.js';
import * as ui from './ui.js';
import { registrar, lista, obtener } from './modulos.js';
import * as pestanas from './pestanas.js';
import { crearPestanaPendiente } from './pendiente.js';
import { RUTA_INICIAL } from './config.js';

import dashboard from '../dashboard/index.js';
import clientes from '../clientes/index.js';
import biblioteca from '../biblioteca/index.js';
import rutinaspdf from '../rutinaspdf/index.js';
import rm from '../rm/index.js';
import nutricion from '../nutricion/index.js';
import finanzas from '../finanzas/index.js';

import datosPestana from '../clientes/datos.js';
import cardioPestana from '../cardio/index.js';
import rutinasPestana from '../rutinas/index.js';

// Orden = orden del menú lateral (igual que el panel actual).
[dashboard, clientes, biblioteca, rutinaspdf, rm, nutricion, finanzas].forEach(registrar);

// Pestañas de la ficha de cliente. Las que aún no están clonadas apuntan al panel actual.
[
  datosPestana,
  rutinasPestana,
  cardioPestana,
  crearPestanaPendiente({ id: 'historial', icono: '📊', etiqueta: 'Historial', orden: 40 }),
  crearPestanaPendiente({ id: 'cuerpo', icono: '📏', etiqueta: 'Cuerpo', orden: 50 }),
  crearPestanaPendiente({ id: 'volumen', icono: '💪', etiqueta: 'Volumen', orden: 60 }),
  crearPestanaPendiente({ id: 'avisos', icono: '📣', etiqueta: 'Avisos', orden: 70 })
].forEach(pestanas.registrar);

const store = crearStore({});
const raiz = () => document.getElementById('app');
let version = 0;            // descarta montajes que llegan tarde si se navegó mientras cargaban
let desmontarActual = null;
let hashEscuchado = false;

// ── Ruta ──
function leerRuta() {
  const partes = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(p => {
    try { return decodeURIComponent(p); } catch { return p; }
  });
  return { modulo: partes[0] || RUTA_INICIAL, partes: partes.slice(1) };
}

export function navegar(ruta) {
  const destino = '#/' + String(ruta).replace(/^#?\/?/, '');
  if (location.hash === destino) enrutar();
  else location.hash = destino;
}

async function desmontar() {
  const fn = desmontarActual;
  desmontarActual = null;
  if (fn) { try { await fn(); } catch (e) { console.error(e); } }
}

function marcarMenu(id) {
  document.querySelectorAll('[data-nav]').forEach(el => el.classList.toggle('active', el.dataset.nav === id));
}

async function enrutar() {
  const main = document.getElementById('main');
  if (!main || !api.haySesion()) return;
  const mia = ++version;
  const ruta = leerRuta();
  const modulo = obtener(ruta.modulo);
  if (!modulo) { navegar(RUTA_INICIAL); return; }

  await desmontar();
  marcarMenu(modulo.id);
  // Contenedor nuevo en cada montaje: los listeners del módulo anterior desaparecen con él.
  const contenedor = document.createElement('div');
  contenedor.className = 'modulo';
  main.replaceChildren(contenedor);
  const ctx = { api, datos, store, ui, pestanas, navegar, ruta: { modulo: modulo.id, partes: ruta.partes } };
  try {
    const resultado = await modulo.montar(contenedor, ctx);
    if (mia !== version) { if (resultado && resultado.desmontar) resultado.desmontar(); return; }
    desmontarActual = resultado && resultado.desmontar ? resultado.desmontar : null;
  } catch (e) {
    if (mia !== version) return;
    console.error(e);
    contenedor.innerHTML = `<div class="alert alert-error">No se pudo cargar "${ui.esc(modulo.etiqueta)}": ${ui.esc(e.message)}</div>`;
  }
}

// ── Pantallas ──
function pintarLogin(error = '') {
  raiz().innerHTML = `
    <div class="login-wrap">
      <div class="login-box">
        <div class="login-logo">TRAINING WORKS</div>
        <div class="login-sub">Panel Entrenador</div>
        ${error ? `<div class="login-error">${ui.esc(error)}</div>` : ''}
        <label class="login-label" for="passInput">Contraseña</label>
        <input class="login-input" type="password" id="passInput" placeholder="••••••••••••" autocomplete="current-password" />
        <button class="login-btn" id="loginBtn">ACCEDER</button>
      </div>
    </div>`;
}

function pintarShell() {
  const menu = lista();
  const movil = menu.filter(m => m.movil);
  raiz().innerHTML = `
    <div class="app">
      <aside class="sidebar">
        <div class="sidebar-logo">
          <div class="brand">TRAINING WORKS</div>
          <div class="role">Panel Entrenador</div>
        </div>
        <nav class="sidebar-nav">
          ${menu.map(m => `<button class="nav-item" data-nav="${ui.esc(m.id)}"><span class="nav-icon">${m.icono}</span>${ui.esc(m.etiqueta)}</button>`).join('')}
        </nav>
        <div class="sidebar-footer">
          <button class="btn-refresh" id="refrescarBtn">🔄 Actualizar</button>
          <button class="btn-logout" id="logoutBtn">Cerrar sesión</button>
        </div>
      </aside>
      <header class="mobile-header">
        <div class="brand">TRAINING WORKS</div>
        <button class="mobile-logout-btn" id="logoutBtn">Salir</button>
      </header>
      <main class="main" id="main"></main>
      <nav class="mobile-bottom-nav">
        ${movil.map(m => `<button class="mobile-nav-item" data-nav="${ui.esc(m.id)}"><span class="nav-icon">${m.icono}</span><span>${ui.esc(m.etiqueta)}</span><div class="mobile-nav-dot"></div></button>`).join('')}
      </nav>
    </div>
    <div id="alertas" class="alertas"></div>`;
}

async function entrar() {
  pintarShell();
  if (!hashEscuchado) { window.addEventListener('hashchange', enrutar); hashEscuchado = true; }
  await enrutar();
}

async function salir(mensaje = '') {
  version++;
  await desmontar();
  api.logout();
  datos.invalidar();
  pintarLogin(mensaje);
}

async function actualizar() {
  datos.invalidar();
  await enrutar();
}

async function iniciarSesion() {
  const campo = document.getElementById('passInput');
  const boton = document.getElementById('loginBtn');
  if (!campo || !campo.value) { pintarLogin('Introduce tu contraseña'); return; }
  boton.disabled = true;
  boton.textContent = 'Entrando...';
  try {
    await api.login(campo.value);
    await entrar();
  } catch (e) {
    pintarLogin(e instanceof TypeError ? 'No se pudo conectar. Revisa tu conexión.' : 'Contraseña incorrecta');
  }
}

// Una sola delegación de eventos para login y shell (el contenedor raíz no se reemplaza nunca).
function cablear() {
  const r = raiz();
  r.addEventListener('click', e => {
    const nav = e.target.closest('[data-nav]');
    if (nav) { navegar(nav.dataset.nav); return; }
    if (e.target.closest('#loginBtn')) { iniciarSesion(); return; }
    if (e.target.closest('#logoutBtn')) { salir(); return; }
    if (e.target.closest('#refrescarBtn')) actualizar();
  });
  r.addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.target.id === 'passInput') iniciarSesion();
  });
}

export async function arrancar() {
  cablear();
  api.alCaducarSesion(() => salir('Tu sesión ha caducado, vuelve a iniciar sesión'));
  raiz().innerHTML = ui.cargando('Comprobando sesión...');
  if (await api.restaurarSesion()) await entrar();
  else pintarLogin();
}
