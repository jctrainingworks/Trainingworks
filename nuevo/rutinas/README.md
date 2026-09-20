# Rutinas

💪 Pestaña Rutinas de la ficha: rutinas, ejercicios, técnicas de alta intensidad, sesiones pasadas, alta de mesociclos.

**Estado:** ⏳ Pendiente. Se monta dentro de la ficha de `clientes/`.

## Qué hay que clonar de `prueba/index.html`

- **Pinta:** `renderTecnicaSerieRow`, `renderGrupoTecnicaBlock`, `renderDetailRutinas`, `renderModalAddRoutine`, `renderModalLogPastSession`, `renderModalAddExercise`, `renderModalEditExercise`
- **Lógica/acciones/cálculos:** `blankEjercicio`, `parseSeriesDetalle`, `compararSerie`, `parseTecnicaSerie`, `formatTecnicaSerie`, `badgeTecnicaSerie`, `parseGrupoTecnica`, `colorGrupoCodigo`, `normalizaNombreEj`, `cargarRutinasRM`, `borrarSesion`, `borrarGrupoSesiones`, `setHistorialEjercicio`, `toggleSesionFecha`, `verSesionesMasAntiguas`, `suggestRanges`, `parseBloqueSerie`, `calcularTotalesSesiones`, `abrirModalSesionPasada`, `cambiarRutinaModalSesion`, `verEjercicioGrande`, `captureModalExFields`, `syncModalSeriesFromDOM`, `addModalSerie`, `removeModalSerie`, `updateModalSerie`, `setSerieTecnica`, `setGrupoTecnicaTipo`, `getRutinaIds`, `plantillaSeriesParaRutina`
- **Constantes/datos:** `TECNICAS_SERIE`, `TECNICAS_GRUPO`
- **Tablas de Supabase:** `rutinas`, `ejercicios`, `sesiones`

Lista generada del inventario (`../INVENTARIO.md`). Al clonar: mismas tablas y columnas, pintar con `esc()`, eventos por delegación (sin `onclick` inline) y estado propio dentro de la carpeta.
