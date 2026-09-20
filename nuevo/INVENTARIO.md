# Inventario del panel actual → base del panel nuevo

Generado el 20-sep-2026 leyendo **`prueba/index.html`** del repo público `Trainingworks` (último commit `fa44059`, 17-sep-2026) más `prueba/alimentos/catalogo.js`. **Solo lectura**: nada se ha tocado. Sirve para no perder ninguna función al rehacerlo.

## 1. En números

- `prueba/index.html`: 12.254 líneas (~881 KB): CSS ~605 líneas y un solo bloque de JS de 11.608 líneas.
- 342 funciones y 62 constantes/variables globales.
- 7 secciones en el menú lateral (Dashboard, Clientes, Biblioteca, Rutinas PDF, %1RM, Nutrición, Finanzas) y 7 pestañas en la ficha de cliente (Datos, Rutinas, Cardio, Historial, Volumen, Objetivo, Avisos).
- 14 tablas de Supabase usadas desde el panel.
- 85 campos distintos en el objeto global `state`.
- `JC_LOGO_BASE64` ocupa una línea de ~179 KB (≈20% del archivo).

### Lo que ya vive fuera del index

- `prueba/alimentos/catalogo.js` (116 líneas, `NUTRI_CATALOGO_V2`): ya se cargó aparte con un `<script src>`. Es el primer paso de partir el archivo y funciona.
- `prueba/nutricionV2/index.html` (~78 KB): laboratorio de nutrición standalone, previo a integrarlo en el panel.
- `prueba/nutricionv2`: contrato de datos de la Nutrición v2 (documento).

## 2. Carpetas propuestas para el panel nuevo

| Carpeta | Qué cubre | Líneas JS | Declaraciones |
|---|---|---:|---:|
| `core/` | Login, menú lateral, cabecera/nav móvil, `state`, API Supabase, modales de sistema (alerta/confirmar/pedir), eventos globales, init | 1440 | 41 |
| `dashboard/` | ⚡ Dashboard: avisos de entrenamiento, renovaciones, cumpleaños/aniversarios, avisos y pagos pendientes | 405 | 8 |
| `clientes/` | 👥 Clientes (lista/tarjetas), ficha de cliente (cabecera + pestañas), 📋 Datos, alta/edición de cliente, Resumen PDF | 1287 | 25 |
| `rutinas/` | 💪 pestaña Rutinas de la ficha: rutinas, ejercicios, técnicas de alta intensidad, sesiones pasadas, mesociclos (alta) | 845 | 39 |
| `historial/` | 📊 pestaña Historial: sesiones, gráficas de entreno, estancamiento/progresión | 647 | 12 |
| `volumen/` | 💪 pestaña Volumen: mesociclo activo, comparativa, línea de tiempo, sistema ATR, modo descarga | 878 | 42 |
| `seguimiento/` | Seguimiento corporal (peso + perímetros), análisis cruzado, veredicto, ritmo semanal, cálculos de composición/riesgo | 1004 | 63 |
| `nutricion/` | 🥗 Nutrición (menú) + pestaña 📏 Objetivo: gestor de alimentos y platos (v3), generador de plan por platos, macros, lista de compra, catálogo `alimentos/catalogo.js` | 2052 | 102 |
| `cardio/` | 🫀 pestaña Cardio: PAR-Q, tests VO2max (Rockport/Cooper/Queens), zonas Karvonen, prescripción y progresión | 555 | 24 |
| `avisos/` | 📣 pestaña Avisos: push al cliente, mensajes de motivación, activaciones | 268 | 10 |
| `biblioteca/` | 📚 Biblioteca de ejercicios: alta/edición, buscador del catálogo (gifs), filtros | 476 | 27 |
| `rutinaspdf/` | 🖨️ Rutinas PDF: plantillas de rutinas y generación para imprimir | 750 | 4 |
| `rm/` | 🏋️ %1RM: calculadora (Epley), guardado de estimaciones | 203 | 6 |
| `finanzas/` | 💰 Finanzas | 102 | 2 |

*(Ahora la nutrición pesa ~19% del JS; con el motor antiguo llegaba a ~29%.)*

## 3. Acoplamiento: lo que el contrato entre módulos tiene que resolver

**Núcleo que usan casi todas las secciones** (irían a `core/`, expuesto a cada módulo): `state`, `render`, `supabase`, `abrirAlerta`, `abrirConfirm`, `esc`, `enviarPushCliente`, `pesoActualDesdeSeguimiento`, `EXERCISE_DB_LOCAL`.

