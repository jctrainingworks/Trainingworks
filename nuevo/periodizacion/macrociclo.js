// Modal de macrociclo anual (crear / editar-regenerar) y quitarlo. Todo es edición en memoria hasta confirmar.
import { esc } from '../core/ui.js';
import { ETAPA_TIPOS } from '../etapas/calculos.js';
import { modalMacrocicloHtml } from './vista.js';
import {
  fechaLocalISO, dia, esMacroAnual, MACRO_SEMANAS_DEF, mesPermiteMantenimiento, generarMacrocicloPropuestaCSD,
  encadenarMacrociclo, validarBloquesMacrociclo, bloquesParaEditarMacro
} from './calculos.js';

// Asistente de macrociclo (paso 2 de «Cerrar etapa → etapa nueva», o directo si no hay nada que cerrar).
// ctx: { cliente, api, ui, navegar }  ·  mesociclos/rutinas: arrays cargados por quien lo abre  ·  alTerminar(): recarga
// etapaBody: fila de `etapas` ya construida en el paso 1 (se guarda al confirmar)  ·  alVolver(): reabre el paso 1
export function abrirModalMacrociclo({ ctx, mesociclos, rutinas, modo, alTerminar, etapaBody = null, alVolver = null, inicio = null }) {
  const { cliente, api, ui, navegar } = ctx;
  const m = { modo, defs: { ...MACRO_SEMANAS_DEF }, bloques: [], inicio: '', existentes: [], numBase: 0, editada: false, defsAbierto: false, etapaBody, etapaTipo: 'Volumen', conVolver: !!(etapaBody && alVolver) };
  if (modo === 'regenerar') {
    const r = bloquesParaEditarMacro(mesociclos);
    if (!r) return abrirModalMacrociclo({ ctx, mesociclos, rutinas, modo: 'crear', alTerminar, inicio });
    if (r.terminado) { m.modo = 'crear'; m.inicio = fechaLocalISO(); m.bloques = generarMacrocicloPropuestaCSD(m.inicio, m.defs); }
    else {
      Object.assign(m, { bloques: r.bloques, inicio: r.inicio, existentes: r.existentes, numBase: r.numBase });
      const parte = String(r.existentes[0].nombre || '').split(' · ')[1];
      if (ETAPA_TIPOS.includes(parte)) m.etapaTipo = parte;
    }
  } else {
    m.inicio = inicio || fechaLocalISO();
    m.bloques = generarMacrocicloPropuestaCSD(m.inicio, m.defs);
  }

  const capa = document.createElement('div');
  capa.className = 'modal-overlay';
  const pintar = () => { capa.innerHTML = modalMacrocicloHtml(cliente, m); };
  const alTecla = e => { if (e.key === 'Escape') cerrar(); };
  const cerrar = () => { capa.remove(); document.removeEventListener('keydown', alTecla); };
  const aviso = txt => { const el = capa.querySelector('[data-error]'); if (el) el.innerHTML = `<div style="color:#f59e0b;font-size:12px;margin:8px 0;">⚠️ ${esc(txt)}</div>`; };
  const regenerar = async () => {
    if (m.editada && !(await ui.confirmar('Regenerar sustituye la propuesta actual y pierdes lo que hayas editado. ¿Continuar?', { titulo: 'Regenerar propuesta', aceptar: 'Regenerar' }))) return;
    m.bloques = generarMacrocicloPropuestaCSD(m.inicio, m.defs); m.editada = false; pintar();
  };

  async function confirmar() {
    const msg = validarBloquesMacrociclo(m.bloques);
    if (msg) { aviso(msg); return; }
    const boton = capa.querySelector('[data-mc-confirmar]');
    boton.disabled = true;
    const hecho = [];
    try {
      if (m.modo === 'regenerar') {
        const ex = m.existentes;
        const nombre = 'Macrociclo anual · ' + m.etapaTipo;
        for (let i = 0; i < m.bloques.length; i++) {
          const b = m.bloques[i];
          const campos = { numero: m.numBase + i + 1, nombre, fecha_inicio: b.fecha_inicio, fecha_fin: b.fecha_fin, tipo_atr: b.tipo };
          if (ex[i]) await api.tabla('mesociclos', { method: 'PATCH', filtro: `id=eq.${ex[i].id}`, cuerpo: campos });
          else await api.tabla('mesociclos', { method: 'POST', cuerpo: { cliente_id: cliente.id, ...campos } });
        }
        const sobran = ex.slice(m.bloques.length);
        const conRutinas = sobran.filter(x => rutinas.some(r => String(r.mesociclo_id ?? '') === String(x.id)));
        const borrables = sobran.filter(x => !conRutinas.includes(x));
        if (borrables.length) await api.tabla('mesociclos', { method: 'DELETE', filtro: `id=in.(${borrables.map(x => x.id).join(',')})` });
        cerrar();
        ui.alerta(`✅ Macrociclo actualizado: ${m.bloques.length} bloques.${conRutinas.length ? ` ${conRutinas.length} bloque(s) sobrantes se conservan porque tienen rutinas.` : ''}`);
      } else {
        const nombre = 'Macrociclo anual · ' + m.etapaTipo;
        if (m.etapaBody) { await api.tabla('etapas', { method: 'POST', cuerpo: m.etapaBody }); hecho.push('etapa guardada'); }
        const activo = mesociclos.find(x => !x.fecha_fin);
        if (activo) {
          const d = new Date(m.bloques[0].fecha_inicio + 'T00:00:00'); d.setDate(d.getDate() - 1);
          let fin = fechaLocalISO(d);
          if (dia(activo.fecha_inicio) > fin) fin = dia(activo.fecha_inicio);
          await api.tabla('mesociclos', { method: 'PATCH', filtro: `id=eq.${activo.id}`, cuerpo: { fecha_fin: fin } });
          hecho.push('bloque activo cerrado');
        }
        for (let idx = 0; idx < m.bloques.length; idx++) {
          const b = m.bloques[idx];
          await api.tabla('mesociclos', { method: 'POST', cuerpo: { cliente_id: cliente.id, numero: idx + 1, nombre, fecha_inicio: b.fecha_inicio, fecha_fin: b.fecha_fin, tipo_atr: b.tipo } });
          hecho.push(`bloque ${idx + 1}`);
        }
        cerrar();
        const titulo = m.etapaBody ? m.etapaBody.titulo : null;
        ui.alerta(`✅ ${titulo ? `Etapa «${titulo}» guardada y ` : ''}macrociclo creado: ${m.bloques.length} bloques. Monta la rutina nueva.`);
        if (navegar) { navegar(`clientes/${encodeURIComponent(cliente.codigo)}/rutinas`); return; }
      }
      await alTerminar();
    } catch (e) {
      const falta = /etapas|relation|does not exist/i.test(e.message || '');
      const yaHecho = hecho.length ? ` Ya se había hecho: ${hecho.join(', ')}. Revisa Rutinas/Etapas antes de repetir.` : '';
      aviso((falta ? 'Faltan las tablas de etapas en Supabase (abre la pestaña Etapas y sigue las instrucciones).' : 'Error guardando el macrociclo: ' + e.message) + yaHecho);
      boton.disabled = false;
    }
  }

  capa.addEventListener('click', async e => {
    const t = e.target;
    if (t.closest('[data-mc-cancelar]')) return cerrar();
    if (t.closest('[data-mc-volver]')) { cerrar(); return alVolver(); }
    if (t.closest('[data-mc-confirmar]')) return confirmar();
    if (t.closest('[data-mc-regenerar]')) return regenerar();
    if (t.closest('[data-mc-anadir]')) {
      const sinTipo = m.bloques.length && m.bloques.every(b => !b.tipo);
      m.bloques.push({ tipo: sinTipo ? '' : 'carga', semanas: m.defs.carga, fecha_inicio: '', fecha_fin: '' });
      m.editada = true; rencadenar(); return;
    }
    const q = t.closest('[data-mc-quitar]');
    if (q) { m.bloques.splice(Number(q.dataset.mcQuitar), 1); m.editada = true; rencadenar(); return; }
    const sem = t.closest('[data-mc-sem]');
    if (sem) { const [i, d] = sem.dataset.mcSem.split(':').map(Number); const b = m.bloques[i]; b.semanas = Math.min(52, Math.max(1, b.semanas + d)); m.editada = true; rencadenar(); return; }
    const def = t.closest('[data-mc-def]');
    if (def) { const [k, d] = def.dataset.mcDef.split(':'); m.defs[k] = Math.min(12, Math.max(1, m.defs[k] + Number(d))); m.defsAbierto = true; pintar(); return; }
    if (t.closest('[data-mc-quitar-tipos]')) { m.bloques.forEach(b => { b.tipo = ''; }); m.editada = true; pintar(); return; }
    if (t.closest('[data-mc-vaciar]')) { m.bloques = []; m.editada = true; pintar(); }
  });
  capa.addEventListener('change', async e => {
    const t = e.target;
    if (t.matches('[data-mc-etapa-tipo]')) { m.etapaTipo = t.value; return; }
    if (t.matches('[data-mc-tipo]')) {
      const b = m.bloques[Number(t.dataset.mcTipo)];
      if (t.value === 'mantenimiento' && !mesPermiteMantenimiento(b.fecha_inicio)) { pintar(); aviso('Mantenimiento solo se puede elegir si el bloque empieza en julio, agosto o diciembre.'); return; }
      b.tipo = t.value; m.editada = true; pintar();
    } else if (t.matches('[data-mc-inicio]') && t.value) {
      const hacer = () => { m.inicio = t.value; m.bloques = generarMacrocicloPropuestaCSD(m.inicio, m.defs); m.editada = false; pintar(); };
      if (m.editada && m.bloques.length) {
        const ok = await ui.confirmar('Cambiar la fecha de inicio reconstruye la propuesta y pierdes lo que hayas editado. ¿Continuar?', { titulo: 'Cambiar inicio', aceptar: 'Cambiar y regenerar' });
        if (ok) hacer(); else pintar();
      } else hacer();
    }
  });
  function rencadenar() { encadenarMacrociclo(m.bloques, m.inicio); pintar(); }
  document.addEventListener('keydown', alTecla);
  pintar();
  document.body.appendChild(capa);
}

