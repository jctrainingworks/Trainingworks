// Almacén mínimo de estado compartido. Solo para lo que de verdad necesitan varias secciones;
// cada módulo guarda su propio estado dentro de su carpeta.
export function crearStore(inicial = {}) {
  let estado = { ...inicial };
  const suscriptores = new Set();
  return {
    get: () => estado,
    set(parcial) {
      estado = { ...estado, ...parcial };
      suscriptores.forEach(fn => fn(estado));
    },
    suscribir(fn) { suscriptores.add(fn); return () => suscriptores.delete(fn); }
  };
}
