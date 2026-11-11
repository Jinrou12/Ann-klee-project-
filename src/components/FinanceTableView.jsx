import React, { useState } from 'react';
import { Plus, Trash2, Printer, FileSpreadsheet, FileText, DollarSign, ArrowDownRight, ArrowUpRight, Download, Loader2 } from 'lucide-react';
import { toKhmerDigits, formatKhmerCurrency, parseKhmerNumber, sumByCurrency, combineCurrencyTotals, formatCurrencyTotals } from '../utils/khmerNumerals';
import { exportFinanceDualExcel } from '../utils/excelExporter';
import { exportFinanceDualWord } from '../utils/wordExporter';
import { exportElementToPdf } from '../utils/pdfExporter';
import KhmerRoyalDivider from './KhmerRoyalDivider';
import A4SheetScaler from './A4SheetScaler';
import OfficialFinanceDocument from './OfficialFinanceDocument';
import OfficialFinanceSummaryDocument from './OfficialFinanceSummaryDocument';

export default function FinanceTableView({
  financeData,
  monthKey,
  metadata,
  useKhmerNumerals,
  onUpdateFinance,
  onPrint
}) {
  const [editingId, setEditingId] = useState(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [financeViewType, setFinanceViewType] = useState('full'); // 'full' (ពេញ) | 'summary' (សង្ខេប)

  const [yearStr, monthStr] = monthKey.split('-');
  const monthNames = [
    'មករា', 'កុម្ភៈ', 'មីនា', 'មេសា', 'ឧសភា', 'មិថុនា',
    'កក្កដា', 'សីហា', 'កញ្ញា', 'តុលា', 'វិច្ឆិកា', 'ធ្នូ'
  ];
  const monthName = monthNames[parseInt(monthStr, 10) - 1] || 'កក្កដា';
  const yearDisplay = useKhmerNumerals ? toKhmerDigits(yearStr) : yearStr;

  const incomeList = financeData.income || [];
  const expenseList = financeData.expense || [];

  // Auto-calculated totals (supporting Multi-Currency KHR / USD)
  const incomeTotals = sumByCurrency(incomeList);
  const expenseTotals = sumByCurrency(expenseList);
  const balanceTotals = combineCurrencyTotals(incomeTotals, expenseTotals, -1);
  const totalIncome = incomeList.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
  const totalExpense = expenseList.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
  const remainingBalance = totalIncome - totalExpense;

  const handleCellChange = (section, id, field, val) => {
    const list = section === 'income' ? [...incomeList] : [...expenseList];
    const updated = list.map(item => {
      if (item.id === id) {
        const newItem = { ...item, [field]: val };
        if (section === 'income' && field === 'total') {
          const rawStr = String(val ?? '').trim();
          const numVal = parseKhmerNumber(rawStr);
          if (rawStr && !/^[0-9០-៩\s.,]+$/.test(rawStr)) {
            newItem.total = 0;
            newItem.totalLabel = rawStr;
          } else {
            newItem.total = Number.isFinite(numVal) ? numVal : 0;
            delete newItem.totalLabel;
          }
        }
        // Auto-calculate total if qty and unitPrice are provided as numbers
        if (field === 'qty' || field === 'unitPrice') {
          const qtyStr = String(field === 'qty' ? val : item.qty || '').trim();
          const qtyNum = parseKhmerNumber(qtyStr);
          const priceNum = parseKhmerNumber(field === 'unitPrice' ? val : item.unitPrice);
          if (qtyNum > 0 && priceNum > 0 && !isNaN(qtyNum) && !isNaN(priceNum)) {
            newItem.total = Math.round(qtyNum * priceNum);
            delete newItem.totalLabel;
          } else if (section === 'income' && (!priceNum || priceNum === 0) && (!newItem.total || Number(newItem.total) === 0) && qtyStr && !/^[0-9០-៩\s.,]+$/.test(qtyStr)) {
            newItem.total = 0;
            newItem.totalLabel = qtyStr;
          }
        }
        return newItem;
      }
      return item;
    });

    onUpdateFinance({
      ...financeData,
      [section]: updated
    });
  };

  const handleAddRow = (section) => {
    const newRow = {
      id: `${section}-${Date.now()}`,
      desc: '',
      qty: '1',
      unitPrice: 0,
      total: 0,
      note: ''
    };
    onUpdateFinance({
      ...financeData,
      [section]: [...(section === 'income' ? incomeList : expenseList), newRow]
    });
    setEditingId(newRow.id);
  };

  const handleDeleteRow = (section, id) => {
    const list = section === 'income' ? incomeList : expenseList;
    onUpdateFinance({
      ...financeData,
      [section]: list.filter(item => item.id !== id)
    });
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
      // Download only the format currently being viewed (ពេញ or សង្ខេប)
      if (financeViewType === 'summary') {
        await exportElementToPdf(
          '#printable-finance-summary-document',
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

  return (
    <div style={{ position: 'relative' }}>
      {/* Top Action Toolbar (No-print) */}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <button
            onClick={() => handleAddRow('income')}
            style={{
              background: '#15803d',
              color: '#ffffff',
              padding: '7px 14px',
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <Plus size={16} />
            <span>+ បន្ថែមចំណូល</span>
          </button>
          <button
            onClick={() => handleAddRow('expense')}
            style={{
              background: '#b45309',
              color: '#ffffff',
              padding: '7px 14px',
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <Plus size={16} />
            <span>+ បន្ថែមចំណាយ</span>
          </button>

          {/* Quick Balance Status */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: ((balanceTotals.KHR >= 0 && balanceTotals.USD >= 0)) ? '#f0fdf4' : '#fee2e2',
            border: `1px solid ${((balanceTotals.KHR >= 0 && balanceTotals.USD >= 0)) ? '#bbf7d0' : '#fecaca'}`,
            padding: '4px 10px',
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 600,
            color: ((balanceTotals.KHR >= 0 && balanceTotals.USD >= 0)) ? '#15803d' : '#b91c1c'
          }}>
            <span>សមតុល្យនៅសល់៖ {formatCurrencyTotals(balanceTotals, useKhmerNumerals)}</span>
          </div>
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
              cursor: isExportingPdf ? 'wait' : 'pointer',
              opacity: isExportingPdf ? 0.75 : 1
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

      {/* Authentic A4 Paper Sheet (100% Exact PDF 1 Replica) + ពេញ ⇄ សង្ខេប Toggle */}
      <div style={{ position: 'relative' }}>
        {/* Toggle Button: floating on the gray paper BG, top-right of the sheet header */}
        <button
          type="button"
          className="no-print"
          onClick={() => setFinanceViewType(financeViewType === 'full' ? 'summary' : 'full')}
          style={{
            position: 'absolute',
            top: 12,
            right: 14,
            zIndex: 10,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            padding: '6px 14px',
            borderRadius: 8,
            fontSize: 12.5,
            fontWeight: 700,
            border: '1.5px solid #d97706',
            background: financeViewType === 'summary' ? '#b45309' : '#fffbeb',
            color: financeViewType === 'summary' ? '#ffffff' : '#b45309',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(180,83,9,0.18)',
            transition: 'all 0.15s'
          }}
          title={financeViewType === 'full' ? 'ប្ដូរមើលតារាងសង្ខេប' : 'ប្ដូរមើលតារាងពេញ'}
        >
          <FileText size={14} />
          <span>{financeViewType === 'full' ? 'សង្ខេប' : 'ពេញ'}</span>
        </button>

        <A4SheetScaler>
          {financeViewType === 'summary' ? (
            <OfficialFinanceSummaryDocument
              id="preview-finance-summary-document"
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
              id="printable-finance-document"
              financeData={financeData}
              metadata={metadata}
              monthName={monthName}
              yearDisplay={yearDisplay}
              useKhmerNumerals={useKhmerNumerals}
              monthKey={monthKey}
              isEditable={true}
              editingId={editingId}
              setEditingId={setEditingId}
              handleCellChange={handleCellChange}
              handleDeleteRow={handleDeleteRow}
            />
          )}
        </A4SheetScaler>
      </div>

      {/* Offscreen Unscaled Summary Document for Crisp Summary PDF Export (Hidden on Screen & Native Print) */}
      <div
        className="no-print"
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
        <OfficialFinanceSummaryDocument
          id="printable-finance-summary-document"
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
