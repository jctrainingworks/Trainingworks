// Iconos de modalidad (copiados tal cual del panel actual).
export const ICONO_ONLINE = `<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" style="color:#1e90ff;flex-shrink:0;"><path d="M20 3H4c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h3l-1 1v1h12v-1l-1-1h3c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 13H4V5h16v11z"/></svg>`;
export const ICONO_PRESENCIAL = `<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" style="color:#ff9500;flex-shrink:0;"><path d="M20.57 14.86L22 13.43 20.57 12 17 15.57 8.43 7 12 3.43 10.57 2 9.14 3.43 7.71 2 5.57 4.14 4.14 2.71 2.71 4.14l1.43 1.43L2 7.71l1.43 1.43L2 10.57 3.43 12 7 8.43 15.57 17 12 20.57 13.43 22l1.43-1.43L16.29 22l2.14-2.14 1.43 1.43 1.43-1.43-1.43-1.43L22 16.29z"/></svg>`;

// Iconos de las pestañas de la ficha (copiados de TAB_SVG de prueba/index.html). La clave es el id de la pestaña.
const tsvg = d => `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
export const ICONOS_PESTANA = {
  datos: tsvg('<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1M8.5 10h7M8.5 14h7M8.5 18h4"/>'),
  rutinas: tsvg('<path d="M2 12h3M19 12h3M5 8v8M8 6v12M16 6v12M19 8v8M8 12h8"/>'),
  periodizacion: tsvg('<rect x="3" y="5" width="18" height="15" rx="2"/><path d="M3 10h18M8 3v4M16 3v4M7 15h4M13 15h4"/>'),
  cardio: tsvg('<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/><path d="M7 12h3l1.5-2.5 2 4 1.5-1.5h2"/>'),
  historial: tsvg('<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'),
  etapas: tsvg('<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>'),
  volumen: tsvg('<path d="M12 3l9 5-9 5-9-5 9-5z"/><path d="M3 12.5l9 5 9-5M3 17l9 5 9-5"/>'),
  cuerpo: tsvg('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2"/>'),
  suplementos: tsvg('<rect x="3" y="9" width="18" height="7" rx="3.5" transform="rotate(-35 12 12.5)"/><path d="M9.5 8.5l5 5" transform="rotate(0)"/>'),
  avisos: tsvg('<path d="M4 10v4h3l7 4V6L7 10H4zM17 9.5a4 4 0 0 1 0 5"/>')
};
