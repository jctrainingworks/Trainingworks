# Historial

📊 Pestaña **Historial** de la ficha, con dos vistas: 💪 Entrenos y 📈 Progreso (el seguimiento corporal, que antes era la tercera, es la pestaña 📏 Cuerpo).

**Estado:** ✅ Clonada (sep 2026) y puesta al día con `prueba` (oct: vista Progreso y notas del cliente). Archivos: `calculos.js` (parseo de series, comparación de progreso,
mapas de mesociclo, detección de estancamiento/bajada — copiados tal cual del panel actual, con la
ventana de estancamiento de cardio ya a 5 sesiones), `vista.js` (HTML), `modalCambiarEjercicio.js`,
`modalSesionPasada.js`, `notasSesion.js` (notas de sesión del cliente), `index.js`.

- **Aviso arriba del todo:** ejercicios estancados (⚠️, ventana de 3 sesiones en fuerza, 5 en cardio)
  y en bajada (🔻, 2 sesiones seguidas), sobre el histórico completo del cliente.
- **Filtro por mesociclo** (por defecto el activo; "Ver histórico completo" marca en las gráficas
  dónde empieza cada bloque) **y por ejercicio**.
- **Vista 📈 Progreso:** con varios ejercicios, un acordeón (una fila por ejercicio con el último peso y la tendencia ↑ / = / ↓ frente a la sesión anterior; se despliega para ver su gráfica; «Abrir todos / Cerrar todos»). Si se filtra a un ejercicio, 3 tarjetas (peso, reps, nº de series). Usa `core/graficas.js` (Chart.js bajo demanda). Aquí no sale la lista de sesiones.
- **Vista 💪 Entrenos — sesiones agrupadas por día** en acordeón (cerrado por defecto, últimos 14 días; "Ver más antiguo"
  suma de 30 en 30), con la comparación serie a serie contra la sesión anterior del mismo ejercicio
  (↑ progresa, ↓ baja, = igual, ★ primera vez), marcar/desmarcar descarga (día completo o una sesión),
  cambiar el ejercicio de una sesión ya registrada (buscador en tu biblioteca, igual que en Rutinas) y
  borrar (una sesión o el día entero).
- **📝 Registrar sesión pasada:** el entrenador mete una sesión con fecha manual, eligiendo rutina;
  una fila por serie de cada ejercicio. Usa la misma función `insertar_sesion_cliente` que la app del
  cliente, así queda igual que un registro normal salvo la fecha.
- Marcar descarga y registrar sesión pasada usan `rpc()` (funciones de Supabase `marcar_sesiones_descarga`
  e `insertar_sesion_cliente`), no un `PATCH`/`POST` directo — igual que el panel actual.
- Diferencia a propósito: si falla una carga, se dice, en vez de mostrar el historial vacío.
- **Tablas de Supabase:** `sesiones`, `rutinas`, `ejercicios`, `mesociclos`, `ejercicios_biblioteca`.
- **📝 Notas del cliente** (desde la app, tabla `sesiones_meta`): en Entrenos, un resumen de las últimas 5 sesiones con nota (chips, energía media, avisos si hay molestias o días duros repetidos, comentarios) y, en cada día, sus chips/energía en la cabecera y la nota completa al abrirlo. Se cargan en segundo plano; si la lectura directa viene vacía (RLS) se pregunta día a día con la RPC `obtener_sesion_meta`. Si no hay notas o falla la carga, no se muestra nada de esto. Chips actuales: 🔥 Día top, 👍 Normal, 😮‍💨 Día duro y 🤕 Con algunas molestias (se pueden marcar varios); los valores antiguos se siguen leyendo.
