# Reglas de Nutrición · JC Training Works

**Decididas por Juan el 15-oct-2026. Mandan sobre cualquier otro documento y sobre el código actual.**
Si algo de `prueba/INDEX.md`, `nuevo/nutricion/nutricionv2.md` o del código contradice esta hoja, manda esta hoja.
Ninguna IA cambia estas reglas por su cuenta. Si algo no está aquí, se pregunta a Juan; no se inventa.

## MENÚ CERRADO (decidido por Juan el 26 y 27-oct-2026) — MANDA SOBRE TODO LO DEMÁS DE ESTA HOJA

Nutrición pasa de un motor que reparte gramos alimento a alimento a un **menú cerrado**: platos hechos con cantidades fijas y,
en cada comida, varios platos equivalentes entre los que el cliente elige. Todo lo marcado más abajo como «SUSTITUIDO» queda como
historial y **no se aplica**. Aún no hay código: antes de escribirlo, Juan da el OK (ver «Cómo se implementa»).

### El modelo

- Cada **plato** es una lista de alimentos con gramos y macros calculados desde el catálogo (no tecleados a mano). Lleva solo alimentos.
  El Gestor de platos ya existe (`nutri_platos_v3`, pestaña Platos del Catálogo) y se reutiliza.
- Cada comida es un **hueco** con un **plato principal** (lo elige Juan) y de 3 a 6 **equivalentes** que Juan marca entre los candidatos.
- El cliente elige **un plato por comida**. No cambia cantidades ni alimentos sueltos. Las cantidades las afina Juan en el panel.
- **Postre y fruta van dentro del plato** como ingredientes (arroz con pavo + yogur con chocolate es un solo plato; con y sin postre son dos platos).
  No hay bloque aparte de porción fija.
- **Recena:** se decide por cliente, sin regla especial: o es una comida más con su hueco (un plato sin equivalentes no suma al peor caso)
  o va como ingredientes del plato de la cena.
- **Exclusiones:** Juan monta los platos solo con alimentos que el cliente come. No hay filtro ni sistema de exclusiones en el panel.
- **El cliente nunca ve macros** (ni por comida, ni del plato, ni del día). Los macros solo existen en el panel.

### Equivalencias y tope del día

- Manda el **total diario de cada macro**; cada comida puede desviarse si el día cuadra. Se intenta siempre cuadrar los tres macros.
- **Por comida:** una equivalencia puede desviarse hasta ~20 g en un macro, y solo en una comida del día, o menos. Márgenes por macro
  configurables en el panel (valores iniciales de la maqueta: ±5 g P, ±10 g H, ±4 g G; habrá que subirlos con el margen nuevo).
- **Tope del día: 20 g por macro** al empezar (a probar con el cliente de pruebas una semana y ajustar).
- **Peor caso:** por macro y comida se toma la equivalencia que más se desvía hacia arriba y la que más hacia abajo respecto al principal;
  se suman por separado las desviaciones hacia arriba de todas las comidas y, aparte, las de hacia abajo.
- **Regla dura:** si alguna de las dos sumas supera el tope, el panel **no deja guardar** y dice qué macro, en qué sentido y qué comida pesa más.
  Juan puede quitar el plato o ajustar cantidades.
- Una equivalencia que se pasa del margen sale en rojo y **no se ofrece** al cliente.

### Selección por cliente y ajuste de cantidades

- El panel sugiere como **candidatos** los platos de la franja que caen dentro del margen; **Juan marca** los que ofrece. Esa selección es lo que se guarda.
- **Ajuste de cantidades por cliente**, también en el plato principal: vale solo para ese cliente, va en los escalones de cada ingrediente
  (arroz y pasta de 5 en 5 g, atún en latas o medias, carne picada de 25 en 25 g, queso en polvo 20 o 40 g; verdura y salsa fijas), el panel recalcula
  el peor caso al momento y la app muestra los gramos ajustados. El panel sugiere, decide Juan mirando los tres macros.
  Si un plato se ajusta tanto que ya es casi otro, el panel avisa y sugiere guardarlo como variante en el catálogo.
- El Gestor de platos añade: macros visibles del plato, botón de duplicar y el escalón de cada ingrediente (guardado en el propio plato).

### Dónde se guarda

