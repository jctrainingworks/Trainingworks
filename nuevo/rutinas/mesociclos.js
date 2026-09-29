// Rutinas · gestión de mesociclos: "+ Mesociclo" (sigue en el mismo bloque), "🔄 Bloque nuevo" y borrar.
// Bloque nuevo pregunta si es deportivo y, en ese caso, la fecha del objetivo es obligatoria
// (columnas mesociclos.deportivo y mesociclos.fecha_objetivo: ver sql/rutinas_parte2.sql).
import { ATR_TIPOS, ATR_ORDEN, CSD_TIPOS, CSD_ORDEN, BLOQUE_TIPOS } from '../core/atr.js';
import { DESCARGA_LABELS } from '../core/descarga.js';

const hoyLocal = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
// Catálogo según el modelo del cliente: 'ATR' (por defecto) o 'CSD'.
const opcionesTipo = modelo => [
  ...(modelo === 'CSD' ? CSD_ORDEN.map(k => ({ valor: k, etiqueta: CSD_TIPOS[k].label })) : ATR_ORDEN.map(k => ({ valor: k, etiqueta: ATR_TIPOS[k].label }))),
  { valor: '', etiqueta: 'Sin especificar' }
];
const fechaLocalISO = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const faltanColumnas = e => /deportivo|fecha_objetivo/.test(String(e && e.message));

