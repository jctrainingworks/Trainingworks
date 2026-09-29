// Pestaña 💪 Volumen de la ficha: mesociclo activo (por músculo, por sesión y tabla semanal con estado),
// comparativa entre mesociclos y línea de tiempo. Réplica de la sección Volumen de prueba/index.html.
// Tablas: sesiones, rutinas, mesociclos, ejercicios_biblioteca (solo lectura).
import { crearResolvedorMusculo } from './calculos.js';
import { volumenHtml } from './vista.js';

// Catálogo local de ejercicios (nombres en inglés → músculo). Vive en el panel actual; si no se
// puede cargar, el músculo se resuelve solo con la Biblioteca y el resto cae en "Otro".
const CATALOGO_MUSCULOS = ['pecho', 'espalda', 'cuadriceps', 'isquiotibiales', 'gluteos', 'hombros', 'biceps', 'triceps', 'core', 'gemelos', 'trapecios', 'cardio', 'espalda-lumbar', 'antebrazo', 'aductores', 'abductores'];
let catalogoCache = null;
async function cargarCatalogo() {
  if (catalogoCache) return catalogoCache;
  const partes = await Promise.all(CATALOGO_MUSCULOS.map(m =>
    fetch(new URL(`../../prueba/catalogo-ejercicios/${m}.json`, import.meta.url)).then(r => r.ok ? r.json() : []).catch(() => [])));
  catalogoCache = partes.flat().map(e => ({ name: e.name_en, muscle: e.muscle }));
  return catalogoCache;
}

export default {
  id: 'volumen',
  icono: '💪',
  etiqueta: 'Volumen',
  orden: 60,

  async montar(contenedor, ctx) {
    const { cliente, api } = ctx;

    const [sesionesRaw, rutinas, mesociclos, biblioteca, catalogo] = await Promise.all([
      api.tabla('sesiones', { filtro: `codigo_cliente=eq.${cliente.codigo}&order=fecha.desc` }),
      api.tabla('rutinas', { filtro: `cliente_id=eq.${cliente.id}&order=orden.asc` }),
      api.tabla('mesociclos', { filtro: `cliente_id=eq.${cliente.id}&order=numero.asc` }).catch(() => []),
      api.tabla('ejercicios_biblioteca', { filtro: 'order=nombre_es.asc' }).catch(() => []),
      cargarCatalogo()
    ]);
    const historial = sesionesRaw.map(s => ({
      id: s.id, fecha: s.fecha, ejercicio: s.ejercicio, series: s.series_detalle,
      rutina_id: s.rutina_id ?? null, en_descarga: !!s.en_descarga
    }));

    const est = {
      cliente: { ...cliente, rutinas, mesociclos },
      vista: 'activo', rango: null, metrica: null, mesocicloExpandido: null
    };
    const musculoDe = crearResolvedorMusculo({ biblioteca, catalogo }, true);

    const pintar = () => { contenedor.innerHTML = volumenHtml(est, historial, musculoDe); };
    pintar();

    contenedor.addEventListener('click', e => {
      const el = e.target.closest('[data-accion]');
      if (!el) return;
      const v = el.dataset.valor;
      switch (el.dataset.accion) {
        case 'vista': est.vista = v; break;
        case 'rango': est.rango = v; break;
        case 'metrica': est.metrica = v; break;
        case 'expandir': est.mesocicloExpandido = String(est.mesocicloExpandido) === v ? null : (mesociclos.find(m => String(m.id) === v)?.id ?? v); break;
        default: return;
      }
      pintar();
    });
    return {};
  }
};
