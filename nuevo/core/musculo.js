// Músculo de cada ejercicio, compartido por Volumen y Dashboard. Mismo criterio que getMuscleGlobal
// de prueba/index.html: primero la Biblioteca del entrenador, después el catálogo local (nombres en
// inglés) y, si no está en ninguno, 'Otro'.

// Normaliza nombres de ejercicio para comparar sin fallos por tildes/espacios/mayúsculas.
export function normalizaNombreEj(s) {
  return (s || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

// `avisar`: deja un aviso en consola cuando un ejercicio no está en ninguna parte.
export function crearResolvedorMusculo({ biblioteca = [], catalogo = [] } = {}, avisar = false) {
  return nombre => {
    const n = normalizaNombreEj(nombre);
    const enBiblioteca = biblioteca.find(b => normalizaNombreEj(b.nombre_es) === n);
    if (enBiblioteca) return enBiblioteca.musculo || 'Otro';
    const found = catalogo.find(e => normalizaNombreEj(e.name) === n);
    if (found) return found.muscle;
    if (avisar && nombre) console.warn('[Volumen] Ejercicio sin músculo asignado (no está en tu Biblioteca ni en el catálogo):', nombre);
    return 'Otro';
  };
}

// Catálogo local de ejercicios (nombres en inglés → músculo). Vive en el panel actual; si no se
// puede cargar, el músculo se resuelve solo con la Biblioteca y el resto cae en "Otro".
const CATALOGO_MUSCULOS = ['pecho', 'espalda', 'cuadriceps', 'isquiotibiales', 'gluteos', 'hombros', 'biceps', 'triceps', 'core', 'gemelos', 'trapecios', 'cardio', 'espalda-lumbar', 'antebrazo', 'aductores', 'abductores'];
let catalogoCache = null;
export async function cargarCatalogo() {
  if (catalogoCache) return catalogoCache;
  const partes = await Promise.all(CATALOGO_MUSCULOS.map(m =>
    fetch(new URL(`../../prueba/catalogo-ejercicios/${m}.json`, import.meta.url)).then(r => r.ok ? r.json() : []).catch(() => [])));
  catalogoCache = partes.flat().map(e => ({ name: e.name_en, muscle: e.muscle }));
  return catalogoCache;
}
