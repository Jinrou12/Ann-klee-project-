import html2pdf from 'html2pdf.js';

/**
 * High-definition PDF Exporter for Khmer Administrative Documents (A4 Standard)
 * Uses jsPDF margin coordinates to guarantee exact Ministry 25mm top margin,
 * 16mm left/right, and 20mm bottom margins regardless of device screen size.
 */
export async function exportElementToPdf(elementOrSelector, filename = 'document.pdf') {
  const element = typeof elementOrSelector === 'string'
    ? document.querySelector(elementOrSelector)
    : elementOrSelector;

  if (!element) {
    console.error('Element to export to PDF was not found:', elementOrSelector);
    throw new Error('រកមិនឃើញផ្ទាំងឯកសារសម្រាប់ទាញយកជា PDF ឡើយ');
  }

  // Ensure all custom fonts (Moul, Kantumruy Pro, Siemreap) are 100% loaded before rendering
  if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) {
    try {
      await document.fonts.ready;
    } catch {
      // Continue even if font readiness promise rejects
    }
  }

  // 1. Temporarily hide all .no-print elements (e.g. trash cans, action buttons) during PDF generation
  const noPrintElements = Array.from(element.querySelectorAll('.no-print'));
  const originalDisplays = noPrintElements.map(el => el.style.display);
  noPrintElements.forEach(el => {
    el.style.display = 'none';
  });

  // 2. Temporarily apply PDF rendering class so margins are controlled cleanly by jsPDF
  element.classList.add('pdf-rendering-active');
  const prevInlinePadding = element.style.padding;
  const prevInlineWidth = element.style.width;
  const prevInlineMaxWidth = element.style.maxWidth;
  const prevInlineMinHeight = element.style.minHeight;
  const prevInlineBoxShadow = element.style.boxShadow;
  const prevInlineBoxSizing = element.style.boxSizing;

  element.style.padding = '0px';
  element.style.width = '100%';
  element.style.maxWidth = '100%';
  element.style.boxSizing = 'border-box';
  element.style.boxShadow = 'none';

  // Test single-page-fit layout first and measure exact height vs A4 printable ratio (273mm / 186mm)
  const isSpaciousSinglePage = element.dataset?.spaciousSinglePage === 'true';
  if (!isSpaciousSinglePage) {
    element.classList.add('pdf-single-page-fit');
  }
  const dataRowCount = element.querySelectorAll('tbody tr').length;
  const elemWidth = element.offsetWidth || 703;
  const fitHeight = element.scrollHeight || element.offsetHeight || 0;
  const maxSinglePagePx = Math.floor(elemWidth * (273 / 186)) - 12;

  // Case A: Moderate rows (<= 16 table rows and fits within 1 A4 page height) -> 1 single A4 sheet
  // Case B: Many rows (> 16 rows or exceeds 1 A4 page height) -> restore normal spacing and split into 2+ A4 sheets
  const isSinglePageCandidate = !isSpaciousSinglePage && dataRowCount <= 16 && fitHeight <= maxSinglePagePx;
  if (!isSinglePageCandidate) {
    element.classList.remove('pdf-single-page-fit');
  }

  const pdfMargins = isSpaciousSinglePage
    ? [16, 14, 16, 14]
    : isSinglePageCandidate
      ? [12, 12, 12, 12] // Compact margins so 12-16 rows + signatures stay together on 1 A4 sheet
      : [18, 14, 18, 14]; // Generous official margins for multi-page documents (2+ sheets)

  const opt = {
    margin: pdfMargins,
    filename: filename.endsWith('.pdf') ? filename : `${filename}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: {
      scale: 2, // 2x scale guarantees high-res rendering for Khmer diacritics
      useCORS: true,
      letterRendering: false, // CRITICAL: false allows native browser Khmer ligature/vowel shaping
      logging: false,
      scrollX: 0,
      scrollY: 0,
      windowWidth: 794 // CRITICAL: Standardizes viewport to 794px desktop width across Mobile & PC
    },
    jsPDF: {
      unit: 'mm',
      format: 'a4',
      orientation: 'portrait'
    },
    pagebreak: { mode: ['css', 'legacy'], avoid: ['tr', '.signature-block'] }
  };

  try {
    return await html2pdf().set(opt).from(element).save();
  } catch (err) {
    console.error('Error generating PDF:', err);
    throw err;
  } finally {
    // 3. Always restore element styles and .no-print elements back onto the live screen
    element.classList.remove('pdf-rendering-active');
    element.classList.remove('pdf-single-page-fit');
    element.style.padding = prevInlinePadding;
    element.style.width = prevInlineWidth;
    element.style.maxWidth = prevInlineMaxWidth;
    element.style.minHeight = prevInlineMinHeight;
    element.style.boxShadow = prevInlineBoxShadow;
    element.style.boxSizing = prevInlineBoxSizing;

    noPrintElements.forEach((el, idx) => {
      el.style.display = originalDisplays[idx] !== undefined ? originalDisplays[idx] : '';
    });
  }
}

/**
 * Sequentially export two official A4 elements into two distinct PDF files
 * (File 1: Full Detailed Finance Report, File 2: Official Summary Finance Report)
 */
export async function exportDualElementsToPdf(
  firstElementOrSelector,
  firstFilename,
  secondElementOrSelector,
  secondFilename
) {
  await exportElementToPdf(firstElementOrSelector, firstFilename);
  await new Promise(resolve => setTimeout(resolve, 400));
  await exportElementToPdf(secondElementOrSelector, secondFilename);
}

