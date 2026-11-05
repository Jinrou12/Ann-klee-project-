import React, { useMemo } from 'react';
import { Trash2 } from 'lucide-react';
import { toKhmerDigits, parseDurationShorthand } from '../utils/khmerNumerals';
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
  studentMaster = []
}) {
  // Automatically calculate the last working day of the month (excluding Saturday/Sunday)
  const reportDates = useMemo(() => getMonthEndReportDates(monthKey, {
    watName: metadata.wat,
    customLunarTemplate: metadata.lunarDateHeader,
    useKhmerNumerals
  }), [monthKey, metadata.wat, metadata.lunarDateHeader, useKhmerNumerals]);
  return (
    <div id={id} className="printable-document">
      {/* Header Block */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16
      }}>
        {/* Left: Ministry & School (No logo in PDF 2) */}
        <div style={{ textAlign: 'center', lineHeight: 1.5 }}>
          <div className="font-moul" style={{ fontSize: 14, whiteSpace: 'nowrap' }}>
            {metadata.ministry}
          </div>
          <div className="font-moul" style={{ fontSize: 14, whiteSpace: 'nowrap' }}>
            {String(metadata.school || '').startsWith('សាលា') ? metadata.school : `សាលា${metadata.school || ''}`}
          </div>
          <div className="font-moul" style={{ fontSize: 14, whiteSpace: 'nowrap' }}>
            {metadata.location}
          </div>
        </div>

        {/* Right: National Kingdom & Motto */}
        <div style={{ textAlign: 'center', lineHeight: 1.5 }}>
          <div className="font-moul" style={{ fontSize: 15.5, whiteSpace: 'nowrap' }}>
            ព្រះរាជាណាចក្រកម្ពុជា
          </div>
          <div className="font-moul" style={{ fontSize: 14.5, whiteSpace: 'nowrap' }}>
            ជាតិ សាសនា ព្រះមហាក្សត្រ
          </div>
          <KhmerRoyalDivider />
        </div>
      </div>

      {/* Report Title */}
      <div style={{ textAlign: 'center', marginTop: 12, marginBottom: 20 }}>
        <div className="font-moul" style={{ fontSize: 18, marginBottom: 4, whiteSpace: 'nowrap' }}>
          របាយការណ៍ ស្ដីពី
        </div>
        <div className="font-moul" style={{ fontSize: 16.5, whiteSpace: 'nowrap' }}>
          ចំនួនសមណសិស្សសុំច្បាប់ ក្នុងខែ{monthName} ឆ្នាំ{yearDisplay}
        </div>
      </div>

      {/* The Exact Table */}
      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
        border: '1px solid #000000',
        fontSize: 13
      }}>
        <thead>
          <tr style={{ background: '#ffffff', textAlign: 'center', height: 36 }}>
            <th style={{ border: '1px solid #000', width: '5%', padding: '6px 4px', fontWeight: 700, whiteSpace: 'nowrap' }}>ល.រ</th>
            <th style={{ border: '1px solid #000', width: '19%', padding: '6px 8px', fontWeight: 700, whiteSpace: 'nowrap' }}>គោត្តនាម-និងនាម</th>
            <th style={{ border: '1px solid #000', width: '7%', padding: '6px 4px', fontWeight: 700, whiteSpace: 'nowrap' }}>ថ្នាក់</th>
            <th style={{ border: '1px solid #000', width: '34%', padding: '6px 8px', fontWeight: 700, whiteSpace: 'nowrap' }}>មូលហេតុ</th>
            <th style={{ border: '1px solid #000', width: '11%', padding: '6px 6px', fontWeight: 700, whiteSpace: 'nowrap' }}>ចំនួនឈប់</th>
            <th style={{ border: '1px solid #000', width: '14%', padding: '6px 6px', fontWeight: 700, whiteSpace: 'nowrap' }}>កាលបរិច្ឆេទ</th>
            <th style={{ border: '1px solid #000', width: '10%', padding: '6px 4px', fontWeight: 700, whiteSpace: 'nowrap' }}>ផ្សេងៗ</th>
            {isEditable && (
              <th className="no-print" style={{ border: '1px solid #cbd5e1', width: 40, background: '#f8fafc' }}></th>
            )}
          </tr>
        </thead>
        <tbody>
          {records.length === 0 ? (
            <tr>
              <td colSpan={isEditable ? 8 : 7} style={{ textAlign: 'center', padding: 20, color: '#64748b', border: '1px solid #000' }}>
                មិនទាន់មានទិន្នន័យច្បាប់សម្រាប់ខែនេះនៅឡើយទេ។
              </td>
            </tr>
          ) : (
            records.map((r, index) => {
              const isEditing = isEditable && editingRowId === r.id;
              const rowNum = useKhmerNumerals ? toKhmerDigits(index + 1) : (index + 1);

              return (
                <tr key={r.id} style={{ height: 32 }}>
                  {/* Column 1: Index */}
                  <td style={{ border: '1px solid #000', textAlign: 'center', padding: '4px' }}>
                    {rowNum}
                  </td>

                  {/* Column 2: Name */}
                  <td style={{ border: '1px solid #000', padding: '4px 8px', whiteSpace: 'nowrap' }}>
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
                        style={{ cursor: isEditable ? 'pointer' : 'default', minHeight: 20, whiteSpace: 'nowrap' }}
                        title={isEditable ? "ចុចដើម្បីកែប្រែ" : ""}
                      >
                        {r.name || <span style={{ color: '#cbd5e1' }}>--</span>}
                      </div>
                    )}
                  </td>

                  {/* Column 3: Grade */}
                  <td style={{ border: '1px solid #000', textAlign: 'center', padding: '4px', whiteSpace: 'nowrap' }}>
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
                  <td style={{ border: '1px solid #000', padding: '4px 8px', whiteSpace: 'nowrap' }}>
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
                        style={{ cursor: isEditable ? 'pointer' : 'default', whiteSpace: 'nowrap' }}
                        title={isEditable ? "ចុចដើម្បីកែប្រែ" : ""}
                      >
                        {String(r.reason || '').replace(/\s+/g, ' ').trim()}
                      </div>
                    )}
                  </td>

                  {/* Column 5: Duration */}
                  <td style={{ border: '1px solid #000', textAlign: 'center', padding: '4px 6px', whiteSpace: 'nowrap' }}>
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
                  <td style={{ border: '1px solid #000', textAlign: 'center', padding: '4px 6px', whiteSpace: 'nowrap' }}>
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
                          let cleanDate = String(r.date || '').trim();
                          cleanDate = cleanDate.replace(/2024/g, '2026').replace(/២០២៤/g, '២០២៦');
                          if (cleanDate.includes('ដល់') || cleanDate.includes('-')) {
                            const parts = cleanDate.split(/ដល់|-/);
                            if (parts[0] && parts[0].trim().length >= 6) {
                              cleanDate = parts[0].trim();
                            }
                          }
                          return useKhmerNumerals ? toKhmerDigits(cleanDate) : cleanDate;
                        })()}
                      </div>
                    )}
                  </td>

                  {/* Column 7: Note */}
                  <td style={{ border: '1px solid #000', textAlign: 'center', padding: '4px' }}>
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
      <div style={{ marginTop: 14, fontSize: 13, fontWeight: 700 }}>
        ចំនួនសមណសិស្សសុំច្បាប់ក្នុងខែ{monthName} សរុប {useKhmerNumerals ? toKhmerDigits(records.length) : records.length}អង្គ
      </div>

      {/* Official Signatures & Dates Block (Exact match with PDF 2) */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginTop: 24,
        marginBottom: 30,
        fontSize: 13,
        lineHeight: 1.6
      }}>
        {/* Left Signature: School Director */}
        <div style={{ textAlign: 'center', flex: 1, maxWidth: '48%' }}>
          <div className="font-moul" style={{ fontSize: 13, marginBottom: 4, whiteSpace: 'nowrap' }}>
            បានឃើញ និង..................
          </div>
          <div style={{ whiteSpace: 'nowrap' }}>ថ្ងៃ.......................ខែ..................ឆ្នាំ{reportDates.zodiac || 'មមី'}{reportDates.sak || 'អដ្ឋស័ក'} ព.ស {reportDates.beYear || '២៥៧០'}</div>
          <div style={{ whiteSpace: 'nowrap' }}>ត្រូវនឹងថ្ងៃទី....... ខែ............ ឆ្នាំ{reportDates.yearKhmer}</div>
          <div className="font-moul" style={{ fontSize: 13, marginTop: 8, paddingBottom: 45, whiteSpace: 'nowrap' }}>
            {(!metadata.directorTitle || metadata.directorTitle === 'ព្រះចៅអធិការ' || metadata.directorTitle === 'ព្រះនាយក')
              ? 'នាយកសាលា'
              : metadata.directorTitle}
          </div>
        </div>

        {/* Right Signature: Reporter (Automatically calculated last working day, excluding Sat/Sun) */}
        <div style={{ textAlign: 'center', flex: 1, maxWidth: '48%' }}>
          <div style={{ whiteSpace: 'nowrap' }}>{reportDates.lunarDateText}</div>
          <div style={{ whiteSpace: 'nowrap' }}>{reportDates.solarDateTextLeave}</div>
          <div className="font-moul" style={{ fontSize: 13, marginTop: 8, paddingBottom: 45, whiteSpace: 'nowrap' }}>
            {metadata.reporterTitle || 'អ្នកធ្វើរបាយការណ៍'}
          </div>
        </div>
      </div>
    </div>
  );
}
