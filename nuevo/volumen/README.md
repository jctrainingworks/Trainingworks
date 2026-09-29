# Volumen

💪 Pestaña Volumen de la ficha: mesociclo activo, comparativa, línea de tiempo, sistema ATR, modo descarga.

**Estado:** 🟡 A medias. La pestaña ya está montada en la ficha con sus tres vistas, idénticas a `renderDetailVolumen` de `prueba/index.html`:
- 📊 Mesociclo activo (volumen por músculo, por sesión y tabla semanal con estado), con filtros Última semana / Todo el mesociclo y Series / Reps / Tonelaje.
- 📈 Comparar mesociclos (cambio % frente al anterior del mismo bloque, desglose por músculo desplegable).
- 🗓️ Línea de tiempo (Gantt ATR/CSD).

Archivos: `index.js` (datos + eventos), `vista.js` (HTML), `calculos.js` (fórmulas). Comparte `core/atr.js` (ahora con CSD) y `core/series.js`. Pruebas: `pruebas/volumen.test.mjs`.

**Pendiente:** el banner y las acciones del modo descarga, y las acciones de mesociclos (crear, cambiar de bloque, borrar, mover rutina), que hoy viven en la pestaña Rutinas.

## Qué hay que clonar de `prueba/index.html`

- **Pinta:** `renderBannerDescarga`, `renderComparativaMesociclos`, `renderDetailVolumen`, `renderTimelineMesociclos`, `renderDetailVolumenActivo`
- **Lógica/acciones/cálculos:** `mesocicloMapsDeCliente`, `filtroMesocicloEfectivo`, `rutinaIdsDeMesociclo`, `calcVolumenEquivalente`, `clientesConVolumenEnRojo`, `clientesConCheckinAtrasado`, `clientesConMesocicloAlargado`, `calcularEstadoDescarga`, `aplicarDescargaEjercicio`, `activarDescarga`, `sugerirActivarDescargaPorMesociclo`, `desactivarDescarga`, `toggleSesionDescarga`, `toggleGrupoDescarga`, `patronPerimetros`, `setHistorialMesociclo`, `toggleComparativa`, `volumenBloqueSerie`, `setVolumenVista`, `toggleMesocicloExpandido`, `setVolumenRango`, `setVolumenMetrica`, `semanasTranscurridasMesociclo`, `avisoDuracionMesociclo`, `pedirTipoATR`, `crearMesociclo`, `cambiarDeBloqueMesociclo`, `seleccionarMesociclo`, `borrarMesociclo`, `moverRutinaAMesociclo`
- **Constantes/datos:** `DESCARGA_LABELS`, `VOLUMEN_SEMANAL_RANGOS`, `MRV_REAL_POR_MUSCULO`, `ATR_TIPOS`, `ATR_ORDEN`, `ATR_PLANTILLAS_SERIES`, `ATR_DURACION_SEMANAS`
- **Tablas de Supabase:** `clientes`, `mesociclos`, `rutinas`

Lista generada del inventario (`../INVENTARIO.md`). Al clonar: mismas tablas y columnas, pintar con `esc()`, eventos por delegación (sin `onclick` inline) y estado propio dentro de la carpeta.
