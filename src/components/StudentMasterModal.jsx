import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import {
  X,
  Upload,
  Download,
  Search,
  UserPlus,
  Trash2,
  Edit3,
  Check,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet
} from 'lucide-react';
import { parseStudentFile, normalizeStudentGrade, DEFAULT_STUDENT_MASTER } from '../utils/studentMaster';
import { toKhmerDigits } from '../utils/khmerNumerals';
import { triggerBlobDownload } from '../utils/openXmlZip';
import MobileCustomSelect from './mobile/MobileCustomSelect';
import TelegramSendMenu from './TelegramSendMenu';

const GRADE_ORDER = ['មត្តេយ្យ', '១', '២', '៣'];

function getGradeRank(grade) {
  const norm = normalizeStudentGrade(grade);
  const idx = GRADE_ORDER.indexOf(norm);
  return idx >= 0 ? idx : 99;
}

function sortStudentMasterList(list = []) {
  return [...list].sort((a, b) => {
    const rankDiff = getGradeRank(a?.grade) - getGradeRank(b?.grade);
    if (rankDiff !== 0) return rankDiff;
    return String(a?.name || '').localeCompare(String(b?.name || ''), 'km');
  });
}

function getGradeBadgeStyle(grade) {
  const norm = normalizeStudentGrade(grade);
  if (norm === 'មត្តេយ្យ') {
    return { bg: '#fce7f3', text: '#9d174d', border: '#fbcfe8', label: 'ថ្នាក់មត្តេយ្យ' };
  }
  if (norm === '១') {
    return { bg: '#fef3c7', text: '#92400e', border: '#fcd34d', label: `ថ្នាក់ទី ${toKhmerDigits('1')}` };
  }
  if (norm === '២') {
    return { bg: '#e0e7ff', text: '#3730a3', border: '#c7d2fe', label: `ថ្នាក់ទី ${toKhmerDigits('2')}` };
  }
  if (norm === '៣') {
    return { bg: '#dcfce7', text: '#166534', border: '#86efac', label: `ថ្នាក់ទី ${toKhmerDigits('3')}` };
  }
  return {
    bg: '#f1f5f9',
    text: '#475569',
    border: '#cbd5e1',
    label: `ថ្នាក់ទី ${toKhmerDigits(grade || '?')}`
  };
}

