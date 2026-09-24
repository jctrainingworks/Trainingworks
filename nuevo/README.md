# Panel nuevo (en construcción)

Reescritura ordenada del panel de entrenador. **El panel actual (`../prueba/`) no se toca**: se van clonando las secciones aquí, mejorándolas por el camino, hasta que el nuevo cubra el día a día.

- URL: `/nuevo/` (misma Supabase que el panel actual, misma base de datos).
- Sin build: módulos ES nativos (`<script type="module">`). Cuando todo esté listo se puede juntar en un único archivo con esbuild.
- Sesión propia: la primera vez hay que iniciar sesión también aquí (comparte usuario y contraseña, no la sesión).
- Mapa de lo que hay que clonar: [`INVENTARIO.md`](INVENTARIO.md). Cada carpeta tiene su `README.md` con las funciones concretas.

## Estructura

```
index.html        shell mínimo
core/             login, menú, rutas, API, utilidades, estilos base
dashboard/ clientes/ biblioteca/ rutinaspdf/ rm/ nutricion/ finanzas/     ← secciones del menú
rutinas/ cardio/ historial/ cuerpo/ volumen/ avisos/ preparacion/       ← pestañas de la ficha de cliente
(la pestaña Datos vive en clientes/datos.js)
```

## Cómo se añade una pestaña de la ficha

Igual que una sección, pero con el contrato de `core/pestanas.js` (`id`, `icono`, `etiqueta`, `orden`, `montar(contenedor, ctx)`) y registrada en `core/app.js`. Ruta: `#/clientes/CODIGO/PESTAÑA`. `ctx.cliente` es el cliente abierto y `ctx.actualizarCliente(parcial)` refleja en la lista los cambios guardados. Cada pestaña carga sus propios datos (no se cargan todos al abrir la ficha).

## Cómo se añade una sección

1. La carpeta trae su `index.js` con el contrato de `core/modulos.js` (`id`, `icono`, `etiqueta`, `montar(contenedor, ctx)`).
2. Su CSS va en su carpeta y se carga con `ctx.ui.cargarCss(new URL('./estilos.css', import.meta.url))`.
3. Se registra en `core/app.js`.

## Reglas al clonar

- Mismas tablas y columnas de Supabase; las migraciones no pueden romper el panel actual ni la app del cliente.
- Todo lo que viene de datos se pinta con `esc()`.
- Eventos por delegación en el contenedor del módulo; nada de `onclick` inline ni de estado global.
- Cada módulo guarda su estado dentro de su carpeta; solo lo compartido va al `store`/`datos`.

## Estado

| Sección | Estado |
|---|---|
| core (login, menú, rutas, API) | ✅ versión mínima |
| clientes | 🟡 lista + ficha con pestañas; falta alta/edición y Resumen PDF |
| ficha · Datos | ✅ clonada |
| ficha · Cardio | ✅ clonada |
| ficha · Rutinas, Historial, Cuerpo, Volumen, Avisos, Preparación | ⏳ pendiente (la barra ya las muestra; enlazan al panel actual) |
| resto de secciones del menú | ⏳ pendiente |
