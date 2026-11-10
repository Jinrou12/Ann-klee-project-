import React, { useMemo, useRef, useState, useLayoutEffect } from 'react';
import KhmerRoyalDivider from './KhmerRoyalDivider';
import { toKhmerDigits } from '../utils/khmerNumerals';

const SIEMREAP_FONT = "'Khmer OS Siemreap', 'Siemreap', 'Battambang', sans-serif";
const MOUL_FONT = "'Khmer OS Muol Light', 'Khmer OS Moul Light', 'Khmer OS Muol', 'Moul', serif";
const ROMAN_FONT = "'Times New Roman', serif";
const NAVY_HEADER_COLOR = '#002060';

// Content box height inside 1123px A4 sheet (1123 - 36px top padding - 48px bottom footer area = 1039px)
const MAX_PAGE_CONTENT_PX = 1035;
const TARGET_FULL_PAGE_PX = 1016;

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
 * Highlights specific monastic titles in Muol Light inside body/closing paragraphs
 */
function renderParagraphWithMuolHighlights(text = '', boldPhrases = []) {
  const tokens = [
    'ព្រះធម្មសាលវង្ស ព្រះអនុគណ',
    'ព្រះអនុគណ',
    ...boldPhrases.filter(Boolean)
  ];
  if (!text) return null;

  let parts = [{ text: String(text), type: 'normal' }];
  tokens.forEach(token => {
    const isMuol = token.includes('ព្រះអនុគណ') || token.includes('ព្រះធម្មសាលវង្ស');
    const nextParts = [];
    parts.forEach(part => {
      if (part.type !== 'normal' || !part.text.includes(token)) {
        nextParts.push(part);
        return;
      }
      const splitArr = part.text.split(token);
      splitArr.forEach((seg, idx) => {
        if (seg) nextParts.push({ text: seg, type: 'normal' });
        if (idx < splitArr.length - 1) {
          nextParts.push({ text: token, type: isMuol ? 'moul' : 'bold' });
        }
      });
    });
    parts = nextParts;
  });

  return parts.map((p, i) => {
    if (p.type === 'moul') {
      return (
        <span key={i} style={{ fontFamily: MOUL_FONT, fontWeight: 400 }}>
          {p.text}
        </span>
      );
    }
    if (p.type === 'bold') {
      return (
        <strong key={i} style={{ fontWeight: 700 }}>
          {p.text}
        </strong>
      );
    }
    return <React.Fragment key={i}>{p.text}</React.Fragment>;
  });
}

/**
 * Estimate visual pixel height of a Khmer paragraph by stripping zero-width subscripts/diacritics first
 * (Used only as initial fallback before real DOM offsetHeight measurement completes)
 */
