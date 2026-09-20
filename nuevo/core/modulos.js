// Registro de módulos. Contrato de un módulo (una sección del menú):
//
//   export default {
//     id: 'clientes',            // también es la ruta: #/clientes
//     icono: '👥',
//     etiqueta: 'Clientes',
//     movil: true,               // (opcional) aparece en la barra inferior del móvil
//     async montar(contenedor, ctx) { ... return { desmontar() {} }; }   // desmontar es opcional
//   }
//
// ctx = { api, datos, store, ui, navegar(ruta), ruta: { modulo, partes } }
// Un módulo solo habla con el resto a través de ctx; no importa otros módulos.
const registro = new Map();

export function registrar(modulo) {
  for (const campo of ['id', 'icono', 'etiqueta', 'montar']) {
    if (!modulo || !modulo[campo]) throw new Error(`Módulo inválido: falta "${campo}"`);
  }
  registro.set(modulo.id, modulo);
}
export const lista = () => [...registro.values()];
export const obtener = id => registro.get(id);
