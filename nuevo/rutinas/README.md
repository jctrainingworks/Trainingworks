# Rutinas

💪 Pestaña Rutinas de la ficha: rutinas, ejercicios, técnicas de alta intensidad, sesiones pasadas, alta de mesociclos.

**Estado:** 🟡 Parte 1 hecha (sep 2026): `index.js`, `vista.js`, `estilos.css`.
- **Hecho:** mesociclos como filtro (por defecto el activo, con punto ATR y aviso de duración), lista de rutinas con sus ejercicios (series, técnicas por serie, superseries/triseries, volumen equivalente, descarga), añadir y borrar rutina, número de orden de rotación (recoloca las demás y comprueba que Supabase lo guardó), mover de mesociclo y borrar ejercicio.
- **Pendiente (parte 2):** añadir y editar ejercicio (con el enlace por id a la biblioteca) y crear / cerrar / borrar mesociclos y "Bloque nuevo" (ATR, con la pregunta de bloque deportivo y fecha obligatoria). Mientras tanto, la pestaña lo dice y enlaza al panel actual.
- Lo compartido con otras pestañas está en `core/`: `tecnicas.js`, `atr.js` y `descarga.js`.
- Diferencia a propósito: si falla una carga, se dice (el panel actual la ocultaba y mostraba "no hay rutinas").

## Qué hay que clonar de `prueba/index.html`

- **Pinta:** `renderTecnicaSerieRow`, `renderGrupoTecnicaBlock`, `renderDetailRutinas`, `renderModalAddRoutine`, `renderModalLogPastSession`, `renderModalAddExercise`, `renderModalEditExercise`
- **Lógica/acciones/cálculos:** `blankEjercicio`, `parseSeriesDetalle`, `compararSerie`, `parseTecnicaSerie`, `formatTecnicaSerie`, `badgeTecnicaSerie`, `parseGrupoTecnica`, `colorGrupoCodigo`, `normalizaNombreEj`, `cargarRutinasRM`, `borrarSesion`, `borrarGrupoSesiones`, `setHistorialEjercicio`, `toggleSesionFecha`, `verSesionesMasAntiguas`, `suggestRanges`, `parseBloqueSerie`, `calcularTotalesSesiones`, `abrirModalSesionPasada`, `cambiarRutinaModalSesion`, `verEjercicioGrande`, `captureModalExFields`, `syncModalSeriesFromDOM`, `addModalSerie`, `removeModalSerie`, `updateModalSerie`, `setSerieTecnica`, `setGrupoTecnicaTipo`, `getRutinaIds`, `plantillaSeriesParaRutina`
- **Constantes/datos:** `TECNICAS_SERIE`, `TECNICAS_GRUPO`
- **Tablas de Supabase:** `rutinas`, `ejercicios`, `sesiones`

Lista generada del inventario (`../INVENTARIO.md`). Al clonar: mismas tablas y columnas, pintar con `esc()`, eventos por delegación (sin `onclick` inline) y estado propio dentro de la carpeta.
