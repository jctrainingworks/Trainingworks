// Composición corporal, riesgos e índices de rendimiento (Navy + fórmula propia, WHtR/WHR, IQF/IRR/IRE/IPO).
// Copiado tal cual de prueba/index.html (líneas 4791-4921). Lo usan Cuerpo y, más adelante, Nutrición.

export const rnd = (n,d=1) => Math.round(n*10**d)/10**d;
export const clamp = (n,a,b) => Math.min(Math.max(n,a),b);
export const DOT = { verde:'nrdk-g', amarillo:'nrdk-y', naranja:'nrdk-o', rojo:'nrdk-r' };
/* ═══ % GRASO ═══ */
export const calcNavy = d => {
  if(d.sexo==='hombre'){
    const diff=d.abdomen-d.cuello; if(diff<=0) return null;
    const den=1.0324-0.19077*Math.log10(diff)+0.15456*Math.log10(d.altura);
    return rnd((4.95/den-4.5)*100);
  } else {
    const sum=d.abdomen+d.cadera-d.cuello; if(sum<=0) return null;
    const den=1.29579-0.35004*Math.log10(sum)+0.22100*Math.log10(d.altura);
    return rnd((4.95/den-4.5)*100);
  }
};
export const calcCustom = d => {
  const ac = d.activo4h === 'si'; let bf;
  if(d.sexo==='hombre'){
    bf=d.edad<=26 ? d.brazo*1.45+d.abdomen*0.51-d.antebrazo*2.13-(ac?14.2:10.2)
                  : d.cadera*0.41+d.abdomen*0.35-d.antebrazo*1.18-(ac?19:15);
  } else {
    bf=d.edad<=26 ? d.abdomen*0.53+d.muslo*0.82-d.antebrazo*1.7-(ac?22.6:19.6)
                  : d.abdomen*0.47+d.muslo*0.49-d.pantorrilla*0.57-(ac?21.4:18.4);
  }
  return rnd(bf);
};
// ACSM 2023 — clasificación %G por sexo y edad
export const calcBFCat = (pct, sexo, edad) => {
  const e = parseFloat(edad) || 30;
  if (sexo === 'hombre') {
    const r = e < 40 ? [8,20,25] : e < 60 ? [11,22,28] : [13,25,30];
    return pct < r[0] ? 'Bajo en grasa' : pct < r[1] ? '✅ Saludable' : pct < r[2] ? '⚠️ Sobrepeso' : '🔴 Obesidad';
  } else {
    const r = e < 40 ? [16,28,39] : e < 60 ? [18,30,40] : [20,32,42];
    return pct < r[0] ? 'Bajo en grasa' : pct < r[1] ? '✅ Saludable' : pct < r[2] ? '⚠️ Sobrepeso' : '🔴 Obesidad';
  }
};
export const calcBF = d => {const navy=calcNavy(d),custom=calcCustom(d);return{navy,custom,media:navy!==null?rnd((navy+custom)/2):custom};};

// Clasificación de nivel del atleta según años de entrenamiento serio (skill programacion-entrenamiento)

export const calcComp = (p,h,bf) => {
  const m=h/100,mg=rnd(p*bf/100),mm=rnd(p-mg),imc=rnd(p/m**2),ffmi=rnd(mm/m**2);
  return{masaGrasa:mg,masaMagra:mm,imc,imcCat:imc<18.5?'Bajo peso':imc<25?'Normal':imc<30?'Sobrepeso':'Obesidad',
    ffmi,ffmiCat:ffmi<17?'Masa baja':ffmi<18?'Básico':ffmi<20?'Intermedio':ffmi<22?'Buen nivel':ffmi<24?'Alto nivel':'Élite'};
};

/* ═══ SALUD ═══ */
export const calcWHtR=(c,h)=>{const v=rnd(c/h,2);return{v,nivel:v<0.4?'amarillo':v<0.5?'verde':v<0.6?'amarillo':v<0.7?'naranja':'rojo',desc:v<0.4?'Posible bajo peso':v<0.5?'Saludable':v<0.6?'Moderado — vigilar':v<0.7?'Riesgo CV elevado':'Riesgo CV muy alto'};};
export const calcWHR=(c,ca,s)=>{const v=rnd(c/ca,2),ok=s==='hombre'?v<0.9:v<0.8,med=s==='hombre'?v<1:v<0.85;return{v,nivel:ok?'verde':med?'amarillo':'rojo',desc:ok?'Bajo riesgo':med?'Riesgo moderado':'Riesgo alto'};};
export const calcRCV=(c,s)=>{const[u1,u2]=s==='hombre'?[94,102]:[80,88];return c<=u1?{nivel:'verde',desc:'Sin riesgo abdominal'}:c<=u2?{nivel:'amarillo',desc:`Elevado (>${u1}cm)`}:{nivel:'rojo',desc:`Muy elevado (>${u2}cm)`};};
export const calcRH=(bf,s)=>s==='hombre'?(bf<8?{nivel:'naranja',desc:'Riesgo supresión T'}:bf<=20?{nivel:'verde',desc:'Sin riesgo hormonal'}:bf<=25?{nivel:'amarillo',desc:'Inicio aromatización T→E'}:{nivel:'rojo',desc:'Aromatización significativa'}):(bf<15?{nivel:'rojo',desc:'Riesgo amenorrea'}:bf<=25?{nivel:'verde',desc:'Sin riesgo hormonal'}:bf<=32?{nivel:'amarillo',desc:'Vigilar estrógeno-dominancia'}:{nivel:'rojo',desc:'Riesgo hormonal elevado'});
export const calcRI=(c,bf,s)=>{const aC=s==='hombre'?94:80,aB=s==='hombre'?20:28;return c>aC+8&&bf>aB?{nivel:'rojo',desc:'Riesgo alto insulínico'}:(c>aC||bf>aB)?{nivel:'amarillo',desc:'Riesgo moderado'}:{nivel:'verde',desc:'Sin indicadores insulínicos'};};
export const calcRS=(ff,e,s)=>{const[u1,u2]=s==='hombre'?[17,18.5]:[14,15.5];return ff<u1?{nivel:'rojo',desc:'FFMI crítico — umbral sarcopenia'}:ff<u2?{nivel:e>40?'naranja':'amarillo',desc:'FFMI bajo-moderado'}:{nivel:'verde',desc:'Masa muscular OK'};};

