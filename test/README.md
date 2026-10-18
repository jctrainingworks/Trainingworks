# test/ — zona de pruebas del motor de nutrición

Creada el 16-oct-2026. Aquí se construye y se prueba el motor de nutrición nuevo **sin tocar prueba/ ni app/ originales**, que son los que usan los clientes.

## Qué tiene que hacer el motor (en una frase)

Juan marca los alimentos que quiere para cada bloque y cada comida (hasta 8 por bloque). **Cada alimento se reescala solo**, y el cliente, elija el que elija, ve cantidades que le hacen llegar al **total diario** de proteína, carbohidratos y grasa.

## Cómo funciona

- **Todo reescala, sin excepciones.** Carbohidrato, proteína, grasa, fruta y para acompañar funcionan igual. Cada alimento aporta los tres macros, y el motor ajusta las cantidades para que el día cuadre.
- **Manda el total del día.** No importa cuánto se pase o se quede corta una comida, importa que el día llegue.
- **El cliente elige alimentos, no gramos.** Las cantidades se calculan solas. Hay unidades enteras para huevos, plátanos y similares, y los gramos se redondean a 5.
- **Límites.** Nunca se supera la ración máxima del Gestor, ni se baja del mínimo (1 unidad o un tercio del tope).
- **Un bloque puede llevar 2 alimentos.** El reparto por defecto es 50/50.

## Qué tiene que pasar la prueba

La prueba usa **los alimentos que Juan ha elegido**, no una lista genérica. Simula miles de días en los que el cliente elige al azar entre ellos y comprueba que el total del día de cada macro llega al objetivo.

- **Se espera el 100 % de los días dentro del margen (±10 %).** Si algún día falla, el informe dice qué comida, qué alimento está en su tope y qué hacer (otro alimento que aporte más, subir su ración máxima o repartir el día en más comidas). Un fallo nunca se esconde.
- **Si algún alimento no deja llegar al total del día, la prueba lo dice con su nombre.**

## Qué hay en la carpeta

