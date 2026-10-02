# Módulo de nutrición JCTW — contexto completo

> Este documento es para que cualquier IA (o el propio Juan) entienda, sin necesidad de leer el chat original, **por qué se diseñó así el módulo de nutrición, qué se probó, qué se decidió y en qué punto exacto está la construcción real**. Está pensado para vivir en `PRUEBA/INDEX.md` del repo `jctrainingworks/Trainingworks`.

---

## 0. Quién es Juan y qué es JCTW

- Juan Carlos Martínez Velasco ("Juancar"), entrenador personal, marca **JC Training Works (JCTW)**, Madrid. Viene de 18+ años en pintura de automoción.
- Construye y mantiene él mismo su plataforma de gestión de clientes: HTML/JS vanilla + Supabase, en GitHub Pages, repo `jctrainingworks/Trainingworks` (público) + `jctrainingworks/Jctw2026` (panel de entrenador, privado desde ago-2026).
- Lema de marca: **"Tú entrenas. Yo controlo el resto."** — esto no es solo copy, es una restricción de diseño real: el cliente no debe tener que pensar ni decidir sobre nutrición. Cualquier pantalla que obligue al cliente a "elegir alimentos y combinar macros" rompe la marca, aunque funcione bien técnicamente.
- Juan no disfruta el trabajo de nutrición (al contrario que entreno, donde sí se mete horas). Cualquier solución debe minimizar su trabajo manual por cliente.

---

## 1. El problema de partida

El generador de menús anterior (V2, en `prueba/index.html`) producía combinaciones que no parecían comidas reales una vez ajustadas a los macros, y a Juan no le quedaba claro cómo se repartían los macros por comida. Se abrió la puerta a rediseñar desde cero si compensaba.

Se decidió **no tocar el código real todavía** y montar un prototipo aislado (una página HTML suelta, sin Supabase, sin nada conectado) para explorar la idea con libertad y barato en tiempo. Esto se llamó **"el probador"**.

---

## 2. La idea base (el motor)

Validada por repetición durante todo el proceso:

1. **Catálogo de alimentos por 100 g**, con sus macros (HC, proteína, grasa).
2. **Cada alimento se clasifica por su macro dominante** (HC / Proteína / Grasa) y solo cuenta oficialmente por ese macro. Lo demás que aporte (ej. la grasa del huevo) se gestiona aparte, no se ignora del todo.
3. **Equivalencias dentro de cada categoría**: 100 g de arroz ≈ 200 g de patata en HC, etc. Esto es literalmente la primera idea que tuvo Juan, el día 1.
4. **Compensación cruzada automática**: si el bloque de proteína (huevos) ya aporta mucha grasa, el bloque de grasa se recalcula para pedir menos (o directamente queda "cubierta", sin añadir nada). El sistema resta lo que ya aportan los otros bloques antes de pedir el resto — iterativo, 3-4 pasadas hasta estabilizar HC/proteína/grasa a la vez.
5. **No hace falta cuadrar al gramo.** Un desvío de 5-15 g en proteína o HC no importa (pocas kcal). El único macro que de verdad hay que vigilar es la **grasa**, porque esconde más calorías por gramo. Por eso el aviso de "te pasas" se centra ahí.
6. **Topes por alimento** (máximos realistas por ración) para que el sistema no proponga, por ejemplo, 174 g de carne picada solo porque es el único alimento del bloque proteína.
7. **Alimentos por unidad** (huevo = 50 g, tortilla de trigo = 36 g, plátano = 100 g, manzana = 150 g, naranja = 130 g, yogur = 125 g): internamente todo se calcula en gramos sobre la tabla de 100 g; el campo "unidad" solo sirve para redondear a piezas enteras en vez de enseñar un gramaje raro.
8. **Alimentos "en seco"**: arroz, pasta, crema de arroz, harina de avena — los valores del catálogo son en crudo, no cocinado. Importante dejarlo etiquetado para que no haya confusión al pesar.
9. **Gramos manuales / plato fijo**: para platos reales (ej. macarrones 60 g + carne picada 100 g + tomate frito 100 g, la cena real de Juan) el sistema debe permitir **fijar los gramos exactos** de un alimento en vez de que el algoritmo los recalcule para cuadrar el objetivo. Un alimento fijado no se toca; el resto de bloques se adapta alrededor de él. Esto fue necesario porque el intento de "cuadrar siempre al objetivo" rompía platos reales (forzaba cantidades absurdas, o bloqueaba alimentos porque el bloque ya se consideraba "cubierto").
10. **Reparto del día por comidas**: macros totales del día → % por comida (desayuno/comida/cena/snack, o las que sean). Juan no sabe qué porcentaje poner, así que se añadió: checkbox para activar/desactivar comidas (3, 4, 5...) + botón "Repartir a partes iguales" que reparte el 100% entre las comidas activas automáticamente.
11. **Bloque opcional "Extra" (fruta / postre)**: un cuarto bloque, no obligatorio, para fruta (desayuno/snack) o postre ligero tipo chocolate 85%/gelatina 0% (comida/cena). No intenta cuadrar un macro con precisión (es un capricho controlado), pero sí resta del resto de bloques para que el total de la comida no se dispare. Usa el mismo mecanismo de compensación cruzada que los otros tres bloques.
12. **Alimentos permitidos por tipo de comida**: no todos los alimentos deben aparecer en todas las comidas (nada de arroz o pasta en el desayuno). Cada comida tiene su propia lista de candidatos permitidos por bloque.

