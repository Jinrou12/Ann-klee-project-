import React, { useMemo, useRef } from 'react';
import { Trash2 } from 'lucide-react';
import {
  toKhmerDigits,
  parseDurationShorthand,
  normalizeRecordDateStr,
  sortRecordsByDateAsc
} from '../utils/khmerNumerals';
import { getMonthEndReportDates } from '../utils/khmerCalendar';
import KhmerRoyalDivider from './KhmerRoyalDivider';

/**
 * OfficialLeaveDocument: The canonical, authentic A4 Ministry replica
 * Used in LeaveTableView (interactive desktop) and LeaveMobileView (for direct high-res PDF generation).
 */
export default function OfficialLeaveDocument({
  id = 'printable-leave-document',
  records = [],
  metadata = {},
  monthName = 'កក្កដា',
  yearDisplay = '២០២៦',
  useKhmerNumerals = true,
  monthKey = '2026-07',
  isEditable = false,
  editingRowId = null,
  setEditingRowId = () => {},
  handleCellChange = () => {},
  handleDeleteRow = () => {},
  studentMaster = [],
  customPeriodTitle = '',
  customSummaryText = '',
  compactReasonColumn = false,
  dateColumnHeader = ''
}) {
  // Automatically calculate the last working day of the month (excluding Saturday/Sunday)
  const reportDates = useMemo(() => getMonthEndReportDates(monthKey, {
    watName: metadata.wat,
    customLunarTemplate: metadata.lunarDateHeader,
    useKhmerNumerals
  }), [monthKey, metadata.wat, metadata.lunarDateHeader, useKhmerNumerals]);

  // Sort rows chronologically by Date (កាលបរិច្ឆេទ) ascending (ល.រ ១, ២, ៣...), keeping row position stable while editing
  const lastSortedIdsRef = useRef([]);
  const sortedRecords = useMemo(() => {
    if (!editingRowId) {
      const sorted = sortRecordsByDateAsc(records);
      lastSortedIdsRef.current = sorted.map(r => r.id);
      return sorted;
    }
    const orderMap = new Map(lastSortedIdsRef.current.map((id, i) => [id, i]));
    return [...records].sort((a, b) => {
      const idxA = orderMap.has(a.id) ? orderMap.get(a.id) : 999999;
      const idxB = orderMap.has(b.id) ? orderMap.get(b.id) : 999999;
      return idxA - idxB;
    });
  }, [records, editingRowId]);

  return (
    <div id={id} className="printable-document">
      {/* Header Block */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16
      }}>
        {/* Left: Ministry & School with Centered Logo on top */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1.5 }}>
          <img
            src="/logo.png?v=nobg1"
            alt="Logo"
            style={{ width: 50, height: 50, objectFit: 'contain', marginBottom: 3 }}
          />
          <div className="font-moul" style={{ fontSize: '11pt', textAlign: 'center', whiteSpace: 'nowrap' }}>
            {metadata.ministry}
          </div>
          <div className="font-moul" style={{ fontSize: '11pt', textAlign: 'center', whiteSpace: 'nowrap' }}>
            {String(metadata.school || '').replace(/^សាលា(?=ពុទ្ធិក)/, '')}
          </div>
          <div className="font-moul" style={{ fontSize: '11pt', textAlign: 'center', whiteSpace: 'nowrap' }}>
            {metadata.location}
          </div>
        </div>

        {/* Right: National Kingdom & Motto */}
        <div style={{ textAlign: 'center', lineHeight: 1.5 }}>
          <div className="font-moul" style={{ fontSize: '14pt', whiteSpace: 'nowrap' }}>
            ព្រះរាជាណាចក្រកម្ពុជា
          </div>
          <div className="font-moul" style={{ fontSize: '12pt', whiteSpace: 'nowrap' }}>
            ជាតិ សាសនា ព្រះមហាក្សត្រ
          </div>
          <KhmerRoyalDivider />
        </div>
      </div>

      {/* Report Title — 3 lines exactly like the original template (របាយការណ៍ / ស្ដីពី / title) */}
      <div style={{ textAlign: 'center', marginTop: 10, marginBottom: 14, lineHeight: 1.6 }}>
        <div className="font-moul" style={{ fontSize: '14pt', whiteSpace: 'nowrap' }}>
          របាយការណ៍
        </div>
        <div className="font-moul" style={{ fontSize: '14pt', whiteSpace: 'nowrap' }}>
          ស្ដីពី
        </div>
        <div className="font-moul" style={{ fontSize: '14pt', whiteSpace: 'nowrap' }}>
          {customPeriodTitle || `ចំនួនសមណសិស្សសុំច្បាប់ ក្នុងខែ${monthName} ឆ្នាំ${yearDisplay}`}
        </div>
      </div>

      {/* The Exact Table */}
      <table className="official-grid" style={{
        width: '100%',
        tableLayout: compactReasonColumn ? 'fixed' : 'auto',
        borderCollapse: 'separate',
        borderSpacing: 0,
        fontSize: '11pt'
      }}>
        <thead>
          <tr style={{ background: '#ffffff', textAlign: 'center', height: 28 }}>
            <th style={{ border: '1px solid #000', width: '5%', padding: '3px 4px', fontWeight: 400, whiteSpace: 'nowrap' }}>ល.រ</th>
            <th style={{ border: '1px solid #000', width: '20%', padding: '3px 6px', fontWeight: 400, whiteSpace: 'nowrap' }}>គោត្តនាម-និងនាម</th>
            <th style={{ border: '1px solid #000', width: compactReasonColumn ? '7%' : '7%', padding: '3px 4px', fontWeight: 400, whiteSpace: 'nowrap' }}>ថ្នាក់</th>
            <th style={{ border: '1px solid #000', width: compactReasonColumn ? '28%' : '31%', padding: '3px 6px', fontWeight: 400, whiteSpace: 'nowrap' }}>មូលហេតុ</th>
            <th style={{ border: '1px solid #000', width: compactReasonColumn ? '16%' : '13%', padding: '3px 5px', fontWeight: 400, whiteSpace: 'nowrap' }}>ចំនួនឈប់</th>
            <th style={{ border: '1px solid #000', width: compactReasonColumn ? '15%' : '14%', padding: '3px 5px', fontWeight: 400, whiteSpace: 'nowrap' }}>
              {dateColumnHeader || (compactReasonColumn ? 'ចំនួនឈប់សរុប' : 'កាលបរិច្ឆេទ')}
            </th>
            <th style={{ border: '1px solid #000', width: compactReasonColumn ? '9%' : '10%', padding: '3px 4px', fontWeight: 400, whiteSpace: 'nowrap' }}>ផ្សេងៗ</th>
            {isEditable && (
              <th className="no-print" style={{ border: '1px solid #cbd5e1', width: 40, background: '#f8fafc' }}></th>
            )}
          </tr>
        </thead>
        <tbody>
          {sortedRecords.length === 0 ? (
            <tr>
              <td colSpan={isEditable ? 8 : 7} style={{ textAlign: 'center', padding: 16, color: '#64748b', border: '1px solid #000' }}>
                មិនទាន់មានទិន្នន័យច្បាប់សម្រាប់ខែនេះនៅឡើយទេ។
              </td>
            </tr>
          ) : (
            sortedRecords.map((r, index) => {
              const isEditing = isEditable && editingRowId === r.id;
              const rowNum = useKhmerNumerals ? toKhmerDigits(index + 1) : (index + 1);

              return (
                <tr key={r.id} style={{ height: 26 }}>
                  {/* Column 1: Index */}
                  <td style={{ border: '1px solid #000', textAlign: 'center', padding: '4px 4px' }}>
                    {rowNum}
                  </td>

                  {/* Column 2: Name */}
                  <td style={{ border: '1px solid #000', padding: '4px 7px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.45 }}>
                    {isEditing ? (
                      <input
                        type="text"
                        value={r.name}
                        onChange={e => handleCellChange(r.id, 'name', e.target.value)}
                        list="student-list-suggestions"
                        style={{ width: '100%', border: '1px solid #b45309', padding: '2px 4px', fontSize: 13 }}
                        autoFocus
                      />
                    ) : (
                      <div
                        onClick={() => isEditable && setEditingRowId(r.id)}
                        style={{ cursor: isEditable ? 'pointer' : 'default', minHeight: 20, lineHeight: 1.45, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                        title={isEditable ? "ចុចដើម្បីកែប្រែ" : ""}
                      >
                        {r.name || <span style={{ color: '#cbd5e1' }}>--</span>}
                      </div>
                    )}
                  </td>

                  {/* Column 3: Grade */}
                  <td style={{ border: '1px solid #000', textAlign: 'center', padding: '4px 4px', whiteSpace: 'nowrap' }}>
                    {isEditing ? (
                      <input
                        type="text"
                        value={r.grade}
                        onChange={e => handleCellChange(r.id, 'grade', e.target.value)}
                        style={{ width: '100%', textAlign: 'center', border: '1px solid #b45309', padding: '2px 4px', fontSize: 13 }}
                      />
                    ) : (
                      <div onClick={() => isEditable && setEditingRowId(r.id)} style={{ cursor: isEditable ? 'pointer' : 'default', whiteSpace: 'nowrap' }}>
                        {useKhmerNumerals ? toKhmerDigits(r.grade) : r.grade}
                      </div>
                    )}
                  </td>

                  {/* Column 4: Reason */}
                  <td style={{
                    border: '1px solid #000',
                    padding: '4px 8px',
                    lineHeight: 1.45,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {isEditing ? (
                      <input
                        type="text"
                        value={r.reason}
                        onChange={e => handleCellChange(r.id, 'reason', e.target.value)}
                        style={{ width: '100%', border: '1px solid #b45309', padding: '2px 4px', fontSize: 13 }}
                      />
                    ) : (
                      <div
                        onClick={() => isEditable && setEditingRowId(r.id)}
                        style={{
                          cursor: isEditable ? 'pointer' : 'default',
                          lineHeight: 1.45,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                        title={isEditable ? "ចុចដើម្បីកែប្រែ" : ""}
                      >
                        {String(r.reason || '').replace(/\s+/g, ' ').trim()}
                      </div>
                    )}
                  </td>

                  {/* Column 5: Duration */}
                  <td style={{
                    border: '1px solid #000',
                    textAlign: 'center',
                    padding: '3px 4px',
                    whiteSpace: 'nowrap',
                    fontSize: String(r.duration || '').length > 12 ? '9.5pt' : '11pt'
                  }}>
                    {isEditing ? (
                      <input
                        type="text"
                        value={r.duration ?? ''}
                        onChange={e => handleCellChange(r.id, 'duration', e.target.value)}
                        onBlur={e => handleCellChange(r.id, 'duration', parseDurationShorthand(e.target.value) || '១ថ្ងៃ')}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleCellChange(r.id, 'duration', parseDurationShorthand(e.target.value) || '១ថ្ងៃ');
                            setEditingRowId(null);
                          }
                        }}
                        placeholder="1, 1.5, 1a, 1p"
                        style={{ width: '100%', textAlign: 'center', border: '1px solid #b45309', padding: '2px 4px', fontSize: 13 }}
                      />
                    ) : (
                      <div onClick={() => isEditable && setEditingRowId(r.id)} style={{ cursor: isEditable ? 'pointer' : 'default', whiteSpace: 'nowrap' }}>
                        {r.duration}
                      </div>
                    )}
                  </td>

                  {/* Column 6: Date */}
                  <td style={{ border: '1px solid #000', textAlign: 'center', padding: '3px 6px', whiteSpace: 'nowrap' }}>
                    {isEditing ? (
                      <input
                        type="text"
                        value={r.date}
                        onChange={e => handleCellChange(r.id, 'date', e.target.value)}
                        style={{ width: '100%', textAlign: 'center', border: '1px solid #b45309', padding: '2px 4px', fontSize: 13 }}
                      />
                    ) : (
                      <div
                        onClick={() => isEditable && setEditingRowId(r.id)}
                        style={{ cursor: isEditable ? 'pointer' : 'default', whiteSpace: 'nowrap' }}
                        title={isEditable ? "ចុចដើម្បីកែប្រែ" : ""}
                      >
                        {(() => {
                          const cleanDate = normalizeRecordDateStr(r.date);
                          return useKhmerNumerals ? toKhmerDigits(cleanDate) : cleanDate;
                        })()}
                      </div>
                    )}
                  </td>

                  {/* Column 7: Note */}
                  <td style={{ border: '1px solid #000', textAlign: 'center', padding: '3px 4px' }}>
                    {isEditing ? (
                      <input
                        type="text"
                        value={r.note}
                        onChange={e => handleCellChange(r.id, 'note', e.target.value)}
                        style={{ width: '100%', textAlign: 'center', border: '1px solid #b45309', padding: '2px 4px', fontSize: 13 }}
                      />
                    ) : (
                      <div onClick={() => isEditable && setEditingRowId(r.id)} style={{ cursor: isEditable ? 'pointer' : 'default' }}>
                        {r.note}
                      </div>
                    )}
                  </td>

                  {/* Action Column (No-print) */}
                  {isEditable && (
                    <td className="no-print" style={{ border: '1px solid #cbd5e1', textAlign: 'center', padding: 2 }}>
                      {isEditing ? (
                        <button
                          onClick={() => setEditingRowId(null)}
                          style={{ background: '#15803d', color: '#fff', fontSize: 11, padding: '2px 6px', borderRadius: 4 }}
                        >
                          រួច
                        </button>
                      ) : (
                        <button
                          onClick={() => handleDeleteRow(r.id)}
                          style={{ background: 'transparent', color: '#ef4444', padding: 2 }}
                          title="លុបជួរនេះ"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              );
            })
          )}
        </tbody>
      </table>

      {/* Datalist for student name autocomplete */}
      {isEditable && studentMaster && studentMaster.length > 0 && (
        <datalist id="student-list-suggestions">
          {studentMaster.map(s => (
            <option key={s.id} value={s.name}>
              {s.name} (ថ្នាក់ទី {s.grade})
            </option>
          ))}
        </datalist>
      )}

      {/* Summary Count Row */}
      <div style={{ marginTop: 14, fontSize: '11pt', fontWeight: 400 }}>
        {customSummaryText || `ចំនួនសមណសិស្សសុំច្បាប់ក្នុងខែ${monthName} សរុប ${useKhmerNumerals ? toKhmerDigits(records.length) : records.length}អង្គ`}
      </div>

      {/* Official Signatures & Dates Block (Exact match with PDF 2) */}
      <div
        className="signature-block"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginTop: 16,
          marginBottom: 10,
          fontSize: '11pt',
          lineHeight: 1.6
        }}
      >
        {/* Left Signature: School Director */}
        <div style={{ textAlign: 'center', flex: '0 0 46%', maxWidth: '46%' }}>
          <div className="font-moul" style={{ fontSize: '11pt', marginBottom: 4, whiteSpace: 'nowrap' }}>
            បានឃើញ និង..................
          </div>
          <div style={{ whiteSpace: 'nowrap' }}>ថ្ងៃ..............ខែ...........ឆ្នាំ{reportDates.zodiac || 'មមី'}{reportDates.sak || 'អដ្ឋស័ក'} ព.ស {reportDates.beYear || '២៥៧០'}</div>
          <div style={{ whiteSpace: 'nowrap' }}>ត្រូវនឹងថ្ងៃទី....... ខែ............ ឆ្នាំ{reportDates.yearKhmer}</div>
          <div className="font-moul" style={{ fontSize: '12pt', marginTop: 6, paddingBottom: 20, whiteSpace: 'nowrap' }}>
            {(!metadata.directorTitle || metadata.directorTitle === 'ព្រះចៅអធិការ' || metadata.directorTitle === 'ព្រះនាយក')
              ? 'នាយកសាលា'
              : metadata.directorTitle}
          </div>
        </div>

        {/* Right Signature: Reporter (Automatically calculated last working day, excluding Sat/Sun) */}
        <div style={{ textAlign: 'center', flex: '0 0 53%', maxWidth: '53%' }}>
          <div style={{ whiteSpace: 'nowrap' }}>{reportDates.lunarDateText}</div>
          <div style={{ whiteSpace: 'nowrap' }}>{reportDates.solarDateTextLeave}</div>
          <div className="font-moul" style={{ fontSize: '12pt', marginTop: 6, paddingBottom: 20, whiteSpace: 'nowrap' }}>
            {metadata.reporterTitle || 'អ្នកធ្វើរបាយការណ៍'}
          </div>
        </div>
      </div>
    </div>
  );
}