| Carpeta | Qué es |
|---|---|
| **nutricion/motor-nutricion.js** | **El motor único.** Solo hace cálculo. Cuando Juan lo apruebe, se conecta a prueba/ y app/ reales. |
| **nutricion/motor-nutricion.test.mjs** | Pruebas automáticas. |
| **prueba/** | Copia del panel (14-oct-2026 + commit 2d2a8ac). Carga el motor y tiene la tarjeta «🧪 Probador nuevo», debajo del probador viejo. Solo cambia código de nutrición. |
| **app/** | Copia de la app del cliente, para probar el motor ahí. |

Para ejecutar las pruebas (DIAS y SEMILLA son opcionales):

```
node test/nutricion/motor-nutricion.test.mjs
DIAS=3000 SEMILLA=777 node test/nutricion/motor-nutricion.test.mjs
```

## Estado (16-oct-2026, tarde)

**Hecho (motor 1.1.0, solo dentro de test/ y la regla en REGLAS-NUTRICION.md con el OK de Juan):**

1. Fruta y para acompañar **reescalan como el resto** (tope duro y mínimo incluidos). Sus carbos fijados por Juan son una guía suave de tamaño, no una porción fija.
2. Leche, yogur natural, crema de cacahuete y queso en lonchas **también pueden ser proteína o grasa** (listas de candidatos de `test/prueba`; el motor acepta cualquier alimento que aporte el macro).
3. Las pruebas tienen la sección **2e**: con `test/nutricion/plan-juan.json` exigen el **100 %** de días. Ese archivo sale del botón **«📋 Copiar datos para pruebas»** de la tarjeta Probador nuevo (objetivo real + alimentos marcados + datos reales del Gestor). Sin el archivo, la 2e solo informa, con datos estimados para los alimentos que no están en el catálogo de archivo.
4. La regla de fruta y acompañar de REGLAS-NUTRICION.md ya no dice «porción fija».

**Cambio del 18-oct-2026 (motor 1.5.0, pedido por Juan):**

1. **El alimento que el cliente elige como carbohidrato, proteína o grasa NUNCA desaparece.** Puede bajar hasta su mínimo (1/3 de su ración máxima), pero no quitarse. Antes el motor lo apartaba («no entra») cuando el día se pasaba o cuando fruta y acompañante se comían su sitio (en 353 de 400 días simulados con el plan de Juan se perdía algún principal; ahora 0).
2. **Fruta y «para acompañar» completan, no sustituyen.** Si el cliente los elige, bajan las cantidades del resto de la comida (arroz 80 g → 55 g con plátano → 40 g con plátano y mermelada), pero el arroz sigue. Si fruta o acompañante no caben sin dejar un principal por debajo de su mínimo, es la fruta / el acompañante lo que no entra, y el resultado trae un aviso (`avisos` tipo `extra`, y `extrasFuera`).
3. **Se quitaron los postres.** Si el día no llega no se añade nada: el aviso dice con números qué falla y, si el día se pasa porque hay alimentos en su mínimo, qué alimentos son y qué hacer (`avisos` tipo `minimos`, y `minimos`). `postres-juan.json` queda sin usar (no se borra).

**Coste medido (hay que decidirlo con Juan):** como ya no se esconden problemas quitando alimentos, caen los días que cuadran dentro de ±10 %. Plan real de Juan (3 comidas, platos con lógica, 1500 días al azar): **antes 86,7 %, ahora 59,7 %** (con mezcla libre: 85,5 % → 63,1 %). Con margen ±15 % sube a 68 % y con ±20 % a 76 %. Los 6 clientes genéricos de la sección 1 de las pruebas bajan de ≥ 99 % a entre el 47 y el 75 %. Las pruebas que exigen ≥ 99 % / 100 % están en rojo A PROPÓSITO: reflejan el estado real, no se han cambiado los listones. Opciones (todas de Juan): revisar qué alimentos deja en cada bloque (los flojos topan), subir/bajar raciones máximas (bajar el tope baja también el mínimo), margen más holgado, o más comidas.


**Falta:** que Juan pruebe el Probador nuevo en `test/prueba` y diga si aprueba el ajuste del día. Nada está conectado a `prueba/` ni a `app/`.

## Ver cómo elegirá el cliente (tu pantalla real con el motor nuevo, 17-oct-2026)

En el panel de test, tarjeta **«Probador nuevo» → «📱 Ver en la app de prueba»**: abre `test/app/?motorNuevo=1` con el plan marcado en el panel. Es **la misma pantalla de nutrición que ve el cliente** (`NutricionViewV4`, diseño NV5: una comida por pantalla, fotos, «Cambiar» → «¿Qué te apetece comer?»). Lo único distinto es que las cantidades las calcula `test/nutricion/motor-nutricion.js` en el momento (al cambiar un alimento se recalcula el día entero) (ya no hay postres desde el 18-oct-2026). Arriba hay una caja «SOLO EN LA PRUEBA» con el total del día y botones 🎲 Al azar / ↺ Reiniciar.

- **Platos con lógica:** al cambiar un alimento solo se ofrecen los que tienen sentido; si el nuevo no combina con el resto de la comida (p. ej. pan blanco con pechuga de pollo), se ajusta el resto al plato que sí lo lleva (bocadillo → jamón) y avisa.
- **No usa Supabase ni login y no guarda nada:** el plan pasa por `localStorage` (misma web, mismo navegador). Sin `?motorNuevo=1` la app arranca exactamente igual que antes.
- **Código:** `nv6*` y `MotorNuevoApp` en `test/app/index.html` (más 6 retoques dentro de `NutricionViewV4`, todos condicionados a `dias[0].motorNuevo`).
- **Verificado** cargando la app completa en jsdom (React + Babel + motor): pantalla real, «Cambiar», 25 combinaciones al azar (25/25 cuadran, sin errores) (verificación del 17-oct, con el motor anterior; con el motor 1.5.0 algunos días flojos ya no cuadran y se avisa).
- **Limitaciones conocidas:** (1) un alimento por bloque (la «mezcla de 2» de la pantalla real aún no está conectada); (2) desde el 18-oct-2026 el bloque de hidratos ya no sale «ya cubiertos»: si fruta + acompañante no caben con el alimento principal, es la fruta o el acompañante lo que no entra (con aviso).

## Aviso

⚠️ **Las copias usan el mismo Supabase real.** Probar el panel o la app desde test/ lee y escribe datos reales (planes, clientes). Para probar sin riesgo, usa solo el cliente de pruebas.

Las reglas siguen en **REGLAS-NUTRICION.md** (raíz). Las copias de test/prueba y test/app solo se cambian en código de nutrición; lo demás queda igual que el original.
