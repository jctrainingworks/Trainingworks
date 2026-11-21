// Pestaña 🏁 Etapas de la ficha: copias guardadas de lo hecho entre dos fechas (rutinas, medidas, sesiones, calorías).
// Tablas: etapas (escribe), mesociclos/rutinas/ejercicios/sesiones/seguimiento_corporal (solo lectura para copiar),
// planes_nutricion y nutricion_historial (solo lectura, para las calorías). Si falta `etapas`, enseña el SQL.
import { abrirModalCerrarEtapa } from './cierre.js';
import { detalleEtapaHtml } from './detalle.js';
import { cargandoHtml, errorTablasHtml, listaEtapasHtml } from './vista.js';
import { ETAPAS_SQL } from './calculos.js';

export default {
  id: 'etapas',
  icono: '🏁',
  etiqueta: 'Etapas',
  orden: 47,

  async montar(contenedor, ctx) {
    const { cliente, api, ui, navegar } = ctx;
    ui.cargarCss(new URL('../periodizacion/estilos.css', import.meta.url));
    ui.cargarCss(new URL('./estilos.css', import.meta.url));
    const est = { lista: [], error: null, detalle: null, seccion: 'resumen', filtroEj: 'todos' };

    let primera = true;
    async function cargar() {
      contenedor.innerHTML = cargandoHtml();
      try {
        est.lista = await api.tabla('etapas', { select: 'id,cliente_id,titulo,tipo,fecha_inicio,fecha_fin,nota,kcal_inicio,kcal_fin,created_at', filtro: `cliente_id=eq.${cliente.id}&order=fecha_inicio.desc` });
        est.error = null;
      } catch (e) { est.lista = []; est.error = e.message || String(e); }
      pintar();
      if (!primera && ctx.refrescarFicha) await ctx.refrescarFicha(); // tras guardar o borrar, la franja de la ficha se actualiza
      primera = false;
    }
    const pintar = () => {
      contenedor.innerHTML = est.error ? errorTablasHtml(est.error) : (est.detalle ? detalleEtapaHtml(est.detalle, est.seccion, est.filtroEj) : listaEtapasHtml(cliente, est.lista));
    };

    const abrirCierre = () => abrirModalCerrarEtapa({ ctx, etapas: est.lista, alTerminar: cargar });

    contenedor.addEventListener('click', async e => {
      const sec = e.target.closest('[data-seccion]');
      if (sec) { est.seccion = sec.dataset.seccion; pintar(); return; }
      const fil = e.target.closest('[data-filtro-ej]');
      if (fil) { est.filtroEj = fil.dataset.filtroEj; pintar(); return; }
      const el = e.target.closest('[data-accion]');
      if (!el) return;
      switch (el.dataset.accion) {
        case 'cerrar-etapa': return abrirCierre();
        case 'ver-etapa': {
          if (e.target.closest('[data-accion="borrar-etapa"]')) break;
          try {
            const r = await api.tabla('etapas', { filtro: `id=eq.${el.dataset.id}`, unico: true });
            if (r && r[0]) { est.detalle = r[0]; est.seccion = 'resumen'; est.filtroEj = 'todos'; pintar(); window.scrollTo(0, 0); }
          } catch (err) { ui.alerta('No se pudo abrir la etapa: ' + err.message, 'error'); }
          return;
        }
        case 'volver-etapas': est.detalle = null; return pintar();
        case 'reintentar': return cargar();
        case 'copiar-sql':
          try { await navigator.clipboard.writeText(ETAPAS_SQL); ui.alerta('✅ SQL copiado. Pégalo en el SQL Editor de Supabase y ejecútalo.'); }
          catch (err) { ui.alerta('No se pudo copiar. Selecciona el texto a mano.', 'error'); }
          return;
        case 'borrar-etapa': {
          const ok = await ui.confirmar('¿Borrar esta etapa guardada?\n\nSolo se borra la copia. Las rutinas, medidas y sesiones originales del cliente no se tocan.', { titulo: 'Borrar etapa', aceptar: 'Borrar', peligro: true });
          if (!ok) return;
          try { await api.tabla('etapas', { method: 'DELETE', filtro: `id=eq.${el.dataset.id}` }); est.detalle = null; ui.alerta('✅ Etapa borrada'); await cargar(); }
          catch (err) { ui.alerta('No se pudo borrar: ' + err.message, 'error'); }
        }
      }
    });
    await cargar();
    return {};
  }
};