// Deshace "Crear macrociclo": borra los bloques «Macrociclo anual», reabre el mesociclo que se cerró al
// generarlo y devuelve a él las rutinas colgadas de los bloques. Pide confirmación contando qué hará.
export async function quitarMacrocicloAnual({ ctx, mesociclos, rutinas, alTerminar }) {
  const { cliente, api, ui } = ctx;
  const bloques = mesociclos.filter(esMacroAnual);
  if (!bloques.length) { ui.alerta('Este cliente no tiene bloques de macrociclo anual.', 'error'); return; }
  const ids = bloques.map(b => String(b.id));
  const primerInicio = bloques.map(b => dia(b.fecha_inicio)).sort()[0];
  const dAntes = new Date(primerInicio + 'T00:00:00'); dAntes.setDate(dAntes.getDate() - 1);
  const diaAntes = fechaLocalISO(dAntes);
  const reabrir = mesociclos.find(x => !esMacroAnual(x) && x.fecha_fin && dia(x.fecha_fin) === diaAntes) || null;
  const lig = rutinas.filter(r => ids.includes(String(r.mesociclo_id ?? '')));
  const txtReabrir = reabrir ? `\n• Se reabre "${reabrir.nombre || 'Mesociclo'} ${reabrir.numero}" (vuelve a ser el mesociclo activo).` : '\n• No encuentro el mesociclo que se cerró al generarlo, así que no se reabre ninguno.';
  const txtRut = lig.length ? `\n• ${lig.length} rutina(s) ${reabrir ? 'vuelven a ese mesociclo' : 'se quedan sin mesociclo (pasan a "Todos")'}.` : '';
  const ok = await ui.confirmar(`¿Quitar el macrociclo anual?\n\n• Se borran ${bloques.length} bloque(s).${txtReabrir}${txtRut}\n\nNo se puede deshacer.`, { titulo: 'Quitar macrociclo', aceptar: 'Quitar', peligro: true });
  if (!ok) return;
  try {
    const lista = ids.join(',');
    if (lig.length) await api.tabla('rutinas', { method: 'PATCH', filtro: `mesociclo_id=in.(${lista})`, cuerpo: { mesociclo_id: reabrir ? reabrir.id : null } });
    if (reabrir) await api.tabla('mesociclos', { method: 'PATCH', filtro: `id=eq.${reabrir.id}`, cuerpo: { fecha_fin: null } });
    await api.tabla('mesociclos', { method: 'DELETE', filtro: `id=in.(${lista})` });
    ui.alerta('✅ Macrociclo quitado');
    await alTerminar();
  } catch (e) {
    ui.alerta('Error quitando el macrociclo: ' + e.message, 'error');
  }
}
