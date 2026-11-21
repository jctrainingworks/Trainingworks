// Modal «Nuevo cliente» / «Cliente demo» / «Editar cliente» (réplica de renderModalAddClient y su guardado en prueba/index.html).
import { esc } from '../core/ui.js';
import { fechaLocalISO } from '../periodizacion/calculos.js';
import { cargarSeguimiento, elegirRegistroPeso, pesoActualDesdeSeguimiento, guardarMedidaFicha } from './pesos.js';

export function opcionesPlan(modalidad, plan) {
  const vacio = `<option value="" disabled ${!plan ? 'selected' : ''} hidden></option>`;
  const o = (v, l) => `<option value="${v}" ${plan === v ? 'selected' : ''}>${l}</option>`;
  if (modalidad === 'PRESENCIAL') return vacio + o('SESION_SUELTA', 'SESIÓN SUELTA — 30€') + o('BONO_8', 'BONO 8 SESIONES — 210€') + o('BONO_12', 'BONO 12 SESIONES — 295€');
  return vacio + o('1MES', '1 MES — 109€') + o('3MESES', '3 MESES — 297€') + o('6MESES', '6 MESES — 540€');
}

// Código de acceso: 3 letras + 4 números aleatorios (sin I/O), distinto de los que ya existen.
export function generarCodigoCliente(existentes, azar = Math.random) {
  const letras = 'ABCDEFGHJKMNPQRSTUVWXYZ';
  const usados = new Set((existentes || []).map(c => c.codigo));
  let intento;
  do {
    let l = ''; for (let i = 0; i < 3; i++) l += letras[Math.floor(azar() * letras.length)];
    intento = `${l}${Math.floor(1000 + azar() * 9000)}`;
  } while (usados.has(intento));
  return intento;
}

const num = (v, parse) => (v !== '' && v !== undefined && v !== null ? parse(v) : null);

// Campos del formulario → cuerpo de `clientes` (mayúsculas como en el panel actual).
export function leerFormulario(v, { modalidadPresencialRevision = true } = {}) {
  const up = s => String(s || '').trim().toUpperCase();
  const modalidad = up(v.modalidad);
  return {
    nombre: up(v.nombre), plan: up(v.plan), modalidad, revision: modalidad === 'PRESENCIAL' ? null : 'SEMANAL', objetivo: up(v.objetivo), genero: up(v.genero),
    edad: num(v.edad, x => parseInt(x)), altura: num(v.altura, parseFloat), pesoInicial: num(v.pesoInicial, parseFloat), fcReposo: num(v.fcReposo, x => parseInt(x)),
    estadopago: up(v.estadopago), email: up(v.email), whatsapp: up(v.whatsapp), origen: up(v.origen),
    fecha: v.fecha || '', fechaNacimiento: v.fechaNacimiento || '', condicion: up(v.condicion), notas: String(v.notas || '').trim()
  };
}

