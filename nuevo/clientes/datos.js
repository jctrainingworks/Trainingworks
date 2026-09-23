// Pestaña 📋 Datos de la ficha de cliente: datos básicos, nivel del atleta, salud y limitaciones,
// %1RM guardados y notas privadas. Mismas columnas de `clientes` que el panel actual.
import { esc } from '../core/ui.js';
import { NIVELES_ATLETA, sugerirNivelAtleta } from '../core/atleta.js';
import { PATOLOGIAS_LISTA, PATOLOGIA_INFO, LESION_INFO } from './salud.js';

const dash = valor => (valor === null || valor === undefined || valor === '' ? '—' : esc(valor));
const soloFecha = valor => (valor ? esc(String(valor).split('T')[0]) : '—');
const lista = valor => (Array.isArray(valor) ? valor : String(valor || '').split(',').map(s => s.trim()).filter(Boolean));

const campo = (etiqueta, valor) =>
  `<div><div class="f-etiqueta">${esc(etiqueta)}</div><div>${valor}</div></div>`;

function datosBasicosHtml(c) {
  const excluidos = lista(c.alimentos_excluidos);
  const preferidos = lista(c.alimentos_preferidos);
  return `
    <div class="f-card">
      <div class="f-card-title">🧍 Datos básicos</div>
      <div class="f-ayuda">Se editan desde "✏️ Editar cliente" (arriba del todo).</div>
      <div class="f-grid">
        ${campo('Edad', dash(c.edad))}
        ${campo('Género', dash(c.genero))}
        ${campo('Altura', c.altura ? esc(c.altura) + ' cm' : '—')}
        ${campo('Peso inicial', c.peso_inicial ? esc(c.peso_inicial) + ' kg' : '—')}
        ${campo('FC reposo', c.fc_reposo ? esc(c.fc_reposo) + ' ppm' : '—')}
        ${campo('WhatsApp', dash(c.whatsapp))}
        ${campo('Email', dash(c.email))}
        ${campo('Fecha inicio', soloFecha(c.fecha_inicio))}
        ${campo('Fecha nacimiento', soloFecha(c.fecha_nacimiento))}
        ${campo('Origen', dash(c.origen))}
        ${campo('Modalidad', dash(c.modalidad))}
        ${campo('Suplementos', c.sin_suplementos ? '🚫 No quiere' : '—')}
      </div>
      ${excluidos.length ? `
        <div class="f-bloque"><div class="f-etiqueta">🚫 Alimentos que no quiere</div><div>${esc(excluidos.join(', '))}</div></div>` : ''}
      ${preferidos.length ? `
        <div class="f-bloque"><div class="f-etiqueta">✅ Alimentos que suele tener/comprar</div><div>${esc(preferidos.join(', '))}</div></div>` : ''}
    </div>`;
}

function nivelHtml(c) {
  const seleccionado = c.nivel_atleta || sugerirNivelAtleta(c.anos_entreno, c.edad);
  return `
    <div class="f-card">
      <div class="f-card-title">🏋️ Nivel del atleta</div>
      <div class="f-ayuda">Sugerido automáticamente según años de entreno serio (y edad, para atleta máster). Puedes cambiarlo a mano si no encaja.</div>
      <div class="f-fila">
        <div class="f-caja" style="flex:1;min-width:140px;">
          <label for="nivelAtletaAnos">Años de entreno serio</label>
          <input id="nivelAtletaAnos" data-anos type="number" step="0.5" min="0" value="${esc(c.anos_entreno ?? '')}" placeholder="Ej. 2.5" />
        </div>
        <div class="f-caja" style="flex:1;min-width:160px;">
          <label for="nivelAtletaSel">Nivel</label>
          <select id="nivelAtletaSel" data-nivel>
            ${NIVELES_ATLETA.map(n => `<option value="${esc(n)}" ${seleccionado === n ? 'selected' : ''}>${esc(n)}</option>`).join('')}
          </select>
        </div>
      </div>
      <button class="btn btn-primary btn-sm" data-accion="guardar-nivel">Guardar nivel</button>
    </div>`;
}

