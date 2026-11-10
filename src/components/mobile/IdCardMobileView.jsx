import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Plus, Trash2, Edit3, Check, X, FileSpreadsheet, FileText,
  Calendar, Search, Download, Loader2, CreditCard, CheckCircle2
} from 'lucide-react';
import { toKhmerDigits, toEnglishDigits, formatKhmerCurrency, normalizeRecordDateStr, sortRecordsByDateAsc } from '../../utils/khmerNumerals';
import { exportIdCardToExcel } from '../../utils/excelExporter';
import { exportIdCardToWord } from '../../utils/wordExporter';
import { exportElementToPdf } from '../../utils/pdfExporter';
import { recommendStudentsByPhoneticQuery } from '../../utils/studentMaster';
import {
  ID_CARD_ITEMS,
  computeIdCardTotalPrice,
  selectOrCombineIdCardItem,
  getAutoSystemDateInfo,
  extractMonthKeyFromDate,
  formatDateBreakdownKhmer
} from '../../utils/idCardCatalog';
import OfficialIdCardDocument from '../OfficialIdCardDocument';
import A4SheetScaler from '../A4SheetScaler';

export default function IdCardMobileView({
  records = [],
  monthKey = '2026-07',
  metadata = {},
  useKhmerNumerals = true,
  studentMaster = [],
  onUpdateRecords,
  onAddRecordToMonth,
  mobilePreviewA4 = false
}) {
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
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

  const autoDateInfo = useMemo(() => getAutoSystemDateInfo(monthKey), [monthKey]);

  // Smart Quick-Entry State for Mobile
  const [quickName, setQuickName] = useState('');
  const [quickGrade, setQuickGrade] = useState('១');
  const [quickItem, setQuickItem] = useState('ខ្សែ');
  const [quickQty, setQuickQty] = useState(1);
  const [quickPrice, setQuickPrice] = useState(2000);
  const [quickDate, setQuickDate] = useState(() => autoDateInfo.entryDateStr);
  const [showDropdown, setShowDropdown] = useState(false);
  const [justAddedToast, setJustAddedToast] = useState('');
  const lastTapTimeRef = useRef(0);
  const lastTappedLabelRef = useRef('');
  const prevItemBeforeTapRef = useRef('ខ្សែ');

  useEffect(() => {
    setQuickDate(autoDateInfo.entryDateStr);
  }, [autoDateInfo.entryDateStr]);

  const recommendations = useMemo(
    () => (quickName.trim() ? recommendStudentsByPhoneticQuery(quickName, studentMaster, 12) : []),
    [quickName, studentMaster]
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

    const finalDate = normalizeRecordDateStr((quickDate || '').trim() || autoDateInfo.entryDateStr, useKhmerNumerals);
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
      onUpdateRecords(sortRecordsByDateAsc([...records, newRecord]));
    }

    const [, targetM] = targetMonth.split('-');
    const targetMName = monthNames[parseInt(targetM, 10) - 1] || monthName;
    setJustAddedToast(
      `បានបញ្ចូល «${trimmedName}» (${newRecord.item} = ${formatKhmerCurrency(newRecord.price, useKhmerNumerals)}) ចូលខែ${targetMName}`
    );
    setTimeout(() => setJustAddedToast(''), 3500);
    setQuickName('');
  };

  const handleStartEdit = (record) => {
    setEditingId(record.id);
    setEditForm({ ...record });
  };

  const handleSaveEdit = () => {
    if (!editForm.name?.trim()) {
      alert('សូមបញ្ចូលព្រះនាម ឬឈ្មោះសមណសិស្ស');
      return;
    }
    const normalizedDate = normalizeRecordDateStr(editForm.date || '', useKhmerNumerals);
    const updated = sortRecordsByDateAsc(
      records.map(r => r.id === editingId ? { ...editForm, date: normalizedDate } : r)
    );
    onUpdateRecords(updated);
    setEditingId(null);
    setEditForm({});
  };

  const handleDelete = (id, name) => {
    if (window.confirm(`តើបងពិតជាចង់លុបទិន្នន័យទិញកាត ID របស់ «${name || 'សមណសិស្ស'}» មែនទេ?`)) {
      onUpdateRecords(records.filter(r => r.id !== id));
    }
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
        '#printable-mobile-idcard-document',
        `តារាងបង់ថ្លៃទិញកាត_ID_${monthName}_${yearDisplay}`
      );
    } catch (err) {
      alert('មិនអាចទាញយក PDF បានទេ៖ ' + (err.message || 'Error'));
    } finally {
      setIsExportingPdf(false);
    }
  };

  const filteredRecords = sortRecordsByDateAsc(records).filter(r => {
    const matchesSearch = !searchQuery.trim() ||
      (r.name && r.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (r.item && r.item.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesGrade = filterGrade === 'all' || String(r.grade) === String(filterGrade);
    return matchesSearch && matchesGrade;
  });

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
    <div className="mobile-idcard-container" style={{ paddingBottom: 85 }}>
      {/* 1. Mobile Top PDF Export Button */}
      <div style={{ marginBottom: 12 }}>
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
            padding: '10px 14px',
            fontSize: 13,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            cursor: isExportingPdf ? 'wait' : 'pointer',
            opacity: isExportingPdf ? 0.7 : 1,
            boxShadow: '0 2px 4px rgba(185, 28, 28, 0.2)'
          }}
        >
          {isExportingPdf ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
          <span>{isExportingPdf ? 'កំពុងទាញយក PDF...' : 'Download PDF'}</span>
        </button>
      </div>

      {/* 2. Mobile Smart Quick-Entry Box (វាយឈ្មោះ -> ណែនាំ ៨០ អង្គ -> ចុចមុខទំនិញ -> Auto Price & Auto Date) */}
      <form
        onSubmit={handleQuickAddSubmit}
        style={{
          background: '#ffffff',
          border: '2px solid #0284c7',
          borderRadius: 14,
          padding: 14,
          marginBottom: 14,
          boxShadow: '0 4px 12px rgba(2, 132, 199, 0.1)'
        }}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 10
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: '#0369a1' }}>
            <CreditCard size={16} />
            <span>បញ្ចូលសមណសិស្សទិញកាត ID ថ្មី</span>
          </div>
          <span style={{
            fontSize: 11,
            fontWeight: 700,
            color: '#0369a1',
            background: '#e0f2fe',
            padding: '2px 8px',
            borderRadius: 12
          }}>
            {detectedDateKhmer}
          </span>
        </div>

        {/* Step 1: Student Name + Grade */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 10, position: 'relative' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <input
              type="text"
              value={quickName}
              onFocus={() => setShowDropdown(Boolean(quickName.trim()))}
              onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
              onChange={e => {
                const val = e.target.value;
                setQuickName(val);
                setShowDropdown(Boolean(val.trim()));
                const exact = studentMaster.find(s => s.name === val.trim());
                if (exact) setQuickGrade(exact.grade || '១');
              }}
              placeholder="១. វាយឈ្មោះ (ឧ. ក)..."
              style={{
                width: '100%',
                padding: '9px 10px',
                borderRadius: 8,
                border: '1.5px solid #0284c7',
                fontSize: 13.5,
                fontWeight: 600
              }}
            />

            {showDropdown && quickName.trim().length > 0 && recommendations.length > 0 && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                zIndex: 80,
                maxHeight: 220,
                overflowY: 'auto',
                background: '#ffffff',
                border: '1.5px solid #0284c7',
                borderRadius: 10,
                marginTop: 4,
                boxShadow: '0 10px 24px rgba(15, 23, 42, 0.2)'
              }}>
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
                      padding: '8px 10px',
                      background: quickName === student.name ? '#e0f2fe' : '#ffffff',
                      border: 'none',
                      borderBottom: '1px solid #f1f5f9',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: 13
                    }}
                  >
                    <div>
                      <span style={{ fontWeight: 700, color: '#0f172a' }}>{student.name}</span>
                      {matchReason === 'សំនឿងស្រដៀង' && (
                        <span style={{
                          marginLeft: 5,
                          fontSize: 10,
                          color: '#7c3aed',
                          background: '#f3e8ff',
                          padding: '1px 5px',
                          borderRadius: 4
                        }}>
                          សំនឿង
                        </span>
                      )}
                    </div>
                    <span style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: '#b45309',
                      background: '#fef3c7',
                      padding: '2px 7px',
                      borderRadius: 6
                    }}>
                      ថ្នាក់ {student.grade}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <select
            value={quickGrade}
            onChange={e => setQuickGrade(e.target.value)}
            style={{
              width: 90,
              padding: '8px 4px',
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

        {/* Step 2: 4 Quick Item Buttons (Single tap = 1 item, Double tap 2nd item = combine) */}
        <div style={{ marginBottom: 10 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
            {ID_CARD_ITEMS.map(opt => {
              const isSelected = quickItem === opt.label ||
                quickItem.split(/\s*\+\s*/).includes(opt.label);
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleSelectQuickItem(opt.label)}
                  style={{
                    padding: '9px 4px',
                    borderRadius: 8,
                    border: `2px solid ${isSelected ? opt.badgeColor : '#e2e8f0'}`,
                    background: isSelected ? opt.badgeBg : '#f8fafc',
                    color: isSelected ? opt.badgeColor : '#334155',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    touchAction: 'manipulation',
                    userSelect: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 3: Qty + Auto Price + Auto Date + Submit */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input
            type="number"
            min="1"
            value={quickQty}
            onChange={e => handleQuickQtyChange(e.target.value)}
            style={{
              width: 48,
              padding: '8px 4px',
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              textAlign: 'center',
              fontSize: 13,
              fontWeight: 700
            }}
          />
          <div style={{
            padding: '8px 10px',
            borderRadius: 8,
            background: '#dcfce7',
            border: '1.5px solid #22c55e',
            color: '#15803d',
            fontWeight: 700,
            fontSize: 13,
            whiteSpace: 'nowrap'
          }}>
            {formatKhmerCurrency(quickPrice, useKhmerNumerals)}
          </div>
          <input
            type="text"
            value={quickDate}
            onChange={e => setQuickDate(e.target.value)}
            style={{
              flex: 1,
              minWidth: 105,
              padding: '8px 6px',
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              textAlign: 'center',
              fontSize: 12.5,
              fontWeight: 600
            }}
          />
          <button
            type="submit"
            title="បញ្ចូល"
            aria-label="បញ្ចូល"
            style={{
              width: 42,
              height: 38,
              flexShrink: 0,
              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              color: '#ffffff',
              border: '1px solid #0369a1',
              borderRadius: 10,
              padding: 0,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 3px 8px rgba(2, 132, 199, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.25)'
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 7.5V4.8C9 3.8 9.8 3 10.8 3H18.2C19.2 3 20 3.8 20 4.8V19.2C20 20.2 19.2 21 18.2 21H10.8C9.8 21 9 20.2 9 19.2V16.5" />
              <path d="M3.5 12H15.5" />
              <path d="M11.5 8L15.5 12L11.5 16" />
            </svg>
          </button>
        </div>

        {justAddedToast && (
          <div style={{
            marginTop: 8,
            padding: '6px 10px',
            borderRadius: 8,
            background: '#dcfce7',
            border: '1px solid #86efac',
            color: '#166534',
            fontSize: 12,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}>
            <CheckCircle2 size={14} />
            <span>{justAddedToast}</span>
          </div>
        )}
      </form>

      {/* 3. Search Bar */}
      <div style={{
        position: 'relative',
        marginBottom: 10
      }}>
        <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="ស្វែងរកឈ្មោះ ឬមុខទំនិញ..."
          style={{
            width: '100%',
            padding: '8px 10px 8px 32px',
            borderRadius: 8,
            border: '1px solid #cbd5e1',
            fontSize: 13,
            background: '#ffffff'
          }}
        />
      </div>

      {/* 3.5. Summary Count & Total Amount Strip below Search Bar */}
      <div style={{
        background: 'linear-gradient(135deg, #ffffff 0%, #f0f9ff 100%)',
        border: '1.5px solid #7dd3fc',
        borderRadius: 10,
        padding: '8px 12px',
        marginBottom: 12,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 1px 4px rgba(2, 132, 199, 0.06)'
      }}>
        <span style={{
          background: '#0284c7',
          color: '#ffffff',
          padding: '4px 12px',
          borderRadius: 16,
          fontSize: 12.5,
          fontWeight: 700,
          whiteSpace: 'nowrap'
        }}>
          សរុប {useKhmerNumerals ? toKhmerDigits(filteredRecords.length) : filteredRecords.length} អង្គ
        </span>
        <span style={{ fontSize: 14.5, fontWeight: 800, color: '#15803d', whiteSpace: 'nowrap' }}>
          {formatKhmerCurrency(
            filteredRecords.reduce((sum, r) => sum + (Number(r.price) || 0), 0),
            useKhmerNumerals
          )}
        </span>
      </div>

      {/* 4. Mobile Cards List or Official A4 Preview */}
      {mobilePreviewA4 ? (
        <div style={{ background: '#ffffff', padding: 8, borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <A4SheetScaler>
            <OfficialIdCardDocument
              id="preview-mobile-idcard-document"
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
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filteredRecords.length === 0 ? (
          <div style={{
            background: '#ffffff',
            borderRadius: 12,
            padding: 24,
            textAlign: 'center',
            color: '#64748b',
            border: '1px dashed #cbd5e1',
            fontSize: 13
          }}>
            មិនទាន់មានទិន្នន័យសមណសិស្សទិញកាត ID ក្នុងខែនេះទេ។
          </div>
        ) : (
          filteredRecords.map((r, index) => {
            const isEditing = editingId === r.id;
            const badge = getGradeBadge(r.grade);
            const rowNum = useKhmerNumerals ? toKhmerDigits(index + 1) : (index + 1);

            return (
              <div
                key={r.id}
                style={{
                  background: '#ffffff',
                  border: '1.5px solid #93c5fd',
                  borderRadius: 12,
                  padding: 12,
                  boxShadow: '0 2px 6px rgba(2, 132, 199, 0.06)'
                }}
              >
                {isEditing ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <input
                        type="text"
                        value={editForm.name || ''}
                        onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                        placeholder="ឈ្មោះសមណសិស្ស"
                        style={{ flex: 1, padding: '7px 10px', borderRadius: 8, border: '1px solid #0284c7', fontSize: 13 }}
                      />
                      <select
                        value={editForm.grade || '១'}
                        onChange={e => setEditForm({ ...editForm, grade: e.target.value })}
                        style={{ width: 85, padding: '7px 4px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 12.5 }}
                      >
                        <option value="មត្តេយ្យ">មត្តេយ្យ</option>
                        <option value="១">ថ្នាក់ ១</option>
                        <option value="២">ថ្នាក់ ២</option>
                        <option value="៣">ថ្នាក់ ៣</option>
                      </select>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 5 }}>
                      {ID_CARD_ITEMS.map(opt => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            const nextPrice = computeIdCardTotalPrice(opt.label, editForm.qty || 1, editForm.price);
                            setEditForm({ ...editForm, item: opt.label, price: nextPrice });
                          }}
                          style={{
                            padding: '5px 4px',
                            borderRadius: 6,
                            border: `1.5px solid ${editForm.item === opt.label ? opt.badgeColor : '#cbd5e1'}`,
                            background: editForm.item === opt.label ? opt.badgeBg : '#f8fafc',
                            color: editForm.item === opt.label ? opt.badgeColor : '#334155',
                            fontSize: 11.5,
                            fontWeight: 700
                          }}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>

                    <div style={{ display: 'flex', gap: 6 }}>
                      <input
                        type="number"
                        min="1"
                        value={editForm.qty || 1}
                        onChange={e => {
                          const q = Math.max(1, parseInt(e.target.value, 10) || 1);
                          setEditForm({
                            ...editForm,
                            qty: q,
                            price: computeIdCardTotalPrice(editForm.item, q, editForm.price)
                          });
                        }}
                        style={{ width: 55, padding: '6px', borderRadius: 8, border: '1px solid #cbd5e1', textAlign: 'center' }}
                      />
                      <input
                        type="number"
                        value={editForm.price || 0}
                        onChange={e => setEditForm({ ...editForm, price: Number(e.target.value) || 0 })}
                        style={{ flex: 1, padding: '6px 8px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13 }}
                      />
                      <input
                        type="text"
                        value={editForm.date || ''}
                        onChange={e => setEditForm({ ...editForm, date: e.target.value })}
                        style={{ width: 100, padding: '6px', borderRadius: 8, border: '1px solid #cbd5e1', textAlign: 'center', fontSize: 12 }}
                      />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        style={{ padding: '6px 12px', borderRadius: 8, background: '#f1f5f9', color: '#475569', border: 'none', fontSize: 12, fontWeight: 700 }}
                      >
                        បោះបង់
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveEdit}
                        style={{ padding: '6px 12px', borderRadius: 8, background: '#15803d', color: '#ffffff', border: 'none', fontSize: 12, fontWeight: 700 }}
                      >
                        រក្សាទុក
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{
                        width: 26,
                        height: 26,
                        borderRadius: '50%',
                        background: '#e0f2fe',
                        color: '#0369a1',
                        border: '1px solid #bae6fd',
                        fontSize: 12,
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        {rowNum}
                      </span>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{r.name}</span>
                          <span style={{
                            fontSize: 10.5,
                            fontWeight: 700,
                            padding: '1px 7px',
                            borderRadius: 8,
                            background: badge.bg,
                            color: badge.text,
                            border: `1px solid ${badge.border}`
                          }}>
                            ថ្នាក់ {useKhmerNumerals ? toKhmerDigits(r.grade) : r.grade}
                          </span>
                        </div>
                        <div style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>
                          មុខទំនិញ៖ <strong style={{ color: '#0284c7' }}>{r.item}</strong> ({useKhmerNumerals ? toKhmerDigits(r.qty || 1) : (r.qty || 1)}) • ថ្ងៃទី៖ {normalizeRecordDateStr(r.date || '', useKhmerNumerals)}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 13.5, fontWeight: 800, color: '#15803d', whiteSpace: 'nowrap' }}>
                        {formatKhmerCurrency(r.price || 0, useKhmerNumerals)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleStartEdit(r)}
                        style={{ background: '#f1f5f9', color: '#334155', border: 'none', borderRadius: 6, padding: 6 }}
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(r.id, r.name)}
                        style={{ background: '#fef2f2', color: '#dc2626', border: 'none', borderRadius: 6, padding: 6 }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
        </div>
      )}

      {/* Off-screen Official A4 Document for High-Res PDF Export on Mobile */}
      <div style={{
        position: 'fixed',
        left: '-9999px',
        top: 0,
        width: '794px',
        zIndex: -1,
        pointerEvents: 'none'
      }}>
        <OfficialIdCardDocument
          id="printable-mobile-idcard-document"
          records={records}
          metadata={metadata}
          monthName={monthName}
          yearDisplay={yearDisplay}
          useKhmerNumerals={useKhmerNumerals}
          monthKey={monthKey}
          isEditable={false}
          studentMaster={studentMaster}
        />
      </div>
    </div>
  );
}

