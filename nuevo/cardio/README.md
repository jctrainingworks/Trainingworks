# Cardio

🫀 Pestaña Cardio de la ficha: PAR-Q, tests VO2max, zonas Karvonen, prescripción y progresión.

**Estado:** ✅ Clonada (sep 2026). Archivos: `calculos.js` (constantes y cálculos puros, copiados tal cual), `vista.js` (HTML), `index.js` (carga, eventos y guardados), `estilos.css`. Las gráficas usan `core/graficas.js` (Chart.js desde cdnjs, bajo demanda).

Diferencias con el panel actual (a propósito):
- Un fallo de red al cargar se dice; ya no se ofrece un PAR-Q en blanco como si no existiera.
- Los campos obligatorios de un test no pueden ir vacíos (antes un vacío contaba como 0 y podía dar un VO2máx falso).
- El sexo del test se preselecciona según la ficha del cliente.
- La tabla de cardio no enseña el marcador técnico `[[cardiozona:...]]` de las notas (la app del cliente lo sigue leyendo).
- Carga solo lo suyo: PAR-Q, valoraciones, rutina de cardio, sus ejercicios y sus sesiones.

## Qué hay que clonar de `prueba/index.html`

- **Pinta:** `renderDetailCardio`, `renderCardioHistorial`, `renderPrescripcionCardio`, `renderProgresionCardio`
- **Lógica/acciones/cálculos:** `clasificarVO2max`, `calcularVO2Test`, `parqVigente`, `guardarParq`, `guardarValoracionCardio`, `fcDeTest`, `textoFCTest`, `textoCintaTest`, `dibujarChartCardioTest`, `initChartsCardioTests`, `borrarValoracionCardio`, `calcularZonasKarvonen`, `getRutinaCardio`, `crearOAnadirCardio`, `initChartCardioProgresion`
- **Constantes/datos:** `PARQ_PREGUNTAS`, `PARQ_VIGENCIA_MESES`, `CARDIO_TESTS`, `VO2MAX_TABLA`, `CARDIO_FASE_SUGERIDA`
- **Tablas de Supabase:** `cardio_parq`, `cardio_valoraciones`, `rutinas`, `ejercicios`, `sesiones`, `seguimiento_corporal`

Lista generada del inventario (`../INVENTARIO.md`). Al clonar: mismas tablas y columnas, pintar con `esc()`, eventos por delegación (sin `onclick` inline) y estado propio dentro de la carpeta.
