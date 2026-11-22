// Pestaña 📣 Avisos de la ficha: publicar avisos, check-ins (activar y programar), seguimiento, descarga / descanso total,
// nutrición, cuestionario de alimentos, entrenamiento anterior y suplementación.
// Tablas: avisos (lee y escribe), clientes (PATCH de los interruptores), checkin_log (PATCH, solo al activar/desactivar a mano),
// seguimiento_corporal (solo lectura, para «le toca de nuevo el…»). Los avisos al cliente salen por la función send-push.
import { avisosHtml } from './vista.js';
import { DESCANSO_MSG_DEFAULT, calcularEstadoDescarga, descansoMensajeRender } from '../core/descarga.js';
import { fechaLocalISO } from '../periodizacion/calculos.js';

export default {
  id: 'avisos',
  icono: '📣',
  etiqueta: 'Avisos',
  orden: 70,

  async montar(contenedor, ctx) {
    const { cliente, api, ui } = ctx;
    ui.cargarCss(new URL('../periodizacion/estilos.css', import.meta.url));
    const [avisos, seguimiento] = await Promise.all([
      api.tabla('avisos', { filtro: `cliente_id=eq.${cliente.id}&order=fecha.desc` }).catch(e => { console.error('No se pudieron cargar los avisos del cliente:', e); return []; }),
      api.tabla('seguimiento_corporal', { filtro: `cliente_id=eq.${cliente.id}&order=fecha.desc` }).catch(() => [])
    ]);
    const est = { avisos, seguimiento, sel: { tipoSel: 'volumen', diasSel: 7, descansoMsgSel: null } };
    const pintar = () => { contenedor.innerHTML = avisosHtml(cliente, est.avisos, est.sel, est.seguimiento); };
    pintar();
    const $ = s => contenedor.querySelector(s);

    const avisarPush = (mensaje, titulo) => api.funcion('send-push', { codigo: cliente.codigo, mensaje, titulo });
    // Push fijo al ACTIVAR una sección (nunca al desactivar). Un solo aviso cubre guardado + push.
    async function avisarActivacion(mensaje, etiqueta, titulo) {
      try { await avisarPush(mensaje, titulo); ui.alerta(`✅ ${etiqueta} y aviso enviado`); }
      catch (e) { ui.alerta(`⚠️ ${etiqueta}, pero el aviso push falló: ${e.message}`, 'error'); }
      pintar();
    }
    async function patchCliente(cuerpo) {
      await api.tabla('clientes', { method: 'PATCH', filtro: `id=eq.${cliente.id}`, cuerpo });
      ctx.actualizarCliente(cuerpo);
    }
    // Si controlas el check-in a mano, se anulan el recordatorio y el cierre automáticos (best-effort: no rompe si faltan columnas).
    function anularAutomaticos() {
      api.tabla('clientes', { method: 'PATCH', filtro: `id=eq.${cliente.id}`, cuerpo: { checkin_recordatorio_en: null, checkin_cierre_en: null } }).catch(() => {});
      api.tabla('checkin_log', { method: 'PATCH', filtro: `cliente_id=eq.${cliente.id}&resultado=is.null`, cuerpo: { resultado: 'cancelado', cerrado_en: new Date().toISOString() } }).catch(() => {});
    }

    const TOGGLES = {
      checkin: {
        campo: 'checkin_activo', auto: true,
        push: () => ['Ya tienes disponible tu check-in semanal ✅ Puedes rellenarlo cuando quieras.', 'Check-in activado', 'CHECK-IN'],
        error: e => `No se pudo cambiar el check-in.\n\n${e.message}`
      },
      checkin_simple: {
        campo: 'checkin_simple_activo', auto: true,
        push: () => [cliente.seguimiento_modo === 'perimetros' ? 'Ya tienes disponible tu check-in semanal ✅ Puedes rellenarlo cuando quieras.' : 'Ya tienes disponible tu check-in semanal ✅ Es cortito: peso, cintura y unas preguntas.', 'Check-in activado', 'CHECK-IN'],
        error: e => `No se pudo cambiar el check-in simple.\n\n${e.message}\n\n¿Has creado la columna checkin_simple_activo en Supabase?`
      },
      nutricion: { campo: 'nutricion_activa', error: e => `No se pudo cambiar la nutrición.\n\n${e.message}` },
      comparativa: { campo: 'comparativa_activa', error: e => `No se pudo cambiar el Entrenamiento anterior. Revisa que la columna comparativa_activa exista en Supabase.\n\n${e.message}` },
      suplementacion: {
        campo: 'suplementacion_activa',
        push: () => ['Tu suplementación está actualizada 💊 Échale un vistazo en la app.', 'Suplementación activada', 'SUPLEMENTACIÓN'],
        error: e => `No se pudo cambiar la suplementación. Revisa que la columna suplementacion_activa exista en Supabase.\n\n${e.message}`
      },
      cuestionario: {
        campo: 'cuestionario_alimentos_activo',
        push: () => ['Cuéntame qué alimentos no comes para ajustar tu plan 🍽 Es rápido: lo tienes en tu pantalla de inicio.', 'Cuestionario activado', 'NUTRICIÓN'],
        error: e => `No se pudo cambiar el cuestionario de alimentos.\n\n${e.message}\n\n¿Has ejecutado el SQL de las columnas nuevas en Supabase?`
      }
    };
    async function toggle(clave, nuevoValor) {
      const t = TOGGLES[clave];
      try {
        await patchCliente({ [t.campo]: nuevoValor });
        if (t.auto) anularAutomaticos();
        if (nuevoValor && t.push) { const [m, e, ti] = t.push(); await avisarActivacion(m, e, ti); }
        else pintar();
      } catch (e) { ui.alerta(t.error(e), 'error'); }
    }

    // ── Programación del check-in: nada guarda al tocar los campos; todo junto al pulsar el botón ──
    function cpModoLocal(tipo) {
      const selModo = $('#cp-modo-' + tipo), form = $('#cp-form-' + tipo), btn = $('#cp-btn-' + tipo);
      if (!selModo || !form || !btn) return;
      const progOn = selModo.dataset.on === '1', prog = selModo.value === 'programado';
      form.style.display = prog ? 'block' : 'none';
      btn.style.display = (prog || progOn) ? 'block' : 'none';
      btn.textContent = prog ? (progOn ? 'Guardar cambios' : 'Programar') : 'Quitar programación';
    }
    async function cpGuardar(tipo) {
      const selModo = $('#cp-modo-' + tipo);
      if (!selModo) return;
      try {
        let cuerpo;
        if (selModo.value === 'programado') {
          const hora = String($('#cp-hora-' + tipo).value || '').trim();
          if (!/^\d{2}:\d{2}$/.test(hora)) { ui.alerta('Pon una hora válida para programar el check-in.', 'error'); return; }
          cuerpo = {
            checkin_prog_activo: true, checkin_prog_tipo: tipo,
            checkin_prog_dia: parseInt($('#cp-dia-' + tipo).value, 10), checkin_prog_hora: hora, checkin_prog_repetir: !!$('#cp-rep-' + tipo).checked,
            // Al guardar una programación nueva se borra el último envío, para que no la bloquee la regla de «un envío por día».
            checkin_prog_ultimo_envio: null
          };
        } else cuerpo = { checkin_prog_activo: false };
        await patchCliente(cuerpo);
        pintar();
      } catch (e) { ui.alerta('No se pudo guardar la programación del check-in.\n\n' + e.message, 'error'); }
    }

    // ── Descarga / descanso total ──
    function actualizarPreviewDescanso() {
      const ta = $('#descansoMsgInput'), pv = $('#descansoPreview');
      if (!ta || !pv) return;
      est.sel.descansoMsgSel = ta.value;
      let fin = cliente.descarga_fin;
      if (!calcularEstadoDescarga(cliente)) {
        const di = $('#descargaDiasInput');
        const d = new Date(); d.setDate(d.getDate() + Math.max(1, parseInt(di && di.value) || 7) - 1);
        fin = fechaLocalISO(d);
      }
      pv.textContent = descansoMensajeRender(ta.value, cliente.nombre, fin);
    }
    async function activarDescarga() {
      const tipo = $('#descargaTipoInput').value, dias = $('#descargaDiasInput').value;
      try {
        const nDias = Math.max(1, parseInt(dias) || 7);
        const fin = new Date();
        // Descanso total: «3 días» = hoy + 2 más (el cliente vuelve al 4.º día). Resto de tipos: comportamiento de siempre.
        fin.setDate(fin.getDate() + (tipo === 'completa' ? nDias - 1 : nDias));
        const cuerpo = { modo_descarga: true, tipo_descarga: tipo, descarga_fin: fechaLocalISO(fin) };
        if (tipo === 'completa') {
          const ta = $('#descansoMsgInput');
          const custom = String(ta ? ta.value : (est.sel.descansoMsgSel || '')).trim();
          if (custom && custom !== DESCANSO_MSG_DEFAULT.trim()) cuerpo.mensaje_descanso = custom;
          else if ('mensaje_descanso' in cliente) cuerpo.mensaje_descanso = null; // mensaje fijo
        }
        await patchCliente(cuerpo);
        est.sel.descansoMsgSel = null;
        pintar();
      } catch (e) {
        ui.alerta('No se pudo activar la descarga. Revisa que existan las columnas modo_descarga/tipo_descarga/descarga_fin' + (tipo === 'completa' ? '/mensaje_descanso' : '') + ' en Supabase.\n\n' + e.message, 'error');
      }
    }
    async function guardarMensajeDescanso() {
      const ta = $('#descansoMsgInput'); if (!ta) return;
      const txt = ta.value.trim();
      const valor = (!txt || txt === DESCANSO_MSG_DEFAULT.trim()) ? null : txt;
      try { await patchCliente({ mensaje_descanso: valor }); est.sel.descansoMsgSel = null; pintar(); }
      catch (e) { ui.alerta('No se pudo guardar el mensaje. Revisa que exista la columna mensaje_descanso en Supabase.\n\n' + e.message, 'error'); }
    }

    contenedor.addEventListener('input', e => {
      if (e.target.matches('#descansoMsgInput, #descargaDiasInput')) {
        if (e.target.id === 'descargaDiasInput') est.sel.diasSel = e.target.value;
        actualizarPreviewDescanso();
      }
    });
    contenedor.addEventListener('change', async e => {
      const t = e.target;
      if (t.matches('[data-cp-modo]')) return cpModoLocal(t.dataset.cpModo);
      if (t.id === 'descargaTipoInput') { est.sel.diasSel = $('#descargaDiasInput').value; est.sel.tipoSel = t.value; pintar(); return; }
      if (t.id === 'descargaDiasInput') { est.sel.diasSel = t.value; return; }
      if (t.matches('[data-modo-seguimiento]')) {
        try { await patchCliente({ seguimiento_modo: t.value || null }); pintar(); }
        catch (err) { ui.alerta('No se pudo guardar el modo de seguimiento.\n\n' + err.message + '\n\n¿Has creado la columna seguimiento_modo en Supabase?', 'error'); }
        return;
      }
      if (t.matches('[data-frecuencia]')) {
        try { await patchCliente({ frecuencia_seguimiento_semanas: parseInt(t.value, 10) }); pintar(); } // repinta para que «le toca de nuevo el…» use la frecuencia nueva
        catch (err) { ui.alerta('No se pudo cambiar la frecuencia de medidas/fotos.\n\n' + err.message, 'error'); }
      }
    });
    contenedor.addEventListener('click', async e => {
      const t = e.target;
      const tg = t.closest('[data-toggle]');
      if (tg) { e.preventDefault(); return toggle(tg.dataset.toggle, tg.dataset.valor === '1'); }
      const cp = t.closest('[data-cp-guardar]');
      if (cp) return cpGuardar(cp.dataset.cpGuardar);
      const del = t.closest('[data-borrar-aviso]');
      if (del) {
        try {
          await api.tabla('avisos', { method: 'DELETE', filtro: `id=eq.${del.dataset.borrarAviso}` });
          est.avisos = est.avisos.filter(a => String(a.id) !== String(del.dataset.borrarAviso));
          ui.alerta('✅ Aviso borrado'); pintar();
        } catch (err) { ui.alerta(`❌ No se pudo borrar el aviso: ${err.message}`, 'error'); }
        return;
      }
      const acc = t.closest('[data-accion]');
      if (!acc) return;
      switch (acc.dataset.accion) {
        case 'publicar-aviso': {
          const texto = $('#avisoTexto').value.trim();
          if (!texto) return ui.alerta('Escribe algo antes de publicar.', 'error');
          try { await api.tabla('avisos', { method: 'POST', cuerpo: { cliente_id: cliente.id, texto } }); }
          catch (err) { ui.alerta('Error al publicar el aviso: ' + err.message, 'error'); return; }
          $('#avisoTexto').value = '';
          est.avisos = await api.tabla('avisos', { filtro: `cliente_id=eq.${cliente.id}&order=fecha.desc` }).catch(() => est.avisos);
          try { await avisarPush(texto, 'NUEVO AVISO'); ui.alerta('✅ Aviso publicado y enviado como notificación'); }
          catch (err) { ui.alerta(`⚠️ Aviso publicado, pero la notificación push falló: ${err.message}`, 'error'); }
          pintar();
          return;
        }
        case 'borrar-historial': {
          const ok = await ui.confirmar('⚠️ ¿Borrar TODO el historial de avisos de este cliente?\n\nEsta acción no se puede deshacer.', { titulo: 'Borrar historial de avisos', aceptar: 'Borrar todo', peligro: true });
          if (!ok) return;
          try {
            await api.tabla('avisos', { method: 'DELETE', filtro: `cliente_id=eq.${cliente.id}` });
            est.avisos = []; ui.alerta('✅ Historial de avisos borrado'); pintar();
          } catch (err) { ui.alerta(`❌ Error al borrar: ${err.message}`, 'error'); }
          return;
        }
        case 'activar-descarga': return activarDescarga();
        case 'desactivar-descarga':
          try { await patchCliente({ modo_descarga: false }); pintar(); }
          catch (err) { ui.alerta('No se pudo desactivar la descarga.\n\n' + err.message, 'error'); }
          return;
        case 'guardar-mensaje': return guardarMensajeDescanso();
        case 'restaurar-mensaje': { const ta = $('#descansoMsgInput'); if (ta) { ta.value = DESCANSO_MSG_DEFAULT; actualizarPreviewDescanso(); } }
      }
    });
    return {};
  }
};
