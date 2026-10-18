# Reglas de Nutrición · JC Training Works

**Decididas por Juan el 15-oct-2026. Mandan sobre cualquier otro documento y sobre el código actual.**
Si algo de `prueba/INDEX.md`, `nuevo/nutricion/nutricionv2.md` o del código contradice esta hoja, manda esta hoja.
Ninguna IA cambia estas reglas por su cuenta. Si algo no está aquí, se pregunta a Juan; no se inventa.

## Cambio del 18-oct-2026 (manda sobre lo que diga el resto de esta hoja)

Decidido por Juan, con OK explícito para tocar el motor de **prueba/index.html** y **app/index.html**:

- **Ya no manda el total del día.** Se vuelve a los **porcentajes por comida** (tarjeta «Reparto de macros por comida»):
  cada comida se calcula contra SU objetivo (su % del día) y la app reescala las cantidades de los bloques y alimentos
  escogidos contra ese objetivo. No se reparte lo que sobra o falta entre las demás comidas (se quitó el ±15 %).
- **Fruta y «para acompañar» son opcionales.** Por defecto salen «Sin fruta» / «Nada para acompañar». Si Juan los activa en el
  panel, el cliente puede elegirlos y, al elegirlos, **descuentan sus macros** (carbohidratos, proteína y grasa) del resto de
  la comida. La app ya no los recorta por su cuenta cuando la comida se pasa.
- **El hidrato va por delante de fruta y acompañante.** Se calcula primero con su objetivo; fruta y acompañante solo acompañan si
  el cliente los elige y le quitan «un pelín»: entre los dos pueden quitarle como mucho el **30 %** de los carbohidratos de la
  comida (valor provisional, un solo número: `NV4_EXTRAS_MAX_PCT_CARBO` en la app y `NUTRI_EXTRAS_MAX_PCT_CARBO_V4` en el panel).
  Si piden más, sus carbos guía se reducen en proporción. Nunca dejan el bloque de hidrato vacío por culpa de ellos.
- El resto de reglas de esta hoja se respeta.

Esto sustituye a las secciones 1 y 2 (total del día / sin porcentajes) y a la parte de fruta y acompañante que reescalan.
El probador sigue con su margen (±10 % por macro) pero ahora suma comida a comida, sin compensación entre comidas.

## Por qué existe esta hoja

El módulo de nutrición ha pasado por v2, v3 y v4 a base de parches, con el mismo cálculo copiado en dos sitios
(`nv2` en el panel y `nv4` en la app) y tocado por sesiones distintas. El 15-oct los cambios seguidos empeoraron
cosas con los mismos alimentos y el panel se quedó con bloques vacíos y mensajes sin salida. Esta hoja fija las
reglas una vez, en cristiano, para dejar de parchear.

## 0. Reglas de trabajo para toda IA

1. **Leer esta hoja antes de tocar nada de nutrición** (panel, app, catálogo o pruebas).
2. **El motor de cálculo está congelado.** No se cambia ni se "arregla" sin OK explícito de Juan. Si algo falla, se
   describe qué falla y se pregunta; no se parchea.
3. **Un solo motor para panel y app**: un único archivo, `test/nutricion/motor-nutricion.js` mientras se prueba (el sitio
   definitivo se decide con Juan al aprobarlo; no se crean más carpetas sin avisarle). Lo cargan `prueba/`, `app/` y, más adelante, el panel nuevo. Mientras no exista,
   está prohibido tocar solo una de las dos copias que hay hoy dentro de `prueba/index.html` y `app/index.html`.
3b. **Alcance: solo el código de nutrición.** No se toca nada más de `prueba/` ni de `app/`: ni rutinas ni progresos
   de entreno, ni check-ins, ni avisos, ni diseño, ni sus conexiones. Lo que Juan usa hoy con su cliente no se
   rompe. Antes de cada subida se comprueba que lo que no es nutrición queda byte a byte igual.
