// Modelo de periodización del cliente (ATR / CSD) y propuesta de macrociclo anual CSD.
// Réplica de la tarjeta "🧭 Modelo de periodización" y de la propuesta de macrociclo de
// prueba/index.html. Columnas de `clientes`: modelo_periodizacion, fecha_inicio_macrociclo.
// Tabla al confirmar: mesociclos.
import { esc } from '../core/ui.js';
import { CSD_TIPOS, CSD_ORDEN } from '../core/atr.js';

const fechaLocalISO = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function modeloHtml(c) {
  const modelo = c.modelo_periodizacion || 'ATR';
  return `
    <div class="f-card">
      <div class="f-card-title">🧭 Modelo de periodización</div>
      <div class="f-ayuda">ATR (Acumulación-Transformación-Realización) para deportistas/opositores con objetivo de rendimiento o competición con fecha fija. CSD (Carga-Sobrecarga-Descarga-Mantenimiento) para el resto de clientes.</div>
      <div class="f-caja" style="max-width:220px;margin-bottom:10px;">
        <label for="modeloPeriodizacionSel">Modelo</label>
        <select id="modeloPeriodizacionSel" data-modelo-sel>
          <option value="ATR" ${modelo === 'ATR' ? 'selected' : ''}>ATR</option>
          <option value="CSD" ${modelo === 'CSD' ? 'selected' : ''}>CSD</option>
        </select>
      </div>
      <button class="btn btn-primary btn-sm" data-accion="guardar-modelo">Guardar modelo</button>
      ${c.modelo_periodizacion === 'CSD' ? `
      <div style="margin-top:14px;padding-top:14px;border-top:1px solid #222;">
        <div class="f-ayuda">Genera una propuesta de macrociclo anual (Carga→Sobrecarga→Descarga, con Mantenimiento en jul-ago y diciembre) a partir de la fecha de inicio del cliente. Es solo una propuesta editable — no crea nada hasta que la confirmes.</div>
        <div class="f-caja" style="max-width:220px;margin-bottom:10px;">
          <label for="fechaInicioMacrocicloInput">Fecha de inicio</label>
          <input id="fechaInicioMacrocicloInput" data-fecha-macrociclo type="date" value="${esc(c.fecha_inicio_macrociclo || '')}" />
        </div>
        <button class="btn btn-secondary btn-sm" data-accion="guardar-fecha-macrociclo">Guardar fecha</button>
        <button class="btn btn-primary btn-sm" data-accion="propuesta-macrociclo" ${!c.fecha_inicio_macrociclo ? 'disabled title="Guarda antes la fecha de inicio"' : ''}>📅 Generar propuesta</button>
      </div>` : ''}
    </div>`;
}

// Genera la secuencia Carga(7sem)→Sobrecarga(4sem)→Descarga(2sem) repitiendo ciclos de 13 semanas,
// para 1 año vista, sustituyendo por Mantenimiento (7sem) cualquier bloque cuyo inicio caiga en
// jul-ago o diciembre — tras un Mantenimiento el ciclo se reinicia en Carga. Las duraciones son el
// punto medio (redondeado) de los rangos decididos: Carga 6-8→7, Sobrecarga 3-4→4, Descarga 1-2→2,
// Mantenimiento 6-8→7. Pura propuesta en memoria — no toca Supabase hasta que se confirme.
export function generarMacrocicloPropuestaCSD(fechaInicioStr) {
  const CICLO = [{ tipo: 'carga', semanas: 7 }, { tipo: 'sobrecarga', semanas: 4 }, { tipo: 'descarga', semanas: 2 }];
  const HORIZONTE_SEMANAS = 52;
  let cursor = new Date(fechaInicioStr + 'T00:00:00');
  let semanasAcumuladas = 0, i = 0;
  const bloques = [];
  while (semanasAcumuladas < HORIZONTE_SEMANAS) {
    const mes = cursor.getMonth(); // 0-indexado: 6=jul, 7=ago, 11=dic
    const enTemporadaMantenimiento = mes === 6 || mes === 7 || mes === 11;
    let tipo, semanas;
    if (enTemporadaMantenimiento) { tipo = 'mantenimiento'; semanas = 7; i = 0; }
    else { const paso = CICLO[i % CICLO.length]; tipo = paso.tipo; semanas = paso.semanas; i++; }
    const inicio = new Date(cursor);
    const fin = new Date(cursor); fin.setDate(fin.getDate() + semanas * 7 - 1);
    bloques.push({ tipo, fecha_inicio: fechaLocalISO(inicio), fecha_fin: fechaLocalISO(fin) });
    cursor = new Date(fin); cursor.setDate(cursor.getDate() + 1);
    semanasAcumuladas += semanas;
  }
  return bloques;
}

