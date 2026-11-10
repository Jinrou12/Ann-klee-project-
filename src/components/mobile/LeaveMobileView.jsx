import React, { useState } from 'react';
import { 
  Plus, Trash2, Edit3, Check, X, FileSpreadsheet, FileText, Eye, 
  Calendar, Clock, AlertCircle, UserCheck, Search, Download, Loader2, Printer 
} from 'lucide-react';
import { toKhmerDigits, parseDurationShorthand, formatKhmerCurrency, normalizeRecordDateStr, sortRecordsByDateAsc } from '../../utils/khmerNumerals';
import { exportLeaveToExcel } from '../../utils/excelExporter';
import { exportLeaveToWord } from '../../utils/wordExporter';
import { exportElementToPdf } from '../../utils/pdfExporter';
import A4SheetScaler from '../A4SheetScaler';
import OfficialLeaveDocument from '../OfficialLeaveDocument';

export default function LeaveMobileView({
  records = [],
  monthKey,
  metadata = {},
  useKhmerNumerals = true,
  studentMaster = [],
  onUpdateRecords,
  onPrint,
  onSwitchToDesktop,
  mobilePreviewA4 = false
}) {
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterGrade, setFilterGrade] = useState('all');
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // Month derivation
  const [yearStr, monthStr] = (monthKey || '2026-07').split('-');
  const monthNames = [
    'មករា', 'កុម្ភៈ', 'មីនា', 'មេសា', 'ឧសភា', 'មិថុនា',
    'កក្កដា', 'សីហា', 'កញ្ញា', 'តុលា', 'វិច្ឆិកា', 'ធ្នូ'
  ];
  const monthName = monthNames[parseInt(monthStr, 10) - 1] || 'កក្កដា';
  const yearDisplay = useKhmerNumerals ? toKhmerDigits(yearStr) : yearStr;

  // New leave form state
  const [newLeave, setNewLeave] = useState({
    name: '',
    grade: '៣',
    reason: 'អាពាធ គ្រុនក្ដៅ',
    duration: '១ថ្ងៃ',
    date: `01/${monthStr}/${yearStr}`,
    note: ''
  });

  const handleStartEdit = (record) => {
    setEditingId(record.id);
    setEditForm({ ...record });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleSaveEdit = () => {
    if (!editForm.name?.trim()) {
      alert('សូមបញ្ចូលព្រះនាម ឬឈ្មោះសមណសិស្ស');
      return;
    }
    const formattedDuration = parseDurationShorthand(editForm.duration) || '១ថ្ងៃ';
    const normalizedDate = normalizeRecordDateStr(editForm.date || '', useKhmerNumerals);
    const updated = sortRecordsByDateAsc(
      records.map(r => r.id === editingId ? { ...editForm, duration: formattedDuration, date: normalizedDate } : r)
    );
    onUpdateRecords(updated);
    setEditingId(null);
    setEditForm({});
  };

  const handleDelete = (id, name) => {
    if (window.confirm(`តើបងពិតជាចង់លុបទិន្នន័យច្បាប់របស់ «${name || 'សមណសិស្ស'}» មែនទេ?`)) {
      onUpdateRecords(records.filter(r => r.id !== id));
    }
  };

  const handleCreateNew = (e) => {
    e.preventDefault();
    if (!newLeave.name?.trim()) {
      alert('សូមបញ្ចូលព្រះនាម ឬឈ្មោះសមណសិស្ស');
      return;
    }
    const newRecord = {
      id: `leave-${Date.now()}`,
      ...newLeave,
      date: normalizeRecordDateStr(newLeave.date || '', useKhmerNumerals),
      duration: parseDurationShorthand(newLeave.duration) || '១ថ្ងៃ'
    };
    onUpdateRecords(sortRecordsByDateAsc([...records, newRecord]));
    setShowAddModal(false);
    setNewLeave({
      name: '',
      grade: '៣',
      reason: 'អាពាធ គ្រុនក្ដៅ',
      duration: '១ថ្ងៃ',
      date: `01/${monthStr}/${yearStr}`,
      note: ''
    });
  };

  const handleExportExcel = () => {
    exportLeaveToExcel(records, `${monthName} ${yearDisplay}`, metadata, { monthKey, useKhmerNumerals });
  };

  const handleExportWord = () => {
    exportLeaveToWord(records, `${monthName} ${yearDisplay}`, metadata, { monthKey, useKhmerNumerals });
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

  // Filter and sort records chronologically by date (earliest -> latest)
  const filteredRecords = sortRecordsByDateAsc(records).filter(r => {
    const matchesSearch = !searchQuery.trim() || 
      (r.name && r.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (r.reason && r.reason.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesGrade = filterGrade === 'all' || String(r.grade) === String(filterGrade);
    return matchesSearch && matchesGrade;
  });

  // Grade color badges
  const getGradeBadge = (grade) => {
    const colors = {
      '១': { bg: '#fef3c7', text: '#92400e', border: '#fcd34d' },
      '២': { bg: '#e0e7ff', text: '#3730a3', border: '#c7d2fe' },
      '៣': { bg: '#dcfce7', text: '#166534', border: '#86efac' },
      'មត្តេយ្យ': { bg: '#fce7f3', text: '#9d174d', border: '#fbcfe8' }
    };
    return colors[grade] || { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' };
  };

  return (
    <div className="mobile-leave-container" style={{ paddingBottom: 80 }}>
      {/* 1. Mobile Top Quick Actions (+ បន្ថែមច្បាប់ & Download PDF side-by-side) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 8,
        marginBottom: 12
      }}>
        <button
          onClick={() => setShowAddModal(true)}
          style={{
            background: '#b45309',
            color: '#ffffff',
            border: 'none',
            borderRadius: 10,
            padding: '10px 12px',
            fontSize: 13,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            cursor: 'pointer',
            width: '100%',
            boxShadow: '0 2px 4px rgba(180, 83, 9, 0.2)'
          }}
        >
          <Plus size={16} />
          <span>បន្ថែមច្បាប់</span>
        </button>

        <button
          type="button"
          onClick={handleDownloadPdf}
          disabled={isExportingPdf}
          style={{
            width: '100%',
            background: '#b91c1c',
            color: '#ffffff',
            border: 'none',
            borderRadius: 10,
            padding: '10px 12px',
            fontSize: 13,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            cursor: isExportingPdf ? 'wait' : 'pointer',
            opacity: isExportingPdf ? 0.75 : 1,
            boxShadow: '0 2px 4px rgba(185, 28, 28, 0.2)'
          }}
        >
          {isExportingPdf ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
          <span>{isExportingPdf ? 'កំពុងទាញយក...' : 'Download PDF'}</span>
        </button>
      </div>

      {/* 2. Search & Filter Bar */}
      <div style={{
        display: 'flex',
        gap: 8,
        marginBottom: 10
      }}>
        <div style={{
          flex: 1,
          position: 'relative',
          display: 'flex',
          alignItems: 'center'
        }}>
          <Search size={15} color="#94a3b8" style={{ position: 'absolute', left: 10 }} />
          <input
            type="text"
            placeholder="ស្វែងរកឈ្មោះ ឬមូលហេតុ..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 10px 8px 32px',
              border: '1px solid #cbd5e1',
              borderRadius: 8,
              fontSize: 13,
              outline: 'none',
              background: '#ffffff'
            }}
          />
        </div>
        <select
          value={filterGrade}
          onChange={(e) => setFilterGrade(e.target.value)}
          style={{
            padding: '8px 10px',
            border: '1px solid #cbd5e1',
            borderRadius: 8,
            fontSize: 13,
            background: '#ffffff',
            color: '#334155',
            fontWeight: 500
          }}
        >
          <option value="all">គ្រប់ថ្នាក់</option>
          <option value="១">ថ្នាក់ទី ១</option>
          <option value="២">ថ្នាក់ទី ២</option>
          <option value="៣">ថ្នាក់ទី ៣</option>
          <option value="មត្តេយ្យ">មត្តេយ្យ</option>
        </select>
      </div>

      {/* 2.5. Summary Count & Total Leave Fee Strip below Search Bar */}
      <div style={{
        background: 'linear-gradient(135deg, #ffffff 0%, #fffbeb 100%)',
        border: '1.5px solid #fde68a',
        borderRadius: 10,
        padding: '8px 12px',
        marginBottom: 12,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 1px 4px rgba(180, 83, 9, 0.06)'
      }}>
        <span style={{
          background: '#b45309',
          color: '#ffffff',
          padding: '4px 12px',
          borderRadius: 16,
          fontSize: 12.5,
          fontWeight: 700,
          whiteSpace: 'nowrap',
          boxShadow: '0 1px 3px rgba(180, 83, 9, 0.2)'
        }}>
          សរុប {useKhmerNumerals ? toKhmerDigits(filteredRecords.length) : filteredRecords.length} អង្គ
        </span>
        <span style={{ fontSize: 14.5, fontWeight: 800, color: '#15803d', whiteSpace: 'nowrap' }}>
          {formatKhmerCurrency(filteredRecords.length * 2000, useKhmerNumerals)}
        </span>
      </div>

      {/* 3. Cards List or Official A4 Preview */}
      {mobilePreviewA4 ? (
        <div style={{ background: '#ffffff', padding: 8, borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <A4SheetScaler>
            <OfficialLeaveDocument
              id="preview-mobile-leave-document"
              records={filteredRecords}
              metadata={metadata}
              monthName={monthName}
              yearDisplay={yearDisplay}
              useKhmerNumerals={useKhmerNumerals}
              monthKey={monthKey}
              studentMaster={studentMaster}
            />
          </A4SheetScaler>
        </div>
      ) : filteredRecords.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '40px 20px',
          background: '#ffffff',
          borderRadius: 12,
          border: '1px dashed #cbd5e1',
          color: '#64748b'
        }}>
          <AlertCircle size={32} color="#94a3b8" style={{ margin: '0 auto 8px' }} />
          <p style={{ margin: 0, fontWeight: 600 }}>មិនមានទិន្នន័យសុំច្បាប់ឡើយ</p>
          <p style={{ fontSize: 12, margin: '4px 0 12px' }}>
            {searchQuery ? 'មិនមានទិន្នន័យត្រូវនឹងការស្វែងរក' : 'ខែនេះមិនទាន់មានសមណសិស្សសុំច្បាប់នៅឡើយ'}
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            style={{
              background: '#b45309',
              color: '#ffffff',
              border: 'none',
              borderRadius: 6,
              padding: '6px 14px',
              fontSize: 13,
              cursor: 'pointer'
            }}
          >
            + បន្ថែមឥឡូវនេះ
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filteredRecords.map((record, index) => {
            const isEditing = editingId === record.id;
            const badge = getGradeBadge(record.grade);
            const numDisplay = useKhmerNumerals ? toKhmerDigits(index + 1) : index + 1;

            if (isEditing) {
              return (
                <div key={record.id} style={{
                  background: '#fffbeb',
                  border: '2px solid #f59e0b',
                  borderRadius: 12,
                  padding: 14,
                  boxShadow: '0 4px 12px rgba(245, 158, 11, 0.15)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#b45309' }}>
                      កែសម្រួលជួរទី #{numDisplay}
                    </span>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        onClick={handleSaveEdit}
                        style={{
                          background: '#15803d',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: 6,
                          padding: '4px 8px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          fontSize: 12,
                          cursor: 'pointer'
                        }}
                      >
                        <Check size={14} />
                        <span>រក្សាទុក</span>
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        style={{
                          background: '#64748b',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: 6,
                          padding: '4px 8px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          fontSize: 12,
                          cursor: 'pointer'
                        }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Form fields */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>គោត្តនាម-នាម</label>
                      <input
                        type="text"
                        value={editForm.name || ''}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '6px 8px',
                          border: '1px solid #cbd5e1',
                          borderRadius: 6,
                          fontSize: 13,
                          marginTop: 2
                        }}
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <div>
                        <label style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>ថ្នាក់ទី</label>
                        <select
                          value={editForm.grade || '៣'}
                          onChange={(e) => setEditForm({ ...editForm, grade: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '6px 8px',
                            border: '1px solid #cbd5e1',
                            borderRadius: 6,
                            fontSize: 13,
                            marginTop: 2
                          }}
                        >
                          <option value="១">ថ្នាក់ទី ១</option>
                          <option value="២">ថ្នាក់ទី ២</option>
                          <option value="៣">ថ្នាក់ទី ៣</option>
                          <option value="មត្តេយ្យ">មត្តេយ្យ</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>ចំនួនថ្ងៃឈប់ (ឧ. 1, 1.5, 1a, 1p)</label>
                        <input
                          type="text"
                          value={editForm.duration ?? ''}
                          onChange={(e) => setEditForm({ ...editForm, duration: e.target.value })}
                          onBlur={(e) => setEditForm({ ...editForm, duration: parseDurationShorthand(e.target.value) || '១ថ្ងៃ' })}
                          placeholder="ឧ. 1, 1.5, 1a, 1p"
                          style={{
                            width: '100%',
                            padding: '6px 8px',
                            border: '1px solid #cbd5e1',
                            borderRadius: 6,
                            fontSize: 13,
                            marginTop: 2
                          }}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 8 }}>
                      <div>
                        <label style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>មូលហេតុ</label>
                        <input
                          type="text"
                          value={editForm.reason || ''}
                          onChange={(e) => setEditForm({ ...editForm, reason: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '6px 8px',
                            border: '1px solid #cbd5e1',
                            borderRadius: 6,
                            fontSize: 13,
                            marginTop: 2
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>កាលបរិច្ឆេទ</label>
                        <input
                          type="text"
                          value={editForm.date || ''}
                          onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '6px 8px',
                            border: '1px solid #cbd5e1',
                            borderRadius: 6,
                            fontSize: 13,
                            marginTop: 2
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>ផ្សេងៗ (កំណត់សម្គាល់)</label>
                      <input
                        type="text"
                        value={editForm.note || ''}
                        onChange={(e) => setEditForm({ ...editForm, note: e.target.value })}
                        placeholder="ស្រេចចិត្ត"
                        style={{
                          width: '100%',
                          padding: '6px 8px',
                          border: '1px solid #cbd5e1',
                          borderRadius: 6,
                          fontSize: 13,
                          marginTop: 2
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={record.id}
                style={{
                  background: '#ffffff',
                  border: '1.5px solid #fcd34d',
                  borderRadius: 12,
                  padding: 12,
                  boxShadow: '0 2px 6px rgba(180, 83, 9, 0.06)',
                  position: 'relative'
                }}
              >
                {/* Top Row: # and Name + Grade */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: '#b45309',
                      background: '#fef3c7',
                      border: '1px solid #fde68a',
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {numDisplay}
                    </span>
                    <div>
                      <h3 style={{
                        margin: 0,
                        fontSize: 15,
                        fontWeight: 700,
                        color: '#0f172a'
                      }}>
                        {record.name || 'សមណសិស្ស'}
                      </h3>
                    </div>
                  </div>

                  <span style={{
                    background: badge.bg,
                    color: badge.text,
                    border: `1px solid ${badge.border}`,
                    padding: '2px 8px',
                    borderRadius: 12,
                    fontSize: 11,
                    fontWeight: 700
                  }}>
                    ថ្នាក់ទី {record.grade}
                  </span>
                </div>

                {/* Reason Banner */}
                <div style={{
                  background: '#fffbeb',
                  borderLeft: '3px solid #d97706',
                  padding: '6px 10px',
                  borderRadius: '0 6px 6px 0',
                  fontSize: 13,
                  color: '#334155',
                  marginBottom: 8
                }}>
                  <strong style={{ color: '#b45309', fontWeight: 600 }}>មូលហេតុ៖</strong> {record.reason || 'អាពាធ'}
                </div>

                {/* Date & Duration Row */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: 12,
                  color: '#64748b',
                  paddingTop: 6,
                  borderTop: '1px solid #fef3c7'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Calendar size={13} color="#94a3b8" />
                      <span>{normalizeRecordDateStr(record.date || '', useKhmerNumerals)}</span>
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={13} color="#94a3b8" />
                      <strong style={{ color: '#0f172a' }}>{record.duration}</strong>
                    </span>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button
                      onClick={() => handleStartEdit(record)}
                      style={{
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        color: '#b45309',
                        padding: '4px 8px',
                        borderRadius: 6,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 3,
                        fontSize: 12
                      }}
                      title="កែសម្រួល"
                    >
                      <Edit3 size={13} />
                      <span>កែ</span>
                    </button>
                    <button
                      onClick={() => handleDelete(record.id, record.name)}
                      style={{
                        background: '#fef2f2',
                        border: '1px solid #fee2e2',
                        color: '#dc2626',
                        padding: '4px 8px',
                        borderRadius: 6,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                      title="លុប"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {record.note && (
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4, fontStyle: 'italic' }}>
                    សម្គាល់៖ {record.note}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 4. Quick Add Leave Modal */}
      {showAddModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          zIndex: 999,
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          padding: 0
        }}>
          <div style={{
            background: '#ffffff',
            width: '100%',
            maxWidth: 500,
            borderRadius: '16px 16px 0 0',
            padding: '18px 18px 24px',
            boxShadow: '0 -4px 20px rgba(0,0,0,0.2)',
            maxHeight: '85vh',
            overflowY: 'auto',
            animation: 'slideUp 0.2s ease-out'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 className="font-moul" style={{ fontSize: 15, margin: 0, color: '#78350f' }}>
                បន្ថែមច្បាប់សមណសិស្សថ្មី
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                style={{
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: '50%',
                  width: 30,
                  height: 30,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateNew} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>
                  គោត្តនាម-នាម សមណសិស្ស <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="ឧ. ណា ទិចគាង"
                  value={newLeave.name}
                  onChange={(e) => setNewLeave({ ...newLeave, name: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    border: '1px solid #cbd5e1',
                    borderRadius: 8,
                    fontSize: 14,
                    marginTop: 4
                  }}
                  autoFocus
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>ថ្នាក់ទី</label>
                  <select
                    value={newLeave.grade}
                    onChange={(e) => setNewLeave({ ...newLeave, grade: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      border: '1px solid #cbd5e1',
                      borderRadius: 8,
                      fontSize: 14,
                      marginTop: 4,
                      background: '#ffffff'
                    }}
                  >
                    <option value="១">ថ្នាក់ទី ១</option>
                    <option value="២">ថ្នាក់ទី ២</option>
                    <option value="៣">ថ្នាក់ទី ៣</option>
                    <option value="មត្តេយ្យ">មត្តេយ្យ</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>ចំនួនថ្ងៃឈប់ (ឧ. 1, 1.5, 1a, 1p)</label>
                  <input
                    type="text"
                    placeholder="ឧ. 1, 1.5, 1a, 1p"
                    value={newLeave.duration ?? ''}
                    onChange={(e) => setNewLeave({ ...newLeave, duration: e.target.value })}
                    onBlur={(e) => setNewLeave({ ...newLeave, duration: parseDurationShorthand(e.target.value) || '១ថ្ងៃ' })}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      border: '1px solid #cbd5e1',
                      borderRadius: 8,
                      fontSize: 14,
                      marginTop: 4
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>មូលហេតុឈប់</label>
                  <input
                    type="text"
                    placeholder="ឧ. ក្ដៅខ្លួន ឈឺចុកពោះ"
                    value={newLeave.reason}
                    onChange={(e) => setNewLeave({ ...newLeave, reason: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      border: '1px solid #cbd5e1',
                      borderRadius: 8,
                      fontSize: 14,
                      marginTop: 4
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>កាលបរិច្ឆេទ</label>
                  <input
                    type="text"
                    placeholder="DD/MM/2026"
                    value={newLeave.date}
                    onChange={(e) => setNewLeave({ ...newLeave, date: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      border: '1px solid #cbd5e1',
                      borderRadius: 8,
                      fontSize: 14,
                      marginTop: 4
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>កំណត់សម្គាល់ (ផ្សេងៗ)</label>
                <input
                  type="text"
                  placeholder="ស្រេចចិត្ត"
                  value={newLeave.note}
                  onChange={(e) => setNewLeave({ ...newLeave, note: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    border: '1px solid #cbd5e1',
                    borderRadius: 8,
                    fontSize: 14,
                    marginTop: 4
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    background: '#b45309',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 8,
                    padding: '11px',
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  រក្សាទុកច្បាប់
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{
                    background: '#f1f5f9',
                    color: '#475569',
                    border: 'none',
                    borderRadius: 8,
                    padding: '11px 16px',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  បោះបង់
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Offscreen Official A4 Document for Mobile PDF Export & Native Print */}
      <div 
        className="offscreen-print-container"
        style={{ 
          position: 'fixed', 
          top: 0, 
          left: -9999, 
          width: 794, 
          minWidth: 794, 
          maxWidth: 794, 
          pointerEvents: 'none' 
        }} 
        aria-hidden="true"
      >
        <OfficialLeaveDocument
          id="printable-leave-document"
          records={records}
          metadata={metadata}
          monthName={monthName}
          yearDisplay={yearDisplay}
          useKhmerNumerals={useKhmerNumerals}
          monthKey={monthKey}
          studentMaster={studentMaster}
        />
      </div>
    </div>
  );
}