---

## 3. Diseño de la vista del cliente — la parte más importante

**Primer intento (descartado):** dar al cliente la misma pantalla que al entrenador — elegir 1-2 alimentos por categoría, recalculando en vivo. Juan lo rechazó explícitamente: *"se convierte en una app como FatSecret"*. Eso contradice "yo controlo el resto": si el cliente tiene que combinar y cuadrar macros, está haciendo el trabajo del entrenador.

**Diseño final adoptado:**

- El cliente ve **la comida ya montada y fija**, con las cantidades exactas que decidió el entrenador (nunca una categoría abierta para elegir).
- Cada bloque tiene un botón **"Cambiar"** que abre una lista corta (2-4 alternativas), **pre-calculadas una sola vez por el entrenador** (mismo macro dominante, gramos ya fijados). El cliente elige una opción completa, no combina ni edita gramos.
- Nunca se recalcula nada en vivo al elegir una alternativa: las alternativas ya vienen "congeladas".
- Los nombres de comida de cara al cliente son genéricos: **"Comida 1", "Comida 2", "Comida 3"...**, no "Desayuno/Comida/Cena/Snack" (decisión explícita de Juan).
- Limitación conocida: si el entrenador pone 2 alimentos en el mismo bloque, el botón "Cambiar" no aparece (el intercambio de una sola pieza no tiene sentido ahí). Pendiente de decidir si se necesita diseñar swaps para combos de 2 alimentos o si se deja así.

---

## 4. El prototipo (el "probador")

Se construyó como una página HTML independiente (un solo archivo, sin backend), publicada como artifact de Claude para iterar rápido y sin riesgo. Catálogo de alimentos sacado del propio diario semanal de FatSecret de Juan (6-12 julio 2026), con valores por 100 g derivados de las cantidades reales del diario.

Incluye: motor de macro dominante + compensación cruzada, gramos manuales por alimento, reparto de comidas con checkboxes + "repartir a partes iguales", filtrado de alimentos por tipo de comida, bloque Extra fruta/postre, y el modo "Ver como cliente" con comida fija + botón Cambiar.

Este prototipo cumplió su función (validar la idea sin tocar código real) y **no es el destino final** — es solo la prueba de concepto.

---

## 5. El giro importante: V3 ya existía en producción, más avanzado

Al pasar a revisar `prueba/index.html` para empezar a construir de verdad, se descubrió que **gran parte de lo prototipado en el probador ya existía en producción, y más avanzado**: el sistema **V3**, con:

- "Platos" multi-ingrediente reales (tabla `nutri_platos_v3`), no alimentos sueltos.
- Escalado por grupos de macro manteniendo proporciones entre ingredientes del plato.
- Cadena de compensación carbo→proteína→grasa→carbo (ya implementada).
- Porcentaje editable por comida (`porcentajes_comida`).
- Exclusiones por cliente.
- Curación de candidatos por franja horaria.
- Selección de hasta 4 platos enviados al cliente.
- Cliente eligiendo entre platos ya escalados — **nunca recalcula nada**, mismo principio que se "redescubrió" en el probador.
- Todo gestionado desde un "Gestor de platos v3" en el panel.

**Conclusión práctica de ese descubrimiento:** para casos como meter el plátano en el desayuno de Juan (crema de arroz + proteína + almendras), **no hacía falta código nuevo** en V3 — bastaba con editar el plato real en el Gestor de platos v3 añadiendo el plátano como ingrediente con rol "carbohidrato"; el escalador ya trata los ingredientes de un plato como grupo.

---

## 6. Decisión final de arquitectura (29 sep 2026)

Pese a que V3 (platos) ya es más potente, **se decidió volver a V2 (motor por alimento suelto) como sistema principal de nutrición**, pero reconstruido exactamente con las decisiones de UX validadas en el probador:

- Candidatos por alimento marcados **por comida** (no una lista global).
- De cara al cliente: **"Comida 1 / Comida 2 / Comida 3"**, no Desayuno/Comida/Cena/Snack.
- **Gramos manuales** para platos reales (fijar cantidades exactas sin que el algoritmo las recalcule).

