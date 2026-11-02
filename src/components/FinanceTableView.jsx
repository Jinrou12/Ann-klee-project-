import React, { useState } from 'react';
import { Plus, Trash2, Printer, FileSpreadsheet, DollarSign, ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { toKhmerDigits, formatKhmerCurrency, parseKhmerNumber } from '../utils/khmerNumerals';
import { exportFinanceToExcel } from '../utils/excelExporter';
import KhmerRoyalDivider from './KhmerRoyalDivider';

export default function FinanceTableView({
  financeData,
  monthKey,
  metadata,
  useKhmerNumerals,
  onUpdateFinance,
  onPrint
}) {
  const [editingId, setEditingId] = useState(null);

  const [yearStr, monthStr] = monthKey.split('-');
  const monthNames = [
    'មករា', 'កុម្ភៈ', 'មីនា', 'មេសា', 'ឧសភា', 'មិថុនា',
    'កក្កដា', 'សីហា', 'កញ្ញា', 'តុលា', 'វិច្ឆិកា', 'ធ្នូ'
  ];
  const monthName = monthNames[parseInt(monthStr, 10) - 1] || 'កក្កដា';
  const yearDisplay = useKhmerNumerals ? toKhmerDigits(yearStr) : yearStr;

  const incomeList = financeData.income || [];
  const expenseList = financeData.expense || [];

  // Auto-calculated totals
  const totalIncome = incomeList.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
  const totalExpense = expenseList.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
  const remainingBalance = totalIncome - totalExpense;

  const handleCellChange = (section, id, field, val) => {
    const list = section === 'income' ? [...incomeList] : [...expenseList];
    const updated = list.map(item => {
      if (item.id === id) {
        const newItem = { ...item, [field]: val };
        // Auto-calculate total if qty and unitPrice are provided as numbers
        if (field === 'qty' || field === 'unitPrice') {
          const qtyNum = parseKhmerNumber(field === 'qty' ? val : item.qty);
          const priceNum = parseKhmerNumber(field === 'unitPrice' ? val : item.unitPrice);
          if (qtyNum > 0 && priceNum > 0 && !isNaN(qtyNum) && !isNaN(priceNum)) {
            newItem.total = Math.round(qtyNum * priceNum);
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
    exportFinanceToExcel(financeData, `${monthName} ${yearDisplay}`, metadata);
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
            background: remainingBalance >= 0 ? '#f0fdf4' : '#fee2e2',
            border: `1px solid ${remainingBalance >= 0 ? '#bbf7d0' : '#fecaca'}`,
            padding: '4px 10px',
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 600,
            color: remainingBalance >= 0 ? '#15803d' : '#b91c1c'
          }}>
            <span>សមតុល្យនៅសល់៖ {formatKhmerCurrency(remainingBalance, useKhmerNumerals)}</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
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
              gap: 6
            }}
          >
            <FileSpreadsheet size={16} />
            <span>Export Excel</span>
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
              gap: 6
            }}
          >
            <Printer size={16} />
            <span>បោះពុម្ពជា PDF</span>
          </button>
        </div>
      </div>

      {/* Authentic A4 Paper Sheet (100% Exact PDF 1 Replica) */}
      <div className="paper-sheet-wrapper">
        <div className="printable-document">
          {/* Header Block */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 16
        }}>
          {/* Left: Ministry & School with Centered Logo on top */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1.45 }}>
            <img
              src="/logo.png"
              alt="Logo"
              style={{ width: 55, height: 55, objectFit: 'contain', marginBottom: 4 }}
            />
            <div className="font-moul" style={{ fontSize: 13, fontWeight: 700, textAlign: 'center' }}>
              {metadata.ministry}
            </div>
            <div className="font-moul" style={{ fontSize: 13, fontWeight: 700, textAlign: 'center' }}>
              {metadata.school}
            </div>
            <div className="font-moul" style={{ fontSize: 13, fontWeight: 700, textAlign: 'center' }}>
              {metadata.location}
            </div>
          </div>

          {/* Right: National Kingdom & Motto */}
          <div style={{ textAlign: 'center', lineHeight: 1.45 }}>
            <div className="font-moul" style={{ fontSize: 14, fontWeight: 700 }}>
              ព្រះរាជាណាចក្រកម្ពុជា
            </div>
            <div className="font-moul" style={{ fontSize: 14, fontWeight: 700 }}>
              ជាតិ សាសនា ព្រះមហាក្សត្រ
            </div>
            <KhmerRoyalDivider />
          </div>
        </div>

        {/* Report Title */}
        <div style={{ textAlign: 'center', marginTop: 10, marginBottom: 16 }}>
          <div className="font-moul" style={{ fontSize: 16, marginBottom: 4 }}>
            របាយការណ៍
          </div>
          <div className="font-moul" style={{ fontSize: 14, marginBottom: 4 }}>
            ស្ដីពី
          </div>
          <div className="font-moul" style={{ fontSize: 15 }}>
            តារាងចំណូលចំណាយប្រចាំខែ{monthName} ឆ្នាំ{yearDisplay}
          </div>
        </div>

        {/* Table 1: ចំណូល (Income) */}
        <div style={{ marginBottom: 20 }}>
          <div className="font-moul" style={{
            fontSize: 14,
            textAlign: 'center',
            marginBottom: 6,
            textDecoration: 'underline'
          }}>
            ចំណូល
          </div>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            border: '1px solid #000000',
            fontSize: 13
          }}>
            <thead>
              <tr style={{ background: '#ffffff', textAlign: 'center', height: 34 }}>
                <th style={{ border: '1px solid #000', width: '5%', padding: '6px 2px', fontWeight: 700 }}>ល.រ</th>
                <th style={{ border: '1px solid #000', width: '38%', padding: '6px 8px', fontWeight: 700 }}>បរិយាយ</th>
                <th style={{ border: '1px solid #000', width: '16%', padding: '6px 4px', fontWeight: 700, whiteSpace: 'nowrap' }}>ចំនួន</th>
                <th style={{ border: '1px solid #000', width: '17%', padding: '6px 4px', fontWeight: 700, whiteSpace: 'nowrap' }}>តម្លៃរាយ</th>
                <th style={{ border: '1px solid #000', width: '17%', padding: '6px 4px', fontWeight: 700, whiteSpace: 'nowrap' }}>តម្លៃសរុប</th>
                <th style={{ border: '1px solid #000', width: '7%', padding: '6px 2px', fontWeight: 700 }}>ផ្សេងៗ</th>
                <th className="no-print" style={{ border: '1px solid #cbd5e1', width: 35, background: '#f8fafc' }}></th>
              </tr>
            </thead>
            <tbody>
              {incomeList.map((item, index) => {
                const isEditing = editingId === item.id;
                const rowNum = useKhmerNumerals ? toKhmerDigits(index + 1) : (index + 1);

                return (
                  <tr key={item.id} style={{ height: 30 }}>
                    <td style={{ border: '1px solid #000', textAlign: 'center', padding: '4px' }}>{rowNum}</td>
                    <td style={{ border: '1px solid #000', padding: '4px 8px' }}>
                      {isEditing ? (
                        <input
                          type="text"
                          value={item.desc}
                          onChange={e => handleCellChange('income', item.id, 'desc', e.target.value)}
                          style={{ width: '100%', fontSize: 13 }}
                        />
                      ) : (
                        <div onClick={() => setEditingId(item.id)} style={{ cursor: 'pointer' }}>
                          {item.desc}
                        </div>
                      )}
                    </td>
                    <td style={{ border: '1px solid #000', textAlign: 'center', padding: '4px', whiteSpace: 'nowrap' }}>
                      {isEditing ? (
                        <input
                          type="text"
                          value={item.qty}
                          onChange={e => handleCellChange('income', item.id, 'qty', e.target.value)}
                          style={{ width: '100%', textAlign: 'center', fontSize: 13 }}
                        />
                      ) : (
                        <div onClick={() => setEditingId(item.id)} style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}>
                          {item.qty}
                        </div>
                      )}
                    </td>
                    <td style={{ border: '1px solid #000', textAlign: 'right', padding: '4px 8px' }}>
                      {isEditing ? (
                        <input
                          type="text"
                          value={item.unitPrice}
                          onChange={e => handleCellChange('income', item.id, 'unitPrice', e.target.value)}
                          style={{ width: '100%', textAlign: 'right', fontSize: 13 }}
                        />
                      ) : (
                        <div onClick={() => setEditingId(item.id)} style={{ cursor: 'pointer' }}>
                          {item.unitPrice ? formatKhmerCurrency(item.unitPrice, useKhmerNumerals) : ''}
                        </div>
                      )}
                    </td>
                    <td style={{ border: '1px solid #000', textAlign: 'right', padding: '4px 8px', fontWeight: 600 }}>
                      {isEditing ? (
                        <input
                          type="text"
                          value={item.total}
                          onChange={e => handleCellChange('income', item.id, 'total', e.target.value)}
                          style={{ width: '100%', textAlign: 'right', fontSize: 13 }}
                        />
                      ) : (
                        <div onClick={() => setEditingId(item.id)} style={{ cursor: 'pointer' }}>
                          {formatKhmerCurrency(item.total, useKhmerNumerals)}
                        </div>
                      )}
                    </td>
                    <td style={{ border: '1px solid #000', textAlign: 'center', padding: '4px' }}>
                      {isEditing ? (
                        <input
                          type="text"
                          value={item.note}
                          onChange={e => handleCellChange('income', item.id, 'note', e.target.value)}
                          style={{ width: '100%', textAlign: 'center', fontSize: 13 }}
                        />
                      ) : (
                        <div onClick={() => setEditingId(item.id)} style={{ cursor: 'pointer' }}>
                          {item.note}
                        </div>
                      )}
                    </td>
                    <td className="no-print" style={{ border: '1px solid #cbd5e1', textAlign: 'center', padding: 2 }}>
                      {isEditing ? (
                        <button
                          onClick={() => setEditingId(null)}
                          style={{ background: '#15803d', color: '#fff', fontSize: 11, padding: '2px 6px', borderRadius: 4 }}
                        >
                          រួច
                        </button>
                      ) : (
                        <button
                          onClick={() => handleDeleteRow('income', item.id)}
                          style={{ background: 'transparent', color: '#ef4444', padding: 2 }}
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}

              {/* Subtotal Income Row */}
              <tr style={{ height: 32, fontWeight: 700, background: '#fafafa' }}>
                <td colSpan={4} style={{ border: '1px solid #000', textAlign: 'center', padding: '6px' }}>
                  <span className="font-moul" style={{ fontSize: 13 }}>សរុបចំណូល</span>
                </td>
                <td style={{ border: '1px solid #000', textAlign: 'right', padding: '6px 8px' }}>
                  {formatKhmerCurrency(totalIncome, useKhmerNumerals)}
                </td>
                <td style={{ border: '1px solid #000' }}></td>
                <td className="no-print" style={{ border: '1px solid #cbd5e1' }}></td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Table 2: ចំណាយ (Expense) */}
        <div>
          <div className="font-moul" style={{
            fontSize: 14,
            textAlign: 'center',
            marginBottom: 6,
            textDecoration: 'underline'
          }}>
            ចំណាយ
          </div>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            border: '1px solid #000000',
            fontSize: 13
          }}>
            <thead>
              <tr style={{ background: '#ffffff', textAlign: 'center', height: 34 }}>
                <th style={{ border: '1px solid #000', width: '5%', padding: '6px 2px', fontWeight: 700 }}>ល.រ</th>
                <th style={{ border: '1px solid #000', width: '38%', padding: '6px 8px', fontWeight: 700 }}>បរិយាយ</th>
                <th style={{ border: '1px solid #000', width: '16%', padding: '6px 4px', fontWeight: 700, whiteSpace: 'nowrap' }}>ចំនួន</th>
                <th style={{ border: '1px solid #000', width: '17%', padding: '6px 4px', fontWeight: 700, whiteSpace: 'nowrap' }}>តម្លៃរាយ</th>
                <th style={{ border: '1px solid #000', width: '17%', padding: '6px 4px', fontWeight: 700, whiteSpace: 'nowrap' }}>តម្លៃសរុប</th>
                <th style={{ border: '1px solid #000', width: '7%', padding: '6px 2px', fontWeight: 700 }}>ផ្សេងៗ</th>
                <th className="no-print" style={{ border: '1px solid #cbd5e1', width: 35, background: '#f8fafc' }}></th>
              </tr>
            </thead>
            <tbody>
              {expenseList.map((item, index) => {
                const isEditing = editingId === item.id;
                const rowNum = useKhmerNumerals ? toKhmerDigits(index + 1) : (index + 1);

                return (
                  <tr key={item.id} style={{ height: 30 }}>
                    <td style={{ border: '1px solid #000', textAlign: 'center', padding: '4px' }}>{rowNum}</td>
                    <td style={{ border: '1px solid #000', padding: '4px 8px' }}>
                      {isEditing ? (
                        <input
                          type="text"
                          value={item.desc}
                          onChange={e => handleCellChange('expense', item.id, 'desc', e.target.value)}
                          style={{ width: '100%', fontSize: 13 }}
                        />
                      ) : (
                        <div onClick={() => setEditingId(item.id)} style={{ cursor: 'pointer' }}>
                          {item.desc}
                        </div>
                      )}
                    </td>
                    <td style={{ border: '1px solid #000', textAlign: 'center', padding: '4px', whiteSpace: 'nowrap' }}>
                      {isEditing ? (
                        <input
                          type="text"
                          value={item.qty}
                          onChange={e => handleCellChange('expense', item.id, 'qty', e.target.value)}
                          style={{ width: '100%', textAlign: 'center', fontSize: 13 }}
                        />
                      ) : (
                        <div onClick={() => setEditingId(item.id)} style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}>
                          {item.qty}
                        </div>
                      )}
                    </td>
                    <td style={{ border: '1px solid #000', textAlign: 'right', padding: '4px 8px' }}>
                      {isEditing ? (
                        <input
                          type="text"
                          value={item.unitPrice}
                          onChange={e => handleCellChange('expense', item.id, 'unitPrice', e.target.value)}
                          style={{ width: '100%', textAlign: 'right', fontSize: 13 }}
                        />
                      ) : (
                        <div onClick={() => setEditingId(item.id)} style={{ cursor: 'pointer' }}>
                          {item.unitPrice ? formatKhmerCurrency(item.unitPrice, useKhmerNumerals) : ''}
                        </div>
                      )}
                    </td>
                    <td style={{ border: '1px solid #000', textAlign: 'right', padding: '4px 8px', fontWeight: 600 }}>
                      {isEditing ? (
                        <input
                          type="text"
                          value={item.total}
                          onChange={e => handleCellChange('expense', item.id, 'total', e.target.value)}
                          style={{ width: '100%', textAlign: 'right', fontSize: 13 }}
                        />
                      ) : (
                        <div onClick={() => setEditingId(item.id)} style={{ cursor: 'pointer' }}>
                          {formatKhmerCurrency(item.total, useKhmerNumerals)}
                        </div>
                      )}
                    </td>
                    <td style={{ border: '1px solid #000', textAlign: 'center', padding: '4px' }}>
                      {isEditing ? (
                        <input
                          type="text"
                          value={item.note}
                          onChange={e => handleCellChange('expense', item.id, 'note', e.target.value)}
                          style={{ width: '100%', textAlign: 'center', fontSize: 13 }}
                        />
                      ) : (
                        <div onClick={() => setEditingId(item.id)} style={{ cursor: 'pointer' }}>
                          {item.note}
                        </div>
                      )}
                    </td>
                    <td className="no-print" style={{ border: '1px solid #cbd5e1', textAlign: 'center', padding: 2 }}>
                      {isEditing ? (
                        <button
                          onClick={() => setEditingId(null)}
                          style={{ background: '#15803d', color: '#fff', fontSize: 11, padding: '2px 6px', borderRadius: 4 }}
                        >
                          រួច
                        </button>
                      ) : (
                        <button
                          onClick={() => handleDeleteRow('expense', item.id)}
                          style={{ background: 'transparent', color: '#ef4444', padding: 2 }}
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}

              {/* Subtotal Expense Row */}
              <tr style={{ height: 32, fontWeight: 700, background: '#fafafa' }}>
                <td colSpan={4} style={{ border: '1px solid #000', textAlign: 'center', padding: '6px' }}>
                  <span className="font-moul" style={{ fontSize: 13 }}>សរុបចំណាយ</span>
                </td>
                <td style={{ border: '1px solid #000', textAlign: 'right', padding: '6px 8px' }}>
                  {formatKhmerCurrency(totalExpense, useKhmerNumerals)}
                </td>
                <td style={{ border: '1px solid #000' }}></td>
                <td className="no-print" style={{ border: '1px solid #cbd5e1' }}></td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Official Signatures Block (Exact match with PDF 1) */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginTop: 24,
          fontSize: 13,
          lineHeight: 1.6
        }}>
          {/* Left Signature: School Director */}
          <div style={{ textAlign: 'center', minWidth: 260 }}>
            <div className="font-moul" style={{ fontSize: 13, marginBottom: 4 }}>
              បានឃើញ និង……………..
            </div>
            <div>ថ្ងៃ………..…….ខែ………..….ឆ្នាំមមី អដ្ឋស័ក ព.ស.២៥៧០</div>
            <div>ថ្ងៃទី………. ខែ……….. ឆ្នាំ២០២៦</div>
            <div className="font-moul" style={{ fontSize: 13, marginTop: 8 }}>
              {metadata.directorTitle || 'ព្រះនាយក'}
            </div>
          </div>

          {/* Right Signature: Reporter */}
          <div style={{ textAlign: 'center', minWidth: 280 }}>
            <div>ថ្ងៃសុក្រ២រោច ខែទុតិយាសាឍ ឆ្នាំមមីអដ្ឋស័ក ព.ស.២៥៧០</div>
            <div>{metadata.wat || 'វត្តខេមវ័ន'} ថ្ងៃទី៣១ ខែកក្កដា ឆ្នាំ២០២៦</div>
            <div className="font-moul" style={{ fontSize: 13, marginTop: 8 }}>
              {metadata.reporterTitle || 'អ្នកធ្វើរបាយការណ៍'}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  );
}