3c. **No se borran archivos ni se quitan `prueba/` o `app/`.** Dentro de ellos, el código de nutrición viejo se
   sustituye por el motor compartido cuando Juan lo apruebe; el resto queda como está.
4. **Nada de versiones nuevas** (v5...). El motor se sustituye de una vez según estas reglas y se documenta aquí.
5. **No se sube nada sin pruebas automáticas en verde**: clientes pequeños y grandes, comidas de distinto tamaño,
   y comprobar que panel y app dan el mismo resultado con el mismo plan.
6. **Nunca** un bloque vacío sin salida ni un mensaje que no diga qué falla y qué hacer.
7. No se cambian topes, mínimos ni márgenes sin Juan.

### Cuándo se da por bueno (decidido 15-oct-2026)

- El motor actual **no funciona** (por eso Juan aún no ha pautado nutrición a su cliente). El nuevo se deja **fino
  fino** antes de conectarlo a nada.
- **Sin prisa por fechas de clientes.** Un motor a medias en un cliente real es peor que un cliente esperando.
- No se conecta a la app ni a `prueba/` hasta que pase las pruebas automáticas **y** Juan lo apruebe tras probarlo él.
- **Listón de las pruebas (aprobado por Juan el 15-oct-2026):**
  1. Seis clientes de ejemplo (de ≈1600 a ≈3300 kcal, con 3, 4 y 5 comidas), cada uno con los 8 alimentos por bloque por defecto.
     (16-oct-2026: además, con **los alimentos que Juan elige de verdad** —objetivo real y datos reales del Gestor, vía
     `test/nutricion/plan-juan.json`— se espera el **100 %** de los días. Si algún día falla, el informe dice qué comida,
     qué alimento está en su tope y qué hacer; un fallo nunca se esconde.)
  2. Miles de días al azar en los que el "cliente" elige alimentos al azar: cada macro dentro de **±10 %** del total
     diario en **al menos el 99 %** de los días. Lo que falle sale marcado en el informe, no escondido.
  3. Nunca una cantidad por debajo del mínimo ni por encima del tope.
  4. Casos especiales: bloques de 2 alimentos (lentejas, claras + huevos), fruta y acompañar que reescalan, alimentos de «acompañar» usados como proteína o grasa, comidas en modo fijo o libre.
  5. Si el día no llega, mensaje claro con qué falla y qué hacer; nunca un bloque vacío.

## 1. Qué manda: el total del día

- Lo que manda es el **total diario de cada macro**. No importa cuánto se pase o se quede corta una comida:
  100 g de hidratos en una y 30 en otra está bien si el día cuadra.
- Prioridad: **macros**. Las kcal son secundarias: si los macros cuadran dentro del margen, vale.

## 2. Objetivo por comida (sin porcentajes)

- **No hay porcentajes por comida.**
- Para cada macro y cada comida, Juan elige uno de tres modos:
  - **Partes iguales**: el total del día se divide entre las comidas (3 comidas y 180 g de proteína → 60 g cada una).
  - **Fijo**: Juan escribe los gramos de esa comida.
  - **Libre** (en blanco): el motor decide. Las comidas libres se reparten lo que quede del total.
- Los modos se pueden mezclar (por ejemplo, repartir solo la proteína y dejar el resto libre).
- Si lo fijado no suma o pasa del total del día, el panel avisa.
- El objetivo por comida es solo una **guía** del tamaño de cada comida; el total del día es el que se cumple.

## 3. Alimentos y elección del cliente

- Juan marca **hasta 8 alimentos por bloque** (carbohidrato, proteína, grasa, fruta y para acompañar) **y por comida**.
- El cliente puede elegir **cualquiera de esos 8** ese día y en esa comida. **Ninguno se oculta.**
- Un bloque puede llevar **2 alimentos** (arroz + lentejas; tortita de claras + huevos). El reparto por defecto
  es 50/50 y lo puede cambiar el cliente. Un alimento mixto (lentejas) cuenta en carbohidrato **y** en proteína.
