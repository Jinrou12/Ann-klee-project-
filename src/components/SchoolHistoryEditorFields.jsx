import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { toKhmerDigits, toEnglishDigits } from '../utils/khmerNumerals';

function parseNum(val) {
  const cleaned = toEnglishDigits(String(val ?? '')).replace(/[^\d]/g, '');
  const n = parseInt(cleaned, 10);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function formatSpaceThousands(val) {
  const n = Math.max(0, Math.round(Number(val) || 0));
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

function suggestNextAcademicYear(rows = []) {
  if (!rows.length) return '2026-2027';
  const last = String(rows[rows.length - 1]?.academicYear || '');
  const eng = toEnglishDigits(last);
  const m = eng.match(/(\d{4})\s*-\s*(\d{4})/);
  if (m) {
    const nextStart = parseInt(m[2], 10);
    return `${nextStart}-${nextStart + 1}`;
  }
  return '2027-2028';
}

/**
 * Reusable School History Editor Section (PC & Mobile /mp)
 * Shared by BOTH:
 * - Semester 1 + School History Combined Editor (showStandaloneMeta = false)
 * - Standalone School History Editor (showStandaloneMeta = true)
 */
export default function SchoolHistoryEditorFields({
  draft,
  onChangeDraft,
  showStandaloneMeta = false,
  isMobile = false,
  fmtNum = (n) => toKhmerDigits(n)
}) {
  if (!draft) return null;
  const rows = Array.isArray(draft.rows) ? draft.rows : [];

  let sumKg = 0;
  let sumG1 = 0;
  let sumG2 = 0;
  let sumG3 = 0;
  rows.forEach(r => {
    sumKg += parseNum(r.gradeKindergarten);
    sumG1 += parseNum(r.grade1);
    sumG2 += parseNum(r.grade2);
    sumG3 += parseNum(r.grade3);
  });
  const grandTotal = sumKg + sumG1 + sumG2 + sumG3;

  const handleRowChange = (idx, field, val) => {
    const nextRows = rows.map((r, i) => (i === idx ? { ...r, [field]: val } : r));
    onChangeDraft(prev => ({ ...prev, rows: nextRows }));
  };

  const handleAddRow = () => {
    const nextYr = suggestNextAcademicYear(rows);
    onChangeDraft(prev => ({
      ...prev,
      rows: [
        ...(prev.rows || []),
        {
          academicYear: nextYr,
          gradeKindergarten: 0,
          grade1: 0,
          grade2: 0,
          grade3: 0,
          note: ''
        }
      ]
    }));
  };

  const handleDeleteRow = (idx) => {
    if (rows.length <= 1) return;
    onChangeDraft(prev => ({
      ...prev,
      rows: (prev.rows || []).filter((_, i) => i !== idx)
    }));
  };

  const cellInputStyle = {
    width: '100%',
    padding: '4px 6px',
    borderRadius: 5,
    border: '1px solid #cbd5e1',
    fontSize: 12.5,
    textAlign: 'center',
    boxSizing: 'border-box',
    background: '#ffffff'
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {showStandaloneMeta && (
        <div>
          <label style={{ fontSize: 12.5, fontWeight: 700, color: '#0f172a', display: 'block', marginBottom: 4 }}>
            ចំណងជើងរបាយការណ៍ (ប្រវត្តិសាលា)
          </label>
          <input
            type="text"
            value={draft.title ?? ''}
            onChange={e => onChangeDraft(prev => ({ ...prev, title: e.target.value }))}
            style={{
              width: '100%',
              padding: '8px 10px',
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              fontSize: 13.5,
              boxSizing: 'border-box'
            }}
          />
        </div>
      )}

      {/* Background (I. សាវតារ / ១.១. សាវតារ) */}
      <div>
        <label style={{ fontSize: 12.5, fontWeight: 700, color: '#0f172a', display: 'block', marginBottom: 4 }}>
          {showStandaloneMeta ? '១.១. សាវតារ' : 'I. សាវតារ'} (ចុច Enter ដើម្បីចុះកថាខណ្ឌថ្មី)
        </label>
        <textarea
          rows={isMobile ? 7 : 6}
          value={draft.backgroundText ?? ''}
          onChange={e => onChangeDraft(prev => ({ ...prev, backgroundText: e.target.value }))}
          style={{
            width: '100%',
            padding: 9,
            borderRadius: 8,
            border: '1px solid #cbd5e1',
            fontSize: 13,
            lineHeight: 1.65,
            boxSizing: 'border-box',
            fontFamily: 'inherit'
          }}
        />
      </div>

      {/* Table Intro Paragraph */}
      <div>
        <label style={{ fontSize: 12.5, fontWeight: 700, color: '#0f172a', display: 'block', marginBottom: 4 }}>
          អត្ថបទណែនាំមុនតារាងទិន្នន័យធនធានមនុស្ស (កែពាក្យបានតាមចិត្ត)
        </label>
        <textarea
          rows={3}
          value={draft.tableIntro ?? ''}
          onChange={e => onChangeDraft(prev => ({ ...prev, tableIntro: e.target.value }))}
          placeholder="ឧទាហរណ៍៖ សាលាពុទ្ធិកបឋមសិក្សាផ្នែកពុទ្ធចក្រ សម្រាប់ព្រះសង្ឃ..."
          style={{
            width: '100%',
            padding: 9,
            borderRadius: 8,
            border: '1px solid #cbd5e1',
            fontSize: 13,
            lineHeight: 1.6,
            boxSizing: 'border-box',
            fontFamily: 'inherit'
          }}
        />
      </div>

      {/* Interactive Auto-Summing Multi-Year Table */}
      <div
        style={{
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: 10,
          padding: isMobile ? 8 : 12
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 8,
            marginBottom: 8
          }}
        >
          <div style={{ fontSize: 12.5, fontWeight: 700, color: '#92400e' }}>
            តារាងស្ថិតិបណ្ដុះបណ្ដាលធនធានមនុស្ស ({fmtNum(rows.length)} ឆ្នាំ — បូកសរុបស្វ័យប្រវត្តិ)
          </div>
          <button
            type="button"
            onClick={handleAddRow}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              background: '#0284c7',
              color: '#ffffff',
              border: 'none',
              padding: '5px 10px',
              borderRadius: 7,
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            <Plus size={14} />
            <span>បន្ថែមឆ្នាំសិក្សា</span>
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              minWidth: 640,
              borderCollapse: 'collapse',
              fontSize: 12.5
            }}
          >
            <thead>
              <tr style={{ background: '#fef3c7', color: '#78350f' }}>
                <th style={{ padding: '6px 4px', border: '1px solid #e2e8f0', width: 36 }}>ល.រ</th>
                <th style={{ padding: '6px 4px', border: '1px solid #e2e8f0', width: 112 }}>ឆ្នាំសិក្សា</th>
                <th style={{ padding: '6px 4px', border: '1px solid #e2e8f0', width: 72 }}>មត្តេយ្យ</th>
                <th style={{ padding: '6px 4px', border: '1px solid #e2e8f0', width: 72 }}>ថ្នាក់ទី១</th>
                <th style={{ padding: '6px 4px', border: '1px solid #e2e8f0', width: 72 }}>ថ្នាក់ទី២</th>
                <th style={{ padding: '6px 4px', border: '1px solid #e2e8f0', width: 72 }}>ថ្នាក់ទី៣</th>
                <th style={{ padding: '6px 4px', border: '1px solid #e2e8f0', width: 74 }}>សរុប (Auto)</th>
                <th style={{ padding: '6px 4px', border: '1px solid #e2e8f0' }}>ផ្សេងៗ</th>
                <th style={{ padding: '6px 4px', border: '1px solid #e2e8f0', width: 38 }}>លុប</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => {
                const rowSum =
                  parseNum(r.gradeKindergarten) +
                  parseNum(r.grade1) +
                  parseNum(r.grade2) +
                  parseNum(r.grade3);
                return (
                  <tr key={idx} style={{ background: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                    <td style={{ padding: 4, border: '1px solid #e2e8f0', textAlign: 'center', fontWeight: 700 }}>
                      {fmtNum(idx + 1)}
                    </td>
                    <td style={{ padding: 4, border: '1px solid #e2e8f0' }}>
                      <input
                        type="text"
                        value={r.academicYear ?? ''}
                        onChange={e => handleRowChange(idx, 'academicYear', e.target.value)}
                        style={cellInputStyle}
                      />
                    </td>
                    <td style={{ padding: 4, border: '1px solid #e2e8f0' }}>
                      <input
                        type="number"
                        min="0"
                        value={r.gradeKindergarten ?? 0}
                        onChange={e => handleRowChange(idx, 'gradeKindergarten', e.target.value)}
                        style={cellInputStyle}
                      />
                    </td>
                    <td style={{ padding: 4, border: '1px solid #e2e8f0' }}>
                      <input
                        type="number"
                        min="0"
                        value={r.grade1 ?? 0}
                        onChange={e => handleRowChange(idx, 'grade1', e.target.value)}
                        style={cellInputStyle}
                      />
                    </td>
                    <td style={{ padding: 4, border: '1px solid #e2e8f0' }}>
                      <input
                        type="number"
                        min="0"
                        value={r.grade2 ?? 0}
                        onChange={e => handleRowChange(idx, 'grade2', e.target.value)}
                        style={cellInputStyle}
                      />
                    </td>
                    <td style={{ padding: 4, border: '1px solid #e2e8f0' }}>
                      <input
                        type="number"
                        min="0"
                        value={r.grade3 ?? 0}
                        onChange={e => handleRowChange(idx, 'grade3', e.target.value)}
                        style={cellInputStyle}
                      />
                    </td>
                    <td
                      style={{
                        padding: 4,
                        border: '1px solid #e2e8f0',
                        textAlign: 'center',
                        fontWeight: 700,
                        color: '#b45309',
                        background: '#fffbeb'
                      }}
                    >
                      {fmtNum(rowSum)}អង្គ
                    </td>
                    <td style={{ padding: 4, border: '1px solid #e2e8f0' }}>
                      <input
                        type="text"
                        value={r.note ?? ''}
                        onChange={e => handleRowChange(idx, 'note', e.target.value)}
                        style={{ ...cellInputStyle, textAlign: 'left' }}
                      />
                    </td>
                    <td style={{ padding: 4, border: '1px solid #e2e8f0', textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={() => handleDeleteRow(idx)}
                        disabled={rows.length <= 1}
                        title="លុបជួរនេះ"
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: rows.length <= 1 ? '#cbd5e1' : '#dc2626',
                          cursor: rows.length <= 1 ? 'not-allowed' : 'pointer',
                          padding: 3
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
              <tr style={{ background: '#fef3c7', fontWeight: 700, color: '#78350f' }}>
                <td colSpan={2} style={{ padding: '7px 6px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                  សរុបទាំង{fmtNum(rows.length)}ឆ្នាំ
                </td>
                <td style={{ padding: '7px 4px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                  {fmtNum(formatSpaceThousands(sumKg))}
                </td>
                <td style={{ padding: '7px 4px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                  {fmtNum(formatSpaceThousands(sumG1))}
                </td>
                <td style={{ padding: '7px 4px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                  {fmtNum(formatSpaceThousands(sumG2))}
                </td>
                <td style={{ padding: '7px 4px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                  {fmtNum(formatSpaceThousands(sumG3))}
                </td>
                <td style={{ padding: '7px 4px', border: '1px solid #e2e8f0', textAlign: 'center', color: '#b45309' }}>
                  {fmtNum(formatSpaceThousands(grandTotal))}
                </td>
                <td colSpan={2} style={{ padding: '7px 4px', border: '1px solid #e2e8f0', textAlign: 'center', fontSize: 11.5 }}>
                  អង្គ/នាក់
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {showStandaloneMeta && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
            gap: 10
          }}
        >
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
              កាលបរិច្ឆេទច័ន្ទគតិ
            </label>
            <input
              type="text"
              value={draft.lunarDateLine ?? ''}
              onChange={e => onChangeDraft(prev => ({ ...prev, lunarDateLine: e.target.value }))}
              style={{ width: '100%', padding: '7px 9px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12.5, boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
              កាលបរិច្ឆេទសុរិយគតិ
            </label>
            <input
              type="text"
              value={draft.solarDateLine ?? ''}
              onChange={e => onChangeDraft(prev => ({ ...prev, solarDateLine: e.target.value }))}
              style={{ width: '100%', padding: '7px 9px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12.5, boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
              តួនាទីហត្ថលេខា
            </label>
            <input
              type="text"
              value={draft.signerTitle ?? ''}
              onChange={e => onChangeDraft(prev => ({ ...prev, signerTitle: e.target.value }))}
              style={{ width: '100%', padding: '7px 9px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12.5, boxSizing: 'border-box' }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

