// Asistente «Cerrar etapa → etapa nueva»: paso 1 = modal «Cerrar etapa» (copia de lo hecho entre dos fechas);
// paso 2 (clientes CSD/JCTW que empiezan etapa nueva) = propuesta de macrociclo, donde se guarda todo de una vez.
// Lo usan la pestaña Etapas y la pestaña Periodización («Crear macrociclo»).
import { esc } from '../core/ui.js';
import { ATR_ORDEN, ATR_TIPOS } from '../core/atr.js';
import { fechaLocalISO, modeloEsCSD } from '../periodizacion/calculos.js';
import { abrirModalMacrociclo } from '../periodizacion/macrociclo.js';
import { modalCerrarEtapaHtml, resumenCierreHtml } from './vista.js';
import { etNum, datosEnRango, kcalAuto, inicioPorDefecto, validarCierre, construirEtapa } from './calculos.js';

// Todo lo que se copia (y lo que hay que saber para el asistente), leído justo al abrir.
export async function leerDatosCliente(ctx) {
  const { cliente, api } = ctx;
  const [mesociclos, rutinas, medidas, sesiones, plan, hist] = await Promise.all([
    api.tabla('mesociclos', { filtro: `cliente_id=eq.${cliente.id}&order=numero.asc` }),
    api.tabla('rutinas', { filtro: `cliente_id=eq.${cliente.id}&order=orden.asc` }),
    api.tabla('seguimiento_corporal', { filtro: `cliente_id=eq.${cliente.id}&order=fecha.desc` }).catch(() => []),
    api.tabla('sesiones', { filtro: `codigo_cliente=eq.${cliente.codigo}&order=fecha.desc` }).catch(() => []),
    api.tabla('planes_nutricion', { select: 'kcal_objetivo,tdee,objetivo_calorico,macros,peso', filtro: `cliente_id=eq.${cliente.id}`, unico: true }).catch(() => []),
    api.tabla('nutricion_historial', { filtro: `cliente_id=eq.${cliente.id}&order=fecha.asc,created_at.asc` }).catch(() => [])
  ]);
  const ids = rutinas.map(r => r.id);
  const ejercicios = ids.length ? await api.tabla('ejercicios', { filtro: `rutina_id=in.(${ids.join(',')})&order=orden.asc` }).catch(() => []) : [];
  return { datos: { mesociclos, rutinas, ejercicios, medidas, sesiones }, ctxNutri: { plan: (plan && plan[0]) || null, hist } };
}

// Entrada única desde «Crear macrociclo (asistente)»: sin nada que cerrar se salta el paso 1.
export async function abrirAsistenteEtapa({ ctx, etapas, alTerminar }) {
  const { cliente, ui } = ctx;
  let L;
  try { L = await leerDatosCliente(ctx); } catch (e) { ui.alerta('No se pudieron cargar los datos del cliente: ' + e.message, 'error'); return; }
  const hayAlgo = L.datos.rutinas.length || L.datos.medidas.length || L.datos.sesiones.length;
  if (!hayAlgo) {
    abrirModalMacrociclo({ ctx, mesociclos: L.datos.mesociclos, rutinas: L.datos.rutinas, modo: 'crear', alTerminar, inicio: cliente.fecha_inicio_macrociclo || fechaLocalISO() });
    return;
  }
  abrirModalCerrarEtapa({ ctx, etapas, nueva: true, L, alTerminar });
}

