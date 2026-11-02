import React, { useState } from 'react';
import { X, Upload, Search, UserPlus, Trash2, CheckCircle2, AlertCircle, FileSpreadsheet } from 'lucide-react';
import { parseStudentFile, DEFAULT_STUDENT_MASTER } from '../utils/studentMaster';
import { toKhmerDigits } from '../utils/khmerNumerals';

export default function StudentMasterModal({
  isOpen,
  onClose,
  students,
  onUpdateStudents
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [newName, setNewName] = useState('');
  const [newGrade, setNewGrade] = useState('៣');
  const [uploadStatus, setUploadStatus] = useState(null);

  if (!isOpen) return null;

  const filteredStudents = students.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.grade.includes(searchTerm)
  );

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadStatus({ type: 'loading', msg: 'កំពុងអានឯកសារ Excel/CSV...' });
      const parsed = await parseStudentFile(file);
      if (parsed.length === 0) {
        setUploadStatus({ type: 'error', msg: 'មិនឃើញទិន្នន័យឈ្មោះសិស្សក្នុងឯកសារនេះទេ សូមពិនិត្យមើល Header ឡើងវិញ។' });
      } else {
        // Merge or replace
        const combined = [...students];
        let addedCount = 0;
        parsed.forEach(p => {
          if (!combined.some(existing => existing.name === p.name)) {
            combined.push(p);
            addedCount++;
          }
        });
        onUpdateStudents(combined);
        setUploadStatus({
          type: 'success',
          msg: `បានបញ្ចូលដោយជោគជ័យចំនួន ${toKhmerDigits(addedCount)} នាក់ថ្មី (សរុប ${toKhmerDigits(combined.length)} នាក់)!`
        });
      }
    } catch (err) {
      console.error(err);
      setUploadStatus({ type: 'error', msg: 'មានបញ្ហាក្នុងការអាន File: ' + err.message });
    }
  };

  const handleAddStudent = (e) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const newStudent = {
      id: `std-${Date.now()}`,
      name: newName.trim(),
      grade: newGrade,
      gender: 'សមណសិស្ស',
      monkStatus: 'សាមណេរ'
    };

    onUpdateStudents([newStudent, ...students]);
    setNewName('');
    setUploadStatus({ type: 'success', msg: `បានបញ្ចូល «${newStudent.name}» រួចរាល់!` });
  };

  const handleDeleteStudent = (id) => {
    onUpdateStudents(students.filter(s => s.id !== id));
  };

  const handleResetDefault = () => {
    if (window.confirm('តើបងពិតជាចង់កំណត់បញ្ជីសិស្សទៅគំរូដើមរបស់សាលាវិញមែនទេ?')) {
      onUpdateStudents(DEFAULT_STUDENT_MASTER);
      setUploadStatus({ type: 'success', msg: 'បានកំណត់ទៅបញ្ជីដើមវិញរួចរាល់!' });
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 650 }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
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
        <div style={{ padding: '16px 20px', overflowY: 'auto', maxHeight: 'calc(90vh - 140px)' }}>
          {/* Subtle File Upload Banner */}
          <div style={{
            background: '#f1f5f9',
            border: '1.5px dashed #cbd5e1',
            borderRadius: 10,
            padding: 14,
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 10
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Upload size={20} color="#b45309" />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>បញ្ចូលឯកសារ Excel ឬ CSV</div>
                <div style={{ fontSize: 11, color: '#64748b' }}>គាំទ្រ .xlsx, .xls, .csv ដែលមានជួរឈរឈ្មោះ និងថ្នាក់</div>
              </div>
            </div>
            <label style={{
              background: '#b45309',
              color: '#ffffff',
              padding: '6px 14px',
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6
            }}>
              <span>ជ្រើសរើស File</span>
              <input type="file" accept=".xlsx, .xls, .csv" onChange={handleFileUpload} style={{ display: 'none' }} />
            </label>
          </div>

          {/* Alert Status */}
          {uploadStatus && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 12px',
              borderRadius: 6,
              marginBottom: 14,
              fontSize: 12,
              background: uploadStatus.type === 'error' ? '#fee2e2' : '#dcfce7',
              color: uploadStatus.type === 'error' ? '#b91c1c' : '#15803d'
            }}>
              {uploadStatus.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
              <span>{uploadStatus.msg}</span>
            </div>
          )}

          {/* Add Student Quick Form */}
          <form onSubmit={handleAddStudent} style={{
            display: 'flex',
            gap: 8,
            marginBottom: 16,
            flexWrap: 'wrap'
          }}>
            <input
              type="text"
              placeholder="គោត្តនាម-នាម សមណសិស្ស..."
              value={newName}
              onChange={e => setNewName(e.target.value)}
              style={{ flex: '1 1 180px', fontSize: 13 }}
            />
            <select
              value={newGrade}
              onChange={e => setNewGrade(e.target.value)}
              style={{ width: 120, fontSize: 13 }}
            >
              <option value="មត្តេយ្យ">ថ្នាក់មត្តេយ្យ</option>
              <option value="១">ថ្នាក់ទី ១</option>
              <option value="២">ថ្នាក់ទី ២</option>
              <option value="៣">ថ្នាក់ទី ៣</option>
            </select>
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

          {/* Search bar & Stats */}
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
                style={{ width: '100%', paddingLeft: 34, fontSize: 13 }}
              />
            </div>
            <span style={{ fontSize: 12, color: '#64748b', whiteSpace: 'nowrap' }}>
              សរុប៖ <strong>{toKhmerDigits(students.length)}</strong> អង្គ
            </span>
          </div>

          {/* Students List Table */}
          <div style={{
            border: '1px solid #e2e8f0',
            borderRadius: 8,
            overflow: 'hidden',
            maxHeight: 260,
            overflowY: 'auto'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                  <th style={{ padding: '8px 12px', width: 40, textAlign: 'center' }}>ល.រ</th>
                  <th style={{ padding: '8px 12px' }}>ឈ្មោះ</th>
                  <th style={{ padding: '8px 12px', width: 120, textAlign: 'center' }}>ថ្នាក់</th>
                  <th style={{ padding: '8px 12px', width: 50, textAlign: 'center' }}>លុប</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: 20, color: '#94a3b8' }}>
                      មិនមានទិន្នន័យ
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((s, index) => (
                    <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '6px 12px', textAlign: 'center', color: '#64748b' }}>
                        {toKhmerDigits(index + 1)}
                      </td>
                      <td style={{ padding: '6px 12px', fontWeight: 600 }}>{s.name}</td>
                      <td style={{ padding: '6px 12px', textAlign: 'center' }}>
                        <span style={{
                          background: '#e0f2fe',
                          color: '#0369a1',
                          padding: '3px 10px',
                          borderRadius: 12,
                          fontSize: 11,
                          whiteSpace: 'nowrap',
                          display: 'inline-block',
                          fontWeight: 500
                        }}>
                          {String(s.grade || '').includes('មត្តេយ្យ') ? 'ថ្នាក់មត្តេយ្យ' : `ថ្នាក់ទី ${toKhmerDigits(s.grade)}`}
                        </span>
                      </td>
                      <td style={{ padding: '6px 12px', textAlign: 'center' }}>
                        <button
                          onClick={() => handleDeleteStudent(s.id)}
                          style={{
                            background: 'transparent',
                            color: '#ef4444',
                            padding: 4,
                            borderRadius: 4
                          }}
                          title="លុបឈ្មោះនេះ"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 20px',
          borderTop: '1px solid #e2e8f0',
          background: '#f8fafc'
        }}>
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
