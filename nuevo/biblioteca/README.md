# Biblioteca

📚 Biblioteca de ejercicios: alta/edición, buscador del catálogo (gifs), filtros.

**Estado:** ⏳ Placeholder (`index.js`).

## Qué hay que clonar de `prueba/index.html`

- **Pinta:** `renderBiblioteca`, `renderModalAddBib`, `renderModalEditBib`, `renderModalVerGif`
- **Lógica/acciones/cálculos:** `setBibTab`, `setBibMuscleFilter`, `setBibEquipoFilter`, `abrirGuardarDesdeCatalogo`, `cargarCatalogoEjercicios`, `initCatalogoEjercicios`, `esNombreIsometrico`, `setExerciseTipo`, `loadExerciseCache`, `setExMuscleFilter`, `setExEquipoFilter`, `setExTipoFilter`, `searchExDB`, `cerrarVerGif`, `selectExDB`, `filterBibSearch`, `pickFromBib`, `sincronizarPasosDesdeBiblioteca`, `loadBiblioteca`
- **Constantes/datos:** `CATALOGO_MUSCULOS`, `catalogoEjerciciosCache`, `EXERCISE_DB_LOCAL`, `ISOMETRIC_KEYWORDS`
- **Tablas de Supabase:** `ejercicios_biblioteca`

Lista generada del inventario (`../INVENTARIO.md`). Al clonar: mismas tablas y columnas, pintar con `esc()`, eventos por delegación (sin `onclick` inline) y estado propio dentro de la carpeta.