// prefill: campos ya escritos (al volver desde el paso 2)  ·  L: datos ya leídos (se leen si faltan)
export async function abrirModalCerrarEtapa({ ctx, etapas, nueva = false, prefill = null, L = null, alTerminar }) {
  const { cliente, api, ui, navegar } = ctx;
  if (!L) {
    try { L = await leerDatosCliente(ctx); } catch (e) { ui.alerta('No se pudieron cargar los datos del cliente: ' + e.message, 'error'); return; }
  }
  const csd = modeloEsCSD(cliente.modelo_periodizacion || 'ATR');
  const hoy = fechaLocalISO();
  const ini = inicioPorDefecto(L.datos, etapas, hoy);
  const auto = kcalAuto(L.ctxNutri, ini, hoy, hoy);
  const d = prefill || { titulo: '', tipo: 'Definición', ini, fin: hoy, nota: '', nueva, nuevoNombre: '', nuevoTipo: 'acu_carga',
    kcalIni: auto.inicio != null ? String(auto.inicio) : '', kcalFin: auto.fin != null ? String(auto.fin) : '', kcalIniManual: false, kcalFinManual: false };
  const tiposNuevo = ATR_ORDEN.map(k => [k, ATR_TIPOS[k].label]);

  const capa = document.createElement('div');
  capa.className = 'modal-overlay';
  const $ = s => capa.querySelector(s);
  capa.innerHTML = modalCerrarEtapaHtml(cliente, d, { resumenHtml: resumenCierreHtml(datosEnRango(L.datos, d.ini, d.fin), d), kcalNota: kcalAuto(L.ctxNutri, d.ini, d.fin, hoy).texto, csd, tiposNuevo });
  const alTecla = e => { if (e.key === 'Escape') cerrar(); };
  const cerrar = () => { capa.remove(); document.removeEventListener('keydown', alTecla); };
  const aviso = txt => { $('[data-error]').innerHTML = `<div class="alert alert-error">${txt}</div>`; };
  const refrescar = () => {
    $('[data-preview]').innerHTML = resumenCierreHtml(datosEnRango(L.datos, d.ini, d.fin), d);
    if (!d.ini || !d.fin || d.ini > d.fin) return;
    const a = kcalAuto(L.ctxNutri, d.ini, d.fin, hoy);
    if (!d.kcalIniManual) { d.kcalIni = a.inicio != null ? String(a.inicio) : ''; $('[data-campo="kcalIni"]').value = d.kcalIni; }
    if (!d.kcalFinManual) { d.kcalFin = a.fin != null ? String(a.fin) : ''; $('[data-campo="kcalFin"]').value = d.kcalFin; }
    $('[data-kcal-nota]').textContent = a.texto;
  };
  capa.addEventListener('input', e => {
    const k = e.target.dataset && e.target.dataset.campo;
    if (!k) return;
    d[k] = e.target.value;
    if (k === 'kcalIni') d.kcalIniManual = true;
    if (k === 'kcalFin') d.kcalFinManual = true;
    if (k === 'ini' || k === 'fin') refrescar();
  });
  capa.addEventListener('change', e => {
    if (e.target.dataset.chk) { d[e.target.dataset.chk] = e.target.checked; refrescar(); }
    else if (e.target.matches('[data-nueva]')) {
      d.nueva = e.target.checked;
      const box = $('[data-nueva-box]'); if (box) box.style.display = d.nueva ? 'block' : 'none';
      if (csd) $('[data-confirmar]').textContent = d.nueva ? 'Siguiente →' : 'Guardar etapa';
    } else if (e.target.dataset.campo) d[e.target.dataset.campo] = e.target.value;
  });
  capa.addEventListener('click', async e => {
    if (e.target.closest('[data-cancelar]')) return cerrar();
    if (!e.target.closest('[data-confirmar]')) return;
    const msg = validarCierre({ titulo: d.titulo, ini: d.ini, fin: d.fin, nueva: d.nueva }, hoy);
    if (msg) return aviso(msg);
    const cuerpo = construirEtapa({ cliente, titulo: d.titulo, tipo: d.tipo, ini: d.ini, fin: d.fin, nota: d.nota, kIni: etNum(d.kcalIni), kFin: etNum(d.kcalFin),
      incl: { rut: d.rut !== false, med: d.med !== false, ses: d.ses !== false, kcal: d.kcal !== false }, datos: L.datos, ctx: L.ctxNutri });
    // Cliente CSD/JCTW que empieza etapa nueva: aún no se guarda nada. El paso 2 (propuesta) lo crea todo al confirmar.
    if (d.nueva && csd) {
      cerrar();
      abrirModalMacrociclo({ ctx, mesociclos: L.datos.mesociclos, rutinas: L.datos.rutinas, modo: 'crear', alTerminar, etapaBody: cuerpo, inicio: hoy,
        alVolver: () => abrirModalCerrarEtapa({ ctx, etapas, prefill: d, L, alTerminar }) });
      return;
    }
    const boton = $('[data-confirmar]');
    boton.textContent = 'Guardando...'; boton.disabled = true;
    try {
      await api.tabla('etapas', { method: 'POST', cuerpo });
    } catch (err) {
      const falta = /etapas|relation|does not exist/i.test(err.message || '');
      aviso(falta ? 'Faltan las tablas en Supabase. Cierra esto, recarga la pestaña Etapas y sigue las instrucciones (copiar SQL).' : 'Error: ' + esc(err.message));
      boton.textContent = 'Guardar etapa'; boton.disabled = false;
      return;
    }
    // Etapa guardada. Si se pidió, se cierra el bloque activo y se abre uno nuevo vacío.
    let errBloque = null;
    if (d.nueva) {
      try {
        const activo = L.datos.mesociclos.find(m => !m.fecha_fin);
        if (activo) await api.tabla('mesociclos', { method: 'PATCH', filtro: `id=eq.${activo.id}`, cuerpo: { fecha_fin: hoy } });
        await api.tabla('mesociclos', { method: 'POST', cuerpo: { cliente_id: cliente.id, numero: 1, nombre: (d.nuevoNombre || '').trim() || null, fecha_inicio: hoy, fecha_fin: null, tipo_atr: d.nuevoTipo || null } });
      } catch (e2) { errBloque = e2.message || String(e2); }
    }
    cerrar();
    if (d.nueva && !errBloque) {
      ui.alerta(`✅ Etapa «${d.titulo.trim()}» guardada y bloque «${(d.nuevoNombre || '').trim() || 'sin nombre'}» creado. Monta la rutina nueva.`);
      navegar(`clientes/${encodeURIComponent(cliente.codigo)}/rutinas`);
      return;
    }
    if (errBloque) ui.alerta(`La etapa «${d.titulo.trim()}» se guardó, pero no se pudo crear el bloque nuevo: ${errBloque}. Créalo desde Rutinas.`, 'error');
    else ui.alerta(`✅ Etapa «${d.titulo.trim()}» guardada`);
    await alTerminar();
  });
  document.addEventListener('keydown', alTecla);
  document.body.appendChild(capa);
}
