# Cardio

🫀 Pestaña Cardio de la ficha: PAR-Q, tests VO2max, zonas Karvonen, prescripción y progresión.

**Estado:** ⏳ Pendiente. Se monta dentro de la ficha de `clientes/`.

## Qué hay que clonar de `prueba/index.html`

- **Pinta:** `renderDetailCardio`, `renderCardioHistorial`, `renderPrescripcionCardio`, `renderProgresionCardio`
- **Lógica/acciones/cálculos:** `clasificarVO2max`, `calcularVO2Test`, `parqVigente`, `guardarParq`, `guardarValoracionCardio`, `fcDeTest`, `textoFCTest`, `textoCintaTest`, `dibujarChartCardioTest`, `initChartsCardioTests`, `borrarValoracionCardio`, `calcularZonasKarvonen`, `getRutinaCardio`, `crearOAnadirCardio`, `initChartCardioProgresion`
- **Constantes/datos:** `PARQ_PREGUNTAS`, `PARQ_VIGENCIA_MESES`, `CARDIO_TESTS`, `VO2MAX_TABLA`, `CARDIO_FASE_SUGERIDA`
- **Tablas de Supabase:** `cardio_parq`, `cardio_valoraciones`, `rutinas`, `ejercicios`

Lista generada del inventario (`../INVENTARIO.md`). Al clonar: mismas tablas y columnas, pintar con `esc()`, eventos por delegación (sin `onclick` inline) y estado propio dentro de la carpeta.
