import React, { useState } from 'react';
import { 
  Plus, Trash2, Edit3, Check, X, FileSpreadsheet, FileText, Eye, 
  DollarSign, ArrowDownRight, ArrowUpRight, Wallet, ShoppingBag, Search, Download, Loader2, Printer 
} from 'lucide-react';
import { toKhmerDigits, formatKhmerCurrency, parseKhmerNumber, formatMoney, sumByCurrency, combineCurrencyTotals, formatCurrencyTotals, formatExpenseTotals, isFinanceDeficit, getCurrencySymbol, normalizeCurrency } from '../../utils/khmerNumerals';
import { exportFinanceDualExcel } from '../../utils/excelExporter';
import { exportFinanceDualWord } from '../../utils/wordExporter';
import { exportElementToPdf } from '../../utils/pdfExporter';
import A4SheetScaler from '../A4SheetScaler';
import OfficialFinanceDocument from '../OfficialFinanceDocument';
import OfficialFinanceSummaryDocument from '../OfficialFinanceSummaryDocument';
import CurrencyToggle from '../CurrencyToggle';

export default function FinanceMobileView({
  financeData = { income: [], expense: [] },
  monthKey,
  metadata = {},
  useKhmerNumerals = true,
  onUpdateFinance,
  onPrint,
  onSwitchToDesktop,
  mobilePreviewA4 = false
}) {
  const [activeSubTab, setActiveSubTab] = useState('expense'); // 'expense' | 'income'
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [financeViewType, setFinanceViewType] = useState('full'); // 'full' (ពេញ) | 'summary' (សង្ខេប)

  // Month derivation
  const [yearStr, monthStr] = (monthKey || '2026-07').split('-');
  const monthNames = [
    'មករា', 'កុម្ភៈ', 'មីនា', 'មេសា', 'ឧសភា', 'មិថុនា',
    'កក្កដា', 'សីហា', 'កញ្ញា', 'តុលា', 'វិច្ឆិកា', 'ធ្នូ'
  ];
  const monthName = monthNames[parseInt(monthStr, 10) - 1] || 'កក្កដា';
  const yearDisplay = useKhmerNumerals ? toKhmerDigits(yearStr) : yearStr;

  const incomeList = financeData.income || [];
  const expenseList = financeData.expense || [];

  // Totals (supporting Multi-Currency KHR / USD)
  const incomeTotals = sumByCurrency(incomeList);
  const expenseTotals = sumByCurrency(expenseList);
  const balanceTotals = combineCurrencyTotals(incomeTotals, expenseTotals, -1);
  const totalIncome = incomeList.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
  const totalExpense = expenseList.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
  const remainingBalance = totalIncome - totalExpense;

  // New item form
  const [newItem, setNewItem] = useState({
    desc: '',
    qty: '',
    unitPrice: '',
    total: '',
    currency: 'KHR',
    note: ''
  });

  const handleStartEdit = (item) => {
    setEditingId(item.id);
    setEditForm({ ...item });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleSaveEdit = () => {
    if (!editForm.desc?.trim()) {
      alert('សូមបញ្ចូលឈ្មោះឥវ៉ាន់ ឬបរិយាយ');
      return;
    }
    const targetList = activeSubTab === 'income' ? incomeList : expenseList;
    const numTotal = Number(editForm.total) || 0;
    const numUnit = parseKhmerNumber(editForm.unitPrice) || 0;
    const qtyStr = String(editForm.qty || '').trim();
    const finalEdit = { ...editForm, total: numTotal };
    if (activeSubTab === 'income' && numTotal === 0 && numUnit === 0 && qtyStr && !/^[0-9០-៩\s.,]+$/.test(qtyStr)) {
      finalEdit.totalLabel = qtyStr;
    } else if (numTotal > 0) {
      delete finalEdit.totalLabel;
    }
    const updated = targetList.map(item => item.id === editingId ? finalEdit : item);
    onUpdateFinance({
      ...financeData,
      [activeSubTab]: updated
    });
    setEditingId(null);
    setEditForm({});
  };

  const handleDelete = (id, desc) => {
    if (window.confirm(`តើបងពិតជាចង់លុបទិន្នន័យ «${desc || 'ជួរនេះ'}» មែនទេ?`)) {
      const targetList = activeSubTab === 'income' ? incomeList : expenseList;
      onUpdateFinance({
        ...financeData,
        [activeSubTab]: targetList.filter(item => item.id !== id)
      });
    }
  };

  const handleCreateNew = (e) => {
    e.preventDefault();
    if (!newItem.desc?.trim()) {
      alert('សូមបញ្ចូលឈ្មោះឥវ៉ាន់ ឬបរិយាយ');
      return;
    }
    const targetList = activeSubTab === 'income' ? incomeList : expenseList;
    const numTotal = Number(newItem.total) || 0;
    const numUnit = parseKhmerNumber(newItem.unitPrice) || 0;
    const qtyStr = String(newItem.qty || '').trim();
    const createdItem = {
      id: `${activeSubTab}-${Date.now()}`,
      ...newItem,
      total: numTotal,
      ...(activeSubTab === 'income' && numTotal === 0 && numUnit === 0 && qtyStr && !/^[0-9០-៩\s.,]+$/.test(qtyStr)
        ? { totalLabel: qtyStr }
        : {}),
      currency: normalizeCurrency(newItem.currency)
    };
    onUpdateFinance({
      ...financeData,
      [activeSubTab]: [...targetList, createdItem]
    });
    setShowAddModal(false);
    setNewItem({
      desc: '',
      qty: '',
      unitPrice: '',
      total: '',
      currency: 'KHR',
      note: ''
    });
  };

  const handleAutoCalcTotal = (qtyVal, priceVal, setter) => {
    const qNum = parseKhmerNumber(qtyVal);
    const pNum = parseKhmerNumber(priceVal);
    if (qNum > 0 && pNum > 0 && !isNaN(qNum) && !isNaN(pNum)) {
      setter(prev => {
        const isUsd = normalizeCurrency(prev?.currency) === 'USD';
        const calc = isUsd ? Math.round(qNum * pNum * 100) / 100 : Math.round(qNum * pNum);
        return {
          ...prev,
          qty: qtyVal,
          unitPrice: priceVal,
          total: calc
        };
      });
    } else {
      setter(prev => ({ ...prev, qty: qtyVal, unitPrice: priceVal }));
    }
  };

  const handleExportExcel = () => {
    exportFinanceDualExcel(financeData, `${monthName} ${yearDisplay}`, metadata, {
      monthKey,
      monthName,
      yearDisplay,
      periodMode: 'month',
      useKhmerNumerals
    });
  };

  const handleExportWord = () => {
    exportFinanceDualWord(financeData, `${monthName} ${yearDisplay}`, metadata, {
      monthKey,
      monthName,
      yearDisplay,
      periodMode: 'month',
      useKhmerNumerals
    });
  };

  const handleDownloadPdf = async () => {
    try {
      setIsExportingPdf(true);
      // Download only the format currently being viewed on the A4 preview (ពេញ or សង្ខេប)
      if (mobilePreviewA4 && financeViewType === 'summary') {
        await exportElementToPdf(
          '#printable-mobile-finance-summary-document',
          `របាយការណ៍ចំណូលចំណាយសង្ខេប_${monthName}_${yearDisplay}`
        );
      } else {
        await exportElementToPdf(
          '#printable-finance-document',
          `របាយការណ៍ហិរញ្ញវត្ថុ_${monthName}_${yearDisplay}`
        );
      }
    } catch (err) {
      alert('មិនអាចទាញយក PDF បានទេ៖ ' + (err.message || 'Error'));
    } finally {
      setIsExportingPdf(false);
    }
  };

  const currentList = activeSubTab === 'income' ? incomeList : expenseList;
  const filteredList = currentList.filter(item => {
    if (!searchQuery.trim()) return true;
    return (item.desc && item.desc.toLowerCase().includes(searchQuery.toLowerCase())) ||
           (item.note && item.note.toLowerCase().includes(searchQuery.toLowerCase()));
  });

  return (
    <div className="mobile-finance-container" style={{ paddingBottom: 80 }}>
      {/* 1. Finance Overview 3 Side-by-Side KPI Cards (ចំណូល | ចំណាយ | ប្រាក់នៅសល់) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 6,
        marginBottom: 10
      }}>
        {/* Card 1: ចំណូលសរុប (Green) */}
        <div
          onClick={() => { setActiveSubTab('income'); setEditingId(null); }}
          style={{
            background: activeSubTab === 'income' ? '#dcfce7' : '#f0fdf4',
            border: activeSubTab === 'income' ? '2px solid #16a34a' : '1.5px solid #86efac',
            borderRadius: 10,
            padding: '8px 4px',
            textAlign: 'center',
            boxShadow: activeSubTab === 'income' ? '0 3px 8px rgba(22, 163, 74, 0.16)' : '0 1px 3px rgba(0,0,0,0.03)',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minWidth: 0
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, color: '#15803d', fontSize: 10.5, fontWeight: 700, whiteSpace: 'nowrap' }}>
            <ArrowDownRight size={13} strokeWidth={2.5} />
            <span>ចំណូលសរុប</span>
          </div>
          <div style={{ fontSize: 12.5, fontWeight: 800, color: '#14532d', margin: '3px 0', wordBreak: 'break-word', lineHeight: 1.25 }}>
            {formatCurrencyTotals(incomeTotals, useKhmerNumerals)}
          </div>
          <div style={{ fontSize: 10, fontWeight: 600, color: '#166534' }}>
            {useKhmerNumerals ? toKhmerDigits(incomeList.length) : incomeList.length} ប្រតិបត្តិការ
          </div>
        </div>

        {/* Card 2: ចំណាយសរុប (Red) */}
        <div
          onClick={() => { setActiveSubTab('expense'); setEditingId(null); }}
          style={{
            background: activeSubTab === 'expense' ? '#fee2e2' : '#fef2f2',
            border: activeSubTab === 'expense' ? '2px solid #dc2626' : '1.5px solid #fca5a5',
            borderRadius: 10,
            padding: '8px 4px',
            textAlign: 'center',
            boxShadow: activeSubTab === 'expense' ? '0 3px 8px rgba(220, 38, 38, 0.16)' : '0 1px 3px rgba(0,0,0,0.03)',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minWidth: 0
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, color: '#b91c1c', fontSize: 10.5, fontWeight: 700, whiteSpace: 'nowrap' }}>
            <ArrowUpRight size={13} strokeWidth={2.5} />
            <span>ចំណាយសរុប</span>
          </div>
          <div style={{ fontSize: 12.5, fontWeight: 800, color: '#991b1b', margin: '3px 0', wordBreak: 'break-word', lineHeight: 1.25 }}>
            {formatExpenseTotals(expenseTotals, isFinanceDeficit(balanceTotals, remainingBalance), useKhmerNumerals)}
          </div>
          <div style={{ fontSize: 10, fontWeight: 600, color: '#991b1b' }}>
            {useKhmerNumerals ? toKhmerDigits(expenseList.length) : expenseList.length} ប្រតិបត្តិការ
          </div>
        </div>

        {/* Card 3: ប្រាក់នៅសល់ (Blue / Red on deficit) */}
        <div
          style={{
            background: remainingBalance >= 0 ? '#eff6ff' : '#fef2f2',
            border: remainingBalance >= 0 ? '1.5px solid #60a5fa' : '1.5px solid #f87171',
            borderRadius: 10,
            padding: '8px 4px',
            textAlign: 'center',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minWidth: 0
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, color: remainingBalance >= 0 ? '#1d4ed8' : '#b91c1c', fontSize: 10.5, fontWeight: 700, whiteSpace: 'nowrap' }}>
            <Wallet size={12} strokeWidth={2.5} />
            <span>ប្រាក់នៅសល់</span>
          </div>
          <div style={{ fontSize: 12.5, fontWeight: 800, color: remainingBalance >= 0 ? '#1e3a8a' : '#991b1b', margin: '3px 0', wordBreak: 'break-word', lineHeight: 1.25 }}>
            {formatCurrencyTotals(balanceTotals, useKhmerNumerals)}
          </div>
          <div style={{ fontSize: 10, fontWeight: 600, color: remainingBalance >= 0 ? '#1e40af' : '#991b1b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            ខែ{monthName} {yearDisplay}
          </div>
        </div>
      </div>

      {/* 2. 3-Button Action Row (+ បន្ថែមចំណូល | + បន្ថែមចំណាយ | Download PDF) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 12 }}>
        <button
          type="button"
          onClick={() => {
            setActiveSubTab('income');
            setShowAddModal(true);
          }}
          style={{
            background: '#15803d',
            color: '#ffffff',
            border: 'none',
            borderRadius: 8,
            padding: '10px 6px',
            fontSize: 12,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
            cursor: 'pointer',
            width: '100%',
            whiteSpace: 'nowrap',
            boxShadow: '0 2px 4px rgba(21, 128, 61, 0.2)'
          }}
        >
          <Plus size={14} strokeWidth={2.5} />
          <span>បន្ថែមចំណូល</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveSubTab('expense');
            setShowAddModal(true);
          }}
          style={{
            background: '#b45309',
            color: '#ffffff',
            border: 'none',
            borderRadius: 8,
            padding: '10px 6px',
            fontSize: 12,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
            cursor: 'pointer',
            width: '100%',
            whiteSpace: 'nowrap',
            boxShadow: '0 2px 4px rgba(180, 83, 9, 0.2)'
          }}
        >
          <Plus size={14} strokeWidth={2.5} />
          <span>បន្ថែមចំណាយ</span>
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
            borderRadius: 8,
            padding: '10px 6px',
            fontSize: 12,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
            cursor: isExportingPdf ? 'wait' : 'pointer',
            opacity: isExportingPdf ? 0.75 : 1,
            whiteSpace: 'nowrap',
            boxShadow: '0 2px 4px rgba(185, 28, 28, 0.2)'
          }}
        >
          {isExportingPdf ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
          <span>{isExportingPdf ? 'កំពុងទាញយក...' : 'Download PDF'}</span>
        </button>
      </div>

      {/* 3. Search */}
      <div style={{ position: 'relative', marginBottom: 12 }}>
        <Search size={15} color="#94a3b8" style={{ position: 'absolute', left: 10, top: 10 }} />
        <input
          type="text"
          placeholder="ស្វែងរកឈ្មោះឥវ៉ាន់ ឬចំណាំ..."
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

      {/* 4. List Cards or Official A4 Preview */}
      {mobilePreviewA4 ? (
        <div style={{ background: '#ffffff', padding: 8, borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden', position: 'relative' }}>
          {/* Toggle Button: ពេញ ⇄ សង្ខេប — floating top-right of the paper BG */}
          <button
            type="button"
            onClick={() => setFinanceViewType(financeViewType === 'full' ? 'summary' : 'full')}
            style={{
              position: 'absolute',
              top: 12,
              right: 12,
              zIndex: 10,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '4px 10px',
              borderRadius: 7,
              fontSize: 11.5,
              fontWeight: 700,
              border: '1.5px solid #d97706',
              background: financeViewType === 'summary' ? '#b45309' : '#fffbeb',
              color: financeViewType === 'summary' ? '#ffffff' : '#b45309',
              boxShadow: '0 2px 6px rgba(180,83,9,0.18)'
            }}
          >
            <FileText size={12} />
            <span>{financeViewType === 'full' ? 'សង្ខេប' : 'ពេញ'}</span>
          </button>
          <A4SheetScaler>
            {financeViewType === 'summary' ? (
              <OfficialFinanceSummaryDocument
                id="preview-mobile-finance-summary-document"
                financeData={financeData}
                metadata={metadata}
                monthName={monthName}
                yearDisplay={yearDisplay}
                useKhmerNumerals={useKhmerNumerals}
                monthKey={monthKey}
                periodMode="month"
              />
            ) : (
              <OfficialFinanceDocument
                id="preview-mobile-finance-document"
                financeData={financeData}
                metadata={metadata}
                monthName={monthName}
                yearDisplay={yearDisplay}
                useKhmerNumerals={useKhmerNumerals}
                monthKey={monthKey}
              />
            )}
          </A4SheetScaler>
        </div>
      ) : filteredList.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '30px 20px',
          background: '#ffffff',
          borderRadius: 12,
          border: '1px dashed #cbd5e1',
          color: '#64748b'
        }}>
          <p style={{ margin: 0, fontWeight: 600 }}>
            មិនមានទិន្នន័យ{activeSubTab === 'income' ? 'ចំណូល' : 'ចំណាយ'}ឡើយ
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filteredList.map((item, index) => {
            const isEditing = editingId === item.id;
            const numDisplay = useKhmerNumerals ? toKhmerDigits(index + 1) : index + 1;

            if (isEditing) {
              return (
                <div key={item.id} style={{
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

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>ឈ្មោះឥវ៉ាន់ ឬបរិយាយ</label>
                      <input
                        type="text"
                        value={editForm.desc || ''}
                        onChange={(e) => setEditForm({ ...editForm, desc: e.target.value })}
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
                        <label style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>ចំនួន/បរិមាណ</label>
                        <input
                          type="text"
                          value={editForm.qty || ''}
                          onChange={(e) => handleAutoCalcTotal(e.target.value, editForm.unitPrice, setEditForm)}
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
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
                          <label style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>តម្លៃរាយ ({getCurrencySymbol(editForm.currency)})</label>
                          <CurrencyToggle
                            value={editForm.currency}
                            onChange={cur => setEditForm(prev => ({ ...prev, currency: cur }))}
                          />
                        </div>
                        <input
                          type="text"
                          value={editForm.unitPrice || ''}
                          onChange={(e) => handleAutoCalcTotal(editForm.qty, e.target.value, setEditForm)}
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

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <div>
                        <label style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>សរុប ({getCurrencySymbol(editForm.currency)})</label>
                        <input
                          type="number"
                          value={editForm.total || 0}
                          onChange={(e) => setEditForm({ ...editForm, total: Number(e.target.value) || 0 })}
                          style={{
                            width: '100%',
                            padding: '6px 8px',
                            border: '1px solid #cbd5e1',
                            borderRadius: 6,
                            fontSize: 13,
                            marginTop: 2,
                            fontWeight: 700
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>សម្គាល់</label>
                        <input
                          type="text"
                          value={editForm.note || ''}
                          onChange={(e) => setEditForm({ ...editForm, note: e.target.value })}
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
                </div>
              );
            }

            const isIncomeCard = activeSubTab === 'income';
            return (
              <div
                key={item.id}
                style={{
                  background: '#ffffff',
                  border: isIncomeCard ? '1.5px solid #86efac' : '1.5px solid #fca5a5',
                  borderRadius: 12,
                  padding: 12,
                  boxShadow: isIncomeCard
                    ? '0 2px 6px rgba(22, 163, 74, 0.06)'
                    : '0 2px 6px rgba(220, 38, 38, 0.06)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: isIncomeCard ? '#15803d' : '#b91c1c',
                      background: isIncomeCard ? '#f0fdf4' : '#fef2f2',
                      border: isIncomeCard ? '1px solid #bbf7d0' : '1px solid #fecaca',
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {numDisplay}
                    </span>
                    <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
                      {item.desc || 'មិនមានឈ្មោះ'}
                    </h3>
                  </div>

                  <div style={{
                    fontSize: 15,
                    fontWeight: 800,
                    color: activeSubTab === 'income' ? '#15803d' : '#b91c1c'
                  }}>
                    {item.totalLabel && (!item.total || Number(item.total) === 0)
                      ? (useKhmerNumerals ? toKhmerDigits(item.totalLabel) : item.totalLabel)
                      : formatMoney(item.total, item.currency, useKhmerNumerals)}
                  </div>
                </div>

                {/* Sub details: Qty & Unit price */}
                {(item.qty || item.unitPrice) && (
                  <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>
                    {item.qty && <span>ចំនួន៖ <strong>{item.qty}</strong></span>}
                    {item.qty && item.unitPrice ? ' • ' : ''}
                    {item.unitPrice && (
                      <span>តម្លៃរាយ៖ <strong>{formatMoney(item.unitPrice, item.currency, useKhmerNumerals)}</strong></span>
                    )}
                  </div>
                )}

                {item.note && (
                  <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 6, fontStyle: 'italic' }}>
                    សម្គាល់៖ {item.note}
                  </div>
                )}

                {/* Actions */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: 6,
                  paddingTop: 6,
                  borderTop: '1px solid #f1f5f9'
                }}>
                  <button
                    onClick={() => handleStartEdit(item)}
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
                  >
                    <Edit3 size={13} />
                    <span>កែ</span>
                  </button>
                  <button
                    onClick={() => handleDelete(item.id, item.desc)}
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
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 5. Quick Add Modal */}
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
                {activeSubTab === 'income' ? 'បន្ថែមចំណូលថ្មី' : 'បន្ថែមចំណាយថ្មី'}
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
                  ឈ្មោះឥវ៉ាន់ ឬបរិយាយ <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder={activeSubTab === 'income' ? 'ឧ. ប្រាក់ពីសមណសិស្ស...' : 'ឧ. សាំងក្រអូប...'}
                  value={newItem.desc}
                  onChange={(e) => setNewItem({ ...newItem, desc: e.target.value })}
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
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>ចំនួន/បរិមាណ</label>
                  <input
                    type="text"
                    placeholder="ឧ. 2 សន្លឹក, 1 ម៉ាស៊ីន"
                    value={newItem.qty}
                    onChange={(e) => handleAutoCalcTotal(e.target.value, newItem.unitPrice, setNewItem)}
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
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
                    <label style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>តម្លៃរាយ ({getCurrencySymbol(newItem.currency)})</label>
                    <CurrencyToggle
                      value={newItem.currency}
                      onChange={cur => setNewItem(prev => ({ ...prev, currency: cur }))}
                    />
                  </div>
                  <input
                    type="text"
                    placeholder={normalizeCurrency(newItem.currency) === 'USD' ? 'ឧ. 5.00' : 'ឧ. 20000'}
                    value={newItem.unitPrice}
                    onChange={(e) => handleAutoCalcTotal(newItem.qty, e.target.value, setNewItem)}
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
                <label style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>
                  ទឹកប្រាក់សរុប ({getCurrencySymbol(newItem.currency)}) <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="number"
                  placeholder={normalizeCurrency(newItem.currency) === 'USD' ? 'ឧ. 10.00' : 'ឧ. 40000'}
                  value={newItem.total}
                  onChange={(e) => setNewItem({ ...newItem, total: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    border: '1px solid #cbd5e1',
                    borderRadius: 8,
                    fontSize: 16,
                    fontWeight: 700,
                    marginTop: 4
                  }}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>សម្គាល់ (ផ្សេងៗ)</label>
                <input
                  type="text"
                  placeholder="ស្រេចចិត្ត"
                  value={newItem.note}
                  onChange={(e) => setNewItem({ ...newItem, note: e.target.value })}
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
                    background: activeSubTab === 'income' ? '#15803d' : '#b45309',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 8,
                    padding: '11px',
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  រក្សាទុក
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
        <OfficialFinanceDocument
          id="printable-finance-document"
          financeData={financeData}
          metadata={metadata}
          monthName={monthName}
          yearDisplay={yearDisplay}
          useKhmerNumerals={useKhmerNumerals}
          monthKey={monthKey}
        />
        <OfficialFinanceSummaryDocument
          id="printable-mobile-finance-summary-document"
          financeData={financeData}
          metadata={metadata}
          monthName={monthName}
          yearDisplay={yearDisplay}
          useKhmerNumerals={useKhmerNumerals}
          monthKey={monthKey}
          periodMode="month"
        />
      </div>
    </div>
  );
}
