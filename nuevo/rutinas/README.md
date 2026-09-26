# Rutinas

💪 Pestaña Rutinas de la ficha: rutinas, ejercicios, técnicas de alta intensidad, sesiones pasadas, alta de mesociclos.

**Estado:** ✅ Clonada entera (sep 2026). Es la pestaña con la que se abre la ficha ahora (antes Datos).
Archivos: `index.js` (carga, eventos, guardados), `vista.js` (HTML de la lista y los chips de mesociclo),
`modalEjercicio.js` (modal de añadir/editar ejercicio, con buscador en la biblioteca), `mesociclos.js`
(crear, "Bloque nuevo", borrar), `estilos.css`.

- **Mesociclos:** filtro por chips (con punto ATR, 🎯 si es deportivo y ⏱️ de duración), "+ Mesociclo"
  (sigue en el mismo bloque), "🔄 Bloque nuevo" (pregunta si es deportivo; si lo es, la fecha del
  objetivo es obligatoria — columnas nuevas `mesociclos.deportivo` y `mesociclos.fecha_objetivo`,
  ver `sql/rutinas_parte2.sql`) y borrar (las rutinas colgadas no se borran, quedan sin mesociclo).
  Un tipo de Transformación/Realización sin marcar deportivo pide confirmación. Un mesociclo de
  Recuperación ofrece activar el modo descarga del cliente.
- **Rutinas:** lista con sus ejercicios (series, técnicas por serie, superseries/triseries, volumen
  equivalente, descarga), añadir y borrar rutina, orden de rotación (recoloca las demás y comprueba
  que Supabase lo guardó) y mover de mesociclo.
- **Ejercicio (añadir/editar):** buscador SOLO en tu biblioteca (`ejercicios_biblioteca`, filtrable por
  músculo/equipo/rehabilitación), con enlace por id (`ejercicios.biblioteca_id`, ver `sql/rutinas_parte2.sql`)
  que se guarda al elegir uno y se quita si luego cambias el nombre a mano — pero siempre se puede
  escribir el nombre sin usar el buscador. Series editables con técnica por serie (drop set, rest-pause...),
  técnica de grupo (superserie/triserie), tipo dinámico/isométrico (con lastre opcional) y notas.
- Si a Supabase le falta alguna columna nueva (`biblioteca_id`, `deportivo`, `fecha_objetivo`), la
  pestaña guarda igual sin ese dato y avisa con el nombre del SQL a ejecutar, en vez de fallar.
- Lo compartido con otras pestañas está en `core/`: `tecnicas.js`, `atr.js` y `descarga.js`.
- Diferencia a propósito: si falla una carga, se dice (el panel actual la ocultaba y mostraba "no hay rutinas").
- **SQL pendiente de ejecutar:** `sql/rutinas_parte2.sql` (enlace de ejercicios con la biblioteca por
  nombre, y las columnas `deportivo`/`fecha_objetivo` de mesociclos). Sin él, la pestaña funciona
  igual pero sin esos dos añadidos, avisando cada vez.

## Qué hay que clonar de `prueba/index.html`

- **Pinta:** `renderTecnicaSerieRow`, `renderGrupoTecnicaBlock`, `renderDetailRutinas`, `renderModalAddRoutine`, `renderModalLogPastSession`, `renderModalAddExercise`, `renderModalEditExercise`
- **Lógica/acciones/cálculos:** `blankEjercicio`, `parseSeriesDetalle`, `compararSerie`, `parseTecnicaSerie`, `formatTecnicaSerie`, `badgeTecnicaSerie`, `parseGrupoTecnica`, `colorGrupoCodigo`, `normalizaNombreEj`, `cargarRutinasRM`, `borrarSesion`, `borrarGrupoSesiones`, `setHistorialEjercicio`, `toggleSesionFecha`, `verSesionesMasAntiguas`, `suggestRanges`, `parseBloqueSerie`, `calcularTotalesSesiones`, `abrirModalSesionPasada`, `cambiarRutinaModalSesion`, `verEjercicioGrande`, `captureModalExFields`, `syncModalSeriesFromDOM`, `addModalSerie`, `removeModalSerie`, `updateModalSerie`, `setSerieTecnica`, `setGrupoTecnicaTipo`, `getRutinaIds`, `plantillaSeriesParaRutina`
- **Constantes/datos:** `TECNICAS_SERIE`, `TECNICAS_GRUPO`
- **Tablas de Supabase:** `rutinas`, `ejercicios`, `sesiones`

Lista generada del inventario (`../INVENTARIO.md`). Al clonar: mismas tablas y columnas, pintar con `esc()`, eventos por delegación (sin `onclick` inline) y estado propio dentro de la carpeta.
