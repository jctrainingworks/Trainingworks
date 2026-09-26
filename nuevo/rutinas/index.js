// Pestaña 💪 Rutinas de la ficha: mesociclos (filtro, nuevo, bloque nuevo, borrar), lista de rutinas con sus
// ejercicios (series, técnicas, superseries, descarga), añadir / borrar rutina, orden de rotación, mover de
// mesociclo y añadir / editar / borrar ejercicio (con enlace por id a la biblioteca).
// Tablas: rutinas, ejercicios, mesociclos, ejercicios_biblioteca.
import { chipsHtml, listaHtml } from './vista.js';
import { calcularEstadoDescarga } from '../core/descarga.js';
import { abrirModalEjercicio, seriesIniciales, seriesDeEjercicio } from './modalEjercicio.js';
import { crearGestorMesociclos } from './mesociclos.js';

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

    // Biblioteca de ejercicios: solo se carga al abrir el modal de ejercicio, y una vez.
    let bibliotecaPromesa = null;
    const cargarBiblioteca = () => bibliotecaPromesa
      || (bibliotecaPromesa = api.tabla('ejercicios_biblioteca', { filtro: 'order=nombre_es.asc' }).catch(e => { bibliotecaPromesa = null; throw e; }));

    async function recargarMesociclos() {
      [est.mesociclos, est.rutinas] = await Promise.all([
        api.tabla('mesociclos', { filtro: `cliente_id=eq.${cliente.id}&order=numero.asc` }),
        api.tabla('rutinas', { filtro: `cliente_id=eq.${cliente.id}&order=orden.asc` })
      ]);
      const act = est.mesociclos.find(m => !m.fecha_fin);
      est.sel = act ? act.id : null; // tras crear un mesociclo se selecciona el activo, como en el panel actual
    }
    const gestor = crearGestorMesociclos({ cliente, api, ui, est, recargar: recargarMesociclos, actualizarCliente: ctx.actualizarCliente });

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

    // Si la columna biblioteca_id aún no existe, se guarda igualmente sin el enlace y se avisa.
    // Devuelve { filas, avisoSql } en vez de avisar aquí mismo: si avisara ya, el "✅ guardado" que
    // viene justo después lo taparía (ui.alerta reemplaza, no apila).
    async function enviarEjercicio(metodo, filtro, cuerpo) {
      try {
        return { filas: await api.tabla('ejercicios', { method: metodo, filtro, cuerpo }), avisoSql: false };
      } catch (e) {
        if (!('biblioteca_id' in cuerpo) || !/biblioteca_id/.test(e.message)) throw e;
        const { biblioteca_id, ...sin } = cuerpo;
        return { filas: await api.tabla('ejercicios', { method: metodo, filtro, cuerpo: sin }), avisoSql: true };
      }
    }
    const AVISO_SQL = 'Guardado sin enlace a la biblioteca: falta ejecutar sql/rutinas_parte2.sql en Supabase.';
    async function abrirBiblioteca() {
      try { return await cargarBiblioteca(); } catch (e) {
        ui.alerta('No se pudo cargar tu biblioteca (puedes escribir el nombre a mano): ' + e.message, 'error');
        return [];
      }
    }
    const mesocicloDe = r => (r && r.mesociclo_id ? est.mesociclos.find(m => String(m.id) === String(r.mesociclo_id)) : null) || null;

    async function nuevoEjercicio(rutinaId) {
      const rutina = est.rutinas.find(r => String(r.id) === String(rutinaId));
      if (!rutina) return;
      const mes = mesocicloDe(rutina);
      const dela = est.ejercicios.filter(e => String(e.rutina_id) === String(rutinaId));
      let nombre = '', avisoSqlPendiente = false;
      const ok = await abrirModalEjercicio({
        titulo: 'Nuevo Ejercicio', subtitulo: `Rutina: ${rutina.nombre}`, aviso: true, mesociclo: mes, ejercicio: null,
        biblioteca: await abrirBiblioteca(), series: seriesIniciales(mes),
        ordenSugerido: dela.length ? Math.max(...dela.map(e => e.orden || 0)) + 1 : 1,
        alEnviar: async cuerpo => {
          const fila = { id: nuevoId('ex'), rutina_id: rutinaId, ...cuerpo };
          const { filas: creada, avisoSql } = await enviarEjercicio('POST', undefined, fila);
          est.ejercicios = [...est.ejercicios, (creada && creada[0]) || fila].sort(porOrden);
          nombre = cuerpo.nombre;
          avisoSqlPendiente = avisoSql;
        }
      });
      if (ok) { est.abierta = rutinaId; pintar(); ui.alerta(avisoSqlPendiente ? AVISO_SQL : `✅ Ejercicio "${nombre}" añadido`, avisoSqlPendiente ? 'error' : 'success'); }
    }

    async function editarEjercicio(id) {
      const ex = est.ejercicios.find(e => String(e.id) === String(id));
      if (!ex) return;
      let nombre = '', avisoSqlPendiente = false;
      const ok = await abrirModalEjercicio({
        titulo: 'Editar Ejercicio', subtitulo: ex.nombre, aviso: false, mesociclo: null, ejercicio: ex,
        biblioteca: await abrirBiblioteca(), series: seriesDeEjercicio(ex), ordenSugerido: ex.orden || 1,
        alEnviar: async cuerpo => {
          const { avisoSql } = await enviarEjercicio('PATCH', `id=eq.${ex.id}`, cuerpo);
          // El PATCH no devuelve filas: se relee para comprobar que Supabase lo guardó.
          const tras = await api.tabla('ejercicios', { filtro: `id=eq.${ex.id}` });
          const fila = tras && tras[0];
          if (!fila || fila.nombre !== cuerpo.nombre || fila.repeticiones !== cuerpo.repeticiones || fila.notas !== cuerpo.notas) {
            throw new Error('No se guardó: Supabase no permitió el UPDATE en la tabla "ejercicios" (revisa la política RLS de UPDATE).');
          }
          est.ejercicios = est.ejercicios.map(e => (String(e.id) === String(ex.id) ? fila : e)).sort(porOrden);
          nombre = cuerpo.nombre;
          avisoSqlPendiente = avisoSql;
        }
      });
      if (ok) { est.abierta = ex.rutina_id; pintar(); ui.alerta(avisoSqlPendiente ? AVISO_SQL : `✅ Ejercicio "${nombre}" actualizado`, avisoSqlPendiente ? 'error' : 'success'); }
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
        else if (a === 'ejercicio-nuevo') nuevoEjercicio(boton.dataset.id);
        else if (a === 'ejercicio-editar') editarEjercicio(boton.dataset.id);
        else if (a === 'mesociclo-nuevo') gestor.crearMesociclo().then(pintar);
        else if (a === 'bloque-nuevo') gestor.bloqueNuevo().then(pintar);
        else if (a === 'mesociclo-borrar') gestor.borrarMesociclo(boton.dataset.id).then(hecho => { if (hecho) pintar(); });
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