const infoPatologiaHtml = id => {
  const info = PATOLOGIA_INFO[id];
  if (!info) return '';
  return `
    <div class="f-info f-info-azul">
      <div class="f-info-titulo">⚠️ ${esc(info.label)} — a tener en cuenta</div>
      <ul>${info.tips.map(t => `<li>${esc(t)}</li>`).join('')}</ul>
    </div>`;
};

const infoLesionHtml = clave => {
  const info = LESION_INFO[clave];
  if (!info) return '';
  return `
    <div class="f-info f-info-amarillo" style="margin-top:10px;">
      <div class="f-info-titulo">🩹 ${esc(info.label)}</div>
      ${info.recomendados.length ? `
        <div class="f-etiqueta">✅ EJERCICIOS A FAVORECER</div>
        <ul>${info.recomendados.map(t => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}
      ${info.precaucion.length ? `
        <div class="f-etiqueta">🚧 CON PRECAUCIÓN / EVITAR</div>
        <ul>${info.precaucion.map(t => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}
      <div class="f-alerta">🚩 ${esc(info.alerta)}</div>
      <div class="f-ayuda" style="margin:8px 0 0;">Orientación a nivel de entrenador, no clínica. No sustituye el alta ni las pautas del fisio/médico que trató la lesión.</div>
    </div>`;
};

function saludHtml(c) {
  const actuales = lista(c.patologias);
  return `
    <div class="f-card">
      <div class="f-card-title">❤️ Salud y limitaciones</div>
      <div class="f-ayuda">Marca lo que aplique. Sirve para tener en cuenta las precauciones de programación de cada condición.</div>
      <div class="f-grid f-grid-ancho">
        ${PATOLOGIAS_LISTA.map(p => `
          <label class="f-check">
            <input type="checkbox" data-patologia="${esc(p.id)}" ${actuales.includes(p.id) ? 'checked' : ''} />
            ${esc(p.label)}
          </label>`).join('')}
      </div>
      <div data-info-patologias>${actuales.map(infoPatologiaHtml).join('')}</div>

      <div class="f-caja f-caja-izq">
        <label for="f_lesion_tipo">¿Tiene alguna lesión?</label>
        <select id="f_lesion_tipo" data-lesion>
          <option value="" ${!c.lesion_tipo ? 'selected' : ''}>Sin lesión / no aplica</option>
          ${Object.keys(LESION_INFO).map(k => `<option value="${esc(k)}" ${c.lesion_tipo === k ? 'selected' : ''}>${esc(LESION_INFO[k].label)}</option>`).join('')}
        </select>
      </div>
      <div data-info-lesion>${infoLesionHtml(c.lesion_tipo)}</div>

      <label class="f-label-ta" for="f_datos_condicion">Detalles médicos / lesiones / medicación</label>
      <textarea class="f-textarea" id="f_datos_condicion" placeholder="Ej. Menisco derecho operado hace 3 años, ya con alta médica...">${esc(c.condicion_medica || c.condicion || '')}</textarea>
      <button class="btn btn-primary btn-sm" style="margin-top:10px;" data-accion="guardar-salud">Guardar salud y limitaciones</button>
    </div>`;
}

// Último 1RM estimado por ejercicio.
function rmsHtml(rms) {
  if (!rms.length) return '<div class="f-ayuda" style="margin:0;">Sin registros todavía.</div>';
  const porEjercicio = {};
  rms.forEach(r => {
    const previo = porEjercicio[r.ejercicio];
    if (!previo || new Date(r.fecha) > new Date(previo.fecha)) porEjercicio[r.ejercicio] = r;
  });
  const filas = Object.values(porEjercicio).sort((a, b) => String(a.ejercicio).localeCompare(String(b.ejercicio)));
  return `
    <div class="f-scroll">
      <table class="f-tabla">
        <thead><tr><th>Ejercicio</th><th>1RM est.</th><th>Fecha</th></tr></thead>
        <tbody>
          ${filas.map(r => `<tr><td>${esc(r.ejercicio)}</td><td>${Number(r.un_rm).toFixed(1)} kg</td><td>${soloFecha(r.fecha)}</td></tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

const paginaHtml = c => `
  ${datosBasicosHtml(c)}
  ${nivelHtml(c)}
  ${saludHtml(c)}
  <div class="f-card">
    <div class="f-card-title">🏋️ %1RM guardados</div>
    <div class="f-ayuda">Se guardan desde la sección "%1RM" del menú, eligiendo este cliente. Últimos por ejercicio (histórico completo en %1RM).</div>
    <div data-rms>${'<div class="f-ayuda" style="margin:0;">Cargando...</div>'}</div>
  </div>
  <div class="f-card">
    <div class="f-card-title">📝 Notas privadas del entrenador</div>
    <div class="f-ayuda">Solo tú las ves. No son un aviso al cliente (eso está en la pestaña Avisos).</div>
    <textarea class="f-textarea" id="f_datos_notas" placeholder="Ej. VIP, familiar, cuidado con la rodilla...">${esc(c.notas || '')}</textarea>
    <button class="btn btn-primary btn-sm" style="margin-top:10px;" data-accion="guardar-notas">Guardar notas</button>
  </div>`;

export default {
  id: 'datos',
  icono: '📋',
  etiqueta: 'Datos',
  orden: 10,

  async montar(contenedor, ctx) {
    const { cliente, api, ui } = ctx;
    contenedor.innerHTML = paginaHtml(cliente);
    const $ = sel => contenedor.querySelector(sel);

    // %1RM: si falla, se dice (el panel actual lo ocultaba como "sin registros").
    api.tabla('rm_estimaciones', { filtro: `cliente_id=eq.${cliente.id}&order=fecha.desc` })
      .then(filas => { $('[data-rms]').innerHTML = rmsHtml(filas || []); })
      .catch(() => { const caja = $('[data-rms]'); if (caja) caja.innerHTML = '<div class="f-ayuda" style="margin:0;">No se pudieron cargar los %1RM.</div>'; });

    async function guardar(boton, cuerpo, mensaje, error) {
      boton.disabled = true;
      try {
        await api.tabla('clientes', { method: 'PATCH', filtro: `id=eq.${cliente.id}`, cuerpo });
        ctx.actualizarCliente(cuerpo);
        ui.alerta(mensaje);
      } catch (e) {
        ui.alerta(`${error}: ${e.message}`, 'error');
      } finally {
        boton.disabled = false;
      }
    }

    contenedor.addEventListener('click', e => {
      const boton = e.target.closest('[data-accion]');
      if (!boton) return;
      const accion = boton.dataset.accion;

      if (accion === 'guardar-nivel') {
        const anosTxt = $('[data-anos]').value;
        const anos = anosTxt === '' ? null : parseFloat(anosTxt);
        const nivel = $('[data-nivel]').value || null;
        guardar(boton, { anos_entreno: anos, nivel_atleta: nivel }, '✅ Nivel del atleta guardado', 'Error al guardar el nivel');
      } else if (accion === 'guardar-salud') {
        const patologias = PATOLOGIAS_LISTA
          .filter(p => $(`[data-patologia="${p.id}"]`).checked)
          .map(p => p.id).join(',');
        const detalles = $('#f_datos_condicion').value.trim();
        const lesion = $('[data-lesion]').value;
        guardar(boton,
          { patologias: patologias || null, condicion_medica: detalles || null, lesion_tipo: lesion || null },
          '✅ Salud y limitaciones guardadas', 'Error al guardar salud');
      } else if (accion === 'guardar-notas') {
        const notas = $('#f_datos_notas').value.trim();
        guardar(boton, { notas: notas || null }, '✅ Notas guardadas', 'Error al guardar notas');
      }
    });

    // Al escribir los años, se sugiere el nivel (igual que en el panel actual).
    contenedor.addEventListener('input', e => {
      if (!e.target.matches('[data-anos]')) return;
      const sugerido = sugerirNivelAtleta(e.target.value, cliente.edad);
      if (sugerido) $('[data-nivel]').value = sugerido;
    });

    contenedor.addEventListener('change', e => {
      if (e.target.matches('[data-patologia]')) {
        const activas = PATOLOGIAS_LISTA.filter(p => $(`[data-patologia="${p.id}"]`).checked);
        $('[data-info-patologias]').innerHTML = activas.map(p => infoPatologiaHtml(p.id)).join('');
      } else if (e.target.matches('[data-lesion]')) {
        $('[data-info-lesion]').innerHTML = infoLesionHtml(e.target.value);
      }
    });
  }
};
