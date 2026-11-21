// PDF directo desde un HTML de una hoja (#pdfSheet): html2canvas + jsPDF. Réplica de descargarPdfDesdeHtml de prueba/index.html.
import { cargarScript } from './ui.js';

export async function descargarPdfDesdeHtml(html, nombreArchivo) {
  if (!window.html2canvas) await cargarScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
  if (!(window.jspdf && window.jspdf.jsPDF)) await cargarScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
  const reScript = new RegExp('<scr' + 'ipt>[\\s\\S]*?</scr' + 'ipt>');
  const htmlCaptura = html.replace(reScript, '').replace('</style>', '.sheet{margin:0!important;box-shadow:none!important;}</style>');
  const fr = document.createElement('iframe');
  fr.setAttribute('aria-hidden', 'true');
  fr.style.cssText = 'position:fixed;left:-10000px;top:0;width:794px;height:1123px;border:0;visibility:hidden;';
  document.body.appendChild(fr);
  try {
    await new Promise((resolve, reject) => { fr.onload = resolve; fr.onerror = reject; fr.srcdoc = htmlCaptura; });
    const doc = fr.contentDocument;
    const fuentes = (doc.fonts && doc.fonts.ready) ? doc.fonts.ready : Promise.resolve();
    await Promise.race([fuentes, new Promise(r => setTimeout(r, 3000))]);
    await new Promise(r => setTimeout(r, 250));
    const hoja = doc.getElementById('pdfSheet');
    const canvas = await window.html2canvas(hoja, { scale: 2.5, backgroundColor: '#161B23', useCORS: true, logging: false, windowWidth: 794, windowHeight: 1123 });
    const pdf = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true });
    pdf.addImage(canvas.toDataURL('image/jpeg', 0.93), 'JPEG', 0, 0, 210, 297);
    pdf.save(nombreArchivo);
  } finally {
    fr.remove();
  }
}

// Si el PDF directo falla, se abre el HTML en una pestaña nueva (se imprime desde ahí).
export function abrirHtmlEnVentana(html) {
  const win = window.open('', '_blank');
  if (!win) return false;
  win.document.write(html);
  win.document.close();
  return true;
}
