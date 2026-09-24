// Pestaña 💪 Rutinas de la ficha (parte 1): mesociclos como filtro, lista de rutinas con sus ejercicios
// (series, técnicas, superseries, descarga), añadir / borrar rutina, orden de rotación, mover de
// mesociclo y borrar ejercicio. Pendiente (parte 2): añadir/editar ejercicio y crear/cerrar mesociclos.
// Tablas: rutinas, ejercicios, mesociclos.
import { chipsHtml, listaHtml } from './vista.js';
import { calcularEstadoDescarga } from '../core/descarga.js';

const nuevoId = prefijo =>
  (globalThis.crypto && crypto.randomUUID) ? crypto.randomUUID() : `${prefijo}-${Math.random().toString(36).slice(2, 11)}`;
const porOrden = (a, b) => (a.orden ?? Infinity) - (b.orden ?? Infinity);

export default {
  id: 'rutinas',
  icono: '💪',
  etiqueta: 'Rutinas',
  orden: 20,

  async montar(contenedor, ctx) {
    ctx.ui.cargarCss(new URL('./estilos.css', import.meta.url));
    const { cliente, api, ui } = ctx;

    // ── Carga: solo lo que necesita esta pestaña ──
    const [rutinas, mesociclos] = await Promise.all([
      api.tabla('rutinas', { filtro: `cliente_id=eq.${cliente.id}&order=orden.asc` }),
      api.tabla('mesociclos', { filtro: `cliente_id=eq.${cliente.id}&order=numero.asc` })
    ]);
    const ejercicios = rutinas.length
      ? await api.tabla('ejercicios', { filtro: `rutina_id=in.(${rutinas.map(r => r.id).join(',')})&order=orden.asc` })
      : [];
    const activo = mesociclos.find(m => !m.fecha_fin);
    // Por defecto, el mesociclo activo; sin mesociclos, todas las rutinas juntas.
    const est = { rutinas, ejercicios, mesociclos, sel: activo ? activo.id : null, abierta: null };

    const visibles = () => (est.sel !== null
      ? est.rutinas.filter(r => String(r.mesociclo_id ?? '') === String(est.sel))
      : est.rutinas);

    function pintar() {
      contenedor.innerHTML = chipsHtml(est.mesociclos, est.sel) + listaHtml(visibles(), {
        ejerciciosDe: id => est.ejercicios.filter(e => String(e.rutina_id) === String(id)),
        mesociclos: est.mesociclos,
        abierta: est.abierta,
        tipoDescarga: calcularEstadoDescarga(cliente)
      });
    }
    pintar();

    // El PATCH no devuelve filas: si la política RLS bloquea el UPDATE no da error. Se relee para comprobarlo.
    async function releerRutinas() {
      est.rutinas = await api.tabla('rutinas', { filtro: `cliente_id=eq.${cliente.id}&order=orden.asc` });
      return est.rutinas;
    }
    const noSeGuardo = (cambios, tras) => cambios.some(x => {
      const r = tras.find(t => String(t.id) === String(x.id));
      return !r || x.comprobar(r) === false;
    });

    // ── Acciones ──
    async function nuevaRutina() {
      const delMes = est.rutinas.filter(r => !r.es_cardio && String(r.mesociclo_id ?? '') === String(est.sel ?? ''));
      const sugerido = delMes.length ? Math.max(...delMes.map(r => r.orden || 0)) + 1 : 1;
      let nombreCreada = '';
      const creada = await ui.formulario({
        titulo: 'Nueva Rutina', subtitulo: `Para ${cliente.nombre}`, aceptar: 'Crear Rutina',
        campos: [
          { id: 'nombre', etiqueta: 'Nombre de la rutina *', placeholder: 'Ej: Push A, Pierna, Upper...' },
          { id: 'orden', etiqueta: 'Orden', tipo: 'number', valor: sugerido, min: 1 }
        ],
        alEnviar: async v => {
          const nombre = v.nombre.trim();
          if (!nombre) throw new Error('El nombre es obligatorio');
          const cuerpo = {
            id: nuevoId('rut'), nombre, cliente_id: cliente.id, codigo_cliente: cliente.codigo,
            orden: parseInt(v.orden) || 1, mesociclo_id: est.sel || null
          };
          const filas = await api.tabla('rutinas', { method: 'POST', cuerpo });
          est.rutinas = [...est.rutinas, (filas && filas[0]) || cuerpo].sort(porOrden);
          nombreCreada = nombre;
        }
      });
      if (creada) { pintar(); ui.alerta(`✅ Rutina "${nombreCreada}" creada`); }
    }

    async function borrarRutina(id, nombre) {
      if (!await ui.confirmar(`¿Eliminar la rutina "${nombre || 'esta rutina'}" y todos sus ejercicios? Esta acción no se puede deshacer.`, { titulo: 'Eliminar rutina', aceptar: 'Eliminar', peligro: true })) return;
      try {
        await api.tabla('ejercicios', { method: 'DELETE', filtro: `rutina_id=eq.${id}` });
        const borrada = await api.tabla('rutinas', { method: 'DELETE', filtro: `id=eq.${id}` });
        if (!borrada || borrada.length === 0) throw new Error('Supabase no permitió borrar (revisa la política RLS de DELETE en la tabla "rutinas")');
        est.rutinas = est.rutinas.filter(r => String(r.id) !== String(id));
        est.ejercicios = est.ejercicios.filter(e => String(e.rutina_id) !== String(id));
        if (String(est.abierta) === String(id)) est.abierta = null;
        pintar();
        ui.alerta(`✅ Rutina "${nombre}" eliminada`);
      } catch (e) {
        ui.alerta('Error al eliminar la rutina: ' + e.message, 'error');
      }
    }

    async function borrarEjercicio(id) {
      if (!await ui.confirmar('¿Eliminar este ejercicio de la rutina?', { titulo: 'Eliminar ejercicio', aceptar: 'Eliminar', peligro: true })) return;
      try {
        await api.tabla('ejercicios', { method: 'DELETE', filtro: `id=eq.${id}` });
        est.ejercicios = est.ejercicios.filter(e => String(e.id) !== String(id));
        pintar();
        ui.alerta('✅ Ejercicio eliminado');
      } catch (e) {
        ui.alerta('Error al eliminar: ' + e.message, 'error');
      }
    }

    async function moverRutina(id, mesocicloId) {
      const nuevo = mesocicloId || null;
      try {
        await api.tabla('rutinas', { method: 'PATCH', filtro: `id=eq.${id}`, cuerpo: { mesociclo_id: nuevo } });
        const tras = await releerRutinas();
        if (noSeGuardo([{ id, comprobar: r => String(r.mesociclo_id ?? '') === String(nuevo ?? '') }], tras)) {
          ui.alerta('No se guardó el cambio: Supabase no permitió el UPDATE en la tabla "rutinas" (revisa la política RLS de UPDATE).', 'error');
        } else {
          ui.alerta('✅ Rutina movida');
        }
      } catch (e) {
        ui.alerta(`Error moviendo rutina: ${e.message}`, 'error');
      }
      pintar();
    }

    // Cambia el orden de una rutina y recoloca las demás del MISMO mesociclo para que queden 1..n sin
    // repetidos ni huecos. El orden manda en la rotación de la app del cliente. El cardio queda fuera.
    async function cambiarOrden(id, valor) {
      const rutina = est.rutinas.find(r => String(r.id) === String(id));
      if (!rutina) return;
      const grupo = est.rutinas
        .filter(r => !r.es_cardio && String(r.mesociclo_id ?? '') === String(rutina.mesociclo_id ?? ''))
        .sort(porOrden);
      let pos = parseInt(valor, 10);
      if (!pos || pos < 1) pos = 1;
      if (pos > grupo.length) pos = grupo.length;
      const resto = grupo.filter(r => String(r.id) !== String(id));
      resto.splice(pos - 1, 0, rutina);
      const cambios = resto
        .map((r, i) => ({ id: r.id, orden: i + 1, ordenActual: r.orden }))
        .filter(x => x.orden !== x.ordenActual)
        .map(x => ({ ...x, comprobar: r => r.orden === x.orden }));
      if (!cambios.length) { pintar(); return; } // nada que guardar: repinta para devolver el número original
      try {
        await Promise.all(cambios.map(x => api.tabla('rutinas', { method: 'PATCH', filtro: `id=eq.${x.id}`, cuerpo: { orden: x.orden } })));
        const tras = await releerRutinas();
        if (noSeGuardo(cambios, tras)) ui.alerta('No se guardó el orden: Supabase no permitió el UPDATE en la tabla "rutinas" (revisa la política RLS de UPDATE).', 'error');
        else ui.alerta('✅ Orden actualizado');
      } catch (e) {
        ui.alerta(`Error cambiando el orden: ${e.message}`, 'error');
      }
      pintar();
    }

    contenedor.addEventListener('click', e => {
      const boton = e.target.closest('[data-accion]');
      if (boton) {
        const a = boton.dataset.accion;
        if (a === 'mesociclo') { est.sel = boton.dataset.id === 'todos' ? null : boton.dataset.id; pintar(); }
        else if (a === 'rutina-nueva') nuevaRutina();
        else if (a === 'rutina-borrar') borrarRutina(boton.dataset.id, boton.dataset.nombre);
        else if (a === 'ejercicio-borrar') borrarEjercicio(boton.dataset.id);
        return;
      }
      // Desplegar / plegar: clic en la cabecera, salvo sobre sus controles (orden, mover).
      const cab = e.target.closest('[data-toggle]');
      if (cab && !e.target.closest('input, select, button')) {
        est.abierta = String(est.abierta) === cab.dataset.toggle ? null : cab.dataset.toggle;
        pintar();
      }
    });

    contenedor.addEventListener('change', e => {
      if (e.target.matches('[data-orden]')) cambiarOrden(e.target.dataset.orden, e.target.value);
      else if (e.target.matches('[data-mover]')) moverRutina(e.target.dataset.mover, e.target.value);
    });
  }
};
