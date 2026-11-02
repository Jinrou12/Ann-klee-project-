import React, { useState } from 'react';
import { 
  Plus, Trash2, Edit3, Check, X, FileSpreadsheet, Eye, 
  DollarSign, ArrowDownRight, ArrowUpRight, Wallet, ShoppingBag, Search, Download, Loader2, Printer 
} from 'lucide-react';
import { toKhmerDigits, formatKhmerCurrency, parseKhmerNumber } from '../../utils/khmerNumerals';
import { exportFinanceToExcel } from '../../utils/excelExporter';
import { exportElementToPdf } from '../../utils/pdfExporter';
import OfficialFinanceDocument from '../OfficialFinanceDocument';

export default function FinanceMobileView({
  financeData = { income: [], expense: [] },
  monthKey,
  metadata = {},
  useKhmerNumerals = true,
  onUpdateFinance,
  onPrint,
  onSwitchToDesktop
}) {
  const [activeSubTab, setActiveSubTab] = useState('expense'); // 'expense' | 'income'
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isExportingPdf, setIsExportingPdf] = useState(false);

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

  // Totals
  const totalIncome = incomeList.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
  const totalExpense = expenseList.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
  const remainingBalance = totalIncome - totalExpense;

  // New item form
  const [newItem, setNewItem] = useState({
    desc: '',
    qty: '',
    unitPrice: '',
    total: '',
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
    const updated = targetList.map(item => item.id === editingId ? { ...editForm } : item);
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
    const createdItem = {
      id: `${activeSubTab}-${Date.now()}`,
      ...newItem,
      total: Number(newItem.total) || 0
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
      note: ''
    });
  };

  const handleAutoCalcTotal = (qtyVal, priceVal, setter) => {
    const qNum = parseKhmerNumber(qtyVal);
    const pNum = parseKhmerNumber(priceVal);
    if (qNum > 0 && pNum > 0 && !isNaN(qNum) && !isNaN(pNum)) {
      setter(prev => ({
        ...prev,
        qty: qtyVal,
        unitPrice: priceVal,
        total: Math.round(qNum * pNum)
      }));
    } else {
      setter(prev => ({ ...prev, qty: qtyVal, unitPrice: priceVal }));
    }
  };

  const handleExportExcel = () => {
    exportFinanceToExcel(financeData, `${monthName} ${yearDisplay}`, metadata);
  };

  const handleDownloadPdf = async () => {
    try {
      setIsExportingPdf(true);
      await exportElementToPdf(
        '#printable-finance-document',
        `របាយការណ៍ហិរញ្ញវត្ថុ_${monthName}_${yearDisplay}`
      );
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
      {/* 1. Finance Overview KPI Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr',
        gap: 10,
        marginBottom: 14
      }}>
        {/* Balance Card */}
        <div style={{
          background: remainingBalance >= 0 
            ? 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)' 
            : 'linear-gradient(135deg, #991b1b 0%, #b91c1c 100%)',
          color: '#ffffff',
          borderRadius: 14,
          padding: '14px 16px',
          boxShadow: '0 4px 12px rgba(30, 58, 138, 0.2)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, opacity: 0.9, fontWeight: 600 }}>ប្រាក់សល់បច្ចុប្បន្ន (សមតុល្យ)</span>
            <Wallet size={16} style={{ opacity: 0.8 }} />
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4, letterSpacing: 0.5 }}>
            {formatKhmerCurrency(remainingBalance, useKhmerNumerals)}
          </div>
          <div style={{ fontSize: 11, opacity: 0.8, marginTop: 2 }}>
            ប្រចាំខែ{monthName} ឆ្នាំ{yearDisplay}
          </div>
        </div>

        {/* Income vs Expense Quick Counters */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div style={{
            background: '#ffffff',
            border: '1px solid #bbf7d0',
            borderRadius: 12,
            padding: '10px 12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#16a34a', fontSize: 11, fontWeight: 700 }}>
              <ArrowDownRight size={14} />
              <span>ចំណូលសរុប</span>
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#15803d', marginTop: 4 }}>
              {formatKhmerCurrency(totalIncome, useKhmerNumerals)}
            </div>
            <div style={{ fontSize: 11, color: '#64748b' }}>
              {incomeList.length} ប្រតិបត្តិការ
            </div>
          </div>

          <div style={{
            background: '#ffffff',
            border: '1px solid #fecaca',
            borderRadius: 12,
            padding: '10px 12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#dc2626', fontSize: 11, fontWeight: 700 }}>
              <ArrowUpRight size={14} />
              <span>ចំណាយសរុប</span>
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#b91c1c', marginTop: 4 }}>
              {formatKhmerCurrency(totalExpense, useKhmerNumerals)}
            </div>
            <div style={{ fontSize: 11, color: '#64748b' }}>
              {expenseList.length} ប្រតិបត្តិការ
            </div>
          </div>
        </div>
      </div>

      {/* 2. Sub-tab switcher: Expense vs Income */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        background: '#f1f5f9',
        padding: 3,
        borderRadius: 10,
        marginBottom: 12
      }}>
        <button
          onClick={() => { setActiveSubTab('expense'); setEditingId(null); }}
          style={{
            padding: '8px 12px',
            border: 'none',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            background: activeSubTab === 'expense' ? '#ffffff' : 'transparent',
            color: activeSubTab === 'expense' ? '#b91c1c' : '#64748b',
            boxShadow: activeSubTab === 'expense' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6
          }}
        >
          <ShoppingBag size={14} />
          <span>ចំណាយ ({expenseList.length})</span>
        </button>

        <button
          onClick={() => { setActiveSubTab('income'); setEditingId(null); }}
          style={{
            padding: '8px 12px',
            border: 'none',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            background: activeSubTab === 'income' ? '#ffffff' : 'transparent',
            color: activeSubTab === 'income' ? '#15803d' : '#64748b',
            boxShadow: activeSubTab === 'income' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6
          }}
        >
          <DollarSign size={14} />
          <span>ចំណូល ({incomeList.length})</span>
        </button>
      </div>

      {/* Action Row */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
        <button
          onClick={() => setShowAddModal(true)}
          style={{
            background: activeSubTab === 'income' ? '#15803d' : '#b45309',
            color: '#ffffff',
            border: 'none',
            borderRadius: 8,
            padding: '10px 14px',
            fontSize: 13,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            cursor: 'pointer',
            width: '100%',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
          }}
        >
          <Plus size={16} />
          <span>{activeSubTab === 'income' ? 'បន្ថែមចំណូល' : 'បន្ថែមចំណាយ'}</span>
        </button>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <button
            onClick={handleExportExcel}
            style={{
              background: '#15803d',
              color: '#ffffff',
              border: 'none',
              borderRadius: 8,
              padding: '9px 12px',
              fontSize: 12,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              cursor: 'pointer'
            }}
          >
            <FileSpreadsheet size={15} />
            <span>Export Excel</span>
          </button>

          <button
            onClick={handleDownloadPdf}
            disabled={isExportingPdf}
            style={{
              background: '#b91c1c',
              color: '#ffffff',
              border: 'none',
              borderRadius: 8,
              padding: '9px 12px',
              fontSize: 12,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              cursor: isExportingPdf ? 'not-allowed' : 'pointer',
              opacity: isExportingPdf ? 0.7 : 1
            }}
            title="ទាញយកជាឯកសារ PDF ផ្លូវការ"
          >
            {isExportingPdf ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
            <span>{isExportingPdf ? 'កំពុងទាញ...' : 'Download PDF'}</span>
          </button>
        </div>

        <button
          onClick={onPrint || (() => window.print())}
          style={{
            background: '#0f172a',
            color: '#ffffff',
            border: 'none',
            borderRadius: 8,
            padding: '9px 12px',
            fontSize: 12,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            cursor: 'pointer',
            width: '100%',
            boxShadow: '0 2px 4px rgba(15, 23, 42, 0.15)'
          }}
          title="បើកផ្ទាំងបោះពុម្ពជា PDF (Print Preview)"
        >
          <Printer size={15} />
          <span>បោះពុម្ពជា PDF (Print Preview)</span>
        </button>
      </div>

      {/* Toggle to Full A4 Desktop Mode */}
      {onSwitchToDesktop && (
        <div style={{ marginBottom: 12, textAlign: 'center' }}>
          <button
            onClick={onSwitchToDesktop}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#854d0e',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '4px 8px'
            }}
          >
            <Eye size={13} />
            <span>មើលផ្ទាំងរបាយការណ៍ហិរញ្ញវត្ថុ A4 (Desktop View)</span>
          </button>
        </div>
      )}

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

      {/* 4. List Cards */}
      {filteredList.length === 0 ? (
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
                        <label style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>តម្លៃរាយ (៛)</label>
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
                        <label style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>សរុប (៛)</label>
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

            return (
              <div
                key={item.id}
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: 12,
                  padding: 12,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: '#64748b',
                      background: '#f1f5f9',
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
                    {formatKhmerCurrency(item.total, useKhmerNumerals)}
                  </div>
                </div>

                {/* Sub details: Qty & Unit price */}
                {(item.qty || item.unitPrice) && (
                  <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>
                    {item.qty && <span>ចំនួន៖ <strong>{item.qty}</strong></span>}
                    {item.qty && item.unitPrice ? ' • ' : ''}
                    {item.unitPrice && (
                      <span>តម្លៃរាយ៖ <strong>{formatKhmerCurrency(item.unitPrice, useKhmerNumerals)}</strong></span>
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
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>តម្លៃរាយ (៛)</label>
                  <input
                    type="text"
                    placeholder="ឧ. 20000"
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
                  ទឹកប្រាក់សរុប (៛) <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="number"
                  placeholder="ឧ. 40000"
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
        />
      </div>
    </div>
  );
}