export async function abrirFormularioCliente({ ctx, cliente = null, demo = false, alTerminar }) {
  const { api, datos, ui } = ctx;
  const edit = !!cliente;
  const c = cliente || {};
  if (demo) { c.modalidad = c.modalidad || 'ONLINE'; c.plan = c.plan || '1MES'; }
  const seguimiento = edit ? await cargarSeguimiento(api, cliente.id) : [];
  const opts = (lista, actual) => `<option value="" disabled ${!actual ? 'selected' : ''} hidden></option>` + lista.map(([v, l]) => `<option value="${v}" ${actual === v ? 'selected' : ''}>${l}</option>`).join('');
  const numero = (id, extra, val) => `<input class="form-input" id="${id}" type="number" min="0" ${extra || ''} value="${esc(val ?? '')}" />`;
  const toma = (id, label) => `<div class="form-group"><label class="form-label">${label} (cm)</label><input class="form-input" id="f_toma_${id}" type="number" min="0" step="0.1" /></div>`;

  const capa = document.createElement('div');
  capa.className = 'modal-overlay';
  capa.innerHTML = `
<div class="modal mx-modal mx-sm">
<div class="mx-head">
<div class="modal-title">${edit ? 'Editar cliente' : demo ? '🧪 Cliente demo' : 'Nuevo cliente'}</div>
<div class="modal-sub">${edit ? 'Modifica los datos del cliente.' : demo ? 'Cliente de prueba para testear la app. No cuenta en tus stats reales.' : 'Rellena los datos del cliente. El código se generará automáticamente.'}</div>
</div>
<div class="mx-body">
<div class="al-seccion-titulo">Plan</div>
<div class="form-group"><label class="form-label">Nombre completo *</label><input class="form-input" id="f_nombre" value="${edit ? esc(c.nombre || '') : ''}" /></div>
<div class="form-row col3">
  <div class="form-group"><label class="form-label">Modalidad *</label>
    <select class="form-select" id="f_modalidad">${opts([['ONLINE', 'ONLINE'], ['PRESENCIAL', 'PRESENCIAL']], c.modalidad)}</select></div>
  <div class="form-group"><label class="form-label">Plan *</label>
    <select class="form-select" id="f_plan">${opcionesPlan(c.modalidad, c.plan)}</select></div>
  <div class="form-group mx-s2"><label class="form-label">Fecha inicio plan</label>
    <input class="form-input" id="f_fecha" type="date" value="${edit && c.fecha_inicio ? esc(String(c.fecha_inicio).split('T')[0]) : ''}" /></div>
</div>
<div class="form-row col2">
  <div class="form-group"><label class="form-label">Objetivo</label>
    <select class="form-select" id="f_objetivo">${opts([['HIPERTROFIA', 'HIPERTROFIA'], ['DEFINICION', 'DEFINICION'], ['FUERZA', 'FUERZA'], ['PERDIDA DE PESO', 'PERDIDA DE PESO'], ['SALUD', 'SALUD']], c.objetivo)}</select></div>
  <div class="form-group"><label class="form-label">Estado de pago</label>
    <select class="form-select" id="f_estadopago">${opts([['AL DIA', 'AL DÍA'], ['PENDIENTE', 'PENDIENTE'], ['VENCIDO', 'VENCIDO']], c.estado_pago)}</select></div>
</div>
<div class="al-seccion-titulo">Perfil</div>
<div class="form-row col4">
  <div class="form-group"><label class="form-label">Género</label><select class="form-select" id="f_genero">${opts([['HOMBRE', 'HOMBRE'], ['MUJER', 'MUJER']], c.genero)}</select></div>
  <div class="form-group"><label class="form-label">Edad</label>${numero('f_edad', '', edit ? c.edad : '')}</div>
  <div class="form-group"><label class="form-label">Altura (cm)</label>${numero('f_altura', '', edit ? c.altura : '')}</div>
  <div class="form-group"><label class="form-label">${edit ? 'Peso actual (kg)' : 'Peso inicial (kg)'}</label>${numero('f_peso_inicial', 'step="0.1" placeholder="Ej. 78.5"', edit ? pesoActualDesdeSeguimiento(c, seguimiento) : '')}</div>
</div>
<div class="form-row col2">
  <div class="form-group"><label class="form-label">FC reposo (ppm)</label>${numero('f_fc_reposo', 'placeholder="Ej. 65"', edit ? c.fc_reposo : '')}</div>
  <div class="form-group"><label class="form-label">Fecha de nacimiento <span class="mx-opt">(opcional)</span></label>
    <input class="form-input" id="f_fecha_nacimiento" type="date" value="${edit && c.fecha_nacimiento ? esc(String(c.fecha_nacimiento).split('T')[0]) : ''}" /></div>
</div>
<div class="al-nota" style="margin:-6px 0 18px;">🍽️ Alimentos preferidos y no deseados, en la pestaña 📏 Cuerpo de este cliente.</div>
${!edit ? `<details class="mx-det"><summary>📏 Primera toma de perímetros <span class="mx-opt">(opcional)</span></summary>
  <div class="mx-det-body">
    <div class="al-nota" style="margin:0 0 12px;">Si rellenas peso y/o perímetros aquí, el historial de Seguimiento corporal de este cliente arranca hoy mismo con estos datos, en vez de esperar al primer check-in o cálculo de Nutrición.</div>
    <div class="form-row col4">${toma('cuello', 'Cuello')}${toma('brazo', 'Brazo')}${toma('antebrazo', 'Antebrazo')}${toma('abdomen', 'Abdomen')}</div>
    <div class="form-row col4">${toma('cadera', 'Cadera/Nalgas')}${toma('muslo', 'Muslo')}${toma('pantorrilla', 'Pantorrilla')}</div>
  </div></details>` : ''}
<div class="al-seccion-titulo">Contacto</div>
<div class="form-row col3">
  <div class="form-group mx-s2"><label class="form-label">Email</label><input class="form-input" id="f_email" type="email" value="${edit ? esc(c.email || '') : ''}" /></div>
  <div class="form-group"><label class="form-label">WhatsApp</label><input class="form-input" id="f_whatsapp" type="tel" value="${edit ? esc(c.whatsapp || '') : ''}" /></div>
  <div class="form-group"><label class="form-label">Origen</label><select class="form-select" id="f_origen">${opts([['WHATSAPP', 'WHATSAPP'], ['REFERIDO', 'REFERIDO'], ['WEB', 'WEB'], ['INSTAGRAM', 'INSTAGRAM']], c.origen)}</select></div>
</div>
<div class="al-seccion-titulo">Salud y notas</div>
<div class="form-group"><label class="form-label">Condición médica</label><input class="form-input" id="f_condicion" value="${edit ? esc(c.condicion_medica || c.condicion || '') : ''}" /></div>
<div class="form-group"><label class="form-label">Notas internas</label><textarea class="form-textarea" id="f_notas" rows="3" placeholder="VIP, familiar, lesión de rodilla...">${edit ? esc(c.notas || '') : ''}</textarea></div>
</div>
<div class="mx-alert" data-error></div>
<div class="mx-foot"><div class="mx-foot-btns">
<button class="btn btn-ghost" data-cancelar>Cancelar</button>
<button class="btn btn-primary" data-confirmar>${edit ? 'Guardar Cambios' : 'Crear Cliente'}</button>
</div></div>
</div>`;
  const $ = s => capa.querySelector(s);
  const v = id => (capa.querySelector('#' + id) || {}).value;
  const cerrar = () => { capa.remove(); document.removeEventListener('keydown', alTecla); };
  const alTecla = e => { if (e.key === 'Escape') cerrar(); };
  capa.addEventListener('change', e => { if (e.target.id === 'f_modalidad') $('#f_plan').innerHTML = opcionesPlan(e.target.value, ''); });
  capa.addEventListener('click', async e => {
    if (e.target.closest('[data-cancelar]')) return cerrar();
    if (!e.target.closest('[data-confirmar]')) return;
    const p = leerFormulario({ nombre: v('f_nombre'), plan: v('f_plan'), modalidad: v('f_modalidad'), objetivo: v('f_objetivo'), estadopago: v('f_estadopago'), genero: v('f_genero'),
      edad: v('f_edad'), altura: v('f_altura'), pesoInicial: v('f_peso_inicial'), fcReposo: v('f_fc_reposo'), email: v('f_email'), whatsapp: v('f_whatsapp'), origen: v('f_origen'),
      fecha: v('f_fecha'), fechaNacimiento: v('f_fecha_nacimiento'), condicion: v('f_condicion'), notas: v('f_notas') });
    if (!p.nombre) { $('[data-error]').innerHTML = '<div class="alert alert-error">El nombre es obligatorio</div>'; return; }
    const boton = $('[data-confirmar]');
    boton.textContent = edit ? 'Guardando...' : 'Creando...'; boton.disabled = true;
    try {
      let aviso = '', errorPeso = '', codigo = c.codigo;
      if (edit) {
        const hayPesos = !!elegirRegistroPeso(seguimiento);
        const pesoPrevio = Number(pesoActualDesdeSeguimiento(c, seguimiento)) || null; // lo que mostraba el campo al abrir el modal
        const cuerpo = { nombre: p.nombre || null, codigo: c.codigo || null, plan: p.plan || null, modalidad: p.modalidad || null, revision: p.revision || null, objetivo: p.objetivo || null,
          genero: p.genero || null, edad: p.edad, altura: p.altura,
          // el peso inicial solo se toca si aún no hay registros de peso (entonces inicial = actual); si los hay se conserva
          peso_inicial: hayPesos ? c.peso_inicial : p.pesoInicial,
          fc_reposo: p.fcReposo, estado_pago: p.estadopago || null, estado_cliente: 'ACTIVO', email: p.email || null, whatsapp: p.whatsapp || null, origen: p.origen || null,
          fecha_inicio: p.fecha || null, fecha_nacimiento: p.fechaNacimiento || null, condicion_medica: p.condicion || null, notas: p.notas || null };
        await api.tabla('clientes', { method: 'PATCH', filtro: `codigo=eq.${c.codigo}`, cuerpo });
        Object.assign(c, cuerpo, { estado: 'ACTIVO' });
        // El campo es el PESO ACTUAL: si lo cambias, queda apuntado en Seguimiento corporal con la fecha de hoy.
        if (p.pesoInicial != null && p.pesoInicial !== pesoPrevio) {
          const r = await guardarMedidaFicha(api, c.id, p.pesoInicial, null, seguimiento);
          if (r.error) { aviso = ' — ⚠️ pero no se pudo registrar el nuevo peso en Seguimiento corporal (Objetivo seguirá con el peso anterior)'; errorPeso = r.error; }
          else aviso = ` — peso actual ${p.pesoInicial} kg guardado en Seguimiento corporal`;
        }
      } else {
        codigo = generarCodigoCliente(await datos.clientes());
        const filas = await api.tabla('clientes', { method: 'POST', cuerpo: { nombre: p.nombre, codigo, plan: p.plan, modalidad: p.modalidad, revision: p.revision, objetivo: p.objetivo, genero: p.genero,
          edad: p.edad, altura: p.altura, peso_inicial: p.pesoInicial, fc_reposo: p.fcReposo, estado_pago: p.estadopago, estado_cliente: 'ACTIVO', email: p.email, whatsapp: p.whatsapp,
          origen: p.origen, fecha_inicio: p.fecha || null, fecha_nacimiento: p.fechaNacimiento || null, condicion_medica: p.condicion, notas: p.notas || null, es_demo: !!demo } });
        const creado = Array.isArray(filas) ? filas[0] : filas;
        // Primera toma (opcional): el historial de Seguimiento corporal arranca hoy con peso y/o perímetros.
        const primera = {};
        if (p.pesoInicial != null) primera.peso = p.pesoInicial;
        ['cuello', 'brazo', 'antebrazo', 'abdomen', 'cadera', 'muslo', 'pantorrilla'].forEach(k => { const x = v('f_toma_' + k); if (x !== undefined && x !== '') primera[k] = parseFloat(x); });
        if (creado?.id && Object.keys(primera).length) {
          try { await api.tabla('seguimiento_corporal', { method: 'POST', cuerpo: { cliente_id: creado.id, fecha: p.fecha || fechaLocalISO(), origen: 'nutricion', ...primera } }); }
          catch (eToma) { console.error('No se pudo crear el registro de la primera toma:', eToma); }
        }
      }
      cerrar();
      datos.invalidar && datos.invalidar();
      ui.alerta(edit ? `✅ Cliente ${p.nombre} actualizado${aviso}` : demo ? `✅ Cliente demo ${p.nombre} creado con código ${codigo}` : `✅ Cliente ${p.nombre} creado con código ${codigo}`);
      if (errorPeso) ui.alerta('El cliente se ha guardado, pero el peso nuevo NO se pudo apuntar en Seguimiento corporal. Motivo: ' + errorPeso, 'error');
      if (alTerminar) await alTerminar();
    } catch (err) {
      $('[data-error]').innerHTML = `<div class="alert alert-error">Error: ${esc(err.message)}</div>`;
      boton.textContent = edit ? 'Guardar Cambios' : 'Crear Cliente'; boton.disabled = false;
    }
  });
  document.addEventListener('keydown', alTecla);
  document.body.appendChild(capa);
}
