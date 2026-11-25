// ── Biblioteca de técnicas de intensificación: vista (F1, solo lectura) ──
// Devuelve el HTML de la pestaña «Técnicas de intensificación» de Recursos. No guarda nada, no lee
// ni escribe en Supabase y no toca ejercicios, series ni volumen. Usa el catálogo de
// tecnicas/catalogo.js (TECNICAS_BIBLIOTECA / TECNICAS_ORDEN) y el esc() del panel.
// Las fichas se despliegan con <details>, así no hay estado ni eventos propios.

function tecnicasEsc(s) {
  return (typeof esc === 'function') ? esc(s) : String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function tecnicasListaHtml(items, ordenada) {
  const tag = ordenada ? 'ol' : 'ul';
  return `<${tag} class="tec-lista">${(items || []).map(i => `<li>${tecnicasEsc(i)}</li>`).join('')}</${tag}>`;
}

function tecnicasRefsHtml(t) {
  const refs = t.refs || [];
  if (!refs.length) {
    return '<div class="tec-pend">Referencias: pendientes de verificar contra el artículo original. No se publican hasta entonces.</div>';
  }
  return `<ul class="tec-lista">${refs.map(r =>
    `<li>${tecnicasEsc(r.cita)} <span class="muted">doi:${tecnicasEsc(r.doi)}</span>` +
    `${r.verificada ? ` <span class="tec-ok">${tecnicasEsc(r.verificada)}</span>` : ''}</li>`).join('')}</ul>`;
}

function tecnicasFichaHtml(id) {
  const t = (typeof TECNICAS_BIBLIOTECA !== 'undefined') ? TECNICAS_BIBLIOTECA[id] : null;
  if (!t) return '';
  const ev = t.evidencia || {};
  const chips = [
    `<span class="tec-chip">${tecnicasEsc(t.corto)}</span>`,
    t.tipo === 'grupo' ? '<span class="tec-chip">Varios ejercicios</span>' : '',
    t.requiereAutorizacion ? '<span class="tec-chip tec-warn">Requiere habilitación expresa</span>' : '',
    `<span class="tec-chip ${t.enSelector ? 'tec-on' : ''}">${t.enSelector ? 'Ya está en el selector de ejercicios' : 'Aún no está en el selector'}</span>`
  ].join('');
  return `
    <details class="tec-ficha">
      <summary>
        <span class="tec-nombre">${tecnicasEsc(t.nombre)}</span>
        <span class="tec-evi">${tecnicasEsc(ev.nivel || '')}</span>
      </summary>
      <div class="tec-cuerpo">
        <div class="tec-chips">${chips}</div>
        ${t.requiereAutorizacion ? '<div class="tec-aviso">Técnica de acceso restringido: solo se podrá usar con clientes habilitados expresamente por el entrenador.</div>' : ''}
        <p>${tecnicasEsc(t.descripcion)}</p>
        <h4>Cómo se ejecuta</h4>
        ${tecnicasListaHtml(t.pasos, true)}
        <h4>Ejemplo práctico</h4>
        <p>${tecnicasEsc(t.ejemplo)}</p>
        <h4>Objetivo principal</h4>
        <p>${tecnicasEsc(t.objetivo)}</p>
        <h4>Cuándo puede ser útil</h4>
        ${tecnicasListaHtml(t.util, false)}
        <h4>Inconvenientes y limitaciones</h4>
        ${tecnicasListaHtml(t.limites, false)}
        <h4>Nivel de evidencia</h4>
        <p><b>${tecnicasEsc(ev.nivel || '')}</b> <span class="tec-estado">(${tecnicasEsc(ev.estado || '')})</span><br>${tecnicasEsc(ev.nota || '')}</p>
        <h4>Estudios y referencias</h4>
        ${tecnicasRefsHtml(t)}
      </div>
    </details>`;
}

function tecnicasBibliotecaHtml() {
  const orden = (typeof TECNICAS_ORDEN !== 'undefined') ? TECNICAS_ORDEN : [];
  return `
    <div class="card rec-card">
      <div class="vol-tit">Técnicas de intensificación <small>Biblioteca de consulta</small></div>
      <div class="muted" style="font-size:13px;margin-bottom:14px">
        Fichas de consulta de todas las técnicas que existen en Trainingworks, más las que están previstas. Esta pantalla no modifica rutinas, series ni volumen.
        Los niveles de evidencia son provisionales y las referencias solo se publican cuando están verificadas contra el artículo original.
        Criterio de Roberto Castellano: estas técnicas pueden tener su lugar, pero no pueden ser la base del entrenamiento.
      </div>
      ${orden.map(tecnicasFichaHtml).join('')}
    </div>`;
}
