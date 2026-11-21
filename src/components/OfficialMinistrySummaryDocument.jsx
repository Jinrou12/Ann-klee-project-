import React from 'react';
import KhmerRoyalDivider from './KhmerRoyalDivider';
import ReportEditableZone from './ReportEditableZone';
import {
  formatMinistryLunarDateLine,
  formatMinistrySolarDateLine
} from '../utils/ministryReportBuilder';

const SIEMREAP_FONT = "'Khmer OS Siemreap', 'Siemreap', 'Battambang', sans-serif";
const MOUL_FONT = "'Khmer OS Muol Light', 'Khmer OS Moul Light', 'Khmer OS Muol', 'Moul', serif";

/**
 * Normalize overly wide ellipsis/dot runs in blank doc-number lines
 */
function formatCompactDots(text = '', dotCount = 16) {
  const dots = '.'.repeat(dotCount);
  return String(text || '').replace(/[.…]{4,}/g, dots).trim();
}

/**
 * OfficialMinistrySummaryDocument:
 * 1-Page Letter Portrait (8.5in × 11in = 816px × 1056px) Replica of
 * របាយការណ៍សង្ខេបប្រចាំឆ្នាំ (Provincial Department of Cults and Religion — មន្ទីរធម្មការ និងសាសនា)
 */
