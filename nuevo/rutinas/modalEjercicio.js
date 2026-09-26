// Modal de ejercicio (añadir y editar): nombre con buscador en tu biblioteca, pasos de técnica, tipo de
// registro, series con técnicas de alta intensidad, técnica de grupo (superserie/triserie), orden y notas.
// Se puede seguir escribiendo el nombre a mano; al elegir uno de la biblioteca se guarda además su id
// (biblioteca_id) y se rellenan GIF y pasos. Si después cambias el nombre a mano, el enlace se quita.
import { esc } from '../core/ui.js';
import { ATR_TIPOS, ATR_PLANTILLAS_SERIES } from '../core/atr.js';
import { TECNICAS_SERIE, TECNICAS_GRUPO, parseTecnicaSerie, formatTecnicaSerie, parseGrupoTecnica } from '../core/tecnicas.js';

const MUSCULOS = ['Todos', 'Pecho', 'Espalda', 'Cuádriceps', 'Isquiotibiales', 'Glúteos', 'Hombros', 'Bíceps', 'Tríceps', 'Abductores', 'Aductores', 'Core', 'Gemelos', 'Trapecios', 'Cardio'];
const EQUIPOS = ['Todos', 'Máquina', 'Polea', 'Peso libre', 'Peso corporal', 'Banda elástica'];
const TIPOS = ['Normal', 'Rehabilitación'];
const ISOMETRICOS = ['plancha', 'hollow', 'wall sit', 'wall-sit', 'dead hang', 'deadhang', 'l-sit', 'l sit', 'farmer', 'isométric', 'isometric', 'vacío abdominal', 'sostenid'];
export const esNombreIsometrico = nombre => ISOMETRICOS.some(k => String(nombre || '').toLowerCase().includes(k));

const serieBase = () => ({ reps: '10-12', rir: '1-2', desc: '90seg', tecnica: 'normal', tecnicaN: '', tecnicaPct: '' });

// Series de partida para un ejercicio nuevo: la plantilla del tipo ATR del mesociclo de la rutina, o la genérica.
export function seriesIniciales(mesociclo) {
  const p = mesociclo && mesociclo.tipo_atr ? ATR_PLANTILLAS_SERIES[mesociclo.tipo_atr] : null;
  if (!p) return [serieBase()];
  return Array.from({ length: p.series }, () => ({ reps: p.reps, rir: p.rir, desc: p.desc, tecnica: 'normal', tecnicaN: '', tecnicaPct: '' }));
}

// Series de un ejercicio ya guardado (columnas separadas por comas).
export function seriesDeEjercicio(ex) {
  const lista = (v, def) => String(v || def).split(',').map(s => s.trim());
  const reps = lista(ex.repeticiones, '10-12'), rir = lista(ex.rir, '1-2'), desc = lista(ex.descanso, '90seg'), tec = lista(ex.tecnica, '');
  const cnt = Math.max(parseInt(ex.series) || 1, reps.length);
  return Array.from({ length: cnt }, (_, i) => {
    const t = parseTecnicaSerie(tec[i] || 'normal');
    return { reps: reps[i] || reps[0] || '10-12', rir: rir[i] || rir[0] || '1-2', desc: desc[i] || desc[0] || '90seg', tecnica: t.tipo, tecnicaN: t.n || '', tecnicaPct: t.pct || '' };
  });
}

const chip = (activo, color, filtro, valor, texto) =>
  `<button type="button" class="rut-fchip" data-filtro="${filtro}" data-valor="${esc(valor)}"
    style="${activo ? `border-color:${color};background:${color};color:#fff;` : ''}">${esc(texto)}</button>`;

