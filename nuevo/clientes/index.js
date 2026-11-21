// Módulo Clientes: lista (#/clientes) y ficha (#/clientes/CODIGO/PESTAÑA).
// Pendiente de clonar: Resumen PDF y Mensaje push.
import { pintarLista, filtrarTarjetas } from './lista.js';
import { abrirFormularioCliente } from './formulario.js';
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
    const filtro = { modo: 'todos', q: '' };
    const repintar = async () => {
      ctx.datos.invalidar();
      const nuevos = await ctx.datos.clientes();
      contenedor.innerHTML = pintarLista(nuevos, sesiones);
      filtrarTarjetas(contenedor, filtro);
    };
    contenedor.innerHTML = pintarLista(clientes, sesiones);
    contenedor.addEventListener('input', e => {
      if (e.target.matches('[data-buscar]')) { filtro.q = e.target.value; filtrarTarjetas(contenedor, filtro); }
    });
    contenedor.addEventListener('click', async e => {
      const chip = e.target.closest('.cf-chip');
      if (chip) { filtro.modo = chip.dataset.modo; filtrarTarjetas(contenedor, filtro); return; }
      if (e.target.closest('[data-nuevo-cliente]')) return abrirFormularioCliente({ ctx, alTerminar: repintar });
      if (e.target.closest('[data-cliente-demo]')) return abrirFormularioCliente({ ctx, demo: true, alTerminar: repintar });
      const mas = e.target.closest('[data-mas]');
      if (mas) { mas.nextElementSibling.classList.toggle('show'); return; }
      const del = e.target.closest('[data-eliminar]');
      if (del) {
        const nombre = del.dataset.nombre;
        const ok = await ctx.ui.confirmar(`⚠️ ¿Eliminar a ${nombre}?\n\nEsto borrará el cliente de Supabase. Esta acción no se puede deshacer.`, { titulo: 'Eliminar cliente', aceptar: 'Sí, eliminar', peligro: true });
        if (!ok) return;
        try {
          await ctx.api.tabla('clientes', { method: 'DELETE', filtro: `codigo=eq.${del.dataset.eliminar}` });
          ctx.ui.alerta(`✅ Cliente "${nombre}" eliminado`);
          await repintar();
        } catch (err) { ctx.ui.alerta(`❌ Error al eliminar: ${err.message}`, 'error'); }
        return;
      }
      const tarjeta = e.target.closest('[data-cliente]');
      if (tarjeta) ctx.navegar('clientes/' + encodeURIComponent(tarjeta.dataset.cliente));
    });
  }
};