- **Las cantidades se recalculan solas** para llegar al objetivo del día. El cliente elige alimentos, no gramos.
- Se mantiene: unidades enteras para alimentos por unidad (huevo, plátano...) y redondeo de gramos a 5 g.

### Fruta y "para acompañar" (cambiado el 16-oct-2026; sustituye a la «porción fija» del 15-oct)

- Siguen siendo un **bloque opcional** por comida (Juan lo activa o no; el cliente puede elegir «sin fruta» / «sin acompañante»).
- **Todo reescala, sin excepciones: ya NO hay porción fija.** Fruta y «para acompañar» se calculan como un bloque más:
  cada alimento aporta los tres macros, el motor ajusta su cantidad para que el día cuadre y respeta el **tope duro**
  y el **mínimo** de siempre (1 unidad / un tercio del tope). Si pidiera menos del mínimo, no entra en esa comida.
- Los **carbohidratos que Juan fija** para la fruta y para el acompañante son una **guía suave de tamaño** (el bloque
  tiende a quedarse cerca, pero puede subir o bajar si el día lo pide); no son una cantidad fija. Si el acompañante
  aporta sobre todo proteína o grasa (mayonesa, aceitunas, queso...), su guía es su cantidad mínima.
- **Cualquier alimento del catálogo puede ir en cualquier bloque si aporta ese macro.** En concreto, los que antes solo
  iban «para acompañar» (leche, yogur natural, crema de cacahuete, queso en lonchas) también pueden ser el alimento de
  un bloque de proteína o de grasa.
- Se acabó la porción fija del Gestor: **no hace falta ninguna columna nueva en Supabase** para esto.

### Exclusiones del cliente: alergias y "no quiere" (decidido 15-oct-2026)

- El alimento excluido **sale de los 8** de ese cliente y **no se sustituye solo**.
- Si un bloque se queda corto, **el panel avisa** (qué comida, qué bloque y cuántos alimentos quedan). Lo decide Juan.
- El **probador** vuelve a comprobar que el día sigue llegando sin ese alimento.

## 4. Topes y mínimos

- **Tope duro** por alimento y comida (ración máxima del Gestor). Nunca se supera ("no 10 vasos de leche").
- **Mínimo** por alimento: nunca menos de **1 unidad** ni de **un tercio de su tope**. Si el motor pidiera menos,
  ese alimento no entra en esa comida y los demás compensan. No salen cantidades irrisorias (5 g de avena).
