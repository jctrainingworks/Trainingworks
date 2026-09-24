// Técnicas de alta intensidad y volumen equivalente. Lo comparten Rutinas, Volumen e Historial.
// Copiado tal cual del panel actual (prueba/index.html), solo con `export`.

export const TECNICAS_SERIE = {
  normal:      { label: 'Normal',              corto: '',    color: '#555',    fallo: false, onOff: false },
  rest_pause:  { label: 'Rest-Pause',          corto: 'RP',  color: '#ff9800', fallo: true,  onOff: false },
  micropausa:  { label: 'Micropausa',          corto: 'MP',  color: '#e8ff00', fallo: true,  onOff: false },
  drop_set:    { label: 'Drop Set',            corto: 'DS',  color: '#ff4444', fallo: true,  onOff: false },
  myo_reps:    { label: 'Myo-reps',            corto: 'MR',  color: '#ff66cc', fallo: true,  onOff: false },
  isometrico:  { label: 'Pausa en el fondo',   corto: 'ISO', color: '#00bcd4', fallo: false, onOff: true  },
  tempo_exc:   { label: 'Tempo excéntrico',    corto: 'TE',  color: '#8bc34a', fallo: false, onOff: true  }
};
// Técnicas que agrupan VARIOS ejercicios distintos como bloque (superserie/triserie)
export const TECNICAS_GRUPO = {
  superserie: { label: 'Superserie', corto: 'SS', color: '#1e90ff' },
  triserie:   { label: 'Triserie',   corto: 'TS', color: '#8b5cf6' }
};

export function parseTecnicaSerie(str) {
  const s = (str || 'normal').trim();
  if (!s || s === 'normal') return { tipo: 'normal', n: 0, pct: null };
  const partes = s.split(':').map(p => p.trim());
  const tipo = partes[0];
  if (!TECNICAS_SERIE[tipo]) return { tipo: 'normal', n: 0, pct: null };
  return {
    tipo,
    n: parseInt(partes[1]) || 0,
    pct: partes[2] ? (parseInt(partes[2]) || null) : null
  };
}

export function formatTecnicaSerie(s) {
  const tipo = s.tecnica || 'normal';
  if (tipo === 'normal') return 'normal';
  const cfg = TECNICAS_SERIE[tipo];
  if (cfg && cfg.onOff) return tipo;
  const n = parseInt(s.tecnicaN) || 0;
  if (!n) return 'normal';
  if (tipo === 'drop_set' && s.tecnicaPct) return `drop_set:${n}:${parseInt(s.tecnicaPct)}`;
  return `${tipo}:${n}`;
}

// Volumen equivalente de un ejercicio: cada serie normal cuenta 1, y cada serie donde se active
// CUALQUIER técnica de alta intensidad suma un fijo de +0.5, independientemente de las repeticiones
// extra que lleve dentro (así lo pidió Juan: 3 series normales + 1 con técnica = 3.5 series).
export function calcVolumenEquivalente(ex) {
  const tecArr = (ex.tecnica || '').split(',').map(s => s.trim()).filter(Boolean);
  const numS = parseInt(ex.series) || tecArr.length || 1;
  let total = 0;
  for (let i = 0; i < numS; i++) {
    total += 1;
    const t = parseTecnicaSerie(tecArr[i] || 'normal');
    if (t.tipo !== 'normal') total += 0.5;
  }
  return total;
}

export function parseGrupoTecnica(str) {
  const s = (str || '').trim();
  if (!s) return { tipo: '', codigo: '' };
  const [tipo, ...resto] = s.split(':');
  if (!TECNICAS_GRUPO[tipo]) return { tipo: '', codigo: '' };
  return { tipo, codigo: resto.join(':').trim() };
}

export function colorGrupoCodigo(codigo) {
  const colores = ['#1e90ff', '#8b5cf6', '#f59e0b', '#10b981', '#ec4899', '#06b6d4'];
  let h = 0;
  for (let i = 0; i < codigo.length; i++) h = (h * 31 + codigo.charCodeAt(i)) % colores.length;
  return colores[h];
}

