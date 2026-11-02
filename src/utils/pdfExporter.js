import html2pdf from 'html2pdf.js';

/**
 * High-definition PDF Exporter for Khmer Administrative Documents (A4 Standard)
 * Uses high-scale canvas rendering (scale: 2) to preserve crisp Khmer cursive & typography.
 */
export async function exportElementToPdf(elementOrSelector, filename = 'document.pdf') {
  const element = typeof elementOrSelector === 'string'
    ? document.querySelector(elementOrSelector)
    : elementOrSelector;

  if (!element) {
    console.error('Element to export to PDF was not found:', elementOrSelector);
    throw new Error('រកមិនឃើញផ្ទាំងឯកសារសម្រាប់ទាញយកជា PDF ឡើយ');
  }

  const opt = {
    margin: [0, 0, 0, 0], // The document already contains authentic 16mm margins
    filename: filename.endsWith('.pdf') ? filename : `${filename}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: {
      scale: 2, // 2x scale guarantees high-res rendering for Khmer diacritics
      useCORS: true,
      letterRendering: true,
      logging: false,
      scrollX: 0,
      scrollY: 0,
      windowWidth: element.scrollWidth || 794 // Standard A4 ~794px at 96 DPI
    },
    jsPDF: {
      unit: 'mm',
      format: 'a4',
      orientation: 'portrait'
    },
    pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
  };

  try {
    return await html2pdf().set(opt).from(element).save();
  } catch (err) {
    console.error('Error generating PDF:', err);
    throw err;
  }
}