**V3 (platos) se deja intacto y aparcado** — no se borra ni se toca, por si se retoma más adelante.

### Por qué V2 y no V3, si V3 es "más potente"

(Esto no quedó escrito explícitamente en la conversación, así que queda como contexto a confirmar con Juan si hace falta: V2 trabaja con alimentos sueltos, que es el nivel de control que Juan quiere para ajustar casos como el suyo propio alimento a alimento, mientras que V3 obliga a pensar en "platos" cerrados. Confirmar con Juan antes de asumir más que esto.)

---

## 7. Estado real de la construcción (lo que ya está hecho en el repo)

Trabajo ya realizado en `prueba/index.html` + `alimentos/catalogo.js` (repo `Trainingworks`):

- Catálogo: añadidos **manzana, naranja, fresas, arándanos** (categoría carbohidrato, con flag `soloLigera`) y **chocolate negro 85%** (categoría grasa). **La fruta NO necesitó un bloque "Extra" nuevo en el código real** — encaja como candidato normal gracias al flag `soloLigera` que ya existía de antes en el catálogo real (a diferencia del probador, donde sí se construyó un bloque Extra separado porque el flag `soloLigera` no existía ahí).
- Se descubrió que el picker de candidatos por alimento de V2 (`nv2ToggleCandidato`, `nv2CandidatosComida` de 2 argumentos) **quedó roto/huérfano** al migrar a V3 — un nombre de función se reutilizó para platos con otra forma de datos, dejando el V2 original inservible.
- **Reconstruido desde cero con sufijo V4** para no tocar ni un campo de estado de V3:
  - `nv2CandidatosComidaV4`
  - `nv2ToggleCandidatoV4`
  - `nv2CandidatosParaGenerarV4`
  - `nv2GenerarV4`
  - `nv2GuardarV4`
  - `nv2RecalcularCascadaEnComidaV4`
  - `nv2CambiarAlternativaV4`
  - `nv2FijarAlternativaManualV4`
  - `nv2CandidatosV4Html`
  - `nv2PlanV4Html`
  - `nv2SeccionV4Html`
- Guarda como `plan_version 4` (para no pisar ni los planes V3 ni los V2 antiguos).
- Validado con `node --check`.

### Pendiente inmediato

1. Pegar los bloques QUITA/PON ya entregados en `prueba/index.html` y `alimentos/catalogo.js`.
2. Probar en real (con un cliente de verdad, no solo en local).
3. Construir **`NutricionViewV4`** en `app/index.html` (la app del cliente) mostrando **"Comida 1 / Comida 2 / Comida 3"** en vez de Desayuno/Comida/Cena, siguiendo el diseño de "plato fijo + botón Cambiar con alternativas congeladas" validado en el probador.
4. Decidir si se añade almendras al catálogo real para desayuno (Juan las usa en su propio desayuno; en el probador solo había anacardos en esa franja — pendiente de confirmar si hace falta en el código real también).
5. Decidir qué hacer con bloques de 2 alimentos en el cliente (sin botón "Cambiar" por ahora — ver sección 3).

---

## 8. Convenciones de trabajo en este repo (aplican a cualquier IA que toque el código)

- Repo público: `jctrainingworks/Trainingworks` (web, app cliente, check-ins, nutrición, gifs de ejercicios). El panel de entrenador vive aparte, en `jctrainingworks/Jctw2026` (privado).
- Siempre traer el archivo fresco desde la URL raw de GitHub al empezar una sesión, antes de editar nada.
- JS se valida con `node --check` sobre los bloques `<script>` extraídos; JSX con `@babel/standalone`.
- Los cambios se entregan como **archivos completos** o **pares exactos QUITA/PON** — nunca como diffs abstractos.
- Confirmar el entendimiento y presentar el plan antes de tocar código ("no toques nada" debe respetarse literalmente si Juan lo pide).
- GitHub Pages cachea: tras cada deploy hace falta hard refresh (Ctrl+Shift+R) o incógnito para ver cambios.
- Core de Supabase relevante: tablas `clientes`, `planes_nutricion`, `nutri_platos_v3`, `seguimiento_corporal` (entre otras). El cliente usa RPCs security-definer exclusivamente, nunca acceso directo a tablas.

---

## 9. Catálogo de alimentos usado en el probador (referencia)

Valores por 100 g salvo que se indique "u" (peso por unidad). Derivados del diario FatSecret real de Juan (6-12 julio 2026) salvo fruta/postre, añadidos a mano.

### Carbohidrato