**`state` global:** de 85 campos, 36 los usa una sola sección (se van con su módulo), 38 los usan 2-3 y 11 los usan 4 o más: `alert`, `clientDetail`, `clients`, `modalData`, `modal`, `biblioteca`, `historialEjercicio`, `historialVista`, `dashSesiones`, `mesocicloSeleccionado`, `nutricionForm`. Esos son el contexto que cada módulo recibiría.

**Dependencias entre secciones más fuertes** (nº de símbolos distintos que una llama en otra):
- `nutricion` → `seguimiento`: 19
- `clientes` → `nutricion`: 15
- `rutinas` → `volumen`: 12
- `historial` → `rutinas`: 8
- `historial` → `volumen`: 6
- `rutinas` → `biblioteca`: 6
- `clientes` → `volumen`: 5
- `clientes` → `seguimiento`: 5
- `core` → `nutricion`: 11 y `core` → `rutinas`: 12 (el núcleo actual "sabe" demasiado de estos módulos: eso es lo que hay que invertir).

**Funciones gigantes (>150 líneas):**
- `handleModalConfirm` (560 líneas, core)
- `bindEvents` (362 líneas, core)
- `renderDetailVolumenActivo` (300 líneas, volumen)
- `renderDetailHistorial` (299 líneas, historial)
- `renderModalAddClient` (295 líneas, clientes)
- `generateResumen` (214 líneas, clientes)
- `generarInsightsSeguimiento` (182 líneas, seguimiento)
- `renderDetailNutricionV2` (165 líneas, nutricion)
- `renderModalAddExercise` (163 líneas, rutinas)
- `handleModalConfirm` es un único manejador para todos los modales de la app y `bindEvents` engancha todos los listeners a mano: en el nuevo, cada módulo debería registrar los suyos.

**Datos hardcodeados grandes:** `PLANTILLAS_RUTINAS` (579 líneas), `NUTRI_CATALOGO_V2` (111 líneas, archivo aparte), `PATOLOGIA_INFO` (73 líneas), `state` (68 líneas), `LESION_INFO` (65 líneas), `JC_LOGO_BASE64` (~179 KB en una línea). Candidatos a ir en archivos de datos o a tablas de Supabase.

## 4. Tablas de Supabase por sección

| Tabla | Secciones que la usan |
|---|---|
| `avisos` | avisos, clientes |
| `cardio_parq` | cardio, clientes |
| `cardio_valoraciones` | cardio, clientes |
| `clientes` | volumen, clientes, seguimiento, nutricion, core |
| `ejercicios` | rutinas, cardio, core, clientes |
| `ejercicios_biblioteca` | core, biblioteca |
| `mesociclos` | clientes, volumen |
| `nutri_alimentos_v3` | nutricion, core |
| `nutri_platos_v3` | nutricion, core |
| `planes_nutricion` | nutricion, core, clientes |
| `rm_estimaciones` | historial, rm, clientes |
| `rutinas` | rutinas, cardio, core, clientes, volumen |
| `seguimiento_corporal` | seguimiento, nutricion, core, clientes |
| `sesiones` | rutinas, clientes |

## 5. Inventario por sección

Nombres tal como están hoy en el panel (para localizarlos con Ctrl+F). Entre paréntesis, líneas si superan 100.

### `core/` — 41 declaraciones, 1440 líneas

Login, menú lateral, cabecera/nav móvil, `state`, API Supabase, modales de sistema (alerta/confirmar/pedir), eventos globales, init.

- **Pinta (render):** renderModalSistema, render, renderLogin, renderSidebar, renderMobileHeader, renderMobileBottomNav, renderMain, renderModal
- **Lógica/acciones/cálculos:** authLogin, authRefresh, authLogout, initAuthDesdeStorage, supabase, supabaseRPC, abrirAlerta, abrirConfirm, abrirPrompt, cerrarModalSistema, ejecutarConfirmSistema, ejecutarPromptSistema, fmtSemanasEtiqueta, loadPlanNutricion, esc, getMuscleGlobal, formatDescField, bindEvents (362), handleLogin, handleModalConfirm (560), formatDate, formatDateShort, formatDateShort2
- **Constantes/datos:** SUPABASE_URL, SUPABASE_KEY, TRAINER_EMAIL, authAccessToken, authRefreshToken, AUTH_STORAGE_KEY, state, MUSCLE_COLORS_GLOBAL, JC_LOGO_BASE64