export default function StudentMasterModal({
  isOpen,
  onClose,
  students = [],
  onUpdateStudents,
  canEdit = true,
  canUploadExcel = true,
  canReset = false
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGradeFilter, setSelectedGradeFilter] = useState('all');
  const [newName, setNewName] = useState('');
  const [newGrade, setNewGrade] = useState('៣');
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editGrade, setEditGrade] = useState('៣');
  const [uploadStatus, setUploadStatus] = useState(null);

  // Always sort students cleanly by Grade (មត្តេយ្យ -> ១ -> ២ -> ៣) then Khmer alphabetical
  const sortedStudents = useMemo(() => sortStudentMasterList(students), [students]);

  // Count students per grade for filter pills
  const gradeCounts = useMemo(() => {
    const counts = { all: sortedStudents.length, 'មត្តេយ្យ': 0, '១': 0, '២': 0, '៣': 0 };
    sortedStudents.forEach(s => {
      const norm = normalizeStudentGrade(s.grade);
      if (counts[norm] !== undefined) {
        counts[norm] += 1;
      }
    });
    return counts;
  }, [sortedStudents]);

  const filteredStudents = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return sortedStudents.filter(s => {
      const normGrade = normalizeStudentGrade(s.grade);
      if (selectedGradeFilter !== 'all' && normGrade !== selectedGradeFilter) {
        return false;
      }
      if (!q) return true;
      return (
        String(s.name || '').toLowerCase().includes(q) ||
        String(s.grade || '').toLowerCase().includes(q) ||
        normGrade.includes(q)
      );
    });
  }, [sortedStudents, selectedGradeFilter, searchTerm]);

  if (!isOpen) return null;

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadStatus({ type: 'loading', msg: 'កំពុងអានឯកសារ Excel/CSV...' });
      const parsed = await parseStudentFile(file);
      if (parsed.length === 0) {
        setUploadStatus({ type: 'error', msg: 'មិនឃើញទិន្នន័យឈ្មោះសិស្សក្នុងឯកសារនេះទេ សូមពិនិត្យមើល Header ឡើងវិញ។' });
      } else {
        const combined = [...sortedStudents];
        let addedCount = 0;
        parsed.forEach(p => {
          const compactNew = String(p.name || '').replace(/[\s\u200B]/g, '');
          if (compactNew && !combined.some(existing => String(existing.name || '').replace(/[\s\u200B]/g, '') === compactNew)) {
            combined.push({
              ...p,
              grade: normalizeStudentGrade(p.grade) || '៣'
            });
            addedCount++;
          }
        });
        const finalSorted = sortStudentMasterList(combined);
        onUpdateStudents(finalSorted);
        setUploadStatus({
          type: 'success',
          msg: `បានបញ្ចូលដោយជោគជ័យចំនួន ${toKhmerDigits(addedCount)} អង្គថ្មី (សរុប ${toKhmerDigits(finalSorted.length)} អង្គ)!`
        });
      }
    } catch (err) {
      console.error(err);
      setUploadStatus({ type: 'error', msg: 'មានបញ្ហាក្នុងការអាន File: ' + err.message });
    } finally {
      e.target.value = '';
    }
  };

  const handleExportExcel = () => {
    try {
      const rows = sortedStudents.map((s, idx) => ({
        'ល.រ': idx + 1,
        'គោត្តនាម-និងនាម': s.name || '',
        'ថ្នាក់ទី': normalizeStudentGrade(s.grade) === 'មត្តេយ្យ' ? 'មត្តេយ្យ' : `ថ្នាក់ទី ${normalizeStudentGrade(s.grade)}`,
        'ភេទ/ឋានៈ': s.monkStatus || s.gender || 'សមណសិស្ស'
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      ws['!cols'] = [{ wch: 8 }, { wch: 28 }, { wch: 16 }, { wch: 16 }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'បញ្ជីសមណសិស្សមេ');
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      triggerBlobDownload(
        new Uint8Array(wbout),
        `បញ្ជីឈ្មោះសមណសិស្សមេ_${sortedStudents.length}_អង្គ.xlsx`,
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
    } catch (err) {
      console.error('Export student master error:', err);
      setUploadStatus({ type: 'error', msg: 'មិនអាចទាញយកឯកសារ Excel បានទេ៖ ' + err.message });
    }
  };

  const handleAddStudent = (e) => {
    e.preventDefault();
    const cleanName = newName.trim().replace(/\s+/g, ' ');
    if (!cleanName) return;

    const compactTarget = cleanName.replace(/[\s\u200B]/g, '');
    const duplicate = sortedStudents.find(
      s => String(s.name || '').replace(/[\s\u200B]/g, '') === compactTarget
    );
    if (duplicate) {
      const dupGradeLabel = getGradeBadgeStyle(duplicate.grade).label;
      setUploadStatus({
        type: 'error',
        msg: `ឈ្មោះ «${duplicate.name}» មានក្នុងបញ្ជីរួចហើយ (${dupGradeLabel})!`
      });
      return;
    }

    const normGrade = normalizeStudentGrade(newGrade) || '៣';
    const newStudent = {
      id: `std-${Date.now()}`,
      name: cleanName,
      grade: normGrade,
      gender: 'សមណសិស្ស',
      monkStatus: 'សាមណេរ'
    };

    const nextSorted = sortStudentMasterList([...sortedStudents, newStudent]);
    onUpdateStudents(nextSorted);
    setNewName('');
    setUploadStatus({
      type: 'success',
      msg: `បានបញ្ចូល «${newStudent.name}» (${getGradeBadgeStyle(normGrade).label}) រួចរាល់!`
    });
  };

  const handleStartEdit = (student) => {
    setEditingId(student.id);
    setEditName(student.name || '');
    setEditGrade(normalizeStudentGrade(student.grade) || '៣');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditName('');
  };

  const handleSaveEdit = (id) => {
    const cleanName = editName.trim().replace(/\s+/g, ' ');
    if (!cleanName) {
      setUploadStatus({ type: 'error', msg: 'សូមបញ្ចូលឈ្មោះសមណសិស្សឱ្យបានត្រឹមត្រូវ។' });
      return;
    }
    const compactTarget = cleanName.replace(/[\s\u200B]/g, '');
    const duplicate = sortedStudents.find(
      s => s.id !== id && String(s.name || '').replace(/[\s\u200B]/g, '') === compactTarget
    );
    if (duplicate) {
      setUploadStatus({
        type: 'error',
        msg: `ឈ្មោះ «${duplicate.name}» ជាន់គ្នាជាមួយសិស្សដែលមានស្រាប់ក្នុងបញ្ជី!`
      });
      return;
    }

    const normGrade = normalizeStudentGrade(editGrade) || '៣';
    const updatedList = sortStudentMasterList(
      sortedStudents.map(s => (s.id === id ? { ...s, name: cleanName, grade: normGrade } : s))
    );
    onUpdateStudents(updatedList);
    setEditingId(null);
    setEditName('');
    setUploadStatus({
      type: 'success',
      msg: `បានកែសម្រួល «${cleanName}» (${getGradeBadgeStyle(normGrade).label}) រួចរាល់!`
    });
  };

  const handleDeleteStudent = (student) => {
    const gradeLabel = getGradeBadgeStyle(student.grade).label;
    if (window.confirm(`តើបងពិតជាចង់លុបឈ្មោះសមណសិស្ស «${student.name}» (${gradeLabel}) ចេញពីបញ្ជីមេមែនទេ?`)) {
      const remaining = sortStudentMasterList(sortedStudents.filter(s => s.id !== student.id));
      onUpdateStudents(remaining);
      setUploadStatus({
        type: 'success',
        msg: `បានលុបឈ្មោះ «${student.name}» ចេញពីបញ្ជីរួចរាល់។`
      });
    }
  };

  const handleResetDefault = () => {
    if (window.confirm('តើបងពិតជាចង់កំណត់បញ្ជីសិស្សទៅគំរូដើមរបស់សាលាវិញមែនទេ?')) {
      onUpdateStudents(sortStudentMasterList(DEFAULT_STUDENT_MASTER));
      setUploadStatus({ type: 'success', msg: 'បានកំណត់ទៅបញ្ជីដើមវិញរួចរាល់!' });
    }
  };

  const filterButtons = [
    { key: 'all', label: 'ទាំងអស់', count: gradeCounts.all },
    { key: 'មត្តេយ្យ', label: 'មត្តេយ្យ', count: gradeCounts['មត្តេយ្យ'] },
    { key: '១', label: `ថ្នាក់ទី ${toKhmerDigits('1')}`, count: gradeCounts['១'] },
    { key: '២', label: `ថ្នាក់ទី ${toKhmerDigits('2')}`, count: gradeCounts['២'] },
    { key: '៣', label: `ថ្នាក់ទី ${toKhmerDigits('3')}`, count: gradeCounts['៣'] }
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 680 }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 18px',
          borderBottom: '1px solid #e2e8f0',
          background: '#f8fafc'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              background: '#fef3c7',
              color: '#b45309',
              padding: 8,
              borderRadius: 8
            }}>
              <FileSpreadsheet size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>
                បញ្ជីឈ្មោះសមណសិស្សមេ (Student Master List)
              </h2>
              <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>
                ប្រើសម្រាប់ Auto-matching ផ្គូផ្គងឈ្មោះសិស្សពេលអានក្រដាសច្បាប់
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', padding: 6, borderRadius: 6, color: '#64748b' }}>
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '14px 18px', overflowY: 'auto', maxHeight: 'calc(90vh - 130px)' }}>
          {/* File Upload & Export Excel Banner */}
          {(canUploadExcel || (canEdit && canUploadExcel)) && (
            <div style={{
              background: '#f1f5f9',
              border: '1.5px dashed #cbd5e1',
              borderRadius: 10,
              padding: '11px 14px',
              marginBottom: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 10
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Upload size={19} color="#b45309" />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>បញ្ចូល ឬទាញយកបញ្ជី Excel / CSV</div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>គាំទ្រ .xlsx, .xls, .csv ដែលមានជួរឈរឈ្មោះ និងថ្នាក់</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={handleExportExcel}
                  style={{
                    background: '#15803d',
                    color: '#ffffff',
                    padding: '6px 12px',
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5
                  }}
                  title="ទាញយកបញ្ជីសមណសិស្សទាំងអស់ជាឯកសារ Excel"
                >
                  <Download size={14} />
                  <span>Export Excel</span>
                </button>
                <TelegramSendMenu
                  onExportExcel={handleExportExcel}
                  reportTitle={`បញ្ជីឈ្មោះសមណសិស្សមេ (${toKhmerDigits(sortedStudents.length)} អង្គ)`}
                  buttonStyle={{ padding: '6px 12px', borderRadius: 6, fontSize: 12 }}
                />
                {canEdit && (
                  <label style={{
                    background: '#b45309',
                    color: '#ffffff',
                    padding: '6px 12px',
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5
                  }}>
                    <Upload size={14} />
                    <span>ជ្រើសរើស File</span>
                    <input type="file" accept=".xlsx, .xls, .csv" onChange={handleFileUpload} style={{ display: 'none' }} />
                  </label>
                )}
              </div>
            </div>
          )}

          {/* Alert Status */}
          {uploadStatus && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
              padding: '8px 12px',
              borderRadius: 6,
              marginBottom: 12,
              fontSize: 12,
              fontWeight: 600,
              background: uploadStatus.type === 'error' ? '#fee2e2' : '#dcfce7',
              color: uploadStatus.type === 'error' ? '#b91c1c' : '#15803d',
              border: `1px solid ${uploadStatus.type === 'error' ? '#fecaca' : '#bbf7d0'}`
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                {uploadStatus.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
                <span>{uploadStatus.msg}</span>
              </div>
              <button
                type="button"
                onClick={() => setUploadStatus(null)}
                style={{ background: 'transparent', color: 'inherit', padding: 2 }}
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* Add Student Quick Form */}
          {canEdit && (
            <form onSubmit={handleAddStudent} style={{
              display: 'flex',
              gap: 8,
              marginBottom: 12,
              flexWrap: 'wrap'
            }}>
              <input
                type="text"
                placeholder="គោត្តនាម-នាម សមណសិស្សថ្មី..."
                value={newName}
                onChange={e => setNewName(e.target.value)}
                style={{ flex: '1 1 180px', fontSize: 13 }}
              />
              <MobileCustomSelect
                mobileOnly
                value={newGrade}
                onChange={e => setNewGrade(e.target.value)}
                style={{ width: 132, fontSize: 13 }}
              >
                <option value="មត្តេយ្យ">ថ្នាក់មត្តេយ្យ</option>
                <option value="១">ថ្នាក់ទី ១</option>
                <option value="២">ថ្នាក់ទី ២</option>
                <option value="៣">ថ្នាក់ទី ៣</option>
              </MobileCustomSelect>
              <button
                type="submit"
                style={{
                  background: '#0f766e',
                  color: '#ffffff',
                  padding: '8px 14px',
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <UserPlus size={16} />
                <span>បន្ថែម</span>
              </button>
            </form>
          )}

          {/* Grade Filter Pills Bar with Per-Grade Student Counts */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            flexWrap: 'wrap',
            marginBottom: 10
          }}>
            {filterButtons.map(btn => {
              const isActive = selectedGradeFilter === btn.key;
              return (
                <button
                  key={btn.key}
                  type="button"
                  onClick={() => setSelectedGradeFilter(btn.key)}
                  style={{
                    padding: '5px 10px',
                    borderRadius: 999,
                    fontSize: 12,
                    fontWeight: isActive ? 700 : 600,
                    background: isActive ? '#b45309' : '#f1f5f9',
                    color: isActive ? '#ffffff' : '#334155',
                    border: isActive ? '1px solid #b45309' : '1px solid #cbd5e1',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    cursor: 'pointer'
                  }}
                >
                  <span>{btn.label}</span>
                  <span style={{
                    background: isActive ? 'rgba(255,255,255,0.22)' : '#e2e8f0',
                    color: isActive ? '#ffffff' : '#475569',
                    padding: '0 6px',
                    borderRadius: 999,
                    fontSize: 11,
                    fontWeight: 700
                  }}>
                    {toKhmerDigits(btn.count)}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search bar & Dynamic Count Stats */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 10,
            gap: 10
          }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: 10, top: 10 }} />
              <input
                type="text"
                placeholder="ស្វែងរកតាមឈ្មោះ ឬថ្នាក់..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{ width: '100%', paddingLeft: 34, paddingRight: searchTerm ? 28 : 12, fontSize: 13 }}
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  style={{
                    position: 'absolute',
                    right: 8,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: '#e2e8f0',
                    color: '#475569',
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 0
                  }}
                  title="សម្អាតការស្វែងរក"
                >
                  <X size={11} />
                </button>
              )}
            </div>
            <span style={{ fontSize: 12, color: '#64748b', whiteSpace: 'nowrap' }}>
              {filteredStudents.length !== sortedStudents.length ? (
                <>បង្ហាញ៖ <strong style={{ color: '#b45309' }}>{toKhmerDigits(filteredStudents.length)}</strong> / {toKhmerDigits(sortedStudents.length)} អង្គ</>
              ) : (
                <>សរុប៖ <strong style={{ color: '#0f172a' }}>{toKhmerDigits(sortedStudents.length)}</strong> អង្គ</>
              )}
            </span>
          </div>

          {/* Students List Table with Sticky Header & Distinct Grade Badges */}
          <div style={{
            border: '1px solid #e2e8f0',
            borderRadius: 8,
            overflow: 'hidden',
            maxHeight: 330,
            overflowY: 'auto'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{
                  background: '#f8fafc',
                  borderBottom: '1px solid #e2e8f0',
                  textAlign: 'left',
                  position: 'sticky',
                  top: 0,
                  zIndex: 2,
                  boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)'
                }}>
                  <th style={{ padding: '9px 10px', width: 44, textAlign: 'center', background: '#f8fafc' }}>ល.រ</th>
                  <th style={{ padding: '9px 10px', background: '#f8fafc' }}>គោត្តនាម-និងនាម</th>
                  <th style={{ padding: '9px 10px', width: 125, textAlign: 'center', background: '#f8fafc' }}>ថ្នាក់</th>
                  {canEdit && (
                    <th style={{ padding: '9px 10px', width: 84, textAlign: 'center', background: '#f8fafc' }}>សកម្មភាព</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={canEdit ? 4 : 3} style={{ textAlign: 'center', padding: 24, color: '#94a3b8' }}>
                      មិនមានទិន្នន័យសមណសិស្សត្រូវនឹងការស្វែងរកឡើយ
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((s, index) => {
                    const isEditing = editingId === s.id;
                    const badge = getGradeBadgeStyle(s.grade);
                    return (
                      <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9', background: isEditing ? '#fffbeb' : '#ffffff' }}>
                        <td style={{ padding: '7px 10px', textAlign: 'center', color: '#64748b', fontWeight: 600 }}>
                          {toKhmerDigits(index + 1)}
                        </td>
                        <td style={{ padding: '7px 10px', fontWeight: 600, color: '#0f172a' }}>
                          {isEditing ? (
                            <input
                              type="text"
                              value={editName}
                              onChange={e => setEditName(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleSaveEdit(s.id);
                                } else if (e.key === 'Escape') {
                                  handleCancelEdit();
                                }
                              }}
                              style={{
                                width: '100%',
                                padding: '5px 8px',
                                fontSize: 13,
                                fontWeight: 600,
                                border: '1.5px solid #d97706',
                                borderRadius: 6
                              }}
                              autoFocus
                            />
                          ) : (
                            <span>{s.name}</span>
                          )}
                        </td>
                        <td style={{ padding: '7px 10px', textAlign: 'center' }}>
                          {isEditing ? (
                            <MobileCustomSelect
                              mobileOnly
                              value={editGrade}
                              onChange={e => setEditGrade(e.target.value)}
                              style={{
                                width: '100%',
                                padding: '5px 6px',
                                fontSize: 12,
                                fontWeight: 700,
                                border: '1.5px solid #d97706',
                                borderRadius: 6
                              }}
                            >
                              <option value="មត្តេយ្យ">ថ្នាក់មត្តេយ្យ</option>
                              <option value="១">ថ្នាក់ទី ១</option>
                              <option value="២">ថ្នាក់ទី ២</option>
                              <option value="៣">ថ្នាក់ទី ៣</option>
                            </MobileCustomSelect>
                          ) : (
                            <span style={{
                              background: badge.bg,
                              color: badge.text,
                              border: `1px solid ${badge.border}`,
                              padding: '3px 10px',
                              borderRadius: 12,
                              fontSize: 11.5,
                              whiteSpace: 'nowrap',
                              display: 'inline-block',
                              fontWeight: 700
                            }}>
                              {badge.label}
                            </span>
                          )}
                        </td>
                        {canEdit && (
                          <td style={{ padding: '7px 10px', textAlign: 'center' }}>
                            {isEditing ? (
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                <button
                                  type="button"
                                  onClick={() => handleSaveEdit(s.id)}
                                  style={{
                                    background: '#15803d',
                                    color: '#ffffff',
                                    padding: '4px 7px',
                                    borderRadius: 5,
                                    display: 'inline-flex',
                                    alignItems: 'center'
                                  }}
                                  title="រក្សាទុក"
                                >
                                  <Check size={14} />
                                </button>
                                <button
                                  type="button"
                                  onClick={handleCancelEdit}
                                  style={{
                                    background: '#e2e8f0',
                                    color: '#475569',
                                    padding: '4px 7px',
                                    borderRadius: 5,
                                    display: 'inline-flex',
                                    alignItems: 'center'
                                  }}
                                  title="បោះបង់"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            ) : (
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                <button
                                  type="button"
                                  onClick={() => handleStartEdit(s)}
                                  style={{
                                    background: '#f8fafc',
                                    border: '1px solid #e2e8f0',
                                    color: '#b45309',
                                    padding: '4px 6px',
                                    borderRadius: 5,
                                    display: 'inline-flex',
                                    alignItems: 'center'
                                  }}
                                  title="កែសម្រួលឈ្មោះ ឬថ្នាក់"
                                >
                                  <Edit3 size={13} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteStudent(s)}
                                  style={{
                                    background: '#fef2f2',
                                    border: '1px solid #fee2e2',
                                    color: '#dc2626',
                                    padding: '4px 6px',
                                    borderRadius: 5,
                                    display: 'inline-flex',
                                    alignItems: 'center'
                                  }}
                                  title="លុបឈ្មោះនេះ"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex',
          justifyContent: canReset ? 'space-between' : 'flex-end',
          alignItems: 'center',
          padding: '12px 18px',
          borderTop: '1px solid #e2e8f0',
          background: '#f8fafc'
        }}>
          {canReset && (
            <button
              onClick={handleResetDefault}
              style={{
                background: 'transparent',
                color: '#64748b',
                fontSize: 12,
                textDecoration: 'underline'
              }}
            >
              កំណត់ទៅបញ្ជីដើមវិញ
            </button>
          )}
          <button
            onClick={onClose}
            style={{
              background: '#b45309',
              color: '#ffffff',
              padding: '6px 18px',
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 600
            }}
          >
            រួចរាល់
          </button>
        </div>
      </div>
    </div>
  );
}
