import React, { useState } from 'react';
import { Plus, Trash2, Printer, FileSpreadsheet, FileText, Edit3, Download, Loader2 } from 'lucide-react';
import { toKhmerDigits } from '../utils/khmerNumerals';
import { exportLeaveToExcel } from '../utils/excelExporter';
import { exportLeaveToWord } from '../utils/wordExporter';
import { exportElementToPdf } from '../utils/pdfExporter';
import KhmerRoyalDivider from './KhmerRoyalDivider';
import A4SheetScaler from './A4SheetScaler';
import OfficialLeaveDocument from './OfficialLeaveDocument';

export default function LeaveTableView({
  records,
  monthKey,
  metadata,
  useKhmerNumerals,
  studentMaster,
  onUpdateRecords,
  onPrint
}) {
  const [editingRowId, setEditingRowId] = useState(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // Month label derivation
  const [yearStr, monthStr] = monthKey.split('-');
  const monthNames = [
    'មករា', 'កុម្ភៈ', 'មីនា', 'មេសា', 'ឧសភា', 'មិថុនា',
    'កក្កដា', 'សីហា', 'កញ្ញា', 'តុលា', 'វិច្ឆិកា', 'ធ្នូ'
  ];
  const monthName = monthNames[parseInt(monthStr, 10) - 1] || 'កក្កដា';
  const yearDisplay = useKhmerNumerals ? toKhmerDigits(yearStr) : yearStr;

  const handleCellChange = (id, field, value) => {
    const updated = records.map(r => r.id === id ? { ...r, [field]: value } : r);
    onUpdateRecords(updated);
  };

  const handleAddRow = () => {
    const newRow = {
      id: `leave-${Date.now()}`,
      name: '',
      grade: '៣',
      reason: 'អាពាធ',
      duration: '១ថ្ងៃ',
      date: `01/${monthStr}/${yearStr}`,
      note: ''
    };
    onUpdateRecords([...records, newRow]);
    setEditingRowId(newRow.id);
  };

  const handleDeleteRow = (id) => {
    onUpdateRecords(records.filter(r => r.id !== id));
  };

  const handleExportExcel = () => {
    exportLeaveToExcel(records, `${monthName} ឆ្នាំ${yearDisplay}`, metadata, {
      monthKey,
      useKhmerNumerals
    });
  };

  const handleExportWord = () => {
    exportLeaveToWord(records, `${monthName} ឆ្នាំ${yearDisplay}`, metadata, {
      monthKey,
      useKhmerNumerals
    });
  };

  const handleDownloadPdf = async () => {
    try {
      setIsExportingPdf(true);
      await exportElementToPdf(
        '#printable-leave-document',
        `របាយការណ៍សុំច្បាប់_${monthName}_${yearDisplay}`
      );
    } catch (err) {
      alert('មិនអាចទាញយក PDF បានទេ៖ ' + (err.message || 'Error'));
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      {/* Action Toolbar (hidden on print) */}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={handleAddRow}
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
            <span>បន្ថែមជួរថ្មី</span>
          </button>
          <span style={{ fontSize: 13, color: '#64748b' }}>
            សរុបសមណសិស្សសុំច្បាប់៖ <strong>{useKhmerNumerals ? toKhmerDigits(records.length) : records.length} អង្គ</strong>
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

      {/* Authentic A4 Paper Sheet (100% Exact PDF 2 replica) */}
      <A4SheetScaler>
        <OfficialLeaveDocument
          id="printable-leave-document"
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
          handleDeleteRow={handleDeleteRow}
          studentMaster={studentMaster}
        />
      </A4SheetScaler>
  </div>
  );
}