### `dashboard/` — 8 declaraciones, 405 líneas

⚡ Dashboard: avisos de entrenamiento, renovaciones, cumpleaños/aniversarios, avisos y pagos pendientes.

- **Pinta (render):** renderAvisosEntrenamientoCard, renderDashboard (133), renderRenovacionesCard (142), renderCumpleAniversarioCard, renderAvisosPendientesCard
- **Lógica/acciones/cálculos:** esHoyMismoDiaMes, enviarFelicitacion, refrescarDashboard

### `clientes/` — 25 declaraciones, 1287 líneas

👥 Clientes (lista/tarjetas), ficha de cliente (cabecera + pestañas), 📋 Datos, alta/edición de cliente, Resumen PDF.

- **Pinta (render):** renderClients, renderClientCard, renderClientRow, renderDetail, renderDetailDatos (108), renderDetailObjetivo (121), renderPlanOptions, renderModalAddClient (295), renderModalGenerateResumen
- **Lógica/acciones/cálculos:** clientesConMolestiasAltas, toggleCheckin, avisarActivacion, onAnosEntrenoInput, actualizarInfoPatologias, actualizarInfoLesion, guardarSalud, guardarNotasPrivadas, actualizarDatosNutricionDesdeCliente, updatePlanOptions, generateResumen (214), loadClients, loadClientDetail
- **Constantes/datos:** PATOLOGIAS_LISTA, PATOLOGIA_INFO, LESION_INFO

### `rutinas/` — 39 declaraciones, 845 líneas

💪 pestaña Rutinas de la ficha: rutinas, ejercicios, técnicas de alta intensidad, sesiones pasadas, mesociclos (alta).

- **Pinta (render):** renderTecnicaSerieRow, renderGrupoTecnicaBlock, renderDetailRutinas (126), renderModalAddRoutine, renderModalLogPastSession, renderModalAddExercise (163), renderModalEditExercise (118)
- **Lógica/acciones/cálculos:** blankEjercicio, parseSeriesDetalle, compararSerie, parseTecnicaSerie, formatTecnicaSerie, badgeTecnicaSerie, parseGrupoTecnica, colorGrupoCodigo, normalizaNombreEj, cargarRutinasRM, borrarSesion, borrarGrupoSesiones, setHistorialEjercicio, toggleSesionFecha, verSesionesMasAntiguas, suggestRanges, parseBloqueSerie, calcularTotalesSesiones, abrirModalSesionPasada, cambiarRutinaModalSesion, verEjercicioGrande, captureModalExFields, syncModalSeriesFromDOM, addModalSerie, removeModalSerie, updateModalSerie, setSerieTecnica, setGrupoTecnicaTipo, getRutinaIds, plantillaSeriesParaRutina
- **Constantes/datos:** TECNICAS_SERIE, TECNICAS_GRUPO

### `historial/` — 12 declaraciones, 647 líneas

📊 pestaña Historial: sesiones, gráficas de entreno, estancamiento/progresión.

- **Pinta (render):** renderDetailHistorial (299)
- **Lógica/acciones/cálculos:** getHistorialFiltradoParaCharts, construirDatosGraficasEntreno, detectarEstancamiento, detectarProgresionReciente, cargarHistorialRM, initChartsCorporal, setHistorialRango, setHistorialVista, dibujarChartMetrica, initCharts
- **Constantes/datos:** chartInstances

### `volumen/` — 42 declaraciones, 878 líneas

💪 pestaña Volumen: mesociclo activo, comparativa, línea de tiempo, sistema ATR, modo descarga.

- **Pinta (render):** renderBannerDescarga, renderComparativaMesociclos, renderDetailVolumen, renderTimelineMesociclos, renderDetailVolumenActivo (300)
- **Lógica/acciones/cálculos:** mesocicloMapsDeCliente, filtroMesocicloEfectivo, rutinaIdsDeMesociclo, calcVolumenEquivalente, clientesConVolumenEnRojo, clientesConCheckinAtrasado, clientesConMesocicloAlargado, calcularEstadoDescarga, aplicarDescargaEjercicio, activarDescarga, sugerirActivarDescargaPorMesociclo, desactivarDescarga, toggleSesionDescarga, toggleGrupoDescarga, patronPerimetros, setHistorialMesociclo, toggleComparativa, volumenBloqueSerie, setVolumenVista, toggleMesocicloExpandido, setVolumenRango, setVolumenMetrica, semanasTranscurridasMesociclo, avisoDuracionMesociclo, pedirTipoATR, crearMesociclo, cambiarDeBloqueMesociclo, seleccionarMesociclo, borrarMesociclo, moverRutinaAMesociclo
- **Constantes/datos:** DESCARGA_LABELS, VOLUMEN_SEMANAL_RANGOS, MRV_REAL_POR_MUSCULO, ATR_TIPOS, ATR_ORDEN, ATR_PLANTILLAS_SERIES, ATR_DURACION_SEMANAS

