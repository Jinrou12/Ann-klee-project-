import React, { useState, useEffect, useMemo } from 'react';
import { Camera, Upload, Trash2, CheckCircle2, Sparkles, RefreshCw, ZoomIn, X, RotateCw, ArrowRight, AlertTriangle } from 'lucide-react';
import { matchStudentName, getPhoneticStudentSuggestions, getRealReasonSuggestions } from '../utils/studentMaster';
import { parseDurationShorthand, getDurationSuggestions, toArabicDigits, sumByCurrency, formatCurrencyTotals, getCurrencySymbol, normalizeCurrency } from '../utils/khmerNumerals';
import { getStoredTrainingDataset, INITIAL_LEAVE_DATA } from '../utils/storage';
import ReviewModal from './ReviewModal';
import CurrencyToggle from './CurrencyToggle';
import OcrNameReviewHint from './OcrNameReviewHint';

// Keep typed amounts as raw text (so "12." / "12.5" for USD cents can be typed), Khmer digits -> Arabic
const sanitizeAmountInput = (raw) => toArabicDigits(String(raw ?? '')).replace(/[^0-9.]/g, '');

export default function UploadSection({
  queue = [],
  studentMaster = [],
  allLeaves = INITIAL_LEAVE_DATA,
  onAddToQueue,
  onRemoveFromQueue,
  onClearQueue,
  onProcessQueue,
  onUpdateQueueItem,
  onRotateQueueItem,
  onRetakeQueueItem,
  onApproveItem,
  onApproveAll,
  isProcessing = false,
  isMobile = false
}) {
  const docTypeHint = 'auto';
  const [selectedReviewIndex, setSelectedReviewIndex] = useState(null);
  const [focusedField, setFocusedField] = useState(null); // { itemId, field: 'name' | 'reason' }
  const trainingDataset = useMemo(() => getStoredTrainingDataset(), [queue.length]);
  const selectedReviewItem = selectedReviewIndex !== null ? queue[selectedReviewIndex] : null;
  const hasPrev = selectedReviewIndex !== null && selectedReviewIndex > 0;
  const hasNext = selectedReviewIndex !== null && selectedReviewIndex < queue.length - 1;

  const handleNavigatePrev = () => {
    if (hasPrev) setSelectedReviewIndex(idx => idx - 1);
  };

  const handleNavigateNext = () => {
    if (hasNext) setSelectedReviewIndex(idx => idx + 1);
  };

  const handleFiles = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      onAddToQueue(files, docTypeHint);
      e.target.value = '';
    }
  };

  const handleLoadSample = (sampleType) => {
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 800;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, 600, 800);
    ctx.fillStyle = '#78350f';
    ctx.font = '24px Kantumruy Pro, sans-serif';
    ctx.fillText('សាលាពុទ្ធិកបឋមសិក្សា', 160, 60);

    if (sampleType === 'leave') {
      ctx.fillStyle = '#0f172a';
      ctx.font = '20px Kantumruy Pro, sans-serif';
      ctx.fillText('ក្រដាសសុំច្បាប់សមណសិស្ស', 180, 110);
      ctx.font = '16px Kantumruy Pro, sans-serif';
      ctx.fillText('ឈ្មោះ៖ រស់ ណារ៉ាន់ (សរសេរដៃ)', 80, 180);
      ctx.fillText('ថ្នាក់ទី៖ ៣', 80, 220);
      ctx.fillText('មូលហេតុ៖ អាពាធ គ្រុនក្ដៅ', 80, 260);
      ctx.fillText('ចំនួន៖ ១ថ្ងៃ  (០៦/០៧/២០២៦)', 80, 300);
    } else {
      ctx.fillStyle = '#0f172a';
      ctx.font = '20px Kantumruy Pro, sans-serif';
      ctx.fillText('វិក្កយបត្រចំណាយ / ប៉ុងលុយ', 180, 110);
      ctx.font = '16px Kantumruy Pro, sans-serif';
      ctx.fillText('ទំនិញ៖ សាំងក្រអូប -802', 80, 180);
      ctx.fillText('ចំនួន៖ 3 លីត្រ', 80, 220);
      ctx.fillText('តម្លៃរាយ៖ ៨ ០៨៤៛', 80, 260);
      ctx.fillText('សរុប៖ ២៤ ២៥៣៛', 80, 300);
    }

    canvas.toBlob((blob) => {
      const file = new File([blob], sampleType === 'leave' ? 'គំរូ_ក្រដាសច្បាប់_រស់ណារ៉ាន់.jpg' : 'គំរូ_ប៉ុងចំណាយ_សាំងក្រអូប.jpg', { type: 'image/jpeg' });
      onAddToQueue([file], sampleType);
    }, 'image/jpeg');
  };

  const processedItems = queue.filter(q => q.status === 'processed');
  const hasActiveScanning = queue.some(q => q.status === 'pending' || q.status === 'processing');

  const getScanCountdownInfo = (item) => {
    if (item.scanStage === 'orient') {
      return {
        stepBadge: '1/3',
        mobileText: 'រៀបចំរូបភាព (1/3)...',
        pcText: '⏳ កំពុងរៀបចំរូបភាព (1/3)...'
      };
    }
    if (item.scanStage === 'match') {
      return {
        stepBadge: '3/3',
        mobileText: 'ផ្ទៀងឈ្មោះសិស្ស (3/3)...',
        pcText: '⏳ កំពុងផ្ទៀងឈ្មោះសិស្ស (3/3)...'
      };
    }
    return {
      stepBadge: '2/3',
      mobileText: 'កំពុងអានអក្សរ (2/3)...',
      pcText: '⏳ កំពុងអានអក្សរដោយ AI (2/3)...'
    };
  };

  return (
    <div className="no-print">
      {/* Upload Box & Controls */}
      <div className="app-card" style={{ padding: isMobile ? '16px 12px' : 24, textAlign: 'center', background: '#ffffff', marginBottom: 20 }}>
        {!isMobile ? (
          <div className="hide-on-mobile" style={{ marginBottom: 16 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: '#0f172a' }}>
              បញ្ចូលរូបថតក្រដាសសុំច្បាប់ ឬប៉ុងចំណាយ (Smart Auto-Detect Scan)
            </h2>
            <p style={{ fontSize: 13, color: '#64748b', maxWidth: 650, margin: '0 auto' }}>
              បងអាចថតរូបផ្ទាល់ ឬ Upload រូបថតក្រដាសសុំច្បាប់ និងប៉ុងចំណាយ-ចំណូល — <strong>ប្រព័ន្ធ AI នឹង Auto-Detect ចែកបន្ទប់ស្វ័យប្រវត្តិតាមប្រភេទឯកសារភ្លាមៗ!</strong>
            </p>
          </div>
        ) : (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>
              ថតរូប ឬបញ្ចូលឯកសារ (Auto-detect)
            </div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
              ស្គាល់ទាំងក្រដាសសុំច្បាប់ (PDF 2) និងប៉ុងចំណាយ (PDF 1)
            </div>
          </div>
        )}

        {/* Drag Drop Area */}
        <div style={{
          border: '2px dashed #cbd5e1',
          borderRadius: 12,
          padding: '24px 20px',
          background: '#f8fafc',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12
        }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
            {/* File Upload Button */}
            <label style={{
              background: '#b45309',
              color: '#ffffff',
              padding: '10px 20px',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: '0 2px 6px rgba(180,83,9,0.3)'
            }}>
              <Upload size={18} />
              <span>ជ្រើសរើសរូបថត (ម្តងច្រើនសន្លឹក)</span>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleFiles}
                style={{ display: 'none' }}
              />
            </label>

            {/* Camera Snap Button */}
            <label style={{
              background: '#0f766e',
              color: '#ffffff',
              padding: '10px 20px',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: '0 2px 6px rgba(15,118,110,0.3)'
            }}>
              <Camera size={18} />
              <span>ថតរូបភ្លាមៗ (Camera)</span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFiles}
                style={{ display: 'none' }}
              />
            </label>
          </div>

          {isMobile && (
            <div style={{
              fontSize: 11,
              color: '#475569',
              background: '#f1f5f9',
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              padding: '6px 10px',
              lineHeight: 1.45,
              maxWidth: 420
            }}>
              📐 <strong>ទម្រង់ថត៖</strong> (១) ថតបញ្ឈរពេញសន្លឹក ឬ (២) ថតពាក់កណ្ដាលខាងលើ (ក្បាលលិខិតនៅខាងស្ដាំ) • ផ្អៀងទូរសព្ទបន្តិច
            </div>
          )}

          <span style={{ fontSize: 12, color: '#94a3b8' }}>
            ឬចុចសាកល្បង៖{' '}
            <button
              onClick={() => handleLoadSample('leave')}
              style={{ background: 'none', border: 'none', color: '#b45309', textDecoration: 'underline', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
            >
              + គំរូច្បាប់សិស្ស
            </button>
            {' • '}
            <button
              onClick={() => handleLoadSample('finance')}
              style={{ background: 'none', border: 'none', color: '#0f766e', textDecoration: 'underline', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
            >
              + គំរូប៉ុងចំណាយ
            </button>
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* INLINE EXTRACTED REVIEW LIST (NO POPUP MODAL! SIDE-BY-SIDE INLINE TABLE) */}
      {/* ========================================================================= */}
      {queue.length > 0 && (
        <div className="app-card" style={{ padding: isMobile ? '12px 10px' : 20, background: '#ffffff', border: '1px solid #e2e8f0' }}>
          {/* Header Controls */}
          {isMobile ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              marginBottom: 14,
              borderBottom: '2px solid #f1f5f9',
              paddingBottom: 12
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: '#0f172a' }}>
                    📋 ឯកសារស្កេនបាន ({queue.length})
                  </h3>
                  <span style={{
                    background: hasActiveScanning ? '#eff6ff' : '#ecfdf5',
                    color: hasActiveScanning ? '#1d4ed8' : '#065f46',
                    border: `1px solid ${hasActiveScanning ? '#bfdbfe' : '#a7f3d0'}`,
                    padding: '2px 8px',
                    borderRadius: 20,
                    fontSize: 11,
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4
                  }}>
                    {hasActiveScanning && (
                      <RefreshCw size={10} className="spin" />
                    )}
                    <span>{processedItems.length}/{queue.length} រួចរាល់</span>
                  </span>
                </div>

                <button
                  type="button"
                  onClick={onClearQueue}
                  style={{
                    background: '#f1f5f9',
                    color: '#475569',
                    border: '1px solid #e2e8f0',
                    padding: '6px 10px',
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  សម្អាតទាំងអស់
                </button>
              </div>

              {processedItems.length > 0 && (
                <button
                  type="button"
                  onClick={onApproveAll}
                  style={{
                    width: '100%',
                    background: '#15803d',
                    color: '#ffffff',
                    border: 'none',
                    padding: '10px 16px',
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(21, 128, 61, 0.25)'
                  }}
                >
                  <CheckCircle2 size={16} />
                  <span>✓ យល់ព្រមបញ្ចូលទាំងអស់ ({processedItems.length})</span>
                </button>
              )}
            </div>
          ) : (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 16,
              flexWrap: 'wrap',
              gap: 10,
              borderBottom: '2px solid #f1f5f9',
              paddingBottom: 14
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: '#0f172a' }}>
                  📋 បញ្ជីឯកសារស្កេនបាន ({queue.length})
                </h3>
                <span style={{
                  background: hasActiveScanning ? '#eff6ff' : '#ecfdf5',
                  color: hasActiveScanning ? '#1d4ed8' : '#065f46',
                  border: `1px solid ${hasActiveScanning ? '#bfdbfe' : '#a7f3d0'}`,
                  padding: '3px 10px',
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5
                }}>
                  {hasActiveScanning && (
                    <RefreshCw size={11} className="spin" />
                  )}
                  <span>{processedItems.length} / {queue.length} ស្រង់រួចរាល់</span>
                </span>
                <span style={{ fontSize: 12, color: '#64748b' }}>
                  (បងអាចពិនិត្យរូបថត និងកែសម្រួលអក្សរផ្ទាល់ដៃនៅទីនេះបានភ្លាមៗ)
                </span>
              </div>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  onClick={onClearQueue}
                  style={{
                    background: '#f1f5f9',
                    color: '#64748b',
                    border: 'none',
                    padding: '7px 12px',
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  សម្អាតទាំងអស់
                </button>

                {processedItems.length > 0 && (
                  <button
                    onClick={onApproveAll}
                    style={{
                      background: '#15803d',
                      color: '#ffffff',
                      border: 'none',
                      padding: '8px 18px',
                      borderRadius: 6,
                      fontSize: 13,
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      cursor: 'pointer',
                      boxShadow: '0 2px 6px rgba(21, 128, 61, 0.3)'
                    }}
                  >
                    <CheckCircle2 size={16} />
                    <span>✓ យល់ព្រមបញ្ចូលទាំងអស់ ({processedItems.length})</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* List of Inline Extracted Rows */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {queue.map((item, index) => {
              const resultData = item.processedData?.result || item.processedData || {};
              const rawDetectedType = item.processedData?.detectedType || resultData.detectedType || item.docTypeHint || 'leave';
              const detectedType = rawDetectedType === 'auto' ? 'leave' : rawDetectedType;
              const isLeave = detectedType === 'leave';
              const isPending = item.status === 'pending' || item.status === 'processing';
              const scanCountdown = item.status === 'processing' ? getScanCountdownInfo(item) : null;
              const processingMode = item.processedData?.rawScan?.processingMode || item.processedData?.processingMode || (resultData.isLearnedMemory ? 'ai_flywheel_memory' : 'gemini_cloud');
              const isLearnedMemory = processingMode === 'ai_flywheel_memory' || Boolean(resultData.isLearnedMemory);
              const isCloudScan = !isPending && (processingMode === 'gemini_cloud' || isLearnedMemory || item.status === 'processed');

              // Leave fields
              const leaveItem = item.processedData?.leaveItems?.[0] || resultData.leaveItems?.[0] || {
                name: '',
                grade: '៣',
                reason: 'ការងារផ្ទាល់ខ្លួន',
                duration: '១ថ្ងៃ',
                date: new Date().toLocaleDateString('en-GB'),
                note: ''
              };

              // Finance fields
              const rawFinances = item.processedData?.financeItems || resultData.financeItems || [];
              const hasMultipleFinances = Array.isArray(rawFinances) && rawFinances.length > 1;
              const financeItem = rawFinances[0] || {
                category: 'expense',
                desc: '',
                qty: '1',
                unitPrice: 0,
                total: 0,
                currency: 'KHR',
                note: ''
              };
              // Multi-currency grand total: "47,350៛" / "$12.50" / "47,350៛ + $12.50"
              const grandFinanceTotals = sumByCurrency(hasMultipleFinances ? rawFinances : [financeItem]);
              const grandFinanceTotalLabel = formatCurrencyTotals(grandFinanceTotals, false);

              // Detected Dual Currency & Exchange Rate metadata from OCR
              const detectedExchangeRate = Number(item.processedData?.exchangeRate) || 0;
              const detectedGrandTotalKhr = Number(item.processedData?.grandTotalKhr) || 0;
              const detectedGrandTotalUsd = Number(item.processedData?.grandTotalUsd) || 0;
              const detectedSeller = item.processedData?.seller || '';
              const detectedInvoiceNo = item.processedData?.invoiceNo || '';

              const convertAllFinanceCurrency = (targetCurrency) => {
                const currentList = Array.isArray(item.processedData?.financeItems) && item.processedData.financeItems.length > 0
                  ? [...item.processedData.financeItems]
                  : [{ ...financeItem }];
                const rate = detectedExchangeRate || 4055;
                const updatedList = currentList.map(it => {
                  const cur = it.currency || 'USD';
                  if (cur === targetCurrency) return it;
                  if (targetCurrency === 'KHR') {
                    const newPrice = Math.round((Number(it.unitPrice) || 0) * rate);
                    const newTotal = Math.round((Number(it.total) || 0) * rate);
                    return { ...it, currency: 'KHR', unitPrice: newPrice, total: newTotal };
                  } else {
                    const newPrice = Math.round(((Number(it.unitPrice) || 0) / rate) * 100) / 100;
                    const newTotal = Math.round(((Number(it.total) || 0) / rate) * 100) / 100;
                    return { ...it, currency: 'USD', unitPrice: newPrice, total: newTotal };
                  }
                });
                const updated = {
                  ...item.processedData,
                  detectedType: 'finance',
                  financeItems: updatedList
                };
                onUpdateQueueItem(item.id, { processedData: updated });
              };

              // Student match suggestion
              const studentMatch = isLeave ? matchStudentName(leaveItem.name, studentMaster) : null;

              const updateLeaveField = (field, val) => {
                const updated = {
                  ...item.processedData,
                  detectedType: 'leave',
                  leaveItems: [{ ...leaveItem, [field]: val }]
                };
                onUpdateQueueItem(item.id, { processedData: updated });
              };

              const updateLeaveFields = (patch) => {
                const updated = {
                  ...item.processedData,
                  detectedType: 'leave',
                  leaveItems: [{ ...leaveItem, ...patch }]
                };
                onUpdateQueueItem(item.id, { processedData: updated });
              };

              const updateFinanceField = (field, val, itemIdx = 0) => {
                const currentList = Array.isArray(item.processedData?.financeItems) && item.processedData.financeItems.length > 0
                  ? [...item.processedData.financeItems]
                  : [{ ...financeItem }];
                currentList[itemIdx] = { ...(currentList[itemIdx] || financeItem), [field]: val };
                const updated = {
                  ...item.processedData,
                  detectedType: 'finance',
                  financeItems: currentList
                };
                onUpdateQueueItem(item.id, { processedData: updated });
              };

              const switchType = (type) => {
                const updated = {
                  ...item.processedData,
                  detectedType: type
                };
                if (type === 'leave' && (!updated.leaveItems || updated.leaveItems.length === 0)) {
                  updated.leaveItems = [{
                    name: '',
                    grade: '៣',
                    reason: '',
                    duration: '១ថ្ងៃ',
                    date: new Date().toLocaleDateString('en-GB'),
                    note: ''
                  }];
                }
                if (type === 'finance' && (!updated.financeItems || updated.financeItems.length === 0)) {
                  updated.financeItems = [{
                    category: 'expense',
                    desc: '',
                    qty: '1',
                    unitPrice: 0,
                    total: 0,
                    currency: 'KHR',
                    note: ''
                  }];
                }
                onUpdateQueueItem(item.id, { processedData: updated });
              };

              if (isMobile) {
                const isUnrecognized =
                  item.status === 'unrecognized' ||
                  Boolean(item.processedData?.unrecognizedFormat || resultData.unrecognizedFormat);
                const isNameFocused = focusedField?.itemId === item.id && focusedField?.field === 'name';
                const isReasonFocused = focusedField?.itemId === item.id && focusedField?.field === 'reason';
                const isDurationFocused = focusedField?.itemId === item.id && focusedField?.field === 'duration';
                const nameQuery = String(leaveItem.name || '').trim();
                const reasonQuery = String(leaveItem.reason || '').trim();

                const studentSuggestions = isLeave
                  ? getPhoneticStudentSuggestions(nameQuery, studentMaster)
                  : { exactMatches: [], phoneticMatches: [], similarConsonants: [] };
                const hasStudentSuggestions =
                  studentSuggestions.exactMatches.length > 0 || studentSuggestions.phoneticMatches.length > 0;
                const showStudentSuggestBox =
                  isLeave &&
                  !isUnrecognized &&
                  (isNameFocused || !studentMatch?.isExact) &&
                  (nameQuery.length > 0 ? hasStudentSuggestions : isNameFocused);

                const realReasonSuggestions = (isLeave && isReasonFocused)
                  ? getRealReasonSuggestions(reasonQuery, {
                    allLeaves,
                    trainingDataset,
                    queue
                  })
                  : [];

                return (
                  <div
                    key={item.id}
                    style={{
                      border: isUnrecognized ? '1.5px solid #fca5a5' : '1px solid #cbd5e1',
                      borderRadius: 12,
                      padding: 12,
                      background: isUnrecognized ? '#fffafa' : '#ffffff',
                      boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 10
                    }}
                  >
                    {/* Top Row: Document Type Segmented Switcher */}
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
                        onClick={() => switchType('leave')}
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
                        onClick={() => switchType('finance')}
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

                    {/* Middle Split Section: Left Portrait A4 Image (115px) + Right Primary Fields (1fr) */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '115px 1fr',
                      gap: 10,
                      alignItems: 'start'
                    }}>
                      {/* Left Column: Image 3 Style Dark Frame Thumbnail (#1, Rotate, Zoom) */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, width: 115 }}>
                        <div
                          onClick={() => setSelectedReviewIndex(index)}
                          style={{
                            width: 115,
                            height: 148,
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
                          {item.previewUrl ? (
                            <img
                              src={item.previewUrl}
                              alt={item.fileName}
                              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                            />
                          ) : (
                            <span style={{ color: '#94a3b8', fontSize: 11 }}>គ្មានរូបភាព</span>
                          )}

                          <span style={{
                            position: 'absolute',
                            top: 5,
                            left: 5,
                            background: 'rgba(0,0,0,0.75)',
                            color: '#ffffff',
                            fontSize: 10,
                            padding: '2px 6px',
                            borderRadius: 4,
                            fontWeight: 700
                          }}>
                            #{index + 1}
                          </span>

                          {onRotateQueueItem && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onRotateQueueItem(item.id, 90);
                              }}
                              title="បង្វិលរូប 90°"
                              style={{
                                position: 'absolute',
                                top: 5,
                                right: 5,
                                background: 'rgba(15, 23, 42, 0.78)',
                                color: '#ffffff',
                                border: '1px solid rgba(255,255,255,0.25)',
                                borderRadius: 4,
                                padding: '3px 5px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer'
                              }}
                            >
                              <RotateCw size={11} />
                            </button>
                          )}

                          <div style={{
                            position: 'absolute',
                            bottom: 5,
                            right: 5,
                            background: 'rgba(0,0,0,0.72)',
                            color: '#ffffff',
                            padding: '3px 6px',
                            borderRadius: 4,
                            fontSize: 10,
                            fontWeight: 600,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 3
                          }}>
                            <ZoomIn size={11} />
                            <span>ពង្រីក</span>
                          </div>
                        </div>

                        <div style={{
                          fontSize: 10,
                          color: '#64748b',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          padding: '0 2px'
                        }}>
                          {item.fileName}
                        </div>
                      </div>

                      {/* Right Column: Header (#1, AI Status, Delete) + Core Fields */}
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
                              #{index + 1}
                            </span>

                            {resultData.isOfflineNoScan ? (
                              <span
                                title={resultData.scanError || ''}
                                style={{
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
                                }}
                              >
                                <AlertTriangle size={11} color="#dc2626" />
                                <span>
                                  {(resultData.isTrulyOffline || (typeof navigator !== 'undefined' && !navigator.onLine))
                                    ? 'Offline'
                                    : 'ស្កេនមិនទាន់ចេញ'}
                                </span>
                              </span>
                            ) : isUnrecognized ? (
                              <span style={{
                                fontSize: 10,
                                padding: '2px 6px',
                                borderRadius: 6,
                                background: '#fef2f2',
                                color: '#b91c1c',
                                border: '1px solid #fecaca',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 3,
                                fontWeight: 700
                              }}>
                                <AlertTriangle size={11} color="#dc2626" />
                                <span>មិនស្គាល់ទម្រង់</span>
                              </span>
                            ) : item.status === 'error' ? (
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
                                <span>ស្កេនបរាជ័យ</span>
                              </span>
                            ) : (
                              <span style={{
                                fontSize: 10,
                                padding: '2px 6px',
                                borderRadius: 6,
                                background: item.status === 'processing'
                                  ? '#eff6ff'
                                  : item.status === 'pending'
                                    ? '#f8fafc'
                                    : (isCloudScan ? '#ecfdf5' : '#fffbeb'),
                                color: item.status === 'processing'
                                  ? '#1d4ed8'
                                  : item.status === 'pending'
                                    ? '#64748b'
                                    : (isCloudScan ? '#065f46' : '#b45309'),
                                border: `1px solid ${item.status === 'processing'
                                    ? '#bfdbfe'
                                    : item.status === 'pending'
                                      ? '#cbd5e1'
                                      : (isCloudScan ? '#a7f3d0' : '#fde68a')
                                  }`,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 3,
                                fontWeight: 600
                              }}>
                                {item.status === 'processing' ? (
                                  <RefreshCw size={11} color="#2563eb" className="spin" />
                                ) : (
                                  <Sparkles size={11} color={
                                    item.status === 'pending'
                                      ? '#94a3b8'
                                      : (isCloudScan ? '#059669' : '#d97706')
                                  } />
                                )}
                                <span>
                                  {item.status === 'processing'
                                    ? (scanCountdown ? scanCountdown.mobileText : 'កំពុងស្កេន...')
                                    : item.status === 'pending'
                                      ? 'រង់ចាំស្កេន...'
                                      : isLearnedMemory
                                        ? 'AI (ចងចាំ ១០០%)'
                                        : 'AI Vision'}
                                </span>
                              </span>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => onRemoveFromQueue(item.id)}
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
                        </div>

                        {resultData.isOfflineNoScan && resultData.scanError && !isUnrecognized && (
                          <div style={{
                            background: '#fef2f2',
                            border: '1px solid #fecaca',
                            borderRadius: 7,
                            padding: '6px 9px',
                            fontSize: 11,
                            color: '#991b1b',
                            lineHeight: 1.45,
                            fontWeight: 600
                          }}>
                            ⚠️ {resultData.scanError}
                          </div>
                        )}

                        {isUnrecognized && (
                          <div style={{
                            background: '#fef2f2',
                            border: '1px solid #fecaca',
                            borderRadius: 8,
                            padding: '8px 10px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 6
                          }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: '#991b1b', lineHeight: 1.4 }}>
                              ⚠️ ប្រព័ន្ធមិនស្គាល់ទម្រង់រូបនេះទេ
                            </div>
                            <div style={{ fontSize: 11, color: '#7f1d1d', lineHeight: 1.45 }}>
                              សូមថតតែ ២ ទម្រង់៖ <strong>(១)</strong> បញ្ឈរពេញសន្លឹក ឬ <strong>(២)</strong> ពាក់កណ្ដាលខាងលើ (ក្បាលលិខិតនៅខាងស្ដាំ)។
                            </div>
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
                              {onRetakeQueueItem && (
                                <label style={{
                                  background: '#dc2626',
                                  color: '#ffffff',
                                  padding: '5px 10px',
                                  borderRadius: 6,
                                  fontSize: 11,
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4
                                }}>
                                  <Camera size={12} />
                                  <span>ថតម្ដងទៀត</span>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    capture="environment"
                                    onChange={(e) => {
                                      const f = e.target.files?.[0];
                                      if (f) {
                                        onRetakeQueueItem(item.id, f);
                                        e.target.value = '';
                                      }
                                    }}
                                    style={{ display: 'none' }}
                                  />
                                </label>
                              )}
                              {onRotateQueueItem && (
                                <button
                                  type="button"
                                  onClick={() => onRotateQueueItem(item.id, 90)}
                                  style={{
                                    background: '#ffffff',
                                    color: '#991b1b',
                                    border: '1px solid #fca5a5',
                                    padding: '5px 10px',
                                    borderRadius: 6,
                                    fontSize: 11,
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 4
                                  }}
                                >
                                  <RotateCw size={12} />
                                  <span>បង្វិល 90°</span>
                                </button>
                              )}
                            </div>
                          </div>
                        )}

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
                                  onFocus={() => setFocusedField({ itemId: item.id, field: 'name' })}
                                  onBlur={() => setTimeout(() => setFocusedField(prev => (prev?.itemId === item.id && prev?.field === 'name') ? null : prev), 180)}
                                  onChange={e => updateLeaveFields({ name: e.target.value, needsReview: false })}
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
                                      updateLeaveField('name', '');
                                      setFocusedField({ itemId: item.id, field: 'name' });
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
                                    title="លុបឈ្មោះ"
                                  >
                                    <X size={12} />
                                  </button>
                                )}
                              </div>
                              <OcrNameReviewHint
                                leaveItem={leaveItem}
                                compact
                                onPick={(s) => updateLeaveFields({ name: s.name, grade: s.grade, needsReview: false })}
                              />
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
                                  onFocus={() => setFocusedField({ itemId: item.id, field: 'duration' })}
                                  onBlur={() => {
                                    const formatted = parseDurationShorthand(leaveItem.duration) || '១ថ្ងៃ';
                                    if (formatted !== leaveItem.duration) {
                                      updateLeaveField('duration', formatted);
                                    }
                                    setTimeout(() => setFocusedField(prev => (prev?.itemId === item.id && prev?.field === 'duration') ? null : prev), 150);
                                  }}
                                  onKeyDown={e => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      const formatted = parseDurationShorthand(leaveItem.duration) || '១ថ្ងៃ';
                                      updateLeaveField('duration', formatted);
                                      e.target.blur();
                                    }
                                  }}
                                  onChange={e => updateLeaveField('duration', e.target.value)}
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
                                      updateLeaveField('duration', '');
                                      setFocusedField({ itemId: item.id, field: 'duration' });
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
                                    title="លុបរយៈពេល"
                                  >
                                    <X size={11} />
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Row 4: Date (No Label) */}
                            <div>
                              <input
                                type="text"
                                value={leaveItem.date || ''}
                                onChange={e => updateLeaveField('date', e.target.value)}
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
                          /* Right Column when Finance Receipt is selected */
                          <>
                            <div>
                              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#1e293b', marginBottom: 2 }}>
                                ប្រភេទ៖
                              </label>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
                                <button
                                  type="button"
                                  onClick={() => updateFinanceField('category', 'expense')}
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
                                  onClick={() => updateFinanceField('category', 'income')}
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

                            {hasMultipleFinances ? (
                              <>
                                <div>
                                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#1e293b', marginBottom: 2 }}>
                                    មុខទំនិញ៖
                                  </label>
                                  <div style={{
                                    fontSize: 13,
                                    fontWeight: 700,
                                    color: '#0f766e',
                                    padding: '6px 8px',
                                    background: '#f0fdfa',
                                    border: '1px solid #ccfbf1',
                                    borderRadius: 6
                                  }}>
                                    {rawFinances.length} មុខក្នុងប៉ុង
                                  </div>
                                </div>

                                <div>
                                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#1e293b', marginBottom: 2 }}>
                                    សរុបរួម៖
                                  </label>
                                  <div style={{
                                    fontSize: 14,
                                    fontWeight: 700,
                                    color: '#b45309',
                                    padding: '6px 8px',
                                    background: '#fffbeb',
                                    border: '1px solid #fed7aa',
                                    borderRadius: 6,
                                    wordBreak: 'break-word'
                                  }}>
                                    {grandFinanceTotalLabel}
                                  </div>
                                </div>
                              </>
                            ) : (
                              <>
                                <div>
                                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#1e293b', marginBottom: 2 }}>
                                    បរិមាណ / ចំនួន៖
                                  </label>
                                  <input
                                    type="text"
                                    value={financeItem.qty || ''}
                                    onChange={e => updateFinanceField('qty', e.target.value)}
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
                                      onChange={cur => updateFinanceField('currency', cur)}
                                    />
                                  </label>
                                  <input
                                    type="text"
                                    inputMode="decimal"
                                    value={String(financeItem.total ?? '')}
                                    onChange={e => updateFinanceField('total', sanitizeAmountInput(e.target.value))}
                                    placeholder={normalizeCurrency(financeItem.currency) === 'USD' ? '0.00' : '0'}
                                    style={{
                                      width: '100%',
                                      minWidth: 0,
                                      boxSizing: 'border-box',
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
                          </>
                        )}
                      </div>
                    </div>

                    {/* Bottom Full-Width Section: Suggestions, Reason, Note */}
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
                          {/* Student Master Match Badge (if matched) */}
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
                                  onClick={() => {
                                    updateLeaveFields({
                                      name: studentMatch.student.name,
                                      grade: studentMatch.student.grade
                                    });
                                  }}
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

                          {/* Smart Student Suggestions Box (Full-Width when Name Input Focused or Unmatched) */}
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
                                                updateLeaveFields({ name: s.name, grade: s.grade, needsReview: false });
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
                                                updateLeaveFields({ name: s.name, grade: s.grade, needsReview: false });
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

                          {/* Reason (Full Width + Clear Button + 100% Real Data Suggestions) */}
                          <div>
                            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>
                              📝 មូលហេតុឈប់៖
                            </label>
                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                              <input
                                type="text"
                                value={leaveItem.reason || ''}
                                onFocus={() => setFocusedField({ itemId: item.id, field: 'reason' })}
                                onBlur={() => setTimeout(() => setFocusedField(prev => (prev?.itemId === item.id && prev?.field === 'reason') ? null : prev), 180)}
                                onChange={e => updateLeaveField('reason', e.target.value)}
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
                                    updateLeaveField('reason', '');
                                    setFocusedField({ itemId: item.id, field: 'reason' });
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
                                  title="លុបមូលហេតុ"
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
                                        updateLeaveField('reason', r);
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

                          {/* Note */}
                          <div>
                            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 3 }}>
                              ផ្សេងៗ (សម្គាល់បន្ថែម)៖
                            </label>
                            <input
                              type="text"
                              value={leaveItem.note || ''}
                              onChange={e => updateLeaveField('note', e.target.value)}
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
                        /* Bottom Full-Width Section when Finance Receipt is selected */
                        hasMultipleFinances ? (
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
                              <label style={{ fontSize: 12, fontWeight: 700, color: '#1e293b' }}>
                                📦 មុខទំនិញក្នុងប៉ុង ({rawFinances.length} មុខ)៖
                              </label>
                              <span style={{ fontSize: 12, fontWeight: 700, color: '#0f766e', background: '#f0fdfa', padding: '2px 8px', borderRadius: 6, border: '1px solid #ccfbf1' }}>
                                សរុប {grandFinanceTotalLabel}
                              </span>
                            </div>

                            {/* Dual Currency & Exchange Rate Bar */}
                            {(detectedExchangeRate > 0 || detectedGrandTotalKhr > 0) && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, padding: '5px 8px', background: '#f8fafc', borderRadius: 6, border: '1px dashed #cbd5e1', flexWrap: 'wrap' }}>
                                <span style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>
                                  💱 {detectedExchangeRate > 0 ? `អត្រា 1$ = ${detectedExchangeRate.toLocaleString()}៛` : 'រូបិយប័ណ្ណពីរ'}៖
                                </span>
                                <div style={{ display: 'flex', gap: 4 }}>
                                  <button
                                    type="button"
                                    onClick={() => convertAllFinanceCurrency('USD')}
                                    style={{
                                      padding: '2px 8px',
                                      borderRadius: 4,
                                      fontSize: 11,
                                      fontWeight: 700,
                                      background: grandFinanceTotals.USD > 0 ? '#0f766e' : '#ffffff',
                                      color: grandFinanceTotals.USD > 0 ? '#ffffff' : '#334155',
                                      border: '1px solid #0f766e',
                                      cursor: 'pointer'
                                    }}
                                    title="បម្លែងទំនិញទាំងអស់ជា USD"
                                  >
                                    💵 USD {detectedGrandTotalUsd > 0 ? `($${detectedGrandTotalUsd})` : ''}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => convertAllFinanceCurrency('KHR')}
                                    style={{
                                      padding: '2px 8px',
                                      borderRadius: 4,
                                      fontSize: 11,
                                      fontWeight: 700,
                                      background: grandFinanceTotals.KHR > 0 ? '#0f766e' : '#ffffff',
                                      color: grandFinanceTotals.KHR > 0 ? '#ffffff' : '#334155',
                                      border: '1px solid #0f766e',
                                      cursor: 'pointer'
                                    }}
                                    title="បម្លែងទំនិញទាំងអស់ជា KHR តាមអត្រាប្តូរប្រាក់"
                                  >
                                    ៛ KHR {detectedGrandTotalKhr > 0 ? `(${detectedGrandTotalKhr.toLocaleString()}៛)` : ''}
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Seller & Invoice Metadata */}
                            {(detectedSeller || detectedInvoiceNo) && (
                              <div style={{ display: 'flex', gap: 6, marginBottom: 6, flexWrap: 'wrap', fontSize: 11, color: '#475569' }}>
                                {detectedSeller && <span style={{ background: '#f1f5f9', padding: '1px 6px', borderRadius: 4, border: '1px solid #e2e8f0' }}>🏪 {detectedSeller}</span>}
                                {detectedInvoiceNo && <span style={{ background: '#f1f5f9', padding: '1px 6px', borderRadius: 4, border: '1px solid #e2e8f0' }}>📄 {detectedInvoiceNo}</span>}
                              </div>
                            )}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                              {rawFinances.map((f, fIdx) => (
                                <div key={fIdx} style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 6, padding: '6px 8px', minWidth: 0, boxSizing: 'border-box' }}>
                                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4, minWidth: 0 }}>
                                    <span style={{ background: '#0f766e', color: '#fff', fontSize: 10, fontWeight: 700, borderRadius: 4, padding: '1px 5px', flexShrink: 0 }}>
                                      #{fIdx + 1}
                                    </span>
                                    <input
                                      type="text"
                                      value={f.desc || ''}
                                      onChange={e => updateFinanceField('desc', e.target.value, fIdx)}
                                      placeholder="ឈ្មោះទំនិញ..."
                                      style={{ flex: 1, minWidth: 0, width: '100%', boxSizing: 'border-box', fontSize: 13, fontWeight: 600, padding: '4px 6px', border: '1px solid #cbd5e1', borderRadius: 4 }}
                                    />
                                  </div>
                                  <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 6 }}>
                                    <input
                                      type="text"
                                      value={f.qty || ''}
                                      onChange={e => updateFinanceField('qty', e.target.value, fIdx)}
                                      placeholder="ចំនួន (ឧ. 5)"
                                      style={{ width: '100%', minWidth: 0, boxSizing: 'border-box', fontSize: 12, padding: '4px 6px', border: '1px solid #cbd5e1', borderRadius: 4 }}
                                    />
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0 }}>
                                      <input
                                        type="text"
                                        inputMode="decimal"
                                        value={String(f.total ?? '')}
                                        onChange={e => updateFinanceField('total', sanitizeAmountInput(e.target.value), fIdx)}
                                        placeholder={`តម្លៃ (${getCurrencySymbol(f.currency)})`}
                                        style={{ flex: 1, width: '100%', minWidth: 0, boxSizing: 'border-box', fontSize: 12, fontWeight: 700, color: '#b45309', padding: '4px 6px', border: '1px solid #cbd5e1', borderRadius: 4 }}
                                      />
                                      <CurrencyToggle
                                        value={f.currency}
                                        onChange={cur => updateFinanceField('currency', cur, fIdx)}
                                      />
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div>
                            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>
                              ឈ្មោះឥវ៉ាន់ / បរិយាយ៖
                            </label>
                            <input
                              type="text"
                              value={financeItem.desc || ''}
                              onChange={e => updateFinanceField('desc', e.target.value)}
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
                        )
                      )}
                    </div>

                    {/* Bottom Action Button */}
                    <button
                      type="button"
                      onClick={() => onApproveItem(item)}
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
                );
              }

              return (
                <div
                  key={item.id}
                  style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: 10,
                    padding: 14,
                    background: '#f8fafc',
                    display: 'grid',
                    gridTemplateColumns: '150px 1fr auto',
                    gap: 16,
                    alignItems: 'start'
                  }}
                >
                  {/* Column 1: Image Thumbnail & Zoom */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div
                      onClick={() => setSelectedReviewIndex(index)}
                      style={{
                        width: '100%',
                        height: 180,
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
                      title="ចុចដើម្បីពង្រីកមើលរូបថតពេញ"
                    >
                      {item.previewUrl ? (
                        <img
                          src={item.previewUrl}
                          alt={item.fileName}
                          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                        />
                      ) : (
                        <span style={{ color: '#94a3b8', fontSize: 11 }}>គ្មានរូបភាព</span>
                      )}

                      <span style={{
                        position: 'absolute',
                        top: 6,
                        left: 6,
                        background: 'rgba(0,0,0,0.7)',
                        color: '#ffffff',
                        fontSize: 10,
                        padding: '2px 6px',
                        borderRadius: 4,
                        fontWeight: 700
                      }}>
                        #{index + 1}
                      </span>

                      {onRotateQueueItem && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onRotateQueueItem(item.id, 90);
                          }}
                          title="បង្វិលរូប 90°"
                          style={{
                            position: 'absolute',
                            top: 6,
                            right: 6,
                            background: 'rgba(15, 23, 42, 0.78)',
                            color: '#ffffff',
                            border: '1px solid rgba(255,255,255,0.25)',
                            borderRadius: 4,
                            padding: '4px 6px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer'
                          }}
                        >
                          <RotateCw size={12} />
                        </button>
                      )}

                      <div style={{
                        position: 'absolute',
                        bottom: 6,
                        right: 6,
                        background: 'rgba(0,0,0,0.65)',
                        color: '#ffffff',
                        padding: '3px 6px',
                        borderRadius: 4,
                        fontSize: 10,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4
                      }}>
                        <ZoomIn size={12} />
                        <span>ពង្រីក</span>
                      </div>
                    </div>

                    <div style={{ fontSize: 11, color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.fileName}
                    </div>
                  </div>

                  {/* Column 2: Direct Inline Editable Fields */}
                  <div style={{ background: '#ffffff', padding: 14, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                    {/* Top Row: Type Switcher & OCR status */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                      <div style={{ display: 'inline-flex', background: '#f1f5f9', padding: 3, borderRadius: 6, gap: 4 }}>
                        <button
                          type="button"
                          onClick={() => switchType('leave')}
                          style={{
                            background: isLeave ? '#b45309' : 'transparent',
                            color: isLeave ? '#ffffff' : '#64748b',
                            border: 'none',
                            padding: '4px 10px',
                            borderRadius: 4,
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          ក្រដាសសុំច្បាប់ (PDF 2)
                        </button>
                        <button
                          type="button"
                          onClick={() => switchType('finance')}
                          style={{
                            background: !isLeave ? '#0f766e' : 'transparent',
                            color: !isLeave ? '#ffffff' : '#64748b',
                            border: 'none',
                            padding: '4px 10px',
                            borderRadius: 4,
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          ប៉ុងចំណាយ/ចំណូល (PDF 1)
                        </button>
                      </div>

                      {/* AI Cloud vs Memory vs Offline Error Indicator */}
                      {resultData.isOfflineNoScan ? (
                        <div style={{
                          fontSize: 11,
                          padding: '4px 10px',
                          borderRadius: 20,
                          background: '#fee2e2',
                          color: '#b91c1c',
                          border: '1px solid #fecaca',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                          fontWeight: 600
                        }}>
                          <AlertTriangle size={13} color="#dc2626" />
                          <span>
                            {resultData.scanError || ((resultData.isTrulyOffline || (typeof navigator !== 'undefined' && !navigator.onLine))
                              ? 'មិនទាន់បានស្កេន (Offline)'
                              : 'មិនទាន់អាចស្កេនដោយ AI បានបណ្ដោះអាសន្ន')}
                          </span>
                        </div>
                      ) : item.status === 'error' ? (
                        <div style={{
                          fontSize: 11,
                          padding: '4px 10px',
                          borderRadius: 20,
                          background: '#fee2e2',
                          color: '#b91c1c',
                          border: '1px solid #fecaca',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                          fontWeight: 600
                        }}>
                          <AlertTriangle size={13} color="#dc2626" />
                          <span>ស្កេនបរាជ័យ (ចុចបង្វិលសាកល្បងម្ដងទៀត)</span>
                        </div>
                      ) : (
                        <div style={{
                          fontSize: 11,
                          padding: '4px 10px',
                          borderRadius: 20,
                          background: item.status === 'processing'
                            ? '#eff6ff'
                            : item.status === 'pending'
                              ? '#f8fafc'
                              : (isCloudScan ? '#ecfdf5' : '#fffbeb'),
                          color: item.status === 'processing'
                            ? '#1d4ed8'
                            : item.status === 'pending'
                              ? '#64748b'
                              : (isCloudScan ? '#065f46' : '#b45309'),
                          border: `1px solid ${item.status === 'processing'
                              ? '#bfdbfe'
                              : item.status === 'pending'
                                ? '#cbd5e1'
                                : (isCloudScan ? '#a7f3d0' : '#fde68a')
                            }`,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                          fontWeight: 600
                        }}>
                          {item.status === 'processing' ? (
                            <RefreshCw size={13} color="#2563eb" className="spin" />
                          ) : (
                            <Sparkles size={13} color={
                              item.status === 'pending'
                                ? '#94a3b8'
                                : (isCloudScan ? '#059669' : '#d97706')
                            } />
                          )}
                          <span>
                            {item.status === 'processing'
                              ? (scanCountdown ? scanCountdown.pcText : '⏳ កំពុងវិភាគដោយ AI Vision...')
                              : item.status === 'pending'
                                ? '⏳ រង់ចាំស្កេន...'
                                : isLearnedMemory
                                  ? '✨ ស្កេនដោយ AI Vision (ចងចាំទិន្នន័យពិត ១០០%)'
                                  : '✨ ស្កេនដោយ Gemini Cloud AI'}
                            {' • '}
                            <strong>{isLeave ? 'ក្រដាសច្បាប់ (A4 បញ្ឈរ)' : 'ប៉ុងចំណាយ/ចំណូល'}</strong>
                          </span>
                        </div>
                      )}

                      {/* Student Auto-match badge */}
                      {isLeave && studentMatch && (
                        <div style={{
                          fontSize: 11,
                          padding: '3px 8px',
                          borderRadius: 6,
                          background: studentMatch.isExact ? '#ecfdf5' : '#fefce8',
                          color: studentMatch.isExact ? '#065f46' : '#92400e',
                          border: `1px solid ${studentMatch.isExact ? '#a7f3d0' : '#fef08a'}`,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4
                        }}>
                          <span>បញ្ជីសិស្ស៖ <strong>{studentMatch.student.name} ({studentMatch.student.grade})</strong></span>
                          {!studentMatch.isExact && (
                            <button
                              type="button"
                              onClick={() => {
                                updateLeaveFields({
                                  name: studentMatch.student.name,
                                  grade: studentMatch.student.grade
                                });
                              }}
                              style={{
                                background: '#ca8a04',
                                color: '#ffffff',
                                border: 'none',
                                padding: '1px 5px',
                                borderRadius: 3,
                                fontSize: 10,
                                cursor: 'pointer',
                                fontWeight: 700
                              }}
                            >
                              យកឈ្មោះនេះ
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Dynamic Fields for LEAVE SLIP */}
                    {isLeave ? (() => {
                      const isNameFocused = focusedField?.itemId === item.id && focusedField?.field === 'name';
                      const isReasonFocused = focusedField?.itemId === item.id && focusedField?.field === 'reason';
                      const nameQuery = String(leaveItem.name || '').trim();
                      const reasonQuery = String(leaveItem.reason || '').trim();

                      const studentSuggestions = getPhoneticStudentSuggestions(nameQuery, studentMaster);
                      const hasStudentSuggestions = studentSuggestions.exactMatches.length > 0 || studentSuggestions.phoneticMatches.length > 0;
                      const showStudentSuggestBox = (isNameFocused || !studentMatch?.isExact) && (nameQuery.length > 0 ? hasStudentSuggestions : isNameFocused);

                      const realReasonSuggestions = isReasonFocused
                        ? getRealReasonSuggestions(reasonQuery, { allLeaves, trainingDataset, queue })
                        : [];

                      return (
                        <div>
                          {/* Row: ឈ្មោះ + ថ្នាក់ */}
                          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10, marginBottom: 8 }}>
                            <div>
                              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#1e293b', marginBottom: 3 }}>
                                គោត្តនាម-និងនាម (ឈ្មោះសិស្ស)៖
                              </label>
                              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                <input
                                  type="text"
                                  value={leaveItem.name || ''}
                                  onFocus={() => setFocusedField({ itemId: item.id, field: 'name' })}
                                  onBlur={() => setTimeout(() => setFocusedField(prev => (prev?.itemId === item.id && prev?.field === 'name') ? null : prev), 180)}
                                  onChange={e => updateLeaveFields({ name: e.target.value, needsReview: false })}
                                  placeholder="វាយអក្សរផ្ដើម ឧ. ច, ឆ, គ, ណ..."
                                  style={{
                                    width: '100%',
                                    fontSize: 14,
                                    fontWeight: 600,
                                    padding: '7px 32px 7px 10px',
                                    border: isNameFocused ? '1.5px solid #b45309' : '1px solid #cbd5e1',
                                    borderRadius: 6,
                                    outline: 'none'
                                  }}
                                />
                                {leaveItem.name && (
                                  <button
                                    type="button"
                                    onMouseDown={e => e.preventDefault()}
                                    onClick={() => {
                                      updateLeaveField('name', '');
                                      setFocusedField({ itemId: item.id, field: 'name' });
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
                              <OcrNameReviewHint
                                leaveItem={leaveItem}
                                onPick={(s) => updateLeaveFields({ name: s.name, grade: s.grade, needsReview: false })}
                              />
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#1e293b', marginBottom: 3 }}>
                                ថ្នាក់ទី៖
                              </label>
                              <select
                                value={leaveItem.grade || '៣'}
                                onChange={e => updateLeaveField('grade', e.target.value)}
                                style={{
                                  width: '100%',
                                  fontSize: 13,
                                  fontWeight: 600,
                                  padding: '7px 10px',
                                  border: '1px solid #cbd5e1',
                                  borderRadius: 6
                                }}
                              >
                                <option value="មត្តេយ្យ">មត្តេយ្យ</option>
                                <option value="១">ថ្នាក់ទី ១</option>
                                <option value="២">ថ្នាក់ទី ២</option>
                                <option value="៣">ថ្នាក់ទី ៣</option>
                              </select>
                            </div>
                          </div>

                          {/* Smart Student Suggestions Box on PC (Prefix + Phonetic Consonant Group) */}
                          {showStudentSuggestBox && (
                            <div style={{
                              marginBottom: 10,
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
                                                updateLeaveFields({ name: s.name, grade: s.grade, needsReview: false });
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
                                                updateLeaveFields({ name: s.name, grade: s.grade, needsReview: false });
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

                          {/* Quick Grade Pills */}
                          <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 11, color: '#64748b', alignSelf: 'center' }}>រើសថ្នាក់៖</span>
                            {['មត្តេយ្យ', '១', '២', '៣'].map(g => (
                              <button
                                key={g}
                                type="button"
                                onClick={() => updateLeaveField('grade', g)}
                                style={{
                                  fontSize: 11,
                                  padding: '2px 8px',
                                  borderRadius: 10,
                                  background: leaveItem.grade === g ? '#b45309' : '#f1f5f9',
                                  color: leaveItem.grade === g ? '#ffffff' : '#475569',
                                  border: 'none',
                                  cursor: 'pointer',
                                  fontWeight: 600
                                }}
                              >
                                {g === 'មត្តេយ្យ' ? 'មត្តេយ្យ' : `ថ្នាក់ទី ${g}`}
                              </button>
                            ))}
                          </div>

                          {/* Row: មូលហេតុ */}
                          <div style={{ marginBottom: 8 }}>
                            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#1e293b', marginBottom: 3 }}>
                              មូលហេតុឈប់៖
                            </label>
                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                              <input
                                type="text"
                                value={leaveItem.reason || ''}
                                onFocus={() => setFocusedField({ itemId: item.id, field: 'reason' })}
                                onBlur={() => setTimeout(() => setFocusedField(prev => (prev?.itemId === item.id && prev?.field === 'reason') ? null : prev), 180)}
                                onChange={e => updateLeaveField('reason', e.target.value)}
                                placeholder="វាយមូលហេតុ ឧ. អាពាធ, ឈឺក្បាល, ទៅបុណ្យ..."
                                style={{
                                  width: '100%',
                                  fontSize: 13,
                                  padding: '7px 32px 7px 10px',
                                  border: isReasonFocused ? '1.5px solid #0f766e' : '1px solid #cbd5e1',
                                  borderRadius: 6,
                                  outline: 'none'
                                }}
                              />
                              {leaveItem.reason && (
                                <button
                                  type="button"
                                  onMouseDown={e => e.preventDefault()}
                                  onClick={() => {
                                    updateLeaveField('reason', '');
                                    setFocusedField({ itemId: item.id, field: 'reason' });
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
                                        updateLeaveField('reason', r);
                                        setFocusedField(null);
                                      }}
                                      style={{
                                        fontSize: 11,
                                        padding: '2px 8px',
                                        borderRadius: 10,
                                        background: leaveItem.reason === r ? '#0f766e' : '#f1f5f9',
                                        color: leaveItem.reason === r ? '#ffffff' : '#475569',
                                        border: leaveItem.reason === r ? '1px solid #0f766e' : '1px solid #e2e8f0',
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

                          {/* Row: ចំនួនថ្ងៃ + កាលបរិច្ឆេទ (Shorthand Auto-Convert) */}
                          {(() => {
                            const durationInfo = getDurationSuggestions(leaveItem.duration);
                            const isDurationFocused = focusedField?.itemId === item.id && focusedField?.field === 'duration';
                            return (
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                <div>
                                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#1e293b', marginBottom: 3 }}>
                                    ចំនួនថ្ងៃឈប់៖ <span style={{ fontWeight: 500, fontSize: 10, color: '#64748b' }}>(ឧ. 1, 1.5, 1a, 1p)</span>
                                  </label>
                                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                    <input
                                      type="text"
                                      value={leaveItem.duration ?? ''}
                                      onFocus={() => setFocusedField({ itemId: item.id, field: 'duration' })}
                                      onBlur={() => {
                                        const formatted = parseDurationShorthand(leaveItem.duration) || '១ថ្ងៃ';
                                        if (formatted !== leaveItem.duration) {
                                          updateLeaveField('duration', formatted);
                                        }
                                        setTimeout(() => setFocusedField(prev => (prev?.itemId === item.id && prev?.field === 'duration') ? null : prev), 150);
                                      }}
                                      onKeyDown={e => {
                                        if (e.key === 'Enter') {
                                          e.preventDefault();
                                          const formatted = parseDurationShorthand(leaveItem.duration) || '១ថ្ងៃ';
                                          updateLeaveField('duration', formatted);
                                          e.target.blur();
                                        }
                                      }}
                                      onChange={e => updateLeaveField('duration', e.target.value)}
                                      placeholder="ឧ. 1, 1.5, 1a, 1p"
                                      style={{
                                        width: '100%',
                                        fontSize: 13,
                                        fontWeight: 600,
                                        padding: '6px 28px 6px 10px',
                                        border: isDurationFocused ? '1.5px solid #b45309' : '1px solid #cbd5e1',
                                        borderRadius: 6,
                                        outline: 'none'
                                      }}
                                    />
                                    {leaveItem.duration && (
                                      <button
                                        type="button"
                                        onMouseDown={e => e.preventDefault()}
                                        onClick={() => {
                                          updateLeaveField('duration', '');
                                          setFocusedField({ itemId: item.id, field: 'duration' });
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

                                  {durationInfo.isShorthand && (
                                    <button
                                      type="button"
                                      onMouseDown={e => e.preventDefault()}
                                      onClick={() => {
                                        updateLeaveField('duration', durationInfo.resolved);
                                        setFocusedField(null);
                                      }}
                                      style={{
                                        marginTop: 4,
                                        width: '100%',
                                        background: '#ecfdf5',
                                        color: '#065f46',
                                        border: '1px solid #a7f3d0',
                                        borderRadius: 6,
                                        padding: '3px 8px',
                                        fontSize: 11,
                                        fontWeight: 700,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        cursor: 'pointer'
                                      }}
                                    >
                                      <span>⚡ បម្លែងជា៖ <strong>«{durationInfo.resolved}»</strong></span>
                                      <span style={{ fontSize: 10, color: '#059669' }}>ចុចយក</span>
                                    </button>
                                  )}

                                  <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
                                    {durationInfo.options.map(d => (
                                      <button
                                        key={d}
                                        type="button"
                                        onMouseDown={e => e.preventDefault()}
                                        onClick={() => {
                                          updateLeaveField('duration', d);
                                          setFocusedField(null);
                                        }}
                                        style={{
                                          fontSize: 10,
                                          padding: '2px 7px',
                                          borderRadius: 8,
                                          background: (leaveItem.duration === d || durationInfo.resolved === d) ? '#b45309' : '#f8fafc',
                                          color: (leaveItem.duration === d || durationInfo.resolved === d) ? '#ffffff' : '#64748b',
                                          border: (leaveItem.duration === d || durationInfo.resolved === d) ? '1px solid #b45309' : '1px solid #e2e8f0',
                                          cursor: 'pointer',
                                          fontWeight: 600
                                        }}
                                      >
                                        {d}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                                <div>
                                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#1e293b', marginBottom: 3 }}>
                                    កាលបរិច្ឆេទ (ថ្ងៃខែ)៖
                                  </label>
                                  <input
                                    type="text"
                                    value={leaveItem.date || ''}
                                    onChange={e => updateLeaveField('date', e.target.value)}
                                    placeholder="DD/MM/YYYY"
                                    style={{
                                      width: '100%',
                                      fontSize: 13,
                                      padding: '6px 10px',
                                      border: '1px solid #cbd5e1',
                                      borderRadius: 6
                                    }}
                                  />
                                </div>
                              </div>
                            );
                          })()}

                          {/* Row: ផ្សេងៗ (សម្គាល់បន្ថែម) */}
                          <div style={{ marginTop: 8 }}>
                            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 3 }}>
                              ផ្សេងៗ (សម្គាល់បន្ថែម)៖
                            </label>
                            <input
                              type="text"
                              value={leaveItem.note || ''}
                              onChange={e => updateLeaveField('note', e.target.value)}
                              placeholder="សម្គាល់ផ្សេងៗ..."
                              style={{
                                width: '100%',
                                fontSize: 12,
                                padding: '5px 10px',
                                border: '1px solid #cbd5e1',
                                borderRadius: 6
                              }}
                            />
                          </div>
                        </div>
                      );
                    })() : (
                      /* Dynamic Fields for FINANCE RECEIPT */
                      hasMultipleFinances ? (
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, paddingBottom: 6, borderBottom: '1px solid #e2e8f0' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <label style={{ fontSize: 12, fontWeight: 700, color: '#1e293b' }}>
                                📦 មុខទំនិញក្នុងប៉ុង ({rawFinances.length} មុខ)៖
                              </label>
                              <div style={{ display: 'flex', gap: 4 }}>
                                <button
                                  type="button"
                                  onClick={() => updateFinanceField('category', 'expense', 0)}
                                  style={{
                                    padding: '3px 8px',
                                    borderRadius: 4,
                                    fontSize: 11,
                                    fontWeight: 700,
                                    background: financeItem.category === 'expense' ? '#ef4444' : '#f1f5f9',
                                    color: financeItem.category === 'expense' ? '#ffffff' : '#64748b',
                                    border: 'none',
                                    cursor: 'pointer'
                                  }}
                                >
                                  ចំណាយ
                                </button>
                                <button
                                  type="button"
                                  onClick={() => updateFinanceField('category', 'income', 0)}
                                  style={{
                                    padding: '3px 8px',
                                    borderRadius: 4,
                                    fontSize: 11,
                                    fontWeight: 700,
                                    background: financeItem.category === 'income' ? '#10b981' : '#f1f5f9',
                                    color: financeItem.category === 'income' ? '#ffffff' : '#64748b',
                                    border: 'none',
                                    cursor: 'pointer'
                                  }}
                                >
                                  ចំណូល
                                </button>
                              </div>
                            </div>
                            <span style={{ fontSize: 13, fontWeight: 700, color: '#0f766e', background: '#f0fdfa', padding: '3px 10px', borderRadius: 6, border: '1px solid #ccfbf1' }}>
                              សរុប {grandFinanceTotalLabel}
                            </span>
                          </div>

                          {/* Dual Currency & Exchange Rate Bar */}
                          {(detectedExchangeRate > 0 || detectedGrandTotalKhr > 0) && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, padding: '5px 8px', background: '#f8fafc', borderRadius: 6, border: '1px dashed #cbd5e1', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>
                                💱 {detectedExchangeRate > 0 ? `អត្រា 1$ = ${detectedExchangeRate.toLocaleString()}៛` : 'រូបិយប័ណ្ណពីរ'}៖
                              </span>
                              <div style={{ display: 'flex', gap: 4 }}>
                                <button
                                  type="button"
                                  onClick={() => convertAllFinanceCurrency('USD')}
                                  style={{
                                    padding: '2px 8px',
                                    borderRadius: 4,
                                    fontSize: 11,
                                    fontWeight: 700,
                                    background: grandFinanceTotals.USD > 0 ? '#0f766e' : '#ffffff',
                                    color: grandFinanceTotals.USD > 0 ? '#ffffff' : '#334155',
                                    border: '1px solid #0f766e',
                                    cursor: 'pointer'
                                  }}
                                  title="បម្លែងទំនិញទាំងអស់ជា USD"
                                >
                                  💵 USD {detectedGrandTotalUsd > 0 ? `($${detectedGrandTotalUsd})` : ''}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => convertAllFinanceCurrency('KHR')}
                                  style={{
                                    padding: '2px 8px',
                                    borderRadius: 4,
                                    fontSize: 11,
                                    fontWeight: 700,
                                    background: grandFinanceTotals.KHR > 0 ? '#0f766e' : '#ffffff',
                                    color: grandFinanceTotals.KHR > 0 ? '#ffffff' : '#334155',
                                    border: '1px solid #0f766e',
                                    cursor: 'pointer'
                                  }}
                                  title="បម្លែងទំនិញទាំងអស់ជា KHR តាមអត្រាប្តូរប្រាក់"
                                >
                                  ៛ KHR {detectedGrandTotalKhr > 0 ? `(${detectedGrandTotalKhr.toLocaleString()}៛)` : ''}
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Seller & Invoice Metadata */}
                          {(detectedSeller || detectedInvoiceNo) && (
                            <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap', fontSize: 11, color: '#475569' }}>
                              {detectedSeller && <span style={{ background: '#f1f5f9', padding: '1px 6px', borderRadius: 4, border: '1px solid #e2e8f0' }}>🏪 {detectedSeller}</span>}
                              {detectedInvoiceNo && <span style={{ background: '#f1f5f9', padding: '1px 6px', borderRadius: 4, border: '1px solid #e2e8f0' }}>📄 {detectedInvoiceNo}</span>}
                            </div>
                          )}

                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {rawFinances.map((f, fIdx) => (
                              <div key={fIdx} style={{ display: 'grid', gridTemplateColumns: '26px minmax(0, 2fr) minmax(0, 1fr) minmax(0, 1fr) auto', gap: 8, alignItems: 'center', background: '#ffffff', padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1' }}>
                                <span style={{ background: '#0f766e', color: '#fff', fontSize: 11, fontWeight: 700, borderRadius: 4, textAlign: 'center', padding: '2px 0' }}>
                                  #{fIdx + 1}
                                </span>
                                <input
                                  type="text"
                                  value={f.desc || ''}
                                  onChange={e => updateFinanceField('desc', e.target.value, fIdx)}
                                  placeholder="ឈ្មោះទំនិញ..."
                                  style={{ width: '100%', minWidth: 0, boxSizing: 'border-box', fontSize: 13, fontWeight: 600, padding: '5px 8px', border: '1px solid #cbd5e1', borderRadius: 4 }}
                                />
                                <input
                                  type="text"
                                  value={f.qty || ''}
                                  onChange={e => updateFinanceField('qty', e.target.value, fIdx)}
                                  placeholder="ចំនួន (ឧ. 5)"
                                  style={{ width: '100%', minWidth: 0, boxSizing: 'border-box', fontSize: 12, padding: '5px 8px', border: '1px solid #cbd5e1', borderRadius: 4 }}
                                />
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  value={String(f.total ?? '')}
                                  onChange={e => updateFinanceField('total', sanitizeAmountInput(e.target.value), fIdx)}
                                  placeholder={`តម្លៃ (${getCurrencySymbol(f.currency)})`}
                                  style={{ width: '100%', minWidth: 0, boxSizing: 'border-box', fontSize: 12, fontWeight: 700, color: '#b45309', padding: '5px 8px', border: '1px solid #cbd5e1', borderRadius: 4 }}
                                />
                                <CurrencyToggle
                                  value={f.currency}
                                  onChange={cur => updateFinanceField('currency', cur, fIdx)}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 10, marginBottom: 8 }}>
                            <div>
                              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#1e293b', marginBottom: 3 }}>
                                ប្រភេទ៖
                              </label>
                              <div style={{ display: 'flex', gap: 4 }}>
                                <button
                                  type="button"
                                  onClick={() => updateFinanceField('category', 'expense')}
                                  style={{
                                    flex: 1,
                                    padding: '5px',
                                    borderRadius: 4,
                                    fontSize: 11,
                                    fontWeight: 600,
                                    background: financeItem.category === 'expense' ? '#ef4444' : '#f1f5f9',
                                    color: financeItem.category === 'expense' ? '#ffffff' : '#64748b',
                                    border: 'none',
                                    cursor: 'pointer'
                                  }}
                                >
                                  ចំណាយ
                                </button>
                                <button
                                  type="button"
                                  onClick={() => updateFinanceField('category', 'income')}
                                  style={{
                                    flex: 1,
                                    padding: '5px',
                                    borderRadius: 4,
                                    fontSize: 11,
                                    fontWeight: 600,
                                    background: financeItem.category === 'income' ? '#10b981' : '#f1f5f9',
                                    color: financeItem.category === 'income' ? '#ffffff' : '#64748b',
                                    border: 'none',
                                    cursor: 'pointer'
                                  }}
                                >
                                  ចំណូល
                                </button>
                              </div>
                            </div>

                            <div>
                              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#1e293b', marginBottom: 3 }}>
                                ឈ្មោះឥវ៉ាន់ / បរិយាយ៖
                              </label>
                              <input
                                type="text"
                                value={financeItem.desc || ''}
                                onChange={e => updateFinanceField('desc', e.target.value)}
                                placeholder="ឧ. សាំង, ក្តារឈើ, សម្ភារៈ..."
                                style={{
                                  width: '100%',
                                  fontSize: 13,
                                  fontWeight: 600,
                                  padding: '6px 10px',
                                  border: '1px solid #cbd5e1',
                                  borderRadius: 6
                                }}
                              />
                            </div>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                            <div>
                              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#1e293b', marginBottom: 3 }}>
                                បរិមាណ / ចំនួន៖
                              </label>
                              <input
                                type="text"
                                value={financeItem.qty || ''}
                                onChange={e => updateFinanceField('qty', e.target.value)}
                                placeholder="ឧ. 1 សន្លឹក, 3 លីត្រ..."
                                style={{
                                  width: '100%',
                                  fontSize: 13,
                                  padding: '6px 10px',
                                  border: '1px solid #cbd5e1',
                                  borderRadius: 6
                                }}
                              />
                            </div>
                            <div>
                              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, fontSize: 12, fontWeight: 700, color: '#1e293b', marginBottom: 3 }}>
                                <span>តម្លៃសរុប ({getCurrencySymbol(financeItem.currency)})៖</span>
                                <CurrencyToggle
                                  value={financeItem.currency}
                                  onChange={cur => updateFinanceField('currency', cur)}
                                />
                              </label>
                              <input
                                type="text"
                                inputMode="decimal"
                                value={String(financeItem.total ?? '')}
                                onChange={e => updateFinanceField('total', sanitizeAmountInput(e.target.value))}
                                placeholder={normalizeCurrency(financeItem.currency) === 'USD' ? '0.00' : '0'}
                                style={{
                                  width: '100%',
                                  minWidth: 0,
                                  boxSizing: 'border-box',
                                  fontSize: 13,
                                  fontWeight: 700,
                                  color: '#b45309',
                                  padding: '6px 10px',
                                  border: '1px solid #cbd5e1',
                                  borderRadius: 6
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      )
                    )}
                  </div>

                  {/* Column 3: Actions (Approve & Delete) */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, height: '100%', justifyContent: 'center' }}>
                    <button
                      type="button"
                      onClick={() => onApproveItem(item)}
                      style={{
                        background: '#0f766e',
                        color: '#ffffff',
                        border: 'none',
                        padding: '10px 16px',
                        borderRadius: 8,
                        fontSize: 13,
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        cursor: 'pointer',
                        boxShadow: '0 2px 6px rgba(15,118,110,0.3)',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      <span>✓ បញ្ចូលក្នុងតារាង</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onRemoveFromQueue(item.id)}
                      style={{
                        background: 'transparent',
                        color: '#ef4444',
                        border: '1px solid #fee2e2',
                        padding: '6px 10px',
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: 600,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 4,
                        cursor: 'pointer'
                      }}
                      title="លុបចេញពីបញ្ជី"
                    >
                      <Trash2 size={14} />
                      <span>លុបចោល</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Side-by-Side Review Modal (Opens when user clicks thumbnail or zoom button) */}
      {selectedReviewItem && (
        <ReviewModal
          isOpen={!!selectedReviewItem}
          isMobile={isMobile}
          onClose={() => setSelectedReviewIndex(null)}
          queueItem={selectedReviewItem}
          studentMaster={studentMaster}
          allLeaves={allLeaves}
          queue={queue}
          queueIndex={(selectedReviewIndex || 0) + 1}
          queueTotal={queue.length}
          hasPrev={hasPrev}
          hasNext={hasNext}
          onNavigatePrev={handleNavigatePrev}
          onNavigateNext={handleNavigateNext}
          onRemoveItem={() => {
            onRemoveFromQueue(selectedReviewItem.id);
            if (queue.length > 1) {
              if (selectedReviewIndex >= queue.length - 1) {
                setSelectedReviewIndex(queue.length - 2);
              }
            } else {
              setSelectedReviewIndex(null);
            }
          }}
          onUpdateItem={(updates) => {
            onUpdateQueueItem(selectedReviewItem.id, updates);
          }}
          onConfirmApprove={({ type, item }) => {
            const updatedItem = {
              ...selectedReviewItem,
              processedData: {
                ...selectedReviewItem.processedData,
                detectedType: type,
                leaveItems: type === 'leave' ? [item] : [],
                financeItems: type === 'finance' ? (selectedReviewItem.processedData?.financeItems?.length > 1 ? selectedReviewItem.processedData.financeItems : [item]) : []
              }
            };
            onApproveItem(updatedItem);

            // Auto-advance logic: if there are other items in the queue, adjust index
            if (queue.length > 1) {
              if (selectedReviewIndex >= queue.length - 1) {
                setSelectedReviewIndex(queue.length - 2);
              }
            } else {
              setSelectedReviewIndex(null);
            }
          }}
        />
      )}
    </div>
  );
}
