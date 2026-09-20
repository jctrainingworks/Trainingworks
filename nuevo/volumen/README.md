# Volumen

💪 Pestaña Volumen de la ficha: mesociclo activo, comparativa, línea de tiempo, sistema ATR, modo descarga.

**Estado:** ⏳ Pendiente. Se monta dentro de la ficha de `clientes/`.

## Qué hay que clonar de `prueba/index.html`

- **Pinta:** `renderBannerDescarga`, `renderComparativaMesociclos`, `renderDetailVolumen`, `renderTimelineMesociclos`, `renderDetailVolumenActivo`
- **Lógica/acciones/cálculos:** `mesocicloMapsDeCliente`, `filtroMesocicloEfectivo`, `rutinaIdsDeMesociclo`, `calcVolumenEquivalente`, `clientesConVolumenEnRojo`, `clientesConCheckinAtrasado`, `clientesConMesocicloAlargado`, `calcularEstadoDescarga`, `aplicarDescargaEjercicio`, `activarDescarga`, `sugerirActivarDescargaPorMesociclo`, `desactivarDescarga`, `toggleSesionDescarga`, `toggleGrupoDescarga`, `patronPerimetros`, `setHistorialMesociclo`, `toggleComparativa`, `volumenBloqueSerie`, `setVolumenVista`, `toggleMesocicloExpandido`, `setVolumenRango`, `setVolumenMetrica`, `semanasTranscurridasMesociclo`, `avisoDuracionMesociclo`, `pedirTipoATR`, `crearMesociclo`, `cambiarDeBloqueMesociclo`, `seleccionarMesociclo`, `borrarMesociclo`, `moverRutinaAMesociclo`
- **Constantes/datos:** `DESCARGA_LABELS`, `VOLUMEN_SEMANAL_RANGOS`, `MRV_REAL_POR_MUSCULO`, `ATR_TIPOS`, `ATR_ORDEN`, `ATR_PLANTILLAS_SERIES`, `ATR_DURACION_SEMANAS`
- **Tablas de Supabase:** `clientes`, `mesociclos`, `rutinas`

Lista generada del inventario (`../INVENTARIO.md`). Al clonar: mismas tablas y columnas, pintar con `esc()`, eventos por delegación (sin `onclick` inline) y estado propio dentro de la carpeta.
