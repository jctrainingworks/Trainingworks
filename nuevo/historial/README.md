# Historial

📊 Pestaña **Historial** de la ficha: vista Entrenos (el seguimiento corporal es la pestaña 📏 Cuerpo, aparte).

**Estado:** ✅ Clonada (sep 2026). Archivos: `calculos.js` (parseo de series, comparación de progreso,
mapas de mesociclo, detección de estancamiento/bajada — copiados tal cual del panel actual, con la
ventana de estancamiento de cardio ya a 5 sesiones), `vista.js` (HTML), `modalCambiarEjercicio.js`,
`modalSesionPasada.js`, `index.js`.

- **Aviso arriba del todo:** ejercicios estancados (⚠️, ventana de 3 sesiones en fuerza, 5 en cardio)
  y en bajada (🔻, 2 sesiones seguidas), sobre el histórico completo del cliente.
- **Filtro por mesociclo** (por defecto el activo; "Ver histórico completo" marca en las gráficas
  dónde empieza cada bloque) **y por ejercicio**.
- **Gráficas de progreso:** una tarjeta de peso por ejercicio, o si se filtra a uno solo, 3 tarjetas
  (peso, reps, nº de series). Usa `core/graficas.js` (Chart.js bajo demanda).
- **Sesiones agrupadas por día** en acordeón (cerrado por defecto, últimos 14 días; "Ver más antiguo"
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
