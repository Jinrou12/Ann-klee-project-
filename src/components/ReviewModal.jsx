import React, { useState, useEffect, useMemo, useRef } from 'react';
import { X, ZoomIn, ZoomOut, RotateCw, CheckCircle2, AlertTriangle, ArrowRight, ChevronLeft, ChevronRight, Trash2, Sparkles } from 'lucide-react';
import { matchStudentName, getPhoneticStudentSuggestions, getRealReasonSuggestions } from '../utils/studentMaster';
import { parseDurationShorthand, getDurationSuggestions, normalizeCurrency, getCurrencySymbol } from '../utils/khmerNumerals';
import { getStoredTrainingDataset, INITIAL_LEAVE_DATA } from '../utils/storage';
import CurrencyToggle from './CurrencyToggle';

export default function ReviewModal({
  isOpen,
  isMobile = false,
  onClose,
  queueItem,
  studentMaster,
  allLeaves = INITIAL_LEAVE_DATA,
  queue = [],
  onConfirmApprove,
  onUpdateItem,
  onRemoveItem,
  onNavigatePrev,
  onNavigateNext,
  hasPrev = false,
  hasNext = false,
  queueIndex = 1,
  queueTotal = 1
}) {
  const [focusedField, setFocusedField] = useState(null); // 'name' | 'reason' | 'duration' | null
  const [isImageExpanded, setIsImageExpanded] = useState(false);
  const touchStartRef = useRef(null);
  const queueItemId = queueItem?.id || '';
  const trainingDataset = useMemo(() => {
    void queueItemId;
    return getStoredTrainingDataset();
  }, [queueItemId]);

  const initialExtracted = queueItem?.processedData?.result || queueItem?.processedData || {};
  const resolveDocType = (rawType) => (!rawType || rawType === 'auto') ? 'leave' : rawType;
  const [docType, setDocType] = useState(resolveDocType(queueItem?.processedData?.detectedType || initialExtracted.detectedType || queueItem?.docTypeHint));

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
    return clean || '០១/០៧/២០២៦';
  };

  const rawInitLeave = queueItem?.processedData?.leaveItems?.[0] || initialExtracted.leaveItems?.[0] || {};
  const defaultLeaveItem = {
    name: rawInitLeave.name || '',
    grade: rawInitLeave.grade || '៣',
    reason: rawInitLeave.reason || 'ការងារផ្ទាល់ខ្លួន',
    duration: rawInitLeave.duration || '១ថ្ងៃ',
    date: sanitizeLeaveDate(rawInitLeave.date),
    note: rawInitLeave.note || ''
  };
  const [leaveItem, setLeaveItem] = useState(defaultLeaveItem);

  const defaultFinanceItem = queueItem?.processedData?.financeItems?.[0] || initialExtracted.financeItems?.[0] || {
    category: 'expense',
    desc: '',
    qty: '1',
    unitPrice: 0,
    total: 0,
    currency: 'KHR',
    note: ''
  };
  const [financeItem, setFinanceItem] = useState(defaultFinanceItem);

  // Image viewer transform state
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  // Reset state whenever queueItem changes (e.g. user clicks Previous/Next or swipes)
  useEffect(() => {
    if (!queueItem) return;
    const extracted = queueItem.processedData?.result || queueItem.processedData || {};
    setDocType(resolveDocType(queueItem.processedData?.detectedType || extracted.detectedType || queueItem.docTypeHint));
    const rawLeave = queueItem.processedData?.leaveItems?.[0] || extracted.leaveItems?.[0] || {};
    setLeaveItem({
      name: rawLeave.name || '',
      grade: rawLeave.grade || '៣',
      reason: rawLeave.reason || 'ការងារផ្ទាល់ខ្លួន',
      duration: rawLeave.duration || '១ថ្ងៃ',
      date: sanitizeLeaveDate(rawLeave.date),
      note: rawLeave.note || ''
    });
    const rawFin = queueItem.processedData?.financeItems?.[0] || extracted.financeItems?.[0] || {};
    setFinanceItem({
      category: rawFin.category || 'expense',
      desc: rawFin.desc || '',
      qty: rawFin.qty || '1',
      unitPrice: rawFin.unitPrice || 0,
      total: rawFin.total || 0,
      currency: normalizeCurrency(rawFin.currency),
      note: rawFin.note || ''
    });
    setZoom(1);
    setRotation(0);
    setFocusedField(null);
  }, [queueItem]);

  // Keyboard shortcut listener: Left/Right arrows for document navigation
  useEffect(() => {
    if (!isOpen || !queueItem) return undefined;
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
  }, [isOpen, queueItem, hasPrev, hasNext, onNavigatePrev, onNavigateNext, onClose]);

  if (!isOpen || !queueItem) return null;

  const studentMatch = matchStudentName(leaveItem.name, studentMaster);

  const applyLeavePatch = (patch) => {
    const updated = { ...leaveItem, ...patch };
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
  };

  const applyFinancePatch = (patch) => {
    const updated = { ...financeItem, ...patch };
    setFinanceItem(updated);
    if (onUpdateItem) {
      onUpdateItem({
        processedData: {
          ...queueItem.processedData,
          detectedType: 'finance',
          financeItems: [updated]
        }
      });
    }
  };

  const switchDocType = (type) => {
    setDocType(type);
    if (onUpdateItem) {
      onUpdateItem({
        processedData: {
          ...queueItem.processedData,
          detectedType: type
        }
      });
    }
  };

  const handleApplyStudentMatch = () => {
    if (studentMatch?.student) {
      applyLeavePatch({
        name: studentMatch.student.name,
        grade: studentMatch.student.grade
      });
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
          duration: parseDurationShorthand(leaveItem.duration) || '១ថ្ងៃ',
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
          currency: normalizeCurrency(financeItem.currency),
          note: financeItem.note || ''
        },
        queueId: queueItem.id,
        rawOcr: initialExtracted,
        imagePreview: queueItem.previewUrl,
        fileName: queueItem.fileName
      });
    }
  };

  // Safe inner touch swipe handler (ignores outer screen edges < 36px so it never conflicts with OS edge back gesture)
  const handleCardTouchStart = (e) => {
    if (!e.touches || e.touches.length !== 1) {
      touchStartRef.current = null;
      return;
    }
    const tag = e.target?.tagName;
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) {
      touchStartRef.current = null;
      return;
    }
    if (isImageExpanded && zoom > 1) {
      touchStartRef.current = null;
      return;
    }
    const touch = e.touches[0];
    const screenW = window.innerWidth || 375;
    const edgeMargin = 36;
    if (touch.clientX < edgeMargin || touch.clientX > screenW - edgeMargin) {
      touchStartRef.current = null;
      return;
    }
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY
    };
  };

  const handleCardTouchEnd = (e) => {
    if (!touchStartRef.current || !e.changedTouches || e.changedTouches.length !== 1) {
      touchStartRef.current = null;
      return;
    }
    const touch = e.changedTouches[0];
    const screenW = window.innerWidth || 375;
    // Ignore if swipe finished right at the extreme screen edge
    if (touch.clientX < 20 || touch.clientX > screenW - 20) {
      touchStartRef.current = null;
      return;
    }
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;
    touchStartRef.current = null;

    if (Math.abs(deltaX) >= 45 && Math.abs(deltaX) > Math.abs(deltaY) * 1.3) {
      if (deltaX < 0 && hasNext && onNavigateNext) {
        onNavigateNext();
      } else if (deltaX > 0 && hasPrev && onNavigatePrev) {
        onNavigatePrev();
      }
    }
  };

  if (isMobile) {
    const isLeave = docType === 'leave';
    const isNameFocused = focusedField === 'name';
    const isReasonFocused = focusedField === 'reason';
    const isDurationFocused = focusedField === 'duration';
    const nameQuery = String(leaveItem.name || '').trim();
    const reasonQuery = String(leaveItem.reason || '').trim();

    const studentSuggestions = isLeave
      ? getPhoneticStudentSuggestions(nameQuery, studentMaster)
      : { exactMatches: [], phoneticMatches: [], similarConsonants: [] };
    const hasStudentSuggestions =
      studentSuggestions.exactMatches.length > 0 || studentSuggestions.phoneticMatches.length > 0;
    const showStudentSuggestBox =
      isLeave &&
      (isNameFocused || !studentMatch?.isExact) &&
      (nameQuery.length > 0 ? hasStudentSuggestions : isNameFocused);

    const realReasonSuggestions = (isLeave && isReasonFocused)
      ? getRealReasonSuggestions(reasonQuery, { allLeaves, trainingDataset, queue })
      : [];

    const isPending = queueItem.status === 'processing';
    const isLearnedMemory = initialExtracted.scanSource === 'learned-memory' || queueItem.processedData?.scanSource === 'learned-memory';
    const isCloudScan = initialExtracted.scanSource === 'gemini-cloud' || isLearnedMemory;

    return (
      <div
        className="modal-overlay"
        onClick={onClose}
        style={{
          zIndex: 1200,
          padding: '12px 10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <div
          onClick={e => e.stopPropagation()}
          onTouchStart={handleCardTouchStart}
          onTouchEnd={handleCardTouchEnd}
          style={{
            width: '100%',
            maxWidth: 400,
            maxHeight: '90vh',
            overflowY: 'auto',
            border: '1px solid #cbd5e1',
            borderRadius: 14,
            padding: 12,
            background: '#ffffff',
            boxShadow: '0 12px 32px rgba(15, 23, 42, 0.35)',
            display: 'flex',
            flexDirection: 'column',
            gap: 10
          }}
        >
          {/* Top Navigation Bar: Previous | Sheet Index (Swipe Hint) | Next | Close */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 6,
            paddingBottom: 8,
            borderBottom: '1px solid #e2e8f0'
          }}>
            <button
              type="button"
              onClick={onNavigatePrev}
              disabled={!hasPrev}
              style={{
                background: hasPrev ? '#0f172a' : '#f1f5f9',
                color: hasPrev ? '#ffffff' : '#cbd5e1',
                border: 'none',
                borderRadius: 8,
                padding: '6px 10px',
                fontSize: 12,
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 3,
                cursor: hasPrev ? 'pointer' : 'not-allowed',
                flexShrink: 0
              }}
            >
              <ChevronLeft size={15} />
              <span>មុន</span>
            </button>

            <div style={{ textAlign: 'center', minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>
                សន្លឹកទី {queueIndex} នៃ {queueTotal}
              </div>
              <div style={{ fontSize: 10, color: '#64748b', fontWeight: 500 }}>
                ⇄ អូសក្នុងកាតឆ្វេង-ស្ដាំប្ដូរសន្លឹក
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              <button
                type="button"
                onClick={onNavigateNext}
                disabled={!hasNext}
                style={{
                  background: hasNext ? '#b45309' : '#f1f5f9',
                  color: hasNext ? '#ffffff' : '#cbd5e1',
                  border: 'none',
                  borderRadius: 8,
                  padding: '6px 10px',
                  fontSize: 12,
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 3,
                  cursor: hasNext ? 'pointer' : 'not-allowed'
                }}
              >
                <span>បន្ទាប់</span>
                <ChevronRight size={15} />
              </button>

              <button
                type="button"
                onClick={onClose}
                style={{
                  background: '#f1f5f9',
                  color: '#475569',
                  border: '1px solid #cbd5e1',
                  borderRadius: 8,
                  width: 30,
                  height: 30,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  padding: 0
                }}
                title="បិទ"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Document Type Segmented Switcher (Matches Image 3) */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            background: '#f1f5f9',
            padding: 3,
            borderRadius: 8,
            gap: 4
          }}>
            <button
              type="button"
              onClick={() => switchDocType('leave')}
              style={{
                background: isLeave ? '#b45309' : 'transparent',
                color: isLeave ? '#ffffff' : '#64748b',
                border: 'none',
                padding: '7px 8px',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                textAlign: 'center'
              }}
            >
              ក្រដាសសុំច្បាប់ (PDF 2)
            </button>
            <button
              type="button"
              onClick={() => switchDocType('finance')}
              style={{
                background: !isLeave ? '#0f766e' : 'transparent',
                color: !isLeave ? '#ffffff' : '#64748b',
                border: 'none',
                padding: '7px 8px',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                textAlign: 'center'
              }}
            >
              ប៉ុងចំណាយ/ចំណូល (PDF 1)
            </button>
          </div>

          {/* Expanded Full-Width Image Viewer (when user taps ពង្រីកមើល inside modal) */}
          {isImageExpanded && (
            <div style={{
              width: '100%',
              height: 290,
              background: '#0f172a',
              borderRadius: 8,
              position: 'relative',
              overflow: 'auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid #cbd5e1'
            }}>
              <div style={{
                position: 'absolute',
                top: 8,
                right: 8,
                zIndex: 10,
                display: 'flex',
                gap: 4,
                background: 'rgba(15, 23, 42, 0.8)',
                padding: 4,
                borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.2)'
              }}>
                <button
                  type="button"
                  onClick={() => setZoom(z => Math.min(z + 0.25, 3))}
                  style={{ background: 'transparent', color: '#fff', border: 'none', padding: 4, cursor: 'pointer' }}
                >
                  <ZoomIn size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => setZoom(z => Math.max(z - 0.25, 0.5))}
                  style={{ background: 'transparent', color: '#fff', border: 'none', padding: 4, cursor: 'pointer' }}
                >
                  <ZoomOut size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => setRotation(r => (r + 90) % 360)}
                  style={{ background: 'transparent', color: '#fff', border: 'none', padding: 4, cursor: 'pointer' }}
                >
                  <RotateCw size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => { setZoom(1); setRotation(0); }}
                  style={{ background: 'transparent', color: '#fff', border: 'none', fontSize: 10, padding: '2px 5px', cursor: 'pointer' }}
                >
                  100%
                </button>
              </div>
              {queueItem.previewUrl ? (
                <img
                  src={queueItem.previewUrl}
                  alt={queueItem.fileName}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '100%',
                    objectFit: 'contain',
                    transform: `scale(${zoom}) rotate(${rotation}deg)`,
                    transition: 'transform 0.2s ease'
                  }}
                />
              ) : (
                <span style={{ color: '#94a3b8', fontSize: 12 }}>គ្មានរូបភាព</span>
              )}
            </div>
          )}

          {/* Middle Split Section (Exact Match with Image 3) */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '115px 1fr',
            gap: 10,
            alignItems: 'start'
          }}>
            {/* Left Column: Portrait A4 Thumbnail + Toggle Expand Button */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div
                onClick={() => setIsImageExpanded(prev => !prev)}
                style={{
                  width: 115,
                  height: 144,
                  background: '#0f172a',
                  borderRadius: 8,
                  overflow: 'hidden',
                  position: 'relative',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid #cbd5e1'
                }}
              >
                {queueItem.previewUrl ? (
                  <img
                    src={queueItem.previewUrl}
                    alt={queueItem.fileName}
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                ) : (
                  <span style={{ color: '#94a3b8', fontSize: 11 }}>គ្មានរូបភាព</span>
                )}
              </div>

              <button
                type="button"
                onClick={() => setIsImageExpanded(prev => !prev)}
                style={{
                  width: '100%',
                  background: isImageExpanded ? '#ecfdf5' : '#f8fafc',
                  color: '#0f766e',
                  border: '1px solid #cbd5e1',
                  padding: '6px 4px',
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                  cursor: 'pointer'
                }}
              >
                <ZoomIn size={13} color="#0f766e" />
                <span>{isImageExpanded ? 'បង្រួមរូប' : 'ពង្រីកមើល'}</span>
              </button>
            </div>

            {/* Right Column: Header (#Index, AI Status, Delete) + Core Fields */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 7,
              minWidth: 0
            }}>
              {/* Row 1: #Index + Compact AI Badge + Delete Button */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 4,
                borderBottom: '1px solid #f1f5f9',
                paddingBottom: 5
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0, flexWrap: 'wrap' }}>
                  <span style={{
                    background: '#0f172a',
                    color: '#ffffff',
                    fontSize: 10,
                    padding: '2px 6px',
                    borderRadius: 5,
                    fontWeight: 700,
                    flexShrink: 0
                  }}>
                    #{queueIndex}
                  </span>

                  {initialExtracted.isOfflineNoScan ? (
                    <span style={{
                      fontSize: 10,
                      padding: '2px 6px',
                      borderRadius: 6,
                      background: '#fee2e2',
                      color: '#b91c1c',
                      border: '1px solid #fecaca',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 3,
                      fontWeight: 600
                    }}>
                      <AlertTriangle size={11} color="#dc2626" />
                      <span>Offline</span>
                    </span>
                  ) : (
                    <span style={{
                      fontSize: 10,
                      padding: '2px 6px',
                      borderRadius: 6,
                      background: isPending ? '#eff6ff' : (isCloudScan ? '#ecfdf5' : '#fffbeb'),
                      color: isPending ? '#1d4ed8' : (isCloudScan ? '#065f46' : '#b45309'),
                      border: `1px solid ${isPending ? '#bfdbfe' : (isCloudScan ? '#a7f3d0' : '#fde68a')}`,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 3,
                      fontWeight: 600
                    }}>
                      <Sparkles size={11} color={isPending ? '#2563eb' : (isCloudScan ? '#059669' : '#d97706')} />
                      <span>
                        {isPending
                          ? 'កំពុងស្កេន...'
                          : isLearnedMemory
                            ? 'AI (ចងចាំ ១០០%)'
                            : 'AI Vision'}
                      </span>
                    </span>
                  )}
                </div>

                {onRemoveItem && (
                  <button
                    type="button"
                    onClick={onRemoveItem}
                    style={{
                      background: '#fef2f2',
                      color: '#dc2626',
                      border: '1px solid #fecaca',
                      padding: '3px 7px',
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 3,
                      cursor: 'pointer',
                      flexShrink: 0
                    }}
                    title="លុបចេញពីបញ្ជី"
                  >
                    <Trash2 size={12} />
                    <span>លុប</span>
                  </button>
                )}
              </div>

              {isLeave ? (
                <>
                  {/* Row 2: Student Name */}
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#1e293b', marginBottom: 2 }}>
                      👤 គោត្តនាម-នាម៖
                    </label>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <input
                        type="text"
                        value={leaveItem.name || ''}
                        onFocus={() => setFocusedField('name')}
                        onBlur={() => setTimeout(() => setFocusedField(prev => prev === 'name' ? null : prev), 180)}
                        onChange={e => applyLeavePatch({ name: e.target.value })}
                        placeholder="វាយឈ្មោះសិស្ស..."
                        style={{
                          width: '100%',
                          fontSize: 14,
                          fontWeight: 700,
                          padding: '6px 28px 6px 8px',
                          border: isNameFocused ? '1.5px solid #b45309' : '1px solid #cbd5e1',
                          borderRadius: 6,
                          background: '#ffffff',
                          outline: 'none'
                        }}
                      />
                      {leaveItem.name && (
                        <button
                          type="button"
                          onMouseDown={e => e.preventDefault()}
                          onClick={() => {
                            applyLeavePatch({ name: '' });
                            setFocusedField('name');
                          }}
                          style={{
                            position: 'absolute',
                            right: 5,
                            background: '#f1f5f9',
                            color: '#64748b',
                            border: 'none',
                            width: 20,
                            height: 20,
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            padding: 0
                          }}
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Row 3: Duration (Inline Label + Input on Same Row) */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <label style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: '#1e293b',
                      whiteSpace: 'nowrap',
                      flexShrink: 0
                    }}>
                      ⏱️ រយៈពេល៖
                    </label>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
                      <input
                        type="text"
                        value={leaveItem.duration ?? ''}
                        onFocus={() => setFocusedField('duration')}
                        onBlur={() => {
                          const formatted = parseDurationShorthand(leaveItem.duration) || '១ថ្ងៃ';
                          if (formatted !== leaveItem.duration) {
                            applyLeavePatch({ duration: formatted });
                          }
                          setTimeout(() => setFocusedField(prev => prev === 'duration' ? null : prev), 150);
                        }}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const formatted = parseDurationShorthand(leaveItem.duration) || '១ថ្ងៃ';
                            applyLeavePatch({ duration: formatted });
                            e.target.blur();
                          }
                        }}
                        onChange={e => applyLeavePatch({ duration: e.target.value })}
                        placeholder="1, 1.5, 1a, 1p"
                        style={{
                          width: '100%',
                          fontSize: 13,
                          fontWeight: 600,
                          padding: '5px 26px 5px 8px',
                          border: isDurationFocused ? '1.5px solid #b45309' : '1px solid #cbd5e1',
                          borderRadius: 6,
                          background: '#ffffff',
                          outline: 'none'
                        }}
                      />
                      {leaveItem.duration && (
                        <button
                          type="button"
                          onMouseDown={e => e.preventDefault()}
                          onClick={() => {
                            applyLeavePatch({ duration: '' });
                            setFocusedField('duration');
                          }}
                          style={{
                            position: 'absolute',
                            right: 5,
                            background: '#f1f5f9',
                            color: '#64748b',
                            border: 'none',
                            width: 19,
                            height: 19,
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            padding: 0
                          }}
                        >
                          <X size={11} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Row 4: Date (No Label, Matches Image 3) */}
                  <div>
                    <input
                      type="text"
                      value={leaveItem.date || ''}
                      onChange={e => applyLeavePatch({ date: e.target.value })}
                      placeholder="DD/MM/YYYY"
                      style={{
                        width: '100%',
                        fontSize: 13,
                        fontWeight: 600,
                        padding: '5px 8px',
                        border: '1px solid #cbd5e1',
                        borderRadius: 6,
                        background: '#ffffff'
                      }}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#1e293b', marginBottom: 2 }}>
                      ប្រភេទ៖
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
                      <button
                        type="button"
                        onClick={() => applyFinancePatch({ category: 'expense' })}
                        style={{
                          padding: '6px 4px',
                          borderRadius: 6,
                          fontSize: 12,
                          fontWeight: 700,
                          background: financeItem.category === 'expense' ? '#ef4444' : '#ffffff',
                          color: financeItem.category === 'expense' ? '#ffffff' : '#475569',
                          border: financeItem.category === 'expense' ? '1px solid #ef4444' : '1px solid #cbd5e1',
                          cursor: 'pointer'
                        }}
                      >
                        ចំណាយ
                      </button>
                      <button
                        type="button"
                        onClick={() => applyFinancePatch({ category: 'income' })}
                        style={{
                          padding: '6px 4px',
                          borderRadius: 6,
                          fontSize: 12,
                          fontWeight: 700,
                          background: financeItem.category === 'income' ? '#10b981' : '#ffffff',
                          color: financeItem.category === 'income' ? '#ffffff' : '#475569',
                          border: financeItem.category === 'income' ? '1px solid #10b981' : '1px solid #cbd5e1',
                          cursor: 'pointer'
                        }}
                      >
                        ចំណូល
                      </button>
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#1e293b', marginBottom: 2 }}>
                      បរិមាណ / ចំនួន៖
                    </label>
                    <input
                      type="text"
                      value={financeItem.qty || ''}
                      onChange={e => applyFinancePatch({ qty: e.target.value })}
                      placeholder="ឧ. 1 សន្លឹក..."
                      style={{
                        width: '100%',
                        fontSize: 13,
                        padding: '6px 8px',
                        border: '1px solid #cbd5e1',
                        borderRadius: 6,
                        background: '#ffffff'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4, fontSize: 11, fontWeight: 700, color: '#1e293b', marginBottom: 2 }}>
                      <span>តម្លៃសរុប ({getCurrencySymbol(financeItem.currency)})៖</span>
                      <CurrencyToggle
                        value={financeItem.currency}
                        onChange={cur => applyFinancePatch({ currency: cur })}
                      />
                    </label>
                    <input
                      type="number"
                      value={financeItem.total || 0}
                      onChange={e => applyFinancePatch({ total: Number(e.target.value) })}
                      style={{
                        width: '100%',
                        fontSize: 14,
                        fontWeight: 700,
                        color: '#b45309',
                        padding: '6px 8px',
                        border: '1px solid #cbd5e1',
                        borderRadius: 6,
                        background: '#ffffff'
                      }}
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Bottom Full-Width Section (Matches Image 3) */}
          <div style={{
            background: '#f8fafc',
            padding: 10,
            borderRadius: 8,
            border: '1px solid #e2e8f0',
            display: 'flex',
            flexDirection: 'column',
            gap: 8
          }}>
            {isLeave ? (
              <>
                {studentMatch && (
                  <div style={{
                    fontSize: 11,
                    padding: '5px 8px',
                    borderRadius: 6,
                    background: studentMatch.isExact ? '#ecfdf5' : '#fefce8',
                    color: studentMatch.isExact ? '#065f46' : '#92400e',
                    border: `1px solid ${studentMatch.isExact ? '#a7f3d0' : '#fef08a'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 6
                  }}>
                    <span>បញ្ជីសិស្ស៖ <strong>{studentMatch.student.name} ({studentMatch.student.grade})</strong></span>
                    {!studentMatch.isExact && (
                      <button
                        type="button"
                        onClick={handleApplyStudentMatch}
                        style={{
                          background: '#ca8a04',
                          color: '#ffffff',
                          border: 'none',
                          padding: '2px 7px',
                          borderRadius: 4,
                          fontSize: 10,
                          cursor: 'pointer',
                          fontWeight: 700,
                          flexShrink: 0
                        }}
                      >
                        យកឈ្មោះនេះ
                      </button>
                    )}
                  </div>
                )}

                {showStudentSuggestBox && (
                  <div style={{
                    padding: '8px 10px',
                    background: '#ffffff',
                    border: '1px solid #fed7aa',
                    borderRadius: 8,
                    boxShadow: '0 2px 6px rgba(180, 83, 9, 0.08)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8
                  }}>
                    {nameQuery.length === 0 ? (
                      <div style={{ fontSize: 11, color: '#92400e', fontWeight: 600 }}>
                        💡 វាយតួអក្សរដំបូង (ឧ. <strong>ច</strong>, <strong>គ</strong>, <strong>ណ</strong>...) ប្រព័ន្ធនឹង Suggest ឈ្មោះផ្ដើម និងសម្លេងស្រដៀងភ្លាមៗ
                      </div>
                    ) : (
                      <>
                        {studentSuggestions.exactMatches.length > 0 && (
                          <div>
                            <div style={{ fontSize: 11, fontWeight: 700, color: '#065f46', marginBottom: 4 }}>
                              🎯 ឈ្មោះផ្ដើម/ត្រូវនឹង «{nameQuery}»៖
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                              {studentSuggestions.exactMatches.map(s => {
                                const isSelected = leaveItem.name === s.name;
                                return (
                                  <button
                                    key={s.id || s.name}
                                    type="button"
                                    onMouseDown={e => e.preventDefault()}
                                    onClick={() => {
                                      applyLeavePatch({ name: s.name, grade: s.grade });
                                      setFocusedField(null);
                                    }}
                                    style={{
                                      fontSize: 12,
                                      padding: '4px 9px',
                                      borderRadius: 14,
                                      background: isSelected ? '#059669' : '#ecfdf5',
                                      color: isSelected ? '#ffffff' : '#065f46',
                                      border: isSelected ? '1px solid #059669' : '1px solid #a7f3d0',
                                      fontWeight: 700,
                                      cursor: 'pointer'
                                    }}
                                  >
                                    {s.name} ({s.grade === 'មត្តេយ្យ' ? 'ម' : s.grade})
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {studentSuggestions.phoneticMatches.length > 0 && (
                          <div>
                            <div style={{ fontSize: 11, fontWeight: 700, color: '#9a3412', marginBottom: 4 }}>
                              🔊 សម្លេងស្រដៀង ({studentSuggestions.similarConsonants.join(', ')})៖
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                              {studentSuggestions.phoneticMatches.map(s => {
                                const isSelected = leaveItem.name === s.name;
                                return (
                                  <button
                                    key={s.id || s.name}
                                    type="button"
                                    onMouseDown={e => e.preventDefault()}
                                    onClick={() => {
                                      applyLeavePatch({ name: s.name, grade: s.grade });
                                      setFocusedField(null);
                                    }}
                                    style={{
                                      fontSize: 12,
                                      padding: '4px 9px',
                                      borderRadius: 14,
                                      background: isSelected ? '#b45309' : '#fff7ed',
                                      color: isSelected ? '#ffffff' : '#9a3412',
                                      border: isSelected ? '1px solid #b45309' : '1px solid #fed7aa',
                                      fontWeight: 600,
                                      cursor: 'pointer'
                                    }}
                                  >
                                    {s.name} ({s.grade === 'មត្តេយ្យ' ? 'ម' : s.grade})
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>
                    📝 មូលហេតុឈប់៖
                  </label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <input
                      type="text"
                      value={leaveItem.reason || ''}
                      onFocus={() => setFocusedField('reason')}
                      onBlur={() => setTimeout(() => setFocusedField(prev => prev === 'reason' ? null : prev), 180)}
                      onChange={e => applyLeavePatch({ reason: e.target.value })}
                      placeholder="វាយមូលហេតុ ឧ. អាពាធ, ឈឺក្បាល, ទៅបុណ្យ..."
                      style={{
                        width: '100%',
                        fontSize: 14,
                        padding: '8px 34px 8px 12px',
                        border: isReasonFocused ? '1.5px solid #0f766e' : '1px solid #cbd5e1',
                        borderRadius: 6,
                        background: '#ffffff',
                        outline: 'none'
                      }}
                    />
                    {leaveItem.reason && (
                      <button
                        type="button"
                        onMouseDown={e => e.preventDefault()}
                        onClick={() => {
                          applyLeavePatch({ reason: '' });
                          setFocusedField('reason');
                        }}
                        style={{
                          position: 'absolute',
                          right: 6,
                          background: '#f1f5f9',
                          color: '#64748b',
                          border: 'none',
                          width: 22,
                          height: 22,
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          padding: 0
                        }}
                      >
                        <X size={13} />
                      </button>
                    )}
                  </div>

                  {isReasonFocused && realReasonSuggestions.length > 0 && (
                    <div style={{ marginTop: 6 }}>
                      <div style={{ fontSize: 11, color: '#475569', fontWeight: 600, marginBottom: 4 }}>
                        {reasonQuery
                          ? `💡 មូលហេតុពិតក្នុងប្រព័ន្ធដែលត្រូវនឹង «${reasonQuery}»៖`
                          : '💡 មូលហេតុធ្លាប់ប្រើពិតៗក្នុងប្រព័ន្ធ (ចុចជ្រើសរើស)៖'}
                      </div>
                      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                        {realReasonSuggestions.slice(0, 10).map(r => (
                          <button
                            key={r}
                            type="button"
                            onMouseDown={e => e.preventDefault()}
                            onClick={() => {
                              applyLeavePatch({ reason: r });
                              setFocusedField(null);
                            }}
                            style={{
                              fontSize: 11,
                              padding: '4px 9px',
                              borderRadius: 12,
                              background: leaveItem.reason === r ? '#0f766e' : '#ffffff',
                              color: leaveItem.reason === r ? '#ffffff' : '#334155',
                              border: leaveItem.reason === r ? '1px solid #0f766e' : '1px solid #cbd5e1',
                              cursor: 'pointer',
                              fontWeight: leaveItem.reason === r ? 700 : 500
                            }}
                          >
                            {r}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 3 }}>
                    ផ្សេងៗ (សម្គាល់បន្ថែម)៖
                  </label>
                  <input
                    type="text"
                    value={leaveItem.note || ''}
                    onChange={e => applyLeavePatch({ note: e.target.value })}
                    placeholder="សម្គាល់ផ្សេងៗ..."
                    style={{
                      width: '100%',
                      fontSize: 13,
                      padding: '7px 10px',
                      border: '1px solid #cbd5e1',
                      borderRadius: 6,
                      background: '#ffffff'
                    }}
                  />
                </div>
              </>
            ) : (
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>
                  ឈ្មោះឥវ៉ាន់ / បរិយាយ៖
                </label>
                <input
                  type="text"
                  value={financeItem.desc || ''}
                  onChange={e => applyFinancePatch({ desc: e.target.value })}
                  placeholder="ឧ. សាំង, ក្តារឈើ, សម្ភារៈ..."
                  style={{
                    width: '100%',
                    fontSize: 14,
                    fontWeight: 600,
                    padding: '8px 12px',
                    border: '1px solid #cbd5e1',
                    borderRadius: 6,
                    background: '#ffffff'
                  }}
                />
              </div>
            )}
          </div>

          {/* Bottom Action Button */}
          <button
            type="button"
            onClick={handleConfirm}
            style={{
              width: '100%',
              background: '#0f766e',
              color: '#ffffff',
              border: 'none',
              padding: '11px 16px',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(15,118,110,0.25)'
            }}
          >
            <span>✓ បញ្ចូលក្នុងតារាង</span>
          </button>
        </div>
      </div>
    );
  }

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
                    onClick={() => switchDocType('leave')}
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
                    onClick={() => switchDocType('finance')}
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

              {docType === 'leave' ? (
                <div>
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

                  {(() => {
                    const isNameFocused = focusedField === 'name';
                    const isReasonFocused = focusedField === 'reason';
                    const nameQuery = String(leaveItem.name || '').trim();
                    const reasonQuery = String(leaveItem.reason || '').trim();

                    const studentSuggestions = getPhoneticStudentSuggestions(nameQuery, studentMaster);
                    const hasStudentSuggestions = studentSuggestions.exactMatches.length > 0 || studentSuggestions.phoneticMatches.length > 0;
                    const showStudentSuggestBox = (isNameFocused || !studentMatch?.isExact) && (nameQuery.length > 0 ? hasStudentSuggestions : isNameFocused);

                    const realReasonSuggestions = isReasonFocused
                      ? getRealReasonSuggestions(reasonQuery, { allLeaves, trainingDataset, queue })
                      : [];

                    return (
                      <>
                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10, marginBottom: 10 }}>
                          <div>
                            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>
                              គោត្តនាម-និងនាម (ឈ្មោះសិស្ស)៖
                            </label>
                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                              <input
                                type="text"
                                value={leaveItem.name}
                                onFocus={() => setFocusedField('name')}
                                onBlur={() => setTimeout(() => setFocusedField(prev => prev === 'name' ? null : prev), 180)}
                                onChange={e => applyLeavePatch({ name: e.target.value })}
                                placeholder="វាយអក្សរផ្ដើម ឧ. ច, ឆ, គ, ណ..."
                                style={{
                                  width: '100%',
                                  fontSize: 14,
                                  fontWeight: 600,
                                  padding: '8px 32px 8px 10px',
                                  borderColor: '#b45309'
                                }}
                              />
                              {leaveItem.name && (
                                <button
                                  type="button"
                                  onMouseDown={e => e.preventDefault()}
                                  onClick={() => {
                                    applyLeavePatch({ name: '' });
                                    setFocusedField('name');
                                  }}
                                  style={{
                                    position: 'absolute',
                                    right: 6,
                                    background: '#f1f5f9',
                                    color: '#64748b',
                                    border: 'none',
                                    width: 20,
                                    height: 20,
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    padding: 0
                                  }}
                                  title="លុបឈ្មោះ"
                                >
                                  <X size={12} />
                                </button>
                              )}
                            </div>
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>
                              ថ្នាក់ទី៖
                            </label>
                            <select
                              value={leaveItem.grade}
                              onChange={e => applyLeavePatch({ grade: e.target.value })}
                              style={{ width: '100%', fontSize: 14, fontWeight: 600, padding: '8px 10px' }}
                            >
                              <option value="មត្តេយ្យ">មត្តេយ្យ</option>
                              <option value="១">ថ្នាក់ទី ១</option>
                              <option value="២">ថ្នាក់ទី ២</option>
                              <option value="៣">ថ្នាក់ទី ៣</option>
                            </select>
                          </div>
                        </div>

                        {showStudentSuggestBox && (
                          <div style={{
                            marginBottom: 12,
                            padding: '8px 10px',
                            background: '#fffbeb',
                            border: '1px solid #fed7aa',
                            borderRadius: 8,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 6
                          }}>
                            {nameQuery.length === 0 ? (
                              <div style={{ fontSize: 11, color: '#92400e', fontWeight: 600 }}>
                                💡 វាយតួអក្សរដំបូង (ឧ. <strong>ច</strong>, <strong>គ</strong>, <strong>ណ</strong>...) ប្រព័ន្ធនឹង Suggest ឈ្មោះផ្ដើម និងសម្លេងស្រដៀងភ្លាមៗ
                              </div>
                            ) : (
                              <>
                                {studentSuggestions.exactMatches.length > 0 && (
                                  <div>
                                    <div style={{ fontSize: 11, fontWeight: 700, color: '#065f46', marginBottom: 4 }}>
                                      🎯 ឈ្មោះផ្ដើម/ត្រូវនឹង «{nameQuery}»៖
                                    </div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                                      {studentSuggestions.exactMatches.map(s => {
                                        const isSelected = leaveItem.name === s.name;
                                        return (
                                          <button
                                            key={s.id || s.name}
                                            type="button"
                                            onMouseDown={e => e.preventDefault()}
                                            onClick={() => {
                                              applyLeavePatch({ name: s.name, grade: s.grade });
                                              setFocusedField(null);
                                            }}
                                            style={{
                                              fontSize: 11,
                                              padding: '3px 9px',
                                              borderRadius: 12,
                                              background: isSelected ? '#059669' : '#ecfdf5',
                                              color: isSelected ? '#ffffff' : '#065f46',
                                              border: isSelected ? '1px solid #059669' : '1px solid #a7f3d0',
                                              fontWeight: 700,
                                              cursor: 'pointer'
                                            }}
                                          >
                                            {s.name} ({s.grade === 'មត្តេយ្យ' ? 'ម' : s.grade})
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}

                                {studentSuggestions.phoneticMatches.length > 0 && (
                                  <div>
                                    <div style={{ fontSize: 11, fontWeight: 700, color: '#9a3412', marginBottom: 4 }}>
                                      🔊 សម្លេងស្រដៀង ({studentSuggestions.similarConsonants.join(', ')})៖
                                    </div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                                      {studentSuggestions.phoneticMatches.map(s => {
                                        const isSelected = leaveItem.name === s.name;
                                        return (
                                          <button
                                            key={s.id || s.name}
                                            type="button"
                                            onMouseDown={e => e.preventDefault()}
                                            onClick={() => {
                                              applyLeavePatch({ name: s.name, grade: s.grade });
                                              setFocusedField(null);
                                            }}
                                            style={{
                                              fontSize: 11,
                                              padding: '3px 9px',
                                              borderRadius: 12,
                                              background: isSelected ? '#b45309' : '#ffffff',
                                              color: isSelected ? '#ffffff' : '#9a3412',
                                              border: isSelected ? '1px solid #b45309' : '1px solid #fed7aa',
                                              fontWeight: 600,
                                              cursor: 'pointer'
                                            }}
                                          >
                                            {s.name} ({s.grade === 'មត្តេយ្យ' ? 'ម' : s.grade})
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        )}

                        <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 11, color: '#64748b', alignSelf: 'center' }}>រើសថ្នាក់រហ័ស៖</span>
                          {['មត្តេយ្យ', '១', '២', '៣'].map(g => (
                            <button
                              key={g}
                              type="button"
                              onClick={() => applyLeavePatch({ grade: g })}
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
                          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                            <input
                              type="text"
                              value={leaveItem.reason}
                              onFocus={() => setFocusedField('reason')}
                              onBlur={() => setTimeout(() => setFocusedField(prev => prev === 'reason' ? null : prev), 180)}
                              onChange={e => applyLeavePatch({ reason: e.target.value })}
                              placeholder="វាយមូលហេតុ ឧ. អាពាធ, ឈឺក្បាល, ទៅបុណ្យ..."
                              style={{ width: '100%', fontSize: 13, padding: '8px 32px 8px 10px' }}
                            />
                            {leaveItem.reason && (
                              <button
                                type="button"
                                onMouseDown={e => e.preventDefault()}
                                onClick={() => {
                                  applyLeavePatch({ reason: '' });
                                  setFocusedField('reason');
                                }}
                                style={{
                                  position: 'absolute',
                                  right: 6,
                                  background: '#f1f5f9',
                                  color: '#64748b',
                                  border: 'none',
                                  width: 20,
                                  height: 20,
                                  borderRadius: '50%',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  cursor: 'pointer',
                                  padding: 0
                                }}
                                title="លុបមូលហេតុ"
                              >
                                <X size={12} />
                              </button>
                            )}
                          </div>
                          {isReasonFocused && realReasonSuggestions.length > 0 && (
                            <div style={{ marginTop: 6 }}>
                              <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginBottom: 4 }}>
                                {reasonQuery
                                  ? `💡 មូលហេតុពិតក្នុងប្រព័ន្ធដែលត្រូវនឹង «${reasonQuery}»៖`
                                  : '💡 មូលហេតុធ្លាប់ប្រើពិតៗក្នុងប្រព័ន្ធ (ចុចជ្រើសរើស)៖'}
                              </div>
                              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                {realReasonSuggestions.slice(0, 10).map(r => (
                                  <button
                                    key={r}
                                    type="button"
                                    onMouseDown={e => e.preventDefault()}
                                    onClick={() => {
                                      applyLeavePatch({ reason: r });
                                      setFocusedField(null);
                                    }}
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
                          )}
                        </div>
                      </>
                    );
                  })()}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                    {(() => {
                      const durationInfo = getDurationSuggestions(leaveItem.duration);
                      const applyDuration = (val) => applyLeavePatch({ duration: val });
                      return (
                        <div>
                          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>
                            ចំនួនថ្ងៃឈប់៖ <span style={{ fontWeight: 500, fontSize: 10, color: '#64748b' }}>(ឧ. 1, 1.5, 1a, 1p)</span>
                          </label>
                          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                            <input
                              type="text"
                              value={leaveItem.duration ?? ''}
                              onFocus={() => setFocusedField('duration')}
                              onBlur={() => {
                                const formatted = parseDurationShorthand(leaveItem.duration) || '១ថ្ងៃ';
                                if (formatted !== leaveItem.duration) {
                                  applyDuration(formatted);
                                }
                                setTimeout(() => setFocusedField(prev => prev === 'duration' ? null : prev), 150);
                              }}
                              onKeyDown={e => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  const formatted = parseDurationShorthand(leaveItem.duration) || '១ថ្ងៃ';
                                  applyDuration(formatted);
                                  e.target.blur();
                                }
                              }}
                              onChange={e => applyDuration(e.target.value)}
                              placeholder="ឧ. 1, 1.5, 1a, 1p..."
                              style={{ width: '100%', fontSize: 13, fontWeight: 600, padding: '8px 28px 8px 10px' }}
                            />
                            {leaveItem.duration && (
                              <button
                                type="button"
                                onMouseDown={e => e.preventDefault()}
                                onClick={() => {
                                  applyDuration('');
                                  setFocusedField('duration');
                                }}
                                style={{
                                  position: 'absolute',
                                  right: 5,
                                  background: '#f1f5f9',
                                  color: '#64748b',
                                  border: 'none',
                                  width: 18,
                                  height: 18,
                                  borderRadius: '50%',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  cursor: 'pointer',
                                  padding: 0
                                }}
                                title="លុបរយៈពេល"
                              >
                                <X size={11} />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>
                        កាលបរិច្ឆេទ (ថ្ងៃខែចាប់ផ្ដើម)៖
                      </label>
                      <input
                        type="text"
                        value={leaveItem.date}
                        onChange={e => applyLeavePatch({ date: e.target.value })}
                        onBlur={e => applyLeavePatch({ date: sanitizeLeaveDate(e.target.value) })}
                        placeholder="DD/MM/YYYY"
                        style={{ width: '100%', fontSize: 13, padding: '8px 10px' }}
                      />
                    </div>
                  </div>

                  <div style={{ marginBottom: 12 }}>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>
                      ផ្សេងៗ (សម្គាល់បន្ថែម)៖
                    </label>
                    <input
                      type="text"
                      value={leaveItem.note}
                      onChange={e => applyLeavePatch({ note: e.target.value })}
                      style={{ width: '100%', fontSize: 12, padding: '6px 10px' }}
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                      ប្រភេទហិរញ្ញវត្ថុ៖
                    </label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        type="button"
                        onClick={() => applyFinancePatch({ category: 'expense' })}
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
                        onClick={() => applyFinancePatch({ category: 'income' })}
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
                      onChange={e => applyFinancePatch({ desc: e.target.value })}
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
                        onChange={e => applyFinancePatch({ qty: e.target.value })}
                        placeholder="ឧ. 1 ម៉ាស៊ីន, 3 លីត្រ..."
                        style={{ width: '100%', fontSize: 13 }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                        <span>តម្លៃរាយ ({getCurrencySymbol(financeItem.currency)})៖</span>
                        <CurrencyToggle
                          value={financeItem.currency}
                          onChange={cur => applyFinancePatch({ currency: cur })}
                        />
                      </label>
                      <input
                        type="number"
                        value={financeItem.unitPrice}
                        onChange={e => applyFinancePatch({ unitPrice: e.target.value })}
                        style={{ width: '100%', fontSize: 13 }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                        តម្លៃសរុប ({getCurrencySymbol(financeItem.currency)})៖
                      </label>
                      <input
                        type="number"
                        value={financeItem.total}
                        onChange={e => applyFinancePatch({ total: e.target.value })}
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
                        onChange={e => applyFinancePatch({ note: e.target.value })}
                        style={{ width: '100%', fontSize: 13 }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

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
