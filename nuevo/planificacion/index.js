// Sección 🗓️ Planificación (menú lateral): la fase de cada cliente activo en una sola pantalla.
// Tablas: clientes (vía datos.clientes), mesociclos, etapas (solo lectura; si no existe, no se filtra nada).
import { planificacionHtml, lab } from './vista.js';
import { filasPlanificacion, agruparBloques, finesDeEtapa } from './calculos.js';

export default {
  id: 'planificacion',
  icono: '🗓️',
  etiqueta: 'Planificación',

  async montar(contenedor, ctx) {
    const { api, datos, ui, navegar } = ctx;
    ui.cargarCss(new URL('../periodizacion/estilos.css', import.meta.url));
    contenedor.innerHTML = `<div class="page-title">Planificación</div>${ui.cargando('Cargando planificación...')}`;
    const [clientes, mesociclos, etapas] = await Promise.all([
      datos.clientes(),
      api.tabla('mesociclos', { filtro: 'order=fecha_inicio.asc' }),
      api.tabla('etapas', { filtro: 'order=fecha_fin.asc' }).catch(() => [])
    ]);
    const modelo = filasPlanificacion({ clientes, porCliente: agruparBloques(mesociclos), fines: finesDeEtapa(etapas), etiqueta: lab });
    contenedor.innerHTML = planificacionHtml(modelo);
    contenedor.addEventListener('click', e => {
      const b = e.target.closest('[data-abrir]');
      if (b) navegar(`clientes/${encodeURIComponent(b.dataset.abrir)}/periodizacion`);
    });
    return {};
  }
};
