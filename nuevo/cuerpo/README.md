# Cuerpo

📏 Pestaña Cuerpo de la ficha: seguimiento corporal (peso, perímetros, composición, check-ins), **lectura rápida** de tendencia, veredicto y gráficas por categoría.

**Estado:** ✅ Clonada (oct 2026). Archivos: `calculos.js` (constantes, insights, veredicto y composición desde un registro; copiados tal cual), `lecturaRapida.js` (tarjeta de peso medio + cintura + fuerza), `vista.js` (HTML), `modalRegistro.js` (＋ Añadir registro), `index.js` (carga, eventos y guardados), `estilos.css`. La composición (Navy, IMC, FFMI, riesgos, IQF/IRR/IRE/IPO) vive en `core/composicion.js`; la gráfica en `core/graficas.js` (`seguimiento`).

Diferencias con el panel actual (a propósito):
- **Perímetros y composición ya no se rellenan en Nutrición**: se meten aquí con «＋ Añadir registro» (peso + 7 perímetros + si entrena +4h). Si ya hay un registro de hoy se actualiza. Los campos son de texto para poder escribir con coma.
- Si falta altura/edad en la ficha o alguna medida, el registro se guarda **sin composición** y se avisa (en lugar de calcular un % graso falso).
- Un fallo al cargar se dice; el vacío no se enseña como si no hubiera datos. Si falla el historial de entrenos, la lectura rápida lo avisa y sigue sin la fuerza.
- Borrar (uno o todo) comprueba que se ha borrado de verdad y, si no, avisa de la política RLS.
- El botón «Qué tocar» del veredicto navega con la ruta de nuevo (`nutricion` o la pestaña Historial del cliente).
- No se han clonado `renderAnalisisCruzado` ni `renderInsightsSeguimiento`: están sin usar en el panel actual.
- Se mantiene el **autocompletado de composición** de los check-ins plus (se calcula y se guarda al abrir la pestaña), como en el panel actual. Un check-in **simple** (solo peso + cintura) no genera composición.

Datos que usa: `seguimiento_corporal`, `planes_nutricion.objetivo_calorico`, `clientes.checkin_simple_activo` / `checkin_activo`, y (solo para la fuerza) `sesiones`, `rutinas`, `mesociclos` con la misma detección de estancamiento que Historial (`../historial/calculos.js`).

Pendiente de decidir: a dónde lleva «Ir a Nutrición» mientras Nutrición no esté clonada (ahora navega a `#/nutricion`).
