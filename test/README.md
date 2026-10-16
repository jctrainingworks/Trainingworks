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

## Estado (16-oct-2026)

**El motor todavía no cumple lo de arriba.** Falta:

1. Que fruta y para acompañar reescalen como el resto. Hoy el motor los trata como una porción fija que no toca.
2. Que los alimentos que hoy solo pueden ser "para acompañar" (leche, yogur natural, crema de cacahuete, queso en lonchas) puedan servir también de proteína o grasa.
3. Que las pruebas comprueben el 100 % con los alimentos elegidos, no solo un 99 % con los 8 premarcados.
4. Cambiar la regla de fruta y acompañar de REGLAS-NUTRICION.md, que todavía dice «porción fija». Esa hoja solo la cambia Juan.

## Aviso

⚠️ **Las copias usan el mismo Supabase real.** Probar el panel o la app desde test/ lee y escribe datos reales (planes, clientes). Para probar sin riesgo, usa solo el cliente de pruebas.

Las reglas siguen en **REGLAS-NUTRICION.md** (raíz). Las copias de test/prueba y test/app solo se cambian en código de nutrición; lo demás queda igual que el original.