- Dentro del JSON `planes_nutricion.dias[0]`, **sin columna nueva en Supabase**, con `plan_version: 5`.
- Cada plato se guarda **como copia completa dentro del plan** (alimentos, gramos ajustados, estado, imagen y macros), porque la app lee el plan
  por `get_planes_por_codigo` y no puede consultar el catálogo. Si luego se edita un plato del catálogo, el cliente no ve el cambio hasta que Juan
  vuelva a guardar el plan; el panel avisa de los platos cambiados y de los que ahora se pasan del margen.
- A comprobar al llegar al código: que `plan_version: 5` no choque con ninguna restricción de la tabla y que `get_planes_por_codigo` devuelva lo nuevo
  (si hiciera falta cambiarlo, el SQL se lo da la IA a Juan; la IA nunca ejecuta SQL).

### App del cliente

- Se queda igual: pestañas de comida, los cinco bloques (Hidratos, Proteínas, Grasas, Para acompañar, Fruta) con imagen y borde de color, gramos, estado,
  nota verde y «Siguiente comida». Solo cambia cómo se muestran los alimentos: el plato es la combinación de las imágenes de sus alimentos.
- **Un solo botón «Cambiar plato» por comida**, encima de «Siguiente comida», que abre los platos que Juan ha marcado. Al elegir otro se rellenan los bloques.
- «Cambiado» se muestra en cada bloque cuyo alimento difiere del plato principal.
- Un alimento sin imagen usa el icono de cuenco con el borde de color del bloque (como «Sin fruta» / «Nada para acompañar»). El panel avisa de los alimentos sin imagen.

### Cómo se implementa

- **Directamente en `prueba/index.html` y `app/index.html`. Nada de `nuevo/` ni de carpetas nuevas** (decisión de Juan, 27-oct-2026). No hay archivo compartido:
  el cálculo de macros, desviaciones y peor caso es solo del panel; la app solo lee el plato elegido, sus alimentos y sus gramos.
  Las carpetas `nuevo/` y `test/` que ya existen se quedan como están (no se borran sin que Juan lo pida) y el menú cerrado no se construye en ellas.
- El **motor actual sigue congelado** y no se toca hasta que Juan dé el OK; se sustituye al final, cuando él lo haya probado.
- Se mantiene el alcance de siempre: solo código de nutrición. Antes de cada subida: `node --check` (en `app/` el JS va en `text/babel`: comprobar con Babel),
  y comprobar que todo lo que no es nutrición queda byte a byte igual. Se devuelven archivos completos.
- Casos de prueba: Juan pasará tres o cuatro platos reales con sus macros de FatSecret.
- Una sección cada vez: todas las del menú cerrado están decididas; el código empieza cuando Juan dé el OK.

### Estado de la implementación (actualizado 27-oct-2026) — leer antes de retomar

**Hecho y subido** (solo documentación y Gestor de platos; el motor y el resto del panel no se han tocado):
- `8f85fc6`: esta hoja, `CLAUDE.md` y `AGENTS.md`.
- `bd83ad7` y `63c576b` en `prueba/index.html`: el Gestor de platos (Catálogo → Platos) muestra los macros de cada plato (P/H/G/kcal, calculados desde los ingredientes y el catálogo), los recalcula en vivo en el modal,
  tiene botón ⧉ para duplicar (abre «Plato nuevo» relleno, no guarda hasta «Crear plato») y avisa con el nombre del alimento que falta si un plato lleva uno que ya no está en el catálogo activo.

**Lo que se ha visto en el código** (`prueba/index.html` y `app/index.html`, comprobar de nuevo antes de usarlo):
- La pestaña Nutrición de la ficha del cliente (`renderDetailNutricionV2`) devuelve: propuesta de alimentos del cliente, alergias/no quiere, reparto de macros y `nv2SeccionV4Html` (el generador **por alimentos**: «Candidatos por comida», «Generar plan», «Modo entrenador»).
  **Los platos del Gestor no están conectados a ese plan.** El flujo antiguo por platos (candidatos = platos de `nutri_platos_v3` y casilla «Enviar al cliente», dentro de `renderDetailNutricionV2`) parece código muerto: se calcula pero no se devuelve. Verificarlo antes de reutilizar nada.
