// Pantalla del diagnóstico para iPad/móvil (se carga desde el marcador de Safari). SOLO LECTURA: reutiliza nutriDiagnosticoControlV2 (solo GET).
(async function () {
  const old = document.getElementById('jctw-diag'); if (old) old.remove();
  const B = window.__jctwB, $ = (t, s, h) => { const e = document.createElement(t); if (s) e.style.cssText = s; if (h != null) e.textContent = h; return e; };
  const box = $('div', 'position:fixed;inset:0;z-index:2147483647;background:#0b0f14;color:#e6edf3;font:15px/1.45 -apple-system,system-ui,sans-serif;overflow:auto;-webkit-overflow-scrolling:touch;padding:max(16px,env(safe-area-inset-top)) 16px max(24px,env(safe-area-inset-bottom))');
  box.id = 'jctw-diag';
  const btn = (txt, fn, azul) => { const b = $('button', `min-height:46px;padding:0 16px;margin:0 8px 8px 0;border-radius:10px;border:1px solid ${azul ? '#0062B2' : '#30363d'};background:${azul ? '#0062B2' : '#161b22'};color:#fff;font:600 15px -apple-system,system-ui,sans-serif`, txt); b.onclick = fn; return b; };
  const cerrar = btn('Cerrar', () => box.remove());
  box.append($('div', 'font-weight:700;font-size:18px;margin-bottom:4px', 'Diagnóstico de Nutrición · solo lectura'), $('div', 'color:#8b949e;margin-bottom:12px', 'Mide tus menús guardados con el control actual y con el nuevo. No cambia nada.'));
  const estado = $('div', 'margin:12px 0;color:#58a6ff', 'Analizando menús… puede tardar de 20 a 60 segundos. No cierres esta pantalla.');
  box.append(estado, cerrar); document.body.append(box);
  const fallo = m => { estado.style.color = '#f85149'; estado.textContent = m; };
  try {
    if (typeof supabase !== 'function' || typeof nv2ObjetivoComidaV4 !== 'function' || typeof state === 'undefined') return fallo('Abre primero el panel del entrenador (con la sesión iniciada) y vuelve a pulsar el marcador.');
    (0, eval)(await (await fetch(B + 'diagnostico-consola.js?t=' + Date.now())).text());
    const r = await nutriDiagnosticoControlV2({ silencioso: true });
    estado.remove();
    const nombres = [...new Set(r.filas.map(f => f.cliente))], alias = {}; nombres.forEach((n, i) => { alias[n] = 'C' + String(i + 1).padStart(2, '0'); });
    const chk = $('input'); chk.type = 'checkbox'; chk.style.cssText = 'width:22px;height:22px;margin-right:10px;vertical-align:middle';
    const lab = $('label', 'display:block;margin:8px 0 12px;color:#c9d1d9'); lab.append(chk, document.createTextNode('Incluir nombres de clientes al copiar (si no, salen como C01, C02…)'));
    const icono = { valido: '✅', fuera: '⛔', incompleto: '🟡', sin_referencia: '⚪' };
    const nom = n => (chk.checked ? n : alias[n] || n);
    const anon = t => (chk.checked ? t : nombres.reduce((s, n) => s.split(n).join(alias[n]), t));
    const lineas = () => r.filas.map(f => `${nom(f.cliente)} · ${f.menu} · reparto ${f.reparto} · ${icono[f.estado] || f.estado} (actual: ${f.estadoActual}${f.cambia ? ' · CAMBIA' : ''}) · brecha P/H/G ${f.brechaP}/${f.brechaH}/${f.brechaG} · kcal peor caso +${f.kcalAltoPct}% / ${f.kcalBajoPct}% · plato kcal decl-vs-449 máx ${f.platoKcalDeclVs449MaxAbs}`);
    const resumen = () => anon(r.texto) + '\n\nPOR MENÚ\n' + lineas().join('\n');
    const area = $('textarea', 'width:100%;min-height:46vh;box-sizing:border-box;background:#0d1117;color:#e6edf3;border:1px solid #30363d;border-radius:10px;padding:10px;font:12.5px/1.4 ui-monospace,Menlo,monospace'); area.readOnly = true;
    const pinta = () => { area.value = resumen(); }; chk.onchange = pinta; pinta();
    const copiar = async (txt, ok) => { try { await navigator.clipboard.writeText(txt); } catch (e) { const a = $('textarea', 'position:fixed;opacity:0'); a.value = txt; document.body.append(a); a.select(); try { document.execCommand('copy'); } catch (e2) { /* se puede copiar a mano desde el cuadro */ } a.remove(); } ok.textContent = '✔ Copiado'; setTimeout(() => { ok.textContent = ok.dataset.t; }, 2500); };
    const b1 = btn('Copiar resumen', () => copiar(resumen(), b1), true), b2 = btn('Copiar detalle completo (JSON)', () => copiar(anon(JSON.stringify(r.filas)), b2));
    b1.dataset.t = b1.textContent; b2.dataset.t = b2.textContent;
    box.insertBefore(lab, cerrar); box.insertBefore(area, cerrar); box.insertBefore(b1, cerrar); box.insertBefore(b2, cerrar);
    box.insertBefore($('div', 'color:#8b949e;font-size:13px;margin:6px 0 12px', 'Pega el resumen en el chat con Claude. Si algo no se copia, mantén pulsado el cuadro de texto y elige «Seleccionar todo».'), cerrar);
  } catch (e) { fallo('No se pudo completar el diagnóstico: ' + (e && e.message ? e.message : e)); }
})();
