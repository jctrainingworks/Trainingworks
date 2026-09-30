// Pestaña 💪 Volumen de la ficha: mesociclo activo (por músculo, por sesión y tabla semanal con estado),
// comparativa entre mesociclos y línea de tiempo. Réplica de la sección Volumen de prueba/index.html.
// Tablas: sesiones, rutinas, mesociclos, ejercicios_biblioteca (solo lectura).
import { crearResolvedorMusculo, cargarCatalogo } from '../core/musculo.js';
import { volumenHtml } from './vista.js';

export default {
  id: 'volumen',
  icono: '💪',
  etiqueta: 'Volumen',
  orden: 60,

  async montar(contenedor, ctx) {
    const { cliente, api } = ctx;

    const [sesionesRaw, rutinas, mesociclos, biblioteca, catalogo] = await Promise.all([
      api.tabla('sesiones', { filtro: `codigo_cliente=eq.${cliente.codigo}&order=fecha.desc` }),
      api.tabla('rutinas', { filtro: `cliente_id=eq.${cliente.id}&order=orden.asc` }),
      api.tabla('mesociclos', { filtro: `cliente_id=eq.${cliente.id}&order=numero.asc` }).catch(() => []),
      api.tabla('ejercicios_biblioteca', { filtro: 'order=nombre_es.asc' }).catch(() => []),
      cargarCatalogo()
    ]);
    const historial = sesionesRaw.map(s => ({
      id: s.id, fecha: s.fecha, ejercicio: s.ejercicio, series: s.series_detalle,
      rutina_id: s.rutina_id ?? null, en_descarga: !!s.en_descarga
    }));

    const est = {
      cliente: { ...cliente, rutinas, mesociclos },
      vista: 'activo', rango: null, metrica: null, mesocicloExpandido: null
    };
    const musculoDe = crearResolvedorMusculo({ biblioteca, catalogo }, true);

    const pintar = () => { contenedor.innerHTML = volumenHtml(est, historial, musculoDe); };
    pintar();

    contenedor.addEventListener('click', e => {
      const el = e.target.closest('[data-accion]');
      if (!el) return;
      const v = el.dataset.valor;
      switch (el.dataset.accion) {
        case 'vista': est.vista = v; break;
        case 'rango': est.rango = v; break;
        case 'metrica': est.metrica = v; break;
        case 'expandir': est.mesocicloExpandido = String(est.mesocicloExpandido) === v ? null : (mesociclos.find(m => String(m.id) === v)?.id ?? v); break;
        default: return;
      }
      pintar();
    });
    return {};
  }
};