- El plan se guarda en `planes_nutricion` (columnas `plan_version`, `dias` JSON, `candidatos_por_comida`, `porcentajes_comida`, `seleccion_envio`...). La app lo lee con `get_planes_por_codigo` y solo reconoce `plan_version` 2, 3 y 4. La app no puede leer el catálogo: por eso cada plato va copiado en el plan.
- Macros del catálogo: `kcal_100g`, `carbo_100g`, `proteina_100g`, `grasa_100g` en `state.nutriAlimentos` (solo alimentos activos; los inactivos, con nombre, en `state.nutriAlimentosInactivos`).
- Ya existe la tarjeta de alergias/no quiere en el panel. No se toca: Juan monta los platos con lo que el cliente come.
- Pendiente de decidir al llegar a guardar: reutilizar la columna `seleccion_envio` o guardar la selección solo en `dias[0]` (lo aprobado hasta ahora), y comprobar que `plan_version: 5` no choca con restricciones y que `get_planes_por_codigo` devuelve lo nuevo.

**Siguiente paso:** la sección del panel donde Juan monta la comida de un cliente: (1) elige el plato principal por comida, (2) el panel lista candidatos de la franja con su desviación respecto al principal y marca en rojo los que se pasan del margen, (3) Juan marca de 3 a 6 equivalentes, (4) ajusta gramos en escalones si hace falta (también el principal),
(5) barra del día con el peor caso y bloqueo al guardar si supera el tope, (6) «Ver como cliente». Después, el cambio en la app («Cambiar plato»). Primero el panel, probado, y solo entonces la app. Falta además el escalón de cada ingrediente guardado en el plato.

**Cómo trabajar:** Juan va desde el iPad y decide cada sección antes del código. La IA sube los cambios ella misma con la skill `jctw-dev`; para poder escribir en el repo hay que añadirlo a las fuentes de la sesión con permiso de escritura (el proxy de git da 403 si no).
Juan pasará tres o cuatro platos reales con sus macros de FatSecret como casos de prueba.

### Qué sigue valiendo del resto de la hoja

- Sección 0 (reglas de trabajo para toda IA), con el punto 3 ajustado como se indica allí.
- Manda el total diario y los macros van por delante de las kcal.
- Nunca se declara éxito si algo no cuadra: el panel avisa con números y dice qué cambiar. Nada de bloques vacíos sin salida.
- Nada de cantidades irrisorias y un plato no pierde ingredientes en silencio.
- Sin migración de planes guardados (todo lo guardado son pruebas de Juan).

**SUSTITUIDO por el menú cerrado** (queda como historial): reparto por comida y porcentajes, hasta 8 alimentos por bloque y bloques de 2, recálculo automático
de cantidades, fruta y acompañante que reescalan o con porción fija, exclusiones por filtro, mínimos y topes del motor, probador con miles de días al azar y margen ±10 %,
y el motor único compartido (`motor-nutricion.js`).

---

## 2.º cambio del 18-oct-2026 (manda sobre el anterior) · SUSTITUIDO por el menú cerrado (27-oct-2026)

Decidido por Juan, con OK explícito para tocar **prueba/index.html** y **app/index.html** (no `test/`, no `Jctw2026`):

- **Hidrato, proteína y grasa que elige el cliente nunca desaparecen ni bajan de su mínimo.** Pueden cambiar de cantidad, no de
  alimento. Fruta y acompañante **complementan, nunca sustituyen**: ceden cantidad al principal, no se la quitan del todo.
- **Fruta o acompañante que no cabe, no se ofrece.** Solo se ofrece si, al meterlo, hidrato, proteína y grasa siguen por encima de
  su mínimo (mirando carbohidratos, proteína y grasa, no solo carbos). Quedan sin efecto el recorte en proporción y los topes del
  30 % y del 50 % del cambio anterior (se han retirado `NV4_EXTRAS_MAX_PCT_CARBO`, `NV4_EXTRA_OPCION_MAX_PCT_CARBO` y sus gemelas del panel).
  Si el cliente ya tenía elegido un extra y deja de caber (porque cambió un principal), vuelve a «Sin».
- **Mínimo por alimento**, editable en el Gestor (`racion_minima_g` / `racion_minima_unidades`; necesitan dos columnas en
  `nutri_alimentos_v3`). Sin mínimo guardado: 1 unidad, o un paso de 5 g (nunca 0).
- **Reparto híbrido**: además del % general por comida, se puede dar un % propio a un macro concreto en cada comida
  («Prioridad por macro»). Los macros sin ajuste siguen el reparto general. Se guarda dentro del plan (`dias[0].reparto_macros`).
- **Probador:** una combinación con fruta/acompañante que dejaría un principal por debajo de su mínimo cuenta como «no se ofrece».

## Cambio del 18-oct-2026 (manda sobre lo que diga el resto de esta hoja) · SUSTITUIDO por el menú cerrado (27-oct-2026)

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
  Si piden más, sus carbos guía se reducen en proporción.
