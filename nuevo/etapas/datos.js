// Lectura de las etapas cerradas de un cliente, solo para filtrar la vista «Etapa actual». Si la tabla no existe
// (o falla), devuelve [] y el panel se ve completo, como si no hubiera etapas.
export const cargarEtapasCliente = (api, clienteId) =>
  api.tabla('etapas', { select: 'id,fecha_inicio,fecha_fin', filtro: `cliente_id=eq.${clienteId}&order=fecha_inicio.desc` }).catch(() => []);
