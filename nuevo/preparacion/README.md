# Preparación (ATR)

🎯 Pestaña **Preparación (ATR)** de la ficha (nueva): planificación por bloques Acumulación-Transformación-Realización.

Decidido:

- **Solo aparece para bloques deportivos.** No sale en un cliente cuyo bloque no sea deportivo.
- **Se pregunta al crear el bloque nuevo** si es deportivo, y en ese caso **la fecha (objetivo/competición) es obligatoria**.

**Estado:** ⏳ Pendiente. Se monta dentro de la ficha de `clientes/`. Aprovecha lo que ya existe del sistema ATR en el panel actual (`volumen/`: `ATR_TIPOS`, `ATR_ORDEN`, `ATR_PLANTILLAS_SERIES`, `ATR_DURACION_SEMANAS`, `pedirTipoATR`, `cambiarDeBloqueMesociclo`) y la tabla `mesociclos` (`tipo_atr`, `fecha_inicio`, `fecha_fin`).

Al clonar: mismas tablas y columnas, pintar con `esc()`, eventos por delegación (sin `onclick` inline) y estado propio dentro de la carpeta.