### `seguimiento/` — 63 declaraciones, 1004 líneas

Seguimiento corporal (peso + perímetros), análisis cruzado, veredicto, ritmo semanal, cálculos de composición/riesgo.

- **Pinta (render):** renderAnalisisCruzado (110), renderSeguimientoCorporal, renderListaRegistrosSeguimiento, renderVeredicto, renderInsightsSeguimiento, renderGraficasSeguimiento (112), renderEcuacionNote
- **Lógica/acciones/cálculos:** lecturaPesoComposicion, toggleSeguimientoLista, borrarRegistroSeguimiento, borrarSeguimientoCorporal, bucketNivelAtleta, generarInsightsSeguimiento (182), generarInsightsCheckin, dedupeInsightsPorTema, calcularVeredicto, veredictoIrANutricion, veredictoIrAEntrenos, toggleSeguimientoGraficas, toggleSeguimientoCategoria, rnd, clamp, calcNavy, calcCustom, calcBFCat, calcBF, mapNivelATier, sugerirNivelAtleta, calcComp, calcWHtR, calcWHR, calcRCV, calcRH, calcRI, calcRS, calcIQF, calcIRR, calcIRE, calcIPO, guardarSeguimientoCorporal, calcularComposicionDesdeEntry, autocompletarComposicionSeguimiento, actualizarFrecuenciaSeguimiento, guardarNivelAtleta, deltaCintaTxt, abdomenTxt, abrirEditarPlato, pesoActualDesdeSeguimiento, abrirEditarBiblioteca
- **Constantes/datos:** NIVEL_SCORE, NIVEL_COLOR_MAP, CAMPOS_SEGUIMIENTO, CATEGORIAS_SEGUIMIENTO, OBJETIVO_LABEL, IRR_RANK, IRE_RANK, NIVEL_ATLETA_AVANZADO, RITMO_OBJETIVO, VEREDICTO_SEVERIDAD, VEREDICTO_CAT_ORDEN, VEREDICTO_CAT_LBL, DOT, NIVELES_ATLETA

### `nutricion/` — 102 declaraciones, 2052 líneas

🥗 Nutrición (menú) + pestaña 📏 Objetivo: gestor de alimentos y platos (v3), generador de plan por platos, macros, lista de compra, catálogo `alimentos/catalogo.js`.

