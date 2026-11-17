import React from 'react';
import KhmerRoyalDivider from './KhmerRoyalDivider';

const SIEMREAP_FONT = "'Khmer OS Siemreap', 'Siemreap', 'Battambang', sans-serif";
const MOUL_FONT = "'Khmer OS Muol Light', 'Khmer OS Moul Light', 'Khmer OS Muol', 'Moul', serif";

/**
 * OfficialMinistrySummaryDocument:
 * 1-Page Letter Portrait (8.5in × 11in = 816px × 1056px) Replica of
 * របាយការណ៍សង្ខេបប្រចាំឆ្នាំ (Provincial Department of Cults and Religion — មន្ទីរធម្មការ និងសាសនា)
 */
export default function OfficialMinistrySummaryDocument({
  id = 'printable-ministry-summary-document',
  ministryModel
}) {
  if (!ministryModel) return null;

  const thStyle = {
    border: '1px solid #000000',
    padding: '7px 8px',
    fontFamily: MOUL_FONT,
    fontWeight: 400,
    fontSize: '11.5pt',
    textAlign: 'center',
    verticalAlign: 'middle',
    background: '#ffffff',
    color: '#000000'
  };

  const tdBase = {
    border: '1px solid #000000',
    padding: '6px 10px',
    fontFamily: SIEMREAP_FONT,
    fontSize: '11.5pt',
    verticalAlign: 'middle',
    color: '#000000',
    lineHeight: 1.65
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
        className="admin-a4-page-sheet ministry-letter-page-sheet"
        data-report-page="true"
        data-page-format="letter"
        style={{
          width: 816,
          minWidth: 816,
          maxWidth: 816,
          height: 1056,
          minHeight: 1056,
          maxHeight: 1056,
          background: '#ffffff',
          position: 'relative',
          overflow: 'hidden',
          boxSizing: 'border-box',
          boxShadow: '0 6px 24px rgba(15, 23, 42, 0.14)',
          borderRadius: 2,
          fontFamily: SIEMREAP_FONT,
          fontSize: '11.5pt',
          lineHeight: 1.7,
          color: '#000000',
          margin: '0 auto',
          padding: '38px 64px 48px 64px'
        }}
      >
        {/* 1. Top Header: Left Provincial Dept & School | Right Kingdom & Motto */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: 18
          }}
        >
          {/* Left Block */}
          <div style={{ textAlign: 'center', lineHeight: 1.65, paddingTop: 18 }}>
            <div style={{ fontFamily: MOUL_FONT, fontSize: '11pt', whiteSpace: 'nowrap' }}>
              មន្ទីរធម្មការ និងសាសនា ខេត្តកំពង់ចាម
            </div>
            <div style={{ fontFamily: MOUL_FONT, fontSize: '11pt', whiteSpace: 'nowrap' }}>
              ពុទ្ធិកបឋមសិក្សាកម្រង ហ៊ុន ណេង
            </div>
            <div style={{ fontFamily: MOUL_FONT, fontSize: '11pt', whiteSpace: 'nowrap' }}>
              ក្រុងកំពង់ចាម
            </div>
          </div>

          {/* Right Block */}
          <div style={{ textAlign: 'center', lineHeight: 1.6 }}>
            <div style={{ fontFamily: MOUL_FONT, fontSize: '12.5pt', whiteSpace: 'nowrap' }}>
              ព្រះរាជាណាចក្រកម្ពុជា
            </div>
            <div style={{ fontFamily: MOUL_FONT, fontSize: '11.5pt', whiteSpace: 'nowrap' }}>
              ជាតិ សាសនា ព្រះមហាក្សត្រ
            </div>
            <div style={{ marginTop: 2 }}>
              <KhmerRoyalDivider color="#000000" />
            </div>
          </div>
        </div>

        {/* 2. Report Title */}
        <div
          style={{
            textAlign: 'center',
            fontFamily: MOUL_FONT,
            fontSize: '13pt',
            marginTop: 6,
            marginBottom: 16
          }}
        >
          {ministryModel.summaryReportTitle}
        </div>

        {/* 3. 10-Row Summary Table */}
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            tableLayout: 'fixed',
            marginBottom: 22
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

        {/* 4. Signature & Approval Block (matching summary2025.txt lines 20-25) */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginTop: 10,
            fontSize: '11.5pt',
            lineHeight: 1.75
          }}
        >
          {/* Left Approval Block */}
          <div style={{ width: '54%', textAlign: 'center', paddingTop: 28 }}>
            <div style={{ fontFamily: MOUL_FONT, fontSize: '11.5pt', marginBottom: 4 }}>
              បានឃើញ និងឯកភាព
            </div>
            <div style={{ whiteSpace: 'nowrap' }}>{ministryModel.lunarDateLine}</div>
            <div style={{ whiteSpace: 'nowrap' }}>{ministryModel.solarDateLine}</div>
            <div style={{ fontFamily: MOUL_FONT, fontSize: '11.5pt', marginTop: 6 }}>
              {ministryModel.signerTitle || 'ព្រះនាយក'}
            </div>
          </div>

          {/* Right Date & Doc Number Block */}
          <div style={{ width: '46%', textAlign: 'center' }}>
            <div style={{ whiteSpace: 'nowrap', marginBottom: 4 }}>
              {ministryModel.lunarDateLine}
            </div>
            <div>
              លេខ {ministryModel.docNumber || '.....................................'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

