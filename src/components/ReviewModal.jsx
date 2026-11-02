import React, { useState, useEffect } from 'react';
import { X, ZoomIn, ZoomOut, RotateCw, CheckCircle2, AlertTriangle, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { matchStudentName } from '../utils/studentMaster';

export default function ReviewModal({
  isOpen,
  onClose,
  queueItem,
  studentMaster,
  onConfirmApprove,
  onUpdateItem,
  onNavigatePrev,
  onNavigateNext,
  hasPrev = false,
  hasNext = false,
  queueIndex = 1,
  queueTotal = 1
}) {
  if (!isOpen || !queueItem) return null;

  const initialExtracted = queueItem.processedData?.result || queueItem.processedData || {};
  const [docType, setDocType] = useState(queueItem.processedData?.detectedType || initialExtracted.detectedType || queueItem.docTypeHint || 'leave');
  
  // Helper to sanitize leave date to single start date in 2026
  const sanitizeLeaveDate = (rawDate) => {
    let clean = String(rawDate || '').trim();
    clean = clean.replace(/2024/g, '2026').replace(/២០២៤/g, '២០២៦');
    if (clean.includes('ដល់') || clean.includes('-') || clean.toLowerCase().includes('to')) {
      const parts = clean.split(/ដល់|-|\/to\//i);
      if (parts[0] && parts[0].trim().length >= 6) {
        clean = parts[0].trim();
      }
    }
    return clean || new Date().toLocaleDateString('en-GB');
  };

  const rawInitLeave = queueItem.processedData?.leaveItems?.[0] || initialExtracted.leaveItems?.[0] || {};
  // State for editable leave item
  const defaultLeaveItem = {
    name: rawInitLeave.name || '',
    grade: rawInitLeave.grade || '៣',
    reason: rawInitLeave.reason || 'ការងារផ្ទាល់ខ្លួន',
    duration: rawInitLeave.duration || '១ថ្ងៃ',
    date: sanitizeLeaveDate(rawInitLeave.date),
    note: rawInitLeave.note || ''
  };
  const [leaveItem, setLeaveItem] = useState(defaultLeaveItem);

  // State for editable finance item
  const defaultFinanceItem = queueItem.processedData?.financeItems?.[0] || initialExtracted.financeItems?.[0] || {
    category: 'expense',
    desc: '',
    qty: '1',
    unitPrice: 0,
    total: 0,
    note: ''
  };
  const [financeItem, setFinanceItem] = useState(defaultFinanceItem);

  // Image viewer transform state
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  // Reset state whenever queueItem changes (e.g. user clicks Previous/Next)
  useEffect(() => {
    if (!queueItem) return;
    const extracted = queueItem.processedData?.result || queueItem.processedData || {};
    setDocType(queueItem.processedData?.detectedType || extracted.detectedType || queueItem.docTypeHint || 'leave');
    const rawLeave = queueItem.processedData?.leaveItems?.[0] || extracted.leaveItems?.[0] || {};
    setLeaveItem({
      name: rawLeave.name || '',
      grade: rawLeave.grade || '៣',
      reason: rawLeave.reason || 'ការងារផ្ទាល់ខ្លួន',
      duration: rawLeave.duration || '១ថ្ងៃ',
      date: sanitizeLeaveDate(rawLeave.date),
      note: rawLeave.note || ''
    });
    setFinanceItem(queueItem.processedData?.financeItems?.[0] || extracted.financeItems?.[0] || {
      category: 'expense',
      desc: '',
      qty: '1',
      unitPrice: 0,
      total: 0,
      note: ''
    });
    setZoom(1);
    setRotation(0);
  }, [queueItem.id]);

  // Keyboard shortcut listener: Left/Right arrows for document navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;
      if (e.key === 'ArrowLeft' && hasPrev && onNavigatePrev) {
        onNavigatePrev();
      } else if (e.key === 'ArrowRight' && hasNext && onNavigateNext) {
        onNavigateNext();
      } else if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasPrev, hasNext, onNavigatePrev, onNavigateNext, onClose]);

  // Student match suggestion
  const studentMatch = matchStudentName(leaveItem.name, studentMaster);

  const handleApplyStudentMatch = () => {
    if (studentMatch?.student) {
      const updated = {
        ...leaveItem,
        name: studentMatch.student.name,
        grade: studentMatch.student.grade
      };
      setLeaveItem(updated);
      if (onUpdateItem) {
        onUpdateItem({
          processedData: {
            ...queueItem.processedData,
            detectedType: 'leave',
            leaveItems: [updated]
          }
        });
      }
    }
  };

  const handleConfirm = () => {
    if (docType === 'leave') {
      onConfirmApprove({
        type: 'leave',
        item: {
          id: `leave-${Date.now()}`,
          name: leaveItem.name?.trim() || 'សមណសិស្ស',
          grade: leaveItem.grade || '៣',
          reason: leaveItem.reason || 'ការងារផ្ទាល់ខ្លួន',
          duration: leaveItem.duration || '១ថ្ងៃ',
          date: sanitizeLeaveDate(leaveItem.date),
          note: leaveItem.note || ''
        },
        queueId: queueItem.id,
        rawOcr: initialExtracted,
        imagePreview: queueItem.previewUrl,
        fileName: queueItem.fileName
      });
    } else {
      onConfirmApprove({
        type: 'finance',
        item: {
          id: `fin-${Date.now()}`,
          category: financeItem.category || 'expense',
          desc: financeItem.desc?.trim() || 'ទំនិញ/សេវា',
          qty: financeItem.qty || '1',
          unitPrice: Number(financeItem.unitPrice) || 0,
          total: Number(financeItem.total) || 0,
          note: financeItem.note || ''
        },
        queueId: queueItem.id,
        rawOcr: initialExtracted,
        imagePreview: queueItem.previewUrl,
        fileName: queueItem.fileName
      });
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1200 }}>
      {/* Floating Left Previous Button */}
      {hasPrev && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onNavigatePrev(); }}
          style={{
            position: 'fixed',
            left: 'max(14px, calc(50vw - 525px - 75px))',
            top: '50%',
            transform: 'translateY(-50%)',
            background: '#0f172a',
            color: '#ffffff',
            border: '2px solid rgba(255,255,255,0.4)',
            borderRadius: 30,
            padding: '12px 18px',
            fontSize: 14,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            cursor: 'pointer',
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
            zIndex: 1100,
            transition: 'all 0.2s ease'
          }}
          title="ត្រឡប់ទៅសន្លឹកមុន (ចុច < លើ Keyboard)"
        >
          <ChevronLeft size={20} />
          <span>មុន</span>
        </button>
      )}

      {/* Floating Right Next Button */}
      {hasNext && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onNavigateNext(); }}
          style={{
            position: 'fixed',
            right: 'max(14px, calc(50vw - 525px - 75px))',
            top: '50%',
            transform: 'translateY(-50%)',
            background: '#b45309',
            color: '#ffffff',
            border: '2px solid rgba(255,255,255,0.4)',
            borderRadius: 30,
            padding: '12px 18px',
            fontSize: 14,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            cursor: 'pointer',
            boxShadow: '0 8px 24px rgba(180,83,9,0.5)',
            zIndex: 1100,
            transition: 'all 0.2s ease'
          }}
          title="ទៅសន្លឹកបន្ទាប់ (ចុច > លើ Keyboard)"
        >
          <span>បន្ទាប់</span>
          <ChevronRight size={20} />
        </button>
      )}

      <div className="modal-content" onClick={e => e.stopPropagation()} style={{
        maxWidth: 1050,
        width: '95%',
        height: '88vh',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 20px',
          borderBottom: '1px solid #e2e8f0',
          background: '#f8fafc'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: '#0f172a' }}>
                ផ្ទាំងផ្ទៀងផ្ទាត់ទិន្នន័យទន្ទឹមគ្នា (Side-by-Side Review)
              </h2>
              {queueTotal > 1 && (
                <span style={{
                  background: '#fef3c7',
                  color: '#92400e',
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: 12
                }}>
                  សន្លឹកទី {queueIndex} នៃ {queueTotal}
                </span>
              )}
              <span style={{
                background: '#ecfdf5',
                color: '#065f46',
                border: '1px solid #a7f3d0',
                fontSize: 11,
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: 12
              }}>
                ✨ AI Flywheel Ground-Truth
              </span>
            </div>
            <p style={{ fontSize: 12, color: '#64748b', margin: '4px 0 0' }}>
              ឯកសារ៖ {queueItem.fileName} • រាល់ការកែសម្រួលនឹងរក្សាទុកជាទិន្នន័យបង្វឹក AI ស្វ័យប្រវត្តិ
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Header Previous / Next Controls */}
            {queueTotal > 1 && (
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: 8,
                padding: '2px 4px',
                gap: 6
              }}>
                <button
                  type="button"
                  onClick={onNavigatePrev}
                  disabled={!hasPrev}
                  style={{
                    background: hasPrev ? '#f1f5f9' : 'transparent',
                    color: hasPrev ? '#0f172a' : '#cbd5e1',
                    border: 'none',
                    borderRadius: 6,
                    padding: '4px 10px',
                    fontSize: 12,
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    cursor: hasPrev ? 'pointer' : 'not-allowed'
                  }}
                  title="សន្លឹកមុន (ចុច < លើ Keyboard)"
                >
                  <ChevronLeft size={16} />
                  <span>មុន</span>
                </button>

                <span style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', padding: '0 4px' }}>
                  សន្លឹកទី {queueIndex} នៃ {queueTotal}
                </span>

                <button
                  type="button"
                  onClick={onNavigateNext}
                  disabled={!hasNext}
                  style={{
                    background: hasNext ? '#b45309' : '#f1f5f9',
                    color: hasNext ? '#ffffff' : '#cbd5e1',
                    border: 'none',
                    borderRadius: 6,
                    padding: '4px 10px',
                    fontSize: 12,
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    cursor: hasNext ? 'pointer' : 'not-allowed',
                    boxShadow: hasNext ? '0 1px 3px rgba(180,83,9,0.3)' : 'none'
                  }}
                  title="សន្លឹកបន្ទាប់ (ចុច > លើ Keyboard)"
                >
                  <span>បន្ទាប់</span>
                  <ChevronRight size={16} />
                </button>
              </div>
            )}

            <button
              onClick={onClose}
              style={{
                background: '#f1f5f9',
                border: '1px solid #e2e8f0',
                borderRadius: 6,
                padding: 6,
                color: '#64748b',
                cursor: 'pointer',
                display: 'inline-flex'
              }}
              title="បិទ (Esc)"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body: Split View */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(320px, 1fr) minmax(350px, 1.2fr)',
          flex: 1,
          overflow: 'hidden'
        }}>
          {/* Left Column: Image Viewer */}
          <div style={{
            background: '#0f172a',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            borderRight: '1px solid #e2e8f0'
          }}>
            {/* Viewer Controls */}
            <div style={{
              position: 'absolute',
              top: 12,
              right: 12,
              display: 'flex',
              gap: 6,
              background: 'rgba(0, 0, 0, 0.65)',
              padding: 4,
              borderRadius: 8,
              zIndex: 10
            }}>
              <button
                onClick={() => setZoom(z => Math.min(z + 0.25, 3))}
                style={{ background: 'transparent', color: '#fff', padding: 4 }}
                title="ពង្រីក (Zoom In)"
              >
                <ZoomIn size={16} />
              </button>
              <button
                onClick={() => setZoom(z => Math.max(z - 0.25, 0.5))}
                style={{ background: 'transparent', color: '#fff', padding: 4 }}
                title="បង្រួម (Zoom Out)"
              >
                <ZoomOut size={16} />
              </button>
              <button
                onClick={() => setRotation(r => (r + 90) % 360)}
                style={{ background: 'transparent', color: '#fff', padding: 4 }}
                title="បង្វិល ៩០ ដឺក្រេ (Rotate)"
              >
                <RotateCw size={16} />
              </button>
              <button
                onClick={() => { setZoom(1); setRotation(0); }}
                style={{ background: 'transparent', color: '#fff', fontSize: 11, padding: '2px 6px' }}
                title="កំណត់ដើមវិញ (Reset)"
              >
                100%
              </button>
            </div>

            {/* Image Canvas Container */}
            <div style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'auto',
              padding: 20
            }}>
              <img
                src={queueItem.previewUrl}
                alt={queueItem.fileName}
                style={{
                  maxWidth: '100%',
                  maxHeight: '100%',
                  transform: `scale(${zoom}) rotate(${rotation}deg)`,
                  transition: 'transform 0.2s ease',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                  borderRadius: 4
                }}
              />
            </div>
          </div>

          {/* Right Column: Extracted Fields Review & Form */}
          <div style={{
            padding: 20,
            overflowY: 'auto',
            background: '#ffffff',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}>
            <div>
              {/* Type Switcher */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155' }}>
                    ប្រភេទឯកសារ៖
                  </label>
                  <div style={{
                    fontSize: 11,
                    padding: '3px 8px',
                    borderRadius: 20,
                    background: queueItem.processingMode === 'ai_flywheel_memory' ? '#dcfce7' : (docType === 'leave' ? '#fef3c7' : '#ccfbf1'),
                    color: queueItem.processingMode === 'ai_flywheel_memory' ? '#15803d' : (docType === 'leave' ? '#92400e' : '#0f766e'),
                    border: `1px solid ${queueItem.processingMode === 'ai_flywheel_memory' ? '#86efac' : (docType === 'leave' ? '#fde68a' : '#99f6e4')}`,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    fontWeight: 700
                  }}>
                    <span>
                      {queueItem.processingMode === 'ai_flywheel_memory'
                        ? '🧠 ចងចាំពីការផ្ទៀងផ្ទាត់លើកមុន (AI Ground-Truth Memory 100%)'
                        : `✨ ស្គាល់ស្វ័យប្រវត្តិ៖ ${docType === 'leave' ? 'ក្រដាសសុំច្បាប់ (A4)' : 'ប៉ុងចំណាយ/ចំណូល'}`}
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => {
                      setDocType('leave');
                      if (onUpdateItem) onUpdateItem({ processedData: { ...queueItem.processedData, detectedType: 'leave' } });
                    }}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: 6,
                      fontSize: 13,
                      fontWeight: 600,
                      background: docType === 'leave' ? '#b45309' : '#f1f5f9',
                      color: docType === 'leave' ? '#ffffff' : '#64748b',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    ក្រដាសសុំច្បាប់ (PDF 2)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDocType('finance');
                      if (onUpdateItem) onUpdateItem({ processedData: { ...queueItem.processedData, detectedType: 'finance' } });
                    }}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: 6,
                      fontSize: 13,
                      fontWeight: 600,
                      background: docType === 'finance' ? '#0f766e' : '#f1f5f9',
                      color: docType === 'finance' ? '#ffffff' : '#64748b',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    ប៉ុងចំណាយ/ចំណូល (PDF 1)
                  </button>
                </div>
              </div>

              {/* Form for Leave Slip */}
              {docType === 'leave' ? (
                <div>
                  {/* Student Matching Alert */}
                  {studentMatch && (
                    <div style={{
                      background: studentMatch.isExact ? '#f0fdf4' : '#fefce8',
                      border: `1px solid ${studentMatch.isExact ? '#bbf7d0' : '#fef08a'}`,
                      padding: 10,
                      borderRadius: 8,
                      marginBottom: 14,
                      fontSize: 12,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {studentMatch.isExact ? <CheckCircle2 size={16} color="#16a34a" /> : <AlertTriangle size={16} color="#ca8a04" />}
                        <span>
                          {studentMatch.isExact ? 'ត្រូវគ្នាឥតខ្ចោះជាមួយ៖ ' : 'រកឃើញស្រដៀងក្នុងបញ្ជី៖ '}
                          <strong>{studentMatch.student.name} (ថ្នាក់ទី {studentMatch.student.grade})</strong>
                        </span>
                      </div>
                      {!studentMatch.isExact && (
                        <button
                          type="button"
                          onClick={handleApplyStudentMatch}
                          style={{
                            background: '#ca8a04',
                            color: '#fff',
                            padding: '3px 8px',
                            borderRadius: 4,
                            fontSize: 11,
                            fontWeight: 600
                          }}
                        >
                          ជ្រើសរើស
                        </button>
                      )}
                    </div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10, marginBottom: 12 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>
                        គោត្តនាម-និងនាម (ឈ្មោះសិស្ស)៖
                      </label>
                      <input
                        type="text"
                        value={leaveItem.name}
                        onChange={e => setLeaveItem({ ...leaveItem, name: e.target.value })}
                        placeholder="ឧ. ពឿន គង់"
                        style={{ width: '100%', fontSize: 14, fontWeight: 600, padding: '8px 10px', borderColor: '#b45309' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>
                        ថ្នាក់ទី៖
                      </label>
                      <select
                        value={leaveItem.grade}
                        onChange={e => setLeaveItem({ ...leaveItem, grade: e.target.value })}
                        style={{ width: '100%', fontSize: 14, fontWeight: 600, padding: '8px 10px' }}
                      >
                        <option value="មត្តេយ្យ">មត្តេយ្យ</option>
                        <option value="១">ថ្នាក់ទី ១</option>
                        <option value="២">ថ្នាក់ទី ២</option>
                        <option value="៣">ថ្នាក់ទី ៣</option>
                      </select>
                    </div>
                  </div>

                  {/* Quick Grade Tap Pills */}
                  <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 11, color: '#64748b', alignSelf: 'center' }}>រើសថ្នាក់រហ័ស៖</span>
                    {['មត្តេយ្យ', '១', '២', '៣'].map(g => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setLeaveItem({ ...leaveItem, grade: g })}
                        style={{
                          fontSize: 11,
                          padding: '2px 8px',
                          borderRadius: 12,
                          background: leaveItem.grade === g ? '#b45309' : '#f1f5f9',
                          color: leaveItem.grade === g ? '#ffffff' : '#475569',
                          border: 'none',
                          cursor: 'pointer'
                        }}
                      >
                        {g === 'មត្តេយ្យ' ? 'មត្តេយ្យ' : `ថ្នាក់ទី ${g}`}
                      </button>
                    ))}
                  </div>

                  <div style={{ marginBottom: 12 }}>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>
                      មូលហេតុឈប់៖
                    </label>
                    <input
                      type="text"
                      value={leaveItem.reason}
                      onChange={e => setLeaveItem({ ...leaveItem, reason: e.target.value })}
                      placeholder="ឧ. អាពាធ គ្រុនក្ដៅ, ការងារផ្ទាល់ខ្លួន, ទៅបុណ្យ..."
                      style={{ width: '100%', fontSize: 13, padding: '8px 10px' }}
                    />
                    {/* Quick Reason Tap Pills */}
                    <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                      {['ក្ដៅខ្លួន ឈឺចុកពោះ', 'ការងារផ្ទាល់ខ្លួន', 'អាពាធ គ្រុនក្ដៅ', 'ឈឺក្បាល', 'ទៅបុណ្យ ខួប', 'អាពាធ ទៅពេទ្យ'].map(r => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setLeaveItem({ ...leaveItem, reason: r })}
                          style={{
                            fontSize: 11,
                            padding: '2px 8px',
                            borderRadius: 12,
                            background: leaveItem.reason === r ? '#0f766e' : '#f1f5f9',
                            color: leaveItem.reason === r ? '#ffffff' : '#475569',
                            border: 'none',
                            cursor: 'pointer'
                          }}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>
                        ចំនួនថ្ងៃឈប់៖
                      </label>
                      <input
                        type="text"
                        value={leaveItem.duration}
                        onChange={e => setLeaveItem({ ...leaveItem, duration: e.target.value })}
                        placeholder="ឧ. ១ថ្ងៃ, ១ល្ងាច..."
                        style={{ width: '100%', fontSize: 13, padding: '8px 10px' }}
                      />
                      <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
                        {['១ថ្ងៃ', '១ល្ងាច', '១ថ្ងៃកន្លះ', '២ថ្ងៃ', '៥ថ្ងៃ'].map(d => (
                          <button
                            key={d}
                            type="button"
                            onClick={() => setLeaveItem({ ...leaveItem, duration: d })}
                            style={{
                              fontSize: 11,
                              padding: '1px 6px',
                              borderRadius: 10,
                              background: leaveItem.duration === d ? '#b45309' : '#f8fafc',
                              color: leaveItem.duration === d ? '#ffffff' : '#64748b',
                              border: '1px solid #e2e8f0',
                              cursor: 'pointer'
                            }}
                          >
                            {d}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>
                        កាលបរិច្ឆេទ (ថ្ងៃខែចាប់ផ្ដើម)៖
                      </label>
                      <input
                        type="text"
                        value={leaveItem.date}
                        onChange={e => setLeaveItem({ ...leaveItem, date: e.target.value })}
                        onBlur={e => setLeaveItem({ ...leaveItem, date: sanitizeLeaveDate(e.target.value) })}
                        placeholder="DD/MM/YYYY"
                        style={{ width: '100%', fontSize: 13, padding: '8px 10px' }}
                      />
                      {(leaveItem.date?.includes('ដល់') || leaveItem.date?.includes('-')) && (
                        <button
                          type="button"
                          onClick={() => setLeaveItem({ ...leaveItem, date: sanitizeLeaveDate(leaveItem.date) })}
                          style={{
                            marginTop: 4,
                            background: '#ca8a04',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: 4,
                            padding: '2px 8px',
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          ⚡ ចុចកាត់ពាក្យ «ដល់» យកតែថ្ងៃចាប់ផ្ដើម
                        </button>
                      )}
                    </div>
                  </div>

                  <div style={{ marginBottom: 12 }}>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>
                      ផ្សេងៗ (សម្គាល់បន្ថែម)៖
                    </label>
                    <input
                      type="text"
                      value={leaveItem.note}
                      onChange={e => setLeaveItem({ ...leaveItem, note: e.target.value })}
                      style={{ width: '100%', fontSize: 12, padding: '6px 10px' }}
                    />
                  </div>
                </div>
              ) : (
                /* Form for Finance / Receipts */
                <div>
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                      ប្រភេទហិរញ្ញវត្ថុ៖
                    </label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        type="button"
                        onClick={() => setFinanceItem({ ...financeItem, category: 'expense' })}
                        style={{
                          flex: 1,
                          padding: '6px',
                          borderRadius: 6,
                          fontSize: 12,
                          fontWeight: 600,
                          background: financeItem.category === 'expense' ? '#ef4444' : '#f1f5f9',
                          color: financeItem.category === 'expense' ? '#ffffff' : '#475569'
                        }}
                      >
                        ចំណាយ (Expense)
                      </button>
                      <button
                        type="button"
                        onClick={() => setFinanceItem({ ...financeItem, category: 'income' })}
                        style={{
                          flex: 1,
                          padding: '6px',
                          borderRadius: 6,
                          fontSize: 12,
                          fontWeight: 600,
                          background: financeItem.category === 'income' ? '#10b981' : '#f1f5f9',
                          color: financeItem.category === 'income' ? '#ffffff' : '#475569'
                        }}
                      >
                        ចំណូល (Income)
                      </button>
                    </div>
                  </div>

                  <div style={{ marginBottom: 12 }}>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                      បរិយាយ / ឈ្មោះឥវ៉ាន់៖
                    </label>
                    <input
                      type="text"
                      value={financeItem.desc}
                      onChange={e => setFinanceItem({ ...financeItem, desc: e.target.value })}
                      placeholder="ឧ. សាំងក្រអូប -802, ក្តារឈើ..."
                      style={{ width: '100%', fontSize: 13 }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                        ចំនួន៖
                      </label>
                      <input
                        type="text"
                        value={financeItem.qty}
                        onChange={e => setFinanceItem({ ...financeItem, qty: e.target.value })}
                        placeholder="ឧ. 1 ម៉ាស៊ីន, 3 លីត្រ..."
                        style={{ width: '100%', fontSize: 13 }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                        តម្លៃរាយ (៛)៖
                      </label>
                      <input
                        type="number"
                        value={financeItem.unitPrice}
                        onChange={e => setFinanceItem({ ...financeItem, unitPrice: e.target.value })}
                        style={{ width: '100%', fontSize: 13 }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                        តម្លៃសរុប (៛)៖
                      </label>
                      <input
                        type="number"
                        value={financeItem.total}
                        onChange={e => setFinanceItem({ ...financeItem, total: e.target.value })}
                        style={{ width: '100%', fontSize: 13, fontWeight: 700 }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                        ផ្សេងៗ៖
                      </label>
                      <input
                        type="text"
                        value={financeItem.note}
                        onChange={e => setFinanceItem({ ...financeItem, note: e.target.value })}
                        style={{ width: '100%', fontSize: 13 }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderTop: '1px solid #e2e8f0',
              paddingTop: 16,
              marginTop: 16
            }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  background: '#f1f5f9',
                  color: '#64748b',
                  padding: '8px 16px',
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 600
                }}
              >
                បោះបង់
              </button>

              <button
                type="button"
                onClick={handleConfirm}
                style={{
                  background: '#0f766e',
                  color: '#ffffff',
                  padding: '9px 20px',
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  boxShadow: '0 2px 6px rgba(15,118,110,0.3)'
                }}
              >
                <span>យល់ព្រមបញ្ចូលក្នុងតារាង</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
