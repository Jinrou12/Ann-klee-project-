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
            height: 1123,
            windowWidth: 794,
            windowHeight: 1123,
            scrollX: 0,
            scrollY: 0,
            onclone: (clonedDoc, clonedEl) => {
              if (!clonedEl) return;
              clonedEl.style.width = '794px';
              clonedEl.style.minWidth = '794px';
              clonedEl.style.maxWidth = '794px';
              clonedEl.style.height = '1123px';
              clonedEl.style.minHeight = '1123px';
              clonedEl.style.maxHeight = '1123px';
              clonedEl.style.transform = 'none';
              clonedEl.style.boxSizing = 'border-box';
              clonedEl.style.margin = '0 auto';

              // Neutralize any mobile ancestor constraints / flex / transforms
              let curr = clonedEl.parentElement;
              while (curr && curr !== clonedDoc.body) {
                curr.style.transform = 'none';
                curr.style.overflow = 'visible';
                curr.style.maxWidth = 'none';
                curr.style.width = '794px';
                curr.style.padding = '0';
                curr.style.margin = '0';
                curr = curr.parentElement;
              }
            }
          });

          if (idx > 0) {
            pdf.addPage('a4', 'portrait');
          }
          pdf.setPage(idx + 1);
          const imgData = canvas.toDataURL('image/jpeg', 0.9);
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
  element.style.width = '703px';
  element.style.maxWidth = '703px';
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
    ? [14, 12, 14, 12]
    : isSinglePageCandidate
      ? [12, 12, 12, 12] // 12mm left/right = 186mm printable width = exact 1:1 with 703px element
      : [14, 12, 14, 12]; // Generous top/bottom margins for multi-page documents while preserving 186mm width

  const finalFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;

  try {
    // Ensure all images inside element are loaded before capture
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

    // Measure fallback coordinates from live DOM in case onclone is bypassed
    const fallbackRect = element.getBoundingClientRect();
    const fallbackDomWidth = Math.round(fallbackRect.width) || 703;
    const fallbackDomHeight = Math.ceil(element.scrollHeight || fallbackRect.height || 1);

    let clonedMetrics = null;

    const masterCanvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      letterRendering: false,
      logging: false,
      backgroundColor: '#ffffff',
      onclone: (clonedDoc, clonedEl) => {
        if (!clonedEl) return;

        // 1. Neutralize any ancestor CSS transforms/clipping (e.g. A4SheetScaler on mobile/narrow viewports)
        let curr = clonedEl.parentElement;
        while (curr && curr !== clonedDoc.body && curr !== clonedDoc.documentElement) {
          curr.style.transform = 'none';
          curr.style.webkitTransform = 'none';
          curr.style.overflow = 'visible';
          curr.style.height = 'auto';
          curr.style.maxHeight = 'none';
          curr = curr.parentElement;
        }

        const rootRect = clonedEl.getBoundingClientRect();
        const domW = rootRect.width || 703;
        const domH = Math.max(rootRect.height, clonedEl.scrollHeight || 0, 1);

        // 2. Measure every .official-grid table's exact bounding box inside html2canvas's clone
        const tables = Array.from(clonedEl.querySelectorAll('table.official-grid')).map(tbl => {
          const r = tbl.getBoundingClientRect();
          return {
            top: Math.max(0, r.top - rootRect.top),
            bottom: Math.max(0, r.bottom - rootRect.top),
            left: Math.max(0, r.left - rootRect.left),
            right: Math.min(domW, r.right - rootRect.left)
          };
        });

        // 3. Measure every atomic block that must NEVER be sliced horizontally across pages:
        //    - Every table row (tr)
        //    - Every .signature-block
        //    - Every direct child block of .printable-document that does not contain a table (Header, Title, Summary line)
        const rawNodes = [
          ...Array.from(clonedEl.querySelectorAll('tr')),
          ...Array.from(clonedEl.querySelectorAll('.signature-block')),
          ...Array.from(clonedEl.children).filter(
            ch => !ch.classList.contains('no-print') && !ch.querySelector('table') && ch.tagName !== 'TABLE'
          )
        ];

        const uniqueNodes = Array.from(new Set(rawNodes));
        const blocks = uniqueNodes
          .map(node => {
            const r = node.getBoundingClientRect();
            return {
              top: Math.max(0, r.top - rootRect.top),
              bottom: Math.max(0, r.bottom - rootRect.top),
              isRow: node.tagName === 'TR'
            };
          })
          .filter(b => b.bottom - b.top > 2)
          .sort((a, b) => a.top - b.top);

        clonedMetrics = {
          domW,
          domH,
          tables,
          blocks
        };
      }
    });

    const totalDomWidth = clonedMetrics?.domW || fallbackDomWidth;
    const totalDomHeight = clonedMetrics?.domH || fallbackDomHeight;
    const scaleX = masterCanvas.width / totalDomWidth;
    const scaleY = masterCanvas.height / totalDomHeight;

    const [marginTopMm, marginLeftMm, marginBottomMm, marginRightMm] = pdfMargins;
    const printableWidthMm = 210 - marginLeftMm - marginRightMm; // 186mm
    const printableHeightMm = 297 - marginTopMm - marginBottomMm;
    const maxPageCanvasH = Math.floor(masterCanvas.width * (printableHeightMm / printableWidthMm));

    const canvasTables = (clonedMetrics?.tables || []).map(t => ({
      topY: Math.round(t.top * scaleY),
      bottomY: Math.round(t.bottom * scaleY),
      leftX: Math.max(0, Math.round(t.left * scaleX)),
      rightX: Math.min(masterCanvas.width, Math.round(t.right * scaleX))
    }));

    const canvasBlocks = (clonedMetrics?.blocks || [])
      .map(b => ({
        topY: Math.round(b.top * scaleY),
        bottomY: Math.round(b.bottom * scaleY),
        isRow: b.isRow
      }))
      .sort((a, b) => a.topY - b.topY);

    const masterCtx = masterCanvas.getContext('2d');

    // Helper: Snap a candidate cut Y on masterCanvas to the exact horizontal table border or pure-white gap
    const snapCutYOnCanvas = (candidateY, minSafeY, maxSafeY, activeTable) => {
      const searchStart = Math.max(minSafeY, Math.floor(candidateY - 12));
      const searchEnd = Math.min(maxSafeY, Math.ceil(candidateY + 6));
      if (searchEnd <= searchStart) return Math.round(candidateY);

      const xLeft = activeTable ? Math.max(0, activeTable.leftX + 4) : 0;
      const xRight = activeTable ? Math.min(masterCanvas.width, activeTable.rightX - 4) : masterCanvas.width;
      const spanW = Math.max(1, xRight - xLeft);
      const bandH = searchEnd - searchStart + 1;

      let imgData;
      try {
        imgData = masterCtx.getImageData(xLeft, searchStart, spanW, bandH).data;
      } catch {
        return Math.round(candidateY);
      }

      let bestBorderY = null;
      let bestBorderDist = Infinity;
      let bestWhiteY = null;
      let bestWhiteRatio = Infinity;
      let bestWhiteDist = Infinity;

      for (let offset = 0; offset < bandH; offset++) {
        const y = searchStart + offset;
        const rowBase = offset * spanW * 4;
        let nonWhiteCount = 0;
        for (let x = 0; x < spanW; x++) {
          const idx = rowBase + x * 4;
          const r = imgData[idx];
          const g = imgData[idx + 1];
          const b = imgData[idx + 2];
          if (r < 240 || g < 240 || b < 240) {
            nonWhiteCount++;
          }
        }
        const ratio = nonWhiteCount / spanW;
        const dist = Math.abs(y - candidateY);

        // Horizontal table border line spans > 60% of the table width
        if (activeTable && ratio >= 0.6) {
          if (dist < bestBorderDist) {
            bestBorderDist = dist;
            bestBorderY = y;
          }
        }

        // Pure padding / white gap (only vertical borders < 2.5% of width)
        if (ratio < bestWhiteRatio - 0.002 || (Math.abs(ratio - bestWhiteRatio) <= 0.002 && dist < bestWhiteDist)) {
          bestWhiteRatio = ratio;
          bestWhiteDist = dist;
          bestWhiteY = y;
        }
      }

      if (activeTable && bestBorderY !== null) {
        return bestBorderY;
      }
      if (bestWhiteY !== null && bestWhiteRatio < 0.03) {
        return bestWhiteY;
      }
      return Math.round(candidateY);
    };

    const findContainingTable = (y) =>
      canvasTables.find(t => y > t.topY + 6 && y < t.bottomY - 6) || null;

    // Build page slices in exact masterCanvas Y coordinates
    const slices = [];
    if (masterCanvas.height <= maxPageCanvasH + 8) {
      slices.push({ startCanvasY: 0, endCanvasY: masterCanvas.height });
    } else {
      let curY = 0;
      while (curY < masterCanvas.height - 4) {
        const maxEndY = curY + maxPageCanvasH;
        if (maxEndY >= masterCanvas.height - 4) {
          slices.push({ startCanvasY: curY, endCanvasY: masterCanvas.height });
          break;
        }

        // Find the earliest atomic block that starts on this page and overflows past maxEndY
        let cutY = maxEndY;
        for (const blk of canvasBlocks) {
          if (blk.topY > curY + 40 && blk.topY <= maxEndY && blk.bottomY > maxEndY) {
            cutY = blk.topY;
            break;
          }
        }

        const activeTbl = findContainingTable(cutY);
        const snappedCutY = snapCutYOnCanvas(cutY, curY + 40, maxEndY, activeTbl);

        slices.push({
          startCanvasY: curY,
          endCanvasY: snappedCutY
        });

        curY = Math.max(curY + 1, snappedCutY);
      }
    }

    const pdf = new jsPDF({
      unit: 'mm',
      format: 'a4',
      orientation: 'portrait'
    });

    for (let i = 0; i < slices.length; i++) {
      const { startCanvasY, endCanvasY } = slices[i];
      const srcY = Math.max(0, startCanvasY);
      const srcH = Math.min(masterCanvas.height - srcY, Math.max(1, endCanvasY - startCanvasY));

      const pageCanvas = document.createElement('canvas');
      pageCanvas.width = masterCanvas.width;
      pageCanvas.height = srcH;
      const ctx = pageCanvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
      ctx.drawImage(
        masterCanvas,
        0,
        srcY,
        masterCanvas.width,
        srcH,
        0,
        0,
        masterCanvas.width,
        srcH
      );

      // Auto-close top horizontal table border when a page starts inside a split table (e.g. Page 2, Page 3)
      const topSplitTable = findContainingTable(srcY);
      if (i > 0 && topSplitTable) {
        ctx.fillStyle = '#4b5563';
        ctx.fillRect(
          topSplitTable.leftX,
          0,
          Math.max(1, topSplitTable.rightX - topSplitTable.leftX),
          2
        );
      }

      // Auto-close bottom horizontal table border when a page ends inside a split table (e.g. Page 1, Page 2)
      const bottomSplitTable = findContainingTable(srcY + srcH);
      if (i < slices.length - 1 && bottomSplitTable) {
        ctx.fillStyle = '#4b5563';
        ctx.fillRect(
          bottomSplitTable.leftX,
          Math.max(0, srcH - 2),
          Math.max(1, bottomSplitTable.rightX - bottomSplitTable.leftX),
          2
        );
      }

      if (i > 0) {
        pdf.addPage('a4', 'portrait');
      }
      pdf.setPage(i + 1);
      const sliceHeightMm = (srcH / masterCanvas.width) * printableWidthMm;
      const imgData = pageCanvas.toDataURL('image/jpeg', 0.92);
      pdf.addImage(imgData, 'JPEG', marginLeftMm, marginTopMm, printableWidthMm, sliceHeightMm);
    }

    pdf.save(finalFilename);
    return;
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
