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

const thCellStyle = {
  border: '1px solid #000000',
  padding: '4px 6px',
  fontFamily: MOUL_FONT,
  fontWeight: 400,
  fontSize: 13,
  textAlign: 'center',
  verticalAlign: 'middle',
  background: '#ffffff',
  color: '#000000',
  lineHeight: 1.5
};

const tdCellStyle = {
  border: '1px solid #000000',
  padding: '4px 6px',
  fontFamily: SIEMREAP_FONT,
  fontSize: 13.5,
  verticalAlign: 'middle',
  color: '#000000',
  lineHeight: 1.55
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
        estPx: 34,
        node: (
          <div
            key={key}
            style={{
              paddingLeft: indent,
              paddingTop: topPad,
              marginBottom: 3,
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

    const pushSubHeading = (key, text, indent = 18) => {
      blocks.push({
        id: key,
        isHeading: true,
        estPx: 30,
        node: (
          <div
            key={key}
            style={{
              paddingLeft: indent,
              paddingTop: 3,
              marginBottom: 2,
              fontFamily: MOUL_FONT,
              fontSize: 13.8,
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
          estPx: Math.max(27, Math.ceil(line.length / 62) * 26),
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
      estPx: 460,
      node: (
        <div key="header-and-sec-a" style={{ marginBottom: 6 }}>
          {/* Kingdom Header Centered */}
          <div style={{ textAlign: 'center', lineHeight: 1.55 }}>
            <div style={{ fontFamily: MOUL_FONT, fontSize: 16 }}>ព្រះរាជាណាចក្រកម្ពុជា</div>
            <div style={{ fontFamily: MOUL_FONT, fontSize: 14.5 }}>ជាតិ សាសនា ព្រះមហាក្សត្រ</div>
            <div style={{ marginTop: 2 }}>
              <KhmerRoyalDivider color="#000000" />
            </div>
          </div>

          {/* Left Provincial Dept & School */}
          <div style={{ width: '54%', textAlign: 'center', lineHeight: 1.65, marginTop: 4, marginBottom: 10 }}>
            <div style={{ fontFamily: MOUL_FONT, fontSize: 13.8, whiteSpace: 'nowrap' }}>
              មន្ទីរធម្មការ និងសាសនាខេត្តកំពង់ចាម
            </div>
            <div style={{ fontFamily: MOUL_FONT, fontSize: 13.8, whiteSpace: 'nowrap' }}>
              ពុទ្ធិកបឋមសិក្សាកម្រង ហ៊ុន ណេង
            </div>
            <div style={{ fontFamily: MOUL_FONT, fontSize: 13.8, whiteSpace: 'nowrap' }}>
              ក្រុងកំពង់ចាម
            </div>
          </div>

          {/* 3-Line Report Title */}
          <div style={{ textAlign: 'center', lineHeight: 1.65, marginBottom: 10 }}>
            <div style={{ fontFamily: MOUL_FONT, fontSize: 15 }}>របាយការណ៍</div>
            <div style={{ fontFamily: MOUL_FONT, fontSize: 14.5 }}>ស្តីពី</div>
            <div style={{ fontFamily: MOUL_FONT, fontSize: 15 }}>{ministryModel.fullReportTitle}</div>
          </div>

          {/* ក. ព័ត៌មានទូទៅ */}
          <div style={{ fontFamily: MOUL_FONT, fontSize: 14.5, marginBottom: 4 }}>
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
                    maxWidth: 540,
                    lineHeight: 1.72,
                    marginBottom: 2
                  }}
                >
                  <span>-{row.label}</span>
                  <span style={{ minWidth: 150, textAlign: 'left' }}>{row.value}</span>
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

    // Helper for Hourly Teacher Tables (ច & ច.១)
    const renderHourlySemesterTableBlock = (key, title, tableData) => {
      blocks.push({
        id: key,
        estPx: 270,
        node: (
          <div key={key} style={{ marginTop: 8, marginBottom: 10 }}>
            <div style={{ fontFamily: MOUL_FONT, fontSize: 14, marginBottom: 6 }}>{title}</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
              <thead>
                <tr>
                  <th style={{ ...thCellStyle, width: '7%' }}>ល.រ</th>
                  <th style={{ ...thCellStyle, width: '18%' }}>បរិយាយ</th>
                  <th style={{ ...thCellStyle, width: '19%' }}>ចំណូលរួម</th>
                  <th style={{ ...thCellStyle, width: '19%' }}>ចំណាយ</th>
                  <th style={{ ...thCellStyle, width: '14%' }}>ចំនួនម៉ោង</th>
                  <th style={{ ...thCellStyle, width: '15%' }}>សមតុល្យ</th>
                  <th style={{ ...thCellStyle, width: '8%' }}>ផ្សេងៗ</th>
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
                      fontSize: 12.5,
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
      estPx: 170,
      node: (
        <div key="tbl-hourly-annual" style={{ marginTop: 8, marginBottom: 10 }}>
          <div style={{ fontFamily: MOUL_FONT, fontSize: 14, marginBottom: 6 }}>
            ច.{fmtNum(2)} ចំណូលចំណាយប្រាក់ម៉ោងប្រចាំឆ្នាំ {ministryModel.yearKhmer}
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
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
                  style={{ ...tdCellStyle, fontFamily: MOUL_FONT, fontSize: 12.5, textAlign: 'center' }}
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

    // Helper for Office Supplies Tables (ច.៣ & ច.៤) — Chunked into page-safe table segments
    const renderOfficeSemesterBlock = (keyPrefix, title, semData) => {
      const MAX_EXP_ROWS_PER_CHUNK = 16;
      const MAX_INC_ROWS_PER_CHUNK = 16;
      const rawExpRows = semData?.expenseRows || [];
      const rawIncRows = semData?.incomeRows || [];

      const expChunks = [];
      if (rawExpRows.length === 0) {
        expChunks.push([]);
      } else {
        for (let i = 0; i < rawExpRows.length; i += MAX_EXP_ROWS_PER_CHUNK) {
          expChunks.push(rawExpRows.slice(i, i + MAX_EXP_ROWS_PER_CHUNK));
        }
      }

      expChunks.forEach((chunkRows, chunkIdx) => {
        const isFirstChunk = chunkIdx === 0;
        const isLastChunk = chunkIdx === expChunks.length - 1;
        const blockKey = `${keyPrefix}-exp-${chunkIdx}`;

        blocks.push({
          id: blockKey,
          estPx: (isFirstChunk ? 120 : 90) + Math.max(1, chunkRows.length) * 32 + (isLastChunk ? 36 : 0),
          node: (
            <div key={blockKey} style={{ marginTop: isFirstChunk ? 8 : 4, marginBottom: 6 }}>
              {isFirstChunk && (
                <div style={{ fontFamily: MOUL_FONT, fontSize: 14, marginBottom: 6 }}>{title}</div>
              )}
              <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                <thead>
                  <tr>
                    <th colSpan={7} style={{ ...thCellStyle, fontSize: 13.5 }}>
                      {isFirstChunk ? 'តារាងចំណាយ' : 'តារាងចំណាយ (បន្ត)'}
                    </th>
                  </tr>
                  <tr>
                    <th style={{ ...thCellStyle, width: '7%' }}>ល.រ</th>
                    <th style={{ ...thCellStyle, width: '35%' }}>បរិយាយ</th>
                    <th style={{ ...thCellStyle, width: '13%' }}>ចំណូលរួម</th>
                    <th style={{ ...thCellStyle, width: '16%' }}>ចំណាយ</th>
                    <th style={{ ...thCellStyle, width: '11%' }}>ចំនួន</th>
                    <th style={{ ...thCellStyle, width: '9%' }}>សមតុល្យ</th>
                    <th style={{ ...thCellStyle, width: '9%' }}>ផ្សេងៗ</th>
                  </tr>
                </thead>
                <tbody>
                  {chunkRows.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ ...tdCellStyle, textAlign: 'center' }}>
                        គ្មាន
                      </td>
                    </tr>
                  ) : (
                    chunkRows.map((r, i) => (
                      <tr key={i}>
                        <td style={{ ...tdCellStyle, textAlign: 'center' }}>{r.no}</td>
                        <td style={{ ...tdCellStyle, textAlign: 'left' }}>{r.desc}</td>
                        <td style={{ ...tdCellStyle, textAlign: 'center' }}>{r.source}</td>
                        <td style={{ ...tdCellStyle, textAlign: 'center' }}>{r.amountText}</td>
                        <td style={{ ...tdCellStyle, textAlign: 'center' }}>{r.qty}</td>
                        <td style={{ ...tdCellStyle, textAlign: 'center' }}>{r.balance}</td>
                        <td style={{ ...tdCellStyle, textAlign: 'center' }}>{r.note}</td>
                      </tr>
                    ))
                  )}
                  {isLastChunk && (
                    <tr>
                      <td colSpan={3} style={{ ...tdCellStyle, fontFamily: MOUL_FONT, textAlign: 'center' }}>
                        ចំណាយសរុប
                      </td>
                      <td style={{ ...tdCellStyle, fontWeight: 700, textAlign: 'center' }}>
                        {semData?.totalExpenseText}
                      </td>
                      <td colSpan={3} style={tdCellStyle}></td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )
        });
      });

      const incChunks = [];
      if (rawIncRows.length === 0) {
        incChunks.push([]);
      } else {
        for (let i = 0; i < rawIncRows.length; i += MAX_INC_ROWS_PER_CHUNK) {
          incChunks.push(rawIncRows.slice(i, i + MAX_INC_ROWS_PER_CHUNK));
        }
      }

      incChunks.forEach((chunkRows, chunkIdx) => {
        const isFirstChunk = chunkIdx === 0;
        const isLastChunk = chunkIdx === incChunks.length - 1;
        const blockKey = `${keyPrefix}-inc-${chunkIdx}`;

        blocks.push({
          id: blockKey,
          estPx: 110 + Math.max(1, chunkRows.length) * 32 + (isLastChunk ? 36 : 0),
          node: (
            <div key={blockKey} style={{ marginBottom: isLastChunk ? 10 : 6 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                <thead>
                  <tr>
                    <th colSpan={5} style={{ ...thCellStyle, fontSize: 13.5 }}>
                      {isFirstChunk ? 'តារាងចំណូល' : 'តារាងចំណូល (បន្ត)'}
                    </th>
                  </tr>
                  <tr>
                    <th rowSpan={2} style={{ ...thCellStyle, width: '8%' }}>
                      ល.រ
                    </th>
                    <th rowSpan={2} style={{ ...thCellStyle, width: '40%' }}>
                      បរិយាយ
                    </th>
                    <th colSpan={2} style={{ ...thCellStyle, width: '32%' }}>
                      ថវិកា
                    </th>
                    <th rowSpan={2} style={{ ...thCellStyle, width: '20%' }}>
                      សេចក្ដីផ្សេងៗ
                    </th>
                  </tr>
                  <tr>
                    <th style={{ ...thCellStyle, width: '18%' }}>រៀល</th>
                    <th style={{ ...thCellStyle, width: '14%' }}>ដុល្លារ</th>
                  </tr>
                </thead>
                <tbody>
                  {chunkRows.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ ...tdCellStyle, textAlign: 'center' }}>
                        គ្មាន
                      </td>
                    </tr>
                  ) : (
                    chunkRows.map((r, i) => (
                      <tr key={i}>
                        <td style={{ ...tdCellStyle, textAlign: 'center' }}>{r.no}</td>
                        <td style={{ ...tdCellStyle, textAlign: 'left' }}>{r.desc}</td>
                        <td style={{ ...tdCellStyle, textAlign: 'center' }}>{r.khrText}</td>
                        <td style={{ ...tdCellStyle, textAlign: 'center' }}>{r.usdText}</td>
                        <td style={{ ...tdCellStyle, textAlign: 'center' }}>{r.note}</td>
                      </tr>
                    ))
                  )}
                  {isLastChunk && (
                    <tr>
                      <td colSpan={2} style={{ ...tdCellStyle, fontFamily: MOUL_FONT, textAlign: 'center' }}>
                        សរុបចំណូល
                      </td>
                      <td style={{ ...tdCellStyle, fontWeight: 700, textAlign: 'center' }}>
                        {semData?.totalIncomeKHRText}
                      </td>
                      <td style={{ ...tdCellStyle, fontWeight: 700, textAlign: 'center' }}>
                        {semData?.totalIncomeUSDText}
                      </td>
                      <td style={{ ...tdCellStyle, textAlign: 'center' }}>
                        {semData?.inKindSummary || ''}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )
        });
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

    // ច.៥ Office Supplies Annual Summary + Award Ceremony + Grand Total Annual Table
    blocks.push({
      id: 'tbl-office-annual-and-totals',
      estPx: 440,
      node: (
        <div key="tbl-office-annual-and-totals" style={{ marginTop: 8, marginBottom: 10 }}>
          {/* ច.៥ */}
          <div style={{ fontFamily: MOUL_FONT, fontSize: 14, marginBottom: 6 }}>
            ច.{fmtNum(5)} ចំណូល ចំណាយ លើសម្ភារៈការិយាល័យ ប្រចាំឆ្នាំ {ministryModel.yearKhmer}
          </div>
          <table
            style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', marginBottom: 12 }}
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

          {/* កម្មវិធីចែកបណ្ណសរសើរ */}
          <div style={{ fontFamily: MOUL_FONT, fontSize: 14, marginBottom: 6 }}>
            ចំណូល ចំណាយ កម្មវិធីចែកបណ្ណសរសើរ
          </div>
          <table
            style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', marginBottom: 12 }}
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

          {/* ចំណូល ចំណាយ សរុបរួមប្រចាំឆ្នាំ */}
          <div style={{ fontFamily: MOUL_FONT, fontSize: 14, marginBottom: 6 }}>
            ចំណូល ចំណាយ សរុបរួមប្រចាំឆ្នាំ{ministryModel.yearKhmer}
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
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
          <div style={{ marginTop: 28, lineHeight: 1.68 }}>
            <div style={{ fontFamily: MOUL_FONT, fontSize: 13.5, marginBottom: 2 }}>
              ចម្លងប្រគេនជូន
            </div>
            {(ministryModel.ccList || []).map((cc, idx) => (
              <div key={idx} style={{ fontSize: 13.5 }}>
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
      const heights = children.map(child => {
        const rect = child.getBoundingClientRect();
        return scaleFactor > 0 ? rect.height / scaleFactor : rect.height;
      });
      setMeasuredHeights(prev => {
        if (
          prev &&
          prev.length === heights.length &&
          prev.every((v, i) => Math.abs(v - heights[i]) <= 0.5)
        ) {
          return prev;
        }
        return heights;
      });
    };

    measureNow();
    if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) {
      document.fonts.ready.then(measureNow).catch(() => {});
    }
  }, [flowBlocks]);

  const pages = useMemo(() => {
    if (!flowBlocks.length) return [];
    const blockHeights = flowBlocks.map((blk, i) =>
      measuredHeights && measuredHeights[i] ? measuredHeights[i] : blk.estPx
    );

    const pagedBuckets = [];
    let currentItems = [];
    let currentPx = 0;

    for (let i = 0; i < flowBlocks.length; i++) {
      const blk = flowBlocks[i];
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
          fontSize: 14.2,
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
            fontFamily: SIEMREAP_FONT,
            fontSize: 14.2,
            lineHeight: 1.72,
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

