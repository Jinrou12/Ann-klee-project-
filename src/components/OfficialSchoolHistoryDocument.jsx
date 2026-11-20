import React, { useMemo, useRef, useState, useLayoutEffect } from 'react';
import KhmerRoyalDivider from './KhmerRoyalDivider';
import { toKhmerDigits } from '../utils/khmerNumerals';

const SIEMREAP_FONT = "'Khmer OS Siemreap', 'Siemreap', 'Battambang', sans-serif";
const MOUL_FONT = "'Khmer OS Muol Light', 'Khmer OS Moul Light', 'Khmer OS Muol', 'Moul', serif";
const NAVY_HEADER_COLOR = '#002060';
const MAX_PAGE_CONTENT_PX = 1035;

export const SCHOOL_HISTORY_TABLE_COLS = [
  { key: 'no', label: 'ល.រ', width: '5.5%' },
  { key: 'academicYearDisplay', label: 'ឆ្នាំសិក្សា', width: '16.5%' },
  { key: 'kgText', label: 'ថ្នាក់មត្តេយ្យ', width: '14%' },
  { key: 'g1Text', label: 'ថ្នាក់ទី១', width: '13.5%' },
  { key: 'g2Text', label: 'ថ្នាក់ទី២', width: '13.5%' },
  { key: 'g3Text', label: 'ថ្នាក់ទី៣', width: '13.5%' },
  { key: 'totalText', label: 'សរុប', width: '15%' },
  { key: 'note', label: 'ផ្សេងៗ', width: '8.5%' }
];

const thStyle = {
  padding: '5px 2px',
  textAlign: 'center',
  verticalAlign: 'middle',
  fontFamily: MOUL_FONT,
  fontWeight: 400,
  fontSize: 12.8,
  lineHeight: 1.45,
  color: '#000000',
  background: '#ffffff',
  overflow: 'hidden',
  boxSizing: 'border-box'
};

const tdStyle = {
  padding: '4.5px 3px',
  textAlign: 'center',
  verticalAlign: 'middle',
  fontFamily: SIEMREAP_FONT,
  fontWeight: 400,
  fontSize: 13.8,
  lineHeight: 1.45,
  color: '#000000',
  background: '#ffffff',
  overflow: 'hidden',
  boxSizing: 'border-box'
};

const tdTotalStyle = {
  ...tdStyle,
  fontWeight: 700,
  fontSize: 13,
  padding: '5.5px 2px',
  whiteSpace: 'nowrap'
};

/**
 * Shared 8-column School History Training Table renderer (supports chunking with repeating header)
 * Used in BOTH OfficialSchoolHistoryDocument (Standalone) AND OfficialAdminReportDocument (Sem 1 + History)
 */