/* ═══ RENDIMIENTO ═══ */
export const calcIQF=(ff,bf,s,act)=>{
  const fl=s==='hombre'?[17,18,19,20,21,22,24]:[14,15,16,17,18,19,21],fp=[5,12,20,27,32,36,39,40];
  let pF=fp[fp.length-1];for(let i=0;i<fl.length;i++){if(ff<fl[i]){pF=fp[i];break;}}
  const pB=s==='hombre'?(bf<6?18:bf<10?35:bf<15?40:bf<20?33:bf<25?22:bf<30?12:4):(bf<14?18:bf<20?40:bf<25?35:bf<30?25:bf<35?14:4);
  const isAct=act!=='sedentario';
  const total=clamp(pF+pB+(isAct?20:10),0,100);
  return{valor:total,label:total>=85?'Nivel élite':total>=70?'Buen nivel — margen estético':total>=55?'Nivel intermedio':total>=40?'Nivel básico':'Nivel bajo'};
};
export const calcIRR=(e,bf,s,act,an)=>{
  const ep=[[25,30],[30,27],[35,23],[40,19],[45,15],[50,11]];let pE=7;
  for(const[l,p]of ep){if(e<l){pE=p;break;}}
  const aN=parseInt(an)||0,isAct=act!=='sedentario',isHigh=act==='activo'||act==='muy_activo';
  const pC=isHigh&&aN>=3?27:isAct?18:22;
  const[mn,mx]=s==='hombre'?[10,18]:[16,24],pB=bf>=mn&&bf<=mx?20:bf<mn?13:bf<=mx+6?14:7;
  const ap=[[1,4],[2,8],[3,12],[5,16]];let pA=20;for(const[l,p]of ap){if(aN<l){pA=p;break;}}
  const total=clamp(pE+pC+pB+pA,0,100);
  return{valor:total,label:total>=80?'Recuperación óptima':total>=65?'Recuperación buena':total>=50?'Recuperación normal':total>=35?'Recuperación limitada':'Comprometida'};
};
export const calcIRE=(ff,s,an)=>{
  const aN=parseInt(an)||0,base=s==='hombre'?17:14,ex=[0,2.5,4.0,5.0,5.5],idx=Math.min(aN>=5?4:aN,4),diff=ff-(base+ex[idx]);
  return diff>1.5?{cat:'RESPONDEDOR ALTO',sub:'Genética favorable',color:'var(--green)'}:diff>=-0.5?{cat:'RESPONDEDOR MEDIO',sub:'Respuesta típica',color:'var(--yellow)'}:{cat:'RESPONDEDOR BAJO',sub:'Ajustar método/volumen',color:'var(--warn)'};
};
export const calcIPO=(bf,ff,s)=>{
  const aB=s==='hombre'?bf>20:bf>28,bB=s==='hombre'?bf<12:bf<18,aF=s==='hombre'?ff>=20:ff>=17,bF=s==='hombre'?ff<18:ff<15;
  if(aB&&aF) return{prioridad:'RECOMPOSICIÓN',objetivo:'recomp',color:'#b06bff',desc:'Buena base muscular, grasa por encima del óptimo. Recomposición: calorías de mantenimiento, proteína alta, entrenamiento de fuerza.'};
  if(aB&&bF) return{prioridad:'CORTE PRIORITARIO',objetivo:'corte',color:'var(--warn)',desc:'Alto %G y poca masa muscular. Reduce grasa primero con déficit moderado antes de cualquier fase de volumen.'};
  if(bB&&bF) return{prioridad:'VOLUMEN PRIORITARIO',objetivo:'volumen',color:'var(--green)',desc:'Bajo %G y baja masa muscular. Momento ideal para volumen limpio y construcción muscular progresiva.'};
  if(bB&&aF) return{prioridad:'MANTENIMIENTO / PEAK',objetivo:'mantenimiento',color:'var(--blue)',desc:'Composición excelente. Mantener con foco en rendimiento y optimización metabólica.'};
  return{prioridad:'RECOMPOSICIÓN',objetivo:'recomp',color:'#b06bff',desc:'Situación intermedia. Recomposición corporal como estrategia más equilibrada.'};
};
