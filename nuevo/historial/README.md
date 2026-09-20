# Historial

📊 Pestaña Historial de la ficha: sesiones, gráficas de entreno, estancamiento/progresión.

**Estado:** ⏳ Pendiente. Se monta dentro de la ficha de `clientes/`.

## Qué hay que clonar de `prueba/index.html`

- **Pinta:** `renderDetailHistorial`
- **Lógica/acciones/cálculos:** `getHistorialFiltradoParaCharts`, `construirDatosGraficasEntreno`, `detectarEstancamiento`, `detectarProgresionReciente`, `cargarHistorialRM`, `initChartsCorporal`, `setHistorialRango`, `setHistorialVista`, `dibujarChartMetrica`, `initCharts`
- **Constantes/datos:** `chartInstances`
- **Tablas de Supabase:** `rm_estimaciones`

Lista generada del inventario (`../INVENTARIO.md`). Al clonar: mismas tablas y columnas, pintar con `esc()`, eventos por delegación (sin `onclick` inline) y estado propio dentro de la carpeta.
