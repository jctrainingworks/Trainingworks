// Configuración compartida del panel nuevo.
// La clave es la "publishable" de Supabase (pública por diseño), la misma que ya usa el panel actual.
export const SUPABASE_URL = 'https://wietxwxebyqncslgsdxx.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_eOWtUHB4vkqYlX26jVvDBA_5REbkLDl';
export const TRAINER_EMAIL = 'jctrainingworks@gmail.com';

// Clave de sesión PROPIA de este panel (distinta de la del panel actual). Supabase rota el
// refresh_token en cada uso: si los dos paneles compartieran clave, uno podría invalidar la sesión
// del otro. Consecuencia: la primera vez hay que iniciar sesión también aquí.
export const AUTH_STORAGE_KEY = 'jctw_nuevo_refresh_token';

// Módulo que se abre al entrar (cambiar a 'dashboard' cuando el Dashboard esté clonado).
export const RUTA_INICIAL = 'clientes';

// Pestaña que se abre en la ficha de cliente (cambiar a "rutinas" cuando esté clonada, como en el panel actual).
export const PESTANA_INICIAL = 'datos';
