// Genera diagnostico-consola.js: el bloque «CONTROL NUTRICIONAL V2» de prueba/index.html + cómo ejecutarlo.
// Sirve para medir los menús reales SIN desplegar nada: se pega en la consola del panel que ya tienes abierto (el panel actual aún no lleva estas funciones).
const fs = require('fs'), path = require('path'), { RAIZ } = require('./cargar.js');
const html = fs.readFileSync(path.join(RAIZ, 'prueba/index.html'), 'utf8');
const a = html.indexOf('// ═══ CONTROL NUTRICIONAL V2 · FASE 1'), b = html.indexOf('// ═══ FIN CONTROL NUTRICIONAL V2 (fase 1)');
if (a < 0 || b < 0) throw new Error('No encuentro el bloque en index.html');
const fin = html.indexOf('\n', b) + 1, bloque = html.slice(a, fin);
const cabecera = `// DIAGNÓSTICO DE SOLO LECTURA · Control nutricional V2 (fase 1, paso 0)
// 1) Abre el panel de entrenador con la sesión iniciada. 2) Abre la consola del navegador (F12 → Console). 3) Pega TODO este archivo y pulsa Enter.
// 4) Después ejecuta:   const r = await nutriDiagnosticoControlV2();   — imprime una tabla y un resumen. Para copiarlo y pasármelo:   copy(r.texto)
//    Para ver todas las columnas por menú:   copy(JSON.stringify(r.filas))
// Solo hace lecturas (GET). No escribe en Supabase, no cambia la pantalla ni el estado del panel. Si lo pegas dos veces no pasa nada.
// Generado desde prueba/index.html por tests/nutricion-control/generar-consola.js — no editar a mano.
`;
fs.writeFileSync(path.join(__dirname, 'diagnostico-consola.js'), cabecera + bloque);
console.log('diagnostico-consola.js generado (' + (cabecera + bloque).split('\n').length + ' líneas)');
