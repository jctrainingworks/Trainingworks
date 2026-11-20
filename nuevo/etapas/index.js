// Pestaña 🏁 Etapas de la ficha: copias guardadas de lo hecho entre dos fechas (rutinas, medidas, sesiones, calorías).
// Tablas: etapas (escribe), mesociclos/rutinas/ejercicios/sesiones/seguimiento_corporal (solo lectura para copiar),
// planes_nutricion y nutricion_historial (solo lectura, para las calorías). Si falta `etapas`, enseña el SQL.
import { ATR_ORDEN, ATR_TIPOS } from '../core/atr.js';
import { esc as escapar } from '../core/ui.js';
import { fechaLocalISO, modeloEsCSD } from '../periodizacion/calculos.js';
import { cargandoHtml, errorTablasHtml, listaEtapasHtml, modalCerrarEtapaHtml, resumenCierreHtml } from './vista.js';
import { ETAPAS_SQL, etNum, datosEnRango, kcalAuto, inicioPorDefecto, validarCierre, construirEtapa } from './calculos.js';

export default {
  id: 'etapas',
  icono: '🏁',
  etiqueta: 'Etapas',
  orden: 65,

  async montar(contenedor, ctx) {
    const { cliente, api, ui, navegar } = ctx;
    ui.cargarCss(new URL('../periodizacion/estilos.css', import.meta.url));
    const est = { lista: [], error: null };

    async function cargar() {
      contenedor.innerHTML = cargandoHtml();
      try {
        est.lista = await api.tabla('etapas', { select: 'id,cliente_id,titulo,tipo,fecha_inicio,fecha_fin,nota,kcal_inicio,kcal_fin,created_at', filtro: `cliente_id=eq.${cliente.id}&order=fecha_inicio.desc` });
        est.error = null;
      } catch (e) { est.lista = []; est.error = e.message || String(e); }
      pintar();
    }
    const pintar = () => { contenedor.innerHTML = est.error ? errorTablasHtml(est.error) : listaEtapasHtml(cliente, est.lista); };

    // Todo lo que se copia, leído justo al abrir el cierre.
    async function leerDatos() {
      const [mesociclos, rutinas, medidas, sesiones, plan, hist] = await Promise.all([
        api.tabla('mesociclos', { filtro: `cliente_id=eq.${cliente.id}&order=numero.asc` }),
        api.tabla('rutinas', { filtro: `cliente_id=eq.${cliente.id}&order=orden.asc` }),
        api.tabla('seguimiento_corporal', { filtro: `cliente_id=eq.${cliente.id}&order=fecha.desc` }).catch(() => []),
        api.tabla('sesiones', { filtro: `codigo_cliente=eq.${cliente.codigo}&order=fecha.desc` }).catch(() => []),
        api.tabla('planes_nutricion', { select: 'kcal_objetivo,tdee,objetivo_calorico,macros,peso', filtro: `cliente_id=eq.${cliente.id}`, unico: true }).catch(() => []),
        api.tabla('nutricion_historial', { filtro: `cliente_id=eq.${cliente.id}&order=fecha.asc,created_at.asc` }).catch(() => [])
      ]);
      const ids = rutinas.map(r => r.id);
      const ejercicios = ids.length ? await api.tabla('ejercicios', { filtro: `rutina_id=in.(${ids.join(',')})&order=orden.asc` }).catch(() => []) : [];
      return { datos: { mesociclos, rutinas, ejercicios, medidas, sesiones }, ctxNutri: { plan: (plan && plan[0]) || null, hist } };
    }

    async function abrirCierre() {
      let L;
      try { L = await leerDatos(); } catch (e) { ui.alerta('No se pudieron cargar los datos del cliente: ' + e.message, 'error'); return; }
      const csd = modeloEsCSD(cliente.modelo_periodizacion || 'ATR');
      const hoy = fechaLocalISO();
      const ini = inicioPorDefecto(L.datos, est.lista, hoy);
      const auto = kcalAuto(L.ctxNutri, ini, hoy, hoy);
      const d = { titulo: '', tipo: 'Definición', ini, fin: hoy, nota: '', nueva: false, nuevoNombre: '', nuevoTipo: 'acu_carga',
        kcalIni: auto.inicio != null ? String(auto.inicio) : '', kcalFin: auto.fin != null ? String(auto.fin) : '', kcalIniManual: false, kcalFinManual: false };
      const tiposNuevo = ATR_ORDEN.map(k => [k, ATR_TIPOS[k].label]);

      const capa = document.createElement('div');
      capa.className = 'modal-overlay';
      const $ = s => capa.querySelector(s);
      const nota = () => kcalAuto(L.ctxNutri, d.ini, d.fin, hoy).texto;
      capa.innerHTML = modalCerrarEtapaHtml(cliente, d, { resumenHtml: resumenCierreHtml(datosEnRango(L.datos, d.ini, d.fin), d), kcalNota: auto.texto, csd, tiposNuevo });
      const alTecla = e => { if (e.key === 'Escape') cerrar(); };
      const cerrar = () => { capa.remove(); document.removeEventListener('keydown', alTecla); };
      const aviso = txt => { $('[data-error]').innerHTML = `<div class="alert alert-error">${txt}</div>`; };
      const refrescar = () => {
        $('[data-preview]').innerHTML = resumenCierreHtml(datosEnRango(L.datos, d.ini, d.fin), d);
        if (!d.ini || !d.fin || d.ini > d.fin) return;
        const a = kcalAuto(L.ctxNutri, d.ini, d.fin, hoy);
        if (!d.kcalIniManual) { d.kcalIni = a.inicio != null ? String(a.inicio) : ''; $('[data-campo="kcalIni"]').value = d.kcalIni; }
        if (!d.kcalFinManual) { d.kcalFin = a.fin != null ? String(a.fin) : ''; $('[data-campo="kcalFin"]').value = d.kcalFin; }
        $('[data-kcal-nota]').textContent = nota();
      };
      capa.addEventListener('input', e => {
        const k = e.target.dataset && e.target.dataset.campo;
        if (!k) return;
        d[k] = e.target.value;
        if (k === 'kcalIni') d.kcalIniManual = true;
        if (k === 'kcalFin') d.kcalFinManual = true;
        if (k === 'ini' || k === 'fin') refrescar();
      });
      capa.addEventListener('change', e => {
        if (e.target.dataset.chk) { d[e.target.dataset.chk] = e.target.checked; refrescar(); }
        else if (e.target.matches('[data-nueva]')) { d.nueva = e.target.checked; const box = $('[data-nueva-box]'); if (box) box.style.display = d.nueva ? 'block' : 'none'; }
        else if (e.target.dataset.campo) d[e.target.dataset.campo] = e.target.value;
      });
      capa.addEventListener('click', async e => {
        if (e.target.closest('[data-cancelar]')) return cerrar();
        if (!e.target.closest('[data-confirmar]')) return;
        const msg = validarCierre({ titulo: d.titulo, ini: d.ini, fin: d.fin, nueva: d.nueva }, hoy);
        if (msg) return aviso(msg);
        const boton = $('[data-confirmar]');
        boton.textContent = 'Guardando...'; boton.disabled = true;
        const cuerpo = construirEtapa({ cliente, titulo: d.titulo, tipo: d.tipo, ini: d.ini, fin: d.fin, nota: d.nota, kIni: etNum(d.kcalIni), kFin: etNum(d.kcalFin),
          incl: { rut: d.rut !== false, med: d.med !== false, ses: d.ses !== false, kcal: d.kcal !== false }, datos: L.datos, ctx: L.ctxNutri });
        try {
          await api.tabla('etapas', { method: 'POST', cuerpo });
        } catch (err) {
          const falta = /etapas|relation|does not exist/i.test(err.message || '');
          aviso(falta ? 'Faltan las tablas en Supabase. Cierra esto, recarga la pestaña Etapas y sigue las instrucciones (copiar SQL).' : 'Error: ' + escapar(err.message));
          boton.textContent = 'Guardar etapa'; boton.disabled = false;
          return;
        }
        // Etapa guardada. Si se pidió, se cierra el bloque activo y se abre uno nuevo vacío.
        let errBloque = null;
        if (d.nueva) {
          try {
            const activo = L.datos.mesociclos.find(m => !m.fecha_fin);
            if (activo) await api.tabla('mesociclos', { method: 'PATCH', filtro: `id=eq.${activo.id}`, cuerpo: { fecha_fin: hoy } });
            await api.tabla('mesociclos', { method: 'POST', cuerpo: { cliente_id: cliente.id, numero: 1, nombre: (d.nuevoNombre || '').trim() || null, fecha_inicio: hoy, fecha_fin: null, tipo_atr: d.nuevoTipo || null } });
          } catch (e2) { errBloque = e2.message || String(e2); }
        }
        cerrar();
        if (d.nueva && !errBloque) {
          ui.alerta(`✅ Etapa «${d.titulo.trim()}» guardada y bloque «${(d.nuevoNombre || '').trim() || 'sin nombre'}» creado. Monta la rutina nueva.`);
          navegar(`clientes/${encodeURIComponent(cliente.codigo)}/rutinas`);
          return;
        }
        if (errBloque) ui.alerta(`La etapa «${d.titulo.trim()}» se guardó, pero no se pudo crear el bloque nuevo: ${errBloque}. Créalo desde Rutinas.`, 'error');
        else ui.alerta(`✅ Etapa «${d.titulo.trim()}» guardada`);
        await cargar();
      });
      document.addEventListener('keydown', alTecla);
      document.body.appendChild(capa);
    }

    contenedor.addEventListener('click', async e => {
      const el = e.target.closest('[data-accion]');
      if (!el) return;
      switch (el.dataset.accion) {
        case 'cerrar-etapa': return abrirCierre();
        case 'reintentar': return cargar();
        case 'copiar-sql':
          try { await navigator.clipboard.writeText(ETAPAS_SQL); ui.alerta('✅ SQL copiado. Pégalo en el SQL Editor de Supabase y ejecútalo.'); }
          catch (err) { ui.alerta('No se pudo copiar. Selecciona el texto a mano.', 'error'); }
          return;
        case 'borrar-etapa': {
          const ok = await ui.confirmar('¿Borrar esta etapa guardada?\n\nSolo se borra la copia. Las rutinas, medidas y sesiones originales del cliente no se tocan.', { titulo: 'Borrar etapa', aceptar: 'Borrar', peligro: true });
          if (!ok) return;
          try { await api.tabla('etapas', { method: 'DELETE', filtro: `id=eq.${el.dataset.id}` }); ui.alerta('✅ Etapa borrada'); await cargar(); }
          catch (err) { ui.alerta('No se pudo borrar: ' + err.message, 'error'); }
        }
      }
    });
    await cargar();
    return {};
  }
};
