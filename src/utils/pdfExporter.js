import html2pdf from 'html2pdf.js';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

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

  // Save current scroll position and reset to (0, 0) during capture so html2canvas never offsets by window.scrollY
  const savedScrollX = typeof window !== 'undefined' ? (window.scrollX || window.pageXOffset || 0) : 0;
  const savedScrollY = typeof window !== 'undefined' ? (window.scrollY || window.pageYOffset || 0) : 0;
  if (typeof window !== 'undefined') {
    window.scrollTo(0, 0);
  }

  // Special High-Precision Multi-Page A4 Sheet Exporter (for OfficialAdminReportDocument)
  // Renders each discrete 794x1123 `.admin-a4-page-sheet` onto its own 210x297mm A4 PDF page
  // preserving full-bleed background watermarks, bottom page numbers, and 0% cut-off text.
  const discreteSheets = Array.from(element.querySelectorAll('.admin-a4-page-sheet'));
  if (discreteSheets.length > 0) {
    const finalFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;

    try {
      // Ensure all watermark/embedded images inside sheets are loaded
      const imgs = Array.from(element.querySelectorAll('img'));
      await Promise.all(
        imgs.map(img =>
          img.complete
            ? Promise.resolve()
            : new Promise(resolve => {
                img.onload = resolve;
                img.onerror = resolve;
              })
        )
      );

      const pdf = new jsPDF({
        unit: 'mm',
        format: 'a4',
        orientation: 'portrait'
      });

      for (let idx = 0; idx < discreteSheets.length; idx++) {
        const sheet = discreteSheets[idx];
        const prevShadow = sheet.style.boxShadow;
        const prevRadius = sheet.style.borderRadius;
        sheet.style.boxShadow = 'none';
        sheet.style.borderRadius = '0px';

        try {
          const canvas = await html2canvas(sheet, {
            scale: 2,
            useCORS: true,
            letterRendering: false,
            logging: false,
            backgroundColor: '#ffffff',
            width: 794,
            height: 1123
          });

          if (idx > 0) {
            pdf.addPage('a4', 'portrait');
          }
          pdf.setPage(idx + 1);
          const imgData = canvas.toDataURL('image/jpeg', 0.98);
          pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);
        } finally {
          sheet.style.boxShadow = prevShadow;
          sheet.style.borderRadius = prevRadius;
        }
      }

      pdf.save(finalFilename);
      return;
    } finally {
      if (typeof window !== 'undefined') {
        window.scrollTo(savedScrollX, savedScrollY);
      }
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
    if (typeof window !== 'undefined') {
      window.scrollTo(savedScrollX, savedScrollY);
    }
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
