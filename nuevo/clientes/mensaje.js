// Modal «🔔 Mensaje al cliente»: notificación push con frases rápidas (réplica de renderModalSendPush de prueba/index.html).
import { esc } from '../core/ui.js';

export const MOTIVACION_PUSH_FRASES = {
  unisex: [
    '💪 Sigue así, la constancia es lo que marca la diferencia',
    '👏 Buen trabajo estos días, no bajes el ritmo',
    '⏰ Recuerda registrar tu entreno de hoy',
    '🎯 Un paso más cerca de tu objetivo, no lo sueltes',
    '📈 Se nota el progreso, sigue así',
    '🙌 Esta semana lo estás haciendo muy bien',
    '🧠 Los resultados no son casualidad, son consecuencia de lo que haces cada día',
    '🌱 No hace falta ser perfecto, solo constante'
  ],
  hombre: [
    '🔥 Esta semana toca subir la intensidad, ¡a por ello!',
    '🏋️ Nuevo peso en la barra esta semana, vamos a por el PR',
    '🥇 La disciplina de hoy es el resultado de mañana',
    '⚡ Nada de excusas hoy, dale caña al entreno'
  ],
  mujer: [
    '🌟 Cada entreno suma, estás construyendo algo grande',
    '💥 Esta semana toca darlo todo, confía en el proceso',
    '✨ Estás más fuerte que la semana pasada, sigue así',
    '🚀 Sin prisa pero sin pausa, vas muy bien'
  ]
};

// Las unisex siempre, más las de su género si lo tenemos registrado; si no, se muestran todas.
export function frasesMotivacionPara(c) {
  const g = c?.genero === 'MUJER' ? 'mujer' : c?.genero === 'HOMBRE' ? 'hombre' : null;
  const especificas = g ? MOTIVACION_PUSH_FRASES[g] : [...MOTIVACION_PUSH_FRASES.hombre, ...MOTIVACION_PUSH_FRASES.mujer];
  return [...MOTIVACION_PUSH_FRASES.unisex, ...especificas];
}

export function abrirMensajeCliente({ ctx, cliente }) {
  const { api, ui } = ctx;
  const frases = frasesMotivacionPara(cliente);
  const capa = document.createElement('div');
  capa.className = 'modal-overlay';
  capa.innerHTML = `
    <div class="modal">
      <div class="modal-title">🔔 Mensaje al cliente</div>
      <div class="modal-sub">${esc(cliente.nombre)} — ${esc(cliente.codigo)}</div>
      <div style="font-size:12px;color:var(--muted);margin-bottom:8px;">Frases rápidas (toca una para rellenar, luego edítala si quieres):</div>
      <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px;">
        ${frases.map((f, i) => `<button type="button" class="btn btn-ghost btn-sm" data-frase="${i}" style="font-size:12px;">${esc(f)}</button>`).join('')}
      </div>
      <div class="form-group">
        <label class="form-label">Mensaje</label>
        <textarea class="form-textarea" id="f_pushMensaje" rows="3" placeholder="Te he subido la rutina de esta semana, échale un vistazo 💪" style="resize:vertical;" maxlength="180"></textarea>
      </div>
      <div style="font-size:12px;color:var(--muted);margin-bottom:12px;">Le llegará como notificación push si tiene los avisos activados en su móvil.</div>
      <div data-error></div>
      <div class="modal-footer">
        <button class="btn btn-ghost" data-cancelar>Cancelar</button>
        <button class="btn btn-primary" data-enviar>🔔 Enviar</button>
      </div>
    </div>`;
  const $ = s => capa.querySelector(s);
  const alTecla = e => { if (e.key === 'Escape') cerrar(); };
  const cerrar = () => { capa.remove(); document.removeEventListener('keydown', alTecla); };
  capa.addEventListener('click', async e => {
    if (e.target.closest('[data-cancelar]')) return cerrar();
    const f = e.target.closest('[data-frase]');
    if (f) { const ta = $('#f_pushMensaje'); ta.value = frases[Number(f.dataset.frase)] || ''; ta.focus(); return; }
    if (!e.target.closest('[data-enviar]')) return;
    const mensaje = $('#f_pushMensaje').value.trim();
    if (!mensaje) { $('[data-error]').innerHTML = '<div class="alert alert-error">Escribe un mensaje</div>'; return; }
    const boton = $('[data-enviar]');
    boton.textContent = 'Enviando...'; boton.disabled = true;
    try {
      await api.funcion('send-push', { codigo: cliente.codigo, mensaje, titulo: 'COACH' });
      cerrar();
      ui.alerta(`✅ Aviso enviado a ${cliente.nombre}`);
    } catch (err) {
      $('[data-error]').innerHTML = `<div class="alert alert-error">Error: ${esc(err.message)}</div>`;
      boton.textContent = '🔔 Enviar'; boton.disabled = false;
    }
  });
  document.addEventListener('keydown', alTecla);
  document.body.appendChild(capa);
}