export function renderSchoolHistoryTableChunk({
  rowsChunk = [],
  totals = null,
  includeTotalsRow = false,
  keyPrefix = 'hist-tbl',
  marginTop = 4,
  marginBottom = 8
}) {
  return (
    <div key={keyPrefix} style={{ marginTop, marginBottom, width: '100%' }}>
      <table
        className="school-history-grid"
        style={{
          width: '100%',
          borderCollapse: 'separate',
          borderSpacing: 0,
          tableLayout: 'fixed',
          background: '#ffffff'
        }}
      >
        <colgroup>
          {SCHOOL_HISTORY_TABLE_COLS.map(col => (
            <col key={col.key} style={{ width: col.width }} />
          ))}
        </colgroup>
        <thead>
          <tr>
            {SCHOOL_HISTORY_TABLE_COLS.map(col => (
              <th key={col.key} style={thStyle}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rowsChunk.map((r, idx) => (
            <tr key={`${keyPrefix}-row-${r.index || idx}`}>
              <td style={tdStyle}>{r.no}</td>
              <td style={tdStyle}>{r.academicYearDisplay}</td>
              <td style={tdStyle}>{r.kgText}</td>
              <td style={tdStyle}>{r.g1Text}</td>
              <td style={tdStyle}>{r.g2Text}</td>
              <td style={tdStyle}>{r.g3Text}</td>
              <td style={tdStyle}>{r.totalText}</td>
              <td style={tdStyle}>{r.note || ''}</td>
            </tr>
          ))}
          {includeTotalsRow && totals && (
            <tr>
              <td style={tdTotalStyle}></td>
              <td style={{ ...tdTotalStyle, fontFamily: MOUL_FONT, fontWeight: 400, fontSize: 12.2 }}>
                {totals.label}
              </td>
              <td style={tdTotalStyle}>{totals.kgText}</td>
              <td style={tdTotalStyle}>{totals.g1Text}</td>
              <td style={tdTotalStyle}>{totals.g2Text}</td>
              <td style={tdTotalStyle}>{totals.g3Text}</td>
              <td style={tdTotalStyle}>{totals.grandTotalText}</td>
              <td style={tdTotalStyle}></td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

/**
 * OfficialSchoolHistoryDocument: Standalone Multi-Page A4 Official Replica
 * Matches `របាយការណ៍ ស្ដីពី ប្រវត្តិសាលាពុទ្ធិកសិក្សាកម្រង ហ៊ុន ណេង ក្រុងកំពង់ចាម` PDF template:
 * - Official Ministry & School header on Left (with Logo) + Kingdom & Motto on Right
 * - Section `១.១. សាវតារ` + Background paragraphs + Table Intro
 * - Auto-paginated 16-year student training table with repeating table header (`<thead>`) on continuation pages
 * - Right-aligned Lunar/Solar date & `នាយកសាលា` signature block
 */
export default function OfficialSchoolHistoryDocument({
  id = 'printable-school-history-document',
  historyModel,
  useKhmerNumerals = true
}) {
  const fmtNum = (n) => (useKhmerNumerals !== false ? toKhmerDigits(n) : String(n));
  const measureRef = useRef(null);
  const [measured, setMeasured] = useState(null);

  const proseBlocks = useMemo(() => {
    if (!historyModel) return [];
    const blocks = [];

    // 1. Official Top Header (Left: Logo + Ministry + School | Right: Kingdom + Motto — standardized to match other official docs)
    blocks.push({
      id: 'hist-header',
      estPx: 156,
      node: (
        <div
          key="hist-header"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: 10
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              color: NAVY_HEADER_COLOR,
              lineHeight: 1.62
            }}
          >
            <img
              src="/logo.png?v=nobg1"
              alt="Logo"
              style={{
                width: 52,
                height: 52,
                objectFit: 'contain',
                marginBottom: 4
              }}
            />
            <div style={{ fontFamily: MOUL_FONT, fontSize: 15, whiteSpace: 'nowrap' }}>
              មន្ទីរធម្មការ និងសាសនាខេត្តកំពង់ចាម
            </div>
            <div style={{ fontFamily: MOUL_FONT, fontSize: 14.5, whiteSpace: 'nowrap' }}>
              សាលាពុទ្ធិកបឋមសិក្សា កម្រង ហ៊ុន ណេង
            </div>
            <div style={{ fontFamily: MOUL_FONT, fontSize: 14.5, whiteSpace: 'nowrap' }}>
              ក្រុងកំពង់ចាម
            </div>
          </div>

          <div
            style={{
              textAlign: 'center',
              color: '#000000',
              lineHeight: 1.55,
              paddingTop: 10
            }}
          >
            <div style={{ fontFamily: MOUL_FONT, fontSize: 17.5, whiteSpace: 'nowrap' }}>
              ព្រះរាជាណាចក្រកម្ពុជា
            </div>
            <div style={{ fontFamily: MOUL_FONT, fontSize: 15.2, whiteSpace: 'nowrap' }}>
              ជាតិ{'\u00A0\u00A0'}សាសនា{'\u00A0\u00A0'}ព្រះមហាក្សត្រ
            </div>
            <div style={{ marginTop: 2 }}>
              <KhmerRoyalDivider width={120} height={8} color="#000000" />
            </div>
          </div>
        </div>
      )
    });

    // 2. Document Title
    blocks.push({
      id: 'hist-title',
      estPx: 96,
      node: (
        <div
          key="hist-title"
          style={{
            textAlign: 'center',
            color: NAVY_HEADER_COLOR,
            lineHeight: 1.64,
            marginTop: 2,
            marginBottom: 10
          }}
        >
          <div style={{ fontFamily: MOUL_FONT, fontSize: 17 }}>របាយការណ៍</div>
          <div style={{ fontFamily: MOUL_FONT, fontSize: 15.5 }}>ស្ដីពី</div>
          <div style={{ fontFamily: MOUL_FONT, fontSize: 15.5 }}>
            {historyModel.title}
          </div>
        </div>
      )
    });

    // 3. Section ១.១. សាវតារ
    blocks.push({
      id: 'hist-sec-heading',
      estPx: 34,
      node: (
        <div
          key="hist-sec-heading"
          style={{
            fontFamily: MOUL_FONT,
            fontSize: 15.2,
            color: NAVY_HEADER_COLOR,
            paddingLeft: 18,
            marginBottom: 4
          }}
        >
          {fmtNum(1)}.{fmtNum(1)}. សាវតារ
        </div>
      )
    });

    // 4. Background Paragraphs
    (historyModel.backgroundParagraphs || []).forEach((para, idx) => {
      blocks.push({
        id: `hist-bg-${idx}`,
        estPx: Math.max(42, Math.ceil(para.length / 62) * 27),
        node: (
          <div
            key={`hist-bg-${idx}`}
            style={{
              textAlign: 'left',
              wordSpacing: 'normal',
              textIndent: 46,
              lineHeight: 1.78,
              marginBottom: 6,
              fontSize: 15.2
            }}
          >
            {para}
          </div>
        )
      });
    });

    // 5. Table Intro Paragraph
    if (historyModel.tableIntro) {
      blocks.push({
        id: 'hist-table-intro',
        estPx: 66,
        node: (
          <div
            key="hist-table-intro"
            style={{
              textAlign: 'left',
              wordSpacing: 'normal',
              textIndent: 46,
              lineHeight: 1.78,
              marginBottom: 8,
              fontSize: 15.2
            }}
          >
            {historyModel.tableIntro}
          </div>
        )
      });
    }

    return blocks;
  }, [historyModel, useKhmerNumerals]);

  const signatureNode = useMemo(() => {
    if (!historyModel) return null;
    return (
      <div
        key="hist-signature"
        className="signature-block"
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          marginTop: 18
        }}
      >
        <div style={{ width: '58%', textAlign: 'center', lineHeight: 1.75 }}>
          <div style={{ fontSize: 15.2 }}>{historyModel.lunarDateLine}</div>
          <div style={{ fontSize: 15.2, marginBottom: 6 }}>{historyModel.solarDateLine}</div>
          <div style={{ fontFamily: MOUL_FONT, fontSize: 15.2, marginTop: 2 }}>
            {historyModel.signerTitle || 'នាយកសាលា'}
          </div>
        </div>
      </div>
    );
  }, [historyModel]);

  // Measure actual DOM pixel heights for exact multi-page table pagination
  useLayoutEffect(() => {
    const el = measureRef.current;
    if (!el || !historyModel) return;

    const measureNow = () => {
      const elRect = el.getBoundingClientRect();
      const scaleFactor =
        el.offsetWidth > 0 && elRect.width > 0 ? elRect.width / el.offsetWidth : 1;
      const getH = (node) => {
        if (!node) return 0;
        const r = node.getBoundingClientRect();
        return scaleFactor > 0 ? r.height / scaleFactor : r.height;
      };

      const proseEls = Array.from(el.querySelectorAll('[data-measure-prose="true"]'));
      const proseHeights = proseEls.map(getH);
      const theadEl = el.querySelector('[data-measure-thead="true"]');
      const rowEls = Array.from(el.querySelectorAll('[data-measure-row="true"]'));
      const totalRowEl = el.querySelector('[data-measure-total="true"]');
      const sigEl = el.querySelector('[data-measure-sig="true"]');

      const next = {
        proseHeights,
        theadH: Math.max(32, getH(theadEl)),
        rowHeights: rowEls.map(r => Math.max(28, getH(r))),
        totalRowH: Math.max(32, getH(totalRowEl)),
        sigH: Math.max(105, getH(sigEl))
      };

      setMeasured(prev => {
        if (
          prev &&
          prev.proseHeights.length === next.proseHeights.length &&
          prev.rowHeights.length === next.rowHeights.length &&
          Math.abs(prev.theadH - next.theadH) < 0.8 &&
          Math.abs(prev.sigH - next.sigH) < 0.8 &&
          prev.proseHeights.every((v, i) => Math.abs(v - next.proseHeights[i]) < 0.8) &&
          prev.rowHeights.every((v, i) => Math.abs(v - next.rowHeights[i]) < 0.8)
        ) {
          return prev;
        }
        return next;
      });
    };

    measureNow();
    if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) {
      document.fonts.ready.then(measureNow).catch(() => {});
    }
  }, [proseBlocks, historyModel]);

  const pages = useMemo(() => {
    if (!historyModel) return [];

    const allRows = historyModel.rows || [];
    const proseHeights = proseBlocks.map((b, i) =>
      measured?.proseHeights?.[i] ? measured.proseHeights[i] : b.estPx
    );
    const theadH = measured?.theadH || 36;
    const rowHeights = allRows.map((_, i) => measured?.rowHeights?.[i] || 32);
    const totalRowH = measured?.totalRowH || 34;
    const sigH = measured?.sigH || 115;

    const resultPages = [];
    let currentNodes = [];
    let currentPx = 0;

    // 1. Place prose blocks across pages
    proseBlocks.forEach((blk, idx) => {
      const h = proseHeights[idx];
      if (currentNodes.length > 0 && currentPx + h > MAX_PAGE_CONTENT_PX) {
        resultPages.push(currentNodes);
        currentNodes = [blk.node];
        currentPx = h;
      } else {
        currentNodes.push(blk.node);
        currentPx += h;
      }
    });

    // 2. Pack table rows cleanly across pages with repeating <thead> on every continuation page
    let rowCursor = 0;
    let chunkIdx = 0;
    while (rowCursor < allRows.length) {
      const minTableStartH = theadH + (rowHeights[rowCursor] || 32) + 14;
      if (currentNodes.length > 0 && currentPx + minTableStartH > MAX_PAGE_CONTENT_PX) {
        resultPages.push(currentNodes);
        currentNodes = [];
        currentPx = 0;
      }

      const chunk = [];
      let usedH = theadH + 14;
      while (rowCursor < allRows.length) {
        const rh = rowHeights[rowCursor] || 32;
        const isLastRow = rowCursor === allRows.length - 1;
        const extraTotalH = isLastRow ? totalRowH : 0;
        if (chunk.length > 0 && currentPx + usedH + rh + extraTotalH > MAX_PAGE_CONTENT_PX) {
          break;
        }
        chunk.push(allRows[rowCursor]);
        usedH += rh;
        rowCursor += 1;
      }

      const reachedEnd = rowCursor >= allRows.length;
      if (reachedEnd) {
        usedH += totalRowH;
      }

      currentNodes.push(
        renderSchoolHistoryTableChunk({
          rowsChunk: chunk,
          totals: historyModel.totals,
          includeTotalsRow: reachedEnd,
          keyPrefix: `hist-page-tbl-${chunkIdx}`,
          marginTop: chunkIdx === 0 ? 4 : 0,
          marginBottom: 8
        })
      );
      currentPx += usedH;
      chunkIdx += 1;

      if (!reachedEnd) {
        resultPages.push(currentNodes);
        currentNodes = [];
        currentPx = 0;
      }
    }

    // 3. Place signature block (moves to new page only if it doesn't fit below total row)
    if (signatureNode) {
      if (currentNodes.length > 0 && currentPx + sigH > MAX_PAGE_CONTENT_PX) {
        resultPages.push(currentNodes);
        currentNodes = [signatureNode];
      } else {
        currentNodes.push(signatureNode);
      }
    }

    if (currentNodes.length > 0) {
      resultPages.push(currentNodes);
    }

    return resultPages;
  }, [proseBlocks, historyModel, measured, signatureNode]);

  if (!historyModel) return null;

  return (
    <div
      id={id}
      data-multi-page-admin-report="true"
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 14,
        width: '100%'
      }}
    >
      {/* Hidden exact-width measurement probe */}
      <div
        ref={measureRef}
        className="admin-a4-measure-probe"
        aria-hidden="true"
        style={{
          position: 'fixed',
          left: -10000,
          top: 0,
          width: 706,
          minWidth: 706,
          maxWidth: 706,
          visibility: 'hidden',
          pointerEvents: 'none',
          fontFamily: SIEMREAP_FONT,
          fontSize: 15.2,
          lineHeight: 1.78,
          color: '#000000'
        }}
      >
        {proseBlocks.map(b => (
          <div key={`m-${b.id}`} data-measure-prose="true" style={{ display: 'flow-root' }}>
            {b.node}
          </div>
        ))}
        <table
          className="school-history-grid"
          style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, tableLayout: 'fixed' }}
        >
          <colgroup>
            {SCHOOL_HISTORY_TABLE_COLS.map(col => (
              <col key={col.key} style={{ width: col.width }} />
            ))}
          </colgroup>
          <thead data-measure-thead="true">
            <tr>
              {SCHOOL_HISTORY_TABLE_COLS.map(col => (
                <th key={col.key} style={thStyle}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(historyModel.rows || []).map((r, i) => (
              <tr key={`mr-${i}`} data-measure-row="true">
                <td style={tdStyle}>{r.no}</td>
                <td style={tdStyle}>{r.academicYearDisplay}</td>
                <td style={tdStyle}>{r.kgText}</td>
                <td style={tdStyle}>{r.g1Text}</td>
                <td style={tdStyle}>{r.g2Text}</td>
                <td style={tdStyle}>{r.g3Text}</td>
                <td style={tdStyle}>{r.totalText}</td>
                <td style={tdStyle}>{r.note || ''}</td>
              </tr>
            ))}
            {historyModel.totals && (
              <tr data-measure-total="true">
                <td style={tdTotalStyle}></td>
                <td style={{ ...tdTotalStyle, fontFamily: MOUL_FONT, fontWeight: 400, fontSize: 12.2 }}>
                  {historyModel.totals.label}
                </td>
                <td style={tdTotalStyle}>{historyModel.totals.kgText}</td>
                <td style={tdTotalStyle}>{historyModel.totals.g1Text}</td>
                <td style={tdTotalStyle}>{historyModel.totals.g2Text}</td>
                <td style={tdTotalStyle}>{historyModel.totals.g3Text}</td>
                <td style={tdTotalStyle}>{historyModel.totals.grandTotalText}</td>
                <td style={tdTotalStyle}></td>
              </tr>
            )}
          </tbody>
        </table>
        <div data-measure-sig="true" style={{ display: 'flow-root' }}>
          {signatureNode}
        </div>
      </div>

      {/* Rendered A4 Pages */}
      {pages.map((pageNodes, idx) => (
        <div
          key={`school-history-a4-${idx + 1}`}
          className="admin-a4-page-sheet"
          style={{
            position: 'relative',
            width: 794,
            minWidth: 794,
            maxWidth: 794,
            height: 1123,
            minHeight: 1123,
            maxHeight: 1123,
            background: '#ffffff',
            overflow: 'hidden',
            boxShadow: '0 10px 28px rgba(15, 23, 42, 0.16), 0 0 0 1px rgba(0, 0, 0, 0.06)',
            borderRadius: 2,
            boxSizing: 'border-box',
            fontFamily: SIEMREAP_FONT,
            fontSize: 15.2,
            lineHeight: 1.78,
            wordSpacing: 'normal',
            letterSpacing: 0,
            WebkitTextSizeAdjust: '100%',
            textSizeAdjust: '100%',
            color: '#000000',
            margin: '0 auto',
            flexShrink: 0
          }}
        >
          <div
            style={{
              position: 'relative',
              zIndex: 1,
              padding: '34px 44px 48px 44px',
              width: '100%',
              height: '100%',
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {pageNodes}
          </div>

          {/* Bottom-Center Khmer Page Number */}
          <div
            style={{
              position: 'absolute',
              bottom: 16,
              left: 0,
              right: 0,
              textAlign: 'center',
              fontFamily: MOUL_FONT,
              fontSize: 13.5,
              color: '#000000',
              zIndex: 2,
              pointerEvents: 'none'
            }}
          >
            {fmtNum(idx + 1)}
          </div>
        </div>
      ))}
    </div>
  );
}

