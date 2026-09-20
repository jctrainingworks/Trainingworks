# Seguimiento

Seguimiento corporal (peso + perímetros), análisis cruzado, veredicto, ritmo semanal, cálculos de composición y riesgo.

**Estado:** ⏳ Pendiente. Alimenta a la pestaña Objetivo y a Nutrición.

## Qué hay que clonar de `prueba/index.html`

- **Pinta:** `renderAnalisisCruzado`, `renderSeguimientoCorporal`, `renderListaRegistrosSeguimiento`, `renderVeredicto`, `renderInsightsSeguimiento`, `renderGraficasSeguimiento`, `renderEcuacionNote`
- **Lógica/acciones/cálculos:** `lecturaPesoComposicion`, `toggleSeguimientoLista`, `borrarRegistroSeguimiento`, `borrarSeguimientoCorporal`, `bucketNivelAtleta`, `generarInsightsSeguimiento`, `generarInsightsCheckin`, `dedupeInsightsPorTema`, `calcularVeredicto`, `veredictoIrANutricion`, `veredictoIrAEntrenos`, `toggleSeguimientoGraficas`, `toggleSeguimientoCategoria`, `rnd`, `clamp`, `calcNavy`, `calcCustom`, `calcBFCat`, `calcBF`, `mapNivelATier`, `sugerirNivelAtleta`, `calcComp`, `calcWHtR`, `calcWHR`, `calcRCV`, `calcRH`, `calcRI`, `calcRS`, `calcIQF`, `calcIRR`, `calcIRE`, `calcIPO`, `guardarSeguimientoCorporal`, `calcularComposicionDesdeEntry`, `autocompletarComposicionSeguimiento`, `actualizarFrecuenciaSeguimiento`, `guardarNivelAtleta`, `deltaCintaTxt`, `abdomenTxt`, `abrirEditarPlato`, `pesoActualDesdeSeguimiento`, `abrirEditarBiblioteca`
- **Constantes/datos:** `NIVEL_SCORE`, `NIVEL_COLOR_MAP`, `CAMPOS_SEGUIMIENTO`, `CATEGORIAS_SEGUIMIENTO`, `OBJETIVO_LABEL`, `IRR_RANK`, `IRE_RANK`, `NIVEL_ATLETA_AVANZADO`, `RITMO_OBJETIVO`, `VEREDICTO_SEVERIDAD`, `VEREDICTO_CAT_ORDEN`, `VEREDICTO_CAT_LBL`, `DOT`, `NIVELES_ATLETA`
- **Tablas de Supabase:** `seguimiento_corporal`, `clientes`

Lista generada del inventario (`../INVENTARIO.md`). Al clonar: mismas tablas y columnas, pintar con `esc()`, eventos por delegación (sin `onclick` inline) y estado propio dentro de la carpeta.
