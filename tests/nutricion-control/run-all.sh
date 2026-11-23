#!/bin/sh
# Ejecuta las tres baterías de la fase 1 (necesita: cd tests/nutricion-control && npm install). Sale con error si falla cualquiera.
cd "$(dirname "$0")" && node generar-consola.js >/dev/null && node matematica.test.js && node diagnostico.test.js && node integridad.test.js && node panel.test.js && node marcador.test.js && node vista-previa.test.js && node casilla.test.js
