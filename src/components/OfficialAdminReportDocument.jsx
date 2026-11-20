import React, { useMemo, useRef, useState, useEffect, useLayoutEffect } from 'react';
import KhmerRoyalDivider from './KhmerRoyalDivider';
import KhmerJustifiedText from './KhmerJustifiedText';
import ReportEditableZone, { renderBlocksWithEditZones } from './ReportEditableZone';
import { toKhmerDigits } from '../utils/khmerNumerals';
import { renderSchoolHistoryTableChunk } from './OfficialSchoolHistoryDocument';
import { subscribeKhmerFontReady, getKhmerFontVersion } from '../utils/khmerJustifyEngine';

function mapAdminBlockIdToSection(blockId = '') {
  const id = String(blockId || '');
  if (id === 'sec-hist-head' || id.startsWith('hist-bg-para-')) return 'history_bg';
  if (id === 'sec-mgmt-head' || id === 'sec-mgmt-intro' || id.startsWith('comb-role-')) return 'management';
  if (id === 'sec-stats-head' || id.startsWith('comb-staff-') || id === 'sec-stats-subB' || id.startsWith('comb-st-') || id.startsWith('st-p2-')) return 'stats';
  if (id === 'sec3-head' || id.startsWith('act-')) return 'activities';
  if (id === 'sec3-subB' || id.startsWith('doc-')) return 'admin_docs';
  if (id === 'hist-tbl-intro' || id.startsWith('comb-hist-tbl-')) return 'history_table';
  if (id === 'sec3-subCD' || id.startsWith('appx-')) return 'appendix';
  if (id === 'sec4-head' || id.startsWith('chal-')) return 'challenges';
  if (id === 'sec4-sol-head' || id.startsWith('sol-')) return 'solutions';
  if (id === 'sec4-req-head' || id.startsWith('req-')) return 'requests';
  if (id === 'sec5-head' || id.startsWith('dir-')) return 'directions';
  if (id === 'sec6-conclusion') return 'conclusion';
  if (id === 'sec6-closing-signature') return 'signature';
  return null;
}

const SIEMREAP_FONT = "'Khmer OS Siemreap', 'Siemreap', 'Battambang', sans-serif";
const MOUL_FONT = "'Khmer OS Muol Light', 'Khmer OS Moul Light', 'Khmer OS Muol', 'Moul', serif";
const ROMAN_FONT = "'Times New Roman', 'Liberation Serif', 'Noto Serif', Georgia, serif";
const NAVY_HEADER_COLOR = '#002060';