function modalHtml(cliente, bloques) {
  const filas = bloques.map((b, idx) => {
    const semanas = Math.round((new Date(b.fecha_fin) - new Date(b.fecha_inicio)) / (7 * 86400000) + 1);
    const color = CSD_TIPOS[b.tipo]?.color || '#666';
    return `
      <div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid #1e1e1e;">
        <span style="width:8px;height:8px;border-radius:50%;background:${color};flex-shrink:0;"></span>
        <select class="form-select" data-mc-tipo="${idx}" style="flex:1;min-width:110px;">
          ${CSD_ORDEN.map(k => `<option value="${k}" ${b.tipo === k ? 'selected' : ''}>${esc(CSD_TIPOS[k].label)}</option>`).join('')}
        </select>
        <input class="form-input" type="date" data-mc-fecha="${idx}:fecha_inicio" value="${esc(b.fecha_inicio)}" style="width:130px;" />
        <input class="form-input" type="date" data-mc-fecha="${idx}:fecha_fin" value="${esc(b.fecha_fin)}" style="width:130px;" />
        <span style="font-size:11px;color:#666;width:52px;text-align:right;flex-shrink:0;">${semanas} sem</span>
        <button class="btn btn-ghost btn-xs" data-mc-quitar="${idx}">✕</button>
      </div>`;
  }).join('');
  return `
    <div class="modal" role="dialog" aria-modal="true" style="max-width:560px;">
      <div class="modal-title">📅 Propuesta de macrociclo anual</div>
      <div class="modal-sub">${esc(cliente.nombre)} — ${esc(cliente.codigo)} · edítala antes de confirmar, no se crea nada todavía</div>
      <div style="max-height:400px;overflow-y:auto;margin:10px 0;">
        ${filas || '<div style="color:#666;font-size:13px;">Sin bloques — añade uno.</div>'}
      </div>
      <button class="btn btn-ghost btn-sm" data-mc-anadir>+ Añadir bloque</button>
      <div data-error></div>
      <div class="modal-footer">
        <button class="btn btn-ghost" data-mc-cancelar>Cancelar</button>
        <button class="btn btn-primary" data-mc-confirmar>✅ Confirmar y crear ${bloques.length} mesociclos</button>
      </div>
    </div>`;
}

// Abre el modal editable. Al confirmar: cierra el mesociclo activo del cliente (si lo hay) el día
// antes de que arranque el primer bloque y crea un mesociclo real por bloque, todos bajo el nombre
// "Macrociclo anual" para que salgan seguidos en una misma fila del Gantt. Hasta confirmar, todo es
// edición en memoria.
export function abrirPropuestaMacrociclo({ cliente, api, ui }) {
  if (!cliente.fecha_inicio_macrociclo) return;
  const bloques = generarMacrocicloPropuestaCSD(cliente.fecha_inicio_macrociclo);
  const capa = document.createElement('div');
  capa.className = 'modal-overlay';
  const pintar = () => { capa.innerHTML = modalHtml(cliente, bloques); };
  const cerrar = () => { capa.remove(); document.removeEventListener('keydown', alTecla); };
  const alTecla = e => { if (e.key === 'Escape') cerrar(); };

  async function confirmar() {
    if (!bloques.length) return;
    const boton = capa.querySelector('[data-mc-confirmar]');
    boton.disabled = true;
    try {
      const mesociclos = await api.tabla('mesociclos', { filtro: `cliente_id=eq.${cliente.id}&order=numero.asc` });
      const activo = mesociclos.find(m => !m.fecha_fin);
      if (activo) {
        const diaAntes = new Date(bloques[0].fecha_inicio + 'T00:00:00');
        diaAntes.setDate(diaAntes.getDate() - 1);
        await api.tabla('mesociclos', { method: 'PATCH', filtro: `id=eq.${activo.id}`, cuerpo: { fecha_fin: fechaLocalISO(diaAntes) } });
      }
      for (let idx = 0; idx < bloques.length; idx++) {
        const b = bloques[idx];
        await api.tabla('mesociclos', {
          method: 'POST',
          cuerpo: { cliente_id: cliente.id, numero: idx + 1, nombre: 'Macrociclo anual', fecha_inicio: b.fecha_inicio, fecha_fin: b.fecha_fin, tipo_atr: b.tipo }
        });
      }
      cerrar();
      ui.alerta(`✅ Macrociclo creado: ${bloques.length} bloques`);
    } catch (e) {
      capa.querySelector('[data-error]').innerHTML = `<div class="alert alert-error">Error creando el macrociclo: ${esc(e.message)}</div>`;
      boton.disabled = false;
    }
  }

  capa.addEventListener('click', e => {
    if (e.target.closest('[data-mc-cancelar]')) { cerrar(); return; }
    if (e.target.closest('[data-mc-confirmar]')) { confirmar(); return; }
    if (e.target.closest('[data-mc-anadir]')) {
      const ultimo = bloques[bloques.length - 1];
      const inicio = ultimo ? new Date(ultimo.fecha_fin + 'T00:00:00') : new Date();
      if (ultimo) inicio.setDate(inicio.getDate() + 1);
      const fin = new Date(inicio); fin.setDate(fin.getDate() + 6 * 7 - 1);
      bloques.push({ tipo: 'carga', fecha_inicio: fechaLocalISO(inicio), fecha_fin: fechaLocalISO(fin) });
      pintar();
      return;
    }
    const quitar = e.target.closest('[data-mc-quitar]');
    if (quitar) { bloques.splice(Number(quitar.dataset.mcQuitar), 1); pintar(); }
  });
  capa.addEventListener('change', e => {
    if (e.target.matches('[data-mc-tipo]')) {
      bloques[Number(e.target.dataset.mcTipo)].tipo = e.target.value;
      pintar();
    } else if (e.target.matches('[data-mc-fecha]')) {
      const [idx, campo] = e.target.dataset.mcFecha.split(':');
      bloques[Number(idx)][campo] = e.target.value;
      pintar();
    }
  });
  document.addEventListener('keydown', alTecla);
  pintar();
  document.body.appendChild(capa);
}
