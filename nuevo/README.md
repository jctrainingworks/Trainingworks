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
planificacion/ rutinas/ periodizacion/ cardio/ historial/ cuerpo/ volumen/ avisos/ preparacion/       ← pestañas de la ficha de cliente
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
| ficha · Datos | ✅ clonada (el modelo de periodización ya no está aquí: tiene su pestaña) |
| ficha · Periodización | ✅ clonada (nov-2026): dónde estás, modelo ATR/CSD/JCTW, línea de tiempo con eventos, sugerencias, músculos en sobrecarga, macrociclo anual (crear / editar-regenerar / quitar), rangos propios. Falta: vista por etapas y asistente de etapas |
| ficha · Etapas | 🟡 parcial (nov-2026): lista, cerrar etapa (copia de rutinas, medidas, sesiones y calorías), etapa siguiente para clientes ATR, borrar, SQL si faltan las tablas. Filtro «Etapa actual / Todo el historial» aplicado en Rutinas (con la franja), Historial, Volumen, Cuerpo, Periodización y Planificación. Falta: detalle de etapa y asistente CSD |
| ficha · Cardio | ✅ clonada |
| ficha · Rutinas | ✅ clonada (mesociclos, lista, ejercicios, orden, biblioteca) — pestaña inicial de la ficha |
| ficha · Historial | ✅ clonada (vista Entrenos; el seguimiento corporal va en Cuerpo) |
| ficha · Volumen | ✅ clonada (3 vistas, banner de descarga, mesociclos ATR/CSD) |
| ficha · Cuerpo | ✅ clonada (seguimiento corporal + lectura rápida + composición + veredicto) |
| ficha · Avisos, Preparación | ⏳ pendiente (la barra ya las muestra; enlazan al panel actual) |
| sección · Planificación | ✅ clonada (nov-2026): fase de cada cliente activo, «Esta semana», eventos en conflicto, filtro por última etapa cerrada |
| resto de secciones del menú | ⏳ pendiente |

## Pendiente de portar desde prueba/ (nov-2026)
- **Etapas, lo que falta**: detalle de etapa (Resumen · Ejercicios · Medidas · Rutinas · Sesiones) y asistente «cerrar etapa → macrociclo CSD» (hoy deshabilitado para clientes CSD/JCTW).
- Repaso de las demás carpetas contra `prueba/` (Rutinas, Volumen, Datos, Cuerpo, Cardio, Historial, Dashboard): casi todo se modificó en `prueba/` después de clonarlo.
- Nutrición (al final; motor congelado).

## Ideas pendientes (propuestas del 19-nov-2026)
1. **Resumen «Esta semana» en el Dashboard**: cambios de fase, avisos de eventos y renovaciones próximas.
2. **Fatiga real en las sugerencias**: usar energía/sueño/agujetas del check-in para decidir «estancado con/sin fatiga» (hay que mirar qué recoge el check-in).
3. **Atajos en Planificación**: botón «Crear macrociclo» en la fila (hoy solo se abre la pestaña Periodización) y aviso de bloques sin tipo.
4. **Fase sobre el gráfico de Volumen**: bandas Carga/Sobrecarga/Descarga detrás de las series semanales.
5. **Revisar la seguridad de los datos**: políticas RLS de Supabase (el código está en un repo público y maneja datos de clientes).
