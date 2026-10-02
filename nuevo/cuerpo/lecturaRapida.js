// Cuerpo · tarjeta "Lectura rápida" (peso medio semanal + cintura + fuerza). Copiada tal cual de
// prueba/index.html (renderLecturaRapidaCuerpo), con un único cambio: la fuerza ya no se calcula aquí
// dentro sino que llega calculada (fuerzaDeCliente, en calculos.js).
import { esc } from '../core/ui.js';
import { rnd } from '../core/composicion.js';

// ── 🧭 Lectura rápida del cuerpo: peso (media semanal) + cintura + fuerza ──
// Pensada para clientes que solo dan peso corporal, perímetro de abdomen y fotos. Siempre en
// TENDENCIA (3-4 semanas), nunca con un dato suelto: el agua mueve el peso varios kg de un día a otro
// y la cintura varía con la hinchazón. Cruza con la fuerza de Entrenos para separar grasa de músculo.
export function lunesClaveFecha(f) {
  const d = new Date(f); d.setHours(12, 0, 0, 0);
  const dia = (d.getDay() + 6) % 7; // lunes = 0
  d.setDate(d.getDate() - dia);
  return d.toISOString().slice(0, 10);
}
export function lecturaRapidaHtml(c, datos, fuerza) {
  // Esta tarjeta es la VISTA RÁPIDA y siempre visible. NO sustituye al veredicto/insights/gráficas de
  // "Ver evolución" (que traen las recomendaciones, el estado de salud y los índices del check-in plus):
  //  · Cliente SIMPLE (solo peso + cintura): aquí está toda su lectura, con ritmo frente al objetivo.
  //  · Cliente PLUS (con composición): se añaden % graso y masa magra, el veredicto se afina con ellas y se
  //    quitan las líneas de ritmo/riesgo de cintura, porque ya las cubre el veredicto de abajo (mismos
  //    umbrales) y repetirlas podía dar dos mensajes distintos.
  const conPeso = datos.filter(d => Number(d.peso) > 0);
  const conCintura = datos.filter(d => Number(d.abdomen) > 0);
  const conComp = datos.filter(d => d.composicion && d.composicion.comp && d.composicion.bf && Number.isFinite(d.composicion.bf.media));
  const caja = (inner) => `<div style="background:#0d0d0d;border:1px solid #222;border-radius:12px;padding:14px 16px;margin-bottom:16px;">${inner}</div>`;
  const titulo = '<div style="color:#8fa3b8;font-size:11px;font-weight:700;text-transform:uppercase;margin-bottom:8px;">🧭 Lectura rápida: peso + cintura + fuerza</div>';
  if (conPeso.length < 2 && conCintura.length < 2) {
    return caja(titulo + '<div style="color:#888;font-size:13px;">Hacen falta al menos 2 registros de peso o de cintura para empezar a ver una tendencia.</div>');
  }

  const hoy = new Date();
  const diasDesde = f => (hoy - new Date(f)) / 86400000;
  const diasEntre = (f1, f2) => (new Date(f2) - new Date(f1)) / 86400000;
  // Fila de referencia ≈4 semanas antes de la última (mínimo 10 días de diferencia)
  const refHaceUnMes = (lista) => {
    if (lista.length < 2) return null;
    const ult = lista[lista.length - 1];
    const objetivoFecha = new Date(ult.fecha); objetivoFecha.setDate(objetivoFecha.getDate() - 28);
    let ref = null, mejor = Infinity;
    lista.slice(0, -1).forEach(d => {
      if (diasEntre(d.fecha, ult.fecha) < 10) return;
      const dif = Math.abs(new Date(d.fecha) - objetivoFecha);
      if (dif < mejor) { mejor = dif; ref = d; }
    });
    return ref;
  };

  // 1) Peso: media por semana (lunes→domingo). Ventana ≈4 semanas reales; si los datos son quincenales
  //    (check-in plus) la pendiente se calcula con las semanas REALES entre la primera y la última.
  const porSemana = {};
  conPeso.forEach(d => { const k = lunesClaveFecha(d.fecha); (porSemana[k] = porSemana[k] || []).push(Number(d.peso)); });
  const todasSem = Object.keys(porSemana).sort().map(k => ({ k, avg: porSemana[k].reduce((x, y) => x + y, 0) / porSemana[k].length, n: porSemana[k].length }));
  let semanas = [];
  if (todasSem.length) {
    const ultK = new Date(todasSem[todasSem.length - 1].k);
    semanas = todasSem.filter(w => (ultK - new Date(w.k)) / 86400000 <= 28);
    if (semanas.length < 2 && todasSem.length >= 2) semanas = todasSem.slice(-2);
  }
  let pesoPctSem = null, pesoKgSem = null, pesoEstado = null, semanasReales = null;
  if (semanas.length >= 2) {
    semanasReales = Math.max(1, Math.round((new Date(semanas[semanas.length - 1].k) - new Date(semanas[0].k)) / 604800000));
    pesoKgSem = (semanas[semanas.length - 1].avg - semanas[0].avg) / semanasReales;
    pesoPctSem = Math.round(pesoKgSem / semanas[0].avg * 10000) / 100; // 2 decimales, para que 0,50 no caiga como "por debajo del 0,5"
    pesoEstado = pesoPctSem <= -0.25 ? 'baja' : (pesoPctSem >= 0.25 ? 'sube' : 'estable');
  }

  // 2) Cintura
  let cinturaDelta = null, cinturaEstado = null, cinturaDias = null;
  const ultCint = conCintura[conCintura.length - 1] || null;
  const refCint = refHaceUnMes(conCintura);
  if (ultCint && refCint) {
    cinturaDelta = Number(ultCint.abdomen) - Number(refCint.abdomen);
    cinturaDias = Math.round(diasEntre(refCint.fecha, ultCint.fecha));
    cinturaEstado = cinturaDelta <= -1.5 ? 'baja' : (cinturaDelta >= 1.5 ? 'sube' : 'estable');
  }

  // 3) Composición (solo clientes con check-in plus): masa magra y masa grasa en kg + % graso
  let hayComp = false, dMagra = null, dGrasaKg = null, dGrasaPct = null, compDias = null, compUlt = null;
  const refComp = refHaceUnMes(conComp);
  if (refComp) {
    compUlt = conComp[conComp.length - 1];
    const magraU = Number(compUlt.composicion.comp.masaMagra), magraR = Number(refComp.composicion.comp.masaMagra);
    const grasaU = Number(compUlt.peso) - magraU, grasaR = Number(refComp.peso) - magraR;
    if (Number.isFinite(magraU) && Number.isFinite(magraR) && Number.isFinite(grasaU) && Number.isFinite(grasaR)) {
      hayComp = true;
      dMagra = magraU - magraR; dGrasaKg = grasaU - grasaR;
      dGrasaPct = compUlt.composicion.bf.media - refComp.composicion.bf.media;
      compDias = Math.round(diasEntre(refComp.fecha, compUlt.fecha));
    }
  }

  // 4) Fuerza (misma detección que la pestaña Historial; la calcula index.js con fuerzaDeCliente)
  const fuerzaEstado = fuerza ? fuerza.estado : null;
  const fuerzaTxt = fuerza ? fuerza.txt : 'Sin datos';
  const fuerzaMal = fuerzaEstado === 'baja';

  // 5) Veredicto
  let lectura = null;
  if (hayComp) {
    // Con composición se separa grasa de músculo de verdad (umbrales de 0,2 kg como en el informe de abajo)
    const grasaBaja = dGrasaKg <= -0.3, grasaSube = dGrasaKg >= 0.3;
    const magraSube = dMagra > 0.2, magraBaja = dMagra < -0.2;
    if (magraBaja && fuerzaEstado === 'ok' && Math.abs(dMagra) < 3) {
      // La masa magra sale de una fórmula con perímetros (varía 1-2 kg con hidratación, hora o cinta): si la fuerza
      // se mantiene o sube, lo más probable es ruido y no pérdida real de músculo. No se da la alarma.
      lectura = { i: '🟡', col: '#eab308', t: grasaBaja ? 'Pierde grasa; la masa magra estimada baja, pero la fuerza se sostiene' : 'La masa magra estimada baja, pero la fuerza se sostiene',
        d: 'La estimación de masa magra viene de fórmulas con perímetros y se mueve 1-2 kg con la hidratación o la medida. Si la fuerza no cae, lo más probable es ruido: confírmalo con la próxima medida antes de tocar nada.' };
    }
    else if (grasaBaja && magraBaja) lectura = { i: '🟠', col: '#f97316', t: 'Pierde grasa, pero también músculo', d: 'La masa magra baja a la vez que la grasa y la fuerza no lo desmiente. Revisa proteína y recuperación; si el ritmo es rápido, sube algo la ingesta.' };
    else if (grasaBaja && magraSube) lectura = { i: '🟢', col: '#22c55e', t: 'Recomposición: pierde grasa y gana músculo', d: 'Baja la grasa y sube la masa magra a la vez. Es lo mejor que puede pasar: no cambies nada todavía.' };
    else if (grasaBaja) lectura = { i: '🟢', col: '#22c55e', t: 'Pierde grasa y mantiene el músculo', d: 'Baja la masa grasa y la masa magra se sostiene. Justo lo que se busca en definición.' };
    else if (grasaSube && magraSube) lectura = { i: '🟡', col: '#eab308', t: 'Gana músculo y algo de grasa', d: 'Sube la masa magra, pero también la grasa. Normal en volumen; si el objetivo no es ese, valora bajar el superávit.' };
    else if (grasaSube) lectura = { i: '🟠', col: '#f97316', t: 'Gana grasa sin ganar músculo', d: 'Sube la masa grasa y la masa magra no acompaña. Revisa la ingesta real frente a lo pactado.' };
    else if (magraSube) lectura = { i: '🟢', col: '#22c55e', t: 'Gana músculo sin ganar grasa', d: 'La masa magra sube y la grasa se queda estable: ganancia muscular limpia.' };
    else lectura = { i: '⚪', col: '#8fa3b8', t: 'Composición estable', d: 'Ni la grasa ni el músculo se mueven de forma apreciable en este periodo.' };
    if (fuerzaMal && (grasaBaja || lectura.col === '#22c55e')) {
      lectura = { i: '🟠', col: '#f97316', t: 'Cuidado: la composición mejora pero la fuerza cae', d: 'Si las cargas bajan, puede haber fatiga o déficit demasiado agresivo aunque los números salgan bien. Revisa recuperación y calorías.' };
    }
  } else if (pesoEstado && cinturaEstado) {
    const t = `${pesoEstado}|${cinturaEstado}`;
    const L = {
      'baja|baja':       { i: '🟢', col: '#22c55e', t: 'Pierde grasa', d: 'Baja el peso y baja la cintura: lo que se busca en definición.' },
      'estable|baja':    { i: '🟢', col: '#22c55e', t: 'Recomposición probable', d: 'El peso no se mueve pero la cintura baja: pierde grasa y mantiene o gana músculo.' },
      'baja|estable':    { i: '🟡', col: '#eab308', t: 'Posible pérdida de músculo o de agua, o va lento', d: 'Baja el peso pero la cintura no responde. Mira la fuerza antes de seguir bajando.' },
      'sube|estable':    { i: '🟢', col: '#22c55e', t: 'Gana músculo (si la fuerza sube)', d: 'Sube el peso con la cintura estable: encaja con ganancia muscular limpia.' },
      'sube|baja':       { i: '🟢', col: '#22c55e', t: 'Gana músculo y pierde grasa', d: 'Sube el peso y baja la cintura: recomposición muy buena (típica de principiantes).' },
      'sube|sube':       { i: '🟠', col: '#f97316', t: 'Gana grasa, o el volumen es muy alto', d: 'Suben peso y cintura a la vez. Valora bajar el superávit si no es el objetivo.' },
      'estable|estable': { i: '⚪', col: '#8fa3b8', t: 'Sin cambios', d: 'Ni peso ni cintura se mueven: mantenimiento. Si el objetivo era cambiar algo, toca ajustar.' },
      'estable|sube':    { i: '🟠', col: '#f97316', t: 'Cintura sube con peso estable', d: 'Puede ser hinchazón/retención, o que gane grasa y pierda músculo. Repite la medida y revisa fuerza.' },
      'baja|sube':       { i: '🟡', col: '#eab308', t: 'Datos contradictorios', d: 'Baja el peso pero sube la cintura: casi seguro hinchazón o error de medida. Repite la medida con las mismas condiciones.' }
    };
    lectura = L[t];
    if (fuerzaMal && (t === 'baja|baja' || t === 'baja|estable' || t === 'estable|baja')) {
      lectura = { i: '🟠', col: '#f97316', t: 'Cuidado: pierde cintura pero la fuerza cae', d: 'Si las cargas bajan mientras baja el peso, puede estar perdiendo músculo. Sube algo la ingesta y revisa la proteína.' };
    }
  } else if (pesoEstado) {
    lectura = { i: '⚪', col: '#8fa3b8', t: 'Solo hay tendencia de peso', d: 'Sin 2 medidas de cintura con 10+ días entre ellas no se puede separar grasa de músculo.' };
  } else if (cinturaEstado) {
    lectura = { i: '⚪', col: '#8fa3b8', t: 'Solo hay tendencia de cintura', d: 'Faltan semanas de pesadas para cruzarlo con el peso.' };
  } else {
    lectura = { i: '⚪', col: '#8fa3b8', t: 'Aún sin tendencia clara', d: 'Hay pocos datos repartidos en el tiempo. Se necesitan al menos 2 registros separados por 10+ días.' };
  }

  // 6) Ritmo de peso frente al objetivo (solo sin composición: con ella lo da el veredicto de abajo)
  let ritmoTxt = '';
  if (!hayComp && pesoPctSem != null) {
    const obj = c.objetivoCalorico;
    const p = Math.abs(pesoPctSem).toFixed(2);
    if (obj === 'corte') {
      if (pesoPctSem < -1) ritmoTxt = `⚠️ Pierde ~${p}%/semana: más rápido del 0,5-1% recomendado, con riesgo de perder músculo.`;
      else if (pesoPctSem <= -0.5) ritmoTxt = `✅ Ritmo de ${p}%/semana: dentro del 0,5-1% recomendado para perder grasa.`;
      else if (pesoPctSem < -0.25) ritmoTxt = `🟡 Ritmo de ${p}%/semana: por debajo del 0,5-1%. Va seguro pero lento.`;
      else ritmoTxt = `🟡 No baja (${pesoPctSem >= 0 ? '+' : '-'}${p}%/semana) con objetivo de definición: revisa la adherencia real.`;
    } else if (obj === 'volumen') {
      if (pesoPctSem > 0.5) ritmoTxt = `⚠️ Sube ~${p}%/semana: más rápido del 0,25-0,5% orientativo, probablemente con más grasa.`;
      else if (pesoPctSem >= 0.25) ritmoTxt = `✅ Ritmo de ${p}%/semana: dentro del 0,25-0,5% orientativo para ganar músculo.`;
      else ritmoTxt = `🟡 Sube menos de 0,25%/semana (${pesoPctSem >= 0 ? '+' : '-'}${p}%): puede quedarse corto si busca ganar peso.`;
    } else if (obj === 'mantenimiento') {
      ritmoTxt = Math.abs(pesoPctSem) <= 0.5 ? `✅ Peso estable (${pesoPctSem >= 0 ? '+' : '-'}${p}%/semana, margen de ±0,5%).` : `🟡 El peso se mueve ${pesoPctSem >= 0 ? '+' : '-'}${p}%/semana con objetivo de mantenimiento.`;
    }
  }

  // 7) Cintura/altura y cintura absoluta
  const altura = Number(c.altura) || null;
  let whtrHtml = '—', whtrSub = '';
  if (ultCint && altura) {
    const w = Number(ultCint.abdomen) / altura;
    const col = w < 0.5 ? '#22c55e' : (w < 0.6 ? '#eab308' : '#ef4444');
    const cat = w < 0.5 ? 'saludable' : (w < 0.6 ? 'riesgo aumentado' : 'riesgo alto');
    whtrHtml = `<span style="color:${col};">${w.toFixed(2)}</span>`;
    whtrSub = `${cat} · ${esc(ultCint.abdomen)}cm`;
  } else if (ultCint) { whtrSub = `${esc(ultCint.abdomen)}cm · falta altura en la ficha`; }
  const mujer = c.genero === 'MUJER';
  const lim1 = mujer ? 80 : 94, lim2 = mujer ? 88 : 102;
  const cintAbsTxt = (!hayComp && ultCint) ? (Number(ultCint.abdomen) >= lim2 ? `Cintura ≥${lim2}cm: riesgo cardiometabólico alto.` : (Number(ultCint.abdomen) >= lim1 ? `Cintura ≥${lim1}cm: riesgo cardiometabólico aumentado.` : '')) : '';

  // 8) Calidad de los datos
  const avisos = [];
  const esSimple = !!c.checkin_simple_activo;
  if (esSimple && !c.checkin_activo) {
    // Solo el check-in simple pide la MEDIA de varias pesadas, así que tiene sentido exigir más de una
    const pesadas14 = conPeso.filter(d => diasDesde(d.fecha) <= 14).length;
    if (conPeso.length && pesadas14 < 2) avisos.push(`Solo ${pesadas14} registro${pesadas14 === 1 ? '' : 's'} de peso en 14 días: sin check-in reciente la media semanal no es fiable.`);
  }
  if (conPeso.length >= 2) {
    const pU = conPeso[conPeso.length - 1], pA = conPeso[conPeso.length - 2];
    const saltoKg = Number(pU.peso) - Number(pA.peso), saltoDias = diasEntre(pA.fecha, pU.fecha);
    if (saltoDias <= 10 && Math.abs(saltoKg) >= 1.5) {
      avisos.push(`El peso ha saltado ${saltoKg > 0 ? '+' : ''}${rnd(saltoKg, 1)} kg en ${Math.max(1, Math.round(saltoDias))} día${Math.round(saltoDias) === 1 ? '' : 's'} (${esc(pA.peso)} → ${esc(pU.peso)}). Suele ser agua o un registro atípico: míralo en "Borrar registro suelto" antes de fiarte de la composición.`);
    }
  }
  if (ultCint && diasDesde(ultCint.fecha) > 35) avisos.push(`Última cintura hace ${Math.round(diasDesde(ultCint.fecha))} días: está desactualizada.`);
  if (cinturaDelta != null && Math.abs(cinturaDelta) < 1.5) avisos.push('Un cambio de cintura menor de 1-2 cm entra dentro del error de medida: no lo interpretes como avance.');
  if (pesoEstado && (semanasReales || 0) < 3) avisos.push('Con menos de 3 semanas de datos, la tendencia es provisional.');

  const fmt = (v, dec = 1) => (v > 0 ? '+' : '') + v.toFixed(dec);
  const mini = (lbl, valor, sub) => `<div style="background:#111;border:1px solid #1d1d1d;border-radius:10px;padding:10px 12px;">
      <div style="color:#8fa3b8;font-size:10px;font-weight:700;text-transform:uppercase;">${lbl}</div>
      <div style="color:#fff;font-size:16px;font-weight:700;margin-top:3px;">${valor}</div>
      <div style="color:#777;font-size:11px;margin-top:2px;">${sub}</div></div>`;
  const colFuerza = fuerzaEstado === 'baja' ? '#ef4444' : (fuerzaEstado === 'estancada' ? '#f97316' : (fuerzaEstado === 'ok' ? '#22c55e' : '#888'));
  const colDelta = (v, buenoSiBaja) => Math.abs(v) < 0.05 ? '#ccc' : ((v < 0) === buenoSiBaja ? '#22c55e' : '#f97316');

  const minisComp = hayComp ? `
      ${mini('🔥 % graso', `${rnd(compUlt.composicion.bf.media, 1)}%`, `<span style="color:${colDelta(dGrasaPct, true)};">${fmt(dGrasaPct)} pts</span> en ${compDias} días · medido el ${new Date(compUlt.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })}`)}
      ${mini('💪 Masa magra', `${rnd(Number(compUlt.composicion.comp.masaMagra), 1)} kg`, `<span style="color:${colDelta(dMagra, false)};">${fmt(dMagra)} kg</span> · grasa <span style="color:${colDelta(dGrasaKg, true)};">${fmt(dGrasaKg)} kg</span>`)}` : '';

  return caja(`
    ${titulo}
    <div style="border-left:4px solid ${lectura.col};padding-left:12px;margin-bottom:12px;">
      <div style="color:${lectura.col};font-size:16px;font-weight:800;">${lectura.i} ${lectura.t}</div>
      <div style="color:#ccc;font-size:13px;margin-top:4px;line-height:1.45;">${lectura.d}</div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;margin-bottom:12px;">
      ${mini('⚖️ Peso (media semanal)', pesoPctSem != null ? `${fmt(pesoKgSem, 2)} kg/sem` : '—', pesoPctSem != null ? `${fmt(pesoPctSem, 2)}% por semana · ${semanasReales} sem. · actual ${rnd(semanas[semanas.length - 1].avg, 1)}kg` : 'faltan semanas con pesadas')}
      ${mini('📏 Cintura', cinturaDelta != null ? `<span style="color:${cinturaEstado === 'baja' ? '#22c55e' : (cinturaEstado === 'sube' ? '#f97316' : '#ccc')};">${fmt(cinturaDelta)} cm</span>` : (ultCint ? `${esc(ultCint.abdomen)} cm` : '—'), cinturaDelta != null ? `en ${cinturaDias} días · ahora ${esc(ultCint.abdomen)}cm` : 'faltan 2 medidas con 10+ días de diferencia')}
      ${mini('📐 Cintura / altura', whtrHtml, whtrSub || 'sin datos')}
      ${minisComp}
      ${mini('💪 Fuerza (Entrenos)', `<span style="color:${colFuerza};">${fuerzaTxt}</span>`, fuerzaEstado ? 'mismos criterios que la pestaña Entrenos' : 'aún sin sesiones registradas')}
    </div>
    ${ritmoTxt ? `<div style="font-size:13px;color:#ddd;margin-bottom:6px;">${ritmoTxt}</div>` : ''}
    ${cintAbsTxt ? `<div style="font-size:12px;color:#f59e0b;margin-bottom:6px;">${cintAbsTxt}</div>` : ''}
    ${avisos.map(x => `<div style="font-size:12px;color:#8a8a8a;margin-top:4px;">ℹ️ ${x}</div>`).join('')}
    ${hayComp ? '<div style="font-size:12px;color:#8fa3b8;margin-top:8px;">🔎 Alertas, riesgos y recomendaciones del check-in plus: abajo, en <b>▼ Ver evolución</b>.</div>' : ''}
    <div style="font-size:11px;color:#555;margin-top:10px;">📸 Las fotos siguen siendo la referencia visual: mismas luz, distancia y pose, cada 2-4 semanas. Esta lectura es orientativa y siempre de tendencia, nunca de un dato suelto.</div>
  `);
}
