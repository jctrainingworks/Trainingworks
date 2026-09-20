// Autenticación (Supabase Auth) y acceso a datos (REST). Es el único sitio que habla con Supabase.
// Misma lógica que el panel actual (login por contraseña, refresh_token, reintento tras 401),
// con una mejora: si varias peticiones reciben 401 a la vez, se refresca UNA sola vez (el
// refresh_token es de un solo uso).
import { SUPABASE_URL, SUPABASE_KEY, TRAINER_EMAIL, AUTH_STORAGE_KEY } from './config.js';

let accessToken = null;
let refreshToken = null;
let avisarCaducada = () => {};

export function alCaducarSesion(fn) { avisarCaducada = fn; }
export function haySesion() { return Boolean(accessToken); }

function guardarRefresh(token) { try { localStorage.setItem(AUTH_STORAGE_KEY, token); } catch {} }
function borrarRefresh() { try { localStorage.removeItem(AUTH_STORAGE_KEY); } catch {} }

async function pedirToken(grant, cuerpo) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=${grant}`, {
    method: 'POST',
    headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(cuerpo)
  });
  const datos = await res.json().catch(() => ({}));
  return { ok: res.ok, datos };
}

function guardarSesion(datos) {
  accessToken = datos.access_token;
  refreshToken = datos.refresh_token;
  // Supabase rota el refresh_token en cada uso: hay que guardar siempre el nuevo.
  guardarRefresh(refreshToken);
}

export async function login(password) {
  const { ok, datos } = await pedirToken('password', { email: TRAINER_EMAIL, password });
  if (!ok) throw new Error(datos.error_description || datos.msg || 'Credenciales incorrectas');
  guardarSesion(datos);
}

async function refrescar() {
  if (!refreshToken) return false;
  try {
    const { ok, datos } = await pedirToken('refresh_token', { refresh_token: refreshToken });
    if (!ok) return false;
    guardarSesion(datos);
    return true;
  } catch { return false; }
}

let refrescando = null;
function refrescarUnaVez() {
  if (!refrescando) refrescando = refrescar().finally(() => { refrescando = null; });
  return refrescando;
}

// Intenta recuperar una sesión anterior (recarga de página) sin pedir contraseña.
export async function restaurarSesion() {
  let guardado = null;
  try { guardado = localStorage.getItem(AUTH_STORAGE_KEY); } catch {}
  if (!guardado) return false;
  refreshToken = guardado;
  if (await refrescar()) return true;
  refreshToken = null;
  borrarRefresh();
  return false;
}

export function logout() {
  accessToken = null;
  refreshToken = null;
  borrarRefresh();
}

async function pedir(url, opciones) {
  const hacer = () => fetch(url, {
    ...opciones,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${accessToken || SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      ...opciones.headers
    }
  });
  let res = await hacer();
  if (res.status === 401 && refreshToken) {
    if (await refrescarUnaVez()) res = await hacer();
    else {
      logout();
      avisarCaducada();
      throw new Error('Tu sesión ha caducado, vuelve a iniciar sesión');
    }
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || res.statusText);
  }
  return res.status === 204 ? [] : res.json();
}

// api.tabla('clientes', { filtro: 'order=nombre.asc' })  ·  { method:'PATCH', filtro:'id=eq.5', cuerpo:{...} }
export function tabla(nombre, { method = 'GET', filtro = '', cuerpo = null, select = '*', unico = false } = {}) {
  let url = `${SUPABASE_URL}/rest/v1/${nombre}?select=${select}`;
  if (filtro) url += `&${filtro}`;
  if (unico) url += '&limit=1';
  const headers = (method === 'POST' || method === 'DELETE') ? { Prefer: 'return=representation' } : {};
  return pedir(url, { method, headers, body: cuerpo ? JSON.stringify(cuerpo) : null });
}

export function rpc(funcion, params = {}) {
  return pedir(`${SUPABASE_URL}/rest/v1/rpc/${funcion}`, { method: 'POST', headers: {}, body: JSON.stringify(params) });
}
