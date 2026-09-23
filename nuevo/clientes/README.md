# Clientes

👥 Lista de clientes, ficha (cabecera + pestañas), 📋 Datos, alta/edición de cliente, Resumen PDF.

**Estado:** 🟡 Hechos: lista, ficha con barra de pestañas y pestaña Datos (`datos.js`, con `salud.js`; el nivel del atleta está en `core/atleta.js`). Faltan: alta/edición/borrado, cliente demo, Resumen PDF y los botones de la cabecera (Editar, Resumen PDF, Mensaje). La pestaña "Objetivo" desaparece: sus perímetros y composición pasan a Cuerpo y el plan de nutrición a Nutrición.

## Qué hay que clonar de `prueba/index.html`

- **Pinta:** `renderClients`, `renderClientCard`, `renderClientRow`, `renderDetail`, `renderDetailDatos`, `renderDetailObjetivo`, `renderPlanOptions`, `renderModalAddClient`, `renderModalGenerateResumen`
- **Lógica/acciones/cálculos:** `clientesConMolestiasAltas`, `toggleCheckin`, `avisarActivacion`, `onAnosEntrenoInput`, `actualizarInfoPatologias`, `actualizarInfoLesion`, `guardarSalud`, `guardarNotasPrivadas`, `actualizarDatosNutricionDesdeCliente`, `updatePlanOptions`, `generateResumen`, `loadClients`, `loadClientDetail`
- **Constantes/datos:** `PATOLOGIAS_LISTA`, `PATOLOGIA_INFO`, `LESION_INFO`
- **Tablas de Supabase:** `clientes`, `sesiones`, `avisos`, `seguimiento_corporal`, `mesociclos`, `rutinas`, `ejercicios`, `rm_estimaciones`, `planes_nutricion`, `cardio_parq`, `cardio_valoraciones`

Lista generada del inventario (`../INVENTARIO.md`). Al clonar: mismas tablas y columnas, pintar con `esc()`, eventos por delegación (sin `onclick` inline) y estado propio dentro de la carpeta.
