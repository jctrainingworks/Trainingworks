// Pestaña 🫀 Cardio de la ficha: PAR-Q, tests de VO2máx (Rockport / Cooper / Queens), histórico con
// gráficas, prescripción de cardio por zonas de Karvonen y progresión de sesiones.
// Tablas: cardio_parq, cardio_valoraciones, rutinas (es_cardio), ejercicios, sesiones, seguimiento_corporal.
import { crearGraficas } from '../core/graficas.js';
import {
  PARQ_PREGUNTAS, CARDIO_TESTS, calcularVO2Test, clasificarVO2max, parqVigente,
  calcularZonasKarvonen, marcadorZona
} from './calculos.js';
import {
  parqFormHtml, parqEstadoHtml, testHtml, historialHtml, seriesEvolucion,
  prescripcionHtml, progresionHtml, sesionesPorSemana
} from './vista.js';

const nuevoId = prefijo =>
  (globalThis.crypto && crypto.randomUUID) ? crypto.randomUUID() : `${prefijo}-${Math.random().toString(36).slice(2, 11)}`;

export default {
  id: 'cardio',
  icono: '🫀',
  etiqueta: 'Cardio',
  orden: 30,

  async montar(contenedor, ctx) {
    ctx.ui.cargarCss(new URL('./estilos.css', import.meta.url));
    const { cliente, api, ui } = ctx;
    const graficas = crearGraficas();

    // ── Carga: solo lo que necesita esta pestaña ──
    const [parqs, valoraciones, rutinas, pesoFilas] = await Promise.all([
      api.tabla('cardio_parq', { filtro: `cliente_id=eq.${cliente.id}&order=fecha.desc` }),
      api.tabla('cardio_valoraciones', { filtro: `cliente_id=eq.${cliente.id}&order=fecha.desc` }),
      api.tabla('rutinas', { filtro: `cliente_id=eq.${cliente.id}&es_cardio=eq.true&order=orden.asc` }),
      // El peso solo sirve para rellenar el Rockport: si falla, se sigue con el peso inicial.
      api.tabla('seguimiento_corporal', { select: 'peso', filtro: `cliente_id=eq.${cliente.id}&order=fecha.desc`, unico: true }).catch(() => [])
    ]);
    const est = {
      parqs, valoraciones,
      rutina: rutinas[0] || null,
      ejercicios: [], sesiones: [],
      peso: (pesoFilas[0] && pesoFilas[0].peso) || cliente.peso_inicial || '',
      testSel: ''
    };
    if (est.rutina) {
      [est.ejercicios, est.sesiones] = await Promise.all([
        api.tabla('ejercicios', { filtro: `rutina_id=eq.${est.rutina.id}&order=orden.asc` }),
        api.tabla('sesiones', { filtro: `codigo_cliente=eq.${cliente.codigo}&rutina_id=eq.${est.rutina.id}&order=fecha.desc` })
      ]);
    }

    contenedor.innerHTML = ['parq', 'test', 'historial', 'prescripcion', 'progresion']
      .map(s => `<div data-sec="${s}"></div>`).join('');
    const sec = n => contenedor.querySelector(`[data-sec="${n}"]`);
    const $ = s => contenedor.querySelector(s);
    let vivo = true;

    // ── Pintado ──
    async function dibujarGraficas() {
      try {
        for (const s of seriesEvolucion(est.valoraciones)) {
          await graficas.dobleEje(contenedor.querySelector(`[data-grafica-test="${s.tipo}"]`), s.labels, s.vo2, s.fc);
        }
        if (est.rutina && est.sesiones.length) {
          const { labels, valores } = sesionesPorSemana(est.sesiones);
          await graficas.metrica(contenedor.querySelector('[data-grafica-progresion]'), labels, valores, '#ef4444', ' ses.');
        }
      } catch (e) {
        if (!vivo) return;
        console.error(e);
        contenedor.querySelectorAll('.cardio-grafica').forEach(caja => {
          caja.innerHTML = '<div class="f-ayuda">No se pudieron cargar las gráficas (¿sin conexión?).</div>';
        });
      }
    }
    const pintarHistorial = () => { sec('historial').innerHTML = historialHtml(est.valoraciones); dibujarGraficas(); };
    const pintarTest = () => { sec('test').innerHTML = testHtml(cliente, est.testSel, est.peso); };
    const pintarPrescripcion = () => { sec('prescripcion').innerHTML = prescripcionHtml(cliente, est.valoraciones[0], est.ejercicios); };
    function pintarTodo() {
      const parq = parqVigente(est.parqs);
      sec('parq').innerHTML = parq ? parqEstadoHtml(parq) : parqFormHtml(est.parqs);
      sec('test').innerHTML = parq ? testHtml(cliente, est.testSel, est.peso) : '';
      sec('prescripcion').innerHTML = parq ? prescripcionHtml(cliente, est.valoraciones[0], est.ejercicios) : '';
      sec('progresion').innerHTML = parq && est.rutina ? progresionHtml(est.sesiones) : '';
      pintarHistorial();
    }
    pintarTodo();

    // ── Acciones ──
    async function guardarParq(boton) {
      const respuestas = {};
      let algunSi = false;
      PARQ_PREGUNTAS.forEach(p => {
        const marcado = $(`[data-parq="${p.id}"]`).checked;
        respuestas[p.id] = marcado;
        if (marcado) algunSi = true;
      });
      boton.disabled = true;
      try {
        const nuevo = await api.tabla('cardio_parq', {
          method: 'POST',
          cuerpo: { cliente_id: cliente.id, fecha: new Date().toISOString(), respuestas, resultado: algunSi ? 'no_apto_requiere_medico' : 'apto' }
        });
        est.parqs = [nuevo[0], ...est.parqs];
        pintarTodo();
      } catch (e) {
        boton.disabled = false;
        ui.alerta('Error al guardar el PAR-Q: ' + e.message, 'error');
      }
    }

    async function guardarTest(boton) {
      const tipo = est.testSel;
      const cfg = CARDIO_TESTS[tipo];
      if (!cfg) return;
      const datos = {};
      for (const campo of cfg.campos) {
        const el = $(`[data-campo="${campo.id}"]`);
        if (campo.tipo === 'sexo') { datos[campo.id] = el.value; continue; }
        // Opcionales (cinta): en blanco = null, no 0 ("0 km/h" no es lo mismo que "sin cinta").
        if (el.value === '') {
          if (campo.opcional) { datos[campo.id] = null; continue; }
          ui.alerta(`Falta un dato: ${campo.label}`, 'error');
          return;
        }
        datos[campo.id] = Number(el.value);
      }
      const vo2 = calcularVO2Test(tipo, datos);
      if (!vo2 || isNaN(vo2) || vo2 <= 0) {
        ui.alerta('Revisa los datos: el resultado no es válido. Comprueba peso/edad/tiempos/FC introducidos.', 'error');
        return;
      }
      const edad = datos.edad || cliente.edad || 30;
      const sexo = datos.sexo || (cliente.genero === 'Mujer' ? 'M' : 'H');
      boton.disabled = true;
      try {
        const nuevo = await api.tabla('cardio_valoraciones', {
          method: 'POST',
          cuerpo: {
            cliente_id: cliente.id, fecha: new Date().toISOString(), tipo_test: tipo,
            datos_input: datos, vo2max_estimado: Math.round(vo2 * 10) / 10, percentil: null,
            categoria: clasificarVO2max(vo2, edad, sexo)
          }
        });
        est.valoraciones = [nuevo[0], ...est.valoraciones];
        est.testSel = '';
        pintarTest(); pintarHistorial(); pintarPrescripcion();
      } catch (e) {
        boton.disabled = false;
        ui.alerta('Error al guardar la valoración: ' + e.message, 'error');
      }
    }

    async function borrarValoracion(id) {
      if (!await ui.confirmar('¿Borrar este registro de valoración cardio?\n\nEsta acción no se puede deshacer.', { titulo: 'Borrar valoración cardio', aceptar: 'Borrar', peligro: true })) return;
      try {
        await api.tabla('cardio_valoraciones', { method: 'DELETE', filtro: `id=eq.${id}` });
        est.valoraciones = est.valoraciones.filter(h => String(h.id) !== String(id));
        pintarHistorial(); pintarPrescripcion();
        ui.alerta('✅ Registro borrado');
      } catch (e) {
        ui.alerta('❌ Error al borrar: ' + e.message, 'error');
      }
    }

    // La rutina de cardio es una rutina normal (es_cardio = true) y cada línea un ejercicio normal:
    // nombre = tipo, series = veces por semana, repeticiones = duración, rir = zona de Karvonen (%).
    async function anadirCardio(boton) {
      const tipo = $('#cardio_rx_tipo').value || 'Cardio libre';
      const zona = $('#cardio_rx_zona').value || '70';
      const duracion = Number($('#cardio_rx_duracion').value);
      const frecuencia = Number($('#cardio_rx_frecuencia').value);
      if (!(duracion > 0) || !(frecuencia > 0)) { ui.alerta('Pon una duración y una frecuencia mayores que 0.', 'error'); return; }
      const fcReposo = cliente.fc_reposo || (est.valoraciones[0]?.datos_input?.fc_reposo) || 70;
      const objetivo = calcularZonasKarvonen(fcReposo, cliente.edad).zonas[zona];
      const notasTxt = ($('#cardio_rx_notas').value || '').trim();
      boton.disabled = true;
      try {
        if (!est.rutina) {
          const nueva = await api.tabla('rutinas', {
            method: 'POST',
            cuerpo: { id: nuevoId('rut'), nombre: '🫀 Cardio', cliente_id: cliente.id, codigo_cliente: cliente.codigo, orden: 99, mesociclo_id: null, es_cardio: true }
          });
          est.rutina = nueva[0];
        }
        // Marcador técnico que lee la app del cliente para pintar el chip 🫀 con el rango de ppm.
        const marcador = marcadorZona(zona, objetivo.lo, objetivo.hi);
        const linea = {
          id: nuevoId('ex'), nombre: tipo, rutina_id: est.rutina.id, series: frecuencia, repeticiones: `${duracion}min`,
          rir: String(zona), descanso: '0seg', tecnica: '', grupo_tecnica: '',
          notas: notasTxt ? `${notasTxt}\n${marcador}` : marcador, orden: est.ejercicios.length + 1,
          gif_url: '', pasos: [], es_isometrico: false, lastre_kg: null
        };
        const creada = await api.tabla('ejercicios', { method: 'POST', cuerpo: linea });
        est.ejercicios = [...est.ejercicios, (creada && creada[0]) || linea];
        pintarPrescripcion();
        if (!sec('progresion').innerHTML) sec('progresion').innerHTML = progresionHtml(est.sesiones);
        ui.alerta(`✅ Cardio "${tipo}" añadido a la rutina de cardio`);
      } catch (e) {
        boton.disabled = false;
        ui.alerta('Error al guardar la prescripción de cardio: ' + e.message, 'error');
      }
    }

    async function borrarLinea(id) {
      if (!await ui.confirmar('¿Borrar esta sesión de la rutina de cardio?', { titulo: 'Eliminar sesión de cardio', aceptar: 'Eliminar', peligro: true })) return;
      try {
        await api.tabla('ejercicios', { method: 'DELETE', filtro: `id=eq.${id}` });
        est.ejercicios = est.ejercicios.filter(e => String(e.id) !== String(id));
        pintarPrescripcion();
        ui.alerta('✅ Sesión de cardio eliminada');
      } catch (e) {
        ui.alerta('Error al eliminar: ' + e.message, 'error');
      }
    }

    contenedor.addEventListener('click', e => {
      const boton = e.target.closest('[data-accion]');
      if (!boton) return;
      switch (boton.dataset.accion) {
        case 'parq-guardar': guardarParq(boton); break;
        case 'test-elegir': est.testSel = boton.dataset.test; pintarTest(); break;
        case 'test-guardar': guardarTest(boton); break;
        case 'valoracion-borrar': borrarValoracion(boton.dataset.id); break;
        case 'notas-abrir': $('[data-notas]').hidden = false; boton.hidden = true; $('#cardio_rx_notas').focus(); break;
        case 'cardio-anadir': anadirCardio(boton); break;
        case 'linea-borrar': borrarLinea(boton.dataset.id); break;
      }
    });

    return { desmontar() { vivo = false; graficas.destruirTodas(); } };
  }
};
