// ── Biblioteca de técnicas de intensificación (F1, solo lectura) ──
// Contenido de las fichas. Es SOLO información: no se usa en ningún cálculo de series ni de volumen,
// no toca ejercicios ni tablas. Se carga con <script src="tecnicas/catalogo.js"> (igual que
// alimentos/catalogo.js) y lo pinta tecnicas/biblioteca.js dentro de Recursos.
//
// Reglas de contenido (decididas por Juan, nov 2026):
//  · `refs` solo lleva referencias VERIFICADAS contra el artículo original. Mientras `refs` esté
//    vacío, la ficha muestra «pendiente de verificar». No se publican referencias sin verificar.
//  · `evidencia.estado: 'provisional'` = nivel y nota todavía por contrastar con los originales.
//  · Sin coeficientes ni equivalencias de series: el conteo de volumen vive aparte (F4).
//
// Campos de cada técnica:
//  nombre, corto, tipo ('serie' | 'grupo'), enSelector (true si YA existe en el selector actual
//  del modal de ejercicio), requiereAutorizacion (true = solo para clientes habilitados),
//  descripcion, pasos[], ejemplo, objetivo, util[], limites[], evidencia{nivel,estado,nota}, refs[].

const TECNICAS_BIBLIOTECA = {
  rest_pause: {
    nombre: 'Rest-Pause',
    corto: 'RP',
    tipo: 'serie',
    enSelector: true,
    requiereAutorizacion: false,
    descripcion: 'Serie llevada cerca del fallo técnico, seguida de pausas muy cortas con el mismo peso para sacar repeticiones extra.',
    pasos: [
      'Haz la serie con el peso de trabajo hasta cerca del fallo técnico.',
      'Descansa 10-20 segundos sin cambiar de posición, respirando.',
      'Haz las repeticiones que puedas con el mismo peso.',
      'Repite pausa y repeticiones extra tantas veces como indique la serie (normalmente 1-3).',
      'Al terminar, descanso normal antes de la siguiente serie.'
    ],
    ejemplo: 'Curl en polea: 10 repeticiones cerca del fallo → 15 s → 4 repeticiones → 15 s → 3 repeticiones. Después, descanso normal.',
    objetivo: 'Acumular repeticiones cerca del fallo en poco tiempo con una sola carga.',
    util: [
      'Ejercicios estables y de bajo coste articular (poleas, máquinas, aislamiento).',
      'Última serie de un ejercicio para terminar de exigir al músculo.',
      'Sesiones con poco tiempo.'
    ],
    limites: [
      'Genera mucha fatiga por serie: hay que vigilar la recuperación.',
      'Las repeticiones extra varían de un día a otro, así que cuesta comparar sesiones.',
      'No es buena idea en ejercicios muy técnicos o de alto coste articular.',
      'No conviene introducirla pronto en personas poco entrenadas.'
    ],
    evidencia: {
      nivel: 'Baja-moderada',
      estado: 'provisional',
      nota: 'Pocos estudios y de muestra pequeña. Con el volumen igualado, no muestran diferencias claras de hipertrofia frente a series tradicionales.'
    },
    refs: []
  },

  myo_reps: {
    nombre: 'Myo-Reps',
    corto: 'MR',
    tipo: 'serie',
    enSelector: true,
    requiereAutorizacion: false,
    descripcion: 'Una serie de activación cerca del fallo, seguida de mini-series cortas de pocas repeticiones con pausas muy breves.',
    pasos: [
      'Haz una serie de activación cerca del fallo técnico.',
      'Descansa 10-15 segundos.',
      'Haz una mini-serie de 3-5 repeticiones con el mismo peso.',
      'Repite pausa y mini-serie.',
      'Termina cuando ya no te salga el número de repeticiones de la mini-serie.'
    ],
    ejemplo: 'Extensión de tríceps en polea: 15 repeticiones cerca del fallo → 10 s → 4 repeticiones → 10 s → 4 repeticiones → 10 s → 3 repeticiones (ya no salen 4: se termina).',
    objetivo: 'Acumular repeticiones exigentes en poco tiempo tras una única serie de activación.',
    util: [
      'Ejercicios de aislamiento con carga fácil de controlar.',
      'Cuando hay poco tiempo y se quiere cerrar un músculo.'
    ],
    limites: [
      'Muy pocos estudios controlados y todavía sin replicar.',
      'Fatiga local alta; no abusar del número de ejercicios con esta técnica.',
      'Cuesta registrar y comparar las mini-series entre sesiones.'
    ],
    evidencia: {
      nivel: 'Muy baja (preliminar)',
      estado: 'provisional',
      nota: 'Muy pocos estudios controlados, de muestra pequeña y sin replicar.'
    },
    refs: []
  },

  drop_set: {
    nombre: 'Drop Sets (series descendentes)',
    corto: 'DS',
    tipo: 'serie',
    enSelector: true,
    requiereAutorizacion: false,
    descripcion: 'Al llegar al fallo técnico se reduce el peso al momento y se sigue hasta el fallo otra vez, sin descanso.',
    pasos: [
      'Haz la serie con el peso de trabajo hasta el fallo técnico.',
      'Baja el peso un 20-30 % sin descansar (o casi).',
      'Sigue hasta el fallo técnico con el peso nuevo.',
      'Repite las bajadas que indique la serie (normalmente 1-3).',
      'Al terminar, descanso normal.'
    ],
    ejemplo: 'Elevación lateral con mancuernas: 8 kg × 12 hasta el fallo → 6 kg × 8 → 4,5 kg × 6, sin descanso entre cambios.',
    objetivo: 'Seguir trabajando el músculo cerca del fallo cuando el peso inicial ya no se puede mover.',
    util: [
      'Máquinas con pila de placas y poleas, o mancuernas fáciles de cambiar.',
      'Última serie de un ejercicio de aislamiento.',
      'Sesiones con poco tiempo.'
    ],
    limites: [
      'Necesita material que permita cambiar el peso rápido.',
      'Fatiga alta y difícil de comparar entre sesiones.',
      'No recomendable en ejercicios pesados o de alto coste articular.'
    ],
    evidencia: {
      nivel: 'Moderada',
      estado: 'provisional',
      nota: 'Es la técnica más estudiada de la lista. Con el volumen o el esfuerzo igualados, los resultados son similares a los de series tradicionales; su ventaja principal es el tiempo.'
    },
    refs: []
  },

  cluster_set: {
    nombre: 'Cluster Sets',
    corto: 'CL',
    tipo: 'serie',
    enSelector: false,
    requiereAutorizacion: false,
    descripcion: 'Una serie dividida en bloques de pocas repeticiones con pausas muy cortas dentro de la propia serie (pausas intra-serie), distintas del descanso entre series.',
    pasos: [
      'Elige un peso con el que puedas completar todos los bloques con buena técnica.',
      'Haz el primer bloque de repeticiones.',
      'Haz una pausa corta (15-45 segundos) sin soltar el ejercicio.',
      'Haz el siguiente bloque, y así hasta completar todos.',
      'Cuando termina la serie completa, descansa lo habitual entre series.'
    ],
    ejemplo: 'Press en máquina: 3 bloques de 4 repeticiones con 20 s de pausa entre bloques (una serie de 12 repeticiones). Después, 3 minutos de descanso hasta la serie siguiente.',
    objetivo: 'Mantener la calidad de las repeticiones y la carga a lo largo de la serie.',
    util: [
      'Cuando importa mantener velocidad y técnica en cada repetición.',
      'Ejercicios con cargas altas donde cuesta aguantar la serie continua.'
    ],
    limites: [
      'Alarga la serie y complica el cronometraje.',
      'Hay que distinguir bien la pausa dentro de la serie del descanso entre series.',
      'Para hipertrofia no ha mostrado una ventaja clara frente a series tradicionales.'
    ],
    evidencia: {
      nivel: 'Moderada para fuerza y potencia; baja para hipertrofia',
      estado: 'provisional',
      nota: 'Hay revisiones y metaanálisis sobre sus efectos agudos y crónicos. En hipertrofia no se ha visto una ventaja clara.'
    },
    refs: []
  },

  metodo_37: {
    nombre: 'Método 3/7',
    corto: '3/7',
    tipo: 'serie',
    enSelector: false,
    requiereAutorizacion: false,
    descripcion: 'Bloque de 5 mini-series con repeticiones crecientes (3, 4, 5, 6 y 7) y solo 15 segundos de pausa entre ellas, con una carga de en torno al 70 % del 1RM.',
    pasos: [
      'Elige un peso de en torno al 70 % del 1RM.',
      'Haz 3 repeticiones y descansa 15 segundos.',
      'Haz 4 repeticiones y descansa 15 segundos.',
      'Haz 5, luego 6 y por último 7 repeticiones, con 15 segundos de pausa entre ellas.',
      'Eso es un bloque. En el protocolo publicado se repite un segundo bloque tras 150 segundos de descanso.'
    ],
    ejemplo: 'Curl en polea: bloque 1 → 3-4-5-6-7 repeticiones con 15 s entre mini-series → 150 s de descanso → bloque 2 igual (unas 50 repeticiones en total).',
    objetivo: 'Acumular mucho trabajo con carga moderada y poco descanso en pocos minutos.',
    util: [
      'Ejercicios de un solo músculo con carga fácil de controlar.',
      'Para variar el estímulo durante un bloque de entrenamiento.'
    ],
    limites: [
      'La evidencia es de un estudio con personas sin entrenamiento previo y un solo ejercicio de codo.',
      'Fatiga alta y poco margen para ajustar sobre la marcha.',
      'No hay datos en personas entrenadas.'
    ],
    evidencia: {
      nivel: 'Baja',
      estado: 'verificada con el estudio original',
      nota: 'En el estudio original, 43 personas sin entrenamiento de fuerza previo entrenaron flexión de codo 2 veces por semana durante 12 semanas. El 3/7 mejoró más que 8×6 en fuerza (1RM) y en grosor del bíceps con volumen similar. Muestra pequeña, un solo ejercicio y sin metaanálisis.'
    },
    refs: [
      {
        cita: 'Stragier S, Baudry S, Carpentier A, Duchateau J. Efficacy of a new strength training design: the 3/7 method. Eur J Appl Physiol. 2019;119(5):1093-1104.',
        doi: '10.1007/s00421-019-04099-5',
        verificada: 'Texto completo leído (nov 2026)'
      }
    ]
  },

  superserie: {
    nombre: 'Superseries',
    corto: 'SS',
    tipo: 'grupo',
    enSelector: true,
    requiereAutorizacion: false,
    descripcion: 'Dos ejercicios seguidos, sin descanso entre ellos. El descanso se hace al terminar el segundo.',
    pasos: [
      'Haz las repeticiones del primer ejercicio.',
      'Pasa al segundo ejercicio sin descansar (solo el tiempo de moverte).',
      'Descansa lo que indique la rutina al terminar el segundo.',
      'Repite el par las veces indicadas.'
    ],
    ejemplo: 'Curl de bíceps 10-12 repeticiones → extensión de tríceps en polea 10-12 repeticiones → 90 segundos de descanso. Repetir 3 veces.',
    objetivo: 'Ahorrar tiempo manteniendo el trabajo programado.',
    util: [
      'Músculos antagonistas (bíceps-tríceps, pecho-espalda).',
      'Sesiones con poco tiempo.',
      'Ejercicios de aislamiento con material cercano.'
    ],
    limites: [
      'Más fatiga percibida durante la sesión.',
      'Necesita dos estaciones libres a la vez.',
      'Con ejercicios del mismo músculo, el segundo suele rendir menos.'
    ],
    evidencia: {
      nivel: 'Moderada-alta (para eficiencia de tiempo)',
      estado: 'provisional',
      nota: 'Un metaanálisis reciente apunta a menos tiempo de sesión sin pérdida de adaptaciones, con más esfuerzo percibido.'
    },
    refs: []
  },

  triserie: {
    nombre: 'Triseries',
    corto: 'TS',
    tipo: 'grupo',
    enSelector: true,
    requiereAutorizacion: false,
    descripcion: 'Tres ejercicios seguidos, sin descanso entre ellos. El descanso se hace al terminar el tercero.',
    pasos: [
      'Haz las repeticiones del primer ejercicio.',
      'Pasa al segundo sin descansar, y luego al tercero.',
      'Descansa lo que indique la rutina al terminar el tercero.',
      'Repite el trío las veces indicadas.'
    ],
    ejemplo: 'Elevación lateral → pájaro en máquina → press de hombro con mancuernas, 10-12 repeticiones cada uno, sin pausa. Después, 2 minutos de descanso. Repetir 3 veces.',
    objetivo: 'Concentrar el trabajo de un grupo muscular en poco tiempo.',
    util: [
      'Series de aislamiento sobre el mismo grupo muscular o grupos compatibles.',
      'Sesiones con poco tiempo.'
    ],
    limites: [
      'Fatiga alta y rendimiento decreciente en el tercer ejercicio.',
      'Necesita tres estaciones libres.',
      'Cuesta mantener la carga entre vueltas.'
    ],
    evidencia: {
      nivel: 'Sin evidencia directa localizada',
      estado: 'provisional',
      nota: 'No se han localizado estudios específicos de triseries; lo que se sabe se extrapola de las superseries.'
    },
    refs: []
  },

  drop_mecanico: {
    nombre: 'Series descendentes mecánicas',
    corto: 'DM',
    tipo: 'serie',
    enSelector: false,
    requiereAutorizacion: false,
    descripcion: 'En lugar de bajar el peso, al llegar al fallo se pasa sin descanso a una variante del ejercicio más fácil mecánicamente, con la misma carga.',
    pasos: [
      'Haz el ejercicio más difícil hasta el fallo técnico.',
      'Cambia sin descansar a la variante más fácil, con el mismo peso.',
      'Haz repeticiones hasta el fallo técnico.',
      'Si el plan lo indica, pasa a una tercera variante aún más fácil.',
      'Al terminar, descanso normal.'
    ],
    ejemplo: 'Press inclinado con mancuernas hasta el fallo → sin descanso press plano con las mismas mancuernas → sin descanso flexiones.',
    objetivo: 'Seguir trabajando el mismo músculo tras el fallo sin cambiar de material.',
    util: [
      'Cuando no se puede cambiar el peso rápido.',
      'Ejercicios con variantes claras (inclinaciones, agarres, posiciones).'
    ],
    limites: [
      'Requiere elegir bien las variantes y su orden.',
      'Fatiga alta y difícil de estandarizar.',
      'No hay estudios directos que la respalden.'
    ],
    evidencia: {
      nivel: 'Sin evidencia directa localizada',
      estado: 'provisional',
      nota: 'No se han localizado estudios directos de esta técnica. Se apoya en la lógica de las series descendentes convencionales.'
    },
    refs: []
  },

  bfr: {
    nombre: 'BFR (restricción del flujo sanguíneo)',
    corto: 'BFR',
    tipo: 'serie',
    enSelector: false,
    requiereAutorizacion: true,
    descripcion: 'Entrenamiento con cargas bajas usando un manguito o banda en la parte alta del brazo o de la pierna que restringe parcialmente el retorno venoso.',
    pasos: [
      'Comprueba que el cliente está habilitado expresamente por el entrenador y que no tiene contraindicaciones.',
      'Coloca el manguito en la parte proximal del miembro, con el material y el protocolo previstos.',
      'Haz las series con carga baja y muchas repeticiones, con pausas cortas.',
      'Retira el manguito al terminar la última serie.'
    ],
    ejemplo: 'Esquema de referencia en estudios: carga baja (20-30 % del 1RM) con 30-15-15-15 repeticiones. Es una referencia, no una prescripción: la presión y el protocolo no se indican aquí.',
    objetivo: 'Estimular el músculo con cargas bajas cuando no se pueden o no se quieren usar cargas altas.',
    util: [
      'Personas que no toleran cargas altas.',
      'Complemento de volumen en un músculo concreto.'
    ],
    limites: [
      'Requiere material y protocolo específicos.',
      'Tiene contraindicaciones clínicas: solo con habilitación expresa del entrenador y con supervisión.',
      'Resulta incómoda y el esfuerzo percibido es alto.',
      'Para ganar fuerza máxima, las cargas altas siguen siendo mejores.'
    ],
    evidencia: {
      nivel: 'Moderada-alta, con matices',
      estado: 'provisional',
      nota: 'Con carga baja, BFR mejora frente a la misma carga sin restricción. Frente a carga alta, los metaanálisis no coinciden del todo en hipertrofia; en fuerza máxima gana la carga alta.'
    },
    refs: []
  },

  micropausa: {
    nombre: 'Micropausa',
    corto: 'MP',
    tipo: 'serie',
    enSelector: true,
    requiereAutorizacion: false,
    descripcion: 'Variante del rest-pause con una pausa todavía más corta (menos de 7 segundos) antes de seguir con repeticiones extra.',
    pasos: [
      'Haz la serie con el peso de trabajo hasta cerca del fallo técnico.',
      'Descansa menos de 7 segundos, sin cambiar de posición.',
      'Haz las repeticiones que puedas con el mismo peso.',
      'Repite pausa y repeticiones extra tantas veces como indique la serie.',
      'Al terminar, descanso normal antes de la siguiente serie.'
    ],
    ejemplo: 'Press en máquina: 8 repeticiones cerca del fallo → 5 s → 2 repeticiones → 5 s → 2 repeticiones. Después, descanso normal.',
    objetivo: 'Sacar repeticiones extra tras el fallo con una pausa mínima.',
    util: [
      'Ejercicios estables y de bajo coste articular.',
      'Cierre de un ejercicio cuando se quiere exigir algo más sin cambiar el peso.'
    ],
    limites: [
      'Fatiga alta por serie.',
      'La pausa es tan corta que cuesta cronometrarla bien.',
      'No conviene en ejercicios técnicos o de alto coste articular.'
    ],
    evidencia: {
      nivel: 'Pendiente de revisar',
      estado: 'provisional',
      nota: 'Todavía no he revisado la evidencia de esta técnica por separado. Es una variante del rest-pause y se completará antes de dar la ficha por cerrada.'
    },
    refs: []
  },

  isometrico: {
    nombre: 'Pausa en el fondo (isométrico)',
    corto: 'ISO',
    tipo: 'serie',
    enSelector: true,
    requiereAutorizacion: false,
    descripcion: 'Se aguanta 2-3 segundos en el punto de máximo estiramiento o tensión antes de completar la repetición. No es una técnica de fallo: es una forma de ejecutar.',
    pasos: [
      'Baja el peso de forma controlada hasta el punto de máximo estiramiento o tensión.',
      'Aguanta 2-3 segundos en esa posición, sin rebotar.',
      'Sube de forma controlada.',
      'Repite en cada repetición de la serie.'
    ],
    ejemplo: 'Press de pecho con mancuernas: baja, aguanta 2 segundos abajo con el pecho estirado y sube. Todas las repeticiones de la serie igual.',
    objetivo: 'Quitar el rebote y mantener la tensión en la posición más exigente del recorrido.',
    util: [
      'Ejercicios en los que el rebote le quita trabajo al músculo.',
      'Para aprender a controlar la posición de estiramiento.'
    ],
    limites: [
      'Obliga a bajar el peso respecto a la serie sin pausa.',
      'Si no hay control, la pausa se convierte en descanso.',
      'Cuesta cronometrar los segundos sin ayuda.'
    ],
    evidencia: {
      nivel: 'Pendiente de revisar',
      estado: 'provisional',
      nota: 'Todavía no he revisado la evidencia de esta técnica. Se completará antes de dar la ficha por cerrada.'
    },
    refs: []
  },

  tempo_exc: {
    nombre: 'Tempo excéntrico',
    corto: 'TE',
    tipo: 'serie',
    enSelector: true,
    requiereAutorizacion: false,
    descripcion: 'Bajada controlada y lenta, de 3-4 segundos, en la fase excéntrica de cada repetición. No es una técnica de fallo: es una forma de ejecutar.',
    pasos: [
      'Sube el peso de forma normal.',
      'Baja contando 3-4 segundos, siempre controlando el peso.',
      'Repite en cada repetición de la serie.'
    ],
    ejemplo: 'Curl femoral: sube en 1 segundo y baja contando 3-4 segundos. Todas las repeticiones de la serie igual.',
    objetivo: 'Controlar la fase de bajada y mantener la tensión durante todo el recorrido.',
    util: [
      'Ejercicios en los que se tiende a dejar caer el peso.',
      'Para aprender a controlar el recorrido completo.'
    ],
    limites: [
      'Obliga a bajar el peso respecto a la serie con tempo libre.',
      'Alarga la serie y la sesión.',
      'Cuesta cronometrar la bajada sin ayuda.'
    ],
    evidencia: {
      nivel: 'Pendiente de revisar',
      estado: 'provisional',
      nota: 'Todavía no he revisado la evidencia de esta técnica. Se completará antes de dar la ficha por cerrada.'
    },
    refs: []
  }
};

// Orden de aparición en la biblioteca: primero las nueve de la petición de Juan,
// después las que ya existían en el selector y no estaban en esa lista.
const TECNICAS_ORDEN = [
  'rest_pause', 'myo_reps', 'drop_set', 'cluster_set', 'metodo_37',
  'superserie', 'triserie', 'drop_mecanico', 'bfr',
  'micropausa', 'isometrico', 'tempo_exc'
];