- Una opción de fruta o acompañante **no se ofrece** en una comida si su porción mínima, ella sola, se come el **50 %** o más de los
  carbohidratos de esa comida (queda «Sin fruta» / «Nada para acompañar»); el probador las lista como «no caben nunca en esta comida».
  Valor provisional: `NV4_EXTRA_OPCION_MAX_PCT_CARBO` en la app y `NUTRI_EXTRA_OPCION_MAX_PCT_CARBO_V4` en el panel.
- **El botón de pruebas es el que decide:** prueba lo mismo que se le ofrece al cliente (incluidos los alimentos que no llegan a su
  objetivo ni con su ración máxima y quedan topados) y dice sí o no; si es no, dice qué comida, qué alimento y qué cambiar.
  Juan solo marca alimentos: no monta nada a mano en el panel.
- **El alimento principal nunca desaparece** (pedido por Juan, 18-oct-2026, tarde): el alimento que el cliente elige como carbohidrato, proteína o
  grasa no se puede quitar al añadir fruta o acompañante; puede bajar su cantidad (hasta su mínimo) pero no eliminarse. Fruta y acompañante
  **completan** los bloques principales, no los sustituyen. Si no caben sin dejar un principal por debajo de su mínimo, es la fruta o el
  acompañante lo que no entra, con aviso. Aplicado al motor de `test/nutricion/motor-nutricion.js` (1.5.0) y, desde el 2.º cambio del 18-oct-2026, también al cálculo de `prueba/index.html` y `app/index.html`.
- **Sin postres:** si el día no llega, el motor no añade ningún alimento; lo dice con números (quitado de `test/` el 18-oct-2026).
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
3. **Menú cerrado (27-oct-2026): no hay motor compartido.** El cálculo de macros, desviaciones y peor caso vive solo en el panel (`prueba/index.html`); la app (`app/index.html`) solo lee el plato elegido. Se implementa directamente en `prueba/` y `app/`, sin carpetas nuevas. (Antes: un único archivo de motor compartido; ya no aplica.)
3b. **Alcance: solo el código de nutrición.** No se toca nada más de `prueba/` ni de `app/`: ni rutinas ni progresos
   de entreno, ni check-ins, ni avisos, ni diseño, ni sus conexiones. Lo que Juan usa hoy con su cliente no se
   rompe. Antes de cada subida se comprueba que lo que no es nutrición queda byte a byte igual.
3c. **No se borran archivos ni se quitan `prueba/` o `app/`.** Dentro de ellos, el código de nutrición viejo se
   sustituye por el menú cerrado cuando Juan lo apruebe; el resto queda como está.
4. **Nada de versiones nuevas del motor** (v5...). Se sustituye de una vez según estas reglas y se documenta aquí. (El `plan_version: 5` del formato del plan guardado no cuenta: es el formato de datos, no una versión del motor.)
5. **No se sube nada sin pruebas automáticas en verde**: clientes pequeños y grandes, comidas de distinto tamaño,
   y comprobar que la app muestra exactamente lo que el panel guardó en el plan.
6. **Nunca** un bloque vacío sin salida ni un mensaje que no diga qué falla y qué hacer.
7. No se cambian topes, mínimos ni márgenes sin Juan.

### Cuándo se da por bueno (decidido 15-oct-2026) · SUSTITUIDO por el menú cerrado (27-oct-2026)

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

## 1. Qué manda: el total del día · SUSTITUIDO por el menú cerrado (27-oct-2026)

- Lo que manda es el **total diario de cada macro**. No importa cuánto se pase o se quede corta una comida:
  100 g de hidratos en una y 30 en otra está bien si el día cuadra.
- Prioridad: **macros**. Las kcal son secundarias: si los macros cuadran dentro del margen, vale.

## 2. Objetivo por comida (sin porcentajes) · SUSTITUIDO por el menú cerrado (27-oct-2026)

- **No hay porcentajes por comida.**
- Para cada macro y cada comida, Juan elige uno de tres modos:
  - **Partes iguales**: el total del día se divide entre las comidas (3 comidas y 180 g de proteína → 60 g cada una).
  - **Fijo**: Juan escribe los gramos de esa comida.
  - **Libre** (en blanco): el motor decide. Las comidas libres se reparten lo que quede del total.
- Los modos se pueden mezclar (por ejemplo, repartir solo la proteína y dejar el resto libre).
- Si lo fijado no suma o pasa del total del día, el panel avisa.
- El objetivo por comida es solo una **guía** del tamaño de cada comida; el total del día es el que se cumple.

