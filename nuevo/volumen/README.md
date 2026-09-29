# Volumen

💪 Pestaña Volumen de la ficha: mesociclo activo, comparativa, línea de tiempo, sistema ATR, modo descarga.

**Estado:** ✅ Clonada. Todo lo de Volumen de `prueba/index.html` está en el panel nuevo:
- 📊 Mesociclo activo (volumen por músculo, por sesión y tabla semanal con estado), con filtros Última semana / Todo el mesociclo y Series / Reps / Tonelaje.
- 📈 Comparar mesociclos (cambio % frente al anterior del mismo bloque, desglose por músculo desplegable).
- 🗓️ Línea de tiempo (Gantt ATR/CSD).
- 🔻 Banner de descarga en la cabecera de la ficha (`clientes/ficha.js`), con "Terminar descarga ahora".
- Acciones de mesociclos y de descarga: viven en `rutinas/mesociclos.js` (crear, bloque nuevo, borrar; ahora con tipos CSD y aviso de descarga también para el tipo "Descarga") y en `historial/` (marcar sesión o día como descarga).

Archivos: `index.js` (datos + eventos), `vista.js` (HTML), `calculos.js` (fórmulas). Comparte `core/atr.js` (con CSD), `core/series.js` y `core/descarga.js`. Pruebas: `pruebas/volumen.test.mjs`.

**Fuera de esta pestaña (siguen pendientes):** el selector ATR/CSD y la propuesta de macrociclo (pestaña Objetivo → `cuerpo/`), y las alertas del Dashboard (`clientesConVolumenEnRojo`, `clientesConCheckinAtrasado`, `clientesConMesocicloAlargado`).

## Qué hay que clonar de `prueba/index.html`

- **Pinta:** `renderBannerDescarga`, `renderComparativaMesociclos`, `renderDetailVolumen`, `renderTimelineMesociclos`, `renderDetailVolumenActivo`
- **Lógica/acciones/cálculos:** `mesocicloMapsDeCliente`, `filtroMesocicloEfectivo`, `rutinaIdsDeMesociclo`, `calcVolumenEquivalente`, `clientesConVolumenEnRojo`, `clientesConCheckinAtrasado`, `clientesConMesocicloAlargado`, `calcularEstadoDescarga`, `aplicarDescargaEjercicio`, `activarDescarga`, `sugerirActivarDescargaPorMesociclo`, `desactivarDescarga`, `toggleSesionDescarga`, `toggleGrupoDescarga`, `patronPerimetros`, `setHistorialMesociclo`, `toggleComparativa`, `volumenBloqueSerie`, `setVolumenVista`, `toggleMesocicloExpandido`, `setVolumenRango`, `setVolumenMetrica`, `semanasTranscurridasMesociclo`, `avisoDuracionMesociclo`, `pedirTipoATR`, `crearMesociclo`, `cambiarDeBloqueMesociclo`, `seleccionarMesociclo`, `borrarMesociclo`, `moverRutinaAMesociclo`
- **Constantes/datos:** `DESCARGA_LABELS`, `VOLUMEN_SEMANAL_RANGOS`, `MRV_REAL_POR_MUSCULO`, `ATR_TIPOS`, `ATR_ORDEN`, `ATR_PLANTILLAS_SERIES`, `ATR_DURACION_SEMANAS`
- **Tablas de Supabase:** `clientes`, `mesociclos`, `rutinas`

Lista generada del inventario (`../INVENTARIO.md`). Al clonar: mismas tablas y columnas, pintar con `esc()`, eventos por delegación (sin `onclick` inline) y estado propio dentro de la carpeta.
