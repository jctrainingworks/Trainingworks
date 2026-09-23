# Nutrición v2 · Contrato de datos

Revisado el 23-sep-2026. `plan_version` sigue siendo 2: los cambios son compatibles con los planes ya guardados (ver *Historial de cambios*).

## Principio de producto

> El entrenador calcula; el cliente elige.

El entrenador ve objetivos, cálculos, macros, validaciones y adherencia.

El cliente ve solamente cantidades, alimentos, alternativas autorizadas,
instrucciones sencillas y un botón para marcar la comida como realizada.

---

## Estructura del plan

```json
{
  "plan_version": 2,
  "dias": [
    {
      "id": "dia_lunes",
      "nombre": "Lunes",
      "comidas": [
        {
          "id": "comida_lunes_comida",
          "nombre": "Comida",
          "hora": "14:00",
          "bloques": [
            {
              "id": "bloque_lunes_comida_carbo",
              "tipo": "carbohidrato",
              "alternativas": [
                {
                  "id": "alt_lunes_comida_carbo_arroz",
                  "etiquetaCliente": "80 g de arroz basmati (en seco)",
                  "seleccionadaPorDefecto": true,
                  "items": [
                    {
                      "id": "item_arroz_001",
                      "foodKey": "arroz_basmati",
                      "grams": 80,
                      "unidades": null
                    }
                  ]
                }
              ]
            },
            {
              "id": "bloque_lunes_comida_proteina",
              "tipo": "proteina",
              "alternativas": [
                {
                  "id": "alt_lunes_comida_proteina_pollo",
                  "etiquetaCliente": "175 g de pechuga de pollo (en crudo)",
                  "seleccionadaPorDefecto": true,
                  "items": [
                    {
                      "id": "item_pollo_001",
                      "foodKey": "pechuga_pollo",
                      "grams": 175,
                      "unidades": null
                    }
                  ]
                }
              ]
            },
            {
              "id": "bloque_lunes_comida_grasa",
              "tipo": "grasa",
              "alternativas": [
                {
                  "id": "alt_lunes_comida_grasa_aove",
                  "etiquetaCliente": "15 g de aceite de oliva",
                  "seleccionadaPorDefecto": true,
                  "items": [
                    {
                      "id": "item_aove_001",
                      "foodKey": "aove",
                      "grams": 15,
                      "unidades": null
                    }
                  ]
                }
              ]
            },
            {
              "id": "bloque_lunes_comida_extras",
              "tipo": "extras",
              "instruccionesCliente": [
                "Añade 150–250 g de verduras al gusto.",
                "Puedes usar sal, especias, vinagre, limón, café o infusiones."
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

### Bloque de tipo `plato`

Un plato es una receta hecha solo de alimentos (por ejemplo, arroz con atún). Su bloque tiene la misma forma que los de carbohidrato, proteína y grasa: una lista de `alternativas`, cada una con sus `items`. Una comida puede llevar un bloque `plato` en lugar de los tres bloques de macro.

```json
{
  "id": "bloque_lunes_cena_plato",
  "tipo": "plato",
  "alternativas": [
    {
      "id": "alt_lunes_cena_plato_patata_huevos",
      "etiquetaCliente": "Patata con huevos: 400 g de patata (en crudo), 3 huevos y 60 g de pan blanco",
      "seleccionadaPorDefecto": true,
      "items": [
        { "id": "item_patata_010", "foodKey": "patata", "grams": 400, "unidades": null, "origen": "plato" },
        { "id": "item_huevo_010", "foodKey": "huevo_entero", "grams": null, "unidades": 3, "origen": "plato" },
        { "id": "item_pan_010", "foodKey": "pan_blanco", "grams": 60, "unidades": null, "origen": "anadido" }
      ]
    }
  ]
}
```

---

## Reglas de datos

- Cada día, comida, bloque, alternativa e item usa un identificador estable (`id`).
- **Todo `id` debe ser único en la totalidad del plan**, no solo dentro de su nodo padre. Dos alternativas de comidas distintas nunca pueden compartir `id`.
- Los registros del cliente guardan IDs, nunca índices de arrays.
- Un alimento siempre se representa con `foodKey`, `grams` y `unidades`.
- No usar `key`, `g`, `foods`, `alimentos` u otros nombres para representar el mismo dato en v2.
- Todo `foodKey` debe existir en el catálogo normalizado de alimentos.
- `grams` es un número o `null`.
- `unidades` es un número o `null`.
- Un item debe usar gramos o unidades; no ambos a la vez.
- `origen` es opcional en cada item y solo admite `"plato"` o `"anadido"`. Si falta, se entiende `"plato"`. Marca de dónde viene el item; no cambia cómo se representa.
- `extras` solo utiliza `instruccionesCliente`; nunca incluye un `foodKey` falso.
- **`tipo: "extras"` es la única excepción estructural del modelo de bloque**: nunca lleva `alternativas` ni `items`, solo `instruccionesCliente`. Ningún validador debe exigirle la forma de los demás bloques.
- Una alternativa puede contener uno o varios items.
- Si hay un `foodKey` inválido, se bloquea guardar/publicar y se muestra un error al entrenador.
- Nunca se elimina silenciosamente un item de una alternativa. Quitar un item (un alimento añadido, por ejemplo) es siempre una acción explícita del entrenador.
- **La desviación de macros no es un error de validación.** Si el total del día queda fuera del margen (ver *Objetivo del día y generación*), el entrenador ve un aviso informativo — no bloquea el guardado ni forma parte de los errores que devuelve `validarPlanV2`. La validación estructural (ids, foodKeys, enum de tipos, grams/unidades) y la precisión nutricional son categorías distintas: una bloquea, la otra solo informa.

---

## Tipos de bloque (enum cerrado)

Los únicos valores válidos para `tipo` de bloque son:

```text
"carbohidrato"
"proteina"
"grasa"
"plato"
"extras"
```

Cualquier otro valor (variantes con tilde, mayúsculas, sinónimos como `"carbo"`) debe ser rechazado por el validador, no normalizado silenciosamente.

---

## Selección por defecto

- Cada bloque de tipo `carbohidrato`, `proteina`, `grasa` o `plato` debe tener **exactamente una** alternativa marcada con `seleccionadaPorDefecto: true`.
- El cliente nunca ve un bloque sin selección al abrir una comida por primera vez.
- El cliente puede cambiar la selección; el cambio se guarda como la nueva elección del cliente, pero no modifica cuál alternativa es la de fábrica (`seleccionadaPorDefecto`) del plan.
- Un plan con un bloque sin ninguna alternativa por defecto, o con más de una, debe bloquear el guardado.

---

## Objetivo del día y generación

El objetivo de un plan se expresa en **macros del día** (proteína, grasa y carbohidratos, en gramos). Las kcal se calculan a partir de los macros y son un dato secundario.

### Qué cuenta y con qué margen

- Lo que importa es el **total del día**, no cada comida por separado. No hay objetivo oculto por comida.
- Margen sobre el total del día: **±3 g de proteína, ±3 g de grasa y ±5 g de carbohidratos**.
- El margen se evalúa sobre las cantidades **ya redondeadas** para cocina.
- Las kcal no tienen margen duro ni generan aviso por sí solas.

### Ración y proporciones

- Dentro de un plato, cada item se ajusta de forma independiente, sin proporciones fijas entre ellos.
- Cada alimento sube según haga falta hasta su **ración máxima** (`racion_maxima_g` en el catálogo, o `racion_maxima_unidades` si va por unidades). Ningún item puede superarla, y esos topes no se tocan.
- Los items en `unidades` se ajustan en unidades enteras (o medias, si el catálogo lo permite para ese alimento).

### El generador

- El generador de día completo es el que elige y ajusta los platos del día. Es una acción **explícita** del entrenador ("generar" o "recalcular"); nunca se ejecuta solo al abrir, guardar o publicar un plan.
- Elige, entre los platos candidatos, la combinación que cumple el margen del día tocando lo menos posible las cantidades base de cada plato. Orden de prioridades: 1) macros dentro del margen, 2) mínima alteración de los platos, 3) kcal cercanas al objetivo.
- Para llegar a los macros primero sube las cantidades del plato hasta la ración máxima de cada alimento; solo cuando un alimento ya está en su tope y aún falta, añade otro alimento (ver *Alimentos añadidos*).
- Respeta las restricciones del cliente: alimentos excluidos y, si `suplementacion_activa` es falso, no incluye suplementos.
- Si ninguna combinación cumple el margen, devuelve la más cercana y el entrenador ve el aviso con las desviaciones. No se fuerza un resultado ni se supera la ración máxima de ningún alimento.
- Un plan ya guardado no lo modifica el generador por su cuenta. Las cantidades editadas a mano por el entrenador no se sobrescriben salvo que pida regenerar.

### Alimentos añadidos

- Si un alimento del plato ya está en su ración máxima y aún faltan macros para cuadrar el día, o si al plato le falta por completo un macro que el día necesita, el generador añade otro alimento al plato.
- El alimento añadido tiene que pegar con el plato: es del mismo tipo de macro que el que falta (carbohidrato, proteína o grasa) y se elige entre los que ya se usan en platos de esa misma franja. Así, a una patata con huevos se le añade pan, no avena (que solo se usa en desayunos).
- Todo alimento añadido se marca con `origen: "anadido"` para que el entrenador lo vea en el plan y pueda quitarlo.
- El cliente ve el alimento añadido como un item más; la marca es solo para el entrenador.
- Cuando el entrenador quita un alimento añadido, no vuelve a aparecer salvo que regenere el plan.

### Datos de cálculo (fuera del árbol del plan)

Objetivo, resultado y desviaciones son información de diagnóstico que ve el entrenador aparte; no forman parte del árbol del plan.

```json
{
  "objetivoDia": { "proteina_g": 170, "grasa_g": 70, "carbohidratos_g": 300 },
  "resultadoDia": { "proteina_g": 171, "grasa_g": 69, "carbohidratos_g": 302, "kcal": 2496 },
  "desviaciones": { "proteina_g": 1, "grasa_g": -1, "carbohidratos_g": 2 },
  "dentroDeMargen": true,
  "anadidos": ["item_pan_010"]
}
```

---

## Reglas nutricionales

- Las equivalencias son aproximadas, no idénticas.
- Los carbohidratos se igualan por gramos de carbohidratos.
- Las proteínas se igualan por gramos de proteína.
- Las grasas se igualan por gramos de grasa.
- El cálculo interno cuenta todos los macros de cada alimento, incluidos los secundarios.
- Las cantidades se redondean para cocina, normalmente a múltiplos de 5 g.
- Los alimentos mixtos pueden aparecer como alternativas compuestas preajustadas.
- Los valores del catálogo corresponden siempre al estado de pesado indicado en *Reglas de pesado*. Un alimento con valores de otro estado (por ejemplo, pollo cocinado en un catálogo en crudo) es un error de datos.
- **Planes por bloques de macro (`carbohidrato`, `proteina`, `grasa`):** el constructor compensa el bloque de grasa basándose en lo ya aportado por los bloques de carbohidrato y proteína. Los bloques de carbohidrato y proteína se calculan primero contra su objetivo bruto; la grasa se calcula después, con el objetivo ajustado = objetivo de grasa de la comida − grasa ya aportada por las alternativas por defecto de carbohidrato y proteína. Este objetivo ajustado nunca baja de un mínimo práctico (5 g). Esta compensación es un dato de cálculo, no forma parte del árbol del plan.
- **Planes por platos (`plato`):** no usan la compensación de grasa por comida; el ajuste lo hace el generador sobre el total del día.

---

## Reglas de pesado

- Arroz, pasta, avena, quinoa y cuscús: peso en seco.
- Patata y boniato: peso en crudo.
- Carne y pescado: peso en crudo.
- Conservas: peso escurrido.
- Pan, fruta, lácteos, frutos secos y aceite: tal como se consumen.

---

## Vista cliente

El cliente puede:

- Elegir una alternativa por bloque de carbohidrato, proteína, grasa y plato.
- Leer extras e instrucciones de pesado.
- Marcar una comida como realizada.

El cliente no ve:

- Kcal
- Macros
- Márgenes ni tolerancias
- Fórmulas
- Avisos técnicos
- Marca de alimento añadido
- Ajustes internos del entrenador

---

## Registro de adherencia

```json
{
  "fecha": "2026-09-01",
  "diaId": "dia_lunes",
  "comidaId": "comida_lunes_comida",
  "elecciones": {
    "bloque_lunes_comida_carbo": "alt_lunes_comida_carbo_arroz",
    "bloque_lunes_comida_proteina": "alt_lunes_comida_proteina_pollo",
    "bloque_lunes_comida_grasa": "alt_lunes_comida_grasa_aove"
  },
  "completada": true,
  "completadaEn": "2026-09-01T18:49:00Z"
}
```

**El historial de adherencia referencia IDs del plan tal como existía en el momento del registro; no se recalcula ni se repara si el plan cambia después.** Si el entrenador edita o elimina una alternativa que un cliente ya había elegido en el pasado, el registro histórico permanece intacto y sigue apuntando a ese id, aunque ya no exista en la versión actual del plan. Ninguna función de v2 debe intentar "reparar" referencias huérfanas en el historial.

---

## Prohibido en v2

V2 no depende de:

- Tallas S/M/L
- Objetivos ocultos por franja o por comida
- Reescalados o recálculos automáticos fuera de una acción explícita del entrenador (generar o recalcular)
- Reconstrucciones automáticas de `items` sobre un plan ya guardado
- Conversión inconsistente entre `key`/`foodKey`
- Pérdida silenciosa de ingredientes
- Normalización silenciosa de valores de `tipo` fuera del enum cerrado
- Reparación automática de referencias huérfanas en el historial de adherencia

---

## Historial de cambios

**23-sep-2026**

- Se permite el generador de día completo y el reescalado de cantidades, solo como acción explícita del entrenador. Antes estaban prohibidos.
- El objetivo pasa a macros del día, con margen ±3 g (proteína y grasa) y ±5 g (carbohidratos) sobre el total del día. Las kcal son secundarias y sin margen duro.
- Cada alimento del plato sube hasta su ración máxima actual (`racion_maxima_g` / `racion_maxima_unidades`); si ya está en el tope y falta, se añade otro alimento de la misma franja y del mismo macro.
- Nuevo tipo de bloque `plato` en el enum cerrado.
- Nuevo campo opcional `origen` en los items (`plato` | `anadido`) para marcar los alimentos que añade el generador.
- La compensación de grasa por comida queda solo para planes por bloques de macro.
- Se mantiene la regla de que la desviación de macros es un aviso, no un error de validación.