const OfficialMinistrySummaryDocument = React.memo(function OfficialMinistrySummaryDocument({
  id = 'printable-ministry-summary-document',
  ministryModel,
  canEdit = true,
  editMode = false,
  activeEditSection = null,
  onSelectEditSection = null
}) {
  if (!ministryModel) return null;

  const compactLunarDate = formatMinistryLunarDateLine(ministryModel.lunarDateLine);
  const compactSolarDate = formatMinistrySolarDateLine(ministryModel.solarDateLine);
  const compactDocNo = formatCompactDots(ministryModel.docNumber || '..................', 16);

  const thStyle = {
    padding: '5px 8px',
    fontFamily: MOUL_FONT,
    fontWeight: 400,
    fontSize: 14.5,
    textAlign: 'center',
    verticalAlign: 'middle',
    background: '#ffffff',
    color: '#000000'
  };

  const tdBase = {
    padding: '4.5px 10px',
    fontFamily: SIEMREAP_FONT,
    fontWeight: 400,
    fontSize: '12pt',
    verticalAlign: 'middle',
    color: '#000000',
    lineHeight: 1.58,
    background: '#ffffff'
  };

  return (
    <div
      id={id}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        background: 'transparent'
      }}
    >
      <div
        className="admin-a4-page-sheet"
        data-report-page="true"
        style={{
          width: 794,
          minWidth: 794,
          maxWidth: 794,
          height: 1123,
          minHeight: 1123,
          maxHeight: 1123,
          background: '#ffffff',
          position: 'relative',
          overflow: 'hidden',
          boxSizing: 'border-box',
          boxShadow: '0 10px 28px rgba(15, 23, 42, 0.16), 0 0 0 1px rgba(0, 0, 0, 0.06)',
          borderRadius: 2,
          fontFamily: SIEMREAP_FONT,
          fontSize: 15.2,
          lineHeight: 1.75,
          color: '#000000',
          margin: '0 auto',
          padding: '38px 52px 48px 52px'
        }}
      >
        {/* 1. Top Header: Left Logo + Provincial Dept & School | Right Kingdom & Motto */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: 14
          }}
        >
          {/* Left Block with Official School Logo (original 15/14.5 font sizes + airy lineHeight) */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              lineHeight: 1.65
            }}
          >
            <img
              src="/logo.png?v=nobg1"
              alt="Logo"
              style={{ width: 50, height: 50, objectFit: 'contain', marginBottom: 5 }}
            />
            <div style={{ fontFamily: MOUL_FONT, fontSize: 15, whiteSpace: 'nowrap' }}>
              មន្ទីរធម្មការ និងសាសនា ខេត្តកំពង់ចាម
            </div>
            <div style={{ fontFamily: MOUL_FONT, fontSize: 14.5, whiteSpace: 'nowrap' }}>
              ពុទ្ធិកបឋមសិក្សាកម្រង ហ៊ុន ណេង
            </div>
            <div style={{ fontFamily: MOUL_FONT, fontSize: 14.5, whiteSpace: 'nowrap' }}>
              ក្រុងកំពង់ចាម
            </div>
          </div>

          {/* Right Block (original 17.5/15.2 font sizes) */}
          <div style={{ textAlign: 'center', lineHeight: 1.55, paddingTop: 10 }}>
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

        {/* 2. Report Title (kept at 14pt exact per user request) */}
        <div
          style={{
            textAlign: 'center',
            fontFamily: MOUL_FONT,
            fontSize: '14pt',
            marginTop: 6,
            marginBottom: 14
          }}
        >
          {ministryModel.summaryReportTitle}
        </div>

        {/* 3. 10-Row Summary Table (WYSIWYG single-edge hairline borders) */}
        <ReportEditableZone
          editMode={editMode}
          canEdit={canEdit}
          sectionId="min_stats"
          label="តារាងសង្ខេប ១០ ជួរ (ស្ថិតិ)"
          activeSectionId={activeEditSection}
          onSelectSection={onSelectEditSection}
        >
        <table
          style={{
            width: '100%',
            borderCollapse: 'separate',
            borderSpacing: 0,
            tableLayout: 'fixed',
            marginBottom: 16,
            background: '#ffffff'
          }}
        >
          <thead>
            <tr>
              <th style={{ ...thStyle, width: '9%' }}>ល.រ</th>
              <th style={{ ...thStyle, width: '43%' }}>បរិយាយ</th>
              <th style={{ ...thStyle, width: '23%' }}>ចំនួន</th>
              <th style={{ ...thStyle, width: '25%' }}>ផ្សេងៗ</th>
            </tr>
          </thead>
          <tbody>
            {(ministryModel.summaryRows || []).map((row, idx) => (
              <tr key={`sum-row-${idx}`}>
                <td style={{ ...tdBase, textAlign: 'center' }}>{row.no}</td>
                <td style={{ ...tdBase, textAlign: 'left' }}>
                  <div>{row.desc}</div>
                  {Array.isArray(row.subDescLines) &&
                    row.subDescLines.map((sub, sIdx) => (
                      <div key={sIdx} style={{ paddingLeft: 18 }}>
                        {sub}
                      </div>
                    ))}
                </td>
                <td style={{ ...tdBase, textAlign: 'center', whiteSpace: 'nowrap' }}>
                  <div>{row.count}</div>
                  {Array.isArray(row.subCountLines) &&
                    row.subCountLines.map((subC, cIdx) => (
                      <div key={cIdx}>{subC}</div>
                    ))}
                </td>
                <td style={{ ...tdBase, textAlign: 'center' }}>{row.note || ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </ReportEditableZone>

        {/* 4. Side-by-Side Signature & Approval Block (+1pt => 16.5px with 14/11 lunar & 7/12 solar dots):
            - Left (staggered 1 line below Right): លេខ .... (above បានឃើញ និងឯកភាព) + បានឃើញ និងឯកភាព + Lunar + Solar + ព្រះនាយក
            - Right: Lunar Date + Solar Date + អ្នកធ្វើរបាយការណ៍ */}
        <ReportEditableZone
          editMode={editMode}
          canEdit={canEdit}
          sectionId="min_signature"
          label="លេខលិខិត កាលបរិច្ឆេទ & ហត្ថលេខា"
          activeSectionId={activeEditSection}
          onSelectSection={onSelectEditSection}
        >
        <div
          className="signature-block"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 10,
            marginTop: 16,
            marginLeft: -10,
            marginRight: -10,
            fontSize: 16.5,
            lineHeight: 1.68
          }}
        >
          {/* Left Column: Approval & Principal (staggered slightly down per Cambodian administrative layout) */}
          <div style={{ flex: '0 0 49.3%', maxWidth: '49.3%', textAlign: 'center', paddingTop: 22 }}>
            <div style={{ whiteSpace: 'nowrap' }}>
              លេខ {compactDocNo}
            </div>
            <div style={{ fontFamily: MOUL_FONT, fontSize: 16.5, marginTop: 2 }}>
              បានឃើញ និងឯកភាព
            </div>
            <div style={{ whiteSpace: 'nowrap', marginTop: 2 }}>{compactLunarDate}</div>
            <div style={{ whiteSpace: 'nowrap' }}>{compactSolarDate}</div>
            <div style={{ fontFamily: MOUL_FONT, fontSize: 16.5, marginTop: 6 }}>
              {ministryModel.signerTitle || 'ព្រះនាយក'}
            </div>
          </div>

          {/* Right Column: Reporter Date & Title */}
          <div style={{ flex: '0 0 49.3%', maxWidth: '49.3%', textAlign: 'center' }}>
            <div style={{ whiteSpace: 'nowrap' }}>{compactLunarDate}</div>
            <div style={{ whiteSpace: 'nowrap' }}>{compactSolarDate}</div>
            <div style={{ fontFamily: MOUL_FONT, fontSize: 16.5, marginTop: 6 }}>
              {ministryModel.reporterTitle || 'អ្នកធ្វើរបាយការណ៍'}
            </div>
          </div>
        </div>
        </ReportEditableZone>
      </div>
    </div>
  );
});

export default OfficialMinistrySummaryDocument;

