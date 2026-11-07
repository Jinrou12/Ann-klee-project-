import React, { useMemo, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { toKhmerDigits, toEnglishDigits, formatKhmerCurrency } from '../utils/khmerNumerals';
import { getMonthEndReportDates } from '../utils/khmerCalendar';
import { recommendStudentsByPhoneticQuery } from '../utils/studentMaster';
import { ID_CARD_ITEMS, computeIdCardTotalPrice, selectOrCombineIdCardItem } from '../utils/idCardCatalog';
import KhmerRoyalDivider from './KhmerRoyalDivider';

/**
 * OfficialIdCardDocument: Authentic A4 Ministry replica for Student ID Card Purchases
 * Matches តារាងបង់ថ្លៃទិញកាត ID.xlsx & OfficialLeaveDocument.jsx
 */
export default function OfficialIdCardDocument({
  id = 'printable-idcard-document',
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
  handleRowPatch = null,
  handleDeleteRow = () => {},
  studentMaster = [],
  customPeriodTitle = '',
  customSummaryText = ''
}) {
  const [showSuggestForRow, setShowSuggestForRow] = useState(null);
  const [combineModeRow, setCombineModeRow] = useState(false);

  const reportDates = useMemo(() => getMonthEndReportDates(monthKey, {
    watName: metadata.wat,
    customLunarTemplate: metadata.lunarDateHeader,
    useKhmerNumerals
  }), [monthKey, metadata.wat, metadata.lunarDateHeader, useKhmerNumerals]);

  const totalAmount = useMemo(
    () => records.reduce((sum, r) => sum + (Number(r.price) || 0), 0),
    [records]
  );

  const applyRowUpdates = (rowId, updates) => {
    if (typeof handleRowPatch === 'function') {
      handleRowPatch(rowId, updates);
    } else {
      Object.entries(updates).forEach(([field, val]) => {
        handleCellChange(rowId, field, val);
      });
    }
  };

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
          <div className="font-moul" style={{ fontSize: 14, textAlign: 'center', whiteSpace: 'nowrap' }}>
            {metadata.ministry}
          </div>
          <div className="font-moul" style={{ fontSize: 14, textAlign: 'center', whiteSpace: 'nowrap' }}>
            {String(metadata.school || '').startsWith('សាលា') ? metadata.school : `សាលា${metadata.school || ''}`}
          </div>
          <div className="font-moul" style={{ fontSize: 14, textAlign: 'center', whiteSpace: 'nowrap' }}>
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
      <div style={{ textAlign: 'center', marginTop: 12, marginBottom: 18 }}>
        <div className="font-moul" style={{ fontSize: 17.5, marginBottom: 4, whiteSpace: 'nowrap' }}>
          របាយការណ៍ ស្ដីពី
        </div>
        <div className="font-moul" style={{ fontSize: 15.5, whiteSpace: 'nowrap' }}>
          {customPeriodTitle || `តារាងរាយនាមសមណសិស្ស បង់ថ្លៃទិញកាតពាក់ក (ID) ក្នុងខែ${monthName} ឆ្នាំ${yearDisplay}`}
        </div>
      </div>

      {/* Official Table */}
      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
        border: '1px solid #000000',
        fontSize: 13
      }}>
        <thead>
          <tr style={{ background: '#ffffff', textAlign: 'center', height: 34 }}>
            <th style={{ border: '1px solid #000', width: '6%', padding: '5px 4px', fontWeight: 700, whiteSpace: 'nowrap' }}>ល.រ</th>
            <th style={{ border: '1px solid #000', width: '25%', padding: '5px 8px', fontWeight: 700, whiteSpace: 'nowrap' }}>គោត្តនាម-និងនាម</th>
            <th style={{ border: '1px solid #000', width: '10%', padding: '5px 4px', fontWeight: 700, whiteSpace: 'nowrap' }}>ថ្នាក់</th>
            <th style={{ border: '1px solid #000', width: '21%', padding: '5px 8px', fontWeight: 700, whiteSpace: 'nowrap' }}>បរិយាយ</th>
            <th style={{ border: '1px solid #000', width: '9%', padding: '5px 4px', fontWeight: 700, whiteSpace: 'nowrap' }}>ចំនួន</th>
            <th style={{ border: '1px solid #000', width: '15%', padding: '5px 6px', fontWeight: 700, whiteSpace: 'nowrap' }}>តម្លៃ</th>
            <th style={{ border: '1px solid #000', width: '14%', padding: '5px 6px', fontWeight: 700, whiteSpace: 'nowrap' }}>កាលបរិច្ឆេទ</th>
            {isEditable && (
              <th className="no-print" style={{ border: '1px solid #cbd5e1', width: 40, background: '#f8fafc' }}></th>
            )}
          </tr>
        </thead>
        <tbody>
          {records.length === 0 ? (
            <tr>
              <td colSpan={isEditable ? 8 : 7} style={{ textAlign: 'center', padding: 20, color: '#64748b', border: '1px solid #000' }}>
                មិនទាន់មានទិន្នន័យសមណសិស្សទិញកាត ID សម្រាប់ខែនេះនៅឡើយទេ។
              </td>
            </tr>
          ) : (
            records.map((r, index) => {
              const isEditing = isEditable && editingRowId === r.id;
              const rowNum = useKhmerNumerals ? toKhmerDigits(index + 1) : (index + 1);
              const suggestions = isEditing && showSuggestForRow === r.id
                ? recommendStudentsByPhoneticQuery(r.name, studentMaster, 8)
                : [];

              return (
                <tr key={r.id} style={{ height: 30 }}>
                  {/* Column 1: ល.រ */}
                  <td style={{ border: '1px solid #000', textAlign: 'center', padding: '4px' }}>
                    {rowNum}
                  </td>

                  {/* Column 2: គោត្តនាម-និងនាម (with 80-student phonetic autocomplete) */}
                  <td style={{ border: '1px solid #000', padding: '4px 8px', whiteSpace: 'nowrap', position: 'relative' }}>
                    {isEditing ? (
                      <div style={{ position: 'relative' }}>
                        <input
                          type="text"
                          value={r.name || ''}
                          onFocus={() => setShowSuggestForRow(r.id)}
                          onBlur={() => setTimeout(() => setShowSuggestForRow(null), 180)}
                          onChange={e => {
                            const val = e.target.value;
                            setShowSuggestForRow(r.id);
                            const exact = studentMaster.find(s => s.name === val);
                            if (exact) {
                              applyRowUpdates(r.id, { name: exact.name, grade: exact.grade });
                            } else {
                              handleCellChange(r.id, 'name', val);
                            }
                          }}
                          placeholder="វាយឈ្មោះ (ឧ. ក)..."
                          style={{ width: '100%', border: '1px solid #b45309', padding: '2px 4px', fontSize: 13 }}
                          autoFocus
                        />
                        {showSuggestForRow === r.id && suggestions.length > 0 && (
                          <div
                            className="no-print"
                            style={{
                              position: 'absolute',
                              top: '100%',
                              left: 0,
                              zIndex: 60,
                              minWidth: 230,
                              maxHeight: 210,
                              overflowY: 'auto',
                              background: '#ffffff',
                              border: '1px solid #cbd5e1',
                              borderRadius: 8,
                              boxShadow: '0 8px 20px rgba(15, 23, 42, 0.16)',
                              marginTop: 2
                            }}
                          >
                            {suggestions.map(({ student, matchReason }) => (
                              <button
                                key={student.id}
                                type="button"
                                onMouseDown={e => {
                                  e.preventDefault();
                                  applyRowUpdates(r.id, {
                                    name: student.name,
                                    grade: student.grade
                                  });
                                  setShowSuggestForRow(null);
                                }}
                                style={{
                                  width: '100%',
                                  textAlign: 'left',
                                  padding: '6px 10px',
                                  background: 'transparent',
                                  border: 'none',
                                  borderBottom: '1px solid #f1f5f9',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  gap: 8,
                                  fontSize: 12.5,
                                  cursor: 'pointer'
                                }}
                              >
                                <span style={{ fontWeight: 700, color: '#0f172a' }}>{student.name}</span>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                  {matchReason === 'សំនឿងស្រដៀង' && (
                                    <span style={{ fontSize: 10, color: '#7c3aed', background: '#f3e8ff', padding: '1px 5px', borderRadius: 4 }}>
                                      សំនឿង
                                    </span>
                                  )}
                                  <span style={{ fontSize: 10.5, fontWeight: 700, color: '#b45309', background: '#fef3c7', padding: '1px 6px', borderRadius: 6 }}>
                                    ថ្នាក់ {student.grade}
                                  </span>
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div
                        onClick={() => isEditable && setEditingRowId(r.id)}
                        style={{ cursor: isEditable ? 'pointer' : 'default', minHeight: 20, whiteSpace: 'nowrap' }}
                        title={isEditable ? 'ចុចដើម្បីកែប្រែ' : ''}
                      >
                        {r.name || <span style={{ color: '#cbd5e1' }}>--</span>}
                      </div>
                    )}
                  </td>

                  {/* Column 3: ថ្នាក់ */}
                  <td style={{ border: '1px solid #000', textAlign: 'center', padding: '4px', whiteSpace: 'nowrap' }}>
                    {isEditing ? (
                      <select
                        value={r.grade || '១'}
                        onChange={e => handleCellChange(r.id, 'grade', e.target.value)}
                        style={{ width: '100%', textAlign: 'center', border: '1px solid #b45309', padding: '2px', fontSize: 12.5 }}
                      >
                        <option value="មត្តេយ្យ">មត្តេយ្យ</option>
                        <option value="១">១</option>
                        <option value="២">២</option>
                        <option value="៣">៣</option>
                      </select>
                    ) : (
                      <div onClick={() => isEditable && setEditingRowId(r.id)} style={{ cursor: isEditable ? 'pointer' : 'default', whiteSpace: 'nowrap' }}>
                        {useKhmerNumerals ? toKhmerDigits(r.grade) : r.grade}
                      </div>
                    )}
                  </td>

                  {/* Column 4: បរិយាយ (ថង, ខ្សែ, ID, មួយឈុត) */}
                  <td style={{ border: '1px solid #000', textAlign: 'center', padding: '4px 6px', whiteSpace: 'nowrap' }}>
                    {isEditing ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, justifyContent: 'center' }}>
                          {ID_CARD_ITEMS.map(opt => {
                            const isSelected = String(r.item || '').includes(opt.label) ||
                              (opt.label === 'មួយឈុត' && String(r.item || '').includes('១ឈុត'));
                            return (
                              <button
                                key={opt.id}
                                type="button"
                                onClick={() => {
                                  const nextItem = selectOrCombineIdCardItem(r.item, opt.label, combineModeRow);
                                  const nextPrice = computeIdCardTotalPrice(nextItem, r.qty || 1, r.price);
                                  applyRowUpdates(r.id, { item: nextItem, price: nextPrice });
                                }}
                                style={{
                                  fontSize: 11,
                                  fontWeight: 700,
                                  padding: '2px 6px',
                                  borderRadius: 5,
                                  border: `1px solid ${isSelected ? opt.badgeColor : '#cbd5e1'}`,
                                  background: isSelected ? opt.badgeBg : '#f8fafc',
                                  color: isSelected ? opt.badgeColor : '#334155',
                                  cursor: 'pointer'
                                }}
                              >
                                {opt.label}
                              </button>
                            );
                          })}
                          <button
                            type="button"
                            onClick={() => setCombineModeRow(prev => !prev)}
                            title="បើកដើម្បីជ្រើសរើសច្រើនមុខរួមគ្នា (ឧ. ថង + ខ្សែ)"
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              padding: '2px 5px',
                              borderRadius: 5,
                              border: `1px dashed ${combineModeRow ? '#0284c7' : '#94a3b8'}`,
                              background: combineModeRow ? '#e0f2fe' : '#ffffff',
                              color: combineModeRow ? '#0369a1' : '#64748b',
                              cursor: 'pointer'
                            }}
                          >
                            +រួមគ្នា
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        onClick={() => isEditable && setEditingRowId(r.id)}
                        style={{ cursor: isEditable ? 'pointer' : 'default', whiteSpace: 'nowrap' }}
                      >
                        {r.item || 'មួយឈុត'}
                      </div>
                    )}
                  </td>

                  {/* Column 5: ចំនួន */}
                  <td style={{ border: '1px solid #000', textAlign: 'center', padding: '4px', whiteSpace: 'nowrap' }}>
                    {isEditing ? (
                      <input
                        type="number"
                        min="1"
                        value={toEnglishDigits(String(r.qty || 1))}
                        onChange={e => {
                          const nextQty = Math.max(1, parseInt(e.target.value, 10) || 1);
                          const nextPrice = computeIdCardTotalPrice(r.item, nextQty, r.price);
                          applyRowUpdates(r.id, { qty: nextQty, price: nextPrice });
                        }}
                        style={{ width: 52, textAlign: 'center', border: '1px solid #b45309', padding: '2px 4px', fontSize: 12.5 }}
                      />
                    ) : (
                      <div onClick={() => isEditable && setEditingRowId(r.id)} style={{ cursor: isEditable ? 'pointer' : 'default', whiteSpace: 'nowrap' }}>
                        {useKhmerNumerals ? toKhmerDigits(r.qty || 1) : (r.qty || 1)}
                      </div>
                    )}
                  </td>

                  {/* Column 6: តម្លៃ */}
                  <td style={{ border: '1px solid #000', textAlign: 'right', padding: '4px 8px', fontWeight: 600, whiteSpace: 'nowrap' }}>
                    {isEditing ? (
                      <input
                        type="text"
                        value={r.price ?? ''}
                        onChange={e => {
                          const rawNum = Number(toEnglishDigits(e.target.value).replace(/[^\d]/g, '')) || 0;
                          handleCellChange(r.id, 'price', rawNum);
                        }}
                        style={{ width: '100%', textAlign: 'right', border: '1px solid #b45309', padding: '2px 4px', fontSize: 12.5 }}
                      />
                    ) : (
                      <div onClick={() => isEditable && setEditingRowId(r.id)} style={{ cursor: isEditable ? 'pointer' : 'default', whiteSpace: 'nowrap' }}>
                        {formatKhmerCurrency(r.price || 0, useKhmerNumerals)}
                      </div>
                    )}
                  </td>

                  {/* Column 7: កាលបរិច្ឆេទ */}
                  <td style={{ border: '1px solid #000', textAlign: 'center', padding: '4px 6px', whiteSpace: 'nowrap' }}>
                    {isEditing ? (
                      <input
                        type="text"
                        value={r.date || ''}
                        onChange={e => handleCellChange(r.id, 'date', e.target.value)}
                        placeholder="DD/MM/YYYY"
                        style={{ width: '100%', textAlign: 'center', border: '1px solid #b45309', padding: '2px 4px', fontSize: 12.5 }}
                      />
                    ) : (
                      <div onClick={() => isEditable && setEditingRowId(r.id)} style={{ cursor: isEditable ? 'pointer' : 'default', whiteSpace: 'nowrap' }}>
                        {useKhmerNumerals ? toKhmerDigits(r.date || '') : (r.date || '')}
                      </div>
                    )}
                  </td>

                  {/* Action Column (No-print) */}
                  {isEditable && (
                    <td className="no-print" style={{ border: '1px solid #cbd5e1', textAlign: 'center', padding: 2 }}>
                      {isEditing ? (
                        <button
                          onClick={() => setEditingRowId(null)}
                          style={{
                            background: '#15803d',
                            color: '#fff',
                            fontSize: 11,
                            padding: '2px 6px',
                            borderRadius: 4,
                            fontWeight: 600
                          }}
                        >
                          រួចរាល់
                        </button>
                      ) : (
                        <button
                          onClick={() => handleDeleteRow(r.id)}
                          title="លុបជួរនេះ"
                          style={{
                            background: 'transparent',
                            color: '#ef4444',
                            padding: 4,
                            borderRadius: 4
                          }}
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

          {/* Total Footer Row (សរុប) matching តារាងបង់ថ្លៃទិញកាត ID.xlsx */}
          <tr style={{ height: 32, fontWeight: 700, background: '#fafafa' }}>
            <td colSpan={5} style={{ border: '1px solid #000', textAlign: 'center', padding: '5px' }}>
              <span className="font-moul" style={{ fontSize: 13 }}>សរុប</span>
            </td>
            <td style={{ border: '1px solid #000', textAlign: 'right', padding: '5px 8px', fontSize: 13.5, whiteSpace: 'nowrap' }}>
              {formatKhmerCurrency(totalAmount, useKhmerNumerals)}
            </td>
            <td style={{ border: '1px solid #000' }}></td>
            {isEditable && <td className="no-print" style={{ border: '1px solid #cbd5e1' }}></td>}
          </tr>
        </tbody>
      </table>

      {/* Summary Statement Line below table */}
      <div style={{
        marginTop: 12,
        marginBottom: 14,
        fontSize: 13.5,
        paddingLeft: 18
      }}>
        {customSummaryText || (
          <>
            សរុបសមណសិស្សទិញកាតពាក់ក (ID) ចំនួន{' '}
            <strong>{useKhmerNumerals ? toKhmerDigits(records.length) : records.length} អង្គ</strong>{' '}
            សរុបទឹកប្រាក់ចំនួន{' '}
            <strong>{formatKhmerCurrency(totalAmount, useKhmerNumerals)}</strong>។
          </>
        )}
      </div>

      {/* Signatures Block */}
      <div className="signature-block" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginTop: 8,
        fontSize: 12,
        lineHeight: 1.55
      }}>
        {/* Left: Director Approval */}
        <div style={{ textAlign: 'center', flex: '0 0 43%', maxWidth: '43%' }}>
          <div className="font-moul" style={{ fontSize: 12.5, marginBottom: 4, whiteSpace: 'nowrap' }}>
            បានឃើញ និង……………..
          </div>
          <div style={{ whiteSpace: 'nowrap' }}>
            {reportDates.leftBlankLunar}
          </div>
          <div style={{ whiteSpace: 'nowrap' }}>
            {reportDates.leftBlankSolar}
          </div>
          <div className="font-moul" style={{ fontSize: 12.5, marginTop: 6, whiteSpace: 'nowrap' }}>
            {metadata.directorTitle || 'នាយកសាលា'}
          </div>
        </div>

        {/* Right: Reporter Date & Signature */}
        <div style={{ textAlign: 'center', flex: '0 0 55%', maxWidth: '55%' }}>
          <div style={{ whiteSpace: 'nowrap' }}>
            {reportDates.lunarHeader}
          </div>
          <div style={{ whiteSpace: 'nowrap' }}>
            {reportDates.solarHeader}
          </div>
          <div className="font-moul" style={{ fontSize: 12.5, marginTop: 6, whiteSpace: 'nowrap' }}>
            {metadata.reporterTitle || 'អ្នកធ្វើរបាយការណ៍'}
          </div>
        </div>
      </div>
    </div>
  );
}