function normalizeSingleSpaces(str = '') {
  return String(str || '')
    .replace(/\u200B/g, '')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

// Content box height inside 1123px A4 sheet (1123 - 36px top padding - 48px bottom footer area = 1039px)
const MAX_PAGE_CONTENT_PX = 1035;

/**
 * Splits a monk's full title+name into (titlePrefix in Siemreap) + (personalName in Muol Light)
 * matching the official Word/PDF formatting:
 * - ព្រះបុណ្ណមេធា [វ៉ាន់ សុក]
 * - ភិក្ខុ [អ៊ាន់ ឃ្លី]
 * - ព្រះគ្រូរាជសីហោ [ម៉េង ហ៊ល]
 * - ភិក្ខុ [អ៊ីន សុខណូវ]
 */
function renderMonkTitleAndName(fullName = '') {
  const clean = String(fullName || '').trim();
  const prefixes = ['ព្រះបុណ្ណមេធា ', 'ព្រះគ្រូរាជសីហោ ', 'ភិក្ខុ '];
  for (const prefix of prefixes) {
    if (clean.startsWith(prefix)) {
      const personal = clean.slice(prefix.length).trim();
      return (
        <>
          <span style={{ fontFamily: SIEMREAP_FONT }}>{prefix}</span>
          <span style={{ fontFamily: MOUL_FONT, fontWeight: 400 }}>{personal}</span>
        </>
      );
    }
  }
  return <span style={{ fontFamily: MOUL_FONT, fontWeight: 400 }}>{clean}</span>;
}

/**
 * Estimate visual pixel height of a Khmer paragraph by stripping zero-width subscripts/diacritics first
 * (Used only as initial fallback before real DOM offsetHeight measurement completes)
 */
function countEstimatedVisualLines(text = '', visualCharsPerLine = 64) {
  const rawLines = String(text || '').split(/\r?\n/);
  let total = 0;
  for (const ln of rawLines) {
    const visualStr = ln
      .replace(/\u17D2[\u1780-\u17A2]/g, '') // Subscript consonants sit underneath and take ~0 width
      .replace(/[\u17B7-\u17BD\u17C6\u17C9-\u17D3\u17DD\u200B]/g, '') // Top/bottom vowels & signs take ~0 width
      .trim();
    total += visualStr ? Math.max(1, Math.ceil(visualStr.length / visualCharsPerLine)) : 1;
  }
  return Math.max(1, total);
}

function estimateVisualHeightPx(text = '', visualCharsPerLine = 64, extraPx = 4) {
  return countEstimatedVisualLines(text, visualCharsPerLine) * 27.5 + extraPx;
}

/**
 * OfficialAdminReportDocument: Multi-Page Authentic A4 Replica
 * Matches `របាយការណ៍_ប្រចាំខែកក្កដា_ឆ្នាំ២០២៦.pdf` & `.docx`:
 * - Authentic Background Watermark (`/report-bg-pattern.jpg`) on every A4 sheet
 * - Authentic Navy Blue (`#002060`) Kingdom & Monastic Header
 * - Authentic Fonts (`Khmer OS Siemreap` & `Khmer OS Muol Light`)
 * - Real DOM pixel height pagination so every A4 page fills naturally (no large empty gaps and 0% cut-off text)
 */
export default function OfficialAdminReportDocument({
  id = 'printable-admin-report-document',
  displayModel,
  useKhmerNumerals = true,
  editMode = false,
  activeEditSection = null,
  onSelectEditSection = null
}) {
  const fmtNum = (n) => (useKhmerNumerals !== false ? toKhmerDigits(n) : String(n));
  const secNumsForLabels = displayModel?.sectionNumbers || {
    management: 'I',
    stats: 'II',
    progress: 'III',
    challenges: 'IV',
    directions: 'V',
    conclusion: 'VI'
  };
  const adminSectionLabels = useMemo(
    () => ({
      header: 'លេខលិខិត & អ្នកទទួល',
      subject_intro: 'កម្មវត្ថុ & សេចក្ដីផ្ដើម',
      history_bg: 'I. សាវតារ',
      management: `${secNumsForLabels.management}. តួនាទី និងភារកិច្ច`,
      stats: `${secNumsForLabels.stats}. ស្ថិតិ គណៈគ្រប់គ្រង គ្រូ និងសមណសិស្ស`,
      activities: `${secNumsForLabels.progress}. ក. សកម្មភាពការងារ`,
      admin_docs: `${secNumsForLabels.progress}. ខ. ការងារគ្រប់គ្រង លិខិតរដ្ឋបាល`,
      history_table: 'គ. & តារាង ១៦ ឆ្នាំ',
      appendix: 'ឧបសម្ព័ន្ធ (ចំណាយ)',
      challenges: `${secNumsForLabels.challenges}. ១-បញ្ហាប្រឈម`,
      solutions: `${secNumsForLabels.challenges}. ២-ដំណោះស្រាយ`,
      requests: `${secNumsForLabels.challenges}. ៣-សំណូមពរ`,
      directions: `${secNumsForLabels.directions}. ទិសដៅបន្ត`,
      conclusion: `${secNumsForLabels.conclusion}. សន្និដ្ឋាន`,
      signature: 'កាលបរិច្ឆេទ & ហត្ថលេខា'
    }),
    [
      secNumsForLabels.management,
      secNumsForLabels.stats,
      secNumsForLabels.progress,
      secNumsForLabels.challenges,
      secNumsForLabels.directions,
      secNumsForLabels.conclusion
    ]
  );
  const measureContainerRef = useRef(null);
  const measureHeaderRef = useRef(null);
  const measureHistTableRef = useRef(null);
  const [measuredHeights, setMeasuredHeights] = useState(null);
  const [measuredHeaderHeight, setMeasuredHeaderHeight] = useState(440);
  const [measuredHistTable, setMeasuredHistTable] = useState(null);
  const [fontVersion, setFontVersion] = useState(() => getKhmerFontVersion());

  useEffect(() => subscribeKhmerFontReady(setFontVersion), []);

  // Build Page 1 Node + Flow Blocks for Page 2..N (or continuous flow from Page 1 when includeHistory is true)
  const { page1Node, flowBlocks, isHistoryCombined } = useMemo(() => {
    if (!displayModel) return { page1Node: null, flowBlocks: [], isHistoryCombined: false };

    const includeHist = Boolean(displayModel.includeHistory && displayModel.schoolHistory);
    const secNums = displayModel.sectionNumbers || {
      background: null,
      management: 'I',
      stats: 'II',
      progress: 'III',
      challenges: 'IV',
      directions: 'V',
      conclusion: 'VI'
    };

    const studentLines = (displayModel.studentStatLines || []).map(normalizeSingleSpaces);
    const extraSubjLines = Math.max(0, countEstimatedVisualLines(displayModel.subjectText, 48) - 2);
    const extraIntroLines = Math.max(0, countEstimatedVisualLines(displayModel.introParagraph, 48) - 3);
    const extraSec1Lines = Math.max(0, countEstimatedVisualLines(displayModel.section1Intro, 52) - 4);
    const roleVisualLines = (displayModel.managementRoles || []).reduce(
      (sum, m) => sum + Math.max(1, countEstimatedVisualLines(m?.role || '', 34)),
      0
    );
    const extraRoleLines = Math.max(0, roleVisualLines - 4);
    const staffVisualLines = (displayModel.staffStats || []).reduce(
      (sum, s) => sum + Math.max(1, countEstimatedVisualLines(s, 52)),
      0
    );
    const extraStaffLines = Math.max(0, staffVisualLines - 4);
    const totalP1ExtraLines =
      extraSubjLines + extraIntroLines + extraSec1Lines + extraRoleLines + extraStaffLines;

    const baseP1Slice = displayModel.periodType && displayModel.periodType !== 'month' ? 2 : 3;
    const p1SliceCount = Math.max(0, baseP1Slice - totalP1ExtraLines);
    const page1StudentLines = studentLines.slice(0, p1SliceCount);
    const page2CarryStudentLines = studentLines.slice(p1SliceCount);

    // Top Official Header + Salutation + Subject + Intro (Shared by standard & combined)
    const p1TopHeader = (
      <>
        {/* 1. Top Centered Kingdom & Motto (Navy Blue #002060) */}
        <div
          style={{
            textAlign: 'center',
            color: NAVY_HEADER_COLOR,
            lineHeight: 1.55,
            marginBottom: 4
          }}
        >
          <div style={{ fontFamily: MOUL_FONT, fontSize: 17.5 }}>
            ព្រះរាជាណាចក្រកម្ពុជា
          </div>
          <div style={{ fontFamily: MOUL_FONT, fontSize: 15.2 }}>
            ជាតិ{'\u00A0\u00A0'}សាសនា{'\u00A0\u00A0'}ព្រះមហាក្សត្រ
          </div>
          <KhmerRoyalDivider width={120} height={8} color={NAVY_HEADER_COLOR} />
        </div>

        {/* 2. Left Monastic School Header with Official Logo on top (Navy Blue #002060) */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-start',
            marginTop: 2,
            marginBottom: 8
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              color: NAVY_HEADER_COLOR,
              lineHeight: 1.56,
              minWidth: 265
            }}
          >
            <img
              src="/logo.png?v=nobg1"
              alt="Logo"
              style={{
                width: 50,
                height: 50,
                objectFit: 'contain',
                marginBottom: 3
              }}
            />
            <div style={{ fontFamily: MOUL_FONT, fontSize: 15 }}>
              សាលាអនុគណក្រុងកំពង់ចាម
            </div>
            <div style={{ fontFamily: MOUL_FONT, fontSize: 14.5, whiteSpace: 'nowrap' }}>
              ពុទ្ធិកបឋមសិក្សាកម្រង ហ៊ុន ណេង ក្រុងកំពង់ចាម
            </div>
            <ReportEditableZone
              editMode={editMode}
              sectionId="header"
              label={adminSectionLabels.header}
              activeSectionId={activeEditSection}
              onSelectSection={onSelectEditSection}
            >
              <div style={{ fontFamily: SIEMREAP_FONT, fontSize: 15 }}>
                លេខ {displayModel.docNumber || '......................'}ព.ប.ហ.ណ
              </div>
            </ReportEditableZone>
          </div>
        </div>

        {/* 3. Salutation & Recipient Block */}
        <ReportEditableZone
          editMode={editMode}
          sectionId="header"
          label={adminSectionLabels.header}
          activeSectionId={activeEditSection}
          onSelectSection={onSelectEditSection}
        >
          <div style={{ textAlign: 'center', marginBottom: 8, lineHeight: 1.62 }}>
            <div
              style={{
                fontFamily: MOUL_FONT,
                fontSize: 17.5,
                color: NAVY_HEADER_COLOR,
                marginBottom: 2
              }}
            >
              សូមក្រាបថ្វាយបង្គំ
            </div>
            <div
              style={{
                fontFamily: MOUL_FONT,
                fontSize: 15.8,
                color: NAVY_HEADER_COLOR,
                marginBottom: 3
              }}
            >
              {normalizeSingleSpaces(displayModel.recipientTitle)}
            </div>
            <div
              style={{
                fontFamily: SIEMREAP_FONT,
                fontSize: 15.2,
                fontWeight: 700,
                fontStyle: 'italic',
                color: '#000000',
                textAlign: 'right',
                paddingRight: 0
              }}
            >
              ជាទីគោរពសក្ការៈដ៏ខ្ពង់ខ្ពស់!
            </div>
          </div>
        </ReportEditableZone>

        {/* 4 & 5. Subject & Intro Paragraph */}
        <ReportEditableZone
          editMode={editMode}
          sectionId="subject_intro"
          label={adminSectionLabels.subject_intro}
          activeSectionId={activeEditSection}
          onSelectSection={onSelectEditSection}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              marginBottom: 8,
              lineHeight: 1.75
            }}
          >
            <div
              style={{
                fontFamily: MOUL_FONT,
                fontSize: 15.2,
                width: 76,
                minWidth: 76,
                flexShrink: 0
              }}
            >
              កម្មវត្ថុ៖
            </div>
            <KhmerJustifiedText
              text={displayModel.subjectText}
              boldPhrases={[displayModel.periodTitlePhrase]}
              highlightMonasticTitles
              maxWidthPx={618}
              fontFamily={SIEMREAP_FONT}
              moulFontFamily={MOUL_FONT}
              fontSize={15.2}
              lineHeight={1.75}
              style={{ flex: 1, minWidth: 0 }}
            />
          </div>

          <div
            style={{
              paddingLeft: 76,
              marginBottom: 8,
              boxSizing: 'border-box'
            }}
          >
            <KhmerJustifiedText
              text={displayModel.introParagraph}
              boldPhrases={[displayModel.inPeriodPhrase]}
              highlightMonasticTitles
              maxWidthPx={618}
              fontFamily={SIEMREAP_FONT}
              moulFontFamily={MOUL_FONT}
              fontSize={15.2}
              lineHeight={1.75}
            />
          </div>
        </ReportEditableZone>
      </>
    );

    // PAGE 1:
    // - Standard mode: Header + Section I + Section II (up to p1SliceCount) — untouched authentic layout
    // - Combined History mode: Header only, then I. សាវតារ, II..VII flow continuously starting right on Page 1
    const p1Node = (
      <div
        key="page-1-body"
        style={{
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {p1TopHeader}

        {!includeHist && (
          <>
            {/* 6. Section I: I.តួនាទី និងភារកិច្ចគណៈគ្រប់គ្រងសាលា */}
            <ReportEditableZone
              editMode={editMode}
              sectionId="management"
              label={adminSectionLabels.management}
              activeSectionId={activeEditSection}
              onSelectSection={onSelectEditSection}
            >
              <div style={{ marginBottom: 8 }}>
              <div style={{ paddingLeft: 28, marginBottom: 4 }}>
                <span style={{ fontFamily: ROMAN_FONT, fontWeight: 700, fontSize: 15.5 }}>I.</span>
                <span style={{ fontFamily: MOUL_FONT, fontSize: 15.2 }}>
                  តួនាទី និងភារកិច្ចគណៈគ្រប់គ្រងសាលា
                </span>
              </div>
              <div style={{ paddingLeft: 56, marginBottom: 6, boxSizing: 'border-box' }}>
                <KhmerJustifiedText
                  text={displayModel.section1Intro}
                  maxWidthPx={638}
                  firstLineIndent={46}
                  fontFamily={SIEMREAP_FONT}
                  moulFontFamily={MOUL_FONT}
                  fontSize={15.2}
                  lineHeight={1.8}
                />
              </div>
              <div style={{ paddingLeft: 56 }}>
                {(displayModel.managementRoles || []).map((m, idx) => (
                  <div
                    key={`role-${idx}`}
                    style={{
                      display: 'flex',
                      alignItems: 'baseline',
                      marginBottom: 3,
                      lineHeight: 1.78
                    }}
                  >
                    <span style={{ width: 18, flexShrink: 0 }}>-</span>
                    <span style={{ minWidth: 192, flexShrink: 0 }}>
                      {renderMonkTitleAndName(m.name)}
                    </span>
                    <span>{normalizeSingleSpaces(m.role)}</span>
                  </div>
                ))}
              </div>
            </div>
            </ReportEditableZone>

            {/* 7. Section II: II.ស្ថិតិ គណៈគ្រប់គ្រង គ្រូ និងសមណសិស្ស */}
            <ReportEditableZone
              editMode={editMode}
              sectionId="stats"
              label={adminSectionLabels.stats}
              activeSectionId={activeEditSection}
              onSelectSection={onSelectEditSection}
            >
            <div>
              <div style={{ paddingLeft: 28, marginBottom: 4 }}>
                <span style={{ fontFamily: ROMAN_FONT, fontWeight: 700, fontSize: 15.5 }}>II.</span>
                <span style={{ fontFamily: MOUL_FONT, fontSize: 15.2 }}>
                  ស្ថិតិ គណៈគ្រប់គ្រង គ្រូ និងសមណសិស្ស
                </span>
              </div>

              <div
                style={{
                  paddingLeft: 68,
                  fontWeight: 700,
                  marginBottom: 3
                }}
              >
                ក-គណៈគ្រប់គ្រង មន្ត្រី គ្រូ
              </div>
              <div style={{ paddingLeft: 68, marginBottom: 6 }}>
                {(displayModel.staffStats || []).map((line, idx) => (
                  <div
                    key={`staff-${idx}`}
                    style={{
                      display: 'flex',
                      alignItems: 'baseline',
                      marginBottom: 2,
                      lineHeight: 1.78
                    }}
                  >
                    <span style={{ width: 18, flexShrink: 0 }}>-</span>
                    <KhmerJustifiedText
                      text={line}
                      maxWidthPx={608}
                      fontFamily={SIEMREAP_FONT}
                      moulFontFamily={MOUL_FONT}
                      fontSize={15.2}
                      lineHeight={1.78}
                      style={{ flex: 1, minWidth: 0 }}
                    />
                  </div>
                ))}
              </div>

              {page1StudentLines.length > 0 && (
                <>
                  <div
                    style={{
                      paddingLeft: 68,
                      fontWeight: 700,
                      marginBottom: 3
                    }}
                  >
                    ខ-ចំនួនថ្នាក់ សមណសិស្ស
                  </div>
                  <div style={{ paddingLeft: 68 }}>
                    {page1StudentLines.map((line, idx) => (
                      <div
                        key={`st-p1-${idx}`}
                        style={{
                          display: 'flex',
                          alignItems: 'baseline',
                          marginBottom: 2,
                          lineHeight: 1.78
                        }}
                      >
                        <span style={{ width: 18, flexShrink: 0 }}>-</span>
                        <KhmerJustifiedText
                          text={line}
                          maxWidthPx={608}
                          fontFamily={SIEMREAP_FONT}
                          moulFontFamily={MOUL_FONT}
                          fontSize={15.2}
                          lineHeight={1.78}
                          style={{ flex: 1, minWidth: 0 }}
                        />
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
            </ReportEditableZone>
          </>
        )}
      </div>
    );

    const blocks = [];

    if (includeHist) {
      // Combined Mode Flow Block Group A: I. សាវតារ
      blocks.push({
        id: 'sec-hist-head',
        isHeading: true,
        estPx: 34,
        node: (
          <div key="sec-hist-head" style={{ paddingLeft: 28, paddingTop: 2, marginBottom: 4 }}>
            <span style={{ fontFamily: ROMAN_FONT, fontWeight: 700, fontSize: 15.5 }}>I. </span>
            <span style={{ fontFamily: MOUL_FONT, fontSize: 15.2 }}>សាវតារ</span>
          </div>
        )
      });

      (displayModel.schoolHistory.backgroundParagraphs || []).forEach((para, idx) => {
        const cleanPara = normalizeSingleSpaces(para);
        if (!cleanPara) {
          blocks.push({
            id: `hist-bg-para-${idx}`,
            estPx: 22,
            node: <div key={`hist-bg-para-${idx}`} aria-hidden="true" style={{ height: 22 }} />
          });
          return;
        }
        blocks.push({
          id: `hist-bg-para-${idx}`,
          estPx: estimateVisualHeightPx(cleanPara, 62, 8),
          node: (
            <KhmerJustifiedText
              key={`hist-bg-para-${idx}`}
              text={cleanPara}
              maxWidthPx={694}
              firstLineIndent={56}
              fontFamily={SIEMREAP_FONT}
              moulFontFamily={MOUL_FONT}
              fontSize={15.2}
              lineHeight={1.8}
              style={{ marginBottom: 6 }}
            />
          )
        });
      });

      // Combined Mode Flow Block Group B: II. តួនាទី និងភារកិច្ចគណៈគ្រប់គ្រងសាលា
      blocks.push({
        id: 'sec-mgmt-head',
        isHeading: true,
        estPx: 36,
        node: (
          <div key="sec-mgmt-head" style={{ paddingLeft: 28, paddingTop: 6, marginBottom: 4 }}>
            <span style={{ fontFamily: ROMAN_FONT, fontWeight: 700, fontSize: 15.5 }}>{secNums.management}. </span>
            <span style={{ fontFamily: MOUL_FONT, fontSize: 15.2 }}>
              តួនាទី និងភារកិច្ចគណៈគ្រប់គ្រងសាលា
            </span>
          </div>
        )
      });

      blocks.push({
        id: 'sec-mgmt-intro',
        estPx: estimateVisualHeightPx(displayModel.section1Intro, 58, 6),
        node: (
          <div key="sec-mgmt-intro" style={{ paddingLeft: 56, marginBottom: 6, boxSizing: 'border-box' }}>
            <KhmerJustifiedText
              text={displayModel.section1Intro}
              maxWidthPx={638}
              firstLineIndent={46}
              fontFamily={SIEMREAP_FONT}
              moulFontFamily={MOUL_FONT}
              fontSize={15.2}
              lineHeight={1.8}
            />
          </div>
        )
      });

      (displayModel.managementRoles || []).forEach((m, idx) => {
        blocks.push({
          id: `comb-role-${idx}`,
          estPx: 30,
          node: (
            <div
              key={`comb-role-${idx}`}
              style={{
                paddingLeft: 56,
                display: 'flex',
                alignItems: 'baseline',
                marginBottom: 3,
                lineHeight: 1.78
              }}
            >
              <span style={{ width: 18, flexShrink: 0 }}>-</span>
              <span style={{ minWidth: 192, flexShrink: 0 }}>
                {renderMonkTitleAndName(m.name)}
              </span>
              <span>{normalizeSingleSpaces(m.role)}</span>
            </div>
          )
        });
      });

      // Combined Mode Flow Block Group C: III. ស្ថិតិ គណៈគ្រប់គ្រង គ្រូ និងសមណសិស្ស
      blocks.push({
        id: 'sec-stats-head',
        isHeading: true,
        estPx: 62,
        node: (
          <div key="sec-stats-head" style={{ paddingTop: 6, marginBottom: 3 }}>
            <div style={{ paddingLeft: 28, marginBottom: 4 }}>
              <span style={{ fontFamily: ROMAN_FONT, fontWeight: 700, fontSize: 15.5 }}>{secNums.stats}. </span>
              <span style={{ fontFamily: MOUL_FONT, fontSize: 15.2 }}>
                ស្ថិតិ គណៈគ្រប់គ្រង គ្រូ និងសមណសិស្ស
              </span>
            </div>
            <div style={{ paddingLeft: 68, fontWeight: 700 }}>
              ក-គណៈគ្រប់គ្រង មន្ត្រី គ្រូ
            </div>
          </div>
        )
      });

      (displayModel.staffStats || []).forEach((line, idx) => {
        blocks.push({
          id: `comb-staff-${idx}`,
          estPx: estimateVisualHeightPx(line, 62, 3),
          node: (
            <div
              key={`comb-staff-${idx}`}
              style={{
                paddingLeft: 68,
                display: 'flex',
                alignItems: 'baseline',
                marginBottom: 2,
                lineHeight: 1.78
              }}
            >
              <span style={{ width: 18, flexShrink: 0 }}>-</span>
              <KhmerJustifiedText
                text={line}
                maxWidthPx={608}
                fontFamily={SIEMREAP_FONT}
                moulFontFamily={MOUL_FONT}
                fontSize={15.2}
                lineHeight={1.78}
                style={{ flex: 1, minWidth: 0 }}
              />
            </div>
          )
        });
      });

      blocks.push({
        id: 'sec-stats-subB',
        isHeading: true,
        estPx: 32,
        node: (
          <div
            key="sec-stats-subB"
            style={{
              paddingLeft: 68,
              fontWeight: 700,
              paddingTop: 4,
              marginBottom: 3
            }}
          >
            ខ-ចំនួនថ្នាក់ សមណសិស្ស
          </div>
        )
      });

      studentLines.forEach((line, idx) => {
        blocks.push({
          id: `comb-st-${idx}`,
          estPx: estimateVisualHeightPx(line, 62, 3),
          node: (
            <div
              key={`comb-st-${idx}`}
              style={{
                paddingLeft: 68,
                display: 'flex',
                alignItems: 'baseline',
                marginBottom: 3,
                lineHeight: 1.78
              }}
            >
              <span style={{ width: 18, flexShrink: 0 }}>-</span>
              <KhmerJustifiedText
                text={line}
                maxWidthPx={608}
                fontFamily={SIEMREAP_FONT}
                moulFontFamily={MOUL_FONT}
                fontSize={15.2}
                lineHeight={1.78}
                style={{ flex: 1, minWidth: 0 }}
              />
            </div>
          )
        });
      });
    } else {
      // Standard Mode: If Page 1 filled before ខ-, carry the subheading cleanly onto Page 2!
      if (page1StudentLines.length === 0 && page2CarryStudentLines.length > 0) {
        blocks.push({
          id: 'sec-stats-subB',
          isHeading: true,
          estPx: 32,
          node: (
            <div
              key="sec-stats-subB-p2"
              style={{
                paddingLeft: 68,
                fontWeight: 700,
                marginBottom: 3
              }}
            >
              ខ-ចំនួនថ្នាក់ សមណសិស្ស
            </div>
          )
        });
      }
      // Remaining student stat lines from Section II (ខ)
      page2CarryStudentLines.forEach((line, idx) => {
        blocks.push({
          id: `st-p2-${idx}`,
          estPx: estimateVisualHeightPx(line, 66, 3),
          node: (
            <div
              key={`st-p2-${idx}`}
              style={{
                paddingLeft: 68,
                display: 'flex',
                alignItems: 'baseline',
                marginBottom: 3,
                lineHeight: 1.78
              }}
            >
              <span style={{ width: 18, flexShrink: 0 }}>-</span>
              <KhmerJustifiedText
                text={line}
                maxWidthPx={608}
                fontFamily={SIEMREAP_FONT}
                moulFontFamily={MOUL_FONT}
                fontSize={15.2}
                lineHeight={1.78}
                style={{ flex: 1, minWidth: 0 }}
              />
            </div>
          )
        });
      });
    }

    // Section III (or IV in Combined mode) Heading + Subheading ក
    blocks.push({
      id: 'sec3-head',
      isHeading: true,
      estPx: 62,
      node: (
        <div key="sec3-head" style={{ paddingTop: 6, marginBottom: 4 }}>
          <div style={{ paddingLeft: 28, marginBottom: 3 }}>
            <span style={{ fontFamily: ROMAN_FONT, fontWeight: 700, fontSize: 15.5 }}>
              {secNums.progress}.{' '}
            </span>
            <span style={{ fontFamily: MOUL_FONT, fontSize: 15.2 }}>
              {String(displayModel.section3Heading || '').replace(/^[IVX]+\.+\s*/, '')}
            </span>
          </div>
          <div style={{ paddingLeft: 68, fontWeight: 700 }}>
            {displayModel.section3SubAHeading}
          </div>
        </div>
      )
    });

    // Section III/IV (ក) Activities with ❖ bullet
    (displayModel.activities || []).forEach((rawLine, idx) => {
      const line = normalizeSingleSpaces(rawLine);
      blocks.push({
        id: `act-${idx}`,
        estPx: estimateVisualHeightPx(line, 58, 3),
        node: (
          <div
            key={`act-${idx}`}
            style={{
              paddingLeft: 86,
              display: 'flex',
              alignItems: 'baseline',
              marginBottom: 3,
              lineHeight: 1.78
            }}
          >
            <span style={{ width: 22, flexShrink: 0, fontSize: 13 }}>❖</span>
            <KhmerJustifiedText
              text={line}
              maxWidthPx={586}
              fontFamily={SIEMREAP_FONT}
              moulFontFamily={MOUL_FONT}
              fontSize={15.2}
              lineHeight={1.78}
              style={{ flex: 1, minWidth: 0 }}
            />
          </div>
        )
      });
    });

    // Section III/IV (ខ) Admin Docs (placed directly after ក, before 16-year history table)
    blocks.push({
      id: 'sec3-subB',
      isHeading: true,
      estPx: 34,
      node: (
        <div
          key="sec3-subB"
          style={{
            paddingLeft: 68,
            fontWeight: 700,
            paddingTop: 4,
            marginBottom: 3
          }}
        >
          ខ. ការងារគ្រប់គ្រង តាក់តែងលិខិតរដ្ឋបាល កំណត់ហេតុ និងរបាយការណ៍
        </div>
      )
    });

    (displayModel.adminDocLines || []).forEach((rawLine, idx) => {
      const line = normalizeSingleSpaces(rawLine);
      blocks.push({
        id: `doc-${idx}`,
        estPx: estimateVisualHeightPx(line, 58, 3),
        node: (
          <div
            key={`doc-${idx}`}
            style={{
              paddingLeft: 86,
              display: 'flex',
              alignItems: 'baseline',
              marginBottom: 2,
              lineHeight: 1.76
            }}
          >
            <span style={{ width: 18, flexShrink: 0 }}>-</span>
            <KhmerJustifiedText
              text={line}
              maxWidthPx={590}
              fontFamily={SIEMREAP_FONT}
              moulFontFamily={MOUL_FONT}
              fontSize={15.2}
              lineHeight={1.76}
              style={{ flex: 1, minWidth: 0 }}
            />
          </div>
        )
      });
    });

    // Combined Mode ONLY: ចំណុច គ. (Line 1 starts with គ. aligned straight under ខ. at 69.5px with locked space;
    // Line 2+ & Enter lines align flush at 0px with table ល.រ left border)
    if (includeHist) {
      const introStr = normalizeSingleSpaces(displayModel.schoolHistory.tableIntro || '');
      if (introStr) {
        blocks.push({
          id: 'hist-tbl-intro',
          isHeading: true,
          estPx: estimateVisualHeightPx(introStr, 60, 14),
          node: (
            <KhmerJustifiedText
              key="hist-tbl-intro"
              text={introStr}
              firstParagraphPrefixBold="គ."
              maxWidthPx={694}
              firstLineIndent={69.5}
              indentFirstParagraphOnly
              fontFamily={SIEMREAP_FONT}
              moulFontFamily={MOUL_FONT}
              fontSize={15.2}
              lineHeight={1.78}
              style={{ paddingTop: 6, marginBottom: 6 }}
            />
          )
        });
      }

      blocks.push({
        id: 'hist-16yr-table',
        isSplittableHistoryTable: true,
        rows: displayModel.schoolHistory.rows || [],
        totals: displayModel.schoolHistory.totals || null,
        estPx: 600,
        node: null
      });
    }

    // Section III (គ & ឃ, or ឃ & ង in Combined mode) Appendix — right-align prefix box so `.` and text align 100%
    const renderAlignedLetterSubHeading = (headingText, marginBottom = 0) => {
      const m = String(headingText || '').match(/^([ក-អ]\.)\s*(.*)$/);
      if (!m) {
        return (
          <div style={{ paddingLeft: 68, fontWeight: 700, marginBottom }}>
            {headingText}
          </div>
        );
      }
      return (
        <div
          style={{
            paddingLeft: 68,
            fontWeight: 700,
            marginBottom,
            display: 'flex',
            alignItems: 'baseline'
          }}
        >
          <span
            style={{
              display: 'inline-block',
              width: 15.5,
              textAlign: 'right',
              marginRight: 4.5,
              flexShrink: 0
            }}
          >
            {m[1]}
          </span>
          <span>{m[2]}</span>
        </div>
      );
    };

    blocks.push({
      id: 'sec3-subCD',
      isHeading: true,
      estPx: 60,
      node: (
        <div key="sec3-subCD" style={{ paddingTop: 4, marginBottom: 2 }}>
          {renderAlignedLetterSubHeading(displayModel.section3SubCHeading, 3)}
          {renderAlignedLetterSubHeading(displayModel.section3SubDHeading, 0)}
        </div>
      )
    });

    (displayModel.appendixItems || []).forEach((rawLine, idx) => {
      const line = normalizeSingleSpaces(rawLine);
      blocks.push({
        id: `appx-${idx}`,
        estPx: 29,
        node: (
          <div
            key={`appx-${idx}`}
            style={{
              paddingLeft: 86,
              display: 'flex',
              alignItems: 'baseline',
              marginBottom: 2,
              lineHeight: 1.76
            }}
          >
            <span style={{ width: 18, flexShrink: 0 }}>-</span>
            <KhmerJustifiedText
              text={line}
              maxWidthPx={590}
              fontFamily={SIEMREAP_FONT}
              moulFontFamily={MOUL_FONT}
              fontSize={15.2}
              lineHeight={1.76}
              style={{ flex: 1, minWidth: 0 }}
            />
          </div>
        )
      });
    });

    // Section IV (or V in Combined mode) Heading + ១-បញ្ហាប្រឈម
    blocks.push({
      id: 'sec4-head',
      isHeading: true,
      estPx: 62,
      node: (
        <div key="sec4-head" style={{ paddingTop: 6, marginBottom: 3 }}>
          <div style={{ paddingLeft: 28, marginBottom: 3 }}>
            <span style={{ fontFamily: ROMAN_FONT, fontWeight: 700, fontSize: 15.5 }}>
              {secNums.challenges}.
            </span>
            <span style={{ fontFamily: MOUL_FONT, fontSize: 15.2 }}>
              បញ្ហាប្រឈម ដំណោះស្រាយ និងសំណូមពរ
            </span>
          </div>
          <div style={{ paddingLeft: 56, fontWeight: 700 }}>
            ១-បញ្ហាប្រឈម
          </div>
        </div>
      )
    });

    (displayModel.challenges || []).forEach((rawLine, idx) => {
      const line = normalizeSingleSpaces(rawLine);
      blocks.push({
        id: `chal-${idx}`,
        estPx: estimateVisualHeightPx(line, 60, 3),
        node: (
          <div
            key={`chal-${idx}`}
            style={{
              paddingLeft: 76,
              display: 'flex',
              alignItems: 'baseline',
              marginBottom: 3,
              lineHeight: 1.78
            }}
          >
            <span style={{ width: 16, flexShrink: 0 }}>-</span>
            <KhmerJustifiedText
              text={line}
              maxWidthPx={602}
              fontFamily={SIEMREAP_FONT}
              moulFontFamily={MOUL_FONT}
              fontSize={15.2}
              lineHeight={1.78}
              style={{ flex: 1, minWidth: 0 }}
            />
          </div>
        )
      });
    });

    // Section IV: ២-ដំណោះស្រាយ
    blocks.push({
      id: 'sec4-sol-head',
      isHeading: true,
      estPx: 34,
      node: (
        <div
          key="sec4-sol-head"
          style={{
            paddingLeft: 56,
            fontWeight: 700,
            paddingTop: 4,
            marginBottom: 3
          }}
        >
          ២-ដំណោះស្រាយ
        </div>
      )
    });

    (displayModel.solutions || []).forEach((rawLine, idx) => {
      const line = normalizeSingleSpaces(rawLine);
      blocks.push({
        id: `sol-${idx}`,
        estPx: estimateVisualHeightPx(line, 60, 3),
        node: (
          <div
            key={`sol-${idx}`}
            style={{
              paddingLeft: 76,
              display: 'flex',
              alignItems: 'baseline',
              marginBottom: 3,
              lineHeight: 1.78
            }}
          >
            <span style={{ width: 16, flexShrink: 0 }}>-</span>
            <KhmerJustifiedText
              text={line}
              maxWidthPx={602}
              fontFamily={SIEMREAP_FONT}
              moulFontFamily={MOUL_FONT}
              fontSize={15.2}
              lineHeight={1.78}
              style={{ flex: 1, minWidth: 0 }}
            />
          </div>
        )
      });
    });

    // Section IV: ៣-សំណូមពរ
    blocks.push({
      id: 'sec4-req-head',
      isHeading: true,
      estPx: 34,
      node: (
        <div
          key="sec4-req-head"
          style={{
            paddingLeft: 56,
            fontWeight: 700,
            paddingTop: 4,
            marginBottom: 3
          }}
        >
          ៣-សំណូមពរ
        </div>
      )
    });

    (displayModel.requests || []).forEach((rawLine, idx) => {
      const line = normalizeSingleSpaces(rawLine);
      blocks.push({
        id: `req-${idx}`,
        estPx: estimateVisualHeightPx(line, 60, 3),
        node: (
          <div
            key={`req-${idx}`}
            style={{
              paddingLeft: 76,
              display: 'flex',
              alignItems: 'baseline',
              marginBottom: 3,
              lineHeight: 1.78
            }}
          >
            <span style={{ width: 16, flexShrink: 0 }}>-</span>
            <KhmerJustifiedText
              text={line}
              maxWidthPx={602}
              fontFamily={SIEMREAP_FONT}
              moulFontFamily={MOUL_FONT}
              fontSize={15.2}
              lineHeight={1.78}
              style={{ flex: 1, minWidth: 0 }}
            />
          </div>
        )
      });
    });

    // Section V (or VI in Combined mode): ទិសដៅបន្ត
    blocks.push({
      id: 'sec5-head',
      isHeading: true,
      estPx: 36,
      node: (
        <div key="sec5-head" style={{ paddingLeft: 28, paddingTop: 6, marginBottom: 3 }}>
          <span style={{ fontFamily: ROMAN_FONT, fontWeight: 700, fontSize: 15.5 }}>
            {secNums.directions}.
          </span>
          <span style={{ fontFamily: MOUL_FONT, fontSize: 15.2 }}>ទិសដៅបន្ត</span>
        </div>
      )
    });

    (displayModel.directions || []).forEach((rawLine, idx) => {
      const line = normalizeSingleSpaces(rawLine);
      blocks.push({
        id: `dir-${idx}`,
        estPx: estimateVisualHeightPx(line, 60, 3),
        node: (
          <div
            key={`dir-${idx}`}
            style={{
              paddingLeft: 76,
              display: 'flex',
              alignItems: 'baseline',
              marginBottom: 3,
              lineHeight: 1.78
            }}
          >
            <span style={{ width: 16, flexShrink: 0 }}>-</span>
            <KhmerJustifiedText
              text={line}
              maxWidthPx={602}
              fontFamily={SIEMREAP_FONT}
              moulFontFamily={MOUL_FONT}
              fontSize={15.2}
              lineHeight={1.78}
              style={{ flex: 1, minWidth: 0 }}
            />
          </div>
        )
      });
    });

    // Section VI (or VII in Combined mode): សន្និដ្ឋាន + Closing + Signature
    blocks.push({
      id: 'sec6-conclusion',
      estPx: estimateVisualHeightPx(displayModel.conclusionText, 62, 42),
      node: (
        <div key="sec6-conclusion" style={{ paddingTop: 6, marginBottom: 6 }}>
          <div style={{ paddingLeft: 28, marginBottom: 3 }}>
            <span style={{ fontFamily: ROMAN_FONT, fontWeight: 700, fontSize: 15.5 }}>
              {secNums.conclusion}.
            </span>
            <span style={{ fontFamily: MOUL_FONT, fontSize: 15.2 }}>សន្និដ្ឋាន</span>
          </div>
          <div style={{ paddingLeft: 28, boxSizing: 'border-box' }}>
            <KhmerJustifiedText
              text={displayModel.conclusionText}
              maxWidthPx={666}
              firstLineIndent={42}
              fontFamily={SIEMREAP_FONT}
              moulFontFamily={MOUL_FONT}
              fontSize={15.2}
              lineHeight={1.82}
            />
          </div>
        </div>
      )
    });

    blocks.push({
      id: 'sec6-closing-signature',
      estPx: 162,
      node: (
        <div key="sec6-closing-signature" className="signature-block">
          <div style={{ paddingLeft: 28, marginBottom: 4, boxSizing: 'border-box' }}>
            <KhmerJustifiedText
              text={displayModel.closingLine1}
              highlightMonasticTitles
              maxWidthPx={666}
              firstLineIndent={42}
              fontFamily={SIEMREAP_FONT}
              moulFontFamily={MOUL_FONT}
              fontSize={15.2}
              lineHeight={1.8}
            />
          </div>
          <div style={{ paddingLeft: 28, marginBottom: 8, boxSizing: 'border-box' }}>
            <KhmerJustifiedText
              text={displayModel.closingLine2}
              highlightMonasticTitles
              maxWidthPx={666}
              firstLineIndent={42}
              fontFamily={SIEMREAP_FONT}
              moulFontFamily={MOUL_FONT}
              fontSize={15.2}
              lineHeight={1.8}
            />
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              marginTop: 4
            }}
          >
            <div style={{ width: '64%', textAlign: 'right', lineHeight: 1.72 }}>
              <div style={{ fontSize: 15.2 }}>{displayModel.lunarDateLine}</div>
              <div style={{ fontSize: 15.2, marginBottom: 6 }}>{displayModel.solarDateLine}</div>
              <div
                style={{
                  fontFamily: MOUL_FONT,
                  fontSize: 15.2,
                  textAlign: 'center',
                  paddingLeft: '24%',
                  marginBottom: 4
                }}
              >
                {displayModel.signerTitle || 'ព្រះនាយក'}
              </div>
            </div>
          </div>
        </div>
      )
    });

    return { page1Node: p1Node, flowBlocks: blocks, isHistoryCombined: includeHist };
  }, [displayModel, editMode, activeEditSection, onSelectEditSection, adminSectionLabels]);

  // Measure actual rendered DOM pixel heights of every block inside the 694px content width
  useLayoutEffect(() => {
    const el = measureContainerRef.current;
    if (!el || !flowBlocks.length) return;

    const measureNow = () => {
      const children = Array.from(el.children);
      if (children.length !== flowBlocks.length) return;
      const elRect = el.getBoundingClientRect();
      const scaleFactor =
        el.offsetWidth > 0 && elRect.width > 0 ? elRect.width / el.offsetWidth : 1;
      const getH = (node) => {
        if (!node) return 0;
        const r = node.getBoundingClientRect();
        return scaleFactor > 0 ? r.height / scaleFactor : r.height;
      };

      const heights = children.map(getH);
      setMeasuredHeights(prev => {
        if (prev && prev.length === heights.length && prev.every((v, i) => Math.abs(v - heights[i]) <= 0.5)) {
          return prev;
        }
        return heights;
      });

      if (isHistoryCombined && measureHeaderRef.current) {
        const hdrH = Math.max(300, getH(measureHeaderRef.current));
        setMeasuredHeaderHeight(prev => (Math.abs(prev - hdrH) > 0.5 ? hdrH : prev));
      }

      if (isHistoryCombined && measureHistTableRef.current) {
        const tRoot = measureHistTableRef.current;
        const theadEl = tRoot.querySelector('thead');
        const trs = Array.from(tRoot.querySelectorAll('tbody tr'));
        const hasTotal = Boolean(displayModel?.schoolHistory?.totals);
        const dataTrs = hasTotal ? trs.slice(0, -1) : trs;
        const totalTr = hasTotal ? trs[trs.length - 1] : null;
        const nextHist = {
          theadH: Math.max(32, getH(theadEl)),
          rowHeights: dataTrs.map(tr => Math.max(28, getH(tr))),
          totalRowH: Math.max(32, getH(totalTr))
        };
        setMeasuredHistTable(prev => {
          if (
            prev &&
            prev.rowHeights.length === nextHist.rowHeights.length &&
            Math.abs(prev.theadH - nextHist.theadH) <= 0.8 &&
            Math.abs(prev.totalRowH - nextHist.totalRowH) <= 0.8 &&
            prev.rowHeights.every((v, i) => Math.abs(v - nextHist.rowHeights[i]) <= 0.8)
          ) {
            return prev;
          }
          return nextHist;
        });
      }
    };

    measureNow();
    if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) {
      document.fonts.ready.then(measureNow).catch(() => {});
    }
  }, [flowBlocks, isHistoryCombined, displayModel, fontVersion]);

  const pages = useMemo(() => {
    if (!page1Node) return [];

    const blockHeights = flowBlocks.map((blk, i) =>
      measuredHeights && measuredHeights[i] ? measuredHeights[i] : blk.estPx
    );

    if (!isHistoryCombined) {
      // Standard mode: preserve 100% original Page 1 + greedy Page 2..N pagination
      const pagedBuckets = [];
      let currentItems = [];
      let currentPx = 0;

      for (let i = 0; i < flowBlocks.length; i++) {
        const blk = flowBlocks[i];
        const blkPx = blockHeights[i];
        const nextBlk = flowBlocks[i + 1];
        const nextBlkPx = nextBlk ? blockHeights[i + 1] : 0;
        const neededPx = blk.isHeading && nextBlk ? blkPx + nextBlkPx : blkPx;

        if (currentItems.length > 0 && currentPx + neededPx > MAX_PAGE_CONTENT_PX) {
          pagedBuckets.push({ items: currentItems, heightPx: currentPx });
          currentItems = [blk];
          currentPx = blkPx;
        } else {
          currentItems.push(blk);
          currentPx += blkPx;
        }
      }
      if (currentItems.length > 0) {
        pagedBuckets.push({ items: currentItems, heightPx: currentPx });
      }

      return [
        page1Node,
        ...pagedBuckets.map((bucketObj, pIdx) => (
          <div
            key={`page-body-${pIdx + 2}`}
            style={{
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {renderBlocksWithEditZones(
              bucketObj.items.map(b => ({
                ...b,
                editSectionId: mapAdminBlockIdToSection(b.id)
              })),
              {
                editMode,
                activeSectionId: activeEditSection,
                onSelectSection: onSelectEditSection,
                sectionLabels: adminSectionLabels
              }
            )}
          </div>
        ))
      ];
    }

    // Combined Mode (Sem 1 + School History): continuous flow starting right below Page 1 Header +
    // Splittable 16-year table with repeating <thead> header across page breaks
    const pageNodesList = [];
    let currentItems = [{ id: 'page-1-header-wrap', editSectionId: null, node: page1Node }];
    let currentPx = measuredHeaderHeight || 440;

    const flushPage = () => {
      if (currentItems.length > 0) {
        pageNodesList.push(currentItems);
        currentItems = [];
        currentPx = 0;
      }
    };

    for (let i = 0; i < flowBlocks.length; i++) {
      const blk = flowBlocks[i];

      if (blk.isSplittableHistoryTable) {
        const allRows = blk.rows || [];
        const theadH = measuredHistTable?.theadH || 36;
        const rowHeights = allRows.map((_, ri) => measuredHistTable?.rowHeights?.[ri] || 32);
        const totalRowH = measuredHistTable?.totalRowH || 34;

        let cursor = 0;
        let chunkIdx = 0;
        while (cursor < allRows.length) {
          const minNeeded = theadH + (rowHeights[cursor] || 32) + 14;
          if (currentItems.length > 0 && currentPx + minNeeded > MAX_PAGE_CONTENT_PX) {
            flushPage();
          }

          const chunk = [];
          let usedH = theadH + 14;
          while (cursor < allRows.length) {
            const rh = rowHeights[cursor] || 32;
            const isLastRow = cursor === allRows.length - 1;
            const extraTotal = isLastRow ? totalRowH : 0;
            if (chunk.length > 0 && currentPx + usedH + rh + extraTotal > MAX_PAGE_CONTENT_PX) {
              break;
            }
            chunk.push(allRows[cursor]);
            usedH += rh;
            cursor += 1;
          }

          const reachedEnd = cursor >= allRows.length;
          if (reachedEnd) usedH += totalRowH;

          const chunkKey = `comb-hist-tbl-${chunkIdx}`;
          currentItems.push({
            id: chunkKey,
            editSectionId: 'history_table',
            node: renderSchoolHistoryTableChunk({
              rowsChunk: chunk,
              totals: blk.totals,
              includeTotalsRow: reachedEnd,
              keyPrefix: chunkKey,
              marginTop: chunkIdx === 0 ? 4 : 0,
              marginBottom: 8
            })
          });
          currentPx += usedH;
          chunkIdx += 1;

          if (!reachedEnd) {
            flushPage();
          }
        }
        continue;
      }

      const blkPx = blockHeights[i];
      const nextBlk = flowBlocks[i + 1];
      let nextNeededPx = 0;
      if (blk.isHeading && nextBlk) {
        if (nextBlk.isSplittableHistoryTable) {
          nextNeededPx = (measuredHistTable?.theadH || 36) + (measuredHistTable?.rowHeights?.[0] || 32) + 16;
        } else {
          nextNeededPx = blockHeights[i + 1] || 0;
        }
      }
      const neededPx = blkPx + nextNeededPx;

      if (currentItems.length > 0 && currentPx + neededPx > MAX_PAGE_CONTENT_PX) {
        flushPage();
      }
      currentItems.push({
        id: blk.id,
        editSectionId: mapAdminBlockIdToSection(blk.id),
        node: blk.node
      });
      currentPx += blkPx;
    }

    flushPage();

    return pageNodesList.map((items, pIdx) => (
      <div
        key={`comb-page-body-${pIdx + 1}`}
        style={{
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {renderBlocksWithEditZones(items, {
          editMode,
          activeSectionId: activeEditSection,
          onSelectSection: onSelectEditSection,
          sectionLabels: adminSectionLabels
        })}
      </div>
    ));
  }, [
    page1Node,
    flowBlocks,
    measuredHeights,
    isHistoryCombined,
    measuredHeaderHeight,
    measuredHistTable,
    editMode,
    activeEditSection,
    onSelectEditSection,
    adminSectionLabels
  ]);

  if (!displayModel) return null;

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
      {/* Hidden 694px measurement probe for exact DOM pixel height pagination */}
      <div
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
        {isHistoryCombined && (
          <div ref={measureHeaderRef} style={{ display: 'flow-root' }}>
            {page1Node}
          </div>
        )}
        <div ref={measureContainerRef}>
          {flowBlocks.map(b => (
            <div key={`measure-${b.id}`} style={{ display: 'flow-root' }}>
              {b.node}
            </div>
          ))}
        </div>
        {isHistoryCombined && displayModel.schoolHistory && (
          <div ref={measureHistTableRef} style={{ display: 'flow-root' }}>
            {renderSchoolHistoryTableChunk({
              rowsChunk: displayModel.schoolHistory.rows || [],
              totals: displayModel.schoolHistory.totals || null,
              includeTotalsRow: true,
              keyPrefix: 'measure-comb-hist-tbl'
            })}
          </div>
        )}
      </div>

      {pages.map((pageContent, idx) => (
        <div
          key={`admin-a4-sheet-${idx + 1}`}
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
          {/* Authentic Background Watermark from Source File (`word/header1.xml` -> `image1.jpeg`) */}
          <img
            src="/report-bg-pattern.jpg"
            alt=""
            aria-hidden="true"
            style={{
              position: 'absolute',
              left: '-14%',
              top: '-9%',
              width: '128%',
              height: '118%',
              objectFit: 'fill',
              pointerEvents: 'none',
              userSelect: 'none',
              zIndex: 0
            }}
          />

          {/* Page Content Area */}
          <div
            style={{
              position: 'relative',
              zIndex: 1,
              padding: '36px 46px 48px 54px',
              width: '100%',
              height: '100%',
              boxSizing: 'border-box'
            }}
          >
            {pageContent}
          </div>

          {/* Authentic Bottom-Center Khmer Page Number (`១`, `២`, `៣`) */}
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