function serieHtml(s, i, total, esIso) {
  const cfg = TECNICAS_SERIE[s.tecnica] || TECNICAS_SERIE.normal;
  return `
    <div class="rut-mserie">
      <div class="rut-mserie-n">${i + 1}</div>
      <input class="form-input" data-serie="${i}" data-campo="reps" value="${esc(s.reps)}" placeholder="${esIso ? '20-30' : '10-12'}" />
      <input class="form-input" data-serie="${i}" data-campo="rir" value="${esc(s.rir)}" placeholder="1-2" />
      <input class="form-input" data-serie="${i}" data-campo="desc" value="${esc(s.desc || '90seg')}" placeholder="90seg" />
      <button type="button" class="rut-mserie-x" data-accion="serie-quitar" data-i="${i}" ${total <= 1 ? 'disabled' : ''}>✕</button>
    </div>
    <div class="rut-mtec">
      <select data-tec="${i}">
        ${Object.keys(TECNICAS_SERIE).map(k => `<option value="${k}" ${s.tecnica === k ? 'selected' : ''}>${k === 'normal' ? '' : '⚡ '}${esc(TECNICAS_SERIE[k].label)}</option>`).join('')}
      </select>
      ${s.tecnica !== 'normal' && !cfg.onOff ? `
        <input type="number" min="1" data-serie="${i}" data-campo="tecnicaN" value="${esc(s.tecnicaN || 1)}" placeholder="Nº" style="width:46px;" />
        <span class="f-ayuda" style="margin:0;">${s.tecnica === 'drop_set' ? 'drops' : 'veces'}</span>` : ''}
      ${s.tecnica === 'drop_set' ? `<input type="number" min="1" max="90" data-serie="${i}" data-campo="tecnicaPct" value="${esc(s.tecnicaPct || '')}" placeholder="% peso" style="width:60px;" />` : ''}
      ${cfg.fallo ? '<span class="rut-fallo">→ AL FALLO</span>' : ''}
    </div>`;
}