- **Pinta (render):** renderGestorAlimentos, renderGestorPlatos, renderNutricionHubV2, renderDetailNutricionV2 (165), renderModalAlimento, renderModalPlato, renderModalNuevoManual
- **Lógica/acciones/cálculos:** toggleNutricion, toggleSuplementacion, nv2PerteneceATipo, nv2EsFranjaLigera, nv2round1, nv2round3, calcularMacrosItemV2, calcularMacrosAlternativaV2, generarEquivalenciasV2, validarPlanV2, generarBloqueSimpleV2, construirPlanV2DesdeObjetivo, calcularMacrosComidaV2, nv2FormatDesviaciones, nv2MediaPesoVentana, nv2TendenciaPesoQuincena, nv2SugerenciaAjusteCH, nv2CargarAdherencia, nv2CalcularKcalDesdeMacros, nv2ObjetivoEfectivo, NUTRI_CANDIDATOS_DEFAULT_V2, nv2AlimentosByIdV3, nv2EscalarGrupoMacroV3, nv2EscalarPlatoAObjetivoV3, nv2GenerarComidaV3, construirPlanV3DesdeObjetivo, nv2CandidatosComida, nv2ToggleCandidatoPlato, nv2Estado, nv2CargarPreferenciasGuardadas, nv2PorcentajesDefault, nv2GetPorcentajesComida, nv2ActualizarPorcentajeComida, nv2SeleccionEnvio, nv2ToggleEnvioPlato, nv2FoodKeysExcluidos, nv2CandidatosEfectivos, nv2ExclusionesEstado, nv2ToggleExcluido, nv2GuardarExclusiones, nv2Generar, nv2ActualizarObjetivo, nv2ActualizarObjetivoGKg, nv2ActualizarNumComidas, nv2ActualizarNumDias, nv2ToggleCandidato, nv2ToggleModoEntrenador, nv2FoodKeyElegido, nv2Reelegir, nv2RecalcularCascadaEnComida, nv2RelanzarCascadaTrasSeleccion, nv2NombreCortoPanel, nv2FoodKeyDeAlternativaPanel, nv2GuardarEnSupabase, loadNutriAlimentos, toggleGestorAlimentos, setGestorAlimentosFiltro, abrirNuevoAlimento, abrirEditarAlimento, loadNutriPlatos, toggleGestorPlatos, setGestorPlatosFiltro, abrirNuevoPlato, autocompletarRolIngrediente, syncModalPlatoIngredientesFromDOM, addModalPlatoIngrediente, removeModalPlatoIngrediente, defaultNutricionForm, nutriSuggestRanges, nutriResolveGkg, nutriCalcularTDEEEmpirico, nutriEmpiricoBlockHTML, nutriCalcularTodo, nutriCalcularComposicion, nutriPatologiasBloqueantes, nutriRiskRow, nutriRenderComposicionHtml, syncNutricionFromDOM, nfSetActividad, guardarPlanNutricion
- **Constantes/datos:** NUTRI_CATALOGO_V2 (111), NUTRI_TIPOS_BLOQUE_V2, NUTRI_MIXTO_ASIGNACION_V2, NUTRI_ESQUEMAS_COMIDAS_V2, NUTRI_EXTRAS_INSTRUCCIONES_V2, NUTRI_GRASA_MINIMA_COMPENSACION_G, NUTRI_PROTEINA_MINIMA_COMPENSACION_G, NUTRI_NOMBRE_A_FRANJA_V3, NUTRI_CAT_LABEL, NUTRI_CAT_COLOR, NUTRI_FRANJAS, NUTRI_ROL_ABREV, NUTRI_AJUSTE_DEFAULT, UMBRAL_CARB_BAJO_GKG, NUTRI_PATOLOGIAS_ALERTA

### `cardio/` — 24 declaraciones, 555 líneas

🫀 pestaña Cardio: PAR-Q, tests VO2max (Rockport/Cooper/Queens), zonas Karvonen, prescripción y progresión.

- **Pinta (render):** renderDetailCardio, renderCardioHistorial, renderPrescripcionCardio, renderProgresionCardio
- **Lógica/acciones/cálculos:** clasificarVO2max, calcularVO2Test, parqVigente, guardarParq, guardarValoracionCardio, fcDeTest, textoFCTest, textoCintaTest, dibujarChartCardioTest, initChartsCardioTests, borrarValoracionCardio, calcularZonasKarvonen, getRutinaCardio, crearOAnadirCardio, initChartCardioProgresion
- **Constantes/datos:** PARQ_PREGUNTAS, PARQ_VIGENCIA_MESES, CARDIO_TESTS, VO2MAX_TABLA, CARDIO_FASE_SUGERIDA

### `avisos/` — 10 declaraciones, 268 líneas

📣 pestaña Avisos: push al cliente, mensajes de motivación, activaciones.

- **Pinta (render):** renderDetailAvisos (117), renderModalSendPush
- **Lógica/acciones/cálculos:** publicarAviso, borrarHistorialAvisos, borrarAvisoIndividual, cargarAvisosCliente, calcularAvisoDesviacionComidaV2, frasesMotivacionPara, enviarPushCliente
- **Constantes/datos:** MOTIVACION_PUSH_FRASES

### `biblioteca/` — 27 declaraciones, 476 líneas

📚 Biblioteca de ejercicios: alta/edición, buscador del catálogo (gifs), filtros.

- **Pinta (render):** renderBiblioteca (120), renderModalAddBib, renderModalEditBib, renderModalVerGif
- **Lógica/acciones/cálculos:** setBibTab, setBibMuscleFilter, setBibEquipoFilter, abrirGuardarDesdeCatalogo, cargarCatalogoEjercicios, initCatalogoEjercicios, esNombreIsometrico, setExerciseTipo, loadExerciseCache, setExMuscleFilter, setExEquipoFilter, setExTipoFilter, searchExDB, cerrarVerGif, selectExDB, filterBibSearch, pickFromBib, sincronizarPasosDesdeBiblioteca, loadBiblioteca
- **Constantes/datos:** CATALOGO_MUSCULOS, catalogoEjerciciosCache, EXERCISE_DB_LOCAL, ISOMETRIC_KEYWORDS

