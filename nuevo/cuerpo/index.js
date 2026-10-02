// Pestaña 📏 Cuerpo de la ficha: seguimiento corporal (peso + perímetros + composición + check-ins),
// lectura rápida de tendencia, veredicto y gráficas por categoría. Antes era una sub-vista de Historial
// y las medidas se rellenaban en Nutrición; aquí vive todo junto.
// Tablas: seguimiento_corporal, planes_nutricion (solo objetivo_calorico), sesiones/rutinas/mesociclos
// (solo para la "fuerza" de la lectura rápida).
import { crearGraficas } from '../core/graficas.js';
import { CAMPOS_SEGUIMIENTO, calcularComposicionDesdeEntry, fuerzaDeCliente } from './calculos.js';
import { lecturaRapidaHtml } from './lecturaRapida.js';
import { seguimientoHtml, vacioHtml, serieDeCampo, formatDateShort } from './vista.js';
import { abrirModalRegistro } from './modalRegistro.js';

const porFecha = (a, b) => new Date(a.fecha) - new Date(b.fecha);

export default {
  id: 'cuerpo',
  icono: '📏',
  etiqueta: 'Cuerpo',
  orden: 50,

  async montar(contenedor, ctx) {
    const { cliente, api, ui } = ctx;
    ctx.ui.cargarCss(new URL('./estilos.css', import.meta.url));

    const cargarSeguimiento = async () =>
      (await api.tabla('seguimiento_corporal', { filtro: `cliente_id=eq.${cliente.id}&order=fecha.asc` })).slice().sort(porFecha);

    let datos;
    try {
      datos = await cargarSeguimiento();
    } catch (e) {
      contenedor.innerHTML = `<div class="alert alert-error">No se pudo cargar el seguimiento corporal: ${ui.esc(e.message)}</div>`;
      return {};
    }

    // Lo demás es apoyo: si falla, la pestaña funciona igual y se avisa dentro de la lectura rápida.
    const [planes, sesiones, rutinas, mesociclos] = await Promise.all([
      api.tabla('planes_nutricion', { select: 'objetivo_calorico', filtro: `cliente_id=eq.${cliente.id}`, unico: true }).catch(() => []),
      api.tabla('sesiones', { select: 'fecha,ejercicio,series_detalle,rutina_id', filtro: `codigo_cliente=eq.${cliente.codigo}&order=fecha.desc` }).catch(() => null),
      api.tabla('rutinas', { filtro: `cliente_id=eq.${cliente.id}&order=orden.asc` }).catch(() => null),
      api.tabla('mesociclos', { filtro: `cliente_id=eq.${cliente.id}&order=numero.asc` }).catch(() => null)
    ]);
    const fuerzaFalla = !sesiones || !rutinas || !mesociclos;
    const fuerza = fuerzaFalla ? null : fuerzaDeCliente(
      sesiones.map(s => ({ fecha: s.fecha, ejercicio: s.ejercicio, series: s.series_detalle, rutina_id: s.rutina_id ?? null })),
      rutinas, mesociclos
    );

    const est = {
      datos,
      objetivo: (planes && planes[0] && planes[0].objetivo_calorico) || null,
      graficasAbiertas: false, listaAbierta: false, categoriaAbierta: {}
    };
    const graficas = crearGraficas();
    let vivo = true;

    contenedor.innerHTML = `
      <div class="cuerpo-barra"><button class="btn btn-primary" data-accion="anadir">＋ Añadir registro</button></div>
      <div data-sec="lectura"></div>
      <div data-sec="seguimiento"></div>`;
    const sec = n => contenedor.querySelector(`[data-sec="${n}"]`);

    async function dibujarGraficas() {
      if (!est.graficasAbiertas) return;
      try {
        for (const campo of CAMPOS_SEGUIMIENTO) {
          const canvas = contenedor.querySelector(`[data-grafica="${campo.id}"]`);
          if (canvas) await graficas.seguimiento(canvas, serieDeCampo(est.datos, campo), campo, formatDateShort);
        }
      } catch (e) {
        if (!vivo) return;
        console.error(e);
        contenedor.querySelectorAll('canvas[data-grafica]').forEach(c => {
          c.parentElement.innerHTML = '<div class="f-ayuda">No se pudieron cargar las gráficas (¿sin conexión?).</div>';
        });
      }
    }
    const ficha = () => ({ ...cliente, objetivoCalorico: est.objetivo });
    function pintarSeguimiento() {
      sec('seguimiento').innerHTML = est.datos.length ? seguimientoHtml(est.datos, cliente, est.objetivo, est) : vacioHtml();
      dibujarGraficas();
    }
    function pintar() {
      sec('lectura').innerHTML = est.datos.length
        ? lecturaRapidaHtml(ficha(), est.datos, fuerza)
          + (fuerzaFalla ? '<div class="f-ayuda" style="margin:-8px 0 14px;">⚠️ No se pudo leer el historial de entrenos: la fuerza no entra en esta lectura.</div>' : '')
        : '';
      pintarSeguimiento();
    }
    async function recargar() {
      est.datos = await cargarSeguimiento();
      pintar();
    }
    pintar();

    // ── Acciones ──
    async function guardar(fila) {
      const existente = est.datos.find(r => r.fecha === fila.fecha && r.origen === fila.origen && String(r.cliente_id) === String(cliente.id));
      if (existente) await api.tabla('seguimiento_corporal', { method: 'PATCH', filtro: `id=eq.${existente.id}`, cuerpo: fila });
      else await api.tabla('seguimiento_corporal', { method: 'POST', cuerpo: fila });
      await recargar();
      const guardado = est.datos.find(r => r.fecha === fila.fecha && r.origen === fila.origen);
      const coincide = guardado && (existente ? Number(guardado.peso) === Number(fila.peso) && Number(guardado.abdomen) === Number(fila.abdomen) : true);
      if (!guardado || !coincide) throw new Error('No se ha podido guardar. Revisa la política RLS de seguimiento_corporal.');
      ui.alerta(fila.composicion || !(fila.peso && fila.abdomen)
        ? '✅ Registro guardado'
        : '✅ Registro guardado, sin composición: faltan medidas (cuello, antebrazo, cadera…) o altura/edad en la ficha');
    }

    async function borrar(filtro, comprobar) {
      try {
        await api.tabla('seguimiento_corporal', { method: 'DELETE', filtro });
        await recargar();
        if (!comprobar()) { ui.alerta('No se ha borrado: revisa la política RLS de seguimiento_corporal.', 'error'); }
      } catch (e) {
        ui.alerta('No se pudo borrar: ' + e.message, 'error');
      }
    }

    contenedor.addEventListener('click', async e => {
      const el = e.target.closest('[data-accion]');
      if (!el || !contenedor.contains(el)) return;
      const accion = el.dataset.accion;
      if (accion === 'anadir') {
        await abrirModalRegistro({ ui, cliente, guardar });
      } else if (accion === 'toggle-graficas') {
        est.graficasAbiertas = !est.graficasAbiertas; pintarSeguimiento();
      } else if (accion === 'toggle-lista') {
        est.listaAbierta = !est.listaAbierta; pintarSeguimiento();
      } else if (accion === 'toggle-categoria') {
        est.categoriaAbierta = { ...est.categoriaAbierta, [el.dataset.cat]: !est.categoriaAbierta[el.dataset.cat] };
        pintarSeguimiento();
      } else if (accion === 'ir') {
        ctx.navegar(el.dataset.ir === 'nutricion' ? 'nutricion' : `clientes/${cliente.codigo}/historial`);
      } else if (accion === 'borrar-registro') {
        const id = el.dataset.id;
        if (!(await ui.confirmar('¿Borrar este registro de seguimiento corporal? Esta acción no se puede deshacer.', { titulo: 'Borrar registro', aceptar: 'Borrar', peligro: true }))) return;
        await borrar(`id=eq.${id}`, () => !est.datos.some(d => String(d.id) === String(id)));
      } else if (accion === 'borrar-historial') {
        if (!(await ui.confirmar('¿Borrar TODO el historial de seguimiento corporal de este cliente? Esta acción no se puede deshacer.', { titulo: 'Borrar historial completo', aceptar: 'Borrar todo', peligro: true }))) return;
        est.graficasAbiertas = false;
        await borrar(`cliente_id=eq.${cliente.id}`, () => est.datos.length === 0);
      }
    });

    // Registros con peso + abdomen pero sin composición (típicamente check-ins plus enviados desde el
    // móvil): se calcula y se guarda para que las gráficas tengan un punto por check-in, como en el
    // panel actual (autocompletarComposicionSeguimiento). Va en segundo plano, tras pintar.
    (async () => {
      const pendientes = est.datos.filter(r => !r.composicion && r.peso && r.abdomen);
      let completados = 0;
      for (const entry of pendientes) {
        const composicion = calcularComposicionDesdeEntry(entry, cliente);
        if (!composicion) continue; // faltan medidas o altura/edad en la ficha
        try {
          await api.tabla('seguimiento_corporal', { method: 'PATCH', filtro: `id=eq.${entry.id}`, cuerpo: { composicion } });
          completados++;
        } catch (err) { console.error('No se pudo autocompletar composición del registro', entry.id, err); }
      }
      if (completados && vivo) { try { await recargar(); } catch (err) { console.error(err); } }
    })();

    return { desmontar() { vivo = false; graficas.destruirTodas(); } };
  }
};
