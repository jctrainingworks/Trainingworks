// Módulo Clientes: lista (#/clientes) y ficha (#/clientes/CODIGO/PESTAÑA).
// Pendiente de clonar: alta/edición/borrado de cliente, cliente demo y Resumen PDF.
import { pintarLista } from './lista.js';
import { montarFicha } from './ficha.js';

export default {
  id: 'clientes',
  icono: '👥',
  etiqueta: 'Clientes',
  movil: true,

  async montar(contenedor, ctx) {
    ctx.ui.cargarCss(new URL('./estilos.css', import.meta.url));
    const [codigo, pestana] = ctx.ruta.partes;
    contenedor.innerHTML = ctx.ui.cargando(codigo ? 'Cargando ficha...' : 'Cargando clientes...');

    const clientes = await ctx.datos.clientes();

    if (codigo) {
      const cliente = clientes.find(c => c.codigo === codigo);
      if (!cliente) {
        contenedor.innerHTML = `<button class="back-btn" data-volver>← Volver a clientes</button>${ctx.ui.vacio('No existe ningún cliente con ese código.')}`;
        contenedor.addEventListener('click', e => { if (e.target.closest('[data-volver]')) ctx.navegar('clientes'); });
        return;
      }
      return montarFicha(contenedor, ctx, cliente, pestana);
    }

    // Las sesiones solo sirven para "sesiones restantes" (presenciales): si fallan, la lista sigue.
    const sesiones = await ctx.datos.sesiones().catch(() => []);
    contenedor.innerHTML = pintarLista(clientes, sesiones);
    contenedor.addEventListener('click', e => {
      const tarjeta = e.target.closest('[data-cliente]');
      if (tarjeta) ctx.navegar('clientes/' + encodeURIComponent(tarjeta.dataset.cliente));
    });
  }
};
