// VISTA PREVIA del paso 2 (se carga desde el marcador de Safari). Solo cambia la página abierta, en memoria: al recargar desaparece.
// No escribe en Supabase y no toca main. Descarga la rama, coge el bloque «CONTROL NUTRICIONAL V2» y añade UNA línea al Menú cerrado.
(async function () {
  const aviso = (m, ok) => { const e = document.createElement('div'); e.style.cssText = `position:fixed;left:12px;right:12px;bottom:max(12px,env(safe-area-inset-bottom));z-index:2147483647;padding:14px 16px;border-radius:12px;background:${ok ? '#0f2a1a' : '#3a1414'};color:#fff;font:15px/1.4 -apple-system,system-ui,sans-serif;border:1px solid ${ok ? '#22c55e' : '#f85149'}`; e.textContent = m; e.onclick = () => e.remove(); document.body.append(e); setTimeout(() => e.remove(), 14000); };
  try {
    if (typeof mcSeccionHtml !== 'function' || typeof render !== 'function') return aviso('Abre primero el panel del entrenador (con la sesión iniciada) y vuelve a pulsar el marcador.', false);
    const html = await (await fetch(window.__jctwR + 'prueba/index.html?t=' + Date.now())).text();
    const a = html.indexOf('// ═══ CONTROL NUTRICIONAL V2 · FASE 1'), b = html.indexOf('// ═══ FIN CONTROL NUTRICIONAL V2 (fase 1)');
    if (a < 0 || b < 0) return aviso('No encuentro el bloque nuevo en la rama.', false);
    (0, eval)(html.slice(a, html.indexOf('\n', b) + 1));
    const LINEA = '    ${mcCtrlPanelHtml(c, est, mc)}\n', ANCLA = '    ${peorHtml}\n', src = mcSeccionHtml.toString();
    if (!src.includes('mcCtrlPanelHtml(c, est, mc)')) {
      if (!src.includes(ANCLA)) return aviso('El Menú cerrado de esta versión del panel es distinto del esperado; no he cambiado nada.', false);
      (0, eval)('window.mcSeccionHtml = ' + src.replace(ANCLA, ANCLA + LINEA));
    }
    render();
    aviso('Vista previa activada. Abre un cliente → Nutrición → Menú cerrado: verás un recuadro punteado «Control del día · nuevo». Recarga la página para quitarlo.', true);
  } catch (e) { aviso('No se pudo activar la vista previa: ' + (e && e.message ? e.message : e), false); }
})();