| Alimento | HC | Prot | Grasa | Tope | Nota |
| --- | --- | --- | --- | --- | --- |
| Crema de arroz | 77 | 8.4 | 2.7 | 100 g | en seco |
| Arroz basmati (seco) | 78 | 9 | 0.6 | 150 g | en seco |
| Macarrón (seco) | 68 | 12 | 2 | 150 g | en seco |
| Pajaritas verduras (seco) | 68 | 13 | 1.5 | 150 g | en seco |
| Patata microondas | 15.7 | 1.7 | 0.1 | 600 g |  |
| Plátano | 22.8 | 1.1 | 0.3 | 200 g | u=100 g |
| Pan barra | 50 | 7.2 | 1.3 | 200 g |  |
| Harina de avena | 60 | 12 | 6.1 | 120 g | en seco |
| Tortilla trigo | 50 | 8.3 | 5.8 | 144 g | u=36 g |
| Mermelada fresa | 47 | 0.5 | 0 | 50 g |  |

### Proteína

| Alimento | HC | Prot | Grasa | Tope | Nota |
| --- | --- | --- | --- | --- | --- |
| Whey chocolate | 7 | 73 | 6.3 | 60 g |  |
| Pechuga de pavo | 0 | 25 | 1.3 | 300 g |  |
| Merluza | 0 | 18 | 1.2 | 350 g |  |
| Atún en aceite | 0.9 | 21 | 18 | 150 g | trae grasa |
| Huevos | 0.5 | 12.5 | 11.1 | 150 g | u=50 g, trae grasa |
| Claras | 0.5 | 11 | 0.1 | 400 g |  |
| Jamón cocido | 0.9 | 18.6 | 2.5 | 100 g |  |
| Lomo adobado | 0.8 | 19.3 | 3.1 | 250 g |  |
| Carne picada vacuno | 2.7 | 18 | 16 | 200 g | trae grasa |
| Yogur 0% | 4.4 | 4.3 | 0.1 | 400 g | u=125 g |

### Grasa

| Alimento | HC | Prot | Grasa | Tope |
| --- | --- | --- | --- | --- |
| Aceite de oliva | 0 | 0 | 92 | 20 g |
| Anacardos | 19 | 22 | 48 | 30 g |
| Mayonesa | 4.9 | 0.7 | 65 | 20 g |
| Aceitunas negras | 0 | 0.5 | 15 | 40 g |
| Queso Havarti | 1 | 20 | 37 | 30 g |
| Queso rallado | 19 | 15 | 14 | 40 g |
| Tomate frito con aceite | 9.5 | 1.5 | 3.5 | 200 g |

### Extra (fruta / postre)

| Alimento | HC | Prot | Grasa | Tope | Nota |
| --- | --- | --- | --- | --- | --- |
| Manzana | 11.4 | 0.3 | 0.2 | 150 g | u=150 g |
| Naranja | 9.4 | 0.9 | 0.1 | 130 g | u=130 g |
| Plátano | 22.8 | 1.1 | 0.3 | 100 g | u=100 g |
| Fresas | 5.5 | 0.7 | 0.3 | 150 g |  |
| Arándanos | 11 | 0.7 | 0 | 100 g |  |
| Chocolate negro 85% | 14 | 7.8 | 46 | 15 g |  |
| Gelatina 0% | 1 | 1 | 0 | 150 g |  |

### Permitidos por comida (ejemplo del probador)

- **Desayuno / Comida 4 (snack):** HC → crema de arroz, plátano, pan, avena, mermelada, tortilla; Proteína → whey, huevos, claras, yogur; Grasa → anacardos; Extra → manzana, naranja, plátano, fresas, arándanos.
- **Comida 2 / Comida 3 (comida/cena):** HC → arroz, macarrón, pajaritas, patata, pan; Proteína → pechuga, merluza, atún, huevos, jamón, lomo, carne picada; Grasa → aceite, mayonesa, aceitunas, queso havarti, queso rallado, tomate frito; Extra → chocolate 85%, gelatina 0%, fresas.

---

## 10. Resumen ejecutivo (para quien tenga prisa)

1. Partimos de un generador V2 que no convencía (combinaciones poco reales).
2. Prototipamos sin tocar código real un sistema de alimento suelto por macro dominante + equivalencias + compensación cruzada + gramos manuales + reparto de comidas + bloque extra opcional.
3. Rechazamos dar al cliente una pantalla de elección libre (rompe "yo controlo el resto"); diseñamos en su lugar comida fija + botón "Cambiar" con alternativas pre-congeladas.
4. Al ir a construirlo de verdad, descubrimos que ya existía V3 (platos), más avanzado en algunos aspectos.
5. Decidimos quedarnos con V2 como motor principal, pero con todas las decisiones de UX del probador; V3 queda aparcado intacto.
6. Ya hay construcción real en marcha (funciones V4, validadas con `node --check`), pendiente de pegar en el repo, probar y extender a la app del cliente.