## 3. Alimentos y elección del cliente · SUSTITUIDO por el menú cerrado (27-oct-2026)

- Juan marca **hasta 8 alimentos por bloque** (carbohidrato, proteína, grasa, fruta y para acompañar) **y por comida**.
- El cliente puede elegir **cualquiera de esos 8** ese día y en esa comida. **Ninguno se oculta.**
- Un bloque puede llevar **2 alimentos** (arroz + lentejas; tortita de claras + huevos). El reparto por defecto
  es 50/50 y lo puede cambiar el cliente. Un alimento mixto (lentejas) cuenta en carbohidrato **y** en proteína.
- **Las cantidades se recalculan solas** para llegar al objetivo del día. El cliente elige alimentos, no gramos.
- Se mantiene: unidades enteras para alimentos por unidad (huevo, plátano...) y redondeo de gramos a 5 g.

### Fruta y "para acompañar" (cambiado el 16-oct-2026; sustituye a la «porción fija» del 15-oct) · SUSTITUIDO por el menú cerrado (27-oct-2026)

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

### Exclusiones del cliente: alergias y "no quiere" (decidido 15-oct-2026) · SUSTITUIDO por el menú cerrado (27-oct-2026)

- El alimento excluido **sale de los 8** de ese cliente y **no se sustituye solo**.
- Si un bloque se queda corto, **el panel avisa** (qué comida, qué bloque y cuántos alimentos quedan). Lo decide Juan.
- El **probador** vuelve a comprobar que el día sigue llegando sin ese alimento.

## 4. Topes y mínimos · SUSTITUIDO por el menú cerrado (27-oct-2026)

- **Tope duro** por alimento y comida (ración máxima del Gestor). Nunca se supera ("no 10 vasos de leche").
- **Mínimo** por alimento: nunca menos de **1 unidad** ni de **un tercio de su tope**. Si el motor pidiera menos,
  ese alimento no entra en esa comida y los demás compensan. No salen cantidades irrisorias (5 g de avena).
- Si **aun así el día no llega**, no se fuerza nada: el probador lo dice claro y con números ("este cliente necesita
  más comidas o más ración").

## 5. Probador de combinaciones · SUSTITUIDO por el menú cerrado (27-oct-2026)

- Se pasa **antes de generar el plan**, con los alimentos que Juan ha marcado. Simula al cliente en la app
  eligiendo cualquier combinación y comprueba que el día queda dentro del objetivo.
- **Margen por defecto: ±10 % por macro**, ajustable por macro. Ejemplo: 180 g de proteína → entre 162 y 198 g vale.
- Método: los casos extremos (peor y mejor combinación) más miles de días al azar. No hace falta probar todas.
- Si algo falla, el mensaje dice **qué bloque, cuánto falta y qué hacer**.

## 6. Prohibido

- Bloques vacíos sin salida; mensajes vagos ("ninguna combinación cabe").
- Dos copias del cálculo (panel y app) que puedan divergir. (Con el menú cerrado, la app no calcula macros.)
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
- 18-oct-2026 (tarde): Juan pide que el alimento principal elegido nunca desaparezca (fruta y acompañante completan, no sustituyen) y que se quite meter postres cuando el día no llega. Hecho en `test/` (motor 1.5.0, pruebas, panel y app de test). Anula el OK provisional a los postres del 17-oct-2026. Coste: bajan los días que cuadran en el probador; ver `test/README.md`.
- 18-oct-2026 (2.º cambio): principales nunca desaparecen ni bajan de su mínimo; fruta/acompañante solo se ofrecen si caben (sin recortes, fuera el 30 %/50 %); mínimo por alimento en el Gestor; reparto híbrido por macro. Aplicado en app/index.html y prueba/index.html.
- 26 y 27-oct-2026: **menú cerrado con equivalencias** (ver el bloque de arriba, que manda sobre todo lo demás). Decisiones de Juan: platos hechos con cantidades;
  principal + 3-6 equivalentes marcados por él; tope del día de 20 g por macro sobre el peor caso con regla dura; ajuste de cantidades por cliente (también en el principal);
  postre/fruta dentro del plato; recena por cliente; exclusiones resueltas al montar los platos; selección guardada en `planes_nutricion.dias[0]` con copia del plato y `plan_version: 5`;
  un solo «Cambiar plato» por comida en la app; implementación directa en `prueba/` y `app/`, sin `nuevo/` ni carpetas nuevas. Sin código todavía.