function estimateVisualHeightPx(text = '', visualCharsPerLine = 64, extraPx = 4) {
  const visualStr = String(text || '')
    .replace(/\u17D2[\u1780-\u17A2]/g, '') // Subscript consonants sit underneath and take ~0 width
    .replace(/[\u17B7-\u17BD\u17C6\u17C9-\u17D3\u17DD\u200B]/g, '') // Top/bottom vowels & signs take ~0 width
    .trim();
  const lines = Math.max(1, Math.ceil(visualStr.length / visualCharsPerLine));
  return lines * 27.5 + extraPx;
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
  useKhmerNumerals = true
}) {
  const fmtNum = (n) => (useKhmerNumerals !== false ? toKhmerDigits(n) : String(n));
  const measureContainerRef = useRef(null);
  const [measuredHeights, setMeasuredHeights] = useState(null);

  // Build Page 1 Node + Flow Blocks for Page 2..N
  const { page1Node, flowBlocks } = useMemo(() => {
    if (!displayModel) return { page1Node: null, flowBlocks: [] };

    const studentLines = displayModel.studentStatLines || [];
    const page1StudentLines = studentLines.slice(0, 3);
    const page2CarryStudentLines = studentLines.slice(3);

    // PAGE 1: Official Header + Salutation + Subject + Intro + Section I + Section II (up to ថ្នាក់ទី១)
    const p1Node = (
      <div
        key="page-1-body"
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: 1008
        }}
      >
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
          <div style={{ fontFamily: MOUL_FONT, fontSize: 15.2, letterSpacing: 0.5 }}>
            ជាតិ &nbsp; សាសនា &nbsp; ព្រះមហាក្សត្រ
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
            <div style={{ fontFamily: SIEMREAP_FONT, fontSize: 15 }}>
              លេខ {displayModel.docNumber || '......................'}ព.ប.ហ.ណ
            </div>
          </div>
        </div>

        {/* 3. Salutation & Recipient Block */}
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
            {displayModel.recipientTitle}
          </div>
          <div
            style={{
              fontFamily: SIEMREAP_FONT,
              fontSize: 15.2,
              fontWeight: 700,
              fontStyle: 'italic',
              color: '#000000',
              textAlign: 'right',
              paddingRight: 10
            }}
          >
            ជាទីគោរពសក្ការៈដ៏ខ្ពង់ខ្ពស់!
          </div>
        </div>

        {/* 4. Subject (កម្មវត្ថុ៖ with hanging indent) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            textAlign: 'justify',
            marginBottom: 8,
            lineHeight: 1.75
          }}
        >
          <div
            style={{
              fontFamily: MOUL_FONT,
              fontSize: 15.2,
              minWidth: 76,
              flexShrink: 0
            }}
          >
            កម្មវត្ថុ៖
          </div>
          <div style={{ flex: 1 }}>
            {renderParagraphWithMuolHighlights(displayModel.subjectText, [
              displayModel.periodTitlePhrase
            ])}
          </div>
        </div>

        {/* 5. Intro Paragraph */}
        <div
          style={{
            textAlign: 'justify',
            paddingLeft: 76,
            marginBottom: 8,
            lineHeight: 1.75
          }}
        >
          {renderParagraphWithMuolHighlights(displayModel.introParagraph, [
            displayModel.inPeriodPhrase
          ])}
        </div>

        {/* 6. Section I: I.តួនាទី និងភារកិច្ចគណៈគ្រប់គ្រងសាលា */}
        <div style={{ marginBottom: 8 }}>
          <div style={{ paddingLeft: 28, marginBottom: 4 }}>
            <span style={{ fontFamily: ROMAN_FONT, fontWeight: 700, fontSize: 15.5 }}>I.</span>
            <span style={{ fontFamily: MOUL_FONT, fontSize: 15.2 }}>
              តួនាទី និងភារកិច្ចគណៈគ្រប់គ្រងសាលា
            </span>
          </div>
          <div
            style={{
              textAlign: 'justify',
              textIndent: 68,
              marginBottom: 6,
              lineHeight: 1.8
            }}
          >
            {displayModel.section1Intro}
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
                <span style={{ minWidth: 230, flexShrink: 0 }}>
                  {renderMonkTitleAndName(m.name)}
                </span>
                <span>{m.role}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 7. Section II: II.ស្ថិតិ គណៈគ្រប់គ្រង គ្រូ និងសមណសិស្ស */}
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
                <span>{line}</span>
              </div>
            ))}
          </div>

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
                <span>{line}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );

    const blocks = [];

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
            <span>{line}</span>
          </div>
        )
      });
    });

    // Section III Heading + Subheading ក
    blocks.push({
      id: 'sec3-head',
      isHeading: true,
      estPx: 62,
      node: (
        <div key="sec3-head" style={{ paddingTop: 6, marginBottom: 4 }}>
          <div style={{ paddingLeft: 28, marginBottom: 3 }}>
            <span style={{ fontFamily: ROMAN_FONT, fontWeight: 700, fontSize: 15.5 }}>III. </span>
            <span style={{ fontFamily: MOUL_FONT, fontSize: 15.2 }}>
              {String(displayModel.section3Heading || '').replace(/^III\.+\s*/, '')}
            </span>
          </div>
          <div style={{ paddingLeft: 68, fontWeight: 700 }}>
            {displayModel.section3SubAHeading}
          </div>
        </div>
      )
    });

    // Section III (ក) Activities with ❖ bullet
    (displayModel.activities || []).forEach((line, idx) => {
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
              textAlign: 'justify',
              marginBottom: 3,
              lineHeight: 1.78
            }}
          >
            <span style={{ width: 22, flexShrink: 0, fontSize: 13 }}>❖</span>
            <span style={{ flex: 1 }}>{line}</span>
          </div>
        )
      });
    });

    // Section III (ខ) Admin Docs
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

    (displayModel.adminDocLines || []).forEach((line, idx) => {
      blocks.push({
        id: `doc-${idx}`,
        estPx: 29,
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
            <span>{line}</span>
          </div>
        )
      });
    });

    // Section III (គ & ឃ) Appendix
    blocks.push({
      id: 'sec3-subCD',
      isHeading: true,
      estPx: 60,
      node: (
        <div key="sec3-subCD" style={{ paddingTop: 4, marginBottom: 2 }}>
          <div style={{ paddingLeft: 68, fontWeight: 700, marginBottom: 3 }}>
            {displayModel.section3SubCHeading}
          </div>
          <div style={{ paddingLeft: 68, fontWeight: 700 }}>
            {displayModel.section3SubDHeading}
          </div>
        </div>
      )
    });

    (displayModel.appendixItems || []).forEach((line, idx) => {
      blocks.push({
        id: `appx-${idx}`,
        estPx: 29,
        node: (
          <div
            key={`appx-${idx}`}
            style={{
              paddingLeft: 82,
              display: 'flex',
              alignItems: 'baseline',
              marginBottom: 2,
              lineHeight: 1.76
            }}
          >
            <span style={{ width: 20, flexShrink: 0 }}>-</span>
            <span>{line}</span>
          </div>
        )
      });
    });

    // Section IV Heading + ១-បញ្ហាប្រឈម
    blocks.push({
      id: 'sec4-head',
      isHeading: true,
      estPx: 62,
      node: (
        <div key="sec4-head" style={{ paddingTop: 6, marginBottom: 3 }}>
          <div style={{ paddingLeft: 28, marginBottom: 3 }}>
            <span style={{ fontFamily: ROMAN_FONT, fontWeight: 700, fontSize: 15.5 }}>IV.</span>
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

    (displayModel.challenges || []).forEach((line, idx) => {
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
              textAlign: 'justify',
              marginBottom: 3,
              lineHeight: 1.78
            }}
          >
            <span style={{ width: 16, flexShrink: 0 }}>-</span>
            <span style={{ flex: 1 }}>{line}</span>
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

    (displayModel.solutions || []).forEach((line, idx) => {
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
              textAlign: 'justify',
              marginBottom: 3,
              lineHeight: 1.78
            }}
          >
            <span style={{ width: 16, flexShrink: 0 }}>-</span>
            <span style={{ flex: 1 }}>{line}</span>
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

    (displayModel.requests || []).forEach((line, idx) => {
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
              textAlign: 'justify',
              marginBottom: 3,
              lineHeight: 1.78
            }}
          >
            <span style={{ width: 16, flexShrink: 0 }}>-</span>
            <span style={{ flex: 1 }}>{line}</span>
          </div>
        )
      });
    });

    // Section V: V.ទិសដៅបន្ត
    blocks.push({
      id: 'sec5-head',
      isHeading: true,
      estPx: 36,
      node: (
        <div key="sec5-head" style={{ paddingLeft: 28, paddingTop: 6, marginBottom: 3 }}>
          <span style={{ fontFamily: ROMAN_FONT, fontWeight: 700, fontSize: 15.5 }}>V.</span>
          <span style={{ fontFamily: MOUL_FONT, fontSize: 15.2 }}>ទិសដៅបន្ត</span>
        </div>
      )
    });

    (displayModel.directions || []).forEach((line, idx) => {
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
              textAlign: 'justify',
              marginBottom: 3,
              lineHeight: 1.78
            }}
          >
            <span style={{ width: 16, flexShrink: 0 }}>-</span>
            <span style={{ flex: 1 }}>{line}</span>
          </div>
        )
      });
    });

    // Section VI: VI.សន្និដ្ឋាន + Closing + Signature
    blocks.push({
      id: 'sec6-conclusion',
      estPx: estimateVisualHeightPx(displayModel.conclusionText, 62, 42),
      node: (
        <div key="sec6-conclusion" style={{ paddingTop: 6, marginBottom: 6 }}>
          <div style={{ paddingLeft: 28, marginBottom: 3 }}>
            <span style={{ fontFamily: ROMAN_FONT, fontWeight: 700, fontSize: 15.5 }}>VI.</span>
            <span style={{ fontFamily: MOUL_FONT, fontSize: 15.2 }}>សន្និដ្ឋាន</span>
          </div>
          <div
            style={{
              paddingLeft: 28,
              textAlign: 'justify',
              textIndent: 42,
              lineHeight: 1.82
            }}
          >
            {displayModel.conclusionText}
          </div>
        </div>
      )
    });

    blocks.push({
      id: 'sec6-closing-signature',
      estPx: 162,
      node: (
        <div key="sec6-closing-signature" className="signature-block">
          <div
            style={{
              paddingLeft: 28,
              textAlign: 'justify',
              textIndent: 42,
              marginBottom: 4,
              lineHeight: 1.8
            }}
          >
            {renderParagraphWithMuolHighlights(displayModel.closingLine1)}
          </div>
          <div
            style={{
              paddingLeft: 28,
              textAlign: 'justify',
              textIndent: 42,
              marginBottom: 8,
              lineHeight: 1.8
            }}
          >
            {renderParagraphWithMuolHighlights(displayModel.closingLine2)}
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

    return { page1Node: p1Node, flowBlocks: blocks };
  }, [displayModel]);

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
      const heights = children.map(child => {
        const rect = child.getBoundingClientRect();
        return scaleFactor > 0 ? rect.height / scaleFactor : rect.height;
      });
      setMeasuredHeights(prev => {
        if (prev && prev.length === heights.length && prev.every((v, i) => Math.abs(v - heights[i]) <= 0.5)) {
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
    if (!page1Node) return [];

    const blockHeights = flowBlocks.map((blk, i) =>
      measuredHeights && measuredHeights[i] ? measuredHeights[i] : blk.estPx
    );
    const totalFlowPx = blockHeights.reduce((acc, h) => acc + h, 0);

    let pagedBuckets = [];

    // When all flowBlocks fit across Page 2 and Page 3 (<= 2 * MAX_PAGE_CONTENT_PX),
    // pick the optimal split point so both Page 2 and Page 3 are balanced and full,
    // without leaving an orphan heading at the bottom of Page 2.
    if (flowBlocks.length > 1 && totalFlowPx <= MAX_PAGE_CONTENT_PX * 2) {
      let bestSplitIdx = -1;
      let bestScore = Infinity;
      let runningP2 = 0;

      for (let splitIdx = 1; splitIdx < flowBlocks.length; splitIdx++) {
        runningP2 += blockHeights[splitIdx - 1];
        const p3Px = totalFlowPx - runningP2;

        // Never leave a section/subsection heading alone at the bottom of Page 2
        if (flowBlocks[splitIdx - 1].isHeading) continue;

        if (runningP2 <= MAX_PAGE_CONTENT_PX && p3Px <= MAX_PAGE_CONTENT_PX) {
          // Prefer balanced pages, with a small bonus when Page 3 starts cleanly on a heading
          const headingBonus = flowBlocks[splitIdx].isHeading ? -32 : 0;
          const score = Math.abs(runningP2 - p3Px) + headingBonus;
          if (score < bestScore) {
            bestScore = score;
            bestSplitIdx = splitIdx;
          }
        }
      }

      if (bestSplitIdx > 0) {
        pagedBuckets = [
          {
            items: flowBlocks.slice(0, bestSplitIdx),
            heightPx: blockHeights.slice(0, bestSplitIdx).reduce((a, b) => a + b, 0)
          },
          {
            items: flowBlocks.slice(bestSplitIdx),
            heightPx: blockHeights.slice(bestSplitIdx).reduce((a, b) => a + b, 0)
          }
        ];
      }
    }

    // Fallback greedy multi-page packing if custom text exceeds 2 flow pages
    if (pagedBuckets.length === 0) {
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
    }

    return [
      page1Node,
      ...pagedBuckets.map((bucketObj, pIdx) => {
        const items = bucketObj.items;
        const bucketPx = bucketObj.heightPx || 0;
        const extraCap = Math.max(0, (items.length - 1) * 7.5);
        const targetFillPx = Math.min(TARGET_FULL_PAGE_PX, Math.round(bucketPx + extraCap));

        return (
          <div
            key={`page-body-${pIdx + 2}`}
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: items.length > 3 ? 'space-between' : 'flex-start',
              minHeight: items.length > 3 ? targetFillPx : 'auto'
            }}
          >
            {items.map(b => b.node)}
          </div>
        );
      })
    ];
  }, [page1Node, flowBlocks, measuredHeights]);

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
        ref={measureContainerRef}
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: -10000,
          top: 0,
          width: 694,
          visibility: 'hidden',
          pointerEvents: 'none',
          fontFamily: SIEMREAP_FONT,
          fontSize: 15.2,
          lineHeight: 1.78
        }}
      >
        {flowBlocks.map(b => (
          <div key={`measure-${b.id}`} style={{ display: 'flow-root' }}>
            {b.node}
          </div>
        ))}
      </div>

      {pages.map((pageContent, idx) => (
        <div
          key={`admin-a4-sheet-${idx + 1}`}
          className="admin-a4-page-sheet"
          style={{
            position: 'relative',
            width: 794,
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
