import React, { useMemo, useRef, useState, useLayoutEffect } from 'react';
import KhmerRoyalDivider from './KhmerRoyalDivider';
import { toKhmerDigits } from '../utils/khmerNumerals';
import {
  formatMinistryLunarDateLine,
  formatMinistrySolarDateLine
} from '../utils/ministryReportBuilder';

const MOUL_FONT = "'Khmer OS Muol Light', 'Khmer OS Moul Light', 'Khmer OS Muol', 'Moul', serif";
const BATTAMBANG_FONT = "'Khmer OS Battambang', 'Kh Battambang', 'Battambang', 'Khmer OS Siemreap', sans-serif";
const RUNNING_HF_TEXT =
  'របាយការណ៍ ប្រចាំឆ្នាំ សាលាពុទ្ធិកបឋមសិក្សាកម្រង ហ៊ុន ណេង ក្រុងកំពង់ចាម ខេត្តកំពង់ចាម';
const RUNNING_HF_BORDER_COLOR = '#823B0B';
// Content box height inside 1123px A4 sheet (1123 - 62px top header area - 64px bottom footer area = 997px; 15px safety buffer)
const MAX_PAGE_CONTENT_PX = 982;

function normalizeSingleSpaces(str = '') {
  return String(str || '')
    .replace(/\u200B/g, '')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

/**
 * Estimate horizontal visual width units of Khmer + Latin text
 * (ignoring zero-width vertically-stacked Khmer vowels/subscripts)
 */
function getDescVisualUnits(str = '') {
  const s = String(str || '').trim();
  let units = 0;
  for (let i = 0; i < s.length; i++) {
    const code = s.charCodeAt(i);
    // Khmer Coeng (subscript consonant)
    if (code === 0x17d2) {
      const next = s.charCodeAt(i + 1) || 0;
      // Subscript Ro (្រ) or Vo (្វ) adds slight horizontal width; other subscripts stack underneath
      if (next === 0x179a || next === 0x179c) {
        units += 0.35;
      }
      i++; // skip subscript consonant
      continue;
    }
    // Zero-width above/below Khmer vowels & signs
    if (
      (code >= 0x17b7 && code <= 0x17bd) ||
      code === 0x17c6 ||
      (code >= 0x17c9 && code <= 0x17d3) ||
      code === 0x17dd ||
      (code >= 0x200b && code <= 0x200d)
    ) {
      continue;
    }
    // Two-part spacing Khmer vowels (ើ ឿ ៀ ោ ៅ)
    if (
      code === 0x17be ||
      code === 0x17bf ||
      code === 0x17c0 ||
      code === 0x17c4 ||
      code === 0x17c5
    ) {
      units += 0.95;
      continue;
    }
    // Single-side spacing Khmer vowels (ា េ ែ ៃ ះ ៈ)
    if (
      code === 0x17b6 ||
      (code >= 0x17c1 && code <= 0x17c3) ||
      code === 0x17c7 ||
      code === 0x17c8
    ) {
      units += 0.65;
      continue;
    }
    // Base Khmer consonants, digits & Riel sign (៛)
    if ((code >= 0x1780 && code <= 0x17b3) || (code >= 0x17e0 && code <= 0x17e9)) {
      units += 1.12;
      continue;
    }
    if (code === 0x17db) {
      units += 1.0;
      continue;
    }
    // Uppercase ASCII
    if (code >= 65 && code <= 90) {
      units += 0.85;
      continue;
    }
    // Spaces & narrow punctuation
    if (code === 32 || code === 40 || code === 41 || code === 47 || code === 45 || code === 46) {
      units += 0.42;
      continue;
    }
    // Default ASCII lowercase / digits / symbols
    units += 0.68;
  }
  return units;
}

/**
 * Auto-fit table cell content inside an exact pixel budget (`innerPx`) so:
 * - Numeric/short values NEVER break onto 2 lines and NEVER bleed across cell borders
 * - Descriptions/notes stay on 1 crisp line up to generous length by scaling font smoothly,
 *   and only wrap cleanly inside their own cell (max 2 lines) when genuinely very long.
 */
function renderFitTableCell(
  text,
  innerPx,
  {
    baseFont = 13.8,
    minFont = 10.2,
    bold = false,
    moul = false,
    allowWrap = false,
    align = 'center'
  } = {}
) {
  const clean = normalizeSingleSpaces(text);
  if (!clean) return '';

  const units = getDescVisualUnits(clean);
  // Empirically calibrated px-per-unit ratios for Khmer OS Battambang / Muol Light with ~10% safety headroom
  const ratio = moul ? 0.94 : bold ? 0.82 : 0.78;
  const maxFitFont = units > 0 ? innerPx / (units * ratio) : baseFont;

  if (maxFitFont >= minFont || !allowWrap) {
    const floorMin = allowWrap ? minFont : Math.min(9.4, minFont);
    const computedFont = Math.min(baseFont, Math.max(floorMin, Math.floor(maxFitFont * 5) / 5));
    return (
      <div
        style={{
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          fontSize: computedFont,
          lineHeight: 1.45,
          textAlign: align,
          width: '100%',
          maxWidth: '100%'
        }}
      >
        {clean}
      </div>
    );
  }

  // Only genuinely long text (when allowWrap === true and text exceeds single-line minFont capacity) wraps inside cell
  const twoLineFont = Math.min(12.6, Math.max(10.6, Math.floor((maxFitFont * 1.85) * 5) / 5));
  return (
    <div
      style={{
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
        wordBreak: 'break-word',
        overflowWrap: 'anywhere',
        fontSize: twoLineFont,
        lineHeight: 1.38,
        textAlign: align,
        width: '100%',
        maxWidth: '100%'
      }}
    >
      {clean}
    </div>
  );
}

const thCellStyle = {
  padding: '4px 3px',
  fontFamily: MOUL_FONT,
  fontWeight: 400,
  fontSize: 13,
  textAlign: 'center',
  verticalAlign: 'middle',
  background: '#ffffff',
  color: '#000000',
  lineHeight: 1.45,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'clip',
  boxSizing: 'border-box'
};

const tdCellStyle = {
  padding: '4px 4px',
  fontFamily: BATTAMBANG_FONT,
  fontWeight: 400,
  fontSize: 13.8,
  verticalAlign: 'middle',
  background: '#ffffff',
  color: '#000000',
  lineHeight: 1.5,
  overflow: 'hidden',
  boxSizing: 'border-box'
};

/**
 * OfficialMinistryReportDocument:
 * Multi-page A4 Portrait (794px × 1123px) Replica of the Provincial Department Annual Report
 * (របាយការណ៍ ស្តីពី ការអនុវត្តការងារប្រចាំឆ្នាំសិក្សា — មន្ទីរធម្មការ និងសាសនាខេត្តកំពង់ចាម)
 */
export default function OfficialMinistryReportDocument({
  id = 'printable-ministry-report-document',
  ministryModel,
  useKhmerNumerals = true
}) {
  const fmtNum = (n) => (useKhmerNumerals !== false ? toKhmerDigits(n) : String(n));
  const measureContainerRef = useRef(null);
  const [measuredHeights, setMeasuredHeights] = useState(null);

  const flowBlocks = useMemo(() => {
    if (!ministryModel) return [];
    const blocks = [];

    const pushHeading = (key, text, indent = 0, topPad = 6) => {
      blocks.push({
        id: key,
        isHeading: true,
        estPx: 36,
        node: (
          <div
            key={key}
            style={{
              paddingLeft: indent,
              paddingTop: topPad,
              marginBottom: 3,
              fontFamily: MOUL_FONT,
              fontWeight: 400,
              fontSize: 16,
              color: '#000000'
            }}
          >
            {text}
          </div>
        )
      });
    };

    const pushSubHeading = (key, text, indent = 18) => {
      blocks.push({
        id: key,
        isHeading: true,
        estPx: 32,
        node: (
          <div
            key={key}
            style={{
              paddingLeft: indent,
              paddingTop: 3,
              marginBottom: 2,
              fontFamily: BATTAMBANG_FONT,
              fontWeight: 700,
              fontSize: 16,
              color: '#000000'
            }}
          >
            {text}
          </div>
        )
      });
    };

    const pushBulletList = (prefixKey, lines = [], indent = 28) => {
      (lines || []).forEach((rawLine, idx) => {
        const line = normalizeSingleSpaces(rawLine);
        if (!line) return;
        blocks.push({
          id: `${prefixKey}-${idx}`,
          estPx: Math.max(29, Math.ceil(line.length / 54) * 28),
          node: (
            <div
              key={`${prefixKey}-${idx}`}
              style={{
                paddingLeft: indent,
                display: 'flex',
                alignItems: 'baseline',
                textAlign: 'left',
                marginBottom: 2,
                lineHeight: 1.72
              }}
            >
              <span style={{ width: 14, flexShrink: 0 }}>-</span>
              <span style={{ flex: 1 }}>{line}</span>
            </div>
          )
        });
      });
    };

    // 1. Header + Report Title + Section ក.ព័ត៌មានទូទៅ
    blocks.push({
      id: 'header-and-sec-a',
      estPx: 548,
      node: (
        <div key="header-and-sec-a" style={{ marginBottom: 6 }}>
          {/* Kingdom Header Centered */}
          <div style={{ textAlign: 'center', lineHeight: 1.55 }}>
            <div style={{ fontFamily: MOUL_FONT, fontSize: 17.5 }}>ព្រះរាជាណាចក្រកម្ពុជា</div>
            <div style={{ fontFamily: MOUL_FONT, fontSize: 15.2 }}>
              ជាតិ{'\u00A0\u00A0'}សាសនា{'\u00A0\u00A0'}ព្រះមហាក្សត្រ
            </div>
            <div style={{ marginTop: 2 }}>
              <KhmerRoyalDivider width={120} height={8} color="#000000" />
            </div>
          </div>

          {/* Left Provincial Dept & School with Official Logo (original 15/14.5 font sizes + airy lineHeight) */}
          <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: 6, marginBottom: 12 }}>
            <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', lineHeight: 1.65, minWidth: 265 }}>
              <img
                src="/logo.png?v=nobg1"
                alt="Logo"
                style={{ width: 50, height: 50, objectFit: 'contain', marginBottom: 5 }}
              />
              <div style={{ fontFamily: MOUL_FONT, fontSize: 15, whiteSpace: 'nowrap' }}>
                មន្ទីរធម្មការ និងសាសនាខេត្តកំពង់ចាម
              </div>
              <div style={{ fontFamily: MOUL_FONT, fontSize: 14.5, whiteSpace: 'nowrap' }}>
                ពុទ្ធិកបឋមសិក្សាកម្រង ហ៊ុន ណេង
              </div>
              <div style={{ fontFamily: MOUL_FONT, fontSize: 14.5, whiteSpace: 'nowrap' }}>
                ក្រុងកំពង់ចាម
              </div>
            </div>
          </div>

          {/* 3-Line Report Title */}
          <div style={{ textAlign: 'center', lineHeight: 1.65, marginBottom: 10 }}>
            <div style={{ fontFamily: MOUL_FONT, fontSize: 16 }}>របាយការណ៍</div>
            <div style={{ fontFamily: MOUL_FONT, fontSize: 15.2 }}>ស្តីពី</div>
            <div style={{ fontFamily: MOUL_FONT, fontSize: 15.8 }}>{ministryModel.fullReportTitle}</div>
          </div>

          {/* ក. ព័ត៌មានទូទៅ */}
          <div style={{ fontFamily: MOUL_FONT, fontWeight: 400, fontSize: 16, marginBottom: 4 }}>
            ក.ព័ត៌មានទូទៅ
          </div>
          <div style={{ paddingLeft: 18 }}>
            {(ministryModel.generalInfoLines || []).map((row, idx) =>
              row.value ? (
                <div
                  key={`gen-${idx}`}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    gap: 12,
                    width: '100%',
                    lineHeight: 1.72,
                    marginBottom: 2
                  }}
                >
                  <span style={{ whiteSpace: 'nowrap' }}>-{row.label}</span>
                  <span style={{ minWidth: 165, textAlign: 'left', whiteSpace: 'nowrap' }}>{row.value}</span>
                </div>
              ) : (
                <div key={`gen-${idx}`} style={{ lineHeight: 1.72, marginBottom: 2 }}>
                  -{row.label}
                </div>
              )
            )}
          </div>
        </div>
      )
    });

    // 2. ខ. អំពីសកម្មភាពនៅក្នុងសាលា៖ (គ្រូ និង សមណសិស្ស សិស្ស)
    pushHeading('sec-b', 'ខ.អំពីសកម្មភាពនៅក្នុងសាលា៖ (គ្រូ និង សមណសិស្ស សិស្ស)');
    pushSubHeading('sec-b1', 'ខ.១. សកម្មភាពរបស់គ្រូ');
    pushBulletList('b1', ministryModel.teacherActivities, 28);
    pushSubHeading('sec-b2', 'ខ.២. សកម្មភាពសមណសិស្ស សិស្ស');
    pushBulletList('b2', ministryModel.studentActivities, 28);

    // 3. គ. អំពីសកម្មភាពនៅក្រៅសាលា (គ្រូ និង សមណសិស្ស សិស្ស)
    pushHeading('sec-c', 'គ.អំពីសកម្មភាពនៅក្រៅសាលា (គ្រូ និង សមណសិស្ស សិស្ស)');
    pushBulletList('c', ministryModel.outsideActivities, 28);

    // 4. ឃ. អំពីការទទួលខុសត្រូវរបស់ព្រះគ្រូចៅអធិការ ឬអាណាព្យាបាល៖
    pushHeading('sec-d', 'ឃ.អំពីការទទួលខុសត្រូវរបស់ព្រះគ្រូចៅអធិការ ឬអាណាព្យាបាល៖');
    pushSubHeading('sec-d1', 'ឃ.១. ការទទួលខុសត្រូវរបស់ព្រះគ្រូចៅអធិការ');
    pushBulletList('d1', ministryModel.abbotResponsibilities, 28);

    // 5. ង. អំពីសកម្មភាពគណៈគ្រប់គ្រង (ទាំងក្នុង និងក្រៅសាលា)
    pushHeading('sec-e', 'ង.អំពីសកម្មភាពគណៈគ្រប់គ្រង (ទាំងក្នុង និងក្រៅសាលា)');
    pushBulletList('e', ministryModel.managementActivities, 28);

    // ង.១ & ង.២
    pushSubHeading('sec-e1', 'ង.១. ពុទ្ធិកបណ្ណាល័យ');
    pushBulletList('e1', ministryModel.libraryLines, 28);
    pushSubHeading('sec-e2', 'ង.២. ការទទួលជំនួយពីសប្បុរសជន');
    pushBulletList('e2', ministryModel.donationLines, 28);

    // Helper for Hourly Teacher Tables (ច & ច.១) — tableWidth = 694px
    const renderHourlySemesterTableBlock = (key, title, tableData) => {
      const rowCount = (tableData?.rows || []).length || 5;
      blocks.push({
        id: key,
        estPx: 110 + rowCount * 34,
        node: (
          <div key={key} style={{ marginTop: 8, marginBottom: 10 }}>
            <div style={{ fontFamily: MOUL_FONT, fontWeight: 400, fontSize: 16, marginBottom: 6 }}>{title}</div>
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, tableLayout: 'fixed', background: '#ffffff' }}>
              <colgroup>
                <col style={{ width: '6%' }} />
                <col style={{ width: '16%' }} />
                <col style={{ width: '18%' }} />
                <col style={{ width: '18%' }} />
                <col style={{ width: '15%' }} />
                <col style={{ width: '16%' }} />
                <col style={{ width: '11%' }} />
              </colgroup>
              <thead>
                <tr>
                  <th style={{ ...thCellStyle, width: '6%' }}>ល.រ</th>
                  <th style={{ ...thCellStyle, width: '16%' }}>បរិយាយ</th>
                  <th style={{ ...thCellStyle, width: '18%' }}>ចំណូលរួម</th>
                  <th style={{ ...thCellStyle, width: '18%' }}>ចំណាយ</th>
                  <th style={{ ...thCellStyle, width: '15%' }}>ចំនួនម៉ោង</th>
                  <th style={{ ...thCellStyle, width: '16%' }}>សមតុល្យ</th>
                  <th style={{ ...thCellStyle, width: '11%' }}>ផ្សេងៗ</th>
                </tr>
              </thead>
              <tbody>
                {(tableData?.rows || []).map((r, i) => (
                  <tr key={i}>
                    <td style={{ ...tdCellStyle, textAlign: 'center' }}>
                      {renderFitTableCell(r.no, 33)}
                    </td>
                    <td style={{ ...tdCellStyle, textAlign: 'center' }}>
                      {renderFitTableCell(r.label, 102)}
                    </td>
                    <td style={{ ...tdCellStyle, textAlign: 'center' }}>
                      {renderFitTableCell(r.incomeText, 116)}
                    </td>
                    <td style={{ ...tdCellStyle, textAlign: 'center' }}>
                      {renderFitTableCell(r.expenseText, 116)}
                    </td>
                    <td style={{ ...tdCellStyle, textAlign: 'center' }}>
                      {renderFitTableCell(r.hoursText, 95)}
                    </td>
                    <td style={{ ...tdCellStyle, textAlign: 'center' }}>
                      {renderFitTableCell(r.balanceText, 102)}
                    </td>
                    <td style={{ ...tdCellStyle, textAlign: 'center' }}>
                      {renderFitTableCell(r.note || '', 68, { baseFont: 13.4, minFont: 7.5, allowWrap: false })}
                    </td>
                  </tr>
                ))}
                <tr>
                  <td
                    colSpan={2}
                    style={{
                      ...tdCellStyle,
                      fontFamily: MOUL_FONT,
                      fontSize: 12.2,
                      lineHeight: 1.42,
                      textAlign: 'center'
                    }}
                  >
                    សមតុល្យសាច់ប្រាក់ចំណូល និងចំណាយនៅសល់
                  </td>
                  <td style={{ ...tdCellStyle, fontWeight: 700, textAlign: 'center' }}>
                    {renderFitTableCell(tableData?.sumIncomeText, 116, { bold: true })}
                  </td>
                  <td style={{ ...tdCellStyle, fontWeight: 700, textAlign: 'center' }}>
                    {renderFitTableCell(tableData?.sumExpenseText, 116, { bold: true })}
                  </td>
                  <td style={{ ...tdCellStyle, fontWeight: 700, textAlign: 'center' }}>
                    {renderFitTableCell(tableData?.sumHoursText, 95, { bold: true })}
                  </td>
                  <td style={{ ...tdCellStyle, fontWeight: 700, textAlign: 'center' }}>
                    {renderFitTableCell(tableData?.totalBalanceText, 102, { bold: true })}
                  </td>
                  <td style={{ ...tdCellStyle, textAlign: 'center' }}></td>
                </tr>
              </tbody>
            </table>
          </div>
        )
      });
    };

    // 6. ច & ច.១ & ច.២ (Hourly Pay Tables)
    renderHourlySemesterTableBlock(
      'tbl-hourly-sem1',
      `ច. ចំណូល-ចំណាយ ប្រាក់ម៉ោង ប្រចាំឆមាសទី${fmtNum(1)}`,
      ministryModel.hourlySem1
    );
    renderHourlySemesterTableBlock(
      'tbl-hourly-sem2',
      `ច.${fmtNum(1)} ចំណូល-ចំណាយ ប្រាក់ម៉ោង ប្រចាំឆមាសទី${fmtNum(2)}`,
      ministryModel.hourlySem2
    );

    blocks.push({
      id: 'tbl-hourly-annual',
      estPx: 180,
      node: (
        <div key="tbl-hourly-annual" style={{ marginTop: 8, marginBottom: 10 }}>
          <div style={{ fontFamily: MOUL_FONT, fontWeight: 400, fontSize: 16, marginBottom: 6 }}>
            ច.{fmtNum(2)} ចំណូលចំណាយប្រាក់ម៉ោងប្រចាំឆ្នាំ {ministryModel.yearKhmer}
          </div>
          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, tableLayout: 'fixed', background: '#ffffff' }}>
            <colgroup>
              <col style={{ width: '7%' }} />
              <col style={{ width: '21%' }} />
              <col style={{ width: '19%' }} />
              <col style={{ width: '19%' }} />
              <col style={{ width: '16%' }} />
              <col style={{ width: '18%' }} />
            </colgroup>
            <thead>
              <tr>
                <th style={{ ...thCellStyle, width: '7%' }}>ល.រ</th>
                <th style={{ ...thCellStyle, width: '21%' }}>បរិយាយ</th>
                <th style={{ ...thCellStyle, width: '19%' }}>ចំណូល</th>
                <th style={{ ...thCellStyle, width: '19%' }}>ចំណាយ</th>
                <th style={{ ...thCellStyle, width: '16%' }}>ចំនួនម៉ោង</th>
                <th style={{ ...thCellStyle, width: '18%' }}>សមតុល្យ</th>
              </tr>
            </thead>
            <tbody>
              {(ministryModel.hourlyAnnual?.rows || []).map((r, i) => (
                <tr key={i}>
                  <td style={{ ...tdCellStyle, textAlign: 'center' }}>
                    {renderFitTableCell(r.no, 40)}
                  </td>
                  <td style={{ ...tdCellStyle, textAlign: 'center' }}>
                    {renderFitTableCell(r.label, 136)}
                  </td>
                  <td style={{ ...tdCellStyle, textAlign: 'center' }}>
                    {renderFitTableCell(r.incomeText, 123)}
                  </td>
                  <td style={{ ...tdCellStyle, textAlign: 'center' }}>
                    {renderFitTableCell(r.expenseText, 123)}
                  </td>
                  <td style={{ ...tdCellStyle, textAlign: 'center' }}>
                    {renderFitTableCell(r.hoursText, 102)}
                  </td>
                  <td style={{ ...tdCellStyle, textAlign: 'center' }}>
                    {renderFitTableCell(r.balanceText, 116)}
                  </td>
                </tr>
              ))}
              <tr>
                <td
                  colSpan={2}
                  style={{ ...tdCellStyle, fontFamily: MOUL_FONT, fontSize: 12.5, lineHeight: 1.42, textAlign: 'center' }}
                >
                  សមតុល្យសាច់ប្រាក់ចំណូល និងចំណាយនៅសល់
                </td>
                <td style={{ ...tdCellStyle, fontWeight: 700, textAlign: 'center' }}>
                  {renderFitTableCell(ministryModel.hourlyAnnual?.sumIncomeText, 123, { bold: true })}
                </td>
                <td style={{ ...tdCellStyle, fontWeight: 700, textAlign: 'center' }}>
                  {renderFitTableCell(ministryModel.hourlyAnnual?.sumExpenseText, 123, { bold: true })}
                </td>
                <td style={{ ...tdCellStyle, fontWeight: 700, textAlign: 'center' }}>
                  {renderFitTableCell(ministryModel.hourlyAnnual?.sumHoursText, 102, { bold: true })}
                </td>
                <td style={{ ...tdCellStyle, fontWeight: 700, textAlign: 'center' }}>
                  {renderFitTableCell(ministryModel.hourlyAnnual?.totalBalanceText, 116, { bold: true })}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )
    });

    // Helper for Office Supplies Tables (ច.៣ & ច.៤) — Dynamically row-paginated to fill each A4 page cleanly
    const renderOfficeSemesterBlock = (keyPrefix, title, semData) => {
      const rawExpRows = semData?.expenseRows || [];
      const rawIncRows = semData?.incomeRows || [];

      const renderExpSegment = ({ chunkRows, chunkIdx, isFirstChunk, isLastChunk }) => {
        const segKey = `${keyPrefix}-exp-seg-${chunkIdx}`;
        return (
          <div key={segKey} style={{ marginTop: isFirstChunk ? 8 : 4, marginBottom: 6 }}>
            {isFirstChunk && (
              <div
                data-part="title"
                style={{ fontFamily: MOUL_FONT, fontWeight: 400, fontSize: 16, marginBottom: 6 }}
              >
                {title}
              </div>
            )}
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, tableLayout: 'fixed', background: '#ffffff' }}>
              <colgroup>
                <col style={{ width: '6%' }} />
                <col style={{ width: '40%' }} />
                <col style={{ width: '13%' }} />
                <col style={{ width: '16%' }} />
                <col style={{ width: '13%' }} />
                <col style={{ width: '12%' }} />
              </colgroup>
              <thead data-part="thead">
                <tr>
                  <th colSpan={6} style={{ ...thCellStyle, fontSize: 14 }}>
                    {isFirstChunk ? 'តារាងចំណាយ' : 'តារាងចំណាយ (បន្ត)'}
                  </th>
                </tr>
                <tr>
                  <th style={{ ...thCellStyle, width: '6%' }}>ល.រ</th>
                  <th style={{ ...thCellStyle, width: '40%' }}>បរិយាយ</th>
                  <th style={{ ...thCellStyle, width: '13%' }}>ចំណូលរួម</th>
                  <th style={{ ...thCellStyle, width: '16%' }}>ចំណាយ</th>
                  <th style={{ ...thCellStyle, width: '13%' }}>ចំនួន</th>
                  <th style={{ ...thCellStyle, width: '12%' }}>ផ្សេងៗ</th>
                </tr>
              </thead>
              <tbody>
                {chunkRows.length === 0 ? (
                  <tr data-row-idx={0}>
                    <td colSpan={6} style={{ ...tdCellStyle, textAlign: 'center' }}>
                      គ្មាន
                    </td>
                  </tr>
                ) : (
                  chunkRows.map((r, i) => (
                    <tr key={i} data-row-idx={i}>
                      <td style={{ ...tdCellStyle, textAlign: 'center' }}>
                        {renderFitTableCell(r.no, 33)}
                      </td>
                      <td style={{ ...tdCellStyle, textAlign: 'left', padding: '3px 5px' }}>
                        {renderFitTableCell(r.desc, 266, {
                          baseFont: 13.8,
                          minFont: 11.2,
                          allowWrap: true,
                          align: 'left'
                        })}
                      </td>
                      <td style={{ ...tdCellStyle, textAlign: 'center' }}>
                        {renderFitTableCell(r.source, 82, { baseFont: 13.8, minFont: 10.2 })}
                      </td>
                      <td style={{ ...tdCellStyle, textAlign: 'center' }}>
                        {renderFitTableCell(r.amountText, 102, { baseFont: 13.8, minFont: 10.2 })}
                      </td>
                      <td style={{ ...tdCellStyle, textAlign: 'center' }}>
                        {renderFitTableCell(r.qty, 82, { baseFont: 13.8, minFont: 10.2 })}
                      </td>
                      <td style={{ ...tdCellStyle, textAlign: 'center' }}>
                        {r.note
                          ? renderFitTableCell(r.note, 74, {
                              baseFont: 13.4,
                              minFont: 7.5,
                              allowWrap: false
                            })
                          : ''}
                      </td>
                    </tr>
                  ))
                )}
                {isLastChunk && (
                  <tr data-part="total">
                    <td colSpan={3} style={{ ...tdCellStyle, fontFamily: MOUL_FONT, fontSize: 13.5, textAlign: 'center' }}>
                      ចំណាយសរុប
                    </td>
                    <td style={{ ...tdCellStyle, fontWeight: 700, textAlign: 'center' }}>
                      {renderFitTableCell(semData?.totalExpenseText, 102, {
                        baseFont: 13.8,
                        minFont: 10,
                        bold: true
                      })}
                    </td>
                    <td colSpan={2} style={tdCellStyle}></td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        );
      };

      const estExpRowHeights = rawExpRows.map(r =>
        getDescVisualUnits(r.desc) > 30 ? 48 : 30
      );

      blocks.push({
        id: `${keyPrefix}-exp`,
        isSplittableTable: true,
        rows: rawExpRows,
        estTitlePx: 34,
        estTheadPx: 62,
        estRowHeights: estExpRowHeights,
        estTotalRowPx: 32,
        estPx: 110 + Math.max(1, rawExpRows.length) * 30 + 32,
        renderSegment: renderExpSegment,
        node: renderExpSegment({
          chunkRows: rawExpRows,
          chunkIdx: 0,
          isFirstChunk: true,
          isLastChunk: true
        })
      });

      const renderIncSegment = ({ chunkRows, chunkIdx, isFirstChunk, isLastChunk }) => {
        const segKey = `${keyPrefix}-inc-seg-${chunkIdx}`;
        return (
          <div key={segKey} style={{ marginTop: 4, marginBottom: isLastChunk ? 10 : 6 }}>
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, tableLayout: 'fixed', background: '#ffffff' }}>
              <colgroup>
                <col style={{ width: '7%' }} />
                <col style={{ width: '42%' }} />
                <col style={{ width: '18%' }} />
                <col style={{ width: '13%' }} />
                <col style={{ width: '20%' }} />
              </colgroup>
              <thead data-part="thead">
                <tr>
                  <th colSpan={5} style={{ ...thCellStyle, fontSize: 13.5 }}>
                    {isFirstChunk ? 'តារាងចំណូល' : 'តារាងចំណូល (បន្ត)'}
                  </th>
                </tr>
                <tr>
                  <th rowSpan={2} style={{ ...thCellStyle, width: '7%' }}>
                    ល.រ
                  </th>
                  <th rowSpan={2} style={{ ...thCellStyle, width: '42%' }}>
                    បរិយាយ
                  </th>
                  <th colSpan={2} style={{ ...thCellStyle, width: '31%' }}>
                    ថវិកា
                  </th>
                  <th rowSpan={2} style={{ ...thCellStyle, width: '20%' }}>
                    សេចក្ដីផ្សេងៗ
                  </th>
                </tr>
                <tr>
                  <th style={{ ...thCellStyle, width: '18%' }}>រៀល</th>
                  <th style={{ ...thCellStyle, width: '13%' }}>ដុល្លារ</th>
                </tr>
              </thead>
              <tbody>
                {chunkRows.length === 0 ? (
                  <tr data-row-idx={0}>
                    <td colSpan={5} style={{ ...tdCellStyle, textAlign: 'center' }}>
                      គ្មាន
                    </td>
                  </tr>
                ) : (
                  chunkRows.map((r, i) => (
                    <tr key={i} data-row-idx={i}>
                      <td style={{ ...tdCellStyle, textAlign: 'center' }}>
                        {renderFitTableCell(r.no, 40)}
                      </td>
                      <td style={{ ...tdCellStyle, textAlign: 'left', padding: '3px 5px' }}>
                        {renderFitTableCell(r.desc, 280, {
                          baseFont: 13.8,
                          minFont: 11.2,
                          allowWrap: true,
                          align: 'left'
                        })}
                      </td>
                      <td style={{ ...tdCellStyle, textAlign: 'center' }}>
                        {renderFitTableCell(r.khrText, 116)}
                      </td>
                      <td style={{ ...tdCellStyle, textAlign: 'center' }}>
                        {renderFitTableCell(r.usdText, 82)}
                      </td>
                      <td style={{ ...tdCellStyle, textAlign: 'center' }}>
                        {r.note
                          ? renderFitTableCell(r.note, 130, {
                              baseFont: 13.4,
                              minFont: 7.5,
                              allowWrap: false
                            })
                          : ''}
                      </td>
                    </tr>
                  ))
                )}
                {isLastChunk && (
                  <tr data-part="total">
                    <td colSpan={2} style={{ ...tdCellStyle, fontFamily: MOUL_FONT, fontSize: 13.5, textAlign: 'center' }}>
                      សរុបចំណូល
                    </td>
                    <td style={{ ...tdCellStyle, fontWeight: 700, textAlign: 'center' }}>
                      {renderFitTableCell(semData?.totalIncomeKHRText, 116, { bold: true })}
                    </td>
                    <td style={{ ...tdCellStyle, fontWeight: 700, textAlign: 'center' }}>
                      {renderFitTableCell(semData?.totalIncomeUSDText, 82, { bold: true })}
                    </td>
                    <td style={{ ...tdCellStyle, textAlign: 'center' }}>
                      {semData?.inKindSummary
                        ? renderFitTableCell(semData.inKindSummary, 130, {
                            baseFont: 13.4,
                            minFont: 7.5,
                            allowWrap: false
                          })
                        : ''}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        );
      };

      const estIncRowHeights = rawIncRows.map(r =>
        getDescVisualUnits(r.desc) > 32 ? 48 : 30
      );

      blocks.push({
        id: `${keyPrefix}-inc`,
        isSplittableTable: true,
        rows: rawIncRows,
        estTitlePx: 0,
        estTheadPx: 90,
        estRowHeights: estIncRowHeights,
        estTotalRowPx: 32,
        estPx: 105 + Math.max(1, rawIncRows.length) * 30 + 32,
        renderSegment: renderIncSegment,
        node: renderIncSegment({
          chunkRows: rawIncRows,
          chunkIdx: 0,
          isFirstChunk: true,
          isLastChunk: true
        })
      });
    };

    renderOfficeSemesterBlock(
      'tbl-office-sem1',
      `ច.${fmtNum(3)} ចំណាយ ចំណូល លើសម្ភារៈការិយាល័យ ប្រចាំឆមាសទី${fmtNum(1)} ឆ្នាំ${ministryModel.yearKhmer}`,
      ministryModel.officeSem1
    );
    renderOfficeSemesterBlock(
      'tbl-office-sem2',
      `ច.${fmtNum(4)} ចំណាយ ចំណូល លើសម្ភារៈការិយាល័យ ប្រចាំឆមាសទី${fmtNum(2)} ឆ្នាំ${ministryModel.yearKhmer}`,
      ministryModel.officeSem2
    );

    // ច.៥ Office Supplies Annual Summary
    blocks.push({
      id: 'tbl-office-annual',
      estPx: 170,
      node: (
        <div key="tbl-office-annual" style={{ marginTop: 8, marginBottom: 10 }}>
          <div style={{ fontFamily: MOUL_FONT, fontWeight: 400, fontSize: 16, marginBottom: 6 }}>
            ច.{fmtNum(5)} ចំណូល ចំណាយ លើសម្ភារៈការិយាល័យ ប្រចាំឆ្នាំ {ministryModel.yearKhmer}
          </div>
          <table
            style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, tableLayout: 'fixed', background: '#ffffff' }}
          >
            <colgroup>
              <col style={{ width: '7%' }} />
              <col style={{ width: '21%' }} />
              <col style={{ width: '25%' }} />
              <col style={{ width: '25%' }} />
              <col style={{ width: '22%' }} />
            </colgroup>
            <thead>
              <tr>
                <th style={{ ...thCellStyle, width: '7%' }}>ល.រ</th>
                <th style={{ ...thCellStyle, width: '21%' }}>បរិយាយ</th>
                <th style={{ ...thCellStyle, width: '25%' }}>ចំណូល</th>
                <th style={{ ...thCellStyle, width: '25%' }}>ចំណាយ</th>
                <th style={{ ...thCellStyle, width: '22%' }}>ផ្សេងៗ</th>
              </tr>
            </thead>
            <tbody>
              {(ministryModel.officeAnnual?.rows || []).map((r, i) => (
                <tr key={i}>
                  <td style={{ ...tdCellStyle, textAlign: 'center' }}>{renderFitTableCell(r.no, 40)}</td>
                  <td style={{ ...tdCellStyle, textAlign: 'center' }}>{renderFitTableCell(r.label, 136)}</td>
                  <td style={{ ...tdCellStyle, textAlign: 'center' }}>{renderFitTableCell(r.incomeText, 164)}</td>
                  <td style={{ ...tdCellStyle, textAlign: 'center' }}>{renderFitTableCell(r.expenseText, 164)}</td>
                  <td style={{ ...tdCellStyle, textAlign: 'center' }}>
                    {renderFitTableCell(r.note || '', 144, { baseFont: 13.4, minFont: 7.5, allowWrap: false })}
                  </td>
                </tr>
              ))}
              <tr>
                <td colSpan={2} style={{ ...tdCellStyle, fontFamily: MOUL_FONT, fontSize: 13.2, textAlign: 'center' }}>
                  សរុបទាំងពីរឆមាស
                </td>
                <td style={{ ...tdCellStyle, fontWeight: 700, textAlign: 'center' }}>
                  {renderFitTableCell(ministryModel.officeAnnual?.totalIncomeText, 164, { bold: true })}
                </td>
                <td style={{ ...tdCellStyle, fontWeight: 700, textAlign: 'center' }}>
                  {renderFitTableCell(ministryModel.officeAnnual?.totalExpenseText, 164, { bold: true })}
                </td>
                <td style={{ ...tdCellStyle, textAlign: 'center' }}>
                  {renderFitTableCell(ministryModel.officeAnnual?.inKindSummary || '', 144, {
                    baseFont: 13.4,
                    minFont: 7.5,
                    allowWrap: false
                  })}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )
    });

    // កម្មវិធីចែកបណ្ណសរសើរ
    blocks.push({
      id: 'tbl-award-ceremony',
      estPx: 165,
      node: (
        <div key="tbl-award-ceremony" style={{ marginTop: 8, marginBottom: 10 }}>
          <div style={{ fontFamily: MOUL_FONT, fontWeight: 400, fontSize: 16, marginBottom: 6 }}>
            ចំណូល ចំណាយ កម្មវិធីចែកបណ្ណសរសើរ
          </div>
          <table
            style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, tableLayout: 'fixed', background: '#ffffff' }}
          >
            <colgroup>
              <col style={{ width: '7%' }} />
              <col style={{ width: '48%' }} />
              <col style={{ width: '25%' }} />
              <col style={{ width: '20%' }} />
            </colgroup>
            <tbody>
              <tr>
                <td style={{ ...tdCellStyle, width: '7%', textAlign: 'center' }}>{renderFitTableCell(fmtNum(1), 40)}</td>
                <td style={{ ...tdCellStyle, width: '48%' }}>ចំណូលពីការចែកបណ្ណសរសើរ</td>
                <td style={{ ...tdCellStyle, width: '25%', textAlign: 'center' }}>
                  {renderFitTableCell(ministryModel.awardCeremonyTable?.income1Text, 164)}
                </td>
                <td style={{ ...tdCellStyle, width: '20%' }}></td>
              </tr>
              <tr>
                <td style={{ ...tdCellStyle, textAlign: 'center' }}>{renderFitTableCell(fmtNum(2), 40)}</td>
                <td style={tdCellStyle}>ចំណូលពីវត្ត</td>
                <td style={{ ...tdCellStyle, textAlign: 'center' }}>
                  {renderFitTableCell(ministryModel.awardCeremonyTable?.income2Text, 164)}
                </td>
                <td style={tdCellStyle}></td>
              </tr>
              <tr>
                <td colSpan={2} style={{ ...tdCellStyle, fontFamily: MOUL_FONT, fontSize: 13.2, textAlign: 'center' }}>
                  ចំណូលសរុបក្នុងកម្មវិធីចែកបណ្ណសរសើរ
                </td>
                <td style={{ ...tdCellStyle, fontWeight: 700, textAlign: 'center' }}>
                  {renderFitTableCell(ministryModel.awardCeremonyTable?.totalIncomeText, 164, { bold: true })}
                </td>
                <td style={tdCellStyle}></td>
              </tr>
              <tr>
                <td colSpan={2} style={{ ...tdCellStyle, fontFamily: MOUL_FONT, fontSize: 13.2, textAlign: 'center' }}>
                  ចំណាយសរុបក្នុងកម្មវិធីចែកបណ្ណសរសើរ
                </td>
                <td style={{ ...tdCellStyle, fontWeight: 700, textAlign: 'center' }}>
                  {renderFitTableCell(ministryModel.awardCeremonyTable?.totalExpenseText, 164, { bold: true })}
                </td>
                <td style={tdCellStyle}></td>
              </tr>
            </tbody>
          </table>
        </div>
      )
    });

    // ចំណូល ចំណាយ សរុបរួមប្រចាំឆ្នាំ
    blocks.push({
      id: 'tbl-grand-annual',
      estPx: 195,
      node: (
        <div key="tbl-grand-annual" style={{ marginTop: 8, marginBottom: 10 }}>
          <div style={{ fontFamily: MOUL_FONT, fontWeight: 400, fontSize: 16, marginBottom: 6 }}>
            ចំណូល ចំណាយ សរុបរួមប្រចាំឆ្នាំ{ministryModel.yearKhmer}
          </div>
          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, tableLayout: 'fixed', background: '#ffffff' }}>
            <colgroup>
              <col style={{ width: '7%' }} />
              <col style={{ width: '34%' }} />
              <col style={{ width: '24%' }} />
              <col style={{ width: '15%' }} />
              <col style={{ width: '20%' }} />
            </colgroup>
            <thead>
              <tr>
                <th rowSpan={2} style={{ ...thCellStyle, width: '7%' }}>
                  ល.រ
                </th>
                <th rowSpan={2} style={{ ...thCellStyle, width: '34%' }}>
                  បរិយាយ
                </th>
                <th colSpan={2} style={{ ...thCellStyle, width: '39%' }}>
                  ថវិកា
                </th>
                <th rowSpan={2} style={{ ...thCellStyle, width: '20%' }}>
                  ផ្សេងៗ
                </th>
              </tr>
              <tr>
                <th style={{ ...thCellStyle, width: '24%' }}>រៀល</th>
                <th style={{ ...thCellStyle, width: '15%' }}>ដុល្លារ</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ ...tdCellStyle, textAlign: 'center' }}>{renderFitTableCell(fmtNum(1), 40)}</td>
                <td style={tdCellStyle}>ចំណូលរួមប្រចាំឆ្នាំ</td>
                <td style={{ ...tdCellStyle, textAlign: 'center', fontWeight: 700 }}>
                  {renderFitTableCell(ministryModel.grandAnnualTable?.incomeKHRText, 158, { bold: true })}
                </td>
                <td style={{ ...tdCellStyle, textAlign: 'center', fontWeight: 700 }}>
                  {renderFitTableCell(ministryModel.grandAnnualTable?.incomeUSDText, 95, { bold: true })}
                </td>
                <td style={tdCellStyle}></td>
              </tr>
              <tr>
                <td style={{ ...tdCellStyle, textAlign: 'center' }}>{renderFitTableCell(fmtNum(2), 40)}</td>
                <td style={tdCellStyle}>ចំណាយរួមប្រចាំឆ្នាំ</td>
                <td style={{ ...tdCellStyle, textAlign: 'center', fontWeight: 700 }}>
                  {renderFitTableCell(ministryModel.grandAnnualTable?.expenseKHRText, 158, { bold: true })}
                </td>
                <td style={{ ...tdCellStyle, textAlign: 'center', fontWeight: 700 }}>
                  {renderFitTableCell(ministryModel.grandAnnualTable?.expenseUSDText, 95, { bold: true })}
                </td>
                <td style={tdCellStyle}></td>
              </tr>
              <tr>
                <td colSpan={2} style={{ ...tdCellStyle, fontFamily: MOUL_FONT, fontSize: 13.5, textAlign: 'center' }}>
                  សមតុល្យ
                </td>
                <td style={{ ...tdCellStyle, fontFamily: MOUL_FONT, textAlign: 'center' }}>
                  {renderFitTableCell(ministryModel.grandAnnualTable?.balanceKHRText, 158, {
                    baseFont: 13.5,
                    minFont: 10.5,
                    moul: true
                  })}
                </td>
                <td style={{ ...tdCellStyle, fontFamily: MOUL_FONT, textAlign: 'center' }}>
                  {renderFitTableCell(ministryModel.grandAnnualTable?.balanceUSDText, 95, {
                    baseFont: 13.5,
                    minFont: 10.5,
                    moul: true
                  })}
                </td>
                <td style={{ ...tdCellStyle, textAlign: 'center' }}>
                  {renderFitTableCell(ministryModel.grandAnnualTable?.balanceNote, 130, {
                    baseFont: 13.4,
                    minFont: 7.5,
                    allowWrap: false
                  })}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )
    });

    // 7. ឆ, ជ, ឈ, ញ, ដ
    pushHeading('sec-ch', 'ឆ.អំពីសកម្មភាពគ្រូបង្រៀន (ជាមួយសមណសិស្ស សិស្ស ក្នុង និងក្រៅសាលា)');
    pushBulletList('ch', ministryModel.teacherRelations, 28);

    pushHeading('sec-j', 'ជ.បញ្ហាប្រឈម');
    pushBulletList('j', ministryModel.challenges, 28);

    pushHeading('sec-chh', 'ឈ. ដំណោះស្រាយ');
    pushBulletList('chh', ministryModel.solutions, 28);

    pushHeading('sec-nh', 'ញ.សេចក្ដីសន្និដ្ឋាន');
    (ministryModel.conclusionParas || []).forEach((p, idx) => {
      const clean = normalizeSingleSpaces(p);
      if (!clean) return;
      blocks.push({
        id: `conc-${idx}`,
        estPx: Math.max(54, Math.ceil(clean.length / 60) * 26),
        node: (
          <div
            key={`conc-${idx}`}
            style={{
              textIndent: 36,
              textAlign: 'left',
              lineHeight: 1.76,
              marginBottom: 4
            }}
          >
            {clean}
          </div>
        )
      });
    });

    pushHeading('sec-da', 'ដ.សំណូមពរ');
    pushBulletList('da', ministryModel.requests, 28);

    // 8. Closing Signatures & ចម្លងប្រគេនជូន (CC List)
    const compactFullLunar = formatMinistryLunarDateLine(ministryModel.lunarDateLine);
    const compactFullSolar = formatMinistrySolarDateLine(ministryModel.solarDateLine);
    const compactFullDocNo = String(ministryModel.docNumber || '................').replace(/[.…]{4,}/g, '................').trim();
    blocks.push({
      id: 'closing-sig-and-cc',
      estPx: 265,
      node: (
        <div key="closing-sig-and-cc" className="signature-block" style={{ marginTop: 18 }}>
          {/* Side-by-Side Left Approval & Right Reporter (+1pt => 16.5px with 14/11 lunar & 7/12 solar dots) */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: 10,
              marginLeft: -8,
              marginRight: -8,
              fontSize: 16.5,
              lineHeight: 1.7
            }}
          >
            {/* Left: លេខ .... above បានឃើញ និងឯកភាព + ព្រះនាយក */}
            <div style={{ flex: '0 0 47%', maxWidth: '47%', textAlign: 'center', paddingTop: 22 }}>
              <div style={{ whiteSpace: 'nowrap' }}>លេខ {compactFullDocNo}</div>
              <div style={{ fontFamily: MOUL_FONT, marginTop: 2 }}>បានឃើញ និងឯកភាព</div>
              <div style={{ fontFamily: MOUL_FONT, marginTop: 6 }}>
                {ministryModel.signerTitle || 'ព្រះនាយក'}
              </div>
            </div>

            {/* Right: Lunar + Solar + អ្នកធ្វើរបាយការណ៍ */}
            <div style={{ flex: '0 0 51%', maxWidth: '51%', textAlign: 'center' }}>
              <div style={{ whiteSpace: 'nowrap' }}>{compactFullLunar}</div>
              <div style={{ whiteSpace: 'nowrap' }}>{compactFullSolar}</div>
              <div style={{ fontFamily: MOUL_FONT, marginTop: 6 }}>
                {ministryModel.reporterTitle || 'អ្នកធ្វើរបាយការណ៍'}
              </div>
            </div>
          </div>

          {/* Bottom-left ចម្លងប្រគេនជូន (Original .docx: Khmer OS Battambang 10pt heading / 9.5-10pt items) */}
          <div style={{ marginTop: 34, lineHeight: 1.68 }}>
            <div style={{ fontFamily: BATTAMBANG_FONT, fontWeight: 700, fontSize: 14, marginBottom: 2 }}>
              ចម្លងប្រគេនជូន
            </div>
            {(ministryModel.ccList || []).map((cc, idx) => (
              <div key={idx} style={{ fontFamily: BATTAMBANG_FONT, fontSize: 13.3 }}>
                -{normalizeSingleSpaces(cc)}
              </div>
            ))}
          </div>
        </div>
      )
    });

    return blocks;
  }, [ministryModel, useKhmerNumerals]);

  useLayoutEffect(() => {
    const el = measureContainerRef.current;
    if (!el || !flowBlocks.length) return;

    const measureNow = () => {
      const children = Array.from(el.children);
      if (children.length !== flowBlocks.length) return;
      const elRect = el.getBoundingClientRect();
      const scaleFactor =
        el.offsetWidth > 0 && elRect.width > 0 ? elRect.width / el.offsetWidth : 1;

      const norm = (px) => (scaleFactor > 0 ? px / scaleFactor : px);

      const heights = children.map((child, idx) => {
        const blk = flowBlocks[idx];
        const rect = child.getBoundingClientRect();
        const totalH = norm(rect.height);

        if (blk && blk.isSplittableTable) {
          const titleEl = child.querySelector('[data-part="title"]');
          const titlePx = titleEl ? norm(titleEl.getBoundingClientRect().height) + 6 : 0;
          const theadEl = child.querySelector('[data-part="thead"]');
          const theadPx = theadEl ? norm(theadEl.getBoundingClientRect().height) : blk.estTheadPx;
          const rowEls = Array.from(child.querySelectorAll('tr[data-row-idx]'));
          const rowHeights = rowEls.map(tr => norm(tr.getBoundingClientRect().height));
          const totalEl = child.querySelector('tr[data-part="total"]');
          const totalRowPx = totalEl
            ? norm(totalEl.getBoundingClientRect().height)
            : blk.estTotalRowPx;

          return {
            totalH,
            titlePx,
            theadPx,
            rowHeights,
            totalRowPx
          };
        }

        return { totalH };
      });

      setMeasuredHeights(prev => {
        if (
          prev &&
          prev.length === heights.length &&
          prev.every((v, i) => Math.abs((v?.totalH || 0) - (heights[i]?.totalH || 0)) <= 0.5)
        ) {
          return prev;
        }
        return heights;
      });
    };

    measureNow();
    if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) {
      document.fonts.ready.then(measureNow).catch(() => { });
    }
  }, [flowBlocks]);

  const pages = useMemo(() => {
    if (!flowBlocks.length) return [];
    const blockHeights = flowBlocks.map((blk, i) =>
      measuredHeights && measuredHeights[i] && measuredHeights[i].totalH
        ? measuredHeights[i].totalH
        : blk.estPx
    );

    const pagedBuckets = [];
    let currentItems = [];
    let currentPx = 0;

    for (let i = 0; i < flowBlocks.length; i++) {
      const blk = flowBlocks[i];

      if (blk.isSplittableTable) {
        const m =
          measuredHeights && measuredHeights[i] && Array.isArray(measuredHeights[i].rowHeights)
            ? measuredHeights[i]
            : {
              titlePx: blk.estTitlePx || 0,
              theadPx: blk.estTheadPx || 62,
              rowHeights: blk.estRowHeights || [],
              totalRowPx: blk.estTotalRowPx || 32
            };

        const totalRows = blk.rows.length;
        if (totalRows === 0) {
          const singleH = m.titlePx + m.theadPx + 30 + m.totalRowPx + 14;
          if (currentItems.length > 0 && currentPx + singleH > MAX_PAGE_CONTENT_PX) {
            pagedBuckets.push(currentItems);
            currentItems = [];
            currentPx = 0;
          }
          currentItems.push({
            id: `${blk.id}-seg-0`,
            node: blk.renderSegment({
              chunkRows: [],
              chunkIdx: 0,
              isFirstChunk: true,
              isLastChunk: true
            })
          });
          currentPx += singleH;
          continue;
        }

        let cursor = 0;
        let chunkIdx = 0;
        while (cursor < totalRows) {
          const isFirstChunk = cursor === 0;
          const marginPx = isFirstChunk ? 14 : 10;
          const headerOverheadPx = (isFirstChunk ? m.titlePx : 0) + m.theadPx + marginPx;

          // Require at least 2 rows (or all remaining rows) to start a table segment on the current page
          const minRowsToStart = Math.min(2, totalRows - cursor);
          let minNeededPx = headerOverheadPx;
          for (let k = 0; k < minRowsToStart; k++) {
            minNeededPx += m.rowHeights[cursor + k] || 30;
          }
          if (cursor + minRowsToStart === totalRows) {
            minNeededPx += m.totalRowPx;
          }

          if (currentItems.length > 0 && currentPx + minNeededPx > MAX_PAGE_CONTENT_PX) {
            pagedBuckets.push(currentItems);
            currentItems = [];
            currentPx = 0;
          }

          const availPx = MAX_PAGE_CONTENT_PX - currentPx;
          let usedPx = headerOverheadPx;
          let endCursor = cursor;

          while (endCursor < totalRows) {
            const rH = m.rowHeights[endCursor] || 30;
            const isFinalRow = endCursor === totalRows - 1;
            const extraTotal = isFinalRow ? m.totalRowPx : 0;

            if (usedPx + rH + extraTotal <= availPx || endCursor === cursor) {
              usedPx += rH + extraTotal;
              endCursor++;
            } else {
              break;
            }
          }

          const isLastChunk = endCursor >= totalRows;
          const chunkRows = blk.rows.slice(cursor, endCursor);
          currentItems.push({
            id: `${blk.id}-seg-${chunkIdx}`,
            node: blk.renderSegment({
              chunkRows,
              chunkIdx,
              isFirstChunk,
              isLastChunk
            })
          });
          currentPx += usedPx;
          cursor = endCursor;
          chunkIdx++;

          if (!isLastChunk) {
            pagedBuckets.push(currentItems);
            currentItems = [];
            currentPx = 0;
          }
        }
        continue;
      }

      const blkPx = blockHeights[i];
      let neededPx = blkPx;
      if (blk.isHeading) {
        let lookahead = i + 1;
        while (lookahead < flowBlocks.length) {
          neededPx += blockHeights[lookahead] || 0;
          if (!flowBlocks[lookahead].isHeading) break;
          lookahead++;
        }
      }

      if (currentItems.length > 0 && currentPx + neededPx > MAX_PAGE_CONTENT_PX) {
        pagedBuckets.push(currentItems);
        currentItems = [blk];
        currentPx = blkPx;
      } else {
        currentItems.push(blk);
        currentPx += blkPx;
      }
    }
    if (currentItems.length > 0) {
      pagedBuckets.push(currentItems);
    }

    return pagedBuckets;
  }, [flowBlocks, measuredHeights]);

  if (!ministryModel) return null;

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
      {/* Hidden 694px measurement probe */}
      <div
        ref={measureContainerRef}
        className="admin-a4-measure-probe"
        aria-hidden="true"
        style={{
          position: 'fixed',
          left: -10000,
          top: 0,
          width: 694,
          minWidth: 694,
          maxWidth: 694,
          visibility: 'hidden',
          pointerEvents: 'none',
          fontFamily: BATTAMBANG_FONT,
          fontSize: 16,
          lineHeight: 1.72,
          wordSpacing: 'normal',
          letterSpacing: 0,
          WebkitTextSizeAdjust: '100%',
          textSizeAdjust: '100%'
        }}
      >
        {flowBlocks.map(b => (
          <div key={`measure-min-${b.id}`} style={{ display: 'flow-root' }}>
            {b.node}
          </div>
        ))}
      </div>

      {pages.map((pageBlocks, idx) => (
        <div
          key={`ministry-a4-sheet-${idx + 1}`}
          className="admin-a4-page-sheet"
          data-report-page="true"
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
            fontFamily: BATTAMBANG_FONT,
            fontSize: 16,
            lineHeight: 1.72,
            color: '#000000',
            margin: '0 auto',
            flexShrink: 0
          }}
        >
          {/* Running Top Header (Original .docx: Khmer OS Battambang 10pt Italic + thickThinSmallGap 3pt #823B0B) */}
          <div
            style={{
              position: 'absolute',
              top: 20,
              left: 52,
              right: 48,
              zIndex: 2,
              pointerEvents: 'none'
            }}
          >
            <div
              style={{
                fontFamily: BATTAMBANG_FONT,
                fontSize: 13.3,
                fontStyle: 'italic',
                lineHeight: 1.45,
                color: '#000000',
                textAlign: 'left',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                paddingBottom: 3
              }}
            >
              {RUNNING_HF_TEXT}
            </div>
            <div style={{ width: '100%' }}>
              <div style={{ height: 3, background: RUNNING_HF_BORDER_COLOR }} />
              <div style={{ height: 1.5 }} />
              <div style={{ height: 1, background: RUNNING_HF_BORDER_COLOR }} />
            </div>
          </div>

          <div
            style={{
              position: 'relative',
              zIndex: 1,
              padding: '62px 48px 64px 52px',
              width: '100%',
              height: '100%',
              boxSizing: 'border-box'
            }}
          >
            {pageBlocks.map(b => b.node)}
          </div>

          {/* Running Bottom Footer (Original .docx: thinThickSmallGap 3pt #823B0B + Left Italic Title + Right "ទំព័រ ១") */}
          <div
            style={{
              position: 'absolute',
              bottom: 20,
              left: 52,
              right: 48,
              zIndex: 2,
              pointerEvents: 'none'
            }}
          >
            <div style={{ width: '100%', marginBottom: 4 }}>
              <div style={{ height: 1, background: RUNNING_HF_BORDER_COLOR }} />
              <div style={{ height: 1.5 }} />
              <div style={{ height: 3, background: RUNNING_HF_BORDER_COLOR }} />
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                gap: 12,
                lineHeight: 1.45,
                color: '#000000'
              }}
            >
              <span
                style={{
                  fontFamily: BATTAMBANG_FONT,
                  fontSize: 13.3,
                  fontStyle: 'italic',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
              >
                {RUNNING_HF_TEXT}
              </span>
              <span
                style={{
                  fontFamily: BATTAMBANG_FONT,
                  fontSize: 13.3,
                  fontStyle: 'normal',
                  whiteSpace: 'nowrap',
                  flexShrink: 0
                }}
              >
                {`ទំព័រ ${fmtNum(idx + 1)}`}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

