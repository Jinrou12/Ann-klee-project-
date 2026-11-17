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
    border: '1px solid #000000',
    padding: '4.5px 10px',
    fontFamily: SIEMREAP_FONT,
    fontSize: 15,
    verticalAlign: 'middle',
    color: '#000000',
    lineHeight: 1.58
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
          <div style={{ textAlign: 'center', lineHeight: 1.62, paddingTop: 18 }}>
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

          {/* Right Block */}
          <div style={{ textAlign: 'center', lineHeight: 1.55 }}>
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

        {/* 2. Report Title */}
        <div
          style={{
            textAlign: 'center',
            fontFamily: MOUL_FONT,
            fontSize: 16,
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
            marginBottom: 14
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

        {/* 4. Signature & Approval Block (matching summary2025.txt lines 20-25 without horizontal collision) */}
        <div
          style={{
            marginTop: 6,
            fontSize: 15.2,
            lineHeight: 1.7
          }}
        >
          {/* Top-Right Date & Doc Number Block */}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <div style={{ width: '60%', textAlign: 'center' }}>
              <div style={{ whiteSpace: 'nowrap', marginBottom: 2 }}>
                {ministryModel.lunarDateLine}
              </div>
              <div>
                លេខ {ministryModel.docNumber || '.....................................'}
              </div>
            </div>
          </div>

          {/* Bottom-Left Approval Block */}
          <div style={{ width: '60%', textAlign: 'center', marginTop: 4 }}>
            <div style={{ fontFamily: MOUL_FONT, fontSize: 15.2, marginBottom: 2 }}>
              បានឃើញ និងឯកភាព
            </div>
            <div style={{ whiteSpace: 'nowrap' }}>{ministryModel.lunarDateLine}</div>
            <div style={{ whiteSpace: 'nowrap' }}>{ministryModel.solarDateLine}</div>
            <div style={{ fontFamily: MOUL_FONT, fontSize: 15.2, marginTop: 4 }}>
              {ministryModel.signerTitle || 'ព្រះនាយក'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

