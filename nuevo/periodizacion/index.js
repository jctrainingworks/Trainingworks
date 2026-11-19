// Pestaña 🧭 Periodización de la ficha: dónde está el cliente (fase y semana), modelo (ATR / CSD / JCTW),
// línea de tiempo con eventos, sugerencias, músculos en sobrecarga, macrociclo anual y rangos propios.
// Tablas: clientes (modelo_periodizacion, fecha_inicio_macrociclo, fecha_competicion, eventos_periodizacion,
// rangos_propios), mesociclos (musculos_sobrecarga), rutinas, sesiones (solo lectura, para las sugerencias).
import { periodizacionHtml } from './vista.js';
import { abrirModalMacrociclo, quitarMacrocicloAnual } from './macrociclo.js';
import { CSD_ORDEN } from '../core/atr.js';
import { nombreModelo, crearEvento, validarRangosPropios, estadoProgresoCliente, CSD_RANGOS_INFORMATIVOS, TAMANO_GRUPO_MUSCULAR, MUSCULOS_PROPIOS } from './calculos.js';

export default {
  id: 'periodizacion',
  icono: '🧭',
  etiqueta: 'Periodización',
  orden: 25,

  async montar(contenedor, ctx) {
    const { cliente, api, ui } = ctx;
    ui.cargarCss(new URL('./estilos.css', import.meta.url));
    const est = { cliente, mesociclos: [], rutinas: [], progreso: { estancados: [], enBajada: [] }, modeloPend: null };

    async function cargar() {
      const [mesociclos, rutinas, sesiones] = await Promise.all([
        api.tabla('mesociclos', { filtro: `cliente_id=eq.${cliente.id}&order=numero.asc` }).catch(() => []),
        api.tabla('rutinas', { filtro: `cliente_id=eq.${cliente.id}&order=orden.asc` }).catch(() => []),
        api.tabla('sesiones', { filtro: `codigo_cliente=eq.${cliente.codigo}&order=fecha.desc` }).catch(() => [])
      ]);
      est.mesociclos = mesociclos; est.rutinas = rutinas;
      const historial = sesiones.map(s => ({ id: s.id, fecha: s.fecha, ejercicio: s.ejercicio, series: s.series_detalle, rutina_id: s.rutina_id ?? null, en_descarga: !!s.en_descarga }));
      est.progreso = estadoProgresoCliente(rutinas, mesociclos, historial);
    }
    const pintar = () => { contenedor.innerHTML = periodizacionHtml(est); };
    await cargar();
    pintar();

    const $ = s => contenedor.querySelector(s);
    async function guardarCliente(cuerpo, ok, errTxt) {
      try {
        await api.tabla('clientes', { method: 'PATCH', filtro: `id=eq.${cliente.id}`, cuerpo });
        ctx.actualizarCliente(cuerpo);
        ui.alerta(ok);
      } catch (e) { ui.alerta(`${errTxt}: ${e.message}`, 'error'); }
      pintar();
    }
    const recargar = async () => { await cargar(); pintar(); };
    const eventos = () => (Array.isArray(cliente.eventos_periodizacion) ? cliente.eventos_periodizacion : []);

    contenedor.addEventListener('change', e => {
      if (e.target.matches('[data-modelo-sel]')) { est.modeloPend = e.target.value; pintar(); }
    });
    contenedor.addEventListener('click', async e => {
      const el = e.target.closest('[data-accion]');
      if (!el) return;
      switch (el.dataset.accion) {
        case 'guardar-modelo': {
          const modelo = $('[data-modelo-sel]').value || 'ATR';
          est.modeloPend = null;
          return guardarCliente({ modelo_periodizacion: modelo }, `✅ Modelo de periodización guardado (${nombreModelo(modelo)})`, 'Error al guardar el modelo');
        }
        case 'guardar-fecha-macrociclo':
          return guardarCliente({ fecha_inicio_macrociclo: $('#fechaInicioMacrocicloInput').value || null }, '✅ Fecha de inicio guardada', 'Error al guardar la fecha');
        case 'guardar-fecha-competicion':
          return guardarCliente({ fecha_competicion: $('#fechaCompeticionInput').value || null }, '✅ Fecha de competición guardada', 'No se pudo guardar la fecha (¿existe la columna fecha_competicion?)');
        case 'crear-macrociclo':
          return abrirModalMacrociclo({ ctx, mesociclos: est.mesociclos, rutinas: est.rutinas, modo: 'crear', alTerminar: recargar });
        case 'editar-macrociclo':
          return abrirModalMacrociclo({ ctx, mesociclos: est.mesociclos, rutinas: est.rutinas, modo: 'regenerar', alTerminar: recargar });
        case 'quitar-macrociclo':
          return quitarMacrocicloAnual({ ctx, mesociclos: est.mesociclos, rutinas: est.rutinas, alTerminar: recargar });
        case 'toggle-sobrecarga': {
          const meso = est.mesociclos.find(x => String(x.id) === el.dataset.meso);
          if (!meso) return;
          const act = Array.isArray(meso.musculos_sobrecarga) ? meso.musculos_sobrecarga.slice() : [];
          const i = act.indexOf(el.dataset.musculo);
          if (i >= 0) act.splice(i, 1); else act.push(el.dataset.musculo);
          try {
            await api.tabla('mesociclos', { method: 'PATCH', filtro: `id=eq.${meso.id}`, cuerpo: { musculos_sobrecarga: act } });
            meso.musculos_sobrecarga = act;
          } catch (err) { ui.alerta(`No se pudo guardar los músculos de sobrecarga: ${err.message}`, 'error'); }
          return pintar();
        }
        case 'anadir-evento': {
          const g = id => ($('#' + id) || {}).value || '';
          const r = crearEvento({ tipo: g('evTipo'), titulo: g('evTitulo'), desde: g('evDesde'), hasta: g('evHasta') });
          if (r.error) { $('#evMsg').textContent = r.error; return; }
          return guardarCliente({ eventos_periodizacion: eventos().concat([r.evento]) }, '✅ Evento añadido', 'No se pudo guardar el evento (¿existe la columna eventos_periodizacion?)');
        }
        case 'borrar-evento':
          return guardarCliente({ eventos_periodizacion: eventos().filter(x => x.id !== el.dataset.id) }, 'Evento quitado', 'No se pudo quitar el evento');
        case 'guardar-rangos': {
          // id = rp_<musculo>_<fase>_<a|b> → clave '<musculo>_<fase>_<a|b>'
          const v = {}; contenedor.querySelectorAll('input[id^="rp_"]').forEach(i => { v[i.id.slice(3)] = i.value; });
          contenedor.querySelectorAll('input[id^="rp_"]').forEach(i => { i.style.borderColor = '#34405A'; });
          const { rangos, malos } = validarRangosPropios(v, CSD_ORDEN);
          if (malos.length) {
            malos.forEach(x => ['a', 'b'].forEach(l => { const i = $(`#rp_${x.k}_${x.fase}_${l}`); if (i) i.style.borderColor = '#ef4444'; }));
            $('#rpMsg').textContent = 'Revisa (ambos números y mín ≤ máx): ' + malos.map(x => x.texto).join(', ');
            return;
          }
          return guardarCliente({ rangos_propios: rangos }, '✅ Rangos guardados', 'No se pudieron guardar los rangos (¿existe la columna rangos_propios?)');
        }
        case 'rangos-roberto':
          MUSCULOS_PROPIOS.forEach(([k]) => {
            const tam = TAMANO_GRUPO_MUSCULAR[k]; if (!tam) return;
            CSD_ORDEN.forEach(fase => {
              const r = String(CSD_RANGOS_INFORMATIVOS[fase][tam]).split('-');
              const a = $(`#rp_${k}_${fase}_a`), b = $(`#rp_${k}_${fase}_b`);
              if (a && b) { a.value = r[0]; b.value = r[1]; }
            });
          });
          $('#rpMsg').textContent = 'Rellenado con los de Roberto: ajusta lo que quieras y pulsa Guardar rangos.';
          return;
        case 'rangos-vaciar':
          contenedor.querySelectorAll('input[id^="rp_"]').forEach(i => { i.value = ''; i.style.borderColor = '#34405A'; });
          $('#rpMsg').textContent = 'Vacío: pulsa Guardar rangos para confirmarlo.';
      }
    });
    return {};
  }
};