// est = { mesociclos, rutinas, sel }; recargar() relee mesociclos y rutinas de la base de datos.
export function crearGestorMesociclos({ cliente, api, ui, est, recargar, actualizarCliente }) {
  const modelo = () => cliente.modelo_periodizacion || 'ATR';

  // Transformación y Realización suelen reservarse para objetivos de rendimiento con fecha fija.
  async function confirmarTipo(tipo, deportivo) {
    // El aviso solo tiene sentido en ATR: en CSD los cuatro tipos son de uso normal.
    if (!tipo || deportivo || !ATR_TIPOS[tipo] || ATR_TIPOS[tipo].grupo === 'Acumulación') return;
    const ok = await ui.confirmar(
      `⚠️ "${ATR_TIPOS[tipo].label}" suele reservarse para clientes con objetivo de rendimiento o competición con fecha fija (deportistas, oposiciones). Para el resto de clientes lo habitual es quedarse en Acumulación.\n\n¿Quieres usarlo igualmente?`,
      { titulo: 'Confirmar tipo de bloque', aceptar: 'Sí, usarlo' });
    if (!ok) throw new Error('Elige otro tipo de bloque, o confirma el aviso para usarlo.');
  }

  async function sugerirDescarga(tipoAtr) {
    if (tipoAtr !== 'acu_recuperacion' && tipoAtr !== 'rea_recuperacion' && tipoAtr !== 'descarga') return;
    if (cliente.modo_descarga) return; // ya está en descarga, no insistir
    const quiere = await ui.confirmar(
      `Este mesociclo es de tipo "${BLOQUE_TIPOS[tipoAtr].label}".\n\n¿Quieres activar también el modo descarga del cliente para que sus rutinas se ajusten automáticamente durante esta fase?`,
      { titulo: 'Activar modo descarga', aceptar: 'Sí, activar' });
    if (!quiere) return;
    await ui.formulario({
      titulo: 'Modo descarga', aceptar: 'Activar',
      campos: [
        { id: 'tipo', etiqueta: 'Tipo de descarga', tipo: 'select', valor: 'volumen', opciones: Object.keys(DESCARGA_LABELS).map(k => ({ valor: k, etiqueta: DESCARGA_LABELS[k] })) },
        { id: 'dias', etiqueta: '¿Cuántos días dura la descarga?', tipo: 'number', valor: 7, min: 1 }
      ],
      alEnviar: async v => {
        const fin = new Date();
        fin.setDate(fin.getDate() + (parseInt(v.dias) || 7));
        const cuerpo = { modo_descarga: true, tipo_descarga: v.tipo, descarga_fin: fechaLocalISO(fin) };
        try {
          await api.tabla('clientes', { method: 'PATCH', filtro: `id=eq.${cliente.id}`, cuerpo });
        } catch (e) {
          throw new Error('No se pudo activar la descarga. Revisa que existan las columnas modo_descarga/tipo_descarga/descarga_fin en Supabase. ' + e.message);
        }
        actualizarCliente(cuerpo);
      }
    });
  }

  // Cierra el mesociclo activo (si lo hay) y crea el nuevo. Si crear falla, intenta reabrir el anterior.
  async function cerrarYCrear(activo, nuevo) {
    const hoy = hoyLocal();
    if (activo) await api.tabla('mesociclos', { method: 'PATCH', filtro: `id=eq.${activo.id}`, cuerpo: { fecha_fin: hoy } });
    const cuerpo = { cliente_id: cliente.id, fecha_inicio: hoy, fecha_fin: null, ...nuevo };
    let aviso = '';
    try {
      try {
        await api.tabla('mesociclos', { method: 'POST', cuerpo });
      } catch (e) {
        if (!faltanColumnas(e)) throw e;
        const { deportivo, fecha_objetivo, ...sin } = cuerpo;
        await api.tabla('mesociclos', { method: 'POST', cuerpo: sin });
        aviso = 'Creado, pero sin marcar como deportivo: falta ejecutar sql/rutinas_parte2.sql en Supabase.';
      }
    } catch (e) {
      if (activo) await api.tabla('mesociclos', { method: 'PATCH', filtro: `id=eq.${activo.id}`, cuerpo: { fecha_fin: null } }).catch(() => {});
      throw e;
    }
    await recargar();
    // El PATCH no devuelve filas: si RLS lo bloquea no da error, así que se comprueba releyendo.
    const previo = activo && est.mesociclos.find(m => String(m.id) === String(activo.id));
    return { aviso, sinCerrar: !!(previo && !previo.fecha_fin) };
  }

  // El aviso de error (si lo hay) manda: ui.alerta reemplaza, no apila, y lo importante no puede
  // quedar tapado por el "✅ creado".
  function resultado({ aviso, sinCerrar }, mensaje) {
    if (sinCerrar) ui.alerta('El mesociclo nuevo se creó, pero el anterior no se cerró: Supabase no permitió el UPDATE en "mesociclos" (revisa la política RLS).', 'error');
    else if (aviso) ui.alerta(aviso, 'error');
    else ui.alerta(mensaje);
  }

  // "+ Mesociclo": suma dentro del MISMO bloque (mismo nombre). Cierra el activo y numera +1.
  async function crearMesociclo() {
    const activo = est.mesociclos.find(m => !m.fecha_fin);
    if (!activo) return bloqueNuevo();
    const bloque = activo.nombre || null;
    const delBloque = est.mesociclos.filter(m => (m.nombre || null) === bloque);
    const numero = delBloque.length ? Math.max(...delBloque.map(m => m.numero || 0)) + 1 : 1;
    let tipoElegido = '';
    let res;
    const ok = await ui.formulario({
      titulo: `Nuevo ${bloque || 'mesociclo'} ${numero}`, subtitulo: 'Cierra el mesociclo activo y sigue en el mismo bloque.', aceptar: 'Crear',
      campos: [{ id: 'tipo', etiqueta: `Tipo de bloque (${modelo()}) — opcional`, tipo: 'select', valor: activo.tipo_atr || '', opciones: opcionesTipo(modelo()) }],
      alEnviar: async v => {
        await confirmarTipo(v.tipo, activo.deportivo);
        tipoElegido = v.tipo;
        const nuevo = { numero, nombre: bloque, tipo_atr: v.tipo || null };
        if (activo.deportivo) { nuevo.deportivo = true; nuevo.fecha_objetivo = activo.fecha_objetivo || null; }
        res = await cerrarYCrear(activo, nuevo);
      }
    });
    if (!ok) return;
    resultado(res, `✅ ${bloque ? bloque + ' ' : 'Mesociclo '}${numero} creado`);
    await sugerirDescarga(tipoElegido);
  }

  // "🔄 Bloque nuevo": nombre nuevo, mesociclo 1 de ese bloque; cierra el activo anterior si lo hay.
  async function bloqueNuevo() {
    const activo = est.mesociclos.find(m => !m.fecha_fin);
    let nombreFinal = '', tipoElegido = '';
    let res;
    const ok = await ui.formulario({
      titulo: 'Bloque nuevo', subtitulo: 'Empieza en el mesociclo 1 del bloque. Cierra el mesociclo activo, si lo hay.', aceptar: 'Crear bloque',
      campos: [
        { id: 'nombre', etiqueta: 'Nombre del bloque', placeholder: 'Ej: Fuerza General, Especialización Tríceps' },
        { id: 'tipo', etiqueta: `Tipo de bloque (${modelo()}) — opcional`, tipo: 'select', valor: modelo() === 'CSD' ? 'carga' : 'acu_carga', opciones: opcionesTipo(modelo()) },
        { id: 'deportivo', etiqueta: '🎯 Es un bloque deportivo (competición o prueba con fecha)', tipo: 'checkbox', valor: false },
        { id: 'fecha', etiqueta: 'Fecha del objetivo', tipo: 'date', ayuda: 'Obligatoria si el bloque es deportivo: fecha de la competición o prueba.' }
      ],
      alEnviar: async v => {
        if (v.deportivo && !v.fecha) throw new Error('La fecha del objetivo es obligatoria en un bloque deportivo.');
        if (v.deportivo && v.fecha < hoyLocal()) throw new Error('La fecha del objetivo no puede ser anterior a hoy.');
        await confirmarTipo(v.tipo, v.deportivo);
        nombreFinal = v.nombre.trim();
        tipoElegido = v.tipo;
        const nuevo = { numero: 1, nombre: nombreFinal || null, tipo_atr: v.tipo || null };
        if (v.deportivo) { nuevo.deportivo = true; nuevo.fecha_objetivo = v.fecha; }
        res = await cerrarYCrear(activo, nuevo);
      }
    });
    if (!ok) return;
    resultado(res, `✅ Bloque "${nombreFinal || 'sin nombre'}" creado (mesociclo 1)`);
    await sugerirDescarga(tipoElegido);
  }

  // Borra un mesociclo creado por error. Sus rutinas no se borran: pasan a "sin mesociclo" (se ven en "Todos").
  async function borrarMesociclo(id) {
    const vinculadas = est.rutinas.filter(r => String(r.mesociclo_id ?? '') === String(id));
    const aviso = vinculadas.length
      ? `\n\n⚠️ Hay ${vinculadas.length} rutina(s) colgadas de este mesociclo. Se quedarán sin mesociclo asignado (pasarán a "Todos"), no se borran.`
      : '';
    if (!await ui.confirmar(`¿Borrar este mesociclo?${aviso}\n\nEsta acción no se puede deshacer.`, { titulo: 'Borrar mesociclo', aceptar: 'Borrar', peligro: true })) return false;
    try {
      if (vinculadas.length) await api.tabla('rutinas', { method: 'PATCH', filtro: `mesociclo_id=eq.${id}`, cuerpo: { mesociclo_id: null } });
      const borrado = await api.tabla('mesociclos', { method: 'DELETE', filtro: `id=eq.${id}` });
      if (!borrado || !borrado.length) throw new Error('Supabase no permitió borrar (revisa la política RLS de DELETE en la tabla "mesociclos")');
      vinculadas.forEach(r => { r.mesociclo_id = null; });
      est.mesociclos = est.mesociclos.filter(m => String(m.id) !== String(id));
      if (String(est.sel) === String(id)) est.sel = null;
      ui.alerta('✅ Mesociclo borrado');
      return true;
    } catch (e) {
      ui.alerta('No se pudo borrar el mesociclo: ' + e.message, 'error');
      return false;
    }
  }

  return { crearMesociclo, bloqueNuevo, borrarMesociclo };
}
