import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Plus, Printer, FileSpreadsheet, FileText, Download, Loader2, Search,
  CheckCircle2, Sparkles, Calendar, CreditCard
} from 'lucide-react';
import { toKhmerDigits, toEnglishDigits, formatKhmerCurrency } from '../utils/khmerNumerals';
import { exportIdCardToExcel } from '../utils/excelExporter';
import { exportIdCardToWord } from '../utils/wordExporter';
import { exportElementToPdf } from '../utils/pdfExporter';
import { recommendStudentsByPhoneticQuery } from '../utils/studentMaster';
import {
  ID_CARD_ITEMS,
  computeIdCardTotalPrice,
  selectOrCombineIdCardItem,
  getAutoSystemDateInfo,
  extractMonthKeyFromDate,
  formatDateBreakdownKhmer
} from '../utils/idCardCatalog';
import A4SheetScaler from './A4SheetScaler';
import OfficialIdCardDocument from './OfficialIdCardDocument';

export default function IdCardTableView({
  records = [],
  monthKey = '2026-07',
  metadata = {},
  useKhmerNumerals = true,
  studentMaster = [],
  onUpdateRecords,
  onAddRecordToMonth,
  onPrint
}) {
  const [editingRowId, setEditingRowId] = useState(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // Month label derivation
  const [yearStr, monthStr] = (monthKey || '2026-07').split('-');
  const monthNames = [
    'មករា', 'កុម្ភៈ', 'មីនា', 'មេសា', 'ឧសភា', 'មិថុនា',
    'កក្កដា', 'សីហា', 'កញ្ញា', 'តុលា', 'វិច្ឆិកា', 'ធ្នូ'
  ];
  const monthName = monthNames[parseInt(monthStr, 10) - 1] || 'កក្កដា';
  const yearDisplay = useKhmerNumerals ? toKhmerDigits(yearStr) : yearStr;

  // Auto system date synchronized with active monthKey
  const autoDateInfo = useMemo(() => getAutoSystemDateInfo(monthKey), [monthKey]);

  // Quick Entry Form State (Smart Flow: Type Name -> Recommend 80 Monks -> Pick Item -> Auto Price & Auto Date)
  const [quickName, setQuickName] = useState('');
  const [quickGrade, setQuickGrade] = useState('១');
  const [quickItem, setQuickItem] = useState('ខ្សែ');
  const [quickQty, setQuickQty] = useState(1);
  const [quickPrice, setQuickPrice] = useState(2000);
  const [quickDate, setQuickDate] = useState(() => autoDateInfo.entryDateStr);
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightStep2, setHighlightStep2] = useState(false);
  const [justAddedToast, setJustAddedToast] = useState('');
  const lastTapTimeRef = useRef(0);
  const lastTappedLabelRef = useRef('');
  const prevItemBeforeTapRef = useRef('ខ្សែ');

  // Keep quickDate synced when user changes month tab at the top
  useEffect(() => {
    setQuickDate(autoDateInfo.entryDateStr);
  }, [autoDateInfo.entryDateStr]);

  // Live 80-student recommendations (exact + phonetic sound similarity)
  const recommendations = useMemo(
    () => recommendStudentsByPhoneticQuery(quickName, studentMaster, 14),
    [quickName, studentMaster]
  );

  const detectedMonthKey = useMemo(
    () => extractMonthKeyFromDate(quickDate, monthKey),
    [quickDate, monthKey]
  );

  const detectedDateKhmer = useMemo(
    () => formatDateBreakdownKhmer(quickDate, useKhmerNumerals),
    [quickDate, useKhmerNumerals]
  );

  const totalAmount = useMemo(
    () => records.reduce((sum, r) => sum + (Number(r.price) || 0), 0),
    [records]
  );

  const handleSelectRecommendedStudent = (student) => {
    setQuickName(student.name);
    setQuickGrade(student.grade || '១');
    setShowDropdown(false);
    setHighlightStep2(true);
  };

  const handleSelectQuickItem = (itemLabel) => {
    const now = Date.now();
    const isDoubleTap =
      lastTappedLabelRef.current === itemLabel &&
      now - lastTapTimeRef.current <= 450;

    if (isDoubleTap && itemLabel !== 'មួយឈុត') {
      const baseItem = prevItemBeforeTapRef.current || quickItem;
      const nextItem = selectOrCombineIdCardItem(baseItem, itemLabel, true);
      const nextPrice = computeIdCardTotalPrice(nextItem, quickQty, quickPrice);
      setQuickItem(nextItem);
      setQuickPrice(nextPrice);
      prevItemBeforeTapRef.current = nextItem;
      lastTapTimeRef.current = 0;
      lastTappedLabelRef.current = '';
    } else {
      prevItemBeforeTapRef.current = quickItem;
      lastTapTimeRef.current = now;
      lastTappedLabelRef.current = itemLabel;
      const nextItem = itemLabel;
      const nextPrice = computeIdCardTotalPrice(nextItem, quickQty, quickPrice);
      setQuickItem(nextItem);
      setQuickPrice(nextPrice);
    }
  };

  const handleQuickQtyChange = (val) => {
    const nextQty = Math.max(1, parseInt(toEnglishDigits(String(val || '1')), 10) || 1);
    setQuickQty(nextQty);
    setQuickPrice(computeIdCardTotalPrice(quickItem, nextQty, quickPrice));
  };

  const handleQuickAddSubmit = (e) => {
    if (e) e.preventDefault();
    const trimmedName = quickName.trim();
    if (!trimmedName) {
      alert('សូមវាយ ឬជ្រើសរើសព្រះនាមសមណសិស្សជាមុនសិន!');
      return;
    }

    // Stamp exact current date if blank
    const finalDate = (quickDate || '').trim() || autoDateInfo.entryDateStr;
    const targetMonth = extractMonthKeyFromDate(finalDate, monthKey);

    const newRecord = {
      id: `idc-${Date.now()}`,
      name: trimmedName,
      grade: quickGrade || '១',
      item: quickItem || 'ខ្សែ',
      qty: quickQty || 1,
      price: Number(quickPrice) || computeIdCardTotalPrice(quickItem, quickQty, 2000),
      date: finalDate,
      note: ''
    };

    if (onAddRecordToMonth && targetMonth !== monthKey) {
      onAddRecordToMonth(targetMonth, newRecord);
    } else {
      onUpdateRecords([...records, newRecord]);
    }

    const [, targetM] = targetMonth.split('-');
    const targetMName = monthNames[parseInt(targetM, 10) - 1] || monthName;
    setJustAddedToast(
      `បានបញ្ចូល «${trimmedName}» (ទិញ ${newRecord.item} = ${formatKhmerCurrency(newRecord.price, useKhmerNumerals)}) ចូលក្នុងខែ${targetMName} រួចរាល់!`
    );
    setTimeout(() => setJustAddedToast(''), 4000);

    // Reset name for next entry while keeping auto-date ready
    setQuickName('');
    setHighlightStep2(false);
  };

  const handleCellChange = (id, field, value) => {
    const updated = records.map(r => r.id === id ? { ...r, [field]: value } : r);
    onUpdateRecords(updated);
  };

  const handleRowPatch = (id, patchObj) => {
    const updated = records.map(r => r.id === id ? { ...r, ...patchObj } : r);
    onUpdateRecords(updated);
  };

  const handleAddBlankRow = () => {
    const newRow = {
      id: `idc-${Date.now()}`,
      name: '',
      grade: '១',
      item: 'មួយឈុត',
      qty: 1,
      price: 5000,
      date: autoDateInfo.entryDateStr,
      note: ''
    };
    onUpdateRecords([...records, newRow]);
    setEditingRowId(newRow.id);
  };

  const handleDeleteRow = (id) => {
    onUpdateRecords(records.filter(r => r.id !== id));
  };

  const handleExportExcel = () => {
    exportIdCardToExcel(records, `${monthName} ${yearDisplay}`, metadata, { monthKey, useKhmerNumerals });
  };

  const handleExportWord = () => {
    exportIdCardToWord(records, `${monthName} ${yearDisplay}`, metadata, { monthKey, useKhmerNumerals });
  };

  const handleDownloadPdf = async () => {
    try {
      setIsExportingPdf(true);
      await exportElementToPdf(
        '#printable-idcard-document',
        `តារាងបង់ថ្លៃទិញកាត_ID_${monthName}_${yearDisplay}`
      );
    } catch (err) {
      alert('មិនអាចទាញយក PDF បានទេ៖ ' + (err.message || 'Error'));
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      {/* ==================================================================== */}
      {/* SMART QUICK-ENTRY PANEL (វាយឈ្មោះ -> ណែនាំ ៨០ អង្គ -> ជ្រើសរើសមុខទំនិញ -> Auto Price & Auto Date) */}
      {/* ==================================================================== */}
      <form
        onSubmit={handleQuickAddSubmit}
        className="no-print"
        style={{
          background: 'linear-gradient(135deg, #ffffff 0%, #f0f9ff 100%)',
          border: '2px solid #0284c7',
          borderRadius: 14,
          padding: '16px 20px',
          marginBottom: 16,
          boxShadow: '0 4px 14px rgba(2, 132, 199, 0.1)'
        }}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 10,
          marginBottom: 14
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: '#0284c7',
              color: '#ffffff',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <CreditCard size={18} />
            </span>
            <div>
              <div style={{ fontSize: 14.5, fontWeight: 700, color: '#0f172a' }}>
                ប្រព័ន្ធបញ្ចូលសមណសិស្សទិញកាត ID ឆ្លាតវៃ (Auto Recommend ៨០ អង្គ & Auto Date)
              </div>
              <div style={{ fontSize: 12, color: '#475569' }}>
                វាយឈ្មោះ (ឧ. វាយ «ក» នឹងណែនាំឈ្មោះដែលមានអក្សរ ក ឬសំនឿងស្រដៀង) ➔ ចុចមុខទំនិញ (ថង, ខ្សែ, ID, មួយឈុត) ➔ លោតតម្លៃ និងថ្ងៃខែឆ្នាំស្វ័យប្រវត្តិ
              </div>
            </div>
          </div>

          {/* Live System Date Badge */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: '#e0f2fe',
            border: '1px solid #7dd3fc',
            color: '#0369a1',
            padding: '5px 12px',
            borderRadius: 20,
            fontSize: 12,
            fontWeight: 700
          }}>
            <Calendar size={14} />
            <span>Auto Date៖ {detectedDateKhmer}</span>
          </div>
        </div>

        {/* Main 3-Step Interactive Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 14,
          alignItems: 'start'
        }}>
          {/* STEP 1: Student Name Input + 80-Monk Phonetic Recommendation */}
          <div style={{ position: 'relative' }}>
            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>
              ១. វាយឈ្មោះសមណសិស្ស (ណែនាំពី ៨០ អង្គ)៖
            </label>
            <div style={{ display: 'flex', gap: 6 }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Search
                  size={15}
                  style={{
                    position: 'absolute',
                    left: 10,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#64748b'
                  }}
                />
                <input
                  type="text"
                  value={quickName}
                  onFocus={() => setShowDropdown(true)}
                  onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                  onChange={e => {
                    const val = e.target.value;
                    setQuickName(val);
                    setShowDropdown(true);
                    const exact = studentMaster.find(s => s.name === val.trim());
                    if (exact) {
                      setQuickGrade(exact.grade || '១');
                    }
                  }}
                  placeholder="វាយឈ្មោះ ឧ. ក, គីម, សុ..."
                  style={{
                    width: '100%',
                    padding: '9px 10px 9px 32px',
                    borderRadius: 8,
                    border: '1.5px solid #0284c7',
                    fontSize: 13.5,
                    fontWeight: 600,
                    background: '#ffffff'
                  }}
                />

                {/* Floating 80-Student Recommendation List */}
                {showDropdown && recommendations.length > 0 && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    zIndex: 80,
                    maxHeight: 260,
                    overflowY: 'auto',
                    background: '#ffffff',
                    border: '1.5px solid #0284c7',
                    borderRadius: 10,
                    marginTop: 4,
                    boxShadow: '0 12px 28px rgba(15, 23, 42, 0.18)'
                  }}>
                    <div style={{
                      padding: '5px 10px',
                      background: '#f0f9ff',
                      borderBottom: '1px solid #bae6fd',
                      fontSize: 11,
                      fontWeight: 700,
                      color: '#0369a1',
                      display: 'flex',
                      justifyContent: 'space-between'
                    }}>
                      <span>ណែនាំឈ្មោះសមណសិស្ស ({toKhmerDigits(recommendations.length)} អង្គ)</span>
                      <span>ចុចដើម្បីជ្រើសរើស</span>
                    </div>
                    {recommendations.map(({ student, matchReason }) => (
                      <button
                        key={student.id}
                        type="button"
                        onMouseDown={e => {
                          e.preventDefault();
                          handleSelectRecommendedStudent(student);
                        }}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          padding: '8px 12px',
                          background: quickName === student.name ? '#e0f2fe' : '#ffffff',
                          border: 'none',
                          borderBottom: '1px solid #f1f5f9',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          cursor: 'pointer',
                          fontSize: 13
                        }}
                      >
                        <div>
                          <span style={{ fontWeight: 700, color: '#0f172a' }}>{student.name}</span>
                          {matchReason === 'សំនឿងស្រដៀង' && (
                            <span style={{
                              marginLeft: 6,
                              fontSize: 10.5,
                              color: '#7c3aed',
                              background: '#f3e8ff',
                              padding: '1px 6px',
                              borderRadius: 6,
                              fontWeight: 600
                            }}>
                              សំនឿងស្រដៀង
                            </span>
                          )}
                        </div>
                        <span style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: '#b45309',
                          background: '#fef3c7',
                          border: '1px solid #fde68a',
                          padding: '2px 8px',
                          borderRadius: 8
                        }}>
                          ថ្នាក់ {student.grade}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Auto-filled Grade Selector */}
              <select
                value={quickGrade}
                onChange={e => setQuickGrade(e.target.value)}
                title="ថ្នាក់សមណសិស្ស (លោតស្វ័យប្រវត្តិពេលជ្រើសរើសឈ្មោះ)"
                style={{
                  width: 96,
                  padding: '8px 6px',
                  borderRadius: 8,
                  border: '1.5px solid #cbd5e1',
                  background: '#fffbeb',
                  color: '#92400e',
                  fontWeight: 700,
                  fontSize: 12.5
                }}
              >
                <option value="មត្តេយ្យ">មត្តេយ្យ</option>
                <option value="១">ថ្នាក់ ១</option>
                <option value="២">ថ្នាក់ ២</option>
                <option value="៣">ថ្នាក់ ៣</option>
              </select>
            </div>
          </div>

          {/* STEP 2: Item Selection Buttons (Single click = 1 item, Double click 2nd item = combine) */}
          <div style={{
            background: highlightStep2 ? '#fffbeb' : '#ffffff',
            border: highlightStep2 ? '1.5px solid #f59e0b' : '1px solid #e2e8f0',
            borderRadius: 10,
            padding: '10px',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center'
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, width: '100%' }}>
              {ID_CARD_ITEMS.map(opt => {
                const isSelected = quickItem === opt.label ||
                  quickItem.split(/\s*\+\s*/).includes(opt.label);
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleSelectQuickItem(opt.label)}
                    style={{
                      padding: '10px 4px',
                      borderRadius: 8,
                      border: `2px solid ${isSelected ? opt.badgeColor : '#e2e8f0'}`,
                      background: isSelected ? opt.badgeBg : '#f8fafc',
                      color: isSelected ? opt.badgeColor : '#334155',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      touchAction: 'manipulation',
                      userSelect: 'none',
                      transition: 'all 0.12s'
                    }}
                  >
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* STEP 3: Auto Price + Auto Date + Submit Button */}
          <div>
            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>
              ៣. តម្លៃស្វ័យប្រវត្តិ & កាលបរិច្ឆេទ (ថ្ងៃ/ខែ/ឆ្នាំ)៖
            </label>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
              {/* Quantity */}
              <input
                type="number"
                min="1"
                value={quickQty}
                onChange={e => handleQuickQtyChange(e.target.value)}
                title="ចំនួន"
                style={{
                  width: 54,
                  padding: '8px 6px',
                  borderRadius: 8,
                  border: '1.5px solid #cbd5e1',
                  textAlign: 'center',
                  fontSize: 13,
                  fontWeight: 700,
                  background: '#ffffff'
                }}
              />

              {/* Auto Price Display */}
              <div style={{
                padding: '8px 12px',
                borderRadius: 8,
                background: '#dcfce7',
                border: '1.5px solid #22c55e',
                color: '#15803d',
                fontWeight: 700,
                fontSize: 13.5,
                whiteSpace: 'nowrap'
              }}>
                {formatKhmerCurrency(quickPrice, useKhmerNumerals)}
              </div>

              {/* Auto Date Input */}
              <input
                type="text"
                value={quickDate}
                onChange={e => setQuickDate(e.target.value)}
                title="កាលបរិច្ឆេទស្វ័យប្រវត្តិ (DD/MM/YYYY) - បើដូរខែ ប្រព័ន្ធនឹងដាក់ចូលខែនោះស្វ័យប្រវត្តិ"
                style={{
                  width: 108,
                  padding: '8px 8px',
                  borderRadius: 8,
                  border: '1.5px solid #cbd5e1',
                  textAlign: 'center',
                  fontSize: 13,
                  fontWeight: 600,
                  background: '#ffffff'
                }}
              />

              {/* Submit Button */}
              <button
                type="submit"
                style={{
                  flex: 1,
                  background: '#0284c7',
                  color: '#ffffff',
                  padding: '9px 14px',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  whiteSpace: 'nowrap',
                  boxShadow: '0 2px 6px rgba(2, 132, 199, 0.25)'
                }}
              >
                <Plus size={16} />
                <span>បញ្ចូល</span>
              </button>
            </div>
          </div>
        </div>

        {/* Toast confirmation when added */}
        {justAddedToast && (
          <div style={{
            marginTop: 10,
            padding: '7px 12px',
            borderRadius: 8,
            background: '#dcfce7',
            border: '1px solid #86efac',
            color: '#166534',
            fontSize: 12.5,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}>
            <CheckCircle2 size={15} />
            <span>{justAddedToast}</span>
          </div>
        )}
      </form>

      {/* ==================================================================== */}
      {/* ACTION TOOLBAR (hidden on print)                                     */}
      {/* ==================================================================== */}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <button
            onClick={handleAddBlankRow}
            style={{
              background: '#b45309',
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
            <Plus size={16} />
            <span>បន្ថែមជួរថ្មីក្នុងតារាង</span>
          </button>
          <span style={{ fontSize: 13, color: '#475569' }}>
            សរុបសមណសិស្សទិញកាត៖{' '}
            <strong style={{ color: '#0f172a' }}>
              {useKhmerNumerals ? toKhmerDigits(records.length) : records.length} អង្គ
            </strong>{' '}
            | សរុបទឹកប្រាក់៖{' '}
            <strong style={{ color: '#15803d' }}>
              {formatKhmerCurrency(totalAmount, useKhmerNumerals)}
            </strong>
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
            onClick={handleExportWord}
            style={{
              background: '#1d4ed8',
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
            <FileText size={16} />
            <span>Download Word</span>
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
          >
            {isExportingPdf ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            <span>{isExportingPdf ? 'កំពុងទាញយក PDF...' : 'Download PDF'}</span>
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

      {/* Authentic A4 Paper Sheet */}
      <A4SheetScaler>
        <OfficialIdCardDocument
          id="printable-idcard-document"
          records={records}
          metadata={metadata}
          monthName={monthName}
          yearDisplay={yearDisplay}
          useKhmerNumerals={useKhmerNumerals}
          monthKey={monthKey}
          isEditable={true}
          editingRowId={editingRowId}
          setEditingRowId={setEditingRowId}
          handleCellChange={handleCellChange}
          handleRowPatch={handleRowPatch}
          handleDeleteRow={handleDeleteRow}
          studentMaster={studentMaster}
        />
      </A4SheetScaler>
    </div>
  );
}

