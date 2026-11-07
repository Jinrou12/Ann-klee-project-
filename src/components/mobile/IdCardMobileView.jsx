import React, { useState, useMemo, useEffect } from 'react';
import {
  Plus, Trash2, Edit3, Check, X, FileSpreadsheet, FileText,
  Calendar, Search, Download, Loader2, CreditCard, CheckCircle2
} from 'lucide-react';
import { toKhmerDigits, toEnglishDigits, formatKhmerCurrency } from '../../utils/khmerNumerals';
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

export default function IdCardMobileView({
  records = [],
  monthKey = '2026-07',
  metadata = {},
  useKhmerNumerals = true,
  studentMaster = [],
  onUpdateRecords,
  onAddRecordToMonth
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
  const [combineMode, setCombineMode] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [justAddedToast, setJustAddedToast] = useState('');

  useEffect(() => {
    setQuickDate(autoDateInfo.entryDateStr);
  }, [autoDateInfo.entryDateStr]);

  const recommendations = useMemo(
    () => recommendStudentsByPhoneticQuery(quickName, studentMaster, 12),
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
    const nextItem = selectOrCombineIdCardItem(quickItem, itemLabel, combineMode);
    const nextPrice = computeIdCardTotalPrice(nextItem, quickQty, quickPrice);
    setQuickItem(nextItem);
    setQuickPrice(nextPrice);
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
    const updated = records.map(r => r.id === editingId ? { ...editForm } : r);
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

  const filteredRecords = records.filter(r => {
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
      {/* 1. Mobile Top Overview Card */}
      <div style={{
        background: 'linear-gradient(135deg, #ffffff 0%, #f0f9ff 100%)',
        border: '1.5px solid #7dd3fc',
        borderRadius: 14,
        padding: '14px 16px',
        marginBottom: 14,
        boxShadow: '0 2px 8px rgba(2, 132, 199, 0.08)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#0284c7', textTransform: 'uppercase' }}>
              តារាងសមណសិស្សទិញកាតពាក់ក (ID)
            </span>
            <h2 className="font-moul" style={{ fontSize: 16, margin: '2px 0 0', color: '#0c4a6e' }}>
              ខែ{monthName} ឆ្នាំ{yearDisplay}
            </h2>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{
              background: '#0284c7',
              color: '#ffffff',
              padding: '3px 10px',
              borderRadius: 16,
              fontSize: 12,
              fontWeight: 700,
              display: 'inline-block',
              marginBottom: 3
            }}>
              សរុប {useKhmerNumerals ? toKhmerDigits(records.length) : records.length} អង្គ
            </div>
            <div style={{ fontSize: 13.5, fontWeight: 800, color: '#15803d' }}>
              {formatKhmerCurrency(totalAmount, useKhmerNumerals)}
            </div>
          </div>
        </div>

        {/* Export & PDF Action Buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
          <button
            type="button"
            onClick={handleExportExcel}
            style={{
              background: '#15803d',
              color: '#ffffff',
              border: 'none',
              borderRadius: 10,
              padding: '9px 6px',
              fontSize: 11.5,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4
            }}
          >
            <FileSpreadsheet size={14} />
            <span>Excel</span>
          </button>

          <button
            type="button"
            onClick={handleExportWord}
            style={{
              background: '#1d4ed8',
              color: '#ffffff',
              border: 'none',
              borderRadius: 10,
              padding: '9px 6px',
              fontSize: 11.5,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4
            }}
          >
            <FileText size={14} />
            <span>Word</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={isExportingPdf}
            style={{
              background: '#b91c1c',
              color: '#ffffff',
              border: 'none',
              borderRadius: 10,
              padding: '9px 6px',
              fontSize: 11.5,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              opacity: isExportingPdf ? 0.7 : 1
            }}
          >
            {isExportingPdf ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            <span>{isExportingPdf ? 'កំពុងទាញ...' : 'PDF'}</span>
          </button>
        </div>
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
              onFocus={() => setShowDropdown(true)}
              onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
              onChange={e => {
                const val = e.target.value;
                setQuickName(val);
                setShowDropdown(true);
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

            {showDropdown && recommendations.length > 0 && (
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

        {/* Step 2: 4 Quick Item Buttons */}
        <div style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>
              ២. ជ្រើសរើសមុខទំនិញ៖
            </span>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: '#0284c7' }}>
              <input
                type="checkbox"
                checked={combineMode}
                onChange={e => setCombineMode(e.target.checked)}
              />
              <span>ទិញច្រើនមុខរួមគ្នា</span>
            </label>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
            {ID_CARD_ITEMS.map(opt => {
              const isSelected = quickItem === opt.label ||
                (combineMode && quickItem.split(/\s*\+\s*/).includes(opt.label));
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleSelectQuickItem(opt.label)}
                  style={{
                    padding: '7px 4px',
                    borderRadius: 8,
                    border: `2px solid ${isSelected ? opt.badgeColor : '#e2e8f0'}`,
                    background: isSelected ? opt.badgeBg : '#f8fafc',
                    color: isSelected ? opt.badgeColor : '#334155',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <span style={{ fontSize: 12.5, fontWeight: 700 }}>{opt.label}</span>
                  <span style={{ fontSize: 10, fontWeight: 600 }}>
                    {formatKhmerCurrency(opt.unitPrice, useKhmerNumerals)}
                  </span>
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
              width: 96,
              padding: '8px 6px',
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              textAlign: 'center',
              fontSize: 12,
              fontWeight: 600
            }}
          />
          <button
            type="submit"
            style={{
              flex: 1,
              background: '#0284c7',
              color: '#ffffff',
              border: 'none',
              borderRadius: 8,
              padding: '9px 10px',
              fontSize: 12.5,
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4
            }}
          >
            <Plus size={15} />
            <span>បញ្ចូល</span>
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

      {/* 3. Search & Grade Filter */}
      <div style={{
        background: '#ffffff',
        borderRadius: 12,
        padding: 10,
        marginBottom: 12,
        border: '1px solid #e2e8f0'
      }}>
        <div style={{ position: 'relative', marginBottom: 8 }}>
          <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="ស្វែងរកឈ្មោះ ឬមុខទំនិញ..."
            style={{
              width: '100%',
              padding: '7px 10px 7px 32px',
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              fontSize: 12.5
            }}
          />
        </div>
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto' }}>
          {[
            { id: 'all', label: 'គ្រប់ថ្នាក់' },
            { id: 'មត្តេយ្យ', label: 'មត្តេយ្យ' },
            { id: '១', label: 'ថ្នាក់ទី ១' },
            { id: '២', label: 'ថ្នាក់ទី ២' },
            { id: '៣', label: 'ថ្នាក់ទី ៣' }
          ].map(g => (
            <button
              key={g.id}
              type="button"
              onClick={() => setFilterGrade(g.id)}
              style={{
                padding: '5px 10px',
                borderRadius: 16,
                fontSize: 11.5,
                fontWeight: 700,
                border: filterGrade === g.id ? '1.5px solid #0284c7' : '1px solid #e2e8f0',
                background: filterGrade === g.id ? '#e0f2fe' : '#f8fafc',
                color: filterGrade === g.id ? '#0369a1' : '#475569',
                whiteSpace: 'nowrap'
              }}
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Mobile Cards List */}
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
                  border: '1px solid #e2e8f0',
                  borderRadius: 12,
                  padding: 12,
                  boxShadow: '0 1px 4px rgba(0,0,0,0.04)'
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
                          មុខទំនិញ៖ <strong style={{ color: '#0284c7' }}>{r.item}</strong> ({useKhmerNumerals ? toKhmerDigits(r.qty || 1) : (r.qty || 1)}) • ថ្ងៃទី៖ {useKhmerNumerals ? toKhmerDigits(r.date || '') : (r.date || '')}
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

