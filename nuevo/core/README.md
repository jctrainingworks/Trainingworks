# Core

Lo único que comparten todas las secciones. Sin lógica de entrenamiento ni de nutrición.

| Archivo | Para qué |
|---|---|
| `app.js` | Arranque: sesión → shell (menú + zona principal) → rutas por hash (`#/modulo/parte`) |
| `api.js` | Login con Supabase Auth, refresh de sesión y acceso a tablas (`api.tabla`, `api.rpc`) |
| `datos.js` | Datos compartidos con caché (`clientes`, `sesiones`); "Actualizar" los invalida |
| `store.js` | Almacén mínimo de estado compartido |
| `ui.js` | `esc()`, `alerta()`, `confirmar()`, `cargarCss()`, `cargando()` |
| `modulos.js` | Registro de módulos y contrato de un módulo |
| `pendiente.js` | Módulo provisional para lo que aún no se ha clonado |
| `config.js` | URL/clave de Supabase, clave de sesión propia, ruta inicial |
| `estilos.css` | Estilos base (copiados del panel actual) |

**Regla:** un módulo solo habla con el resto a través de `ctx` (`api`, `datos`, `store`, `ui`, `navegar`, `ruta`). No importa otros módulos.
