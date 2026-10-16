# test/ — zona de pruebas de nutrición (no toca nada real)

Creada el 16-oct-2026 a petición de Juan. Aquí se construye y se prueba el motor de nutrición nuevo
**sin tocar `prueba/` ni `app/` originales** (los que usan sus clientes).

| Carpeta | Qué es |
|---|---|
| `nutricion/motor-nutricion.js` | **El motor único** (solo cálculo). Cuando Juan lo apruebe, se conecta a `prueba/` y `app/` reales. |
| `nutricion/motor-nutricion.test.mjs` | Pruebas automáticas: `node test/nutricion/motor-nutricion.test.mjs` (`DIAS=3000 SEMILLA=777` opcionales). |
| `prueba/` | Copia del panel (14-oct-2026 + commit `2d2a8ac`). Aquí se engancha el motor y se prueba el probador. |
| `app/` | Copia de la app del cliente, para probar el motor ahí. |

⚠️ **Las copias usan el mismo Supabase real.** Probar el panel o la app desde `test/` lee y escribe datos reales
(planes, clientes). Para probar sin riesgo, usar solo el cliente de pruebas de Juan.

Las reglas siguen en `REGLAS-NUTRICION.md` (raíz). Las copias de `test/prueba` y `test/app` solo se cambian en
código de nutrición; lo demás queda igual que el original.
