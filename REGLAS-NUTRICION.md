# Reglas de Nutrición · JC Training Works

**Decididas por Juan el 15-oct-2026. Mandan sobre cualquier otro documento y sobre el código actual.**
Si algo de `prueba/INDEX.md`, `nuevo/nutricion/nutricionv2.md` o del código contradice esta hoja, manda esta hoja.
Ninguna IA cambia estas reglas por su cuenta. Si algo no está aquí, se pregunta a Juan; no se inventa.

## Por qué existe esta hoja

El módulo de nutrición ha pasado por v2, v3 y v4 a base de parches, con el mismo cálculo copiado en dos sitios
(`nv2` en el panel y `nv4` en la app) y tocado por sesiones distintas. El 15-oct los cambios seguidos empeoraron
cosas con los mismos alimentos y el panel se quedó con bloques vacíos y mensajes sin salida. Esta hoja fija las
reglas una vez, en cristiano, para dejar de parchear.

## 0. Reglas de trabajo para toda IA

1. **Leer esta hoja antes de tocar nada de nutrición** (panel, app, catálogo o pruebas).
2. **El motor de cálculo está congelado.** No se cambia ni se "arregla" sin OK explícito de Juan. Si algo falla, se
   describe qué falla y se pregunta; no se parchea.
3. **Un solo motor para panel y app**: un único archivo compartido. Mientras no exista, está prohibido tocar solo
   una de las dos copias.
4. **Nada de versiones nuevas** (v5...). El motor se sustituye de una vez según estas reglas y se documenta aquí.
5. **No se sube nada sin pruebas automáticas en verde**: clientes pequeños y grandes, comidas de distinto tamaño,
   y comprobar que panel y app dan el mismo resultado con el mismo plan.
6. **Nunca** un bloque vacío sin salida ni un mensaje que no diga qué falla y qué hacer.
7. No se cambian topes, mínimos ni márgenes sin Juan.

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

- Juan marca **hasta 8 alimentos por bloque** (carbohidrato, proteína, grasa) **y por comida**.
- El cliente puede elegir **cualquiera de esos 8** ese día y en esa comida. **Ninguno se oculta.**
- Un bloque puede llevar **2 alimentos** (arroz + lentejas; tortita de claras + huevos). El reparto por defecto
  es 50/50 y lo puede cambiar el cliente. Un alimento mixto (lentejas) cuenta en carbohidrato **y** en proteína.
- **Las cantidades se recalculan solas** para llegar al objetivo del día. El cliente elige alimentos, no gramos.
- Se mantiene: unidades enteras para alimentos por unidad (huevo, plátano...) y redondeo de gramos a 5 g.

### Fruta y "para acompañar" (decidido 15-oct-2026)

- Siguen siendo un **bloque opcional** por comida (Juan lo activa o no).
- Llevan una **porción fija** (1 vaso de leche, 6 aceitunas, 1 fruta...). **El motor no la toca**: solo la resta del
  resto de la comida y la cuenta en el total del día.
- **La porción fija se define en el Gestor de alimentos**, como un campo más de cada alimento. Se acaba la lista
  escrita a mano en el código (`NUTRI_PORCION_FIJA_V4`). Esto necesitará una columna nueva en Supabase, que Juan
  ejecuta a mano; nadie la crea sin avisarle.

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

- Nombre y sitio del motor único compartido.
- Dónde se construye (`nuevo/nutricion/` u otro) y cómo se migran los planes ya guardados.

## 8. Historial

- 15-oct-2026: primera versión. Decisiones de Juan: total diario manda, sin porcentajes por comida (modos
  partes iguales / fijo / libre), hasta 8 alimentos por bloque sin ocultar ninguno, bloques de 2 alimentos, tope
  duro y mínimo por alimento, probador con margen ±10 %, un solo motor, motor congelado hasta nueva orden.
- 15-oct-2026: fruta y "para acompañar" = bloque opcional con porción fija definida en el Gestor de alimentos.
- 15-oct-2026: exclusiones del cliente = se quitan de los 8, sin sustituto automático, con aviso del panel si el bloque se queda corto.
