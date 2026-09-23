// Registro de pestañas de la ficha de cliente. Igual que modulos.js, pero para las pestañas.
// Contrato de una pestaña:
//
//   export default {
//     id: 'datos',              // también es la ruta: #/clientes/CODIGO/datos
//     icono: '📋',
//     etiqueta: 'Datos',
//     orden: 10,                // posición en la barra de pestañas
//     visible(cliente) { return true; },     // (opcional) oculta la pestaña en ciertos clientes
//     async montar(contenedor, ctx) { ... return { desmontar() {} }; }   // desmontar es opcional
//   }
//
// ctx = { api, datos, store, ui, navegar(ruta), cliente, actualizarCliente(parcial) }
// Una pestaña solo habla con el resto a través de ctx; no importa otros módulos.
const registro = new Map();

export function registrar(pestana) {
  for (const campo of ['id', 'icono', 'etiqueta', 'montar']) {
    if (!pestana || !pestana[campo]) throw new Error(`Pestaña inválida: falta "${campo}"`);
  }
  registro.set(pestana.id, pestana);
}
export const lista = () => [...registro.values()].sort((a, b) => (a.orden ?? 100) - (b.orden ?? 100));
export const obtener = id => registro.get(id);