- Si **aun así el día no llega**, no se fuerza nada: el probador lo dice claro y con números ("este cliente necesita
  más comidas o más ración").

## 5. Probador de combinaciones

- Se pasa **antes de generar el plan**, con los alimentos que Juan ha marcado. Simula al cliente en la app
  eligiendo cualquier combinación y comprueba que el día queda dentro del objetivo.
- **Margen por defecto: ±10 % por macro**, ajustable por macro. Ejemplo: 180 g de proteína → entre 162 y 198 g vale.
- Método: los casos extremos (peor y mejor combinación) más miles de días al azar. No hace falta probar todas.
- Si algo falla, el mensaje dice **qué bloque, cuánto falta y qué hacer**.

## 6. Prohibido

- Bloques vacíos sin salida; mensajes vagos ("ninguna combinación cabe").
- Dos copias del cálculo (panel y app) que puedan divergir.
- Parches puntuales sobre el motor; versiones paralelas.
- Cambiar esta hoja o saltarse una regla sin Juan.

## 7. Pendiente de decidir con Juan (no inventar)

- Nada pendiente de las reglas. (El orden de construcción se acuerda aparte con Juan antes de escribir código.)

### Planes guardados (decidido 15-oct-2026)

- **No hay migración.** Juan solo tiene un cliente, aún sin nutrición asignada, y todos los planes guardados hoy son
  pruebas suyas. El motor nuevo **no necesita leer el formato viejo**: los planes de prueba se pueden descartar.
- Si en el futuro hay clientes con plan real guardado, esta regla se revisa con Juan antes de cambiar el formato.

## 8. Historial

- 15-oct-2026: primera versión. Decisiones de Juan: total diario manda, sin porcentajes por comida (modos
  partes iguales / fijo / libre), hasta 8 alimentos por bloque sin ocultar ninguno, bloques de 2 alimentos, tope
  duro y mínimo por alimento, probador con margen ±10 %, un solo motor, motor congelado hasta nueva orden.
- 15-oct-2026: fruta y "para acompañar" = bloque opcional con porción fija definida en el Gestor de alimentos. **(Sustituido el 16-oct-2026, ver abajo.)**
- 15-oct-2026: exclusiones del cliente = se quitan de los 8, sin sustituto automático, con aviso del panel si el bloque se queda corto.
- 15-oct-2026: motor único = un solo archivo `motor-nutricion.js`, sin carpetas nuevas (primero se decidió la raíz; Juan prefirió la carpeta `nuevo/` que ya existe: queda en `nuevo/nutricion/`).
- 15-oct-2026: el motor actual no funciona; el nuevo se deja muy fino antes de conectarlo, sin prisa por fechas de clientes.
- 15-oct-2026: alcance = solo código de nutrición; no tocar rutinas, check-ins, diseño ni conexiones; no se borran `prueba/` ni `app/`.
- 15-oct-2026: sin migración de planes: todo lo guardado son pruebas de Juan y se puede descartar.
- 16-oct-2026: paso 1 hecho — existe `nuevo/nutricion/motor-nutricion.js` con sus pruebas (`nuevo/pruebas/nutricion-motor.test.mjs`). **No está conectado** a `prueba/` ni a `app/`; espera la revisión y el OK de Juan. Supuestos a revisar con Juan: peso de las guías frente al total del día, "igual" y "fijo" juntos, mínimo = 1/3 del tope (si un bloque pide menos del mínimo se comparan "mínimo" y "no entra" y se elige lo que deja el día más cerca).
- 16-oct-2026: Juan pide una carpeta `test/` con el motor, las pruebas y copias de `prueba/` y `app/` para probar sin tocar lo que usan sus clientes. El motor y sus pruebas se mueven de `nuevo/` a `test/nutricion/` (sigue habiendo un solo motor). Los originales `prueba/` y `app/` no se tocan.
- 16-oct-2026: paso 2 hecho en `test/prueba/` (copia): tarjeta «Probador nuevo» con el motor único, 1500 días al azar, reparto en partes iguales. Pendiente: modos igual/fijo/libre en pantalla y porción fija de fruta/acompañar en el Gestor (hasta entonces usa los g de carbohidrato que Juan ya fija). `prueba/` y `app/` originales intactos.
- 16-oct-2026: Juan cambia la regla de fruta y "para acompañar": ya no hay porción fija, **reescalan como el resto** (con tope duro y mínimo), sus carbos fijados son solo una guía de tamaño, y leche / yogur natural / crema de cacahuete / queso en lonchas también pueden ser proteína o grasa. Sin columna nueva en Supabase. El 100 % de días se exige con los alimentos que Juan elige de verdad. Hecho solo dentro de `test/` (motor 1.1.0, pruebas y tarjeta Probador); `prueba/` y `app/` originales intactos.
- 17-oct-2026: Juan da el OK PROVISIONAL a los **postres** que añade el motor nuevo cuando el día se queda corto (mini-comida con lógica: yogur, yogur con miel / fruta / frutos secos, fruta; como mucho uno por comida y dos por día; solo comida y cena), solo para probar la app en `test/`. Cuando se haga el panel de verdad, **los postres los elegirá Juan** (no una lista fija en el código). Todavía no es regla definitiva.
- 18-oct-2026: Juan vuelve a los porcentajes por comida (se quita «manda el total del día» y la compensación ±15 % entre comidas); fruta y acompañante opcionales (por defecto «Sin»), descuentan macros al elegirlos y no se recortan. Aplicado en `prueba/index.html` y `app/index.html`; `test/` queda aparcado.
