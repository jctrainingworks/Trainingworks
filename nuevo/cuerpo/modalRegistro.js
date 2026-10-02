// Cuerpo · modal "＋ Añadir registro": peso + perímetros a mano. Es lo que antes se rellenaba en la
// pestaña Objetivo de Nutrición; aquí se calcula la composición (si hay altura y edad en la ficha y
// están las medidas necesarias) y se guarda en seguimiento_corporal.
import { calcularComposicionDesdeEntry } from './calculos.js';

const CAMPOS = [
  ['peso', 'Peso (kg) *', 'Ej. 78.4'],
  ['abdomen', 'Abdomen (cm)', ''], ['cuello', 'Cuello (cm)', ''], ['brazo', 'Brazo (cm)', ''],
  ['antebrazo', 'Antebrazo (cm)', ''], ['cadera', 'Cadera / Nalgas (cm)', ''],
  ['muslo', 'Muslo (cm)', ''], ['pantorrilla', 'Pantorrilla (cm)', '']
];
const num = v => (v === '' || v == null ? null : Number(String(v).replace(',', '.')));

// Fecha de hoy en local (no UTC: pasada la medianoche toISOString daría el día anterior).
export function fechaLocalISO(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Construye la fila a guardar a partir de los valores del formulario. Devuelve { fila, composicion }.
export function filaDesdeFormulario(valores, cliente) {
  const fila = {
    cliente_id: cliente.id, fecha: fechaLocalISO(), origen: 'nutricion',
    peso: num(valores.peso), cuello: num(valores.cuello), brazo: num(valores.brazo), antebrazo: num(valores.antebrazo),
    abdomen: num(valores.abdomen), cadera: num(valores.cadera), muslo: num(valores.muslo), pantorrilla: num(valores.pantorrilla),
    anos_entreno: cliente.anos_entreno != null && cliente.anos_entreno !== '' ? Number(cliente.anos_entreno) : null,
    activo4h: valores.activo4h === 'si' ? 'si' : 'no'
  };
  fila.composicion = fila.peso && fila.abdomen ? calcularComposicionDesdeEntry(fila, cliente) : null;
  return fila;
}

export function abrirModalRegistro({ ui, cliente, guardar }) {
  return ui.formulario({
    titulo: '＋ Añadir registro',
    subtitulo: `Medidas de ${cliente.nombre || 'este cliente'} (hoy). Si ya hay un registro de hoy, se actualiza.`,
    aceptar: 'Guardar',
    campos: [
      // Texto y no number: en el iPad se escribe con coma (68,4) y un input number la rechazaría.
      ...CAMPOS.map(([id, etiqueta, placeholder]) => ({ id, etiqueta, tipo: 'text', placeholder })),
      { id: 'activo4h', etiqueta: '¿Entrena +4h/semana?', tipo: 'select', valor: 'no', opciones: [{ valor: 'no', etiqueta: 'No' }, { valor: 'si', etiqueta: 'Sí' }] }
    ],
    alEnviar: async valores => {
      const peso = num(valores.peso), abdomen = num(valores.abdomen);
      if (!(peso > 0) && !(abdomen > 0)) throw new Error('Pon al menos el peso o el abdomen.');
      for (const [id, etiqueta] of CAMPOS) {
        const v = num(valores[id]);
        if (v != null && !(v > 0)) throw new Error(`${etiqueta.replace(' *', '')}: tiene que ser un número mayor que 0.`);
      }
      await guardar(filaDesdeFormulario(valores, cliente));
    }
  });
}
