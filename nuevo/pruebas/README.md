# Pruebas del panel nuevo

Pruebas automáticas con una Supabase simulada (JSDOM + `fetch` falso). No tocan datos reales.

```
cd nuevo/pruebas
npm i jsdom
node datos.test.mjs && node datos_errores.test.mjs && node cardio.test.mjs
```

`harness.mjs` monta el entorno (`crearEntorno`), simula las tablas (`tablas: { nombre: filas }`), los fallos (`fallos: { 'tabla:GET': 'mensaje' }`) y un Chart.js falso (`grafica(w)`).
Cada pestaña nueva añade su `*.test.mjs`.
