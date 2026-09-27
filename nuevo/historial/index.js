// Pestaña 📊 Historial de la ficha (vista Entrenos; el seguimiento corporal vive en la pestaña
// Cuerpo). Aviso de estancamiento/bajada, gráficas de progreso, filtro por mesociclo/ejercicio,
// lista de sesiones agrupada por día, marcar descarga, borrar, cambiar ejercicio de una sesión y
// registrar una sesión pasada. Tablas: sesiones, rutinas, ejercicios, mesociclos.
import { crearGraficas } from '../core/graficas.js';
import {
  mesocicloMapsDeCliente, mesocicloPorDefecto, rutinaIdsDeMesociclo, construirDatosGraficasEntreno,
  claveEjercicioRutina, detectarEstancamiento
} from './calculos.js';
import { avisosHtml, controlesHtml, graficasHtml, sesionesHtml } from './vista.js';
import { abrirModalCambiarEjercicio } from './modalCambiarEjercicio.js';
import { abrirModalSesionPasada } from './modalSesionPasada.js';

const DIAS_INICIALES = 14;

export default {
  id: 'historial',
  icono: '📊',
  etiqueta: 'Historial',
  orden: 40,

  async montar(contenedor, ctx) {
    const { cliente, api, ui } = ctx;

    const [sesionesRaw, rutinas, mesociclos] = await Promise.all([
      api.tabla('sesiones', { filtro: `codigo_cliente=eq.${cliente.codigo}&order=fecha.desc` }),
      api.tabla('rutinas', { filtro: `cliente_id=eq.${cliente.id}&order=orden.asc` }),
      api.tabla('mesociclos', { filtro: `cliente_id=eq.${cliente.id}&order=numero.asc` })
    ]);
    const ejercicios = rutinas.length
      ? await api.tabla('ejercicios', { filtro: `rutina_id=in.(${rutinas.map(r => r.id).join(',')})&order=orden.asc` })
      : [];
    const est = {
      historial: sesionesRaw.map(s => ({ id: s.id, fecha: s.fecha, ejercicio: s.ejercicio, series: s.series_detalle, rutina_id: s.rutina_id ?? null, en_descarga: !!s.en_descarga })),
      rutinas, mesociclos, ejercicios,
      filtroMesociclo: null, // null = sin decidir (se autoselecciona el activo)
      filtroEj: '', abiertos: {}, diasVisibles: DIAS_INICIALES
    };
    const graficas = crearGraficas();
    let bibliotecaPromesa = null;
    const cargarBiblioteca = () => bibliotecaPromesa
      || (bibliotecaPromesa = api.tabla('ejercicios_biblioteca', { filtro: 'order=nombre_es.asc' }).catch(e => { bibliotecaPromesa = null; throw e; }));

    if (!est.historial.length) {
      contenedor.innerHTML = `
        <div style="margin-bottom:16px;"><button class="btn btn-primary" data-accion="sesion-nueva">📝 Registrar sesión pasada</button></div>
        <div class="empty">No hay sesiones registradas 📊</div>`;
      contenedor.addEventListener('click', e => { if (e.target.closest('[data-accion="sesion-nueva"]')) abrirSesionPasada(); });
      return {};
    }

    // Sesión anterior del MISMO ejercicio+rutina (por fecha ascendente), sobre el historial completo.
    function construirSesionAnteriorMap() {
      const mapa = new Map();
      const porEjercicio = {};
      [...est.historial].sort((a, b) => (a.fecha ? new Date(a.fecha) : new Date(0)) - (b.fecha ? new Date(b.fecha) : new Date(0)))
        .forEach(s => { if (!s.ejercicio) return; const c = claveEjercicioRutina(s); (porEjercicio[c] = porEjercicio[c] || []).push(s); });
      Object.values(porEjercicio).forEach(lista => { for (let i = 1; i < lista.length; i++) mapa.set(lista[i], lista[i - 1]); });
      return mapa;
    }

    function pintar() {
      const sesionAnteriorMap = construirSesionAnteriorMap();
      const { rutinaMesocicloMap, mesocicloNombreMap, rutinaNombreMap } = mesocicloMapsDeCliente(est.rutinas, est.mesociclos);
      const rutinaCardioIds = new Set(est.rutinas.filter(r => r.es_cardio).map(r => String(r.id)));
      const { ejerciciosEstancados, ejerciciosEnBajada } = detectarEstancamiento(est.historial, sesionAnteriorMap, rutinaMesocicloMap, rutinaNombreMap, rutinaCardioIds);

      const mesocicloActivo = est.mesociclos.find(m => !m.fecha_fin) || null;
      const filtroMesociclo = est.filtroMesociclo != null ? est.filtroMesociclo : mesocicloPorDefecto(est.mesociclos);
      const mostrarMarcasDeCorte = filtroMesociclo === 'todos' && est.mesociclos.length > 0;
      const rutinaIdsFiltro = rutinaIdsDeMesociclo(est.rutinas, filtroMesociclo);
      const historialPorMesociclo = rutinaIdsFiltro ? est.historial.filter(s => s.rutina_id != null && rutinaIdsFiltro.has(String(s.rutina_id))) : est.historial;
      const ejerciciosDisponibles = Array.from(new Set(historialPorMesociclo.map(s => s.ejercicio).filter(Boolean))).sort();
      const historial = est.filtroEj ? historialPorMesociclo.filter(s => s.ejercicio === est.filtroEj) : historialPorMesociclo;
      // Las gráficas de Progreso muestran siempre el histórico completo del bloque filtrado; el filtro
      // de ejercicio sí les aplica (si no, "Press banca" mostraría también las gráficas de los demás).
      const historialParaCharts = historial;

      const exerciseMap = construirDatosGraficasEntreno(historialParaCharts, mostrarMarcasDeCorte ? rutinaMesocicloMap : null, mostrarMarcasDeCorte ? mesocicloNombreMap : null, rutinaNombreMap);
      const exercisesWithData = Object.entries(exerciseMap).map(([nombre, data]) => ({
        nombre, data: data.sort((a, b) => (a.fecha ? new Date(a.fecha) : new Date(0)) - (b.fecha ? new Date(b.fecha) : new Date(0)))
      })).filter(e => e.data.some(d => d.peso > 0));

      const hoy = new Date();
      const limiteFecha = new Date(hoy); limiteFecha.setDate(hoy.getDate() - est.diasVisibles);
      const historialOrdenado = [...historial].sort((a, b) => (b.fecha ? new Date(b.fecha) : new Date(0)) - (a.fecha ? new Date(a.fecha) : new Date(0)));
      const grupos = {}, ordenClaves = [];
      historialOrdenado.forEach(s => {
        const clave = s.fecha ? new Date(s.fecha).toISOString().slice(0, 10) : 'sin-fecha';
        if (!grupos[clave]) { grupos[clave] = { fechaObj: s.fecha ? new Date(s.fecha) : null, sesiones: [] }; ordenClaves.push(clave); }
        grupos[clave].sesiones.push(s);
      });
      const clavesRecientes = ordenClaves.filter(c => c === 'sin-fecha' || grupos[c].fechaObj >= limiteFecha);
      const clavesAntiguas = ordenClaves.filter(c => !clavesRecientes.includes(c));
      const nombreMesocicloFiltro = filtroMesociclo !== 'todos' ? mesocicloNombreMap.get(String(filtroMesociclo)) : '';
      const etiquetaFiltro = [nombreMesocicloFiltro, est.filtroEj].filter(Boolean).join(' — ');

      contenedor.innerHTML = `
        <div style="margin-bottom:16px;"><button class="btn btn-primary" data-accion="sesion-nueva">📝 Registrar sesión pasada</button></div>
        ${avisosHtml(ejerciciosEstancados, ejerciciosEnBajada)}
        ${controlesHtml(est.mesociclos, mesocicloActivo && mesocicloActivo.id, filtroMesociclo, ejerciciosDisponibles, est.filtroEj, mostrarMarcasDeCorte)}
        ${graficasHtml(exercisesWithData)}
        ${sesionesHtml({ clavesRecientes, clavesAntiguas, grupos, sesionesAbiertas: est.abiertos, sesionAnteriorMap, etiquetaFiltro })}`;

      graficas.destruirTodas();
      exercisesWithData.forEach(ex => {
        const base = ex.nombre.replace(/[^a-zA-Z0-9]/g, '_');
        const marcas = ex.data.map((d, i) => {
          if (i === 0) return null;
          const prev = ex.data[i - 1];
          return d.mesociclo_id && prev.mesociclo_id && d.mesociclo_id !== prev.mesociclo_id ? d.mesociclo_nombre : null;
        });
        const etiquetas = ex.data.map(d => (d.fecha ? new Date(d.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' }) : ''));
        const flags = ex.data.map(d => !!d.en_descarga);
        if (exercisesWithData.length === 1) {
          [['peso', 'peso', 'kg'], ['reps', 'reps', ''], ['series', 'numSeries', '']].forEach(([sufijo, campo, unidad]) => {
            const id = `${sufijo}_${base}`;
            const canvas = contenedor.querySelector(`[data-canvas="${id}"]`);
            const valores = ex.data.map(d => d[campo]);
            graficas.metrica(canvas, etiquetas, valores, sufijo === 'peso' ? '#3b82f6' : sufijo === 'reps' ? '#22c55e' : '#f59e0b', unidad, flags, marcas);
            const resumen = contenedor.querySelector(`[data-resumen="${id}"]`);
            if (resumen) resumen.textContent = `ÚLTIMO: ${valores[valores.length - 1]}${unidad} | MÁXIMO: ${Math.max(...valores)}${unidad}`;
          });
        } else {
          const canvas = contenedor.querySelector(`[data-canvas="${base}"]`);
          const valores = ex.data.map(d => d.peso);
          graficas.metrica(canvas, etiquetas, valores, '#3b82f6', 'kg', flags, marcas);
          const resumen = contenedor.querySelector(`[data-resumen="${base}"]`);
          if (resumen) resumen.textContent = `ÚLTIMO: ${valores[valores.length - 1]}kg | MÁXIMO: ${Math.max(...valores)}kg`;
        }
      });
    }
    pintar();

    // ── Acciones ──
    async function abrirSesionPasada() {
      if (!est.rutinas.length) { ui.alerta('Este cliente no tiene rutinas creadas todavía.', 'error'); return; }
      const ok = await abrirModalSesionPasada({
        nombreCliente: cliente.nombre,
        rutinas: est.rutinas.map(r => ({ id: r.id, nombre: r.nombre })),
        ejerciciosPorRutina: rid => est.ejercicios.filter(e => String(e.rutina_id) === String(rid)).sort((a, b) => (a.orden || 0) - (b.orden || 0)),
        alEnviar: async (paquetes, fechaSesion, rutinaId) => {
          for (const { ejercicio, texto } of paquetes) {
            await api.rpc('insertar_sesion_cliente', {
              p_codigo: cliente.codigo, p_rutina_id: rutinaId, p_ejercicio_id: ejercicio.id,
              p_ejercicio: ejercicio.nombre, p_series_detalle: texto, p_fecha: fechaSesion
            });
          }
          const tras = await api.tabla('sesiones', { filtro: `codigo_cliente=eq.${cliente.codigo}&order=fecha.desc` });
          est.historial = tras.map(s => ({ id: s.id, fecha: s.fecha, ejercicio: s.ejercicio, series: s.series_detalle, rutina_id: s.rutina_id ?? null, en_descarga: !!s.en_descarga }));
        }
      });
      if (ok) { pintar(); ui.alerta('✅ Sesión registrada'); }
    }

    async function cambiarEjercicioSesion(id, nombreActual) {
      let biblioteca = [];
      try { biblioteca = await cargarBiblioteca(); } catch (e) { ui.alerta('No se pudo cargar tu biblioteca (puedes escribir el nombre a mano): ' + e.message, 'error'); }
      const ok = await abrirModalCambiarEjercicio({
        nombreActual, biblioteca,
        alEnviar: async nuevoNombre => {
          await api.tabla('sesiones', { method: 'PATCH', filtro: `id=eq.${id}`, cuerpo: { ejercicio: nuevoNombre } });
          const s = est.historial.find(x => String(x.id) === String(id));
          if (s) s.ejercicio = nuevoNombre;
        }
      });
      if (ok) { pintar(); ui.alerta('✅ Ejercicio cambiado'); }
    }

    async function toggleDescarga(ids, marcadoActualmente) {
      const nuevoValor = !marcadoActualmente;
      try {
        await api.rpc('marcar_sesiones_descarga', { p_ids: ids, p_valor: nuevoValor });
        est.historial.forEach(s => { if (ids.includes(String(s.id))) s.en_descarga = nuevoValor; });
        pintar();
      } catch (e) {
        ui.alerta('No se pudo actualizar: ' + e.message, 'error');
      }
    }

    async function borrarSesion(id) {
      if (!await ui.confirmar('¿Borrar esta sesión de entreno? Esta acción no se puede deshacer.', { titulo: 'Borrar sesión', aceptar: 'Borrar', peligro: true })) return;
      try {
        await api.tabla('sesiones', { method: 'DELETE', filtro: `id=eq.${id}` });
        est.historial = est.historial.filter(s => String(s.id) !== String(id));
        pintar();
      } catch (e) {
        ui.alerta('No se pudo borrar la sesión: ' + e.message, 'error');
      }
    }

    async function borrarGrupo(ids) {
      if (!await ui.confirmar(`¿Borrar las ${ids.length} sesión(es) de ese día? Esta acción no se puede deshacer.`, { titulo: 'Borrar sesiones', aceptar: 'Borrar', peligro: true })) return;
      try {
        await api.tabla('sesiones', { method: 'DELETE', filtro: `id=in.(${ids.join(',')})` });
        const idsSet = new Set(ids);
        est.historial = est.historial.filter(s => !idsSet.has(String(s.id)));
        pintar();
      } catch (e) {
        ui.alerta('No se pudo borrar ese día: ' + e.message, 'error');
      }
    }

    contenedor.addEventListener('click', e => {
      const boton = e.target.closest('[data-accion]');
      if (boton) {
        const a = boton.dataset.accion;
        if (a === 'sesion-nueva') abrirSesionPasada();
        else if (a === 'sesion-cambiar-ej') cambiarEjercicioSesion(boton.dataset.id, boton.dataset.nombre);
        else if (a === 'sesion-descarga') toggleDescarga([boton.dataset.id], boton.dataset.marcado === '1');
        else if (a === 'sesion-borrar') borrarSesion(boton.dataset.id);
        else if (a === 'grupo-descarga') toggleDescarga(boton.dataset.ids.split(','), boton.dataset.marcado === '1');
        else if (a === 'grupo-borrar') borrarGrupo(boton.dataset.ids.split(','));
        else if (a === 'mas-antiguo') { est.diasVisibles += 30; pintar(); }
        return;
      }
      const dia = e.target.closest('[data-toggle-dia]');
      if (dia) {
        const clave = dia.dataset.toggleDia;
        est.abiertos = { ...est.abiertos, [clave]: !est.abiertos[clave] };
        pintar();
      }
    });

    contenedor.addEventListener('change', e => {
      if (e.target.matches('[data-sel="mesociclo"]')) { est.filtroMesociclo = e.target.value; pintar(); }
      else if (e.target.matches('[data-sel="ejercicio"]')) { est.filtroEj = e.target.value; pintar(); }
    });

    return { desmontar() { graficas.destruirTodas(); } };
  }
};
