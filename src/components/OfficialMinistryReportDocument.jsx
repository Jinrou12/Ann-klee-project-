import React, { useMemo, useRef, useState, useLayoutEffect } from 'react';
import KhmerRoyalDivider from './KhmerRoyalDivider';
import { toKhmerDigits } from '../utils/khmerNumerals';

const SIEMREAP_FONT = "'Khmer OS Siemreap', 'Siemreap', 'Battambang', sans-serif";
const MOUL_FONT = "'Khmer OS Muol Light', 'Khmer OS Moul Light', 'Khmer OS Muol', 'Moul', serif";
const MAX_PAGE_CONTENT_PX = 1025;

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
    // Base Khmer consonants & digits
    if ((code >= 0x1780 && code <= 0x17b3) || (code >= 0x17e0 && code <= 0x17e9)) {
      units += 1.12;
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
 * Render description cell content:
 * - Short/medium items (<= maxSingleLineUnits) stay strictly on 1 line (scaling font slightly if needed)
 * - Longer items wrap cleanly into at most 2 lines (never 3+ lines) with adaptive font size
 */
function renderAdaptiveDescContent(text, maxSingleLineUnits = 19.0) {
  const clean = normalizeSingleSpaces(text);
  const units = getDescVisualUnits(clean);

  if (units <= maxSingleLineUnits) {
    const fontSize = units <= 14.5 ? 14.2 : units <= 16.8 ? 13.4 : 12.4;
    return (
      <div
        style={{
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'clip',
          fontSize,
          lineHeight: 1.45
        }}
      >
        {clean}
      </div>
    );
  }

  const twoLineFontSize = units <= 30 ? 13.2 : units <= 38 ? 12.2 : 11.4;
  return (
    <div
      style={{
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
        wordBreak: 'break-word',
        fontSize: twoLineFontSize,
        lineHeight: 1.42
      }}
    >
      {clean}
    </div>
  );
}

const thCellStyle = {
  border: '1px solid #000000',
  padding: '4px 5px',
  fontFamily: MOUL_FONT,
  fontWeight: 400,
  fontSize: 13.5,
  textAlign: 'center',
  verticalAlign: 'middle',
  background: '#ffffff',
  color: '#000000',
  lineHeight: 1.5,
  whiteSpace: 'nowrap'
};

const tdCellStyle = {
  border: '1px solid #000000',
  padding: '4px 6px',
  fontFamily: SIEMREAP_FONT,
  fontSize: 14.2,
  verticalAlign: 'middle',
  color: '#000000',
  lineHeight: 1.6
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
              fontSize: 15.2,
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
              fontFamily: MOUL_FONT,
              fontSize: 14.5,
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
          estPx: Math.max(29, Math.ceil(line.length / 58) * 28),
          node: (
            <div
              key={`${prefixKey}-${idx}`}
              style={{
                paddingLeft: indent,
                display: 'flex',
                alignItems: 'baseline',
                textAlign: 'left',
                marginBottom: 2,
                lineHeight: 1.78
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
      estPx: 495,
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

          {/* Left Provincial Dept & School (aligned cleanly to left block like OfficialAdminReportDocument) */}
          <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: 4, marginBottom: 10 }}>
            <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', lineHeight: 1.58, minWidth: 265 }}>
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
          <div style={{ fontFamily: MOUL_FONT, fontSize: 15.2, marginBottom: 4 }}>
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
                    maxWidth: 640,
                    lineHeight: 1.78,
                    marginBottom: 2
                  }}
                >
                  <span style={{ whiteSpace: 'nowrap' }}>-{row.label}</span>
                  <span style={{ minWidth: 155, textAlign: 'left', whiteSpace: 'nowrap' }}>{row.value}</span>
                </div>
              ) : (
                <div key={`gen-${idx}`} style={{ lineHeight: 1.78, marginBottom: 2 }}>
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

    // Helper for Hourly Teacher Tables (ច & ច.១)
    const renderHourlySemesterTableBlock = (key, title, tableData) => {
      const rowCount = (tableData?.rows || []).length || 5;
      blocks.push({
        id: key,
        estPx: 110 + rowCount * 34,
        node: (
          <div key={key} style={{ marginTop: 8, marginBottom: 10 }}>
            <div style={{ fontFamily: MOUL_FONT, fontSize: 15.2, marginBottom: 6 }}>{title}</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
              <colgroup>
                <col style={{ width: '6%' }} />
                <col style={{ width: '18%' }} />
                <col style={{ width: '19%' }} />
                <col style={{ width: '19%' }} />
                <col style={{ width: '14%' }} />
                <col style={{ width: '15%' }} />
                <col style={{ width: '9%' }} />
              </colgroup>
              <thead>
                <tr>
                  <th style={{ ...thCellStyle, width: '6%' }}>ល.រ</th>
                  <th style={{ ...thCellStyle, width: '18%' }}>បរិយាយ</th>
                  <th style={{ ...thCellStyle, width: '19%' }}>ចំណូលរួម</th>
                  <th style={{ ...thCellStyle, width: '19%' }}>ចំណាយ</th>
                  <th style={{ ...thCellStyle, width: '14%' }}>ចំនួនម៉ោង</th>
                  <th style={{ ...thCellStyle, width: '15%' }}>សមតុល្យ</th>
                  <th style={{ ...thCellStyle, width: '9%' }}>ផ្សេងៗ</th>
                </tr>
              </thead>
              <tbody>
                {(tableData?.rows || []).map((r, i) => (
                  <tr key={i}>
                    <td style={{ ...tdCellStyle, textAlign: 'center' }}>{r.no}</td>
                    <td style={{ ...tdCellStyle, textAlign: 'center' }}>{r.label}</td>
                    <td style={{ ...tdCellStyle, textAlign: 'center' }}>{r.incomeText}</td>
                    <td style={{ ...tdCellStyle, textAlign: 'center' }}>{r.expenseText}</td>
                    <td style={{ ...tdCellStyle, textAlign: 'center' }}>{r.hoursText}</td>
                    <td style={{ ...tdCellStyle, textAlign: 'center' }}>{r.balanceText}</td>
                    <td style={{ ...tdCellStyle, textAlign: 'center' }}>{r.note || ''}</td>
                  </tr>
                ))}
                <tr>
                  <td
                    colSpan={2}
                    style={{
                      ...tdCellStyle,
                      fontFamily: MOUL_FONT,
                      fontSize: 13.2,
                      textAlign: 'center'
                    }}
                  >
                    សមតុល្យសាច់ប្រាក់ចំណូល និងចំណាយនៅសល់
                  </td>
                  <td style={{ ...tdCellStyle, fontWeight: 700, textAlign: 'center' }}>
                    {tableData?.sumIncomeText}
                  </td>
                  <td style={{ ...tdCellStyle, fontWeight: 700, textAlign: 'center' }}>
                    {tableData?.sumExpenseText}
                  </td>
                  <td style={{ ...tdCellStyle, fontWeight: 700, textAlign: 'center' }}>
                    {tableData?.sumHoursText}
                  </td>
                  <td style={{ ...tdCellStyle, fontWeight: 700, textAlign: 'center' }}>
                    {tableData?.totalBalanceText}
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
          <div style={{ fontFamily: MOUL_FONT, fontSize: 15.2, marginBottom: 6 }}>
            ច.{fmtNum(2)} ចំណូលចំណាយប្រាក់ម៉ោងប្រចាំឆ្នាំ {ministryModel.yearKhmer}
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: '8%' }} />
              <col style={{ width: '22%' }} />
              <col style={{ width: '20%' }} />
              <col style={{ width: '20%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '16%' }} />
            </colgroup>
            <thead>
              <tr>
                <th style={{ ...thCellStyle, width: '8%' }}>ល.រ</th>
                <th style={{ ...thCellStyle, width: '22%' }}>បរិយាយ</th>
                <th style={{ ...thCellStyle, width: '20%' }}>ចំណូល</th>
                <th style={{ ...thCellStyle, width: '20%' }}>ចំណាយ</th>
                <th style={{ ...thCellStyle, width: '14%' }}>ចំនួនម៉ោង</th>
                <th style={{ ...thCellStyle, width: '16%' }}>សមតុល្យ</th>
              </tr>
            </thead>
            <tbody>
              {(ministryModel.hourlyAnnual?.rows || []).map((r, i) => (
                <tr key={i}>
                  <td style={{ ...tdCellStyle, textAlign: 'center' }}>{r.no}</td>
                  <td style={{ ...tdCellStyle, textAlign: 'center' }}>{r.label}</td>
                  <td style={{ ...tdCellStyle, textAlign: 'center' }}>{r.incomeText}</td>
                  <td style={{ ...tdCellStyle, textAlign: 'center' }}>{r.expenseText}</td>
                  <td style={{ ...tdCellStyle, textAlign: 'center' }}>{r.hoursText}</td>
                  <td style={{ ...tdCellStyle, textAlign: 'center' }}>{r.balanceText}</td>
                </tr>
              ))}
              <tr>
                <td
                  colSpan={2}
                  style={{ ...tdCellStyle, fontFamily: MOUL_FONT, fontSize: 13.2, textAlign: 'center' }}
                >
                  សមតុល្យសាច់ប្រាក់ចំណូល និងចំណាយនៅសល់
                </td>
                <td style={{ ...tdCellStyle, fontWeight: 700, textAlign: 'center' }}>
                  {ministryModel.hourlyAnnual?.sumIncomeText}
                </td>
                <td style={{ ...tdCellStyle, fontWeight: 700, textAlign: 'center' }}>
                  {ministryModel.hourlyAnnual?.sumExpenseText}
                </td>
                <td style={{ ...tdCellStyle, fontWeight: 700, textAlign: 'center' }}>
                  {ministryModel.hourlyAnnual?.sumHoursText}
                </td>
                <td style={{ ...tdCellStyle, fontWeight: 700, textAlign: 'center' }}>
                  {ministryModel.hourlyAnnual?.totalBalanceText}
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
                style={{ fontFamily: MOUL_FONT, fontSize: 15.2, marginBottom: 6 }}
              >
                {title}
              </div>
            )}
            <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
              <colgroup>
                <col style={{ width: '5.5%' }} />
                <col style={{ width: '36.5%' }} />
                <col style={{ width: '12.5%' }} />
                <col style={{ width: '15%' }} />
                <col style={{ width: '11%' }} />
                <col style={{ width: '10.5%' }} />
                <col style={{ width: '9%' }} />
              </colgroup>
              <thead data-part="thead">
                <tr>
                  <th colSpan={7} style={{ ...thCellStyle, fontSize: 14 }}>
                    {isFirstChunk ? 'តារាងចំណាយ' : 'តារាងចំណាយ (បន្ត)'}
                  </th>
                </tr>
                <tr>
                  <th style={{ ...thCellStyle, width: '5.5%' }}>ល.រ</th>
                  <th style={{ ...thCellStyle, width: '36.5%' }}>បរិយាយ</th>
                  <th style={{ ...thCellStyle, width: '12.5%' }}>ចំណូលរួម</th>
                  <th style={{ ...thCellStyle, width: '15%' }}>ចំណាយ</th>
                  <th style={{ ...thCellStyle, width: '11%' }}>ចំនួន</th>
                  <th style={{ ...thCellStyle, width: '10.5%' }}>សមតុល្យ</th>
                  <th style={{ ...thCellStyle, width: '9%' }}>ផ្សេងៗ</th>
                </tr>
              </thead>
              <tbody>
                {chunkRows.length === 0 ? (
                  <tr data-row-idx={0}>
                    <td colSpan={7} style={{ ...tdCellStyle, textAlign: 'center' }}>
                      គ្មាន
                    </td>
                  </tr>
                ) : (
                  chunkRows.map((r, i) => (
                    <tr key={i} data-row-idx={i}>
                      <td style={{ ...tdCellStyle, textAlign: 'center', whiteSpace: 'nowrap' }}>{r.no}</td>
                      <td style={{ ...tdCellStyle, textAlign: 'left', padding: '3px 6px' }}>
                        {renderAdaptiveDescContent(r.desc, 19.0)}
                      </td>
                      <td style={{ ...tdCellStyle, textAlign: 'center', whiteSpace: 'nowrap' }}>{r.source}</td>
                      <td style={{ ...tdCellStyle, textAlign: 'center', whiteSpace: 'nowrap' }}>{r.amountText}</td>
                      <td
                        style={{
                          ...tdCellStyle,
                          textAlign: 'center',
                          whiteSpace: 'nowrap',
                          fontSize: String(r.qty || '').length > 9 ? 12.6 : 14.2
                        }}
                      >
                        {r.qty}
                      </td>
                      <td style={{ ...tdCellStyle, textAlign: 'center', whiteSpace: 'nowrap' }}>{r.balance}</td>
                      <td style={{ ...tdCellStyle, textAlign: 'center' }}>
                        {r.note ? renderAdaptiveDescContent(r.note, 8) : ''}
                      </td>
                    </tr>
                  ))
                )}
                {isLastChunk && (
                  <tr data-part="total">
                    <td colSpan={3} style={{ ...tdCellStyle, fontFamily: MOUL_FONT, textAlign: 'center' }}>
                      ចំណាយសរុប
                    </td>
                    <td style={{ ...tdCellStyle, fontWeight: 700, textAlign: 'center', whiteSpace: 'nowrap' }}>
                      {semData?.totalExpenseText}
                    </td>
                    <td colSpan={3} style={tdCellStyle}></td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        );
      };

      const estExpRowHeights = rawExpRows.map(r =>
        getDescVisualUnits(r.desc) > 19.0 ? 48 : 30
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
            <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
              <colgroup>
                <col style={{ width: '7%' }} />
                <col style={{ width: '43%' }} />
                <col style={{ width: '18%' }} />
                <col style={{ width: '12%' }} />
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
                  <th rowSpan={2} style={{ ...thCellStyle, width: '43%' }}>
                    បរិយាយ
                  </th>
                  <th colSpan={2} style={{ ...thCellStyle, width: '30%' }}>
                    ថវិកា
                  </th>
                  <th rowSpan={2} style={{ ...thCellStyle, width: '20%' }}>
                    សេចក្ដីផ្សេងៗ
                  </th>
                </tr>
                <tr>
                  <th style={{ ...thCellStyle, width: '18%' }}>រៀល</th>
                  <th style={{ ...thCellStyle, width: '12%' }}>ដុល្លារ</th>
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
                      <td style={{ ...tdCellStyle, textAlign: 'center', whiteSpace: 'nowrap' }}>{r.no}</td>
                      <td style={{ ...tdCellStyle, textAlign: 'left', padding: '3px 6px' }}>
                        {renderAdaptiveDescContent(r.desc, 19.5)}
                      </td>
                      <td style={{ ...tdCellStyle, textAlign: 'center', whiteSpace: 'nowrap' }}>{r.khrText}</td>
                      <td style={{ ...tdCellStyle, textAlign: 'center', whiteSpace: 'nowrap' }}>{r.usdText}</td>
                      <td style={{ ...tdCellStyle, textAlign: 'center' }}>
                        {r.note ? renderAdaptiveDescContent(r.note, 11) : ''}
                      </td>
                    </tr>
                  ))
                )}
                {isLastChunk && (
                  <tr data-part="total">
                    <td colSpan={2} style={{ ...tdCellStyle, fontFamily: MOUL_FONT, textAlign: 'center' }}>
                      សរុបចំណូល
                    </td>
                    <td style={{ ...tdCellStyle, fontWeight: 700, textAlign: 'center', whiteSpace: 'nowrap' }}>
                      {semData?.totalIncomeKHRText}
                    </td>
                    <td style={{ ...tdCellStyle, fontWeight: 700, textAlign: 'center', whiteSpace: 'nowrap' }}>
                      {semData?.totalIncomeUSDText}
                    </td>
                    <td style={{ ...tdCellStyle, textAlign: 'center' }}>
                      {semData?.inKindSummary ? renderAdaptiveDescContent(semData.inKindSummary, 11) : ''}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        );
      };

      const estIncRowHeights = rawIncRows.map(r =>
        getDescVisualUnits(r.desc) > 19.5 ? 48 : 30
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
          <div style={{ fontFamily: MOUL_FONT, fontSize: 15.2, marginBottom: 6 }}>
            ច.{fmtNum(5)} ចំណូល ចំណាយ លើសម្ភារៈការិយាល័យ ប្រចាំឆ្នាំ {ministryModel.yearKhmer}
          </div>
          <table
            style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}
          >
            <thead>
              <tr>
                <th style={{ ...thCellStyle, width: '8%' }}>ល.រ</th>
                <th style={{ ...thCellStyle, width: '24%' }}>បរិយាយ</th>
                <th style={{ ...thCellStyle, width: '23%' }}>ចំណូល</th>
                <th style={{ ...thCellStyle, width: '23%' }}>ចំណាយ</th>
                <th style={{ ...thCellStyle, width: '22%' }}>ផ្សេងៗ</th>
              </tr>
            </thead>
            <tbody>
              {(ministryModel.officeAnnual?.rows || []).map((r, i) => (
                <tr key={i}>
                  <td style={{ ...tdCellStyle, textAlign: 'center' }}>{r.no}</td>
                  <td style={{ ...tdCellStyle, textAlign: 'center' }}>{r.label}</td>
                  <td style={{ ...tdCellStyle, textAlign: 'center' }}>{r.incomeText}</td>
                  <td style={{ ...tdCellStyle, textAlign: 'center' }}>{r.expenseText}</td>
                  <td style={{ ...tdCellStyle, textAlign: 'center' }}>{r.note || ''}</td>
                </tr>
              ))}
              <tr>
                <td colSpan={2} style={{ ...tdCellStyle, fontFamily: MOUL_FONT, textAlign: 'center' }}>
                  សរុបទាំងពីរឆមាស
                </td>
                <td style={{ ...tdCellStyle, fontWeight: 700, textAlign: 'center' }}>
                  {ministryModel.officeAnnual?.totalIncomeText}
                </td>
                <td style={{ ...tdCellStyle, fontWeight: 700, textAlign: 'center' }}>
                  {ministryModel.officeAnnual?.totalExpenseText}
                </td>
                <td style={{ ...tdCellStyle, textAlign: 'center' }}>
                  {ministryModel.officeAnnual?.inKindSummary || ''}
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
          <div style={{ fontFamily: MOUL_FONT, fontSize: 15.2, marginBottom: 6 }}>
            ចំណូល ចំណាយ កម្មវិធីចែកបណ្ណសរសើរ
          </div>
          <table
            style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}
          >
            <tbody>
              <tr>
                <td style={{ ...tdCellStyle, width: '8%', textAlign: 'center' }}>{fmtNum(1)}</td>
                <td style={{ ...tdCellStyle, width: '48%' }}>ចំណូលពីការចែកបណ្ណសរសើរ</td>
                <td style={{ ...tdCellStyle, width: '24%', textAlign: 'center' }}>
                  {ministryModel.awardCeremonyTable?.income1Text}
                </td>
                <td style={{ ...tdCellStyle, width: '20%' }}></td>
              </tr>
              <tr>
                <td style={{ ...tdCellStyle, textAlign: 'center' }}>{fmtNum(2)}</td>
                <td style={tdCellStyle}>ចំណូលពីវត្ត</td>
                <td style={{ ...tdCellStyle, textAlign: 'center' }}>
                  {ministryModel.awardCeremonyTable?.income2Text}
                </td>
                <td style={tdCellStyle}></td>
              </tr>
              <tr>
                <td colSpan={2} style={{ ...tdCellStyle, fontFamily: MOUL_FONT, textAlign: 'center' }}>
                  ចំណូលសរុបក្នុងកម្មវិធីចែកបណ្ណសរសើរ
                </td>
                <td style={{ ...tdCellStyle, fontWeight: 700, textAlign: 'center' }}>
                  {ministryModel.awardCeremonyTable?.totalIncomeText}
                </td>
                <td style={tdCellStyle}></td>
              </tr>
              <tr>
                <td colSpan={2} style={{ ...tdCellStyle, fontFamily: MOUL_FONT, textAlign: 'center' }}>
                  ចំណាយសរុបក្នុងកម្មវិធីចែកបណ្ណសរសើរ
                </td>
                <td style={{ ...tdCellStyle, fontWeight: 700, textAlign: 'center' }}>
                  {ministryModel.awardCeremonyTable?.totalExpenseText}
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
          <div style={{ fontFamily: MOUL_FONT, fontSize: 15.2, marginBottom: 6 }}>
            ចំណូល ចំណាយ សរុបរួមប្រចាំឆ្នាំ{ministryModel.yearKhmer}
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: '8%' }} />
              <col style={{ width: '36%' }} />
              <col style={{ width: '22%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '20%' }} />
            </colgroup>
            <thead>
              <tr>
                <th rowSpan={2} style={{ ...thCellStyle, width: '8%' }}>
                  ល.រ
                </th>
                <th rowSpan={2} style={{ ...thCellStyle, width: '36%' }}>
                  បរិយាយ
                </th>
                <th colSpan={2} style={{ ...thCellStyle, width: '36%' }}>
                  ថវិកា
                </th>
                <th rowSpan={2} style={{ ...thCellStyle, width: '20%' }}>
                  ផ្សេងៗ
                </th>
              </tr>
              <tr>
                <th style={{ ...thCellStyle, width: '22%' }}>រៀល</th>
                <th style={{ ...thCellStyle, width: '14%' }}>ដុល្លារ</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ ...tdCellStyle, textAlign: 'center' }}>{fmtNum(1)}</td>
                <td style={tdCellStyle}>ចំណូលរួមប្រចាំឆ្នាំ</td>
                <td style={{ ...tdCellStyle, textAlign: 'center', fontWeight: 700 }}>
                  {ministryModel.grandAnnualTable?.incomeKHRText}
                </td>
                <td style={{ ...tdCellStyle, textAlign: 'center', fontWeight: 700 }}>
                  {ministryModel.grandAnnualTable?.incomeUSDText}
                </td>
                <td style={tdCellStyle}></td>
              </tr>
              <tr>
                <td style={{ ...tdCellStyle, textAlign: 'center' }}>{fmtNum(2)}</td>
                <td style={tdCellStyle}>ចំណាយរួមប្រចាំឆ្នាំ</td>
                <td style={{ ...tdCellStyle, textAlign: 'center', fontWeight: 700 }}>
                  {ministryModel.grandAnnualTable?.expenseKHRText}
                </td>
                <td style={{ ...tdCellStyle, textAlign: 'center', fontWeight: 700 }}>
                  {ministryModel.grandAnnualTable?.expenseUSDText}
                </td>
                <td style={tdCellStyle}></td>
              </tr>
              <tr>
                <td colSpan={2} style={{ ...tdCellStyle, fontFamily: MOUL_FONT, textAlign: 'center' }}>
                  សមតុល្យ
                </td>
                <td style={{ ...tdCellStyle, fontFamily: MOUL_FONT, textAlign: 'center' }}>
                  {ministryModel.grandAnnualTable?.balanceKHRText}
                </td>
                <td style={{ ...tdCellStyle, fontFamily: MOUL_FONT, textAlign: 'center' }}>
                  {ministryModel.grandAnnualTable?.balanceUSDText}
                </td>
                <td style={{ ...tdCellStyle, textAlign: 'center' }}>
                  {ministryModel.grandAnnualTable?.balanceNote}
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
    blocks.push({
      id: 'closing-sig-and-cc',
      estPx: 270,
      node: (
        <div key="closing-sig-and-cc" style={{ marginTop: 10 }}>
          {/* Right-aligned Date & Reporter */}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <div style={{ width: '58%', textAlign: 'center', lineHeight: 1.72 }}>
              <div>{ministryModel.lunarDateLine}</div>
              <div>{ministryModel.solarDateLine}</div>
              <div style={{ marginTop: 2 }}>
                លេខ {ministryModel.docNumber || '.....................................'}{' '}
                <span style={{ fontFamily: MOUL_FONT }}>{ministryModel.reporterTitle}</span>
              </div>
            </div>
          </div>

          {/* Center-left Approval & Principal */}
          <div style={{ width: '52%', textAlign: 'center', marginTop: 6, lineHeight: 1.75 }}>
            <div style={{ fontFamily: MOUL_FONT }}>បានឃើញ និងឯកភាព</div>
            <div style={{ fontFamily: MOUL_FONT, marginTop: 4 }}>
              {ministryModel.signerTitle || 'ព្រះនាយក'}
            </div>
          </div>

          {/* Bottom-left ចម្លងប្រគេនជូន */}
          <div style={{ marginTop: 28, lineHeight: 1.72 }}>
            <div style={{ fontFamily: MOUL_FONT, fontSize: 14.5, marginBottom: 2 }}>
              ចម្លងប្រគេនជូន
            </div>
            {(ministryModel.ccList || []).map((cc, idx) => (
              <div key={idx} style={{ fontSize: 14.5 }}>
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
          fontFamily: SIEMREAP_FONT,
          fontSize: 15.2,
          lineHeight: 1.78,
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
            fontFamily: SIEMREAP_FONT,
            fontSize: 15.2,
            lineHeight: 1.78,
            color: '#000000',
            margin: '0 auto',
            flexShrink: 0
          }}
        >
          <div
            style={{
              position: 'relative',
              zIndex: 1,
              padding: '36px 48px 50px 52px',
              width: '100%',
              height: '100%',
              boxSizing: 'border-box'
            }}
          >
            {pageBlocks.map(b => b.node)}
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

