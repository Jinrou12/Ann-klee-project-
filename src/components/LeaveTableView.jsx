import React, { useState } from 'react';
import { Plus, Trash2, Printer, FileSpreadsheet, Edit3, Download, Loader2 } from 'lucide-react';
import { toKhmerDigits } from '../utils/khmerNumerals';
import { exportLeaveToExcel } from '../utils/excelExporter';
import { exportElementToPdf } from '../utils/pdfExporter';
import KhmerRoyalDivider from './KhmerRoyalDivider';

export default function LeaveTableView({
  records,
  monthKey,
  metadata,
  useKhmerNumerals,
  studentMaster,
  onUpdateRecords,
  onPrint
}) {
  const [editingRowId, setEditingRowId] = useState(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // Month label derivation
  const [yearStr, monthStr] = monthKey.split('-');
  const monthNames = [
    'មករា', 'កុម្ភៈ', 'មីនា', 'មេសា', 'ឧសភា', 'មិថុនា',
    'កក្កដា', 'សីហា', 'កញ្ញា', 'តុលា', 'វិច្ឆិកា', 'ធ្នូ'
  ];
  const monthName = monthNames[parseInt(monthStr, 10) - 1] || 'កក្កដា';
  const yearDisplay = useKhmerNumerals ? toKhmerDigits(yearStr) : yearStr;

  const handleCellChange = (id, field, value) => {
    const updated = records.map(r => r.id === id ? { ...r, [field]: value } : r);
    onUpdateRecords(updated);
  };

  const handleAddRow = () => {
    const newRow = {
      id: `leave-${Date.now()}`,
      name: '',
      grade: '៣',
      reason: 'អាពាធ',
      duration: '១ថ្ងៃ',
      date: `01/${monthStr}/${yearStr}`,
      note: ''
    };
    onUpdateRecords([...records, newRow]);
    setEditingRowId(newRow.id);
  };

  const handleDeleteRow = (id) => {
    onUpdateRecords(records.filter(r => r.id !== id));
  };

  const handleExportExcel = () => {
    exportLeaveToExcel(records, `${monthName} ${yearDisplay}`, metadata);
  };

  const handleDownloadPdf = async () => {
    try {
      setIsExportingPdf(true);
      await exportElementToPdf(
        '#printable-leave-document',
        `របាយការណ៍សុំច្បាប់_${monthName}_${yearDisplay}`
      );
    } catch (err) {
      alert('មិនអាចទាញយក PDF បានទេ៖ ' + (err.message || 'Error'));
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      {/* Action Toolbar (hidden on print) */}
      <div className="no-print" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 10,
        marginBottom: 16,
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: 10,
        padding: '10px 16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={handleAddRow}
            style={{
              background: '#b45309',
              color: '#ffffff',
              padding: '7px 14px',
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <Plus size={16} />
            <span>បន្ថែមជួរថ្មី</span>
          </button>
          <span style={{ fontSize: 13, color: '#64748b' }}>
            សរុបសមណសិស្សសុំច្បាប់៖ <strong>{useKhmerNumerals ? toKhmerDigits(records.length) : records.length} អង្គ</strong>
          </span>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            onClick={handleExportExcel}
            style={{
              background: '#15803d',
              color: '#ffffff',
              padding: '7px 14px',
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              border: 'none',
              cursor: 'pointer'
            }}
          >
            <FileSpreadsheet size={16} />
            <span>Export Excel</span>
          </button>

          <button
            onClick={handleDownloadPdf}
            disabled={isExportingPdf}
            style={{
              background: '#b91c1c',
              color: '#ffffff',
              padding: '7px 14px',
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              border: 'none',
              cursor: isExportingPdf ? 'not-allowed' : 'pointer',
              opacity: isExportingPdf ? 0.7 : 1
            }}
            title="ទាញយកជាឯកសារ PDF ផ្ទាល់ចូលកុំព្យូទ័រ"
          >
            {isExportingPdf ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            <span>{isExportingPdf ? 'កំពុងទាញយក...' : 'Download PDF'}</span>
          </button>

          <button
            onClick={onPrint}
            style={{
              background: '#0f172a',
              color: '#ffffff',
              padding: '7px 14px',
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              border: 'none',
              cursor: 'pointer'
            }}
          >
            <Printer size={16} />
            <span>បោះពុម្ពជា PDF</span>
          </button>
        </div>
      </div>

      {/* Authentic A4 Paper Sheet (100% Exact PDF 2 replica) */}
      <div className="paper-sheet-wrapper">
        <div id="printable-leave-document" className="printable-document">
          {/* Header Block */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 16
        }}>
          {/* Left: Ministry & School (No logo in PDF 2) */}
          <div style={{ textAlign: 'center', lineHeight: 1.45 }}>
            <div className="font-moul" style={{ fontSize: 13, fontWeight: 700 }}>
              {metadata.ministry}
            </div>
            <div className="font-moul" style={{ fontSize: 13, fontWeight: 700 }}>
              {metadata.school}
            </div>
            <div className="font-moul" style={{ fontSize: 13, fontWeight: 700 }}>
              {metadata.location}
            </div>
          </div>

          {/* Right: National Kingdom & Motto */}
          <div style={{ textAlign: 'center', lineHeight: 1.45 }}>
            <div className="font-moul" style={{ fontSize: 14, fontWeight: 700 }}>
              ព្រះរាជាណាចក្រកម្ពុជា
            </div>
            <div className="font-moul" style={{ fontSize: 14, fontWeight: 700 }}>
              ជាតិ សាសនា ព្រះមហាក្សត្រ
            </div>
            <KhmerRoyalDivider />
          </div>
        </div>

        {/* Report Title */}
        <div style={{ textAlign: 'center', marginTop: 12, marginBottom: 20 }}>
          <div className="font-moul" style={{ fontSize: 16, marginBottom: 4 }}>
            របាយការណ៍ ស្ដីពី
          </div>
          <div className="font-moul" style={{ fontSize: 15 }}>
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
              <th className="no-print" style={{ border: '1px solid #cbd5e1', width: 40, background: '#f8fafc' }}></th>
            </tr>
          </thead>
          <tbody>
            {records.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: 20, color: '#64748b', border: '1px solid #000' }}>
                  មិនទាន់មានទិន្នន័យច្បាប់សម្រាប់ខែនេះនៅឡើយទេ។ សូមចុច «បន្ថែមជួរថ្មី» ឬ «ស្កេនរូបភាព»។
                </td>
              </tr>
            ) : (
              records.map((r, index) => {
                const isEditing = editingRowId === r.id;
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
                          onClick={() => setEditingRowId(r.id)}
                          style={{ cursor: 'pointer', minHeight: 20, whiteSpace: 'nowrap' }}
                          title="ចុចដើម្បីកែប្រែ"
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
                        <div onClick={() => setEditingRowId(r.id)} style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}>
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
                          onClick={() => setEditingRowId(r.id)}
                          style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}
                          title="ចុចដើម្បីកែប្រែ"
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
                          value={r.duration}
                          onChange={e => handleCellChange(r.id, 'duration', e.target.value)}
                          style={{ width: '100%', textAlign: 'center', border: '1px solid #b45309', padding: '2px 4px', fontSize: 13 }}
                        />
                      ) : (
                        <div onClick={() => setEditingRowId(r.id)} style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}>
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
                          onClick={() => setEditingRowId(r.id)}
                          style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}
                          title="ចុចដើម្បីកែប្រែ"
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
                        <div onClick={() => setEditingRowId(r.id)} style={{ cursor: 'pointer' }}>
                          {r.note}
                        </div>
                      )}
                    </td>

                    {/* Action Column (No-print) */}
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
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Datalist for student name autocomplete */}
        <datalist id="student-list-suggestions">
          {studentMaster.map(s => (
            <option key={s.id} value={s.name}>
              {s.name} (ថ្នាក់ទី {s.grade})
            </option>
          ))}
        </datalist>

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
            <div className="font-moul" style={{ fontSize: 13, marginBottom: 4 }}>
              បានឃើញ និង..................
            </div>
            <div>ថ្ងៃ.......................ខែ..................ឆ្នាំមមីអដ្ឋស័ក ព.ស ២៥៧០</div>
            <div>ត្រូវនឹងថ្ងៃទី....... ខែ............ ឆ្នាំ២០២៦</div>
            <div className="font-moul" style={{ fontSize: 13, marginTop: 8, paddingBottom: 45 }}>
              {(!metadata.directorTitle || metadata.directorTitle === 'ព្រះចៅអធិការ' || metadata.directorTitle === 'ព្រះនាយក')
                ? 'នាយកសាលា'
                : metadata.directorTitle}
            </div>
          </div>

          {/* Right Signature: Reporter */}
          <div style={{ textAlign: 'center', flex: 1, maxWidth: '48%' }}>
            <div>ថ្ងៃសុក្រ២រោច ខែទុតិយាសាឍ ឆ្នាំមមី អដ្ឋស័ក ព.ស ២៥៧០</div>
            <div>ត្រូវនឹងថ្ងៃទី៣១ ខែកក្កដា ឆ្នាំ២០២៦</div>
            <div className="font-moul" style={{ fontSize: 13, marginTop: 8, paddingBottom: 45 }}>
              {metadata.reporterTitle || 'អ្នកធ្វើរបាយការណ៍'}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  );
}