### `rutinaspdf/` — 4 declaraciones, 750 líneas

🖨️ Rutinas PDF: plantillas de rutinas y generación para imprimir.

- **Pinta (render):** renderRutinasPDF
- **Lógica/acciones/cálculos:** syncPdfDiasFromDOM, generatePDFRutina
- **Constantes/datos:** PLANTILLAS_RUTINAS (579)

### `rm/` — 6 declaraciones, 203 líneas

🏋️ %1RM: calculadora (Epley), guardado de estimaciones.

- **Pinta (render):** renderRM (146), renderMiniRMs
- **Lógica/acciones/cálculos:** epley1RM, epleyPesoParaReps, borrarRM, guardarRM

### `finanzas/` — 2 declaraciones, 102 líneas

💰 Finanzas.

- **Pinta (render):** renderFinanzas, renderPagosPendientesCard

## 6. Código que probablemente NO hay que clonar

Desde las entradas reales del panel (init, HTML, botones) no se llega a **27 declaraciones (587 líneas)**. Son candidatos a código muerto: se revisan con Juan antes de descartarlas (si algún nombre se construye dinámicamente, esta detección no lo ve). Las de nutrición `*V2` parecen restos de la versión anterior a la v3.

- `renderAnalisisCruzado` (seguimiento, 110 líneas, L3930)
- `construirPlanV2DesdeObjetivo` (nutricion, 84 líneas, L6409)
- `nutriEmpiricoBlockHTML` (nutricion, 69 líneas, L7786)
- `nutriCalcularTodo` (nutricion, 69 líneas, L7856)
- `validarPlanV2` (nutricion, 52 líneas, L6332)
- `detectarProgresionReciente` (historial, 28 líneas, L1601)
- `filterBibSearch` (biblioteca, 28 líneas, L10455)
- `nutriCalcularTDEEEmpirico` (nutricion, 24 líneas, L7761)
- `renderInsightsSeguimiento` (seguimiento, 18 líneas, L4468)
- `pickFromBib` (biblioteca, 14 líneas, L10484)
- `nv2RelanzarCascadaTrasSeleccion` (nutricion, 12 líneas, L7142)
- `renderEcuacionNote` (seguimiento, 12 líneas, L8120)
- `calcularMacrosComidaV2` (nutricion, 11 líneas, L6494)
- `NUTRI_CANDIDATOS_DEFAULT_V2` (nutricion, 11 líneas, L6636)
- `nutriResolveGkg` (nutricion, 9 líneas, L7748)
- `NUTRI_MIXTO_ASIGNACION_V2` (nutricion, 7 líneas, L6232)
- `nv2ToggleCandidato` (nutricion, 7 líneas, L7031)
- `nv2PerteneceATipo` (nutricion, 5 líneas, L6242)
- `nv2NombreCortoPanel` (nutricion, 5 líneas, L7155)
- `nv2EsFranjaLigera` (nutricion, 3 líneas, L6250)
- `nv2FoodKeyDeAlternativaPanel` (nutricion, 3 líneas, L7160)
- `setHistorialRango` (historial, 1 líneas, L4677)
- `NUTRI_TIPOS_BLOQUE_V2` (nutricion, 1 líneas, L6226)
- `nv2round3` (nutricion, 1 líneas, L6255)
- `NUTRI_EXTRAS_INSTRUCCIONES_V2` (nutricion, 1 líneas, L6390)
- `NUTRI_AJUSTE_DEFAULT` (nutricion, 1 líneas, L7758)
- `UMBRAL_CARB_BAJO_GKG` (nutricion, 1 líneas, L7759)

## 7. Decisiones abiertas

1. ✅ Dónde vive el panel nuevo: decidido, `nuevo/` en el repo público, junto a `prueba/`.
2. Reparto de carpetas de la sección 2: ¿juntar/separar alguna (p. ej. `historial` dentro de `clientes`, `seguimiento` dentro de `nutricion`)?
3. ✅ Contrato de módulo: hecho, ver `core/modulos.js` (`montar(contenedor, ctx)`).
4. Build: por ahora sin build (módulos ES nativos); juntar todo en un único archivo con esbuild queda para el final.
5. Nutrición: se porta la v3 (`nv2*`, gestor de platos, catálogo), no el motor antiguo.
6. Datos hardcodeados (plantillas de rutinas, catálogo): ¿siguen en código o pasan a JSON/Supabase?