// Abre el modal. Devuelve una promesa: true si se guardó, false si se canceló.
//   biblioteca: filas de ejercicios_biblioteca · ejercicio: el que se edita (o null) · alEnviar(cuerpo): guarda o lanza Error
export function abrirModalEjercicio({ titulo, subtitulo, aviso, mesociclo, ejercicio, biblioteca, series, ordenSugerido, alEnviar }) {
  return new Promise(resolver => {
    const grupo = parseGrupoTecnica(ejercicio && ejercicio.grupo_tecnica);
    const s = {
      nombre: ejercicio ? ejercicio.nombre || '' : '',
      gif: ejercicio ? ejercicio.gif_url || '' : '',
      bibId: ejercicio ? ejercicio.biblioteca_id ?? null : null,
      bibNombre: ejercicio ? ejercicio.nombre || '' : '',
      pasos: Array.isArray(ejercicio && ejercicio.pasos) ? ejercicio.pasos.join('\n') : '',
      esIso: !!(ejercicio && ejercicio.es_isometrico),
      lastre: ejercicio && ejercicio.lastre_kg != null ? ejercicio.lastre_kg : '',
      series: series.map(x => ({ ...x })),
      grupoTipo: grupo.tipo, grupoCodigo: grupo.codigo,
      orden: ejercicio ? ejercicio.orden ?? ordenSugerido : ordenSugerido,
      notas: ejercicio ? ejercicio.notas || '' : '',
      fMusculo: 'Todos', fEquipo: 'Todos', fTipo: 'Normal'
    };
    let resultados = [];

    const capa = document.createElement('div');
    capa.className = 'modal-overlay';
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    capa.appendChild(modal);

    const atr = mesociclo && mesociclo.tipo_atr && ATR_PLANTILLAS_SERIES[mesociclo.tipo_atr] ? ATR_TIPOS[mesociclo.tipo_atr] : null;

    let pintar = function () {
      modal.innerHTML = `
        <div class="modal-title">${esc(titulo)}</div>
        <div class="modal-sub">${esc(subtitulo || '')}</div>
        ${aviso && atr ? `<div class="rut-aviso-atr" style="color:${atr.color};">● Series precargadas para "${esc(atr.label)}" — puedes ajustarlas abajo</div>` : ''}

        <div class="rut-filtros">${MUSCULOS.map(m => chip(s.fMusculo === m, '#1e90ff', 'musculo', m, m)).join('')}</div>
        <div class="rut-filtros">${EQUIPOS.map(m => chip(s.fEquipo === m, '#4caf50', 'equipo', m, m)).join('')}</div>
        <div class="rut-filtros" style="margin-bottom:14px;">${TIPOS.map(t => chip(s.fTipo === t, '#ff9800', 'tipo', t, (t === 'Rehabilitación' ? '🩹 ' : '') + t)).join('')}</div>

        <div class="form-group" style="position:relative;">
          <label class="form-label" for="ej_nombre">Ejercicio *</label>
          <input class="form-input" id="ej_nombre" data-f="nombre" value="${esc(s.nombre)}" placeholder="Busca un ejercicio..." autocomplete="off" />
          <div class="rut-dropdown" data-dropdown hidden></div>
          <div class="f-ayuda" data-enlace style="margin:4px 0 0;" hidden>🔗 Enlazado con tu biblioteca</div>
        </div>

        <div class="form-group">
          <label class="form-label" for="ej_pasos">Pasos de técnica (en español, uno por línea)</label>
          <textarea id="ej_pasos" data-f="pasos" rows="4" class="form-input" placeholder="Ej: Ajusta el asiento y siéntate con la espalda apoyada..." style="resize:vertical;line-height:1.4;">${esc(s.pasos)}</textarea>
          <div class="f-ayuda" style="margin:4px 0 0;">Al elegir un ejercicio de la biblioteca se rellena automático — revísalo y tradúcelo aquí si hace falta.</div>
        </div>

        <div class="form-group">
          <label class="form-label">Tipo de registro</label>
          <div style="display:flex;gap:8px;">
            <button type="button" class="rut-tipo ${!s.esIso ? 'activo' : ''}" data-accion="tipo" data-iso="0">🏋️ Dinámico</button>
            <button type="button" class="rut-tipo ${s.esIso ? 'activo' : ''}" data-accion="tipo" data-iso="1">⏱ Isométrico</button>
          </div>
        </div>

        <div class="form-group">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
            <label class="form-label" style="margin:0;">SERIES — <span style="color:#1e90ff;">${s.series.length}</span></label>
            <button type="button" class="rut-mas" data-accion="serie-anadir">+ Serie</button>
          </div>
          <div class="rut-mserie rut-mserie-cab"><div>#</div><div>${s.esIso ? 'SEG' : 'REPS'}</div><div>RIR</div><div>DESC</div><div></div></div>
          ${s.series.map((x, i) => serieHtml(x, i, s.series.length, s.esIso)).join('')}
        </div>

        ${s.esIso ? `
        <div class="form-group">
          <label class="form-label" for="ej_lastre">Lastre opcional (kg)</label>
          <input class="form-input" id="ej_lastre" data-f="lastre" type="number" step="0.5" min="0" value="${esc(s.lastre)}" placeholder="Ej. 10" />
        </div>` : ''}

        <div class="form-group">
          <label class="form-label">Técnica de grupo (opcional)</label>
          <div class="f-ayuda" style="margin:-4px 0 8px;">Solo para Superserie / Triserie (varios ejercicios distintos enlazados).</div>
          <div style="display:flex;gap:8px;">
            <select class="form-input" data-grupo-tipo style="flex:1;">
              <option value="" ${!s.grupoTipo ? 'selected' : ''}>Ninguna</option>
              ${Object.keys(TECNICAS_GRUPO).map(k => `<option value="${k}" ${s.grupoTipo === k ? 'selected' : ''}>🔗 ${esc(TECNICAS_GRUPO[k].label)}</option>`).join('')}
            </select>
            ${s.grupoTipo ? `<input class="form-input" data-f="grupoCodigo" value="${esc(s.grupoCodigo)}" placeholder="Código (ej. A)" style="max-width:120px;" />` : ''}
          </div>
          ${s.grupoTipo ? `<div class="f-ayuda" style="margin:6px 0 0;">Pon el mismo código en los 2-3 ejercicios que formen esta ${esc(TECNICAS_GRUPO[s.grupoTipo].label.toLowerCase())} (ej. "A").</div>` : ''}
        </div>

        <div class="form-group">
          <label class="form-label" for="ej_orden">Orden</label>
          <input class="form-input" id="ej_orden" data-f="orden" type="number" min="1" value="${esc(s.orden)}" />
        </div>
        <div class="form-group">
          <label class="form-label" for="ej_notas">Notas</label>
          <input class="form-input" id="ej_notas" data-f="notas" value="${esc(s.notas)}" placeholder="Técnica, bajada controlada..." />
        </div>
        <div data-error></div>
        <div class="modal-footer">
          <button class="btn btn-ghost" data-r="no">Cancelar</button>
          <button class="btn btn-primary" data-r="si">${ejercicio ? 'Guardar Cambios' : 'Añadir Ejercicio'}</button>
        </div>`;
    };

    // El enlace solo vale mientras el nombre siga siendo el elegido de la biblioteca.
    const enlazado = () => !!s.bibId && s.nombre.trim() === s.bibNombre;
    const marcarEnlace = () => { const el = modal.querySelector('[data-enlace]'); if (el) el.hidden = !enlazado(); };

    // Buscador: SOLO en tu biblioteca (el catálogo completo se explora desde la sección Biblioteca).
    function buscar() {
      const caja = modal.querySelector('[data-dropdown]');
      if (!caja) return;
      const q = s.nombre.toLowerCase();
      const quiereRehab = s.fTipo === 'Rehabilitación';
      resultados = biblioteca.filter(b =>
        (s.fMusculo === 'Todos' || b.musculo === s.fMusculo)
        && (s.fEquipo === 'Todos' || (b.equipo || 'Otro') === s.fEquipo)
        && (quiereRehab ? b.es_rehabilitacion === true : b.es_rehabilitacion !== true)
        && (!q || String(b.nombre_es || '').toLowerCase().includes(q))
      ).slice(0, 40);
      caja.hidden = !resultados.length;
      caja.innerHTML = resultados.map((b, i) => `
        <div class="rut-opcion" data-pick="${i}">
          ${b.gif_url ? `<img src="${esc(b.gif_url)}" alt="" loading="lazy" />` : ''}
          <div>
            <div class="rut-opcion-n">${esc(b.nombre_es)}</div>
            <div class="rut-opcion-m">${esc(b.musculo || '')}${b.equipo ? ' · ' + esc(b.equipo) : ''}</div>
          </div>
        </div>`).join('');
    }

    const cerrar = ok => { capa.remove(); document.removeEventListener('keydown', alTecla); resolver(ok); };
    const alTecla = e => { if (e.key === 'Escape') cerrar(false); };

    async function enviar() {
      const nombre = s.nombre.trim();
      const err = capa.querySelector('[data-error]');
      if (!nombre) { err.innerHTML = '<div class="alert alert-error">El nombre es obligatorio</div>'; return; }
      const cuerpo = {
        nombre,
        series: s.series.length,
        repeticiones: s.series.map(x => x.reps || '10-12').join(', '),
        rir: s.series.map(x => x.rir || '0').join(', '),
        descanso: s.series.map(x => x.desc || '90seg').join(', '),
        tecnica: s.series.map(x => formatTecnicaSerie(x)).join(', '),
        grupo_tecnica: (s.grupoTipo && s.grupoCodigo.trim()) ? `${s.grupoTipo}:${s.grupoCodigo.trim()}` : '',
        notas: s.notas.trim(),
        orden: parseInt(s.orden) || 1,
        gif_url: s.gif || '',
        pasos: s.pasos.split('\n').map(l => l.trim()).filter(Boolean),
        es_isometrico: s.esIso,
        lastre_kg: s.esIso ? (parseFloat(s.lastre) || null) : null
      };
      // biblioteca_id solo viaja si hay enlace, o si había uno y hay que quitarlo (así funciona aunque
      // la columna aún no exista, mientras no se enlace nada).
      if (enlazado()) cuerpo.biblioteca_id = s.bibId;
      else if (ejercicio && ejercicio.biblioteca_id != null) cuerpo.biblioteca_id = null;
      const boton = capa.querySelector('[data-r="si"]');
      boton.disabled = true;
      try {
        await alEnviar(cuerpo);
        cerrar(true);
      } catch (e) {
        err.innerHTML = `<div class="alert alert-error">${esc(e.message)}</div>`;
        boton.disabled = false;
      }
    }

    capa.addEventListener('click', e => {
      const t = e.target;
      const r = t.closest('[data-r]');
      if (r) { if (r.dataset.r === 'si') enviar(); else cerrar(false); return; }
      if (t === capa) { cerrar(false); return; }
      const pick = t.closest('[data-pick]');
      if (pick) {
        const b = resultados[Number(pick.dataset.pick)];
        if (b) {
          s.nombre = b.nombre_es; s.gif = b.gif_url || ''; s.bibId = b.id; s.bibNombre = b.nombre_es;
          s.pasos = Array.isArray(b.pasos) ? b.pasos.join('\n') : '';
          s.esIso = esNombreIsometrico(b.nombre_es);
          pintar();
        }
        return;
      }
      const f = t.closest('[data-filtro]');
      if (f) {
        s[{ musculo: 'fMusculo', equipo: 'fEquipo', tipo: 'fTipo' }[f.dataset.filtro]] = f.dataset.valor;
        pintar(); buscar();
        return;
      }
      const a = t.closest('[data-accion]');
      if (!a) return;
      if (a.dataset.accion === 'tipo') { s.esIso = a.dataset.iso === '1'; pintar(); }
      else if (a.dataset.accion === 'serie-anadir') {
        const u = s.series[s.series.length - 1];
        s.series.push(u ? { reps: u.reps, rir: u.rir, desc: u.desc, tecnica: 'normal', tecnicaN: '', tecnicaPct: '' } : serieBase());
        pintar();
      } else if (a.dataset.accion === 'serie-quitar' && s.series.length > 1) {
        s.series.splice(Number(a.dataset.i), 1); pintar();
      }
    });

    capa.addEventListener('input', e => {
      const el = e.target;
      if (el.dataset.serie !== undefined) { s.series[Number(el.dataset.serie)][el.dataset.campo] = el.value; return; }
      if (!el.dataset.f) return;
      s[el.dataset.f] = el.value;
      if (el.dataset.f === 'nombre') { buscar(); marcarEnlace(); }
    });
    // Al salir del campo de descanso, "90" pasa a "90seg".
    capa.addEventListener('focusout', e => {
      const el = e.target;
      if (el.dataset && el.dataset.campo === 'desc' && /^\d+$/.test(el.value.trim())) {
        el.value = el.value.trim() + 'seg';
        s.series[Number(el.dataset.serie)].desc = el.value;
      }
    });
    capa.addEventListener('change', e => {
      const el = e.target;
      if (el.dataset.tec !== undefined) {
        const i = Number(el.dataset.tec), x = s.series[i], cfg = TECNICAS_SERIE[el.value] || TECNICAS_SERIE.normal;
        x.tecnica = el.value;
        if (!x.tecnicaN) x.tecnicaN = (el.value === 'normal' || cfg.onOff) ? '' : '1';
        // Las técnicas que van al fallo fuerzan reps "AL FALLO" y RIR 0 en esa serie.
        if (cfg.fallo) { x.reps = 'AL FALLO'; x.rir = '0'; }
        pintar();
      } else if (el.matches('[data-grupo-tipo]')) {
        s.grupoTipo = el.value; pintar();
      }
    });
    capa.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.matches('input') && !e.target.dataset.serie) { e.preventDefault(); enviar(); } });
    capa.addEventListener('error', e => { if (e.target.tagName === 'IMG') e.target.style.display = 'none'; }, true);

    document.addEventListener('keydown', alTecla);
    const pintarBase = pintar;
    pintar = () => { pintarBase(); marcarEnlace(); };
    pintar();
    document.body.appendChild(capa);
    modal.querySelector('#ej_nombre').focus();
  });
}